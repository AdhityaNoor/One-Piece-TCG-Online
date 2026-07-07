/**
 * K.O. replacement ("would be K.O.'d … you may … instead") runtime.
 *
 * Continuous `koReplacementModifier` records on GameState are checked before
 * every effect or battle K.O. When the owner accepts, the replacement cost is
 * paid and the K.O. is skipped (no [On K.O.] for effect/battle K.O. paths).
 */
import type { CardCategory } from '../../state/card';
import type {
  ContinuousEffectRecord,
  ContinuousKoReplacementModifier,
  GameState,
  KoReplacementHandFilter,
} from '../../state/game';
import type { KoReplacementResumeState, PendingChoice } from '../../events/pendingChoice';
import type { GameLogEntry } from '../../logs/logEntry';
import type { CardDefinitionLookup } from './definitions';
import { getDefinition } from './definitions';
import { computeCurrentPower, continuousTargetConditionApplies, isKoImmune, sourceConditionApplies, targetInAuraGroup } from './power';
import { addToZoneTop, removeFromZone } from './zoneOps';
import { createActionLogger } from './actionLogger';
import { fieldDonIds, payAbilityCost, requiredDonMinusCount } from '../../effects/abilityCost';
import { EffectContextImpl } from '../../effects/effectContext';
import type { KoReplacementAction } from '../../state/game';

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
  if (filter?.minCurrentPower !== undefined && computeCurrentPower(defs, state, instanceId) < filter.minCurrentPower) return false;
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

function eligibleRestCharacters(state: GameState, ownerId: string, excludeInstanceId?: string): string[] {
  const charArea = state.players[ownerId]?.characterArea.cardIds ?? [];
  return charArea.filter((id) => id !== excludeInstanceId && state.cardsById[id]?.currentZone === 'characterArea');
}

function restCardInState(state: GameState, instanceId: string): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst || inst.orientation === null || inst.orientation === 'rested') return state;
  return {
    ...state,
    cardsById: { ...state.cardsById, [instanceId]: { ...inst, orientation: 'rested' } },
  };
}

function koChoiceRouting(
  record: ContinuousEffectRecord,
  resumeState: PendingChoice['resumeState'],
): { sourceEffectId: 'ir' | 'rule:battleKoReplacement'; sourceInstanceId: string } {
  if (resumeState?.koReplacement?.battle) {
    return { sourceEffectId: 'rule:battleKoReplacement', sourceInstanceId: record.sourceInstanceId };
  }
  return {
    sourceEffectId: 'ir',
    sourceInstanceId: resumeState?.koReplacement?.ir?.sourceInstanceId ?? record.sourceInstanceId,
  };
}

function replacementCostIsImmediate(action: KoReplacementAction): boolean {
  if (action.kind === 'chooseLifeToHand') return action.position === 'top';
  return action.kind === 'trashSelf' || action.kind === 'trashSource' || action.kind === 'restSource';
}

function recordById(state: GameState, recordId: string) {
  return state.continuousEffects.find((r) => r.id === recordId) ?? null;
}

function replacementApplies(mod: ContinuousKoReplacementModifier, cause: KoCause): boolean {
  if (mod.scope === 'any') return true;
  if (mod.scope === 'battle' && cause === 'battle') return true;
  if (mod.scope === 'effect' && cause === 'effect') return true;
  return false;
}

function replacementTargetMatches(
  mod: ContinuousKoReplacementModifier,
  record: ContinuousEffectRecord,
  state: GameState,
  targetInstanceId: string,
  defs: CardDefinitionLookup,
): boolean {
  if (mod.appliesToInstanceId !== undefined) {
    return mod.appliesToInstanceId === targetInstanceId;
  }
  if (mod.appliesToGroup) {
    if (mod.appliesToGroup.excludeSource && targetInstanceId === record.sourceInstanceId) return false;
    return targetInAuraGroup(mod.appliesToGroup, record, state, targetInstanceId, defs);
  }
  return false;
}

