import type { Action_V2, ResolutionNode_V2, TimingExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import { executeAction_V2, type ActionExecutionResult_V2 } from './actions_V2';
import { evaluateCondition_V2 } from './conditions_V2';
import type { SelectorContext_V2 } from './selectorResolver_V2';

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

export function executeResolutionNode_V2(
  ctx: SelectorContext_V2,
  node: ResolutionNode_V2,
  actionId: string | null = null,
): ResolutionExecutionResult_V2 {
  switch (node.kind) {
    case 'NO_OP':
      return emptyResult(ctx);
    case 'ACTION':
      if (node.action.type === 'ACTIVATE_EVENT') return executeActivatedEvent_V2(ctx, node.action, node.actionId ?? actionId);
      return executeAction_V2(ctx, node.action, node.actionId ?? actionId);
    case 'SEQUENCE': {
      let aggregate = emptyResult(ctx);
      let currentCtx = ctx;
      for (const child of node.nodes) {
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
