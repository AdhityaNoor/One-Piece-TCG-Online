import type { Action_V2, EffectDefinition_V2, ModifierExpression_V2, ResolutionNode_V2, Selector_V2, TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { PendingChoice } from '../events/pendingChoice';
import { executeAction_V2, type ActionExecutionResult_V2 } from './actions_V2';
import { evaluateCondition_V2, evaluateValue_V2 } from './conditions_V2';
import { v2ActionPreventionReasons, v2PlayPreventionReasons, v2SelectionPreventionReasons, v2ValidTargetModifierReasons, v2ZoneChangePreventionReasons } from './permissions_V2';
import { quantityBounds_V2, resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export interface ResolutionExecutionResult_V2 extends ActionExecutionResult_V2 {
  unsupportedReasons?: string[];
}

function emptyResult(ctx: SelectorContext_V2): ResolutionExecutionResult_V2 {
  return { state: ctx.state, log: [] };
}

function mergeSidecars(
  left: ResolutionExecutionResult_V2,
  right: ResolutionExecutionResult_V2,
): ResolutionExecutionResult_V2 {
  return {
    state: right.state,
    log: [...left.log, ...right.log],
    delayedEffects: [...(left.delayedEffects ?? []), ...(right.delayedEffects ?? [])],
    replacementEffects: [...(left.replacementEffects ?? []), ...(right.replacementEffects ?? [])],
    permissionEffects: [...(left.permissionEffects ?? []), ...(right.permissionEffects ?? [])],
    statModifiers: [...(left.statModifiers ?? []), ...(right.statModifiers ?? [])],
    keywordModifiers: [...(left.keywordModifiers ?? []), ...(right.keywordModifiers ?? [])],
    cardPropertyModifiers: [...(left.cardPropertyModifiers ?? []), ...(right.cardPropertyModifiers ?? [])],
    counterModifiers: [...(left.counterModifiers ?? []), ...(right.counterModifiers ?? [])],
    effectInvalidations: [...(left.effectInvalidations ?? []), ...(right.effectInvalidations ?? [])],
    activatedEvents: [...(left.activatedEvents ?? []), ...(right.activatedEvents ?? [])],
    gainedEffects: [...(left.gainedEffects ?? []), ...(right.gainedEffects ?? [])],
    gainedEffectRemovals: [...(left.gainedEffectRemovals ?? []), ...(right.gainedEffectRemovals ?? [])],
    choicePrompts: [...(left.choicePrompts ?? []), ...(right.choicePrompts ?? [])],
    lookBuffers: [...(left.lookBuffers ?? []), ...(right.lookBuffers ?? [])],
    bindings: {
      selectedObjects: {
        ...(left.bindings?.selectedObjects ?? {}),
        ...(right.bindings?.selectedObjects ?? {}),
      },
      actionResults: {
        ...(left.bindings?.actionResults ?? {}),
        ...(right.bindings?.actionResults ?? {}),
      },
    },
    unsupportedReasons: [...(left.unsupportedReasons ?? []), ...(right.unsupportedReasons ?? [])],
  };
}

function timingMatches_V2(left: TimingExpression_V2, right: TimingExpression_V2): boolean {
  if (left.kind === 'STANDARD_TIMING' && right.kind === 'STANDARD_TIMING') return left.timing === right.timing;
  return JSON.stringify(left) === JSON.stringify(right);
}

function executeActivatedEvent_V2(
  ctx: SelectorContext_V2,
  action: Extract<Action_V2, { type: 'ACTIVATE_EVENT' }>,
  actionId: string | null,
): ResolutionExecutionResult_V2 {
  const activation = executeAction_V2(ctx, action, actionId);
  if (!ctx.runtime || !activation.activatedEvents?.length) return activation;

  let aggregate: ResolutionExecutionResult_V2 = activation;
  let currentCtx: SelectorContext_V2 = {
    ...ctx,
    state: activation.state,
    bindings: {
      selectedObjects: {
        ...(ctx.bindings?.selectedObjects ?? {}),
        ...(activation.bindings?.selectedObjects ?? {}),
      },
      actionResults: {
        ...(ctx.bindings?.actionResults ?? {}),
        ...(activation.bindings?.actionResults ?? {}),
      },
    },
  };

  for (const event of activation.activatedEvents) {
    const program = ctx.runtime.programsByCardNumber[event.eventCardNumber];
    const ability = program?.abilities.find((candidate) => timingMatches_V2(candidate.timing, event.timing));
    if (!ability) {
      aggregate = withUnsupported(aggregate, [`ACTIVATE_EVENT found no ${event.timing.kind === 'STANDARD_TIMING' ? event.timing.timing : event.timing.kind} V2 ability for ${event.eventCardNumber}.`]);
      continue;
    }
    const nested = executeResolutionNode_V2({
      ...currentCtx,
      sourceInstanceId: event.eventInstanceId,
      controllerId: event.controllerId,
      currentTiming: event.timing,
    }, ability.resolution, ability.abilityId);
    const resolvedActivation = {
      ...event,
      status: 'RESOLVED' as const,
    };
    nested.activatedEvents = [
      ...(nested.activatedEvents ?? []),
      resolvedActivation,
    ];
    aggregate = mergeSidecars(aggregate, nested);
    currentCtx = {
      ...currentCtx,
      state: nested.state,
      bindings: {
        selectedObjects: {
          ...(currentCtx.bindings?.selectedObjects ?? {}),
          ...(nested.bindings?.selectedObjects ?? {}),
        },
        actionResults: {
          ...(currentCtx.bindings?.actionResults ?? {}),
          ...(nested.bindings?.actionResults ?? {}),
        },
      },
    };
  }

  return aggregate;
}

function withUnsupported(result: ResolutionExecutionResult_V2, unsupportedReasons: string[]): ResolutionExecutionResult_V2 {
  if (unsupportedReasons.length === 0) return result;
  return { ...result, unsupportedReasons: [...(result.unsupportedReasons ?? []), ...unsupportedReasons] };
}

function toNonNegativeInteger_V2(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function sourceZone_V2(ctx: SelectorContext_V2): EffectDefinition_V2['source']['sourceZone'] {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (source?.currentZone) {
    case 'leaderArea':
      return 'LEADER_AREA';
    case 'characterArea':
      return 'CHARACTER_AREA';
    case 'stageArea':
      return 'STAGE_AREA';
    case 'costArea':
      return 'COST_AREA';
    case 'hand':
      return 'HAND';
    case 'deck':
      return 'DECK';
    case 'trash':
      return 'TRASH';
    case 'lifeArea':
      return 'LIFE';
    case 'donDeck':
      return 'DON_DECK';
    default:
      return 'NONE';
  }
}

function generatedEffectDefinition_V2(
  ctx: SelectorContext_V2,
  id: string,
  category: EffectDefinition_V2['category'],
  applicationMode: EffectDefinition_V2['applicationMode'],
  timing: TimingExpression_V2 | undefined,
  resolution: ResolutionNode_V2,
): EffectDefinition_V2 {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  const def = source ? ctx.defs[source.cardDefinitionId] : undefined;
  return {
    id,
    source: {
      objectRef: 'GENERATED_EFFECT',
      objectId: ctx.sourceInstanceId,
      owner: 'CARD_OWNER',
      controller: 'CARD_CONTROLLER',
      sourceZone: sourceZone_V2(ctx),
    },
    category,
    applicationMode,
    activationZones: [sourceZone_V2(ctx)],
    ...(timing ? { timing } : {}),
    optionality: 'MANDATORY',
    resolution,
    metadata: {
      sourceCardNumber: def?.cardNumber ?? source?.cardDefinitionId ?? ctx.sourceInstanceId,
      effectIndex: 0,
      printedText: 'Generated V2 wrapper effect.',
      parserVersion: 'runtime-v2',
      authoringStatus: 'ASSIGNED',
    },
  };
}

function executeRepeatedNode_V2(
  ctx: SelectorContext_V2,
  node: ResolutionNode_V2,
  count: number,
  actionId: string | null,
): ResolutionExecutionResult_V2 {
  let aggregate = emptyResult(ctx);
  let currentCtx = ctx;
  for (let index = 0; index < count; index += 1) {
    const pendingBefore = currentCtx.state.pendingChoices.length;
    const childResult = executeResolutionNode_V2(currentCtx, node, actionId);
    aggregate = mergeSidecars(aggregate, childResult);
    if (childResult.state.pendingChoices.length > pendingBefore) {
      return withUnsupported(aggregate, ['V2 REPEAT/FOR_EACH suspended on a prompt; loop resume is not supported yet.']);
    }
    currentCtx = {
      ...currentCtx,
      state: childResult.state,
      bindings: {
        selectedObjects: {
          ...(currentCtx.bindings?.selectedObjects ?? {}),
          ...(childResult.bindings?.selectedObjects ?? {}),
        },
        actionResults: {
          ...(currentCtx.bindings?.actionResults ?? {}),
          ...(childResult.bindings?.actionResults ?? {}),
        },
      },
    };
  }
  return aggregate;
}

function executeForEachNode_V2(ctx: SelectorContext_V2, node: Extract<ResolutionNode_V2, { kind: 'FOR_EACH' }>, actionId: string | null): ResolutionExecutionResult_V2 {
  const resolved = resolveSelector_V2(ctx, node.items);
  let aggregate = emptyResult(ctx);
  let currentCtx = ctx;
  for (const itemId of resolved.candidateInstanceIds) {
    const pendingBefore = currentCtx.state.pendingChoices.length;
    const childCtx: SelectorContext_V2 = {
      ...currentCtx,
      bindings: {
        selectedObjects: {
          ...(currentCtx.bindings?.selectedObjects ?? {}),
          FOR_EACH_ITEM: [itemId],
          SELECTED_PREVIOUSLY: [itemId],
          PREVIOUS_ACTION_TARGET: [itemId],
        },
        actionResults: {
          ...(currentCtx.bindings?.actionResults ?? {}),
        },
      },
    };
    const childResult = executeResolutionNode_V2(childCtx, node.node, actionId);
    aggregate = mergeSidecars(aggregate, childResult);
    if (childResult.state.pendingChoices.length > pendingBefore) {
      return withUnsupported(aggregate, ['V2 FOR_EACH suspended on a prompt; loop resume is not supported yet.']);
    }
    currentCtx = {
      ...currentCtx,
      state: childResult.state,
      bindings: {
        selectedObjects: {
          ...(childCtx.bindings?.selectedObjects ?? {}),
          ...(childResult.bindings?.selectedObjects ?? {}),
        },
        actionResults: {
          ...(childCtx.bindings?.actionResults ?? {}),
          ...(childResult.bindings?.actionResults ?? {}),
        },
      },
    };
  }
  return aggregate;
}

function executeDelayedWrapper_V2(ctx: SelectorContext_V2, node: Extract<ResolutionNode_V2, { kind: 'DELAY' }>, actionId: string | null): ResolutionExecutionResult_V2 {
  const effect = generatedEffectDefinition_V2(
    ctx,
    `${ctx.sourceInstanceId}:delay:${ctx.state.turnNumber}`,
    'AUTO',
    'DELAYED',
    node.timing,
    node.node,
  );
  return executeAction_V2(ctx, {
    type: 'CREATE_DELAYED_EFFECT',
    effect,
    duration: node.expiration ?? { kind: 'THIS_TURN' },
  }, actionId);
}

function executeReplacementWrapper_V2(ctx: SelectorContext_V2, node: Extract<ResolutionNode_V2, { kind: 'REPLACEMENT' }>, actionId: string | null): ResolutionExecutionResult_V2 {
  const effect = generatedEffectDefinition_V2(
    ctx,
    `${ctx.sourceInstanceId}:replacement:${ctx.state.turnNumber}`,
    'REPLACEMENT',
    'CONTINUOUS',
    node.timing,
    node.node,
  );
  return executeAction_V2(ctx, {
    type: 'CREATE_REPLACEMENT_EFFECT',
    effect,
    duration: { kind: 'THIS_TURN' },
  }, actionId);
}

function continuousActionFromModifier_V2(
  selector: Selector_V2,
  modifier: ModifierExpression_V2,
  duration: Extract<ResolutionNode_V2, { kind: 'CREATE_CONTINUOUS_EFFECT' }>['duration'],
): Action_V2 | null {
  if (modifier.type === 'STAT_MODIFIER') {
    const type = modifier.stat === 'POWER'
      ? 'MODIFY_POWER'
      : modifier.stat === 'COST'
        ? 'MODIFY_COST'
        : modifier.stat === 'COUNTER'
          ? 'MODIFY_COUNTER'
          : modifier.stat === 'LIFE_VALUE'
            ? 'MODIFY_LIFE_VALUE'
            : 'MODIFY_DAMAGE';
    return {
      type,
      selector,
      propertyLayer: 'CURRENT_VALUE',
      operation: modifier.operation,
      value: modifier.value,
      duration,
    };
  }
  if (modifier.type === 'EFFECT_MODIFIER') {
    return {
      type: modifier.operation === 'GRANT_KEYWORD' ? 'GRANT_KEYWORD' : 'REMOVE_KEYWORD',
      selector,
      keyword: modifier.keyword,
      duration,
    };
  }
  if (modifier.type === 'PERMISSION_MODIFIER') {
    return {
      type: modifier.operation === 'PREVENT_ACTION' ? 'PREVENT_ACTION' : 'ALLOW_ACTION',
      selector,
      action: modifier.action,
      duration,
    };
  }
  return null;
}

function executeContinuousWrapper_V2(ctx: SelectorContext_V2, node: Extract<ResolutionNode_V2, { kind: 'CREATE_CONTINUOUS_EFFECT' }>, actionId: string | null): ResolutionExecutionResult_V2 {
  if (!node.selector) {
    return withUnsupported(emptyResult(ctx), [`CREATE_CONTINUOUS_EFFECT ${node.modifier.type} is missing a selector.`]);
  }
  const action = continuousActionFromModifier_V2(node.selector, node.modifier, node.duration);
  if (!action) return withUnsupported(emptyResult(ctx), [`CREATE_CONTINUOUS_EFFECT modifier ${node.modifier.type} is not executable yet.`]);
  return executeAction_V2(ctx, action, actionId);
}

function promptableSearchMoveToHand_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'MOVE_CARD') return null;
  const action = node.action;
  if (action.to.zone !== 'HAND') return null;
  if (action.selector.instanceIds?.length) return null;
  const isLookBufferSearch = action.selector.subject === 'ACTION_RESULT';
  const isDirectDeckSearch = action.selector.subject === 'CARD'
    && action.selector.zones?.includes('DECK');
  if (!isLookBufferSearch && !isDirectDeckSearch) return null;
  const resolved = resolveSelector_V2(ctx, action.selector);
  const candidateInstanceIds = filteredSelectionCandidateIds_V2(ctx, resolved.candidateInstanceIds, 'EFFECT').filter((id) =>
    v2ZoneChangePreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      candidateInstanceId: id,
      toZone: action.to.zone,
      cause: action.cause,
    }).length === 0,
  );
  if (candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? candidateInstanceIds.length : resolved.maximum;
  const visibleInstanceIds = isLookBufferSearch
    ? ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds
    : candidateInstanceIds;
  return {
    id: `${ctx.sourceInstanceId}:v2-search:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: ctx.controllerId,
    kind: 'SELECT_CARDS',
    prompt: `Choose up to ${maximum} card${maximum === 1 ? '' : 's'} to add to your hand.`,
    constraints: {
      min: resolved.minimum,
      max: maximum,
      zoneId: 'deck',
      filterDescription: isLookBufferSearch
        ? 'Cards looked at by this V2 search effect.'
        : 'Cards in deck eligible for this V2 search effect.',
      candidateInstanceIds,
      visibleInstanceIds,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:selectMoveToHand',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2SelectMoveToHand: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        moveAction: action,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptableChooseOption_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'CHOOSE') return null;
  const options = node.options.map((_, index) => ({ label: `Option ${index + 1}` }));
  return {
    id: `${ctx.sourceInstanceId}:v2-choose:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: node.chooser === 'OPPONENT'
      ? Object.keys(ctx.state.players).find((id) => id !== ctx.controllerId) ?? ctx.controllerId
      : ctx.controllerId,
    kind: 'SELECT_OPTION',
    prompt: 'Choose one V2 effect option.',
    constraints: {
      min: node.minimumChoices,
      max: node.maximumChoices,
      options,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:chooseOption',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2ChooseOption: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        options: node.options,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptableOptional_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'OPTIONAL') return null;
  return {
    id: `${ctx.sourceInstanceId}:v2-optional:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: ctx.controllerId,
    kind: 'YES_NO',
    prompt: 'Resolve this optional V2 effect?',
    constraints: { min: 0, max: 1 },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:optionalResolution',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2OptionalResolution: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        node: node.node,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptableReorderCards_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'REORDER_CARDS') return null;
  if (node.action.orderChooser !== 'PLAYER' && node.action.orderChooser !== 'OWNER') return null;
  if (node.action.selector.instanceIds?.length) return null;
  const resolved = resolveSelector_V2(ctx, node.action.selector);
  const candidateInstanceIds = filteredSelectionCandidateIds_V2(ctx, resolved.candidateInstanceIds, 'EFFECT');
  if (candidateInstanceIds.length <= 1) return null;
  return {
    id: `${ctx.sourceInstanceId}:v2-reorder:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: ctx.controllerId,
    kind: 'SELECT_CARDS',
    prompt: 'Choose the order for these V2 effect cards.',
    constraints: {
      min: candidateInstanceIds.length,
      max: candidateInstanceIds.length,
      zoneId: node.action.destination.zone === 'DECK' ? 'deck' : undefined,
      filterDescription: 'Select every card in the order to place them.',
      candidateInstanceIds,
      visibleInstanceIds: ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:reorderCards',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2ReorderCards: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        reorderAction: node.action,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptablePlayCard_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'PLAY_CARD') return null;
  if (node.action.selector.instanceIds?.length) return null;
  if (node.action.selector.relations?.includes('THIS_CARD')) return null;
  const selectorZones = node.action.selector.zones ?? [];
  const isLookBufferPlay = node.action.selector.subject === 'ACTION_RESULT';
  const isZoneChoicePlay = node.action.selector.subject === 'CARD'
    && selectorZones.some((zone) => zone === 'HAND' || zone === 'TRASH' || zone === 'DECK');
  if (!isLookBufferPlay && !isZoneChoicePlay && !node.action.selector.chooser) return null;
  const resolved = resolveSelector_V2(ctx, node.action.selector);
  const playerId = node.action.player === 'OPPONENT'
    ? Object.keys(ctx.state.players).find((id) => id !== ctx.controllerId) ?? ctx.controllerId
    : ctx.controllerId;
  const candidateInstanceIds = filteredSelectionCandidateIds_V2(ctx, resolved.candidateInstanceIds, 'EFFECT').filter((id) =>
    v2PlayPreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      playerId,
      candidateInstanceId: id,
      cause: 'EFFECT',
    }).length === 0,
  );
  if (candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? candidateInstanceIds.length : resolved.maximum;
  const visibleInstanceIds = isLookBufferPlay
    ? ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds
    : candidateInstanceIds;
  const zoneId = selectorZones.length === 1
    ? selectorZones[0] === 'HAND'
      ? 'hand'
      : selectorZones[0] === 'TRASH'
        ? 'trash'
        : selectorZones[0] === 'DECK'
          ? 'deck'
          : undefined
    : undefined;
  return {
    id: `${ctx.sourceInstanceId}:v2-play-select:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId,
    kind: 'SELECT_CARDS',
    prompt: `Choose up to ${maximum} card${maximum === 1 ? '' : 's'} to play.`,
    constraints: {
      min: resolved.minimum,
      max: maximum,
      zoneId,
      filterDescription: isLookBufferPlay
        ? 'Cards looked at by this V2 play effect.'
        : 'Cards eligible to play with this V2 effect.',
      candidateInstanceIds,
      visibleInstanceIds,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:selectPlayCard',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2SelectPlayCard: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        playAction: node.action,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function selectorZoneId_V2(zones: import('../../cards/effectCompiler_V2/types_V2').Zone_V2[] | undefined): string | undefined {
  if (!zones || zones.length !== 1) return undefined;
  switch (zones[0]) {
    case 'HAND':
      return 'hand';
    case 'TRASH':
      return 'trash';
    case 'DECK':
      return 'deck';
    case 'CHARACTER_AREA':
      return 'characterArea';
    case 'LEADER_AREA':
      return 'leaderArea';
    case 'STAGE_AREA':
      return 'stageArea';
    case 'COST_AREA':
      return 'costArea';
    case 'LIFE':
      return 'lifeArea';
    case 'DON_DECK':
      return 'donDeck';
    default:
      return undefined;
  }
}

function playerIdForPromptChooser_V2(ctx: SelectorContext_V2, chooser: import('../../cards/effectCompiler_V2/types_V2').Selector_V2['chooser']): string {
  if (chooser === 'OPPONENT') {
    return Object.keys(ctx.state.players).find((id) => id !== ctx.controllerId) ?? ctx.controllerId;
  }
  return ctx.controllerId;
}

function actionTargetSelector_V2(action: Action_V2): { selector: import('../../cards/effectCompiler_V2/types_V2').Selector_V2; targetField: 'selector' | 'newTarget' | 'mixedTargets' } | null {
  if ('selector' in action) return { selector: action.selector, targetField: 'selector' };
  if (action.type === 'CHANGE_ATTACK_TARGET') return { selector: action.newTarget, targetField: 'newTarget' };
  return null;
}

function shouldPromptActionTarget_V2(action: Action_V2, selector: import('../../cards/effectCompiler_V2/types_V2').Selector_V2): boolean {
  if (selector.instanceIds?.length) return false;
  if (selector.relations?.includes('THIS_CARD')) return false;
  if (selector.ordering === 'DECK_ORDER' && !selector.chooser) return false;
  if (action.type === 'PLAY_CARD') return false;
  if (action.type === 'REORDER_CARDS') return false;
  if (action.type === 'MOVE_CARD' && action.to.zone === 'HAND' && (selector.subject === 'ACTION_RESULT' || selector.zones?.includes('DECK'))) return false;
  return Boolean(selector.chooser) || selector.quantity?.kind === 'UP_TO';
}

function shouldPromptSelector_V2(selector: import('../../cards/effectCompiler_V2/types_V2').Selector_V2): boolean {
  if (selector.instanceIds?.length) return false;
  if (selector.relations?.includes('THIS_CARD')) return false;
  if (selector.ordering === 'DECK_ORDER' && !selector.chooser) return false;
  return Boolean(selector.chooser) || selector.quantity?.kind === 'UP_TO';
}

function filteredSelectionCandidateIds_V2(ctx: SelectorContext_V2, candidateInstanceIds: string[], cause: 'EFFECT' | 'MANUAL'): string[] {
  return candidateInstanceIds.filter((id) =>
    v2SelectionPreventionReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      candidateInstanceId: id,
      cause,
    }).length === 0,
  );
}

function filteredPromptCandidateIds_V2(ctx: SelectorContext_V2, action: Action_V2, candidateInstanceIds: string[]): string[] {
  const selectableIds = filteredSelectionCandidateIds_V2(ctx, candidateInstanceIds, 'EFFECT');
  const validTargetIds = selectableIds.filter((id) =>
    v2ValidTargetModifierReasons({
      ctx,
      permissionEffects: ctx.sidecars?.permissionEffects ?? [],
      action: action.type,
      candidateInstanceId: id,
      cause: 'EFFECT',
    }).length === 0,
  );
  if (action.type === 'MOVE_CARD') {
    return validTargetIds.filter((id) =>
      v2ZoneChangePreventionReasons({
        ctx,
        permissionEffects: ctx.sidecars?.permissionEffects ?? [],
        candidateInstanceId: id,
        toZone: action.to.zone,
        cause: action.cause,
      }).length === 0,
    );
  }
  if (action.type === 'KO_CARD') {
    return validTargetIds.filter((id) =>
      v2ActionPreventionReasons({
        ctx,
        permissionEffects: ctx.sidecars?.permissionEffects ?? [],
        action: 'KO_CARD',
        candidateInstanceId: id,
        cause: action.cause,
      }).length === 0,
    );
  }
  if (action.type === 'REST_CARD' || action.type === 'SET_CARD_ACTIVE' || action.type === 'REST_DON' || action.type === 'SET_DON_ACTIVE') {
    return validTargetIds.filter((id) =>
      v2ActionPreventionReasons({
        ctx,
        permissionEffects: ctx.sidecars?.permissionEffects ?? [],
        action: action.type,
        candidateInstanceId: id,
        cause: 'EFFECT',
      }).length === 0,
    );
  }
  return validTargetIds;
}

function promptableActionTarget_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION') return null;
  const target = actionTargetSelector_V2(node.action);
  if (!target || !shouldPromptActionTarget_V2(node.action, target.selector)) return null;
  const resolved = resolveSelector_V2(ctx, target.selector);
  const candidateInstanceIds = filteredPromptCandidateIds_V2(ctx, node.action, resolved.candidateInstanceIds);
  if (candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? candidateInstanceIds.length : resolved.maximum;
  return {
    id: `${ctx.sourceInstanceId}:v2-target:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: playerIdForPromptChooser_V2(ctx, target.selector.chooser),
    kind: 'SELECT_CARDS',
    prompt: `Choose up to ${maximum} target${maximum === 1 ? '' : 's'} for this V2 effect.`,
    constraints: {
      min: resolved.minimum,
      max: maximum,
      zoneId: selectorZoneId_V2(target.selector.zones),
      filterDescription: 'Cards eligible as targets for this V2 effect.',
      candidateInstanceIds,
      visibleInstanceIds: target.selector.subject === 'ACTION_RESULT'
        ? ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds
        : candidateInstanceIds,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:selectActionTarget',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2SelectActionTarget: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        action: node.action,
        targetField: target.targetField,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptableMixedRestTarget_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'REST_MIXED_TARGETS') return null;
  const candidateInstanceIds = [...new Set(node.action.selectors.flatMap((selector) => {
    const resolved = resolveSelector_V2(ctx, selector);
    return filteredPromptCandidateIds_V2(ctx, node.action, resolved.candidateInstanceIds);
  }))];
  if (candidateInstanceIds.length === 0) return null;
  const bounds = quantityBounds_V2(node.action.quantity);
  const maximum = bounds.maximum < 0 ? candidateInstanceIds.length : bounds.maximum;
  return {
    id: `${ctx.sourceInstanceId}:v2-mixed-rest-target:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: playerIdForPromptChooser_V2(ctx, node.action.selectors.find((selector) => selector.chooser)?.chooser),
    kind: 'SELECT_CARDS',
    prompt: `Choose up to ${maximum} target${maximum === 1 ? '' : 's'} for this V2 effect.`,
    constraints: {
      min: bounds.minimum,
      max: maximum,
      filterDescription: 'Cards or DON!! eligible as targets for this V2 effect.',
      candidateInstanceIds,
      visibleInstanceIds: candidateInstanceIds,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:selectActionTarget',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2SelectActionTarget: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        action: node.action,
        targetField: 'mixedTargets',
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptableGiveDon_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'GIVE_DON') return null;
  const targetField = shouldPromptSelector_V2(node.action.donSelector)
    ? 'donSelector'
    : shouldPromptSelector_V2(node.action.target)
      ? 'target'
      : null;
  if (!targetField) return null;
  const selector = targetField === 'donSelector' ? node.action.donSelector : node.action.target;
  const resolved = resolveSelector_V2(ctx, selector);
  const candidateInstanceIds = filteredSelectionCandidateIds_V2(ctx, resolved.candidateInstanceIds, 'EFFECT');
  if (candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? candidateInstanceIds.length : resolved.maximum;
  return {
    id: `${ctx.sourceInstanceId}:v2-give-don-${targetField}:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: playerIdForPromptChooser_V2(ctx, selector.chooser),
    kind: 'SELECT_CARDS',
    prompt: targetField === 'donSelector'
      ? `Choose ${resolved.minimum === maximum ? maximum : `up to ${maximum}`} DON!! card${maximum === 1 ? '' : 's'} to give.`
      : `Choose ${resolved.minimum === maximum ? maximum : `up to ${maximum}`} target${maximum === 1 ? '' : 's'} to receive DON!!.`,
    constraints: {
      min: resolved.minimum,
      max: maximum,
      zoneId: selectorZoneId_V2(selector.zones),
      filterDescription: targetField === 'donSelector'
        ? 'DON!! cards eligible to give with this V2 effect.'
        : 'Cards eligible to receive DON!! with this V2 effect.',
      candidateInstanceIds,
      visibleInstanceIds: candidateInstanceIds,
    },
    sourceInstanceId: ctx.sourceInstanceId,
    sourceEffectId: 'v2:selectGiveDon',
    resumeState: {
      abilityIndex: 0,
      opIndex: 0,
      bindings: {},
      v2SelectGiveDon: {
        sourceInstanceId: ctx.sourceInstanceId,
        controllerId: ctx.controllerId,
        timing: ctx.currentTiming ?? { kind: 'STANDARD_TIMING', timing: 'ON_PLAY' },
        giveDonAction: node.action,
        targetField,
        remainingNodes: [],
        bindings: {
          selectedObjects: ctx.bindings?.selectedObjects ?? {},
          actionResults: ctx.bindings?.actionResults ?? {},
        },
      },
    },
  };
}

function promptableNode_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  return promptableOptional_V2(ctx, node)
    ?? promptableSearchMoveToHand_V2(ctx, node)
    ?? promptablePlayCard_V2(ctx, node)
    ?? promptableChooseOption_V2(ctx, node)
    ?? promptableReorderCards_V2(ctx, node)
    ?? promptableGiveDon_V2(ctx, node)
    ?? promptableMixedRestTarget_V2(ctx, node)
    ?? promptableActionTarget_V2(ctx, node);
}

export function executeResolutionNode_V2(
  ctx: SelectorContext_V2,
  node: ResolutionNode_V2,
  actionId: string | null = null,
): ResolutionExecutionResult_V2 {
  switch (node.kind) {
    case 'NO_OP':
      return emptyResult(ctx);
    case 'ACTION':
      {
        const prompt = promptableNode_V2(ctx, node);
        if (prompt) {
          return {
            state: { ...ctx.state, pendingChoices: [...ctx.state.pendingChoices, prompt] },
            log: [],
          };
        }
      }
      if (node.action.type === 'ACTIVATE_EVENT') return executeActivatedEvent_V2(ctx, node.action, node.actionId ?? actionId);
      return executeAction_V2(ctx, node.action, node.actionId ?? actionId);
    case 'SEQUENCE': {
      let aggregate = emptyResult(ctx);
      let currentCtx = ctx;
      for (let index = 0; index < node.nodes.length; index += 1) {
        const child = node.nodes[index];
        const prompt = promptableNode_V2(currentCtx, child);
        if (prompt) {
          const remainingNodes = node.nodes.slice(index + 1);
          const pendingChoice: PendingChoice = {
            ...prompt,
            resumeState: {
              ...prompt.resumeState!,
              ...(prompt.resumeState!.v2SelectMoveToHand ? { v2SelectMoveToHand: {
                ...prompt.resumeState!.v2SelectMoveToHand!,
                remainingNodes,
              } } : {}),
              ...(prompt.resumeState!.v2ChooseOption ? { v2ChooseOption: {
                ...prompt.resumeState!.v2ChooseOption!,
                remainingNodes,
              } } : {}),
              ...(prompt.resumeState!.v2OptionalResolution ? { v2OptionalResolution: {
                ...prompt.resumeState!.v2OptionalResolution!,
                remainingNodes,
              } } : {}),
              ...(prompt.resumeState!.v2ReorderCards ? { v2ReorderCards: {
                ...prompt.resumeState!.v2ReorderCards!,
                remainingNodes,
              } } : {}),
              ...(prompt.resumeState!.v2SelectPlayCard ? { v2SelectPlayCard: {
                ...prompt.resumeState!.v2SelectPlayCard!,
                remainingNodes,
              } } : {}),
              ...(prompt.resumeState!.v2SelectActionTarget ? { v2SelectActionTarget: {
                ...prompt.resumeState!.v2SelectActionTarget!,
                remainingNodes,
              } } : {}),
              ...(prompt.resumeState!.v2SelectGiveDon ? { v2SelectGiveDon: {
                ...prompt.resumeState!.v2SelectGiveDon!,
                remainingNodes,
              } } : {}),
            },
          };
          const suspended: ResolutionExecutionResult_V2 = {
            state: {
              ...currentCtx.state,
              pendingChoices: [...currentCtx.state.pendingChoices, pendingChoice],
            },
            log: [],
          };
          return mergeSidecars(aggregate, suspended);
        }
        const childResult = executeResolutionNode_V2(currentCtx, child, actionId);
        aggregate = mergeSidecars(aggregate, childResult);
        currentCtx = {
          ...currentCtx,
          state: childResult.state,
          bindings: {
            selectedObjects: {
              ...(currentCtx.bindings?.selectedObjects ?? {}),
              ...(childResult.bindings?.selectedObjects ?? {}),
            },
            actionResults: {
              ...(currentCtx.bindings?.actionResults ?? {}),
              ...(childResult.bindings?.actionResults ?? {}),
            },
          },
        };
      }
      return aggregate;
    }
    case 'IF': {
      const condition = evaluateCondition_V2(ctx, node.condition);
      const branch = condition.value ? node.then : node.else;
      const result = branch ? executeResolutionNode_V2(ctx, branch, actionId) : emptyResult(ctx);
      return withUnsupported(result, condition.unsupportedReasons);
    }
    case 'IF_ACTION_SUCCEEDED': {
      const previous = ctx.bindings?.actionResults[node.actionResult];
      const branch = previous ? node.then : node.else;
      return branch ? executeResolutionNode_V2(ctx, branch, actionId) : emptyResult(ctx);
    }
    case 'OPTIONAL': {
      const prompt = promptableOptional_V2(ctx, node);
      if (prompt) {
        return {
          state: { ...ctx.state, pendingChoices: [...ctx.state.pendingChoices, prompt] },
          log: [],
        };
      }
      return emptyResult(ctx);
    }
    case 'CHOOSE': {
      const prompt = promptableChooseOption_V2(ctx, node);
      if (prompt) {
        return {
          state: { ...ctx.state, pendingChoices: [...ctx.state.pendingChoices, prompt] },
          log: [],
        };
      }
      const choiceAction = {
        type: 'PLAYER_CHOOSES',
        options: node.options,
        minimumChoices: node.minimumChoices,
        maximumChoices: node.maximumChoices,
      } as const;
      if (node.chooser === 'OPPONENT') {
        return executeAction_V2(ctx, { ...choiceAction, type: 'OPPONENT_CHOOSES' }, actionId);
      }
      return executeAction_V2(ctx, choiceAction, actionId);
    }
    case 'REPEAT': {
      const count = evaluateValue_V2(ctx, node.count);
      const numericCount = toNonNegativeInteger_V2(count.value);
      if (numericCount === null) {
        return withUnsupported(emptyResult(ctx), [...count.unsupportedReasons, 'V2 REPEAT count did not evaluate to a non-negative number.']);
      }
      return withUnsupported(executeRepeatedNode_V2(ctx, node.node, numericCount, actionId), count.unsupportedReasons);
    }
    case 'FOR_EACH':
      return executeForEachNode_V2(ctx, node, actionId);
    case 'DELAY':
      return executeDelayedWrapper_V2(ctx, node, actionId);
    case 'REPLACEMENT':
      return executeReplacementWrapper_V2(ctx, node, actionId);
    case 'CREATE_CONTINUOUS_EFFECT':
      return executeContinuousWrapper_V2(ctx, node, actionId);
    default: {
      const unknownNode = node as { kind?: string };
      return {
        ...emptyResult(ctx),
        unsupportedReasons: [`Resolution node ${unknownNode.kind ?? 'UNKNOWN'} is not supported by executeResolutionNode_V2 yet.`],
      };
    }
  }
}
