/**
 * Action types that are structurally defined (action.ts) but have NO
 * implementable meaning while card effects are fully stubbed this
 * milestone:
 *
 * - ACTIVATE_CARD_EFFECT (8-1-3-2-1): activating a field card's printed
 *   effect requires an effect-template system that doesn't exist yet.
 * - ACTIVATE_COUNTER_EVENT (7-1-3-2-2): unlike ACTIVATE_COUNTER_CHARACTER
 *   (whose boost amount is the structured numeric CardDefinition.counter
 *   field), a Counter Event's boost amount is embedded in free-text effect
 *   text with no structured equivalent — there is nothing safe to execute.
 *
 * Both are always rejected at validation time. execute* exists only as a
 * defensive throw — the dispatcher must never call it for an action that
 * failed validation.
 */
import type { GameState } from '../../state/game';
import type { ActivateCardEffectAction, ActivateCounterEventAction, ValidationResult } from '../action';

export function validateActivateCardEffect(_state: GameState, _action: ActivateCardEffectAction): ValidationResult {
  return { legal: false, reasons: ['ACTIVATE_CARD_EFFECT is not implemented — no effect-template system exists yet (card effects are fully stubbed this milestone).'] };
}

export function executeActivateCardEffect(): never {
  throw new Error('executeActivateCardEffect: ACTIVATE_CARD_EFFECT must never reach execute — it always fails validation.');
}

export function validateActivateCounterEvent(_state: GameState, _action: ActivateCounterEventAction): ValidationResult {
  return { legal: false, reasons: ["ACTIVATE_COUNTER_EVENT is not implemented — a Counter Event's boost amount lives in free-text effect text with no structured equivalent (card effects are fully stubbed this milestone)."] };
}

export function executeActivateCounterEvent(): never {
  throw new Error('executeActivateCounterEvent: ACTIVATE_COUNTER_EVENT must never reach execute — it always fails validation.');
}
