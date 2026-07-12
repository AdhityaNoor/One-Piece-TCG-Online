/**
 * Reviewed effect template assignments - Starter Deck ST24 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST24_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST24-001 — [On Play] If 6+ rested cards, draw 1 and trash 1.
  { cardNumber: 'ST24-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCardCount', atLeast: 6 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // ST24-002 — [On Play] Look 5, reveal up to 1 {Supernovas} to hand, rest to bottom.
  //   [On Your Opponent's Attack] You may trash this Character: set up to 1 of your DON!! cards as active.
  {
    cardNumber: 'ST24-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
    ],
  },

  // ST24-003 — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'ST24-003', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // ST24-004 — [On Play] rest opp Character + preventRefresh; Leader +2000 if opp 2+ rested Characters.
  { cardNumber: 'ST24-004', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true },
    { fn: 'preventRefresh', target: { ref: 'previous' }, ifPrevious: 'previousSelectedAny' },
    { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn', ifGate: [{ kind: 'opponentRestedCharacterCount', atLeast: 2 }] },
  ] } },

  // ST24-005 (character) X.Drake —
  //   [On Play] If your Leader has the {Supernovas} type, rest up to 1 of your opponent's Characters with a
  //   cost of 5 or less. Then, set up to 1 of your DON!! cards as active at the end of this turn.
  { cardNumber: 'ST24-005', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
    { fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 1 },
  ] } },
];
