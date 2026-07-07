/**
 * K.O. replacement ("would be K.O.'d … you may … instead") runtime.
 *
 * Continuous `koReplacementModifier` records on GameState are checked before
 * every effect or battle K.O. When the owner accepts, the replacement cost is
 * paid and the K.O. is skipped (no [On K.O.] for effect/battle K.O. paths).
 */
import type {
  ContinuousEffectRecord,
  ContinuousKoReplacementModifier,
  ContinuousPowerCondition,
  GameState,
  KoReplacementHandFilter,
} from '../../state/game';
import type { PendingChoice } from '../../events/pendingChoice';
import type { GameLogEntry } from '../../logs/logEntry';
import { evaluateGates } from '../../effects/gates';
import type { CardDefinitionLookup } from './definitions';
import { getDefinition } from './definitions';
import { computeCurrentPower, isKoImmune } from './power';
import { addToZoneTop, removeFromZone } from './zoneOps';
import { createActionLogger } from './actionLogger';

export type KoCause = 'battle' | 'effect';

const REPLACEMENT_OPT_KEY = (recordId: string) => `koReplacement:${recordId}`;

function typeIncludes(types: string[], required: string): boolean {
  const needle = required.toLowerCase();
  return types.some((t) =>
    t
      .split(/[\/,]+/)
      .map((p) => p.trim().toLowerCase())
      .some((p) => p.includes(needle)),
  );
}

function conditionApplies(
  cond: ContinuousPowerCondition | undefined,
  record: ContinuousEffectRecord,
  state: GameState,
  instanceId: string,
  defs: CardDefinitionLookup,
): boolean {
  if (!cond) return true;
  const instance = state.cardsById[instanceId];
  if (!instance) return false;
  if (cond.donAttachedAtLeast !== undefined && instance.donAttached.length < cond.donAttachedAtLeast) return false;
  if (cond.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === instance.ownerId;
    if (cond.turn === 'your' && !isOwnersTurn) return false;
    if (cond.turn === 'opponent' && isOwnersTurn) return false;
  }
  if (cond.rested !== undefined && (instance.orientation === 'rested') !== cond.rested) return false;
  if (cond.gate && !evaluateGates(cond.gate, state, defs, record.ownerId, record.sourceInstanceId)) return false;
  return true;
}

function handMatchesFilter(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
  filter: KoReplacementHandFilter | undefined,
): boolean {
  const inst = state.cardsById[instanceId];
  if (!inst || inst.currentZone !== 'hand') return false;
  const def = getDefinition(defs, inst);
  if (filter?.categories?.length && !filter.categories.includes(def.category as Exclude<CardCategory, 'don' | 'leader'>)) return false;
  if (filter?.category && def.category !== filter.category) return false;
  if (filter?.typeIncludes && !typeIncludes(def.types, filter.typeIncludes)) return false;
  if (filter?.maxCurrentPower !== undefined && computeCurrentPower(defs, state, instanceId) > filter.maxCurrentPower) return false;
  return true;
}

function eligibleHandCards(
  defs: CardDefinitionLookup,
  state: GameState,
  ownerId: string,
  filter: KoReplacementHandFilter | undefined,
): string[] {
  const hand = state.players[ownerId]?.hand.cardIds ?? [];
  return hand.filter((id) => handMatchesFilter(defs, state, id, filter));
}

function replacementApplies(mod: ContinuousKoReplacementModifier, cause: KoCause): boolean {
  if (mod.scope === 'any') return true;
  if (mod.scope === 'battle' && cause === 'battle') return true;
  if (mod.scope === 'effect' && cause === 'effect') return true;
  return false;
}

