/**
 * Reviewed effect template assignments - Starter Deck ST34.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST34_ASSIGNMENTS: CardEffectAssignment[] = [
  {
    cardNumber: 'ST34-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }, { kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxBasePower: 8000 } }] } },
    ],
  },

  { cardNumber: 'ST34-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  { cardNumber: 'ST34-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates' }, remainder: 'bottom' }] } },

  // ST34-004 — [On Play] DON!! −4, you may trash 1 from hand: add top of deck to top of Life.
  //   Then, up to 1 opponent Character's base power becomes 0 this turn.
  //
  //   BOTH clauses hang off the ONE hand-trash payment, so the payment is captured into a
  //   sequence-local var and each clause gates on that var. Chaining `ifPrevious:
  //   'previousMovedAny'` down the list (the previous shape here) was wrong: ifPrevious reads
  //   __lastMoved, which the Life move OVERWRITES — so declining the "up to 1" Life move, or
  //   running it on an empty deck, silently swallowed the base-power rider even though the
  //   payment had been made. effectIr.ts is explicit that a plain "Then" is not an ifPrevious
  //   gate and that choosing 0 for an "up to" effect still counts as resolving the prior step.
  {
    cardNumber: 'ST34-004',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      cost: [{ kind: 'donMinus', count: 4 }],
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'captureCount', from: '__lastMovedIds', into: 'st34HandPaid' },
        { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifGate: [{ kind: 'boundVarsTotalCount', varNames: ['st34HandPaid'], atLeast: 1 }] },
        { fn: 'setBasePower', target: { group: 'characters', player: 'opponent' }, value: 0, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifGate: [{ kind: 'boundVarsTotalCount', varNames: ['st34HandPaid'], atLeast: 1 }] },
      ],
    },
  },

  { cardNumber: 'ST34-005', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 2000 } }, optional: true }] } },
];
