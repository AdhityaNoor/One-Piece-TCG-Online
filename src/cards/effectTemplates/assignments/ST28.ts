/**
 * Reviewed effect template assignments - Starter Deck ST28 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST28_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST28-001 — [On Play] If Leader {Land of Wano} and opp has 3+ Life, K.O. up to 1 opp Character base cost ≤5.
  { cardNumber: 'ST28-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }, { kind: 'opponentLife', atLeast: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },

  // ST28-002 — [DON!! x2] [Blocker]; [On Play] your Leader gains [Banish] this turn.
  {
    cardNumber: 'ST28-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'banish', duration: 'duringThisTurn' }] } },
    ],
  },

  // ST28-003 — [Trigger] If Leader {Land of Wano} and opponent has 3 or less Life, play this.
  { cardNumber: 'ST28-003', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Land of Wano' }, { kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST28-002 (character) Izo —
  //   [DON!! x2] This Character gains [Blocker].[On Play] Your {Land of Wano} type Leader gains [Banish]
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // ST28-003 (character) Kin'emon —
  //   [Trigger] If your Leader has the {Land of Wano} type and your opponent has 3 or less Life cards, play
  //   this card.
  // NOTE: not yet implemented (needs template).

  // ST28-004 (character) Kouzuki Momonosuke —
  //   [Your Turn] If you have 2 or less Life cards, your Leader gains +1000 power.[Activate: Main] [Once
  //   Per Turn] You may return 2 total of your currently given DON!! cards to your cost area rested: This
  //   Character gains [Rush] and +1000 power during this turn.(This card can attack on the turn in which it
  //   is played.)
  // NOTE: not yet implemented (needs template).

  // ST28-005 — [DON!! x2][Your Turn] this Character +3000. [On Play] Look 5, reveal up to 1 {Land of Wano} cost ≥2 to hand, rest to bottom.
  {
    cardNumber: 'ST28-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano', minCost: 2 }, remainder: 'bottom' }] } },
    ],
  },

];
