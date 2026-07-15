import type { Action_V2, PlayerReference_V2, Zone_V2 } from '../../cards/effectCompiler_V2/types_V2';
import { createSeededRng } from '../rng';
import { createActionLogger } from '../rules/shared/actionLogger';
import { computeCurrentPower } from '../rules/shared/power';
import type { GameState } from '../state/game';
import type { PlayerState } from '../state/player';
import type { Zone } from '../state/zone';
import { createChoicePromptRecord_V2, type ChoicePromptRecord_V2 } from './choices_V2';
import { applyLifeDamage_V2, fixedNumberValue_V2 } from './damage_V2';
import { createDelayedEffectRecord_V2, type DelayedEffectRecord_V2 } from './delayedEffects_V2';
import { addDonFromDonDeck_V2 } from './donRamp_V2';
import { drawCards_V2 } from './draw_V2';
import { evaluateValue_V2 } from './conditions_V2';
import { createActivatedEventRecord_V2, type ActivatedEventRecord_V2 } from './eventActivation_V2';
import {
  createLifeLookBufferAtPosition_V2,
  createLookBufferFromIds_V2,
  reorderLifeArea_V2,
  reorderLookBufferRemainderToDeckBottom_V2,
  reorderLookBufferRemainderToDeckTop_V2,
  type LookBuffer_V2,
} from './lookBuffer_V2';
import { moveCards_V2 } from './moveCard_V2';
import {
  createEffectInvalidationRecord_V2,
  createKeywordModifierRecord_V2,
  createStatModifierRecord_V2,
  type EffectInvalidationRecord_V2,
  type KeywordModifierRecord_V2,
  type StatModifierRecord_V2,
} from './modifiers_V2';
import { playCards_V2 } from './playCard_V2';
import { createPermissionEffectRecord_V2, type PermissionEffectRecord_V2 } from './permissions_V2';
import { createReplacementEffectRecord_V2, type ReplacementEffectRecord_V2 } from './replacements_V2';
import { resolveSelector_V2, selectResolvedCandidateIds_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export interface ActionExecutionResult_V2 {
  state: GameState;
  log: GameState['log'];
  delayedEffects?: DelayedEffectRecord_V2[];
  replacementEffects?: ReplacementEffectRecord_V2[];
  permissionEffects?: PermissionEffectRecord_V2[];
  statModifiers?: StatModifierRecord_V2[];
  keywordModifiers?: KeywordModifierRecord_V2[];
  counterModifiers?: StatModifierRecord_V2[];
  effectInvalidations?: EffectInvalidationRecord_V2[];
  activatedEvents?: ActivatedEventRecord_V2[];
  choicePrompts?: ChoicePromptRecord_V2[];
  lookBuffers?: LookBuffer_V2[];
  bindings?: import('./selectorResolver_V2').EffectBindings_V2;
}

function withActionResultBinding_V2(
  ctx: SelectorContext_V2,
  result: ActionExecutionResult_V2,
  actionId: string | null,
): ActionExecutionResult_V2 {
  if (!actionId) return result;
  const succeeded = result.log.length > 0;
  const selectedObjects = result.bindings?.selectedObjects ?? ctx.bindings?.selectedObjects ?? {};
  const actionResults = result.bindings?.actionResults ?? ctx.bindings?.actionResults ?? {};
  return {
    ...result,
    bindings: {
      selectedObjects,
      actionResults: {
        ...actionResults,
        [actionId]: succeeded,
      },
    },
  };
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

function zoneKeyForShuffle(zone: Zone_V2): keyof Pick<PlayerState, 'deck' | 'donDeck' | 'hand' | 'characterArea' | 'stageArea' | 'costArea' | 'trash' | 'lifeArea'> | null {
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

function shufflePlayerZone_V2(ctx: SelectorContext_V2, action: Extract<Action_V2, { type: 'SHUFFLE_ZONE' }>, actionId: string | null): ActionExecutionResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const player = ctx.state.players[playerId];
  const zoneKey = zoneKeyForShuffle(action.zone);
  if (!player || !zoneKey) return { state: ctx.state, log: [] };

  const zone = player[zoneKey] as Zone;
  const rng = createSeededRng(ctx.state.rng.seed);
  const shuffled = rng.shuffle(ctx.state.rng, zone.cardIds);
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${playerId} shuffled ${action.zone}.`,
    data: { playerId, zone: action.zone },
    relatedCardInstanceIds: shuffled.result,
    visibility: action.zone === 'DECK' || action.zone === 'HAND' || action.zone === 'LIFE' ? { visibleTo: [playerId] } : 'public',
  });

  const state = {
    ...ctx.state,
    rng: shuffled.nextState,
    players: {
      ...ctx.state.players,
      [playerId]: {
        ...player,
        [zoneKey]: { ...zone, cardIds: shuffled.result },
      },
    },
    log: [...ctx.state.log, ...logger.log],
  };
  return { state, log: logger.log };
}

function setGameOver_V2(ctx: SelectorContext_V2, action: Extract<Action_V2, { type: 'PLAYER_WINS' | 'PLAYER_LOSES' }>, actionId: string | null): ActionExecutionResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const winnerId = action.type === 'PLAYER_WINS' ? playerId : opponentOf(ctx.state, playerId);
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'GAME_OVER',
    message: `${winnerId} wins by card effect.`,
    data: { winnerId, affectedPlayerId: playerId, result: action.type },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  const state = {
    ...ctx.state,
    gameOver: { winnerId, reason: 'cardEffect' as const },
    log: [...ctx.state.log, ...logger.log],
  };
  return { state, log: logger.log };
}

function createReplacementEffect_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'CREATE_DELAYED_EFFECT' | 'CREATE_REPLACEMENT_EFFECT' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const existingCount = Array.isArray(ctx.bindings?.actionResults.REPLACEMENT_EFFECTS_V2)
    ? ctx.bindings.actionResults.REPLACEMENT_EFFECTS_V2.length
    : 0;
  const replacement = createReplacementEffectRecord_V2({
    effect: action.effect,
    duration: action.duration,
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} registered a V2 replacement effect.`,
    data: {
      replacementEffectId: replacement.id,
      timing: replacement.timing,
      duration: replacement.duration,
    },
    relatedCardInstanceIds: [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    replacementEffects: [replacement],
  };
}

function createDelayedEffect_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'CREATE_DELAYED_EFFECT' | 'CREATE_REPLACEMENT_EFFECT' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const existingCount = Array.isArray(ctx.bindings?.actionResults.DELAYED_EFFECTS_V2)
    ? ctx.bindings.actionResults.DELAYED_EFFECTS_V2.length
    : 0;
  const delayed = createDelayedEffectRecord_V2({
    effect: action.effect,
    duration: action.duration,
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} registered a V2 delayed effect.`,
    data: {
      delayedEffectId: delayed.id,
      timing: delayed.timing,
      duration: delayed.duration,
    },
    relatedCardInstanceIds: [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    delayedEffects: [delayed],
  };
}

function createPermissionEffect_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'ALLOW_ACTION' | 'PREVENT_ACTION' }> | Extract<Action_V2, { type: 'PREVENT_SELECTION' | 'PREVENT_ZONE_CHANGE' | 'MODIFY_VALID_TARGETS' | 'MODIFY_PLAY_PERMISSION' }> | Extract<Action_V2, { type: 'MODIFY_DEFEAT_CONDITION' | 'MODIFY_VICTORY_CONDITION' | 'MODIFY_DECK_CONSTRUCTION' | 'MODIFY_STARTING_SETUP' | 'MODIFY_AREA_CAPACITY' | 'MODIFY_RULE_PERMISSION' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const existingCount = Array.isArray(ctx.bindings?.actionResults.PERMISSION_EFFECTS_V2)
    ? ctx.bindings.actionResults.PERMISSION_EFFECTS_V2.length
    : 0;
  const permission = createPermissionEffectRecord_V2({
    action: action as Parameters<typeof createPermissionEffectRecord_V2>[0]['action'],
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} registered a V2 permission effect.`,
    data: {
      permissionEffectId: permission.id,
      kind: permission.kind,
      action: permission.action,
      duration: permission.duration,
    },
    relatedCardInstanceIds: [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    permissionEffects: [permission],
  };
}

function applyDamageAction_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'DEAL_DAMAGE' | 'TAKE_DAMAGE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const targetPlayerId = playerIdForReference(ctx, action.targetPlayer);
  return applyLifeDamage_V2({
    state: ctx.state,
    actorPlayerId: ctx.controllerId,
    targetPlayerId,
    amount: action.amount,
    processing: action.type === 'TAKE_DAMAGE' ? action.lifeProcessing : 'CHECK_TRIGGER',
    actionId,
  });
}

function createStatModifier_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'MODIFY_POWER' | 'MODIFY_COST' | 'MODIFY_COUNTER' | 'MODIFY_LIFE_VALUE' | 'MODIFY_DAMAGE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const existingCount = Array.isArray(ctx.bindings?.actionResults.STAT_MODIFIERS_V2)
    ? ctx.bindings.actionResults.STAT_MODIFIERS_V2.length
    : 0;
  const statModifier = createStatModifierRecord_V2({
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    stat: action.type === 'MODIFY_POWER' ? 'POWER' : action.type === 'MODIFY_COST' ? 'COST' : 'COUNTER',
    selector: action.selector,
    propertyLayer: action.propertyLayer,
    operation: action.operation,
    value: action.value,
    duration: action.duration,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} registered a V2 ${statModifier.stat.toLowerCase()} modifier.`,
    data: {
      statModifierId: statModifier.id,
      stat: statModifier.stat,
      operation: statModifier.operation,
      duration: statModifier.duration,
    },
    relatedCardInstanceIds: [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    statModifiers: [statModifier],
    ...(statModifier.stat === 'COUNTER' ? { counterModifiers: [statModifier] } : {}),
  };
}

function powerValueForLayer_V2(ctx: SelectorContext_V2, instanceId: string, layer: Extract<Action_V2, { type: 'SWAP_POWER' }>['propertyLayer']): number {
  if (layer === 'CURRENT_VALUE') return computeCurrentPower(ctx.defs, ctx.state, instanceId);
  const inst = ctx.state.cardsById[instanceId];
  const def = inst ? ctx.defs[inst.cardDefinitionId] : undefined;
  return def?.basePower ?? 0;
}

function swapPower_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'SWAP_POWER' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = resolved.candidateInstanceIds.slice(0, 2);
  if (selectedIds.length !== 2) return { state: ctx.state, log: [] };

  const [firstId, secondId] = selectedIds;
  const firstPower = powerValueForLayer_V2(ctx, firstId, action.propertyLayer);
  const secondPower = powerValueForLayer_V2(ctx, secondId, action.propertyLayer);
  const existingCount = Array.isArray(ctx.bindings?.actionResults.STAT_MODIFIERS_V2)
    ? ctx.bindings.actionResults.STAT_MODIFIERS_V2.length
    : 0;
  const firstModifier = createStatModifierRecord_V2({
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    stat: 'POWER',
    selector: { subject: 'CARD', relations: ['INSTANCE_ID'], instanceIds: [firstId], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
    propertyLayer: action.propertyLayer,
    operation: 'SET',
    value: { kind: 'NUMBER', value: secondPower },
    duration: action.duration,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const secondModifier = createStatModifierRecord_V2({
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    stat: 'POWER',
    selector: { subject: 'CARD', relations: ['INSTANCE_ID'], instanceIds: [secondId], quantity: { kind: 'EXACTLY', value: { kind: 'NUMBER', value: 1 } } },
    propertyLayer: action.propertyLayer,
    operation: 'SET',
    value: { kind: 'NUMBER', value: firstPower },
    duration: action.duration,
    turnNumber: ctx.state.turnNumber,
    existingCount: existingCount + 1,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} swapped power between 2 card(s) with a V2 effect.`,
    data: {
      action: 'SWAP_POWER',
      targetInstanceIds: selectedIds,
      propertyLayer: action.propertyLayer,
      duration: action.duration,
      values: {
        [firstId]: secondPower,
        [secondId]: firstPower,
      },
    },
    relatedCardInstanceIds: selectedIds,
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    statModifiers: [firstModifier, secondModifier],
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        SELECTED_PREVIOUSLY: selectedIds,
        PREVIOUS_ACTION_TARGET: selectedIds,
      },
      actionResults: {
        ...(ctx.bindings?.actionResults ?? {}),
        STAT_MODIFIERS_V2: [...(Array.isArray(ctx.bindings?.actionResults.STAT_MODIFIERS_V2) ? ctx.bindings.actionResults.STAT_MODIFIERS_V2 : []), firstModifier, secondModifier],
      },
    },
  };
}

