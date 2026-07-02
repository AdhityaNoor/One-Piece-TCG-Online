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
  { cardNumber: 'EB01-007', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // EB01-015 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restOpponentCharacter', filter: { maxCost: 2 } }] } },
  // EB01-023 — [On Play] Draw 1 card.
  { cardNumber: 'EB01-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // EB01-048 — [Activate: Main] You may rest this Character: Give up to 1 of your opponent's Characters −4 cost.
  {
    cardNumber: 'EB01-048',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'modifyCostOpponent', amount: -4 }] },
  },

  // EB01-049 — [On Play] K.O. up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 2 } }] } },

  // EB01-046 - [On Play]/[When Attacking] Give opponent Character -1 cost, then K.O. cost 0.
  {
    cardNumber: 'EB01-046',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -1 }, { fn: 'koOpponentCharacter', filter: { maxCost: 0 } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'modifyCostOpponent', amount: -1 }, { fn: 'koOpponentCharacter', filter: { maxCost: 0 } }] } },
    ],
  },

  // EB01-054 - [Blocker] [On Play] If opponent has 1 or less Life, K.O. cost 3 or less.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play K.O. is templated.
  {
    cardNumber: 'EB01-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 1 }], functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 3 } }] },
  },

  // EB02-026 - [On Play] If Leader is multicolored and hand has 5 or less cards, draw 2.
  {
    cardNumber: 'EB02-026',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] },
  },

  // EB02-046 - [On Play] Trash top 2 cards of deck, then give opponent Character -1 cost.
  {
    cardNumber: 'EB02-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'modifyCostOpponent', amount: -1 }] },
  },

  // EB02-054 - [Blocker] [On Play] If you have 2 or less Life, draw 2 and trash 1.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play draw/trash is templated.
  {
    cardNumber: 'EB02-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] },
  },

  // EB02-017 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB02-017',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } }] },
  },

  // EB03-010 - [Blocker] [On Play] Look at 5; add Character power 1000 or less, or Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-play search is templated.
  {
    cardNumber: 'EB03-010',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ category: 'character', maxPower: 1000 }, { category: 'event' }] } }] },
  },

  // EB03-047 - [On Play] Trash top 3 cards of deck. [On K.O.] Draw 1.
  {
    cardNumber: 'EB03-047',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // EB04-006 - [On Play] Look at 7; add up to 1 [Lulucia Kingdom].
  {
    cardNumber: 'EB04-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Lulucia Kingdom' } }] },
  },
  // EB04-002 - [On Play] Look at 4; add Egghead or Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB04-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Egghead' }, { typeIncludes: 'Straw Hat Crew' }], excludeSelfName: true } }] },
  },
  // EB04-037 - [On Play] If Leader has Foxy Pirates, look at 5; add Foxy Pirates.
  {
    cardNumber: 'EB04-037',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Foxy Pirates' } }] },
  },
];
