import type { Action_V2, PlayerReference_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { PendingChoice } from '../events/pendingChoice';
import type { GameLogEntry } from '../logs/logEntry';
import { createActionLogger } from '../rules/shared/actionLogger';
import { getDefinition } from '../rules/shared/definitions';
import { mintRuntimeInstanceId } from '../rules/shared/mintInstance';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';
import type { CardInstance } from '../state/card';
import type { GameState } from '../state/game';
import { v2PlayPreventionReasons } from './permissions_V2';
import { selectFromLookBuffer_V2, type LookBuffer_V2 } from './lookBuffer_V2';
import { resolveSelector_V2, selectResolvedCandidateIds_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export interface PlayCardsResult_V2 {
  state: GameState;
  log: GameLogEntry[];
  playedInstanceIds: string[];
  bindings?: import('./selectorResolver_V2').EffectBindings_V2;
}

function opponentOf(state: GameState, playerId: string): string {
  return Object.keys(state.players).find((id) => id !== playerId) ?? playerId;
}

function playerIdForReference(ctx: SelectorContext_V2, ref: PlayerReference_V2): string {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (ref) {
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return ctx.controllerId;
    case 'OPPONENT':
      return opponentOf(ctx.state, ctx.controllerId);
    case 'CARD_OWNER':
      return source?.ownerId ?? ctx.controllerId;
    case 'CARD_CONTROLLER':
      return source?.controllerId ?? ctx.controllerId;
    case 'ANY':
      return ctx.controllerId;
  }
}

function removeFromAllZones(state: GameState, instanceId: string): GameState {
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
  return { ...state, players };
}

function sourceZoneForLog(card: CardInstance): string {
  switch (card.currentZone) {
    case 'characterArea':
      return 'characterArea';
    case 'stageArea':
      return 'stageArea';
    case 'lifeArea':
      return 'lifeArea';
    case 'donDeck':
      return 'donDeck';
    default:
      return card.currentZone;
  }
}

function playOneCard_V2(args: {
  ctx: SelectorContext_V2;
  state: GameState;
  oldInstanceId: string;
  playerId: string;
  actionId: string | null;
  logger: ReturnType<typeof createActionLogger>;
}): { state: GameState; playedInstanceId: string | null; pendingChoices: PendingChoice[] } {
  const oldInstance = args.state.cardsById[args.oldInstanceId];
  if (!oldInstance) return { state: args.state, playedInstanceId: null, pendingChoices: [] };
  const def = getDefinition(args.ctx.defs, oldInstance);
  if (def.category !== 'character' && def.category !== 'stage') {
    return { state: args.state, playedInstanceId: null, pendingChoices: [] };
  }

  const player = args.state.players[args.playerId];
  if (!player) return { state: args.state, playedInstanceId: null, pendingChoices: [] };

  let working = removeFromAllZones(args.state, args.oldInstanceId);
  let cardsById = { ...working.cardsById };
  const sourceZone = sourceZoneForLog(oldInstance);

  if (def.category === 'stage') {
    let trash = working.players[args.playerId].trash;
    const displacedStageId = working.players[args.playerId].stageArea.cardIds[0];
    if (displacedStageId) {
      const displaced = cardsById[displacedStageId];
      if (displaced) {
        cardsById[displacedStageId] = { ...displaced, currentZone: 'trash', faceState: 'faceUp', revealedTo: 'all' };
        trash = addToZoneTop(trash, displacedStageId);
        args.logger.push({
          actorPlayerId: args.playerId,
          type: 'CARD_MOVED',
          message: `${args.playerId}'s previous Stage was trashed to make room for a new Stage.`,
          data: { from: 'STAGE_AREA', to: 'TRASH', displacedStageId },
          relatedCardInstanceIds: [displacedStageId],
          visibility: 'public',
        });
      }
    }
    working = {
      ...working,
      cardsById,
      players: {
        ...working.players,
        [args.playerId]: { ...working.players[args.playerId], stageArea: { ...working.players[args.playerId].stageArea, cardIds: [] }, trash },
      },
    };
  }

  const minted = mintRuntimeInstanceId(working);
  const newInstanceId = minted.id;
  const played: CardInstance = {
    instanceId: newInstanceId,
    cardDefinitionId: oldInstance.cardDefinitionId,
    ownerId: oldInstance.ownerId,
    controllerId: args.playerId,
    currentZone: def.category === 'stage' ? 'stageArea' : 'characterArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: def.category === 'character' ? !def.hasRush : false,
    revealedTo: 'all',
    ...(def.basePower === undefined ? {} : { currentPower: def.basePower }),
    ...(def.baseCost === undefined ? {} : { currentCost: def.baseCost }),
    ...(def.category === 'character' ? { enteredPlayTurn: working.turnNumber } : {}),
  };

  cardsById = { ...working.cardsById, [newInstanceId]: played };
  delete cardsById[args.oldInstanceId];
  const destinationPlayer = working.players[args.playerId];
  const nextPlayer = def.category === 'stage'
    ? { ...destinationPlayer, stageArea: addToZoneBottom({ ...destinationPlayer.stageArea, cardIds: [] }, newInstanceId) }
    : { ...destinationPlayer, characterArea: addToZoneBottom(destinationPlayer.characterArea, newInstanceId) };

  args.logger.push({
    actorPlayerId: args.playerId,
    type: 'CARD_PLAYED',
    message: `${args.playerId} played ${def.name} with a V2 effect.`,
    data: { from: sourceZone, to: played.currentZone, oldInstanceId: args.oldInstanceId, newInstanceId, via: 'V2_EFFECT' },
    relatedCardInstanceIds: [newInstanceId],
    visibility: 'public',
  });

  const pendingChoices: PendingChoice[] = [];
  if (def.category === 'character') {
    const characterArea = nextPlayer.characterArea;
    if (characterArea.cardIds.length > (characterArea.maxSize ?? Infinity)) {
      pendingChoices.push({
        id: `${args.playerId}__v2-character-overflow-${args.actionId ?? newInstanceId}`,
        playerId: args.playerId,
        kind: 'SELECT_CARDS',
        prompt: `Choose 1 Character to trash - more than ${characterArea.maxSize} in your Character Area.`,
        constraints: { min: 1, max: 1, zoneId: 'characterArea', filterDescription: 'Any Character currently in your Character Area.' },
        sourceInstanceId: null,
        sourceEffectId: 'rule:characterAreaOverflow',
      });
      args.logger.push({
        actorPlayerId: args.playerId,
        type: 'CHOICE_REQUESTED',
        message: `${args.playerId} must trash 1 Character - Character Area exceeds its limit.`,
        data: { limit: characterArea.maxSize, current: characterArea.cardIds.length },
        relatedCardInstanceIds: [],
        visibility: 'public',
      });
    }
  }

  return {
    state: {
      ...working,
      cardsById,
      players: { ...working.players, [args.playerId]: nextPlayer },
      nextInstanceSeq: minted.state.nextInstanceSeq,
      pendingChoices: [...working.pendingChoices, ...pendingChoices],
      continuousEffects: working.continuousEffects.filter((effect) => effect.sourceInstanceId !== args.oldInstanceId),
    },
    playedInstanceId: newInstanceId,
    pendingChoices,
  };
}

export function playCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'PLAY_CARD' }>,
  actionId: string | null,
): PlayCardsResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved).filter((instanceId) =>
    v2PlayPreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      playerId,
      candidateInstanceId: instanceId,
      cause: 'EFFECT',
    }).length === 0,
  );
  if (selectedIds.length === 0) return { state: ctx.state, log: [], playedInstanceIds: [] };

  const logger = createActionLogger(ctx.state, actionId);
  let state = ctx.state;
  const playedInstanceIds: string[] = [];
  for (const oldInstanceId of selectedIds) {
    const result = playOneCard_V2({ ctx: { ...ctx, state }, state, oldInstanceId, playerId, actionId, logger });
    state = result.state;
    if (result.playedInstanceId) playedInstanceIds.push(result.playedInstanceId);
  }

  if (playedInstanceIds.length === 0) return { state: ctx.state, log: [], playedInstanceIds: [] };
  const existingBuffer = ctx.bindings?.actionResults.LOOK_BUFFER_V2 as LookBuffer_V2 | undefined;
  const updatedBuffer = existingBuffer ? selectFromLookBuffer_V2(existingBuffer, selectedIds) : undefined;
  const selectedObjects = {
    ...(ctx.bindings?.selectedObjects ?? {}),
    SELECTED_PREVIOUSLY: playedInstanceIds,
    PREVIOUS_ACTION_TARGET: playedInstanceIds,
    PLAYED_SOURCE_PREVIOUSLY: selectedIds,
    ...(updatedBuffer ? {
      LOOKED_AT_PREVIOUSLY: updatedBuffer.lookedInstanceIds,
      REMAINDER_OF_PREVIOUS_SELECTION: updatedBuffer.remainingInstanceIds,
    } : {}),
  };
  const actionResults = {
    ...(ctx.bindings?.actionResults ?? {}),
    ...(updatedBuffer ? { LOOK_BUFFER_V2: updatedBuffer } : {}),
  };
  return {
    state: { ...state, log: [...state.log, ...logger.log] },
    log: logger.log,
    playedInstanceIds,
    bindings: { selectedObjects, actionResults },
  };
}
