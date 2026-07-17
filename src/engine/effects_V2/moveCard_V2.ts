import type { PlayerReference_V2, Zone_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameLogEntry } from '../logs/logEntry';
import { createActionLogger } from '../rules/shared/actionLogger';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';
import type { CardInstance } from '../state/card';
import type { GameState } from '../state/game';
import type { PlayerState } from '../state/player';
import type { Zone } from '../state/zone';
import { v2ZoneChangePreventionReasons } from './permissions_V2';
import { resolveSelector_V2, selectResolvedCandidateIds_V2, type EffectBindings_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export interface MoveCardsResult_V2 {
  state: GameState;
  log: GameLogEntry[];
  movedInstanceIds: string[];
  bindings?: EffectBindings_V2;
}

type ZoneKey_V2 = keyof Pick<PlayerState, 'deck' | 'donDeck' | 'hand' | 'characterArea' | 'stageArea' | 'costArea' | 'trash' | 'lifeArea'>;

function opponentOf(state: GameState, playerId: string): string {
  return Object.keys(state.players).find((id) => id !== playerId) ?? playerId;
}

function playerIdForReference(ctx: SelectorContext_V2, ref: PlayerReference_V2 | undefined, fallback: string): string {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (ref) {
    case undefined:
      return fallback;
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return ctx.controllerId;
    case 'OPPONENT':
      return opponentOf(ctx.state, ctx.controllerId);
    case 'CARD_OWNER':
      return source?.ownerId ?? fallback;
    case 'CARD_CONTROLLER':
      return source?.controllerId ?? fallback;
    case 'ANY':
      return fallback;
  }
}

function zoneKeyForDestination(zone: Zone_V2): ZoneKey_V2 | null {
  switch (zone) {
    case 'DECK':
      return 'deck';
    case 'DON_DECK':
      return 'donDeck';
    case 'HAND':
      return 'hand';
    case 'CHARACTER_AREA':
      return 'characterArea';
    case 'STAGE_AREA':
      return 'stageArea';
    case 'COST_AREA':
      return 'costArea';
    case 'TRASH':
      return 'trash';
    case 'LIFE':
      return 'lifeArea';
    case 'LEADER_AREA':
    case 'ATTACHED_DON':
    case 'RESOLVING_TRIGGER':
    case 'RESOLUTION_LIMBO':
    case 'NONE':
      return null;
  }
}

function zoneIdForCard(zoneKey: ZoneKey_V2): CardInstance['currentZone'] {
  switch (zoneKey) {
    case 'deck':
      return 'deck';
    case 'donDeck':
      return 'donDeck';
    case 'hand':
      return 'hand';
    case 'characterArea':
      return 'characterArea';
    case 'stageArea':
      return 'stageArea';
    case 'costArea':
      return 'costArea';
    case 'trash':
      return 'trash';
    case 'lifeArea':
      return 'lifeArea';
  }
}

function removeFromAllZones(state: GameState, instanceId: string): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  let players = state.players;
  for (const [playerId, player] of Object.entries(state.players)) {
    players = {
      ...players,
      [playerId]: {
        ...player,
        hand: removeFromZone(player.hand, instanceId),
        deck: removeFromZone(player.deck, instanceId),
        trash: removeFromZone(player.trash, instanceId),
        characterArea: removeFromZone(player.characterArea, instanceId),
        stageArea: removeFromZone(player.stageArea, instanceId),
        costArea: removeFromZone(player.costArea, instanceId),
        lifeArea: removeFromZone(player.lifeArea, instanceId),
        donDeck: removeFromZone(player.donDeck, instanceId),
      },
    };
  }

  let cardsById = state.cardsById;
  for (const [cardId, card] of Object.entries(cardsById)) {
    if (!card.donAttached.includes(instanceId)) continue;
    cardsById = {
      ...cardsById,
      [cardId]: { ...card, donAttached: card.donAttached.filter((attachedId) => attachedId !== instanceId) },
    };
  }
  return { ...state, players, cardsById };
}

function addToDestinationZone(zone: Zone, instanceId: string, zoneKey: ZoneKey_V2, position: 'TOP' | 'BOTTOM' | undefined): Zone {
  if (zoneKey === 'deck' || zoneKey === 'lifeArea') {
    return position === 'BOTTOM' ? addToZoneBottom(zone, instanceId) : addToZoneTop(zone, instanceId);
  }
  if (zoneKey === 'trash' || zoneKey === 'donDeck') return addToZoneTop(zone, instanceId);
  return addToZoneBottom(zone, instanceId);
}