export function findKoReplacementRecord(
  state: GameState,
  targetInstanceId: string,
  cause: KoCause,
  defs: CardDefinitionLookup,
): ContinuousEffectRecord | null {
  const target = state.cardsById[targetInstanceId];
  if (!target) return null;
  for (const record of state.continuousEffects) {
    const mod = record.koReplacementModifier;
    if (!mod || mod.appliesToInstanceId !== targetInstanceId) continue;
    if (!replacementApplies(mod, cause)) continue;
    if (!conditionApplies(mod.condition, record, state, targetInstanceId, defs)) continue;
    const source = state.cardsById[record.sourceInstanceId];
    if (mod.oncePerTurn && source?.oncePerTurnUsed.includes(REPLACEMENT_OPT_KEY(record.id))) continue;
    if (mod.action.kind === 'trashFromHand') {
      const eligible = eligibleHandCards(defs, state, target.ownerId, mod.action.filter);
      if (eligible.length < mod.action.count) continue;
    }
    return record;
  }
  return null;
}

export function buildKoReplacementConfirmChoice(
  state: GameState,
  targetInstanceId: string,
  record: ContinuousEffectRecord,
  choiceId: string,
  resumeState: PendingChoice['resumeState'],
): PendingChoice {
  const target = state.cardsById[targetInstanceId]!;
  return {
    id: choiceId,
    playerId: target.ownerId,
    kind: 'YES_NO',
    prompt: record.description,
    constraints: { min: 0, max: 1 },
    sourceInstanceId: record.sourceInstanceId,
    sourceEffectId: 'koReplacement',
    resumeState,
  };
}

export function buildKoReplacementPayChoice(
  state: GameState,
  targetInstanceId: string,
  record: ContinuousEffectRecord,
  choiceId: string,
  resumeState: PendingChoice['resumeState'],
  defs: CardDefinitionLookup,
): PendingChoice | null {
  const mod = record.koReplacementModifier!;
  const target = state.cardsById[targetInstanceId];
  if (!target) return null;
  if (mod.action.kind === 'trashSelf') return null;
  const eligible = eligibleHandCards(defs, state, target.ownerId, mod.action.filter);
  return {
    id: choiceId,
    playerId: target.ownerId,
    kind: 'SELECT_CARDS',
    prompt: 'Choose card(s) to trash from your hand to avoid the K.O.',
    constraints: { min: mod.action.count, max: mod.action.count, candidateInstanceIds: eligible },
    sourceInstanceId: record.sourceInstanceId,
    sourceEffectId: 'koReplacement',
    resumeState,
  };
}

