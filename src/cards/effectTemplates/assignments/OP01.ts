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

  // --- Batch: OP01 cards expressible with existing primitives ---

  // OP01-005 — [On Play] Add up to 1 red Character (other than [Uta], cost<=3) from trash to hand.
  { cardNumber: 'OP01-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', color: 'red', maxCost: 3, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP01-008 — [On Play] You may add 1 top Life to hand: this Character gains [Rush] this turn.
  { cardNumber: 'OP01-008', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01-011 — [On Play] You may place 1 from hand at the bottom of your deck: draw 1.
  { cardNumber: 'OP01-011', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01-014 — [DON!! x1] [On Block] Play up to 1 red Character cost<=2 from hand.
  { cardNumber: 'OP01-014', templateId: 'ability', params: { timing: 'onBlock', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxCost: 2 } }] } },

  // OP01-015 — [DON!! x1] [When Attacking] You may trash 1 from hand: add up to 1 {Straw Hat Crew} Character (other than [Tony Tony.Chopper], cost<=4) from trash to hand.
  { cardNumber: 'OP01-015', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'trash', player: 'controller', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 4, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP01-029 — (Event) [Counter] +2000 battle; then if 2 or less Life, that card +2000. [Trigger] +1000 this turn.
  {
    cardNumber: 'OP01-029',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { ref: 'previous' }, amount: 2000, duration: 'duringThisBattle', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP01-031 — (Leader) [Activate: Main] [Once Per Turn] Trash 1 {Land of Wano} from hand: set up to 2 DON!! active.
  { cardNumber: 'OP01-031', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Land of Wano' } },
    { fn: 'setActiveControllerDon', maxTargets: 2 },
  ] } },

  // OP01-034 — [DON!! x2] [When Attacking] Set up to 1 DON!! active.
  { cardNumber: 'OP01-034', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP01-039 — [DON!! x1] [On Block] If you have 3 or more Characters, draw 1.
  { cardNumber: 'OP01-039', templateId: 'ability', params: { timing: 'onBlock', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfCharacterCount', atLeast: 3 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP01-040 — [On Play] If Leader [Kouzuki Oden], play up to 1 {The Akazaya Nine} cost<=3 from hand. [DON!! x1] [When Attacking] [Once Per Turn] set up to 1 {The Akazaya Nine} cost<=3 active.
  {
    cardNumber: 'OP01-040',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Kouzuki Oden' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'The Akazaya Nine', maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, oncePerTurn: true, functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'The Akazaya Nine', maxCost: 3 }, maxTargets: 1 }] } },
    ],
  },

  // OP01-041 — [Activate: Main] rest 1 DON!! + rest this: look 5, reveal up to 1 {Land of Wano}, add to hand, rest to bottom.
  { cardNumber: 'OP01-041', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano' }, remainder: 'bottom' }] } },

  // OP01-042 — [On Play] rest 3 DON!!: If Leader [Kouzuki Oden], set up to 1 {Land of Wano} cost<=3 active.
  { cardNumber: 'OP01-042', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 3 }], gate: [{ kind: 'leaderName', name: 'Kouzuki Oden' }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Land of Wano', maxCost: 3 }, maxTargets: 1 }] } },

  // OP01-046 — [DON!! x1] [When Attacking] If Leader [Kouzuki Oden], set up to 2 DON!! active.
  { cardNumber: 'OP01-046', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderName', name: 'Kouzuki Oden' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP01-049 — [DON!! x1] [When Attacking] Play up to 1 {Heart Pirates} Character (other than [Bepo], cost<=4) from hand.
  { cardNumber: 'OP01-049', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Heart Pirates', maxCost: 4, excludeSelfName: true } }] } },

  // OP01-052 — [When Attacking] [Once Per Turn] If you have 2 or more rested Characters, draw 1.
  { cardNumber: 'OP01-052', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP01-057 — (Event) [Counter] +2000 battle, then set up to 1 of your Characters active. [Trigger] K.O. up to 1 opp rested Character cost<=4.
  {
    cardNumber: 'OP01-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'setActiveControllerCharacter', maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP01-059 — (Event) [Main] Trash 1 {Land of Wano} from hand: set up to 1 {Land of Wano} cost<=3 active.
  { cardNumber: 'OP01-059', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Land of Wano' } },
    { fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Land of Wano', maxCost: 3 }, maxTargets: 1 },
  ] } },

  // OP01-064 — [DON!! x1] [When Attacking] You may trash 1 from hand: return up to 1 opp Character cost<=3 to hand.
  { cardNumber: 'OP01-064', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP01-069 — [On K.O.] Play up to 1 [Smiley] from your deck, then shuffle.
  { cardNumber: 'OP01-069', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Smiley' } }] } },

  // OP01-074 — [Blocker] [On K.O.] Play up to 1 [Pacifista] cost<=4 from hand.
  { cardNumber: 'OP01-074', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Pacifista', maxCost: 4 } }] } },

  // OP01-078 — [Blocker] [DON!! x1] [When Attacking]/[On Block] Draw 1 if you have 5 or less cards in hand.
  {
    cardNumber: 'OP01-078',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'onBlock', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP01-079 — [Blocker] [On K.O.] If Leader {Baroque Works}, add up to 1 Event from trash to hand.
  { cardNumber: 'OP01-079', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP01-087 — (Event) [Counter] Play up to 1 {Baroque Works} cost<=3 from hand. [Trigger] Activate [Counter].
  {
    cardNumber: 'OP01-087',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } },
    ],
  },

  // OP01-093 — [On Play] rest 1 DON!!: add 1 DON!! from deck rested.
  { cardNumber: 'OP01-093', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP01-097 — [On Play] DON!! −1: this gains [Rush]; then give up to 1 opp Character −2000 this turn.
  { cardNumber: 'OP01-097', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
  ] } },

  // OP01-101 — [DON!! x1] [When Attacking] You may trash 1 from hand: add 1 DON!! from deck rested.
  { cardNumber: 'OP01-101', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01-102 — [When Attacking] DON!! −1: opponent trashes 1 card from their hand.
  { cardNumber: 'OP01-102', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },

  // OP01-111 — [Blocker] [On Block] DON!! −1: this Character gains +1000 this turn.
  { cardNumber: 'OP01-111', templateId: 'ability', params: { timing: 'onBlock', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },

  // OP01-114 — [On Play] DON!! −1: opponent trashes 1 card from their hand.
  { cardNumber: 'OP01-114', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },

  // OP01-119 — (Event) [Counter] +4000 battle; then if 2 or less Life, add 1 DON!! rested. [Trigger] add 1 DON!! active.
  {
    cardNumber: 'OP01-119',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true },
        { fn: 'addDonFromDeck', count: 1, rested: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP01-044 — [Blocker] [On Play] If you don't have [Penguin], play up to 1 [Penguin] from hand.
  { cardNumber: 'OP01-044', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDoesNotControlNamed', name: 'Penguin' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Penguin' } }] } },

  // OP01-050 — [Blocker] [On Play] If you don't have [Shachi], play up to 1 [Shachi] from hand.
  { cardNumber: 'OP01-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDoesNotControlNamed', name: 'Shachi' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Shachi' } }] } },


  // OP01-083 — [DON!! x1] [Your Turn] If Leader {Baroque Works}, +1000 power for every 2 Events in trash.
  { cardNumber: 'OP01-083', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerTrashEvents', step: 2, amountPer: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'leaderType', type: 'Baroque Works' }] } }] } },

];
