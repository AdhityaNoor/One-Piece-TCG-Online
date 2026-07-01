/**
 * Reviewed effect template assignments - Starter Deck ST23.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST23_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST23-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST23-005', templateId: 'activateMainGiveDon', params: { count: 1 } },
];
