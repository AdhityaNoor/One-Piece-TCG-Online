/**
 * Reviewed effect template assignments - Main Booster OP01.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP01_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP01-001 — (Leader) [DON!! x1] [Your Turn] All of your Characters gain +1000 power.
  { cardNumber: 'OP01-001', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'your' } }] } },

  // --- Batch: OP01 cards expressible with existing primitives ---
  // OP01-001 (leader) Roronoa Zoro —
  //   [DON!! x1] [Your Turn] All of your Characters gain +1000 power.
  // NOTE: not yet implemented (needs template).

  // OP01-002 (leader) Trafalgar Law —
  //   [Activate: Main] [Once Per Turn] ➁ (You may rest the specified number of DON!! cards in your cost
  //   area.): If you have 5 Characters, return 1 of your Characters to the owner's hand. Then, play up to 1
  //   Character with a cost of 5 or less from your hand that is a different color than the returned
  //   Character.
  // NOTE: not yet implemented (needs template).

  // OP01-003 (leader) Monkey.D.Luffy —
  //   [Activate: Main] [Once Per Turn] ➃ (You may rest the specified number of DON!! cards in your cost
  //   area.): Set up to 1 of your {Supernovas} or {Straw Hat Crew} type Character cards with a cost of 5 or
  //   less as active. It gains +1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP01-004 (character) Usopp —
  //   [DON!! x1] [Your Turn] [Once Per Turn] Draw 1 card when your opponent activates an Event.
  // NOTE: not yet implemented (needs template).

  // OP01-005 — [On Play] Add up to 1 red Character (other than [Uta], cost<=3) from trash to hand.
  { cardNumber: 'OP01-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', color: 'red', maxCost: 3, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP01-006 - [On Play] Give up to 1 opponent Character -2000 power.
  { cardNumber: 'OP01-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP01-007 - [On K.O.] K.O. up to 1 opponent Character with 4000 power or less.
  { cardNumber: 'OP01-007', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },

  // OP01-008 — [On Play] You may add 1 top Life to hand: this Character gains [Rush] this turn.
  { cardNumber: 'OP01-008', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01 coverage batch: trigger-play, rest/K.O., movement, draw, and DON!! families.
  { cardNumber: 'OP01-009', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP01-011 — [On Play] You may place 1 from hand at the bottom of your deck: draw 1.
  { cardNumber: 'OP01-011', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01-013 (character) Sanji —
  //   [Activate: Main] [Once Per Turn] You may add 1 card from your Life area to your hand: This Character
  //   gains +2000 power during this turn. Then, give this Character up to 2 rested DON!! cards.
  // NOTE: not yet implemented (needs template).

  // OP01-014 — [DON!! x1] [On Block] Play up to 1 red Character cost<=2 from hand.
  { cardNumber: 'OP01-014', templateId: 'ability', params: { timing: 'onBlock', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxCost: 2 } }] } },

  // OP01-015 — [DON!! x1] [When Attacking] You may trash 1 from hand: add up to 1 {Straw Hat Crew} Character (other than [Tony Tony.Chopper], cost<=4) from trash to hand.
  { cardNumber: 'OP01-015', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'trash', player: 'controller', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 4, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP01-016 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew (excl. same name).
  {
    cardNumber: 'OP01-016',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } }] },
  },

  // OP01-017 - [DON!! x1] [When Attacking] K.O. up to 1 opponent Character with 3000 power or less.
  { cardNumber: 'OP01-017', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },

  // OP01-019 — [DON!! x2] [Opponent's Turn] +3000
  { cardNumber: 'OP01-019', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'opponent' } }] } },

  // OP01-019 (character) Bartolomeo —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.) [DON!! x2] [Opponent's Turn] This Character gains +3000 power.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP01-020', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP01-021 (character) Franky —
  //   [DON!! x1] This Character can also attack your opponent's active Characters.
  // NOTE: not yet implemented (needs template).

  // OP01-022 - [DON!! x1] [When Attacking] Give up to 2 opponent Characters -2000 power.
  { cardNumber: 'OP01-022', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },

  // OP01-024 (character) Monkey.D.Luffy —
  //   [DON!! x2] This Character cannot be K.O.'d in battle by ＜Strike＞ attribute Characters. [Activate:
  //   Main] [Once Per Turn] Give this Character up to 2 rested DON!! cards.
  // NOTE: not yet implemented (needs template).

  // OP01-026 - [Counter] +4000 to your Leader/Character, then K.O. 4000 power or less. [Trigger] -10000 to opponent Leader/Character.
  {
    cardNumber: 'OP01-026',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -10000, duration: 'duringThisTurn', optional: true }] } },
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

  // OP01-030 - [Main] Search Straw Hat Crew Character. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP01-030',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Straw Hat Crew' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Straw Hat Crew' } }] } },
    ],
  },

  // OP01-031 — (Leader) [Activate: Main] [Once Per Turn] Trash 1 {Land of Wano} from hand: set up to 2 DON!! active.
  { cardNumber: 'OP01-031', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Land of Wano' } },
    { fn: 'setActiveControllerDon', maxTargets: 2 },
  ] } },

  // OP01-032 — [DON!! x1] if opponent has 2+ rested Characters, +2000
  { cardNumber: 'OP01-032', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'opponentRestedCharacterCount', atLeast: 2 }] } }] } },

  // OP01-032 (character) Ashura Doji —
  //   [DON!! x1] If your opponent has 2 or more rested Characters, this Character gains +2000 power.
  // NOTE: not yet implemented (needs template).

  // OP01-033 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP01-033', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP01-034 — [DON!! x2] [When Attacking] Set up to 1 DON!! active.
  { cardNumber: 'OP01-034', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  { cardNumber: 'OP01-035', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  { cardNumber: 'OP01-037', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP01-038 (character) Kanjuro —
  //   [DON!! x1] [When Attacking] K.O. up to 1 of your opponent's rested Characters with a cost of 2 or
  //   less. [On K.O.] Your opponent chooses 1 card from your hand; trash that card.
  // NOTE: not yet implemented (needs template).

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

  // OP01-044 — [Blocker] [On Play] If you don't have [Penguin], play up to 1 [Penguin] from hand.
  { cardNumber: 'OP01-044', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDoesNotControlNamed', name: 'Penguin' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Penguin' } }] } },

  // OP01-046 — [DON!! x1] [When Attacking] If Leader [Kouzuki Oden], set up to 2 DON!! active.
  { cardNumber: 'OP01-046', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderName', name: 'Kouzuki Oden' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP01-047 — [Blocker] [On Play] return 1 Character to hand: play up to 1 Character cost<=3 from hand.
  { cardNumber: 'OP01-047', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'any' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'playFromHand', filter: { category: 'character', maxCost: 3 }, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01-047 (character) Trafalgar Law —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.) [On Play] You may return 1 Character to your hand: Play up to 1 Character card with a
  //   cost of 3 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // OP01-048 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP01-048', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP01-049 — [DON!! x1] [When Attacking] Play up to 1 {Heart Pirates} Character (other than [Bepo], cost<=4) from hand.
  { cardNumber: 'OP01-049', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Heart Pirates', maxCost: 4, excludeSelfName: true } }] } },

  // OP01-050 — [Blocker] [On Play] If you don't have [Shachi], play up to 1 [Shachi] from hand.
  { cardNumber: 'OP01-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDoesNotControlNamed', name: 'Shachi' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Shachi' } }] } },

  // OP01-051 (character) Eustass"Captain"Kid —
  //   [DON!! x1] [Opponent's Turn] If this Character is rested, your opponent cannot attack any card other
  //   than the Character [Eustass"Captain"Kid]. [Activate: Main] [Once Per Turn] You may rest this
  //   Character: Play up to 1 Character card with a cost of 3 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // OP01-052 — [When Attacking] [Once Per Turn] If you have 2 or more rested Characters, draw 1.
  { cardNumber: 'OP01-052', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },

  { cardNumber: 'OP01-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },

  // OP01-055 (event) You Can Be My Samurai!! —
  //   [Main] You may rest 2 of your Characters: Draw 2 cards.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP01-056', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true, maxTargets: 2 }] } },

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

  // OP01-058 - [Counter] +4000 to your Leader/Character, then rest opponent Character cost 4 or less. [Trigger] rest opponent Character.
  {
    cardNumber: 'OP01-058',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: {} }, optional: true }] } },
    ],
  },

  // OP01-059 — (Event) [Main] Trash 1 {Land of Wano} from hand: set up to 1 {Land of Wano} cost<=3 active.
  { cardNumber: 'OP01-059', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Land of Wano' } },
    { fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Land of Wano', maxCost: 3 }, maxTargets: 1 },
  ] } },

  // OP01-060 (leader) Donquixote Doflamingo —
  //   [DON!! x2] [When Attacking] ➀ (You may rest the specified number of DON!! cards in your cost area.):
  //   Reveal 1 card from the top of your deck. If that card is a {The Seven Warlords of the Sea} type
  //   Character card with a cost of 4 or less, you may play that card rested.
  // NOTE: not yet implemented (needs template).

  // OP01-061 (leader) Kaido —
  //   [DON!! x1] [Your Turn] [Once Per Turn] When your opponent's Character is K.O.'d, add up to 1 DON!!
  //   card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP01-062 (leader) Crocodile —
  //   [DON!! x1] When you activate an Event, you may draw 1 card if you have 4 or less cards in your hand
  //   and haven't drawn a card using this Leader's effect during this turn.
  // NOTE: not yet implemented (needs template).

  // OP01-063 (character) Arlong —
  //   [DON!! x1] [Activate: Main] You may rest this Character: Choose 1 card from your opponent's hand;
  //   your opponent reveals that card. If the revealed card is an Event, place up to 1 card from your
  //   opponent's Life area at the bottom of the owner's deck.
  // NOTE: not yet implemented (needs template).

  // OP01-064 — [DON!! x1] [When Attacking] You may trash 1 from hand: return up to 1 opp Character cost<=3 to hand.
  { cardNumber: 'OP01-064', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP01-068 — [Your Turn] [Double Attack] if 5+ cards in hand
  { cardNumber: 'OP01-068', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { turn: 'your', gate: [{ kind: 'selfHand', atLeast: 5 }] } }] } },

  // OP01-067 (character) Crocodile —
  //   [Banish] (When this card deals damage, the target card is trashed without activating its Trigger.)
  //   [DON!! x1] Give blue Events in your hand −1 cost.
  // NOTE: not yet implemented (needs template).

  // OP01-068 (character) Gecko Moria —
  //   [Your Turn] This Character gains [Double Attack] if you have 5 or more cards in your hand. (This card
  //   deals 2 damage.)
  // NOTE: not yet implemented (needs template).

  // OP01-069 — [On K.O.] Play up to 1 [Smiley] from your deck, then shuffle.
  { cardNumber: 'OP01-069', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Smiley' } }] } },

  { cardNumber: 'OP01-070', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 7 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  {
    cardNumber: 'OP01-071',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP01-072 — [DON!! x1] [Your Turn] +1000 power for every card in your hand.
  { cardNumber: 'OP01-072', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerHand', step: 1, amountPer: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your' } }] } },

  // OP01-120 (character) Shanks —
  //   [Rush] (This card can attack on the turn in which it is played.) [When Attacking] Your opponent
  //   cannot activate a [Blocker] Character that has 2000 or less power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP01-121 (character) Yamato —
  //   Also treat this card's name as [Kouzuki Oden] according to the rules. [Double Attack] (This card
  //   deals 2 damage.) [Banish] (When this card deals damage, the target card is trashed without activating
  //   its Trigger.)
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'OP01-073', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // OP01-072 (character) Smiley —
  //   [DON!! x1] [Your Turn] This Character gains +1000 power for every card in your hand.
  // NOTE: not yet implemented (needs template).

  // OP01-074 — [Blocker] [On K.O.] Play up to 1 [Pacifista] cost<=4 from hand.
  { cardNumber: 'OP01-074', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Pacifista', maxCost: 4 } }] } },

  { cardNumber: 'OP01-077', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // OP01-075 (character) Pacifista —
  //   Under the rules of this game, you may have any number of this card in your deck. [Blocker] (After
  //   your opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

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

  // OP01-080 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP01-080', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  { cardNumber: 'OP01-082', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP01-083 — [DON!! x1] [Your Turn] If Leader {Baroque Works}, +1000 power for every 2 Events in trash.
  { cardNumber: 'OP01-083', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerTrashEvents', step: 2, amountPer: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'leaderType', type: 'Baroque Works' }] } }] } },

  // OP01-084 - [DON!! x1] [When Attacking] Look at 5; add up to 1 Baroque Works Event.
  {
    cardNumber: 'OP01-084',
    templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', typeIncludes: 'Baroque Works' } }] },
  },

  // OP01-085 (character) Mr.3(Galdino) —
  //   [On Play] If your Leader has the {Baroque Works} type, select up to 1 of your opponent's Characters
  //   with a cost of 4 or less. The selected Character cannot attack until the end of your opponent's next
  //   turn.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP01-086',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3, rested: false } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP01-087 — (Event) [Counter] Play up to 1 {Baroque Works} cost<=3 from hand. [Trigger] Activate [Counter].
  {
    cardNumber: 'OP01-087',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } },
    ],
  },

  // OP01-088 (event) Desert Spada —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, look
  //   at 3 cards from the top of your deck and place them at the top or bottom of the deck in any order.
  //   [Trigger] Draw 2 cards and trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP01-089 - [Counter] If Leader has Seven Warlords type, return cost 5 or less Character to hand.
  { cardNumber: 'OP01-089', templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP01-090 - [Main] Search Baroque Works card other than self.
  {
    cardNumber: 'OP01-090',
    templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works', excludeSelfName: true } }] },
  },

  // OP01-091 (leader) King —
  //   [Your Turn] If you have 10 DON!! cards on your field, give all of your opponent's Characters −1000
  //   power.
  // NOTE: not yet implemented (needs template).

  // OP01-093 — [On Play] rest 1 DON!!: add 1 DON!! from deck rested.
  { cardNumber: 'OP01-093', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP01-094 (character) Kaido —
  //   [On Play] DON!! −6 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): If your Leader has the {Animal Kingdom Pirates} type, K.O. all Characters other than this
  //   Character.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP01-095', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP01-113 — [On K.O.] Add 1 DON!! from DON!! deck (rested).
  // OP01-096 - [On Play] DON!! -2: K.O. cost <=3 and cost <=2.
  {
    cardNumber: 'OP01-096',
    templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] },
  },

  // OP01-097 — [On Play] DON!! −1: this gains [Rush]; then give up to 1 opp Character −2000 this turn.
  { cardNumber: 'OP01-097', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
  ] } },

  // OP01-098 (character) Kurozumi Orochi —
  //   [On Play] Reveal up to 1 [Artificial Devil Fruit SMILE] from your deck and add it to your hand. Then,
  //   shuffle your deck.
  // NOTE: not yet implemented (needs template).

  // OP01-099 (character) Kurozumi Semimaru —
  //   {Kurozumi Clan} type Characters other than your [Kurozumi Semimaru] cannot be K.O.'d in battle.
  // NOTE: not yet implemented (needs template).

  // OP01-101 — [DON!! x1] [When Attacking] You may trash 1 from hand: add 1 DON!! from deck rested.
  { cardNumber: 'OP01-101', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP01-102 — [When Attacking] DON!! −1: opponent trashes 1 card from their hand.
  { cardNumber: 'OP01-102', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },

  { cardNumber: 'OP01-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP01-105 (character) Bao Huang —
  //   [On Play] Choose 2 cards from your opponent's hand; your opponent reveals those cards.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP01-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP01-108 - [On K.O.] DON!! -1: K.O. cost <=5.
  { cardNumber: 'OP01-108', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  // OP01-109 — [DON!! x1] [Your Turn] if 8+ DON!!, +1000
  { cardNumber: 'OP01-109', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] } }] } },

  // OP01-109 (character) Who's.Who —
  //   [DON!! x1] [Your Turn] If you have 8 or more DON!! cards on your field, this Character gains +1000
  //   power.
  // NOTE: not yet implemented (needs template).

  // OP01-111 — [Blocker] [On Block] DON!! −1: this Character gains +1000 this turn.
  { cardNumber: 'OP01-111', templateId: 'ability', params: { timing: 'onBlock', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },

  // OP01-112 (character) Page One —
  //   [Activate: Main] [Once Per Turn] DON!! −1 (You may return the specified number of DON!! cards from
  //   your field to your DON!! deck.): This Character can also attack your opponent's active Characters
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP01-113', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP01-114 — [On Play] DON!! −1: opponent trashes 1 card from their hand.
  { cardNumber: 'OP01-114', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },

  // OP01-115 - [Main] K.O. cost 2 or less, then add 1 active DON!!. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP01-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP01-116 (event) Artificial Devil Fruit SMILE —
  //   [Main] Look at 5 cards from the top of your deck; play up to 1 {SMILE} type Character card with a
  //   cost of 3 or less. Then, place the rest at the bottom of your deck in any order. [Trigger] Activate
  //   this card's [Main] effect.
  // NOTE: not yet implemented (needs template).

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

];
