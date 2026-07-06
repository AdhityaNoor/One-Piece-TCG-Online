/**
 * Reviewed effect template assignments - Main Booster OP02.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP02_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP02-011 — [On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less.
  // OP02-005 - [On Play] Look at up to 5; add red cost-1 Character.
  {
    cardNumber: 'OP02-005',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', color: 'red', exactCost: 1 } }] },
  },
  { cardNumber: 'OP02-011', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
  // OP02-016 - [On Play] Give red cost-1 Character +3000 power.
  { cardNumber: 'OP02-016', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { color: 'red', exactCost: 1 } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },
  // OP02-017 - [DON!! x2] [When Attacking] K.O. opponent Character with 2000 power or less.
  { cardNumber: 'OP02-017', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
  // OP02-022 - [Main] Search Whitebeard Pirates Character. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP02-022',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates' } }] } },
    ],
  },
  // OP02-034 - [DON!! x1] [When Attacking] Rest opponent Character with cost 2 or less.
  { cardNumber: 'OP02-034', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
  // OP02-047 - [Main] Rest cost <=4. [Trigger] K.O. rested cost <=3.
  {
    cardNumber: 'OP02-047',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP02-096 - [On Play] Draw 1. [When Attacking] Give opponent Character -4 cost this turn.
  {
    cardNumber: 'OP02-096',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] } },
    ],
  },
  // OP02-058 - [On Play] Look at 5; add blue Impel Down card other than this card's name.
  {
    cardNumber: 'OP02-058',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'blue', typeIncludes: 'Impel Down', excludeSelfName: true } }] },
  },
  // OP02-083 - [On Play] Look at 5; add purple Impel Down card other than this card's name.
  {
    cardNumber: 'OP02-083',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'purple', typeIncludes: 'Impel Down', excludeSelfName: true } }] },
  },
  // OP02-086 - [On K.O.] If Leader has Impel Down, add 1 DON!! rested.
  // OP02-072 - [When Attacking] DON!! -4: K.O. cost <=3, then this Leader +1000.
  { cardNumber: 'OP02-072', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 4 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },
  // OP02-076 - [On Play] DON!! -1: K.O. cost <=1.
  { cardNumber: 'OP02-076', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP02-079 - [On Play] DON!! -1: Rest cost <=4.
  { cardNumber: 'OP02-079', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  { cardNumber: 'OP02-086', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP02-087 - [On K.O.] If Leader has Impel Down, add 1 DON!! rested.
  { cardNumber: 'OP02-087', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP02-103 - [DON!! x1] [When Attacking] Give opponent Character -2 cost.
  { cardNumber: 'OP02-103', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },
  // OP02-105 - [DON!! x1] [When Attacking] Give opponent Character -3 cost.
  { cardNumber: 'OP02-105', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, optional: true }] } },
  // OP02-106 - [On Play] Give opponent Character -2 cost.
  { cardNumber: 'OP02-106', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },
  // OP02-112 - [Activate: Main] Rest this: give opponent Character -1 cost, then your Leader/Character +1000.
  { cardNumber: 'OP02-112', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  // OP02-115 - [DON!! x2] [When Attacking] K.O. opponent Character with cost 0.
  { cardNumber: 'OP02-115', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
  // OP02-067 - [Main] Return cost 4 or less Character to hand. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP02-067',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP02-117 - [Main] Give opponent Character -5 cost. [Trigger] K.O. cost 3 or less.
  {
    cardNumber: 'OP02-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -5, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP02-119 - [Main] K.O. cost 1 or less. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP02-119',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP02 coverage batch: trigger-play plus sequenced cost-modifier payoff.
  { cardNumber: 'OP02-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
  {
    cardNumber: 'OP02-113',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [
            { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true },
            { fn: 'addPowerSelf', amount: 2000, duration: 'duringThisBattle', ifGate: [{ kind: 'anyCharacterExactCost', exactCost: 0 }] },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // --- Batch: OP02 cards expressible with existing primitives ---

  // OP02-001 — (Leader) [End of Your Turn] Add 1 top Life card to hand.
  { cardNumber: 'OP02-001', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } }] } },

  // OP02-009 — [On Play] If Leader {Whitebeard Pirates}, give up to 1 opp Character −4000 this turn and add 1 top Life to hand.
  { cardNumber: 'OP02-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP02-010 — [Activate: Main] rest this: play up to 1 red Character (other than [Dogura], cost 1) from hand.
  { cardNumber: 'OP02-010', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', exactCost: 1, excludeSelfName: true } }] } },

  // OP02-013 — [On Play] Give up to 2 opp Characters −3000 this turn. Then if Leader {Whitebeard Pirates}, this gains [Rush].
  { cardNumber: 'OP02-013', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 2 },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifGate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }] },
  ] } },

  // OP02-015 — [Activate: Main] rest this: up to 1 of your red Characters (cost 1) gains +3000 this turn.
  { cardNumber: 'OP02-015', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { color: 'red', exactCost: 1 } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  // OP02-021 — (Event) [Main] If Leader {Whitebeard Pirates}, K.O. up to 1 opp Character with 3000 power or less. [Trigger] give up to 1 opp Leader/Character −3000 this turn.
  {
    cardNumber: 'OP02-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP02-029 — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'OP02-029', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP02-030 — [Activate: Main] [Once Per Turn] rest 3 DON!!: set this active. [On K.O.] play up to 1 green {Land of Wano} cost 3 from deck.
  {
    cardNumber: 'OP02-030',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 3 }], functions: [{ fn: 'setActiveSelf' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromDeck', filter: { category: 'character', color: 'green', typeIncludes: 'Land of Wano', exactCost: 3 } }] } },
    ],
  },

  // OP02-032 — [On Play] rest 2 DON!!: set up to 1 {Minks} Character cost<=5 active.
  { cardNumber: 'OP02-032', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks', maxCost: 5 }, maxTargets: 1 }] } },

  // OP02-036 — [On Play]/[When Attacking] rest 1 DON!!: look 3, reveal up to 1 {FILM} (other than [Nami]), add to hand, rest to bottom.
  {
    cardNumber: 'OP02-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM', excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },

  // OP02-037 — [On Play] Play up to 1 {FILM} or {Straw Hat Crew} Character cost<=2 from hand.
  { cardNumber: 'OP02-037', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'FILM' }, { typeIncludes: 'Straw Hat Crew' }], maxCost: 2 } }] } },

  // OP02-040 — [On Play] Play up to 1 {FILM} or {Straw Hat Crew} Character cost<=3 from hand.
  { cardNumber: 'OP02-040', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'FILM' }, { typeIncludes: 'Straw Hat Crew' }], maxCost: 3 } }] } },

  // OP02-041 — [Blocker] [On Play] Play up to 1 {FILM} or {Straw Hat Crew} Character cost<=4 from hand.
  { cardNumber: 'OP02-041', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'FILM' }, { typeIncludes: 'Straw Hat Crew' }], maxCost: 4 } }] } },

  // OP02-042 — [On Play] Rest up to 1 opp Character cost<=6.
  { cardNumber: 'OP02-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },

  // OP02-044 — [On Play] Play up to 1 {Minks} Character (other than [Wanda], cost<=3) from hand.
  { cardNumber: 'OP02-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Minks', maxCost: 3, excludeSelfName: true } }] } },

  // OP02-048 — (Stage) [Activate: Main] trash 1 {Land of Wano} from hand + rest this Stage: set up to 1 DON!! active.
  { cardNumber: 'OP02-048', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Land of Wano' } },
    { fn: 'setActiveControllerDon', maxTargets: 1 },
  ] } },

  // OP02-049 — (Leader) [End of Your Turn] If you have 0 cards in hand, draw 2.
  { cardNumber: 'OP02-049', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 0 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP02-059 — [When Attacking] Draw 1 and trash 1 from hand. Then trash up to 3 from hand.
  { cardNumber: 'OP02-059', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'drawAndTrash', drawCount: 1, trashCount: 1 },
    { fn: 'optionalTrashFromHand', count: 3 },
  ] } },

  // OP02-062 — [On Play]/[When Attacking] trash 2 from hand: return up to 1 Character cost<=4 to hand; then this gains [Double Attack] this turn.
  {
    cardNumber: 'OP02-062',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP02-063 — [On Play] Add up to 1 blue Event (cost 1) from trash to hand.
  { cardNumber: 'OP02-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event', color: 'blue', exactCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP02-065 — [Blocker] [End of Your Turn] trash 1 from hand: set this active.
  { cardNumber: 'OP02-065', templateId: 'ability', params: { timing: 'endOfTurn', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'setActiveSelf', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP02-066 — (Event) [Main] trash 2 from hand: if Leader {Impel Down}, draw up to 2. [Trigger] draw 2.
  {
    cardNumber: 'OP02-066',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP02-068 — (Event) [Counter] trash 1 from hand: +3000 battle. [Trigger] return up to 1 Character cost<=2 to hand.
  {
    cardNumber: 'OP02-068',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP02-070 — (Stage) [Activate: Main] rest this Stage: If Leader [Emporio.Ivankov], draw 1 and trash 1; then trash up to 3.
  { cardNumber: 'OP02-070', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Emporio.Ivankov' }], functions: [
    { fn: 'drawAndTrash', drawCount: 1, trashCount: 1 },
    { fn: 'optionalTrashFromHand', count: 3 },
  ] } },

  // OP02-073 — [On Play] Play up to 1 {Jailer Beast} Character from hand.
  { cardNumber: 'OP02-073', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Jailer Beast' } }] } },

  // OP02-078 — [On Play] DON!! −2: play up to 1 {SMILE} Character (other than [Daifugo], cost<=3) from hand.
  { cardNumber: 'OP02-078', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'SMILE', maxCost: 3, excludeSelfName: true } }] } },

  // OP02-082 — [Activate: Main] DON!! −8: this Character gains +792000 power this turn.
  { cardNumber: 'OP02-082', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 8 }], functions: [{ fn: 'addPowerSelf', amount: 792000, duration: 'duringThisTurn' }] } },

  // OP02-092 — (Stage) [Activate: Main] trash 1 from hand + rest this Stage: look 3, reveal up to 1 {Impel Down}, add to hand, rest to bottom.
  { cardNumber: 'OP02-092', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' }, remainder: 'bottom' },
  ] } },

  // OP02-093 — (Leader) [DON!! x1] [Activate: Main] [Once Per Turn] give up to 1 opp Character −1 cost this turn; then if a cost-0 Character exists, this Leader +1000 this turn.
  { cardNumber: 'OP02-093', templateId: 'ability', params: { timing: 'activateMain', condition: { donAttachedAtLeast: 1 }, oncePerTurn: true, functions: [
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifGate: [{ kind: 'anyCharacterExactCost', exactCost: 0 }] },
  ] } },

  // OP02-098 — [On Play] trash 1 from hand: K.O. up to 1 opp Character cost<=3.
  { cardNumber: 'OP02-098', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP02-099 — [On Play] trash 1 from hand: K.O. up to 1 opp Character cost<=5.
  { cardNumber: 'OP02-099', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP02-120 — [On Play] DON!! −2: your Leader and all Characters gain +1000 until the start of your next turn.
  { cardNumber: 'OP02-120', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'untilStartOfNextTurn' }] } },

  // OP02-052 — [On Play] If you have [Mohji], draw 2 and trash 1 from hand.
  { cardNumber: 'OP02-052', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfControlsNamed', name: 'Mohji' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP02-111 — [When Attacking] If you have [Jango], this Character +3000 battle.
  { cardNumber: 'OP02-111', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfControlsNamed', name: 'Jango' }], functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisBattle' }] } },

];
