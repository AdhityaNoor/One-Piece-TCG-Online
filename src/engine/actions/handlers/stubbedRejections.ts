/**
 * Action types that are structurally defined (action.ts) but not yet
 * implementable:
 *
 * - ACTIVATE_COUNTER_EVENT (7-1-3-2-2): unlike ACTIVATE_COUNTER_CHARACTER
 *   (whose boost amount is the structured numeric CardDefinition.counter
 *   field), a Counter Event's boost amount is embedded in free-text effect
 *   text with no structured equivalent — there is nothing safe to execute yet.
 *
 * (ACTIVATE_CARD_EFFECT is now implemented — see activateCardEffect.ts.)
 *
 * Always rejected at validation time. execute* exists only as a defensive
 * throw — the dispatcher must never call it for an action that failed
 * validation.
 */
import type { GameState } from '../../state/game';
import type { ActivateCounterEventAction, ValidationResult } from '../action';

export function validateActivateCounterEvent(_state: GameState, _action: ActivateCounterEventAction): ValidationResult {
  return { legal: false, reasons: ["ACTIVATE_COUNTER_EVENT is not implemented — a Counter Event's boost amount lives in free-text effect text with no structured equivalent (card effects are fully stubbed this milestone)."] };
}

export function executeActivateCounterEvent(): never {
  throw new Error('executeActivateCounterEvent: ACTIVATE_COUNTER_EVENT must never reach execute — it always fails validation.');
}
