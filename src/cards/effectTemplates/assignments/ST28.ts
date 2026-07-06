/**
 * Reviewed effect template assignments - Starter Deck ST28 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST28_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST28-001 — [On Play] If Leader {Land of Wano} and opp has 3+ Life, K.O. up to 1 opp Character base cost ≤5.
  { cardNumber: 'ST28-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }, { kind: 'opponentLife', atLeast: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
  // ST28-005 — [DON!! x2][Your Turn] this Character +3000. [On Play] Look 5, reveal up to 1 {Land of Wano} cost ≥2 to hand, rest to bottom.
  {
    cardNumber: 'ST28-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano', minCost: 2 }, remainder: 'bottom' }] } },
    ],
  },
];
