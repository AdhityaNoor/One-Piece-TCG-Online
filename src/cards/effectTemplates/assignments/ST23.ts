/**
 * Reviewed effect template assignments - Starter Deck ST23.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST23_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST23-001 — Closed: 10000+ current power gate via selfCharacterCurrentPowerCount; hand −4 cost mapped fully.
  { cardNumber: 'ST23-001', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -4, duration: 'permanent', gate: [{ kind: 'selfCharacterCurrentPowerCount', power: 10000, atLeast: 1 }] }] } },

  // ST23-002 — If opponent has a Character with 8000+ base power, this card in hand −3 cost.
  //   Hand-self discount is resolved by computeCurrentCost (handSelfCostDelta) from this
  //   onEnterPlay aura shape; gate is Character-only (not Leader). [On Play] Leader +2000 mapped.
  {
    cardNumber: 'ST23-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -3, duration: 'permanent', gate: [{ kind: 'opponentCharacterBasePowerCount', power: 8000, atLeast: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }, { kind: 'leaderName', name: 'Uta' }] }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn' }] } },
    ],
  },

  // ── Triage batch (ST23 expressible). ──
  // ST23-003 — [On Play] trash 1 → if Leader {Red-Haired Pirates}, K.O. up to 1 opp Character base power ≤4000.
  { cardNumber: 'ST23-003', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 4000 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // ST23-004 — [Activate: Main] rest 1 DON!! + rest this: give up to 1 opp Character −1000.
  { cardNumber: 'ST23-004', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // ST23-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST23-005', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
];