function movedCardState(inst: CardInstance, zoneKey: ZoneKey_V2, destinationOwnerId: string): CardInstance {
  const currentZone = zoneIdForCard(zoneKey);
  const base = { ...inst, currentZone, controllerId: destinationOwnerId };
  switch (zoneKey) {
    case 'hand':
      return { ...base, donAttached: [], orientation: null, revealedTo: [destinationOwnerId] };
    case 'deck':
      return { ...base, donAttached: [], orientation: null, faceState: 'faceDown', revealedTo: [] };
    case 'trash':
      return { ...base, donAttached: [], orientation: null, faceState: 'faceUp', revealedTo: 'all' };
    case 'lifeArea':
      return { ...base, donAttached: [], orientation: null, faceState: 'faceDown', revealedTo: [] };
    case 'costArea':
      return { ...base, faceState: 'faceUp', revealedTo: 'all', donRested: inst.donRested ?? false };
    case 'donDeck':
      return { ...base, orientation: null, faceState: 'faceUp', revealedTo: 'all', donRested: false };
    case 'characterArea':
    case 'stageArea':
      return { ...base, orientation: inst.orientation ?? 'active', faceState: 'faceUp', revealedTo: 'all' };
  }
}

function moveOneCard(
  state: GameState,
  instanceId: string,
  zoneKey: ZoneKey_V2,
  destinationOwnerId: string,
  position: 'TOP' | 'BOTTOM' | undefined,
): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  const withoutCard = removeFromAllZones(state, instanceId);
  const destinationPlayer = withoutCard.players[destinationOwnerId];
  if (!destinationPlayer) return withoutCard;
  const zone = destinationPlayer[zoneKey] as Zone;
  return {
    ...withoutCard,
    players: {
      ...withoutCard.players,
      [destinationOwnerId]: {
        ...destinationPlayer,
        [zoneKey]: addToDestinationZone(zone, instanceId, zoneKey, position),
      },
    },
    cardsById: {
      ...withoutCard.cardsById,
      [instanceId]: movedCardState(withoutCard.cardsById[instanceId], zoneKey, destinationOwnerId),
    },
    continuousEffects: withoutCard.continuousEffects.filter((effect) => effect.sourceInstanceId !== instanceId),
  };
}

export function moveCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<import('../../cards/effectCompiler_V2/types_V2').Action_V2, { type: 'MOVE_CARD' }>,
  actionId: string | null,
): MoveCardsResult_V2 {
  const zoneKey = zoneKeyForDestination(action.to.zone);
  if (!zoneKey) return { state: ctx.state, log: [], movedInstanceIds: [] };

  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved).filter((instanceId) =>
    v2ZoneChangePreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      candidateInstanceId: instanceId,
      toZone: action.to.zone,
      cause: action.cause,
    }).length === 0,
  );
  let state = ctx.state;
  const movedInstanceIds: string[] = [];

  for (const instanceId of selectedIds) {
    const inst = state.cardsById[instanceId];
    if (!inst) continue;
    const destinationOwnerId = playerIdForReference(ctx, action.to.owner, inst.ownerId);
    state = moveOneCard(state, instanceId, zoneKey, destinationOwnerId, action.to.position);
    movedInstanceIds.push(instanceId);
  }

  if (movedInstanceIds.length === 0) return { state: ctx.state, log: [], movedInstanceIds: [] };
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'CARD_MOVED',
    message: `${ctx.controllerId} moved ${movedInstanceIds.length} card(s) with a V2 effect.`,
    data: {
      cause: action.cause,
      to: action.to,
      movedInstanceIds,
    },
    relatedCardInstanceIds: movedInstanceIds,
    visibility: action.to.zone === 'HAND' || action.to.zone === 'DECK' || action.to.zone === 'LIFE' ? { visibleTo: [ctx.controllerId] } : 'public',
  });

  return {
    state: { ...state, log: [...state.log, ...logger.log] },
    log: logger.log,
    movedInstanceIds,
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        MOVED_PREVIOUSLY: movedInstanceIds,
        SELECTED_PREVIOUSLY: movedInstanceIds,
        PREVIOUS_ACTION_TARGET: movedInstanceIds,
        ...(action.to.zone === 'TRASH' ? { TRASHED_PREVIOUSLY: movedInstanceIds } : {}),
        ...(action.to.zone === 'HAND' || action.to.zone === 'DECK' ? { RETURNED_PREVIOUSLY: movedInstanceIds } : {}),
        ...(action.to.zone === 'HAND' ? { RETURNED_TO_HAND_PREVIOUSLY: movedInstanceIds } : {}),
        ...(action.to.zone === 'DECK' ? { RETURNED_TO_DECK_PREVIOUSLY: movedInstanceIds } : {}),
      },
      actionResults: ctx.bindings?.actionResults ?? {},
    },
  };
}
