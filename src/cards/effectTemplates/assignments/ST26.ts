/**
 * Reviewed effect template assignments - Starter Deck ST26 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST26_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST26-001 — PARTIAL: hand −5 cost gate approximated; [On Play] return all [San-Gorou]/[Sanji] mapped.
  {
    cardNumber: 'ST26-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -5, duration: 'permanent', gate: [{ kind: 'anyOf', gates: [{ kind: 'selfControlsNamedWithPowerAtLeast', name: 'San-Gorou', power: 7000 }, { kind: 'selfControlsNamedWithPowerAtLeast', name: 'Sanji', power: 7000 }] }] }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { name: 'San-Gorou' } }, to: { zone: 'hand', player: 'owner' } },
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { name: 'Sanji' } }, to: { zone: 'hand', player: 'owner' } },
      ] } },
    ],
  },

  // ST26-002 — [Blocker][On Play] DON!! −2: Rest up to 1 opp Character cost ≤1 (the "or DON!!" option is dropped).
  { cardNumber: 'ST26-002', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // ST26-003 — [On Play] DON!! −2: add up to 1 DON!! from deck active.
  { cardNumber: 'ST26-003', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  // ST26-003 (character) Nico Robin —
  //   [On Play] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): Add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // ST26-004 — [On Play] DON!! −2: give up to 2 opp Characters −2000 this turn.
  { cardNumber: 'ST26-004', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },

  // ST26-005 - [On Play]/[When Attacking] DON!! -2: if Leader multicolored and opponent has 5+ DON!!, Leader base power becomes 7000.
  {
    cardNumber: 'ST26-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentDonFieldCount', atLeast: 5 }], functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'endOfOpponentsTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentDonFieldCount', atLeast: 5 }], functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'endOfOpponentsTurn' }] } },
    ],
  },

];