function changeAttackTarget_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'CHANGE_ATTACK_TARGET' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const battle = ctx.state.currentBattle;
  if (!battle) return { state: ctx.state, log: [] };
  const resolved = resolveSelector_V2(ctx, action.newTarget);
  const newTargetInstanceId = resolved.candidateInstanceIds[0];
  const target = newTargetInstanceId ? ctx.state.cardsById[newTargetInstanceId] : undefined;
  if (!newTargetInstanceId || !target) return { state: ctx.state, log: [] };
  if (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea') return { state: ctx.state, log: [] };
  if (target.controllerId !== ctx.controllerId) return { state: ctx.state, log: [] };

  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `Attack target changed to ${newTargetInstanceId} with a V2 effect.`,
    data: {
      action: 'CHANGE_ATTACK_TARGET',
      newTargetInstanceId,
      previousTargetInstanceId: battle.targetInstanceId,
    },
    relatedCardInstanceIds: [newTargetInstanceId, battle.attackerInstanceId],
    visibility: 'public',
  });
  return {
    state: {
      ...ctx.state,
      currentBattle: { ...battle, targetInstanceId: newTargetInstanceId },
      log: [...ctx.state.log, ...logger.log],
    },
    log: logger.log,
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        SELECTED_PREVIOUSLY: [newTargetInstanceId],
        PREVIOUS_ACTION_TARGET: [newTargetInstanceId],
      },
      actionResults: ctx.bindings?.actionResults ?? {},
    },
  };
}

