/**
 * Generic action dispatcher — the single entry point for validating and
 * executing ANY GameAction. This is the project's "every player action must
 * go through a serializable action dispatch system" rule made concrete: the
 * local hotseat UI calls exactly these two functions, and a future
 * network-authoritative server would call the exact same two functions with
 * the exact same arguments (project ground rule — see app/store for the
 * local-only caller).
 *
 * Two global gates run before any per-type routing — both apply uniformly
 * to every action type, including ones a per-type validator would also
 * reject on its own (that redundancy is intentional and harmless, matching
 * the existing pattern of e.g. validateConcede's own gameOver check):
 *
 * 1. gameOver short-circuit (1-2-1-1 etc.): once the game has ended, nothing
 *    is legal. No exceptions — there is no action that un-ends a finished
 *    game.
 * 2. Pending-choice gate (blueprint Section 11): while ANY PendingChoice is
 *    outstanding, only RESOLVE_PENDING_CHOICE or CONCEDE may be dispatched —
 *    EXCEPT during the 'setup' phase, where the outstanding PendingChoice is
 *    always the going-first or mulligan YES_NO prompt, which is resolved
 *    through its OWN dedicated action type (CHOOSE_GOING_FIRST /
 *    MULLIGAN_DECISION), never through RESOLVE_PENDING_CHOICE — see
 *    handlers/resolvePendingChoice.ts's doc comment. Gating those two out
 *    during setup would deadlock the entire pre-game flow, so the setup
 *    phase additionally allows them through.
 *
 * executeAction always re-validates against the CURRENT state before
 * executing — it never trusts a validation result computed earlier against
 * a state that may have since changed (e.g. a stale validation result cached
 * by a UI that hasn't re-checked before dispatching).
 *
 * advanceAutomaticPhases is called after every successful execute,
 * unconditionally — including after setup actions and CONCEDE. This is safe
 * by construction: it's documented as a no-op whenever currentPhase is
 * already 'setup' or 'main' (see rules/phases/advanceAutomaticPhases.ts), and
 * it stops immediately once gameOver is set. The one case where it does real
 * work after a non-phase action is the final MULLIGAN_DECISION, whose own
 * executor parks the new state at currentPhase: 'refresh' (5-2-1-8) — this
 * call is what actually carries that into turn 1's Main Phase.
 */
import type { GameState } from '../state/game';
import type { GameAction, GameActionType, ValidationResult } from './action';
import type { ActionExecuteResult } from './actionExecuteResult';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import type { EffectTemplateRegistry } from '../effects';
import { advanceAutomaticPhases } from '../rules/phases';
import {
  validatePlayCharacter,
  executePlayCharacter,
  validatePlayStage,
  executePlayStage,
  validateActivateEventMain,
  executeActivateEventMain,
  validateGiveDon,
  executeGiveDon,
  validateEndMainPhase,
  executeEndMainPhase,
  validateResolvePendingChoice,
  executeResolvePendingChoice,
  validateConcede,
  executeConcede,
  validateActivateCardEffect,
  executeActivateCardEffect,
  validateActivateCounterEvent,
  executeActivateCounterEvent,
} from './handlers';
import {
  validateDeclareAttack,
  executeDeclareAttack,
  validateActivateBlocker,
  executeActivateBlocker,
  validateActivateCounterCharacter,
  executeActivateCounterCharacter,
  validatePassStep,
  executePassStep,
} from '../rules/battle';
import {
  validateChooseGoingFirst,
  executeChooseGoingFirst,
  validateMulliganDecision,
  executeMulliganDecision,
} from '../setup';

/**
 * Action types legal to dispatch while `state.pendingChoices` is non-empty.
 * See file-header gate #2 for why this set depends on `currentPhase`.
 */
function pendingChoiceGateAllowedTypes(state: GameState): GameActionType[] {
  if (state.currentPhase === 'setup') {
    return ['RESOLVE_PENDING_CHOICE', 'CONCEDE', 'CHOOSE_GOING_FIRST', 'MULLIGAN_DECISION'];
  }
  return ['RESOLVE_PENDING_CHOICE', 'CONCEDE'];
}

