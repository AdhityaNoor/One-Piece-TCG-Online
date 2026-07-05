/**
 * Reviewed effect template assignments - Main Booster OP16.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP16_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP16-052 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP16-052', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP16-064 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP16-064',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },
  // OP16-072 — [On Play] Look at 5; add up to 1 Impel Down type.
  {
    cardNumber: 'OP16-072',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' } }] },
  },
  // OP16-078 - [On Play] Search Navy. [Activate: Main] DON!! -1, rest this Stage: draw 1, trash 1.
  {
    cardNumber: 'OP16-078',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },
  // OP16-067 - [On Play] Look at 5; add Navy, bottom rest, then trash 1 from hand.
  {
    cardNumber: 'OP16-067',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },
  // OP16-091 - [On Play] If Leader has Land of Wano, look at 4; add Land of Wano other than self, trash rest.
  {
    cardNumber: 'OP16-091',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano', excludeSelfName: true }, remainder: 'trash' }] },
  },
];