function eventActivationTiming_V2(ctx: SelectorContext_V2): import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2 {
  if (ctx.currentTiming?.kind === 'STANDARD_TIMING' && ctx.currentTiming.timing === 'EVENT_COUNTER') {
    return { kind: 'STANDARD_TIMING', timing: 'EVENT_COUNTER' };
  }
  return { kind: 'STANDARD_TIMING', timing: 'EVENT_MAIN' };
}

function activateEvent_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'ACTIVATE_EVENT' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved);
  if (selectedIds.length === 0) return { state: ctx.state, log: [] };

  const timing = eventActivationTiming_V2(ctx);
  const existing = Array.isArray(ctx.bindings?.actionResults.ACTIVATED_EVENTS_V2)
    ? ctx.bindings.actionResults.ACTIVATED_EVENTS_V2 as ActivatedEventRecord_V2[]
    : [];
  const activatedEvents = selectedIds.flatMap((eventInstanceId, index) => {
    const inst = ctx.state.cardsById[eventInstanceId];
    const def = inst ? ctx.defs[inst.cardDefinitionId] : undefined;
    if (!inst || !def || def.category !== 'event') return [];
    return [createActivatedEventRecord_V2({
      sourceInstanceId: ctx.sourceInstanceId,
      controllerId: playerIdForReference(ctx, action.player),
      eventInstanceId,
      eventCardNumber: def.cardNumber,
      timing,
      turnNumber: ctx.state.turnNumber,
      existingCount: existing.length + index,
    })];
  });
  if (activatedEvents.length === 0) return { state: ctx.state, log: [] };

  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} activated ${activatedEvents.length} Event card(s) with a V2 effect.`,
    data: {
      action: 'ACTIVATE_EVENT',
      activatedEventIds: activatedEvents.map((event) => event.id),
      eventInstanceIds: activatedEvents.map((event) => event.eventInstanceId),
      timing,
    },
    relatedCardInstanceIds: activatedEvents.map((event) => event.eventInstanceId),
    visibility: 'public',
  });

  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    activatedEvents,
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        SELECTED_PREVIOUSLY: activatedEvents.map((event) => event.eventInstanceId),
        PREVIOUS_ACTION_TARGET: activatedEvents.map((event) => event.eventInstanceId),
      },
      actionResults: {
        ...(ctx.bindings?.actionResults ?? {}),
        ACTIVATED_EVENTS_V2: [...existing, ...activatedEvents],
      },
    },
  };
}

function createKeywordModifier_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'GRANT_KEYWORD' | 'REMOVE_KEYWORD' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const existingCount = Array.isArray(ctx.bindings?.actionResults.KEYWORD_MODIFIERS_V2)
    ? ctx.bindings.actionResults.KEYWORD_MODIFIERS_V2.length
    : 0;
  const keywordModifier = createKeywordModifierRecord_V2({
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    selector: action.selector,
    operation: action.type,
    keyword: action.keyword,
    duration: action.duration,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} registered a V2 keyword modifier.`,
    data: {
      keywordModifierId: keywordModifier.id,
      operation: keywordModifier.operation,
      keyword: keywordModifier.keyword,
      duration: keywordModifier.duration,
    },
    relatedCardInstanceIds: [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    keywordModifiers: [keywordModifier],
  };
}