export function validateAction(
  state: GameState,
  action: GameAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ValidationResult {
  if (state.gameOver) {
    return { legal: false, reasons: ['The game has already ended — no further actions are legal (1-2-1-1).'] };
  }

  if (state.pendingChoices.length > 0) {
    const allowed = pendingChoiceGateAllowedTypes(state);
    if (!allowed.includes(action.type)) {
      return {
        legal: false,
        reasons: [
          `A PendingChoice is outstanding (${state.pendingChoices.map((c) => c.id).join(', ')}) — only ${allowed.join(' / ')} may be dispatched until every PendingChoice resolves (blueprint Section 11).`,
        ],
      };
    }
  }

  switch (action.type) {
    case 'PLAY_CHARACTER':
      return validatePlayCharacter(state, action, defs);
    case 'PLAY_STAGE':
      return validatePlayStage(state, action, defs);
    case 'ACTIVATE_EVENT_MAIN':
      return validateActivateEventMain(state, action, defs);
    case 'ACTIVATE_CARD_EFFECT':
      return validateActivateCardEffect(state, action, registry);
    case 'GIVE_DON':
      return validateGiveDon(state, action);
    case 'DECLARE_ATTACK':
      return validateDeclareAttack(state, action, defs);
    case 'ACTIVATE_BLOCKER':
      return validateActivateBlocker(state, action, defs);
    case 'ACTIVATE_COUNTER_CHARACTER':
      return validateActivateCounterCharacter(state, action, defs);
    case 'ACTIVATE_COUNTER_EVENT':
      return validateActivateCounterEvent(state, action);
    case 'PASS_STEP':
      return validatePassStep(state, action, defs);
    case 'RESOLVE_PENDING_CHOICE':
      return validateResolvePendingChoice(state, action);
    case 'END_MAIN_PHASE':
      return validateEndMainPhase(state, action);
    case 'MULLIGAN_DECISION':
      return validateMulliganDecision(state, action);
    case 'CHOOSE_GOING_FIRST':
      return validateChooseGoingFirst(state, action);
    case 'CONCEDE':
      return validateConcede(state, action);
    default: {
      const exhaustiveCheck: never = action;
      return { legal: false, reasons: [`Unrecognized action type '${(exhaustiveCheck as GameAction).type}'.`] };
    }
  }
}

export function executeAction(
  state: GameState,
  action: GameAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const validation = validateAction(state, action, defs, registry);
  if (!validation.legal) {
    throw new Error(`executeAction: action '${action.type}' (actionId '${action.actionId}') failed validation: ${validation.reasons.join('; ')}`);
  }

  let result: ActionExecuteResult;
  switch (action.type) {
    case 'PLAY_CHARACTER':
      result = executePlayCharacter(state, action, defs, registry);
      break;
    case 'PLAY_STAGE':
      result = executePlayStage(state, action, defs);
      break;
    case 'ACTIVATE_EVENT_MAIN':
      result = executeActivateEventMain(state, action, defs);
      break;
    case 'ACTIVATE_CARD_EFFECT':
      result = executeActivateCardEffect(state, action, defs, registry);
      break;
    case 'GIVE_DON':
      result = executeGiveDon(state, action);
      break;
    case 'DECLARE_ATTACK':
      result = executeDeclareAttack(state, action, defs);
      break;
    case 'ACTIVATE_BLOCKER':
      result = executeActivateBlocker(state, action, defs);
      break;
    case 'ACTIVATE_COUNTER_CHARACTER':
      result = executeActivateCounterCharacter(state, action, defs);
      break;
    case 'ACTIVATE_COUNTER_EVENT':
      result = executeActivateCounterEvent();
      break;
    case 'PASS_STEP':
      result = executePassStep(state, action, defs);
      break;
    case 'RESOLVE_PENDING_CHOICE':
      result = executeResolvePendingChoice(state, action, defs, registry);
      break;
    case 'END_MAIN_PHASE':
      result = executeEndMainPhase(state, action);
      break;
    case 'MULLIGAN_DECISION':
      result = executeMulliganDecision(state, action);
      break;
    case 'CHOOSE_GOING_FIRST':
      result = executeChooseGoingFirst(state, action);
      break;
    case 'CONCEDE':
      result = executeConcede(state, action);
      break;
    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`executeAction: unrecognized action type '${(exhaustiveCheck as GameAction).type}'.`);
    }
  }

  const cascade = advanceAutomaticPhases(result.state);
  return {
    state: cascade.state,
    log: [...result.log, ...cascade.log],
    pendingChoices: result.pendingChoices,
  };
}
