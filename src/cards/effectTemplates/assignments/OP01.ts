/**
 * Reviewed effect template assignments - Main Booster OP01.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP01_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP01-006 - [On Play] Give up to 1 opponent Character -2000 power.
  { cardNumber: 'OP01-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP01-007 - [On K.O.] K.O. up to 1 opponent Character with 4000 power or less.
  { cardNumber: 'OP01-007', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
  // OP01-016 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew (excl. same name).
  {
    cardNumber: 'OP01-016',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } }] },
  },
  // OP01-017 - [DON!! x1] [When Attacking] K.O. up to 1 opponent Character with 3000 power or less.
  { cardNumber: 'OP01-017', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
  // OP01-022 - [DON!! x1] [When Attacking] Give up to 2 opponent Characters -2000 power.
  { cardNumber: 'OP01-022', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
  // OP01-026 - [Counter] +4000 to your Leader/Character, then K.O. 4000 power or less. [Trigger] -10000 to opponent Leader/Character.
  {
    cardNumber: 'OP01-026',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -10000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP01-030 - [Main] Search Straw Hat Crew Character. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP01-030',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Straw Hat Crew' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Straw Hat Crew' } }] } },
    ],
  },
  // OP01-028 - [Counter] Give opponent Leader/Character -2000. [Trigger] activates the Counter effect.
  {
    cardNumber: 'OP01-028',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP01-033 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP01-033', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP01-048 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP01-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP01-058 - [Counter] +4000 to your Leader/Character, then rest opponent Character cost 4 or less. [Trigger] rest opponent Character.
  {
    cardNumber: 'OP01-058',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: {} }, optional: true }] } },
    ],
  },
  // OP01-080 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP01-080', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP01-084 - [DON!! x1] [When Attacking] Look at 5; add up to 1 Baroque Works Event.
  {
    cardNumber: 'OP01-084',
    templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', typeIncludes: 'Baroque Works' } }] },
  },
  // OP01-089 - [Counter] If Leader has Seven Warlords type, return cost 5 or less Character to hand.
  { cardNumber: 'OP01-089', templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP01-090 - [Main] Search Baroque Works card other than self.
  {
    cardNumber: 'OP01-090',
    templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works', excludeSelfName: true } }] },
  },
  // OP01-113 — [On K.O.] Add 1 DON!! from DON!! deck (rested).
  // OP01-096 - [On Play] DON!! -2: K.O. cost <=3 and cost <=2.
  {
    cardNumber: 'OP01-096',
    templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] },
  },
  // OP01-108 - [On K.O.] DON!! -1: K.O. cost <=5.
  { cardNumber: 'OP01-108', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  { cardNumber: 'OP01-113', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP01-115 - [Main] K.O. cost 2 or less, then add 1 active DON!!. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP01-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP01-117 - [Main] DON!! -1: Rest opponent Character with cost 6 or less.
  { cardNumber: 'OP01-117', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },
  // OP01-118 - [Counter] DON!! -2: +2000 to your Leader/Character, then draw 1. [Trigger] add 1 active DON!!.
  {
    cardNumber: 'OP01-118',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP01 coverage batch: trigger-play, rest/K.O., movement, draw, and DON!! families.
  { cardNumber: 'OP01-009', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
  { cardNumber: 'OP01-020', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  { cardNumber: 'OP01-035', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  { cardNumber: 'OP01-037', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
  { cardNumber: 'OP01-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
  { cardNumber: 'OP01-056', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true, maxTargets: 2 }] } },
  { cardNumber: 'OP01-070', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 7 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  {
    cardNumber: 'OP01-071',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  { cardNumber: 'OP01-082', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
  {
    cardNumber: 'OP01-086',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3, rested: false } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  { cardNumber: 'OP01-095', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'OP01-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
  {
    cardNumber: 'OP01-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
];