export function applyKoToTrash(
  state: GameState,
  targetInstanceId: string,
  actorPlayerId: string,
  cause: KoCause,
  defs: CardDefinitionLookup,
  actionId: string | null,
): { state: GameState; log: GameLogEntry[] } {
  const inst = state.cardsById[targetInstanceId];
  if (!inst) return { state, log: [] };
  if (isKoImmune(defs, state, targetInstanceId, cause)) {
    const logger = createActionLogger(state, actionId);
    logger.push({
      actorPlayerId,
      type: 'EFFECT_RESOLVED',
      message: `${targetInstanceId} cannot be K.O.'d — the K.O. is prevented.`,
      data: { targetInstanceId, koPrevented: true },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
    return { state: { ...state, log: [...state.log, ...logger.log] }, log: logger.log };
  }
  const owner = state.players[inst.ownerId];
  const logger = createActionLogger(state, actionId);
  const cardsById = { ...state.cardsById, [targetInstanceId]: { ...inst, currentZone: 'trash' as const, donAttached: [] } };
  const newOwner = {
    ...owner,
    characterArea: removeFromZone(owner.characterArea, targetInstanceId),
    stageArea: removeFromZone(owner.stageArea, targetInstanceId),
    trash: addToZoneTop(owner.trash, targetInstanceId),
  };
  logger.push({
    actorPlayerId,
    type: 'CHARACTER_KO',
    message: `${targetInstanceId} was K.O.'d and moved to trash.`,
    data: { targetInstanceId, cause },
    relatedCardInstanceIds: [targetInstanceId],
    visibility: 'public',
  });
  return {
    state: {
      ...state,
      cardsById,
      players: { ...state.players, [inst.ownerId]: newOwner },
      continuousEffects: state.continuousEffects.filter((ce) => ce.sourceInstanceId !== targetInstanceId),
      log: [...state.log, ...logger.log],
    },
    log: logger.log,
  };
}

export function applyKoReplacementCost(
  state: GameState,
  targetInstanceId: string,
  record: ContinuousEffectRecord,
  selectedHandIds: string[],
  actionId: string | null,
): { state: GameState; log: GameLogEntry[] } {
  const mod = record.koReplacementModifier!;
  const target = state.cardsById[targetInstanceId];
  if (!target) return { state, log: [] };
  const logger = createActionLogger(state, actionId);
  let working = state;
  let cardsById = { ...working.cardsById };

  if (mod.action.kind === 'trashSelf') {
    const owner = working.players[target.ownerId];
    cardsById = { ...cardsById, [targetInstanceId]: { ...target, currentZone: 'trash', donAttached: [] } };
    working = {
      ...working,
      cardsById,
      players: {
        ...working.players,
        [target.ownerId]: {
          ...owner,
          characterArea: removeFromZone(owner.characterArea, targetInstanceId),
          stageArea: removeFromZone(owner.stageArea, targetInstanceId),
          trash: addToZoneTop(owner.trash, targetInstanceId),
        },
      },
      continuousEffects: working.continuousEffects.filter((ce) => ce.sourceInstanceId !== targetInstanceId),
    };
    logger.push({
      actorPlayerId: target.ownerId,
      type: 'CARD_MOVED',
      message: `${targetInstanceId} was trashed as a K.O. replacement (not K.O.'d).`,
      data: { targetInstanceId, koReplacement: true },
      relatedCardInstanceIds: [targetInstanceId],
      visibility: 'public',
    });
  } else {
    for (const id of selectedHandIds) {
      const inst = cardsById[id];
      if (!inst || inst.currentZone !== 'hand') continue;
      const owner = working.players[inst.ownerId];
      cardsById = { ...cardsById, [id]: { ...inst, currentZone: 'trash', donAttached: [] } };
      working = {
        ...working,
        cardsById,
        players: {
          ...working.players,
          [inst.ownerId]: {
            ...owner,
            hand: removeFromZone(owner.hand, id),
            trash: addToZoneTop(owner.trash, id),
          },
        },
      };
      logger.push({
        actorPlayerId: inst.ownerId,
        type: 'CARD_MOVED',
        message: `${id} trashed from hand as a K.O. replacement.`,
        data: { from: 'hand', to: 'trash', koReplacement: true },
        relatedCardInstanceIds: [id],
        visibility: 'public',
      });
    }
  }

  const source = working.cardsById[record.sourceInstanceId];
  if (mod.oncePerTurn && source) {
    cardsById = {
      ...working.cardsById,
      [record.sourceInstanceId]: {
        ...source,
        oncePerTurnUsed: [...source.oncePerTurnUsed, REPLACEMENT_OPT_KEY(record.id)],
      },
    };
    working = { ...working, cardsById };
  }

  logger.push({
    actorPlayerId: target.ownerId,
    type: 'EFFECT_RESOLVED',
    message: `K.O. of ${targetInstanceId} was replaced.`,
    data: { targetInstanceId, recordId: record.id },
    relatedCardInstanceIds: [targetInstanceId],
    visibility: 'public',
  });

  return { state: { ...working, log: [...working.log, ...logger.log] }, log: logger.log };
}

export function koReplacementDescription(mod: ContinuousKoReplacementModifier): string {
  switch (mod.action.kind) {
    case 'trashSelf':
      return 'If this Character would be K.O.\'d, trash it instead?';
    case 'trashFromHand': {
      const parts: string[] = [`Trash ${mod.action.count} card${mod.action.count === 1 ? '' : 's'} from your hand`];
      const f = mod.action.filter;
      if (f?.category) parts.push(String(f.category));
      if (f?.maxCurrentPower !== undefined) parts.push(`with ${f.maxCurrentPower} power or less`);
      parts.push('to avoid this K.O.?');
      return parts.join(' ');
    }
  }
}
