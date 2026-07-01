/**
 * Reviewed effect template assignments — Extra Booster sets (EB01, EB02).
 *
 * Only add a card here after:
 *   1. Reading the card's English effect text.
 *   2. Confirming the chosen template + params match the real ruling behavior.
 *   3. Verifying the resulting EffectProgram is JSON-serializable.
 *
 * Do NOT copy raw effect text into params. Params are structural only.
 */
import type { CardEffectAssignment } from '../assembler';

export const EB_ASSIGNMENTS: CardEffectAssignment[] = [
  // EB01-007 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'EB01-007', templateId: 'activateMainGiveDon', params: { count: 1 } },

  // EB01-015 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-015', templateId: 'onPlayRestOpponentCharacter', params: { filter: { maxCost: 2 } } },
  // EB01-023 — [On Play] Draw 1 card.
  { cardNumber: 'EB01-023', templateId: 'onPlayDraw', params: { amount: 1 } },

  // EB01-048 — [Activate: Main] You may rest this Character: Give up to 1 of your opponent's Characters −4 cost.
  {
    cardNumber: 'EB01-048',
    templateId: 'activateMainModifyCostOpponent',
    params: { amount: -4, cost: [{ kind: 'restThis' }] },
  },

  // EB01-049 — [On Play] K.O. up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-049', templateId: 'onPlayKoOpponentCharacter', params: { filter: { maxCost: 2 } } },

  // EB02-017 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB02-017',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } },
  },

  // EB04-006 - [On Play] Look at 7; add up to 1 [Lulucia Kingdom].
  {
    cardNumber: 'EB04-006',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 7, pick: 1, filter: { name: 'Lulucia Kingdom' } },
  },
  // EB04-002 - [On Play] Look at 4; add Egghead or Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB04-002',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ typeIncludes: 'Egghead' }, { typeIncludes: 'Straw Hat Crew' }], excludeSelfName: true } },
  },
];