function createEffectInvalidation_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'INVALIDATE_EFFECTS' | 'VALIDATE_EFFECTS' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const selectedIds = action.selector.subject === 'EFFECT'
    ? []
    : (() => {
      const resolved = resolveSelector_V2(ctx, action.selector);
        return selectResolvedCandidateIds_V2(ctx, resolved);
    })();
  const existingCount = Array.isArray(ctx.bindings?.actionResults.EFFECT_INVALIDATIONS_V2)
    ? ctx.bindings.actionResults.EFFECT_INVALIDATIONS_V2.length
    : 0;
  const invalidation = createEffectInvalidationRecord_V2({
    sourceInstanceId: ctx.sourceInstanceId,
    controllerId: ctx.controllerId,
    selector: action.selector,
    selectedInstanceIds: selectedIds,
    selectedEffectRefs: action.selector.subject === 'EFFECT' && action.selector.relations?.includes('THIS_EFFECT') ? [ctx.sourceInstanceId] : undefined,
    effectFilter: action.effectFilter,
    operation: action.type,
    duration: action.duration,
    turnNumber: ctx.state.turnNumber,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} registered a V2 effect ${action.type === 'INVALIDATE_EFFECTS' ? 'invalidation' : 'validation'} record.`,
    data: {
      effectInvalidationId: invalidation.id,
      operation: invalidation.operation,
      effectFilter: invalidation.effectFilter,
      selectedInstanceIds: selectedIds,
    },
    relatedCardInstanceIds: selectedIds.length ? selectedIds : [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    effectInvalidations: [invalidation],
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        SELECTED_PREVIOUSLY: selectedIds,
        PREVIOUS_ACTION_TARGET: selectedIds,
      },
      actionResults: {
        ...(ctx.bindings?.actionResults ?? {}),
        EFFECT_INVALIDATIONS_V2: [...(Array.isArray(ctx.bindings?.actionResults.EFFECT_INVALIDATIONS_V2) ? ctx.bindings.actionResults.EFFECT_INVALIDATIONS_V2 : []), invalidation],
      },
    },
  };
}

function trashOrKoCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'TRASH_CARD' | 'KO_CARD' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  return moveCards_V2(ctx, {
    type: 'MOVE_CARD',
    selector: action.selector,
    to: { zone: 'TRASH' },
    cause: action.cause === 'EFFECT' ? 'EFFECT' : action.cause === 'RULE' ? 'RULE' : 'RULE',
  }, actionId);
}

function setRestState_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'REST_CARD' | 'SET_CARD_ACTIVE' | 'REST_DON' | 'SET_DON_ACTIVE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved);
  if (selectedIds.length === 0) return { state: ctx.state, log: [] };

  const rest = action.type === 'REST_CARD' || action.type === 'REST_DON';
  const cardsById = { ...ctx.state.cardsById };
  for (const id of selectedIds) {
    const card = cardsById[id];
    if (!card) continue;
    cardsById[id] = card.orientation === null
      ? { ...card, donRested: rest }
      : { ...card, orientation: rest ? 'rested' : 'active' };
  }
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: rest ? 'CARD_RESTED' : 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} ${rest ? 'rested' : 'set active'} ${selectedIds.length} card(s) with a V2 effect.`,
    data: { action: action.type, targetInstanceIds: selectedIds },
    relatedCardInstanceIds: selectedIds,
    visibility: 'public',
  });
  const state = { ...ctx.state, cardsById, log: [...ctx.state.log, ...logger.log] };
  return { state, log: logger.log };
}