function replacementCostAvailable(
  mod: ContinuousKoReplacementModifier,
  record: ContinuousEffectRecord,
  state: GameState,
  targetInstanceId: string,
  defs: CardDefinitionLookup,
): boolean {
  const target = state.cardsById[targetInstanceId];
  if (!target) return false;
  if (mod.action.kind === 'trashFromHand') {
    const eligible = eligibleHandCards(defs, state, target.ownerId, mod.action.filter);
    return eligible.length >= mod.action.count;
  }
  if (mod.action.kind === 'trashSource') {
    const source = state.cardsById[record.sourceInstanceId];
    return source?.currentZone === 'characterArea';
  }
  if (mod.action.kind === 'restSource') {
    const source = state.cardsById[record.sourceInstanceId];
    return source?.currentZone === 'characterArea';
  }
  if (mod.action.kind === 'restCharacter') {
    const eligible = eligibleRestCharacters(state, target.ownerId, targetInstanceId);
    return eligible.length >= mod.action.count;
  }
  if (mod.action.kind === 'payAbilityCosts') {
    const donRequired = requiredDonMinusCount(mod.action.costs);
    if (donRequired > fieldDonIds(state, target.ownerId).length) return false;
    for (const cost of mod.action.costs) {
      if (cost.kind === 'restThis') {
        const source = state.cardsById[record.sourceInstanceId];
        if (!source || source.orientation !== 'active') return false;
      }
      if (cost.kind === 'trashThis') {
        const source = state.cardsById[record.sourceInstanceId];
        if (!source || source.currentZone !== 'characterArea') return false;
      }
    }
    return true;
  }
  if (mod.action.kind === 'chooseLifeToHand') {
    return (state.players[target.ownerId]?.lifeArea.cardIds.length ?? 0) >= 1;
  }
  return true;
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
    if (!mod) continue;
    if (!replacementTargetMatches(mod, record, state, targetInstanceId, defs)) continue;
    if (!replacementApplies(mod, cause)) continue;
    if (!continuousTargetConditionApplies(mod.condition, record, state, targetInstanceId, defs)) continue;
    if (!sourceConditionApplies(mod.sourceCondition, record, state)) continue;
    const source = state.cardsById[record.sourceInstanceId];
    if (mod.oncePerTurn && source?.oncePerTurnUsed.includes(REPLACEMENT_OPT_KEY(record.id))) continue;
    if (!replacementCostAvailable(mod, record, state, targetInstanceId, defs)) continue;
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
  const routing = koChoiceRouting(record, resumeState);
  return {
    id: choiceId,
    playerId: target.ownerId,
    kind: 'YES_NO',
    prompt: record.description,
    constraints: { min: 0, max: 1 },
    sourceInstanceId: routing.sourceInstanceId,
    sourceEffectId: routing.sourceEffectId,
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
  const routing = koChoiceRouting(record, resumeState);
  if (mod.action.kind === 'trashSelf') return null;
  if (mod.action.kind === 'trashSource') return null;
  if (mod.action.kind === 'restSource') return null;
  if (mod.action.kind === 'chooseLifeToHand' && mod.action.position === 'top') return null;
  if (mod.action.kind === 'restCharacter') {
    const eligible = eligibleRestCharacters(state, target.ownerId, targetInstanceId);
    return {
      id: choiceId,
      playerId: target.ownerId,
      kind: 'SELECT_CARDS',
      prompt: `Choose ${mod.action.count} Character${mod.action.count === 1 ? '' : 's'} to rest to avoid the K.O.`,
      constraints: { min: mod.action.count, max: mod.action.count, candidateInstanceIds: eligible },
      sourceInstanceId: routing.sourceInstanceId,
      sourceEffectId: routing.sourceEffectId,
      resumeState,
    };
  }
  if (mod.action.kind === 'payAbilityCosts') {
    const donCount = requiredDonMinusCount(mod.action.costs);
    if (donCount > 0) {
      const eligible = fieldDonIds(state, target.ownerId);
      return {
        id: choiceId,
        playerId: target.ownerId,
        kind: 'SELECT_CARDS',
        prompt: `Choose ${donCount} DON!! card${donCount === 1 ? '' : 's'} to return to your DON!! deck to avoid the K.O.`,
        constraints: { min: donCount, max: donCount, candidateInstanceIds: eligible },
        sourceInstanceId: routing.sourceInstanceId,
        sourceEffectId: routing.sourceEffectId,
        resumeState,
      };
    }
    return null;
  }
  if (mod.action.kind === 'chooseLifeToHand' && mod.action.position === 'topOrBottom') {
    const life = state.players[target.ownerId]?.lifeArea.cardIds ?? [];
    const options: { label: string }[] = [{ label: 'Top Life card' }];
    if (life.length > 1) options.push({ label: 'Bottom Life card' });
    return {
      id: choiceId,
      playerId: target.ownerId,
      kind: 'SELECT_OPTION',
      prompt: 'Choose a Life card to add to your hand to avoid the K.O.',
      constraints: { min: 1, max: 1, options: options.map(({ label }) => ({ label })) },
      sourceInstanceId: routing.sourceInstanceId,
      sourceEffectId: routing.sourceEffectId,
      resumeState,
    };
  }
  if (mod.action.kind !== 'trashFromHand') return null;
  const eligible = eligibleHandCards(defs, state, target.ownerId, mod.action.filter);
  return {
    id: choiceId,
    playerId: target.ownerId,
    kind: 'SELECT_CARDS',
    prompt: 'Choose card(s) to trash from your hand to avoid the K.O.',
    constraints: { min: mod.action.count, max: mod.action.count, candidateInstanceIds: eligible },
    sourceInstanceId: routing.sourceInstanceId,
    sourceEffectId: routing.sourceEffectId,
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
  selection: string[] | number,
  defs: CardDefinitionLookup,
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
  } else if (mod.action.kind === 'trashSource') {
    const sourceId = record.sourceInstanceId;
    const source = cardsById[sourceId];
    if (source && source.currentZone === 'characterArea') {
      const owner = working.players[source.ownerId];
      cardsById = { ...cardsById, [sourceId]: { ...source, currentZone: 'trash', donAttached: [] } };
      working = {
        ...working,
        cardsById,
        players: {
          ...working.players,
          [source.ownerId]: {
            ...owner,
            characterArea: removeFromZone(owner.characterArea, sourceId),
            trash: addToZoneTop(owner.trash, sourceId),
          },
        },
        continuousEffects: working.continuousEffects.filter((ce) => ce.sourceInstanceId !== sourceId),
      };
      logger.push({
        actorPlayerId: source.ownerId,
        type: 'CARD_MOVED',
        message: `${sourceId} was trashed as a K.O. replacement (not K.O.'d).`,
        data: { sourceInstanceId: sourceId, targetInstanceId, koReplacement: true },
        relatedCardInstanceIds: [sourceId, targetInstanceId],
        visibility: 'public',
      });
    }
  } else if (mod.action.kind === 'restSource') {
    const sourceId = record.sourceInstanceId;
    working = restCardInState(working, sourceId);
    logger.push({
      actorPlayerId: target.ownerId,
      type: 'EFFECT_RESOLVED',
      message: `${sourceId} was rested as a K.O. replacement.`,
      data: { sourceInstanceId: sourceId, targetInstanceId, koReplacement: true },
      relatedCardInstanceIds: [sourceId, targetInstanceId],
      visibility: 'public',
    });
  } else if (mod.action.kind === 'restCharacter') {
    const selectedIds = Array.isArray(selection) ? selection : [];
    for (const id of selectedIds) {
      working = restCardInState(working, id);
      logger.push({
        actorPlayerId: target.ownerId,
        type: 'EFFECT_RESOLVED',
        message: `${id} was rested as a K.O. replacement.`,
        data: { restedInstanceId: id, targetInstanceId, koReplacement: true },
        relatedCardInstanceIds: [id, targetInstanceId],
        visibility: 'public',
      });
    }
  } else if (mod.action.kind === 'payAbilityCosts') {
    const selectedIds = Array.isArray(selection) ? selection : [];
    const paid = payAbilityCost(working, record.sourceInstanceId, target.ownerId, mod.action.costs, actionId, selectedIds);
    working = paid.state;
    logger.log.push(...paid.log);
  } else if (mod.action.kind === 'chooseLifeToHand') {
    const ownerId = target.ownerId;
    const life = working.players[ownerId]?.lifeArea.cardIds ?? [];
    let lifePosition: 'top' | 'bottom' = 'top';
    if (mod.action.position === 'topOrBottom') {
      const idx = typeof selection === 'number' ? selection : 0;
      lifePosition = idx === 1 && life.length > 1 ? 'bottom' : 'top';
    }
    const lifeCardId = lifePosition === 'top' ? life[0] : life[life.length - 1];
    if (lifeCardId) {
      const ctx = new EffectContextImpl(working, record.sourceInstanceId, defs, actionId);
      ctx.moveToHand(lifeCardId);
      const moved = ctx.finish();
      working = moved.state;
      logger.log.push(...moved.log);
    }
  } else {
    const selectedIds = Array.isArray(selection) ? selection : [];
    for (const id of selectedIds) {
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
    case 'trashSource':
      return 'Use this Character\'s replacement to avoid the K.O. (trash this Character instead)?';
    case 'restSource':
      return 'Use this Character\'s replacement to avoid the K.O. (rest this Character instead)?';
    case 'restCharacter':
      return `Rest ${mod.action.count} of your Character${mod.action.count === 1 ? '' : 's'} to avoid this K.O.?`;
    case 'payAbilityCosts': {
      const donCount = requiredDonMinusCount(mod.action.costs);
      if (donCount > 0) {
        return `Return ${donCount} DON!! card${donCount === 1 ? '' : 's'} from your field to your DON!! deck to avoid this K.O.?`;
      }
      return 'Pay the replacement cost to avoid this K.O.?';
    }
    case 'chooseLifeToHand':
      return mod.action.position === 'topOrBottom'
        ? 'Add 1 card from the top or bottom of your Life cards to your hand to avoid this K.O.?'
        : 'Add the top card of your Life cards to your hand to avoid this K.O.?';
    case 'trashFromHand': {
      const parts: string[] = [`Trash ${mod.action.count} card${mod.action.count === 1 ? '' : 's'} from your hand`];
      const f = mod.action.filter;
      if (f?.category) parts.push(String(f.category));
      if (f?.minCurrentPower !== undefined) parts.push(`with ${f.minCurrentPower} power or more`);
      if (f?.maxCurrentPower !== undefined) parts.push(`with ${f.maxCurrentPower} power or less`);
      parts.push('to avoid this K.O.?');
      return parts.join(' ');
    }
  }
}

export type KoReplacementStepResult = {
  state: GameState;
  log: GameLogEntry[];
  pendingChoices: PendingChoice[];
  /** Resume the paused effect or battle once replacement (or declined K.O.) is resolved. */
  resumeKr?: KoReplacementResumeState;
  /** Effect-path decline: caller should fire [On K.O.] on this target before resuming IR. */
  declinedEffectKoTargetId?: string;
};

/** Resolve one K.O. replacement PendingChoice step (confirm or pay-cost). */
export function resolveKoReplacementStep(
  state: GameState,
  choice: PendingChoice,
  response: string[] | number | boolean,
  defs: CardDefinitionLookup,
  actionId: string | null,
): KoReplacementStepResult {
  const kr = choice.resumeState?.koReplacement;
  if (!kr) return { state, log: [], pendingChoices: [] };

  const remaining = state.pendingChoices.filter((c) => c.id !== choice.id);
  let working: GameState = { ...state, pendingChoices: remaining };
  const record = recordById(working, kr.recordId);
  if (!record) return { state: working, log: [], pendingChoices: [] };

  if (choice.kind === 'YES_NO') {
    const accepted = response === true;
    if (!accepted) {
      const applied = applyKoToTrash(working, kr.targetInstanceId, kr.actorPlayerId, kr.cause, defs, actionId);
      return {
        state: applied.state,
        log: applied.log,
        pendingChoices: [],
        resumeKr: kr,
        ...(kr.cause === 'effect' ? { declinedEffectKoTargetId: kr.targetInstanceId } : {}),
      };
    }
    const mod = record.koReplacementModifier!;
    if (replacementCostIsImmediate(mod.action)) {
      const replaced = applyKoReplacementCost(working, kr.targetInstanceId, record, [], defs, actionId);
      return { state: replaced.state, log: replaced.log, pendingChoices: [], resumeKr: kr };
    }
    const payChoice = buildKoReplacementPayChoice(
      working,
      kr.targetInstanceId,
      record,
      `${choice.id}__pay`,
      {
        abilityIndex: choice.resumeState!.abilityIndex,
        opIndex: choice.resumeState!.opIndex,
        bindings: choice.resumeState!.bindings,
        ...(choice.resumeState!.branchIndex !== undefined ? { branchIndex: choice.resumeState!.branchIndex, branchOpIndex: choice.resumeState!.branchOpIndex } : {}),
        koReplacement: { ...kr, phase: 'payCost' },
      },
      defs,
    );
    if (!payChoice) return { state: working, log: [], pendingChoices: [] };
    return { state: working, log: [], pendingChoices: [payChoice] };
  }

  if (kr.phase === 'payCost') {
    const selection = choice.kind === 'SELECT_OPTION'
      ? (typeof response === 'number' ? response : 0)
      : (Array.isArray(response) ? response : []);
    const replaced = applyKoReplacementCost(working, kr.targetInstanceId, record, selection, defs, actionId);
    return { state: replaced.state, log: replaced.log, pendingChoices: [], resumeKr: kr };
  }

  return { state: working, log: [], pendingChoices: [] };
}

/** Shared validation for K.O. replacement PendingChoices (ir + battle paths). */
export function validateKoReplacementResponse(choice: PendingChoice, response: unknown): string[] {
  const reasons: string[] = [];
  if (choice.kind === 'YES_NO') {
    if (typeof response !== 'boolean') reasons.push('A K.O. replacement choice expects a boolean (yes/no).');
  } else if (choice.kind === 'SELECT_CARDS') {
    if (!Array.isArray(response)) reasons.push('A K.O. replacement pay-cost choice expects selected instance ids.');
    else {
      const { min, max, candidateInstanceIds } = choice.constraints;
      if (response.length < min || response.length > max) reasons.push(`Select between ${min} and ${max} card(s) (got ${response.length}).`);
      const candidates = new Set(candidateInstanceIds ?? []);
      for (const id of response) {
        if (typeof id !== 'string' || !candidates.has(id)) reasons.push(`'${String(id)}' is not eligible for this replacement cost.`);
      }
    }
  } else if (choice.kind === 'SELECT_OPTION') {
    const optionCount = choice.constraints.options?.length ?? 0;
    if (typeof response !== 'number' || !Number.isInteger(response) || response < 0 || response >= optionCount) {
      reasons.push(`A K.O. replacement option choice expects an option index between 0 and ${Math.max(0, optionCount - 1)}.`);
    }
  } else {
    reasons.push(`Unexpected choice kind '${choice.kind}' for K.O. replacement.`);
  }
  return reasons;
}
