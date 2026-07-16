import type { Action_V2, ResolutionNode_V2, TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { PendingChoice } from '../events/pendingChoice';
import { executeAction_V2, type ActionExecutionResult_V2 } from './actions_V2';
import { evaluateCondition_V2 } from './conditions_V2';
import { resolveSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

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
    counterModifiers: [...(left.counterModifiers ?? []), ...(right.counterModifiers ?? [])],
    effectInvalidations: [...(left.effectInvalidations ?? []), ...(right.effectInvalidations ?? [])],
    activatedEvents: [...(left.activatedEvents ?? []), ...(right.activatedEvents ?? [])],
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

function promptableSearchMoveToHand_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'MOVE_CARD') return null;
  if (node.action.to.zone !== 'HAND') return null;
  if (node.action.selector.instanceIds?.length) return null;
  const isLookBufferSearch = node.action.selector.subject === 'ACTION_RESULT';
  const isDirectDeckSearch = node.action.selector.subject === 'CARD'
    && node.action.selector.zones?.includes('DECK');
  if (!isLookBufferSearch && !isDirectDeckSearch) return null;
  const resolved = resolveSelector_V2(ctx, node.action.selector);
  if (resolved.candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? resolved.candidateInstanceIds.length : resolved.maximum;
  const visibleInstanceIds = isLookBufferSearch
    ? ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds
    : resolved.candidateInstanceIds;
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
      candidateInstanceIds: resolved.candidateInstanceIds,
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
        moveAction: node.action,
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

function promptableReorderCards_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION' || node.action.type !== 'REORDER_CARDS') return null;
  if (node.action.orderChooser !== 'PLAYER' && node.action.orderChooser !== 'OWNER') return null;
  if (node.action.selector.instanceIds?.length) return null;
  const resolved = resolveSelector_V2(ctx, node.action.selector);
  if (resolved.candidateInstanceIds.length <= 1) return null;
  return {
    id: `${ctx.sourceInstanceId}:v2-reorder:${ctx.state.turnNumber}:${ctx.state.pendingChoices.length}`,
    playerId: ctx.controllerId,
    kind: 'SELECT_CARDS',
    prompt: 'Choose the order for these V2 effect cards.',
    constraints: {
      min: resolved.candidateInstanceIds.length,
      max: resolved.candidateInstanceIds.length,
      zoneId: node.action.destination.zone === 'DECK' ? 'deck' : undefined,
      filterDescription: 'Select every card in the order to place them.',
      candidateInstanceIds: resolved.candidateInstanceIds,
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
  if (resolved.candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? resolved.candidateInstanceIds.length : resolved.maximum;
  const playerId = node.action.player === 'OPPONENT'
    ? Object.keys(ctx.state.players).find((id) => id !== ctx.controllerId) ?? ctx.controllerId
    : ctx.controllerId;
  const visibleInstanceIds = isLookBufferPlay
    ? ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds
    : resolved.candidateInstanceIds;
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
      candidateInstanceIds: resolved.candidateInstanceIds,
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

function actionTargetSelector_V2(action: Action_V2): { selector: import('../../cards/effectCompiler_V2/types_V2').Selector_V2; targetField: 'selector' | 'newTarget' } | null {
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
  if (action.type === 'ACTIVATE_EVENT') return false;
  if (action.type === 'MOVE_CARD' && action.to.zone === 'HAND' && (selector.subject === 'ACTION_RESULT' || selector.zones?.includes('DECK'))) return false;
  return Boolean(selector.chooser) || selector.quantity?.kind === 'UP_TO';
}

function promptableActionTarget_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  if (node.kind !== 'ACTION') return null;
  const target = actionTargetSelector_V2(node.action);
  if (!target || !shouldPromptActionTarget_V2(node.action, target.selector)) return null;
  const resolved = resolveSelector_V2(ctx, target.selector);
  if (resolved.candidateInstanceIds.length === 0) return null;
  const maximum = resolved.maximum < 0 ? resolved.candidateInstanceIds.length : resolved.maximum;
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
      candidateInstanceIds: resolved.candidateInstanceIds,
      visibleInstanceIds: target.selector.subject === 'ACTION_RESULT'
        ? ctx.bindings?.selectedObjects.LOOKED_AT_PREVIOUSLY ?? resolved.candidateInstanceIds
        : resolved.candidateInstanceIds,
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

function promptableNode_V2(ctx: SelectorContext_V2, node: ResolutionNode_V2): PendingChoice | null {
  return promptableSearchMoveToHand_V2(ctx, node)
    ?? promptablePlayCard_V2(ctx, node)
    ?? promptableChooseOption_V2(ctx, node)
    ?? promptableReorderCards_V2(ctx, node)
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
    default:
      return {
        ...emptyResult(ctx),
        unsupportedReasons: [`Resolution node ${node.kind} is not supported by executeResolutionNode_V2 yet.`],
      };
  }
}