function addCardToLifeAction_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'ADD_CARD_TO_LIFE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const moved = moveCards_V2(ctx, {
    type: 'MOVE_CARD',
    selector: action.selector,
    to: { zone: 'LIFE', owner: action.player, position: action.position },
    cause: 'EFFECT',
  }, actionId);
  if (moved.movedInstanceIds.length === 0) return moved;
  const cardsById = { ...moved.state.cardsById };
  for (const id of moved.movedInstanceIds) {
    const card = cardsById[id];
    if (card) cardsById[id] = { ...card, faceState: action.face === 'FACE_UP' ? 'faceUp' : 'faceDown', revealedTo: action.face === 'FACE_UP' ? 'all' : [] };
  }
  return { ...moved, state: { ...moved.state, cardsById } };
}

function revealCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'REVEAL_CARD' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved);
  if (selectedIds.length === 0) return { state: ctx.state, log: [] };
  const cardsById = { ...ctx.state.cardsById };
  for (const id of selectedIds) {
    const card = cardsById[id];
    if (card) cardsById[id] = { ...card, revealedTo: 'all' };
  }
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} revealed ${selectedIds.length} card(s) with a V2 effect.`,
    data: { viewer: action.viewers, revealedInstanceIds: selectedIds },
    relatedCardInstanceIds: selectedIds,
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, cardsById, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        SELECTED_PREVIOUSLY: selectedIds,
        PREVIOUS_ACTION_TARGET: selectedIds,
      },
      actionResults: ctx.bindings?.actionResults ?? {},
    },
  };
}

function turnLifeFace_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'TURN_LIFE_FACE_UP' | 'TURN_LIFE_FACE_DOWN' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved);
  if (selectedIds.length === 0) return { state: ctx.state, log: [] };
  const faceUp = action.type === 'TURN_LIFE_FACE_UP';
  const cardsById = { ...ctx.state.cardsById };
  for (const id of selectedIds) {
    const card = cardsById[id];
    if (card) cardsById[id] = { ...card, faceState: faceUp ? 'faceUp' : 'faceDown', revealedTo: faceUp ? 'all' : [] };
  }
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} turned ${selectedIds.length} Life card(s) ${faceUp ? 'face-up' : 'face-down'} with a V2 effect.`,
    data: { action: action.type, targetInstanceIds: selectedIds },
    relatedCardInstanceIds: selectedIds,
    visibility: faceUp ? 'public' : { visibleTo: [ctx.controllerId] },
  });
  return { state: { ...ctx.state, cardsById, log: [...ctx.state.log, ...logger.log] }, log: logger.log };
}

function detachDonFromHosts_V2(cardsById: GameState['cardsById'], donInstanceId: string): GameState['cardsById'] {
  let next = cardsById;
  for (const [id, card] of Object.entries(next)) {
    if (!card.donAttached.includes(donInstanceId)) continue;
    next = {
      ...next,
      [id]: { ...card, donAttached: card.donAttached.filter((attachedId) => attachedId !== donInstanceId) },
    };
  }
  return next;
}

