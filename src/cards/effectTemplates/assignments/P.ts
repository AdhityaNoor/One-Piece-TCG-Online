/**
 * Reviewed effect template assignments — Promotional cards (P-xxx).
 */
import type { CardEffectAssignment } from '../assembler';

export const P_ASSIGNMENTS: CardEffectAssignment[] = [
  // P-063 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  { cardNumber: 'P-063', templateId: 'onPlayRestOpponentCharacter', params: { filter: { maxCost: 1 } } },
  // P-069 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'P-069', templateId: 'activateMainGiveDon', params: { count: 1 } },
];