function giveDon_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'GIVE_DON' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolvedDon = resolveSelector_V2(ctx, action.donSelector);
  const donIds = selectResolvedCandidateIds_V2(ctx, resolvedDon);
  const resolvedTarget = resolveSelector_V2(ctx, action.target);
  const targetId = resolvedTarget.candidateInstanceIds[0];
  const target = targetId ? ctx.state.cardsById[targetId] : undefined;
  if (!target || donIds.length === 0) return { state: ctx.state, log: [] };

  let cardsById = ctx.state.cardsById;
  for (const donId of donIds) {
    const don = cardsById[donId];
    if (!don) continue;
    cardsById = detachDonFromHosts_V2(cardsById, donId);
    const currentTarget = cardsById[targetId];
    cardsById = {
      ...cardsById,
      [donId]: { ...cardsById[donId], donRested: true, revealedTo: 'all' },
      [targetId]: { ...currentTarget, donAttached: [...currentTarget.donAttached, donId] },
    };
  }

  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'DON_GIVEN',
    message: `${ctx.controllerId} gave ${donIds.length} DON!! with a V2 effect.`,
    data: { donInstanceIds: donIds, targetInstanceId: targetId },
    relatedCardInstanceIds: [...donIds, targetId],
    visibility: 'public',
  });
  return { state: { ...ctx.state, cardsById, log: [...ctx.state.log, ...logger.log] }, log: logger.log };
}

function createChoicePromptAction_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'PLAYER_CHOOSES' | 'OPPONENT_CHOOSES' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const existingCount = Array.isArray(ctx.bindings?.actionResults.CHOICE_PROMPTS_V2)
    ? ctx.bindings.actionResults.CHOICE_PROMPTS_V2.length
    : 0;
  const choicePrompt = createChoicePromptRecord_V2({
    ctx,
    chooser: action.type === 'OPPONENT_CHOOSES' ? 'OPPONENT' : 'PLAYER',
    options: action.options,
    minimumChoices: action.minimumChoices,
    maximumChoices: action.maximumChoices,
    existingCount,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'CHOICE_REQUESTED',
    message: `${choicePrompt.chooserPlayerId} must choose ${choicePrompt.minimumChoices}-${choicePrompt.maximumChoices} V2 option(s).`,
    data: {
      choicePromptId: choicePrompt.id,
      chooserPlayerId: choicePrompt.chooserPlayerId,
      minimumChoices: choicePrompt.minimumChoices,
      maximumChoices: choicePrompt.maximumChoices,
      optionCount: choicePrompt.options.length,
    },
    relatedCardInstanceIds: [ctx.sourceInstanceId],
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    choicePrompts: [choicePrompt],
  };
}

function numericValue_V2(ctx: SelectorContext_V2, value: Action_V2 extends infer _ ? Parameters<typeof evaluateValue_V2>[1] : never, fallback: number): number {
  const evaluated = evaluateValue_V2(ctx, value);
  return typeof evaluated.value === 'number' && Number.isFinite(evaluated.value) ? evaluated.value : fallback;
}

function lookAtCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'LOOK_AT_CARDS' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const count = numericValue_V2(ctx, action.count, 0);
  const resolved = resolveSelector_V2(ctx, action.source);
  const lookedIds = resolved.candidateInstanceIds.slice(0, Math.max(0, count));
  const buffer = createLookBufferFromIds_V2({
    id: `${ctx.sourceInstanceId}:look:${ctx.state.turnNumber}`,
    playerId,
    sourceZone: 'deck',
    lookedInstanceIds: lookedIds,
  });
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${playerId} looked at ${lookedIds.length} card(s) with a V2 effect.`,
    data: { lookBufferId: buffer.id, playerId, sourceZone: 'DECK', count: lookedIds.length },
    relatedCardInstanceIds: lookedIds,
    visibility: { visibleTo: [playerId] },
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    lookBuffers: [buffer],
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        LOOKED_AT_PREVIOUSLY: lookedIds,
        SELECTED_PREVIOUSLY: lookedIds,
        REMAINDER_OF_PREVIOUS_SELECTION: lookedIds,
      },
      actionResults: { ...(ctx.bindings?.actionResults ?? {}), LOOK_BUFFER_V2: buffer },
    },
  };
}

function lookAtLife_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'LOOK_AT_LIFE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const count = numericValue_V2(ctx, action.count, ctx.state.players[playerId]?.lifeArea.cardIds.length ?? 0);
  const buffer = createLifeLookBufferAtPosition_V2(ctx.state, playerId, count, action.position, `${ctx.sourceInstanceId}:look-life:${ctx.state.turnNumber}`);
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} looked at ${buffer.lookedInstanceIds.length} Life card(s) with a V2 effect.`,
    data: { lookBufferId: buffer.id, playerId, position: action.position, count: buffer.lookedInstanceIds.length },
    relatedCardInstanceIds: buffer.lookedInstanceIds,
    visibility: { visibleTo: [ctx.controllerId] },
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    lookBuffers: [buffer],
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        LOOKED_AT_PREVIOUSLY: buffer.lookedInstanceIds,
        SELECTED_PREVIOUSLY: buffer.lookedInstanceIds,
        REMAINDER_OF_PREVIOUS_SELECTION: buffer.lookedInstanceIds,
      },
      actionResults: { ...(ctx.bindings?.actionResults ?? {}), LOOK_BUFFER_V2: buffer },
    },
  };
}

function selectCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'SELECT' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedIds = selectResolvedCandidateIds_V2(ctx, resolved);
  const logger = createActionLogger(ctx.state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} selected ${selectedIds.length} card(s) with a V2 effect.`,
    data: { selectionId: action.selectionId, selectedInstanceIds: selectedIds },
    relatedCardInstanceIds: selectedIds,
    visibility: 'public',
  });
  return {
    state: { ...ctx.state, log: [...ctx.state.log, ...logger.log] },
    log: logger.log,
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        [action.selectionId]: selectedIds,
        SELECTED_PREVIOUSLY: selectedIds,
        PREVIOUS_ACTION_TARGET: selectedIds,
      },
      actionResults: { ...(ctx.bindings?.actionResults ?? {}), [action.selectionId]: selectedIds },
    },
  };
}

function reorderCards_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'REORDER_CARDS' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, action.selector);
  const orderedIds = resolved.candidateInstanceIds;
  const buffer = ctx.bindings?.actionResults.LOOK_BUFFER_V2 as LookBuffer_V2 | undefined;
  let state = ctx.state;
  if (action.destination.zone === 'DECK' && buffer?.sourceZone === 'deck') {
    state = action.destination.position === 'TOP'
      ? reorderLookBufferRemainderToDeckTop_V2(ctx.state, { ...buffer, remainingInstanceIds: orderedIds }, orderedIds)
      : reorderLookBufferRemainderToDeckBottom_V2(ctx.state, { ...buffer, remainingInstanceIds: orderedIds }, orderedIds);
  }
  const logger = createActionLogger(state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} reordered ${orderedIds.length} card(s) with a V2 effect.`,
    data: { destination: action.destination, orderedInstanceIds: orderedIds },
    relatedCardInstanceIds: orderedIds,
    visibility: action.destination.zone === 'DECK' ? { visibleTo: [ctx.controllerId] } : 'public',
  });
  return { state: { ...state, log: [...state.log, ...logger.log] }, log: logger.log };
}

function reorderLife_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'REORDER_LIFE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const resolved = resolveSelector_V2(ctx, action.selector);
  const selectedSet = new Set(resolved.candidateInstanceIds);
  const currentLife = ctx.state.players[playerId]?.lifeArea.cardIds ?? [];
  const orderedLifeIds = [
    ...resolved.candidateInstanceIds,
    ...currentLife.filter((id) => !selectedSet.has(id)),
  ];
  const state = reorderLifeArea_V2(ctx.state, playerId, orderedLifeIds);
  const logger = createActionLogger(state, actionId);
  logger.push({
    actorPlayerId: ctx.controllerId,
    type: 'EFFECT_RESOLVED',
    message: `${ctx.controllerId} reordered ${resolved.candidateInstanceIds.length} Life card(s) with a V2 effect.`,
    data: { playerId, orderedInstanceIds: resolved.candidateInstanceIds, orderChooser: action.orderChooser },
    relatedCardInstanceIds: resolved.candidateInstanceIds,
    visibility: { visibleTo: [ctx.controllerId] },
  });
  return { state: { ...state, log: [...state.log, ...logger.log] }, log: logger.log };
}

function trashLife_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'TRASH_LIFE' }>,
  actionId: string | null,
): ActionExecutionResult_V2 {
  const playerId = playerIdForReference(ctx, action.player);
  const player = ctx.state.players[playerId];
  if (!player) return { state: ctx.state, log: [] };
  const count = fixedNumberValue_V2(action.count, 'TRASH_LIFE');
  const selectedIds = action.position === 'BOTTOM'
    ? player.lifeArea.cardIds.slice(Math.max(0, player.lifeArea.cardIds.length - count))
    : player.lifeArea.cardIds.slice(0, count);
  if (selectedIds.length === 0) return { state: ctx.state, log: [] };
  let state = ctx.state;
  for (const id of selectedIds) {
    state = moveCards_V2({
      ...ctx,
      state,
      bindings: {
        selectedObjects: { ...(ctx.bindings?.selectedObjects ?? {}), TRASH_LIFE_SELECTED: [id] },
        actionResults: ctx.bindings?.actionResults ?? {},
      },
    }, {
      type: 'MOVE_CARD',
      selector: { subject: 'ACTION_RESULT', relations: ['TRASH_LIFE_SELECTED'] },
      to: { zone: 'TRASH' },
      cause: 'EFFECT',
    }, actionId).state;
  }
  const log = state.log.slice(ctx.state.log.length);
  return { state, log };
}

export function executeAction_V2(ctx: SelectorContext_V2, action: Action_V2, actionId: string | null = null): ActionExecutionResult_V2 {
  let result: ActionExecutionResult_V2;
  switch (action.type) {
    case 'SELECT':
      result = selectCards_V2(ctx, action, actionId);
      break;
    case 'DRAW_CARD':
      result = drawCards_V2(ctx, action.player, action.count, actionId);
      break;
    case 'LOOK_AT_CARDS':
      result = lookAtCards_V2(ctx, action, actionId);
      break;
    case 'REORDER_CARDS':
      result = reorderCards_V2(ctx, action, actionId);
      break;
    case 'LOOK_AT_LIFE':
      result = lookAtLife_V2(ctx, action, actionId);
      break;
    case 'REORDER_LIFE':
      result = reorderLife_V2(ctx, action, actionId);
      break;
    case 'ADD_DON_FROM_DON_DECK':
      result = addDonFromDonDeck_V2({ ctx, player: action.player, count: action.count, state: action.state, actionId });
      break;
    case 'MOVE_CARD':
      result = moveCards_V2(ctx, action, actionId);
      break;
    case 'PLAY_CARD':
      result = playCards_V2(ctx, action, actionId);
      break;
    case 'TRASH_CARD':
    case 'KO_CARD':
      result = trashOrKoCards_V2(ctx, action, actionId);
      break;
    case 'ADD_CARD_TO_LIFE':
      result = addCardToLifeAction_V2(ctx, action, actionId);
      break;
    case 'TRASH_LIFE':
      result = trashLife_V2(ctx, action, actionId);
      break;
    case 'REVEAL_CARD':
      result = revealCards_V2(ctx, action, actionId);
      break;
    case 'TURN_LIFE_FACE_UP':
    case 'TURN_LIFE_FACE_DOWN':
      result = turnLifeFace_V2(ctx, action, actionId);
      break;
    case 'RETURN_DON_TO_DON_DECK':
      result = moveCards_V2(ctx, { type: 'MOVE_CARD', selector: action.selector, to: { zone: 'DON_DECK' }, cause: 'EFFECT' }, actionId);
      break;
    case 'REST_CARD':
    case 'SET_CARD_ACTIVE':
    case 'REST_DON':
    case 'SET_DON_ACTIVE':
      result = setRestState_V2(ctx, action, actionId);
      break;
    case 'GIVE_DON':
      result = giveDon_V2(ctx, action, actionId);
      break;
    case 'SHUFFLE_ZONE':
      result = shufflePlayerZone_V2(ctx, action, actionId);
      break;
    case 'PLAYER_WINS':
    case 'PLAYER_LOSES':
      result = setGameOver_V2(ctx, action, actionId);
      break;
    case 'PLAYER_CHOOSES':
    case 'OPPONENT_CHOOSES':
      result = createChoicePromptAction_V2(ctx, action, actionId);
      break;
    case 'DEAL_DAMAGE':
    case 'TAKE_DAMAGE':
      result = applyDamageAction_V2(ctx, action, actionId);
      break;
    case 'MODIFY_POWER':
    case 'MODIFY_COST':
    case 'MODIFY_COUNTER':
      result = createStatModifier_V2(ctx, action, actionId);
      break;
    case 'SWAP_POWER':
      result = swapPower_V2(ctx, action, actionId);
      break;
    case 'CHANGE_ATTACK_TARGET':
      result = changeAttackTarget_V2(ctx, action, actionId);
      break;
    case 'ACTIVATE_EVENT':
      result = activateEvent_V2(ctx, action, actionId);
      break;
    case 'GRANT_KEYWORD':
    case 'REMOVE_KEYWORD':
      result = createKeywordModifier_V2(ctx, action, actionId);
      break;
    case 'INVALIDATE_EFFECTS':
    case 'VALIDATE_EFFECTS':
      result = createEffectInvalidation_V2(ctx, action, actionId);
      break;
    case 'CREATE_REPLACEMENT_EFFECT':
      result = createReplacementEffect_V2(ctx, action, actionId);
      break;
    case 'CREATE_DELAYED_EFFECT':
      result = createDelayedEffect_V2(ctx, action, actionId);
      break;
    case 'ALLOW_ACTION':
    case 'PREVENT_ACTION':
    case 'PREVENT_ZONE_CHANGE':
    case 'MODIFY_PLAY_PERMISSION':
    case 'MODIFY_RULE_PERMISSION':
    case 'MODIFY_DECK_CONSTRUCTION':
    case 'MODIFY_DEFEAT_CONDITION':
    case 'MODIFY_STARTING_SETUP':
      result = createPermissionEffect_V2(ctx, action, actionId);
      break;
    default:
      throw new Error(`executeAction_V2 does not support ${action.type} yet.`);
  }
  return withActionResultBinding_V2(ctx, result, actionId);
}
