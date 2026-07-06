/**
 * Reviewed effect template assignments — Extra Booster sets (EB01, EB02).
 *
 * Only add a card here after:
 *   1. Reading the card's English effect text.
 *   2. Confirming the chosen template + params match the real ruling behavior.
 *   3. Verifying the resulting EffectProgram is JSON-serializable.
 *
 * Do NOT copy raw effect text into params. Params are structural only.
 */
import type { CardEffectAssignment } from '../assembler';

export const EB_ASSIGNMENTS: CardEffectAssignment[] = [
  // --- Batch: EB01 expressible ---
  // --- Batch: EB02 expressible ---
  // --- Batch: EB03 expressible ---
  // --- Batch: EB04 expressible ---
  // EB01-001 (leader) Kouzuki Oden —
  //   All of your {Land of Wano} type Character cards without a Counter have a +1000 Counter, according to
  //   the rules.[DON!! x1] [When Attacking] If you have a {Land of Wano} type Character with a cost of 5 or
  //   more, this Leader gains +1000 power until the start of your next turn.
  // NOTE: not yet implemented (needs template).

  // EB01-002 (character) Izo —
  //   [On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.[On Your Opponent's
  //   Attack] [Once Per Turn] You may trash 1 card from your hand: If your Leader has the {Land of Wano} or
  //   {Whitebeard Pirates} type, give up to 1 of your opponent's Leader or Character cards −2000 power
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // EB01-003 - [Rush] [When Attacking] If opponent has 2 or less Life, this Character +2000 this turn.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking power effect is templated.
  { cardNumber: 'EB01-003', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentLife', atMost: 2 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // EB01-004 (character) Koza —
  //   [When Attacking] You may give your 1 active Leader −5000 power during this turn: Give up to 1 of your
  //   opponent's Characters −3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB01-006 - [Blocker] [DON!! x2] [When Attacking] Give opponent Character -3000 power.
  // Note: [Blocker] is an engine keyword flag. Only the when-attacking power effect is templated.
  { cardNumber: 'EB01-006', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // EB01-007 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'EB01-007', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // EB01-008 (character) LittleOars Jr. —
  //   [Once Per Turn] If this Character would be K.O.'d by an effect, you may trash 1 Event or Stage card
  //   from your hand instead.
  // NOTE: not yet implemented (needs template).

  // EB01-009 (event) Just Shut Up and Come with Us!!!! —
  //   [Counter] Look at 5 cards from the top of your deck and play up to 1 {Animal} type Character card
  //   with a cost of 3 or less. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // EB01-010 — (Event) [Counter] K.O. up to 1 opp Character 6000 base power or less. [Trigger] 5000 base power or less.
  {
    cardNumber: 'EB01-010',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },
    ],
  },

  // EB01-011 (stage) Mini-Merry —
  //   [Activate: Main] You may rest this card and place 1 of your Characters with 1000 base power at the
  //   bottom of your deck: Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // EB01-012 (character) Cavendish —
  //   [On Play]/[When Attacking] If your Leader has the {Supernovas} type and you have no other [Cavendish]
  //   Characters, set up to 2 of your DON!! cards as active.
  // NOTE: not yet implemented (needs template).

  // EB01-013 — [Activate: Main] trash this: play up to 1 {Land of Wano} cost<=5 (other than [Kouzuki Hiyori]) from hand; then draw 1.
  { cardNumber: 'EB01-013', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 5, excludeSelfName: true } },
    { fn: 'draw', amount: 1 },
  ] } },

  // EB01-014 (character) Sanji —
  //   [DON!! x1] [Your Turn] This Character gains +1000 power for every 3 of your rested DON!! cards.
  // NOTE: not yet implemented (needs template).

  // EB01-015 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-016 - [Activate: Main] Rest this Character: K.O. up to 1 rested opponent Character cost 1 or less.
  { cardNumber: 'EB01-016', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 1 } }, optional: true }] } },

  // EB01-019 - [Counter] +4000 to Leader/Character, then reveal-search top 3 for Donquixote Pirates Character.
  {
    cardNumber: 'EB01-019',
    templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates' } }] },
  },

  // EB01-020 (event) Chambres —
  //   [Main] If your Leader has the {Supernovas} type, return 1 of your Characters to the owner's hand, and
  //   play up to 1 Character card with a cost of 2 or less from your hand that is a different color than
  //   the returned Character. [Trigger] Activate this card's [Main] effect.
  // NOTE: not yet implemented (needs template).

  // EB01-021 (leader) Hannyabal —
  //   [End of Your Turn] You may return 1 of your {Impel Down} type Characters with a cost of 2 or more to
  //   the owner's hand: Add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // EB01-022 — [End of Your Turn] If you have 2 or less cards in hand, draw 2.
  { cardNumber: 'EB01-022', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 2 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // EB01-023 — [On Play] Draw 1 card.
  { cardNumber: 'EB01-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // EB01-024 (character) Hamlet —
  //   If you have 4 or less cards in your hand, all of your {SMILE} type Characters gain +1000 power.
  // NOTE: not yet implemented (needs template).

  // EB01-026 - [DON!! x1] [When Attacking] If hand has 1 or less, return cost <=3 Character to hand.
  { cardNumber: 'EB01-026', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHand', atMost: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // EB01-027 — If Leader {Baroque Works}, +1000 power for every 2 Events in trash. [On Play] Draw 2 and trash 1.
  {
    cardNumber: 'EB01-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerTrashEvents', step: 2, amountPer: 1000, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Baroque Works' }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // EB01-028 (event) Gum-Gum Champion Rifle —
  //   [Counter] If your Leader has the {Impel Down} type, up to 1 of your Leader or Character cards gains
  //   +2000 power during this battle. Then, your opponent returns 1 of their active Characters to the
  //   owner's hand. [Trigger] Return up to 1 Character with a cost of 3 or less to the bottom of the
  //   owner's deck.
  // NOTE: not yet implemented (needs template).

  // EB01-029 (event) Sorry. I'm a Goner. —
  //   [Counter] Reveal 1 card from the top of your deck. If the revealed card has a cost of 4 or more,
  //   return up to 1 of your Characters to the owner's hand. Then, place the revealed card at the bottom of
  //   your deck. [Trigger] Return up to 1 Character with a cost of 8 or less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // EB01-030 (stage) Loguetown —
  //   [Activate: Main] You may place this card and 1 card from your hand at the bottom of your deck in any
  //   order: Draw 2 cards. [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // EB01-031 — [On Play] DON!! −1: If Leader {Water Seven}, add up to 2 Characters cost<=4 from trash to hand.
  { cardNumber: 'EB01-031', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 2 }] } },

  // EB01-033 (character) Blueno —
  //   [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): If your Leader has the {Water Seven} type, play up to 1 {Water Seven} type Character card
  //   with a cost of 5 other than [Blueno] from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // EB01-034 (character) Ms. Wednesday —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Your Opponent's Attack] [Once Per Turn] DON!! −1 (You may return the specified
  //   number of DON!! cards from your field to your DON!! deck.): If your Leader's type includes "Baroque
  //   Works", add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // EB01-035 — [On Play] If Leader {Baroque Works}, up to 1 Leader/Character +1000 this turn. [Trigger] DON!! −1: play this.
  {
    cardNumber: 'EB01-035',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // EB01-036 - [Rush] [On K.O.] If Leader has Impel Down type, add 1 rested DON!!.
  // Note: [Rush] is an engine keyword flag. Only the on-K.O. DON!! ramp is templated.
  {
    cardNumber: 'EB01-036',
    templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] },
  },

  // EB01-037 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: K.O. up to 1 opp Character cost<=2.
  { cardNumber: 'EB01-037', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-038 (event) Oh Come My Way —
  //   [Counter] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): If your Leader's type includes "Baroque Works", select 1 of your Characters. Change the
  //   attack target to the selected Character. [Trigger] DON!! −1: Draw 2 cards.
  // NOTE: not yet implemented (needs template).

  // EB01-039 - [Main] DON!! -1: K.O. cost <=8. [Trigger] add 1 active DON!!.
  {
    cardNumber: 'EB01-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // EB01-040 (leader) Kyros —
  //   [Activate: Main] [Once Per Turn] You may turn 1 card from the top of your Life cards face-up: K.O. up
  //   to 1 of your opponent's Characters with a cost of 0.
  // NOTE: not yet implemented (needs template).

  // EB01-042 (character) Scarlet —
  //   [Activate: Main] You may trash this Character: Play up to 1 {Dressrosa} type Character card with a
  //   cost of 3 or less other than [Scarlet] from your hand rested. Then, give up to 1 of your opponent's
  //   Characters −2 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // EB01-043 (character) Spandine —
  //   [On Play] You may place 3 cards with a type including "CP" from your trash at the bottom of your deck
  //   in any order: Play up to 1 Character card with a type including "CP" and a cost of 4 or less other
  //   than [Spandine] from your trash rested.
  // NOTE: not yet implemented (needs template).

  // EB01-044 — [Activate: Main] rest this: up to 1 of your [Spandam] Characters +3000 this turn.
  { cardNumber: 'EB01-044', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Spandam' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  // EB01-045 (character) Brook —
  //   [On Play] If your opponent has a Character with a cost of 0, this Character gains [Rush] during this
  //   turn.(This card can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // EB01-046 - [On Play]/[When Attacking] Give opponent Character -1 cost, then K.O. cost 0.
  {
    cardNumber: 'EB01-046',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
    ],
  },

  // EB01-047 — [Once Per Turn] When a Character is K.O.'d, draw 1 and trash 1 from hand.
  { cardNumber: 'EB01-047', templateId: 'ability', params: { timing: 'onCharacterKoed', oncePerTurn: true, functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // EB01-048 — [Activate: Main] You may rest this Character: Give up to 1 of your opponent's Characters −4 cost.
  {
    cardNumber: 'EB01-048',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] },
  },

  // EB01-049 — [On Play] K.O. up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-050 (event) ...I Want to Live!! —
  //   [Counter] If you have 30 or more cards in your trash, add up to 1 card from the top of your deck to
  //   the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // EB01-051 — (Event) [Main] trash 2 from top of deck: K.O. up to 1 opp Character cost<=5. [Trigger] Activate [Main].
  {
    cardNumber: 'EB01-051',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // EB01-052 (character) Viola —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] Choose one:• Look at all of your opponent's Life cards and place them back
  //   in their Life area in any order.• Turn all of your Life cards face-down.
  // NOTE: not yet implemented (needs template).

  // EB01-053 — [On Play] Place up to 1 opp Character cost<=3 at the top or bottom of opponent's Life face-up. [Trigger] give up to 1 opp Leader/Character −3000 this turn.
  {
    cardNumber: 'EB01-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB01-054 - [Blocker] [On Play] If opponent has 1 or less Life, K.O. cost 3 or less.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play K.O. is templated.
  {
    cardNumber: 'EB01-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  },

  // EB01-056 — [On Play] add 1 top/bottom Life to hand: draw 1.
  { cardNumber: 'EB01-056', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // EB01-057 (character) Shirahoshi —
  //   When this Character is K.O.'d by your opponent's effect, add up to 1 card from the top of your deck
  //   to the top of your Life cards.[Blocker] (After your opponent declares an attack, you may rest this
  //   card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // EB01-058 (character) Mont Blanc Cricket —
  //   [DON!! x1] [Your Turn] If you have 2 or less Life cards, this Character gains +2000 power.
  // NOTE: not yet implemented (needs template).

  // EB01-059 (event) Kingdom Come —
  //   [Main] K.O. up to 1 of your opponent's Characters. Then, trash cards from the top of your Life cards
  //   until you have 1 Life card. [Trigger] K.O. up to 1 of your opponent's Characters with a cost equal to
  //   or less than the total of your and your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  // EB01-060 (event) Did Someone Say...Kami? —
  //   [Main] Play up to 1 [Enel] with a cost of 7 or less from your hand or trash. Then, trash cards from
  //   the top of your Life cards until you have 1 Life card. [Trigger] Draw 2 cards and trash 1 card from
  //   your hand.
  // NOTE: not yet implemented (needs template).

  // EB01-061 (character) Mr.2.Bon.Kurei(Bentham) —
  //   [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.[When Attacking] Select up
  //   to 1 of your opponent's Characters. This Character's base power becomes the same as the selected
  //   Character's power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB02-002 — [Activate: Main] rest this: up to 1 {Revolutionary Army} Character (other than self) +2000 this turn.
  { cardNumber: 'EB02-002', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army', excludeSelf: true } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // EB02-003 (character) Tony Tony.Chopper —
  //   [DON!! x2] [Opponent's Turn] This Character gains +2000 power.[On Play] If your Leader has the {Straw
  //   Hat Crew} type, give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // EB02-005 (character) Fake Straw Hat Crew —
  //   [Your Turn] This Character gains +2000 power.[Opponent's Turn] Give this Character −2000 power.
  // NOTE: not yet implemented (needs template).

  // EB02-006 (character) Yamato —
  //   [Activate: Main] [Once Per Turn] If your Leader has the {Land of Wano} type or is [Portgas.D.Ace],
  //   give up to 1 rested DON!! card to 1 of your Leader. Then, this Character gains [Rush] during this
  //   turn.
  // NOTE: not yet implemented (needs template).

  // EB02-007 - [Main] up to 3 Leader/Characters +1000, then K.O. power <=3000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'EB02-007',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },

  // EB02-008 — (Event) [Main] look 4, reveal up to 1 card cost 4+, add to hand, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB02-008',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-009 (stage) Thousand Sunny —
  //   [Activate: Main] You may rest this Stage: Give up to 1 of your currently given DON!! cards to 1 of
  //   your {Straw Hat Crew} type Characters.
  // NOTE: not yet implemented (needs template).

  // EB02-010 (leader) Monkey.D.Luffy —
  //   [Activate: Main] [Once Per Turn] DON!! −2: If the only Characters on your field are {Straw Hat Crew}
  //   type Characters, set up to 2 of your DON!! cards as active. Then, this Leader gains +1000 power until
  //   the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // EB02-011 (character) Arlong —
  //   [On Play] If your Leader has the {Fish-Man} or {East Blue} type, give up to 1 rested DON!! card to 1
  //   of your Leader. Then, up to 1 of your opponent's Characters with a cost of 5 or less cannot be rested
  //   until the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // EB02-012 (character) Gaimon —
  //   If you have a [Sarfunkel], this Character gains [Blocker].
  // NOTE: not yet implemented (needs template).

  // EB02-013 — [On Play] If 3+ DON!! on field, look 7, reveal up to 1 [Zou], add to hand, rest to bottom; then play up to 1 [Zou] from hand.
  { cardNumber: 'EB02-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 3 }], functions: [
    { fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Zou' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { name: 'Zou' } },
  ] } },

  // EB02-014 - [On Play] Play up to 1 [Gaimon] from hand.
  {
    cardNumber: 'EB02-014',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Gaimon' } }] },
  },

  // EB02-015 (character) Jewelry Bonney —
  //   [On Play] Up to 1 of your opponent's rested Characters will not become active in your opponent's next
  //   Refresh Phase. Then, set up to 1 of your DON!! cards as active at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // EB02-016 — [On Play] Play up to 1 {Animal} Character cost<=3 from hand.
  { cardNumber: 'EB02-016', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Animal', maxCost: 3 } }] } },

  // EB02-017 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB02-017',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } }] },
  },

  // EB02-018 (character) Buggy —
  //   [On Play] If you have no other [Buggy] Characters, up to 1 of your Leader gains [Double Attack]
  //   during this turn. [Trigger] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // EB02-019 (character) Roronoa Zoro —
  //   If your opponent has 2 or more Characters, this Character can attack Characters on the turn in which
  //   it is played.[On Play] If your Leader has the {Straw Hat Crew} type, rest up to 1 of your opponent's
  //   Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // EB02-020 — (Event) [Main] look 4, reveal up to 1 cost 4+, add, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB02-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-021 — (Event) [Main] up to 1 {Straw Hat Crew} Character +6000 this turn; then it won't become active next Refresh. [Trigger] rest opp Character cost<=4.
  {
    cardNumber: 'EB02-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew' } }, amount: 6000, duration: 'duringThisTurn', optional: true },
        { fn: 'preventRefresh', target: { ref: 'previous' } },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // EB02-022 (character) Usopp —
  //   [On Play] If you have 2 or less Characters with 5000 power or more, play up to 1 Character card with
  //   6000 power or less and no base effect from your hand.
  // NOTE: not yet implemented (needs template).

  // EB02-023 (character) Crocodile —
  //   [Your Turn] [Once Per Turn] When your opponent's Character is returned to the owner's hand by your
  //   effect, look at 3 cards from the top of your deck and place them at the top or bottom of the deck in
  //   any order.
  // NOTE: not yet implemented (needs template).

  // EB02-024 — [On Play] Draw 2, place 2 from hand at bottom of deck; then return up to 1 Character cost<=1 to hand.
  { cardNumber: 'EB02-024', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // EB02-025 (character) Donquixote Rosinante —
  //   [Activate: Main] You may rest 1 of your DON!! cards and this Character: If your Leader is [Donquixote
  //   Rosinante], look at 5 cards from the top of your deck; play up to 1 Character card with a cost of 2
  //   or less rested. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // EB02-026 - [On Play] If Leader is multicolored and hand has 5 or less cards, draw 2.
  {
    cardNumber: 'EB02-026',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] },
  },

  // EB02-027 — [On Play] Place up to 1 opp Character with 1000 power or less at bottom of deck.
  { cardNumber: 'EB02-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 1000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // EB02-028 (character) Portgas.D.Ace —
  //   [On Play] If your Leader's type includes "Whitebeard Pirates", look at 5 cards from the top of your
  //   deck; reveal up to 1 Character card with a cost of 2 and add it to your hand. Then, place the rest at
  //   the bottom of your deck in any order and play up to 1 Character card with a cost of 2 from your hand
  //   rested.
  // NOTE: not yet implemented (needs template).

  // EB02-030 (event) And That's When Somebody Makes Fun of Their Friend's Dream!!!! —
  //   [Counter] If any of your Characters would be K.O.'d in battle during this turn, you may trash 1 card
  //   from your hand instead. [Trigger] Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // EB02-031 — (Event) same searcher as EB02-008.
  {
    cardNumber: 'EB02-031',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-032 (character) Iceburg —
  //   [On Play] If you have 3 or more DON!! cards on your field, look at 7 cards from the top of your deck;
  //   reveal up to 1 [Galley-La Company] and add it to your hand. Then, place the rest at the bottom of
  //   your deck in any order and play up to 1 [Galley-La Company] from your hand.
  // NOTE: not yet implemented (needs template).

  // EB02-033 (character) Klabautermann —
  //   If you have [Merry Go] on your field, this Character gains [Blocker].
  // NOTE: not yet implemented (needs template).

  // EB02-035 (character) Sanji & Pudding —
  //   [Your Turn] [Once Per Turn] When 2 or more DON!! cards on your field are returned to your DON!! deck,
  //   add up to 1 DON!! card from your DON!! deck and set it as active.[On Play] If the number of DON!!
  //   cards on your field is equal to or less than the number on your opponent's field, draw 1 card.
  // NOTE: not yet implemented (needs template).

  // EB02-036 — [Blocker] [On K.O.] DON!! −1: look 3, reveal up to 1 {Straw Hat Crew}, add to hand, rest to bottom.
  { cardNumber: 'EB02-036', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },

  // EB02-037 (character) Franky —
  //   [On Play]/[When Attacking] If your Leader has the {Straw Hat Crew} type and the number of DON!! cards
  //   on your field is equal to or less than the number on your opponent's field, add up to 1 DON!! card
  //   from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // EB02-038 — [On Play] Play up to 1 {Impel Down} Character cost<=2 from hand.
  { cardNumber: 'EB02-038', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 2 } }] } },

  // EB02-039 (event) GERMA 66 —
  //   [Main] You may trash 1 {GERMA 66} type Character card with 4000 power or less from your hand: If the
  //   number of DON!! cards on your field is equal to or less than the number on your opponent's field,
  //   play up to 1 Character card with 5000 to 7000 power and the same card name as the trashed card from
  //   your trash.
  // NOTE: not yet implemented (needs template).

  // EB02-040 — (Event) same searcher.
  {
    cardNumber: 'EB02-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-041 (stage) Merry Go —
  //   [On Play] If your Leader has the {Straw Hat Crew} type, draw 1 card.[Activate: Main] You may rest
  //   this Stage: If the number of DON!! cards on your field is equal to or less than the number on your
  //   opponent's field, up to 1 of your {Straw Hat Crew} type Characters gains +2 cost until the end of
  //   your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // EB02-044 — [Blocker] [On Play] Play up to 1 black {Navy} Character cost<=4 from trash rested.
  { cardNumber: 'EB02-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', color: 'black', typeIncludes: 'Navy', maxCost: 4 }, rested: true }] } },

  // EB02-045 (character) Trafalgar Law —
  //   [Blocker][On Play] You may place 2 cards from your trash at the bottom of your deck in any order:
  //   Choose one:• Draw 1 card.• If your opponent has 5 or more cards in their hand, your opponent trashes
  //   1 card from their hand.
  // NOTE: not yet implemented (needs template).

  // EB02-046 - [On Play] Trash top 2 cards of deck, then give opponent Character -1 cost.
  {
    cardNumber: 'EB02-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] },
  },

  // EB02-047 — [Activate: Main] trash 1 from hand + trash this: play CP Character cost<=5 (other than [Blueno]) from trash.
  { cardNumber: 'EB02-047', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'CP', maxCost: 5, excludeSelfName: true } },
  ] } },

  // EB02-048 — [On Play] add [Laboon] from trash to hand. [On K.O.] play [Laboon] cost<=4 from hand.
  {
    cardNumber: 'EB02-048',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: 'Laboon' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Laboon', maxCost: 4 } }] } },
    ],
  },

  // EB02-049 — [On Play] give up to 2 rested DON!! to your Leader. [Activate: Main] rest this: If Leader [Monkey.D.Garp], K.O. up to 1 opp Character cost<=1.
  {
    cardNumber: 'EB02-049',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Monkey.D.Garp' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
    ],
  },

  // EB02-050 — (Event) same searcher.
  {
    cardNumber: 'EB02-050',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-051 (event) Three-Pace Hum Soul Notch Slash —
  //   [Main] Choose one:• K.O. up to 1 of your opponent's Characters with a cost of 2 or less.• Give up to
  //   1 of your opponent's Characters −4 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // EB02-052 (character) Enel —
  //   If your Leader has the {Sky Island} type, this Character gains [Rush].[When Attacking] You may trash
  //   1 card from your hand: If you have 1 or less Life cards, add up to 1 card from the top of your deck
  //   to the top of your Life cards. Then, this Character gains +1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB02-053 — [On Play]/[On K.O.] look at top of your or opponent's Life, place top or bottom.
  {
    cardNumber: 'EB02-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
    ],
  },

  // EB02-054 - [Blocker] [On Play] If you have 2 or less Life, draw 2 and trash 1.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play draw/trash is templated.
  {
    cardNumber: 'EB02-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] },
  },

  // EB02-055 (character) Jinbe —
  //   [Trigger] If your Leader has the {Fish-Man} or {Merfolk} type and you have 2 or less Life cards, play
  //   this card.
  // NOTE: not yet implemented (needs template).

  // EB02-056 (character) Vegapunk —
  //   [Blocker][On Play] Look at 5 cards from the top of your deck; play up to 1 {Scientist} type Character
  //   card with a cost of 5 or less other than [Vegapunk]. Then, place the rest at the bottom of your deck
  //   in any order and if your opponent has 2 or less Characters, trash 1 card from your hand. [Trigger]
  //   Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // EB02-057 (character) Mad Treasure —
  //   [When Attacking] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to
  //   1 of your opponent's Characters with a cost of 3 or less to the top or bottom of your opponent's Life
  //   cards face-up.
  // NOTE: not yet implemented (needs template).

  // EB02-058 — (Event) same searcher.
  {
    cardNumber: 'EB02-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-059 — (Event) [Counter] +1000 battle; then if 1 or less Life, play yellow {Straw Hat Crew} or [Sanji] cost<=5 from hand.
  { cardNumber: 'EB02-059', templateId: 'ability', params: { timing: 'counter', functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true },
    { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ color: 'yellow', typeIncludes: 'Straw Hat Crew' }, { name: 'Sanji' }], maxCost: 5 }, ifGate: [{ kind: 'selfLife', atMost: 1 }] },
  ] } },

  // EB02-060 (stage) Merry Go —
  //   [Activate: Main] You may rest this Stage and turn 1 card from the top of your Life cards face-up: Up
  //   to 1 of your {Straw Hat Crew} type Characters gains +1000 power until the end of your opponent's next
  //   turn.
  // NOTE: not yet implemented (needs template).

  // EB02-061 (character) Monkey.D.Luffy —
  //   If your Leader is multicolored and your opponent has 5 or more DON!! cards on their field, this
  //   Character gains [Rush].[When Attacking] [Once Per Turn] You may return 2 of your active DON!! cards
  //   to your DON!! deck: Set this Character as active. Then, add 1 card from the top of your Life cards to
  //   your hand.
  // NOTE: not yet implemented (needs template).

  // EB03-001 (leader) Nefeltari Vivi —
  //   [Once Per Turn] If your Character with a base cost of 4 or more would be K.O.'d, you may trash 1 card
  //   from your hand instead.[Activate: Main] You may rest this Leader: Give up to 1 of your opponent's
  //   Characters −2000 power during this turn. Then, up to 1 of your Characters without a [When Attacking]
  //   effect gains [Rush] during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-003 (character) Uta —
  //   [On Play] If your Leader is [Uta], draw 2 cards. Then, play up to 1 Character card with 6000 power or
  //   less and no base effect from your hand.
  // NOTE: not yet implemented (needs template).

  // EB03-004 (character) Carina —
  //   [Blocker][Opponent's Turn] If your Leader is multicolored and you have no Characters with 6000 base
  //   power or more, this Character gains +4000 power.
  // NOTE: not yet implemented (needs template).

  // EB03-005 (character) Sugar —
  //   [On Play] If your Leader is [Sugar], play up to 1 {Donquixote Pirates} type Character card with 6000
  //   power or less from your hand rested.
  // NOTE: not yet implemented (needs template).

  // EB03-006 (character) Nami —
  //   [On Play] You may give your active Leader −5000 power during this turn: Draw 1 card.[Activate: Main]
  //   [Once Per Turn] If your Leader has the {Alabasta} type, give up to 1 of your opponent's Characters
  //   −1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-007 (character) Baccarat —
  //   [Blocker][On K.O.] Play up to 1 Character card with 6000 power or less and no base effect from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // EB03-008 (character) Hibari —
  //   [On Play]/[When Attacking] Up to 1 of your {SWORD} type Leader or Character cards can also attack
  //   active Characters during this turn.[Activate: Main] [Once Per Turn] Give up to 1 of your opponent's
  //   Characters −1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-009 (character) Makino —
  //   [Activate: Main] You may rest this Character: Up to 1 of your Characters with no base effect gains
  //   +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-010 - [Blocker] [On Play] Look at 5; add Character power 1000 or less, or Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-play search is templated.
  {
    cardNumber: 'EB03-010',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ category: 'character', maxPower: 1000 }, { category: 'event' }] } }] },
  },

  // EB03-011 — (Event) [Counter] If Leader [Nefeltari Vivi], up to 1 Leader/Character +4000 battle. [Trigger] give up to 1 opp Character −2000 this turn.
  {
    cardNumber: 'EB03-011',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB03-012 (character) Otama —
  //   [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's DON!! cards or {Animal}
  //   or {SMILE} type Characters with a cost of 3 or less.
  // NOTE: not yet implemented (needs template).

  // EB03-013 (character) Carrot —
  //   [Activate: Main] [Once Per Turn] If this Character was played on this turn, K.O. up to 1 of your
  //   opponent's rested Characters with a cost of 5 or less. Then, play up to 1 [Zou] from your hand.
  // NOTE: not yet implemented (needs template).

  // EB03-014 (character) Kuina —
  //   [Activate: Main] You may rest this Character: Give up to 2 rested DON!! cards to your <Slash>
  //   attribute Leader.
  // NOTE: not yet implemented (needs template).

  // EB03-015 (character) Camie —
  //   [Activate: Main] You may rest this Character: Give up to 1 rested DON!! card to 1 of your {Fish-Man}
  //   or {Merfolk} type Leader or Character cards. Then, rest up to 1 of your opponent's Characters with a
  //   cost of 2 or less.
  // NOTE: not yet implemented (needs template).

  // EB03-016 (character) Kouzuki Hiyori —
  //   [On Play] If your Leader is [Kouzuki Oden], draw 1 card.[Activate: Main] You may trash this
  //   Character: Give up to 1 rested DON!! card to your {Land of Wano} type Leader.
  // NOTE: not yet implemented (needs template).

  // EB03-017 (character) Jewelry Bonney —
  //   [On Play] If your Leader has the {Supernovas} type, set up to 1 of your DON!! cards as active. Then,
  //   up to 1 of your opponent's Characters with a cost of 8 or less cannot be rested until the end of your
  //   opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // EB03-018 (character) Tashigi —
  //   [Opponent's Turn] This Character cannot be K.O.'d by your opponent's effects and gains [Blocker].[End
  //   of Your Turn] You may rest 1 of your DON!! cards and trash 1 card from your hand: Set this Character
  //   as active.
  // NOTE: not yet implemented (needs template).

  // EB03-020 (event) There You Are, Sore Loser! —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   you have 2 or more {FILM} type Characters, that card gains an additional +2000 power during this
  //   battle. [Trigger] Set up to 1 of your Characters as active.
  // NOTE: not yet implemented (needs template).

  // EB03-021 — [On Play] trash 1 from hand: place up to 1 opp Character (4000 base power or less) and up to 1 Character (base cost 3 or less) at bottom of deck.
  { cardNumber: 'EB03-021', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent', filter: { maxBasePower: 4000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { maxBaseCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
  ] } },

  // EB03-022 — [Blocker] [On Play] Place up to 1 Character cost<=4 at bottom of deck.
  { cardNumber: 'EB03-022', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // EB03-024 (character) Nefeltari Vivi —
  //   [Blocker][On Play] Play up to 1 {Alabasta} or {Straw Hat Crew} type Character card with a cost of 5
  //   or less from your hand. Then, you cannot play any Character cards on your field during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-025 — [On Play] trash 1 from hand: return up to 1 Character with 6000 base power to hand.
  { cardNumber: 'EB03-025', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 6000 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // EB03-026 (character) Boa Hancock —
  //   [On Play] If your opponent has 5 or more cards in their hand, your opponent places 1 card from their
  //   hand at the bottom of their deck.[Activate: Main] [Once Per Turn] You may place 1 of your Characters
  //   at the bottom of the owner's deck: Give your Leader and 1 Character up to 1 rested DON!! card each.
  // NOTE: not yet implemented (needs template).

  // EB03-027 — [On Play] Return up to 1 Character with 7000 base power to hand.
  { cardNumber: 'EB03-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 7000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // EB03-028 — [On Play] Trash 1 from hand. [Activate: Main] trash this: if 4 or less cards in hand, draw 2.
  {
    cardNumber: 'EB03-028',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfHand', atMost: 4 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // EB03-029 (event) Insolent Fool!! Stand Down!! —
  //   [Main] You may rest 4 of your DON!! cards: If your Leader is [Boa Hancock], play up to 1 {Amazon
  //   Lily} or {Kuja Pirates} type Character card with a cost of 6 or less from your hand.[Counter] Up to 1
  //   of your [Boa Hancock] cards gains +3000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB03-031 (character) Vinsmoke Reiju —
  //   [Your Turn] [On Play] DON!! −1: If your Leader is [Sanji], activate the [Main] effect of up to 1
  //   Event card with a cost of 7 or less in your trash.
  // NOTE: not yet implemented (needs template).

  // EB03-032 — [Your Turn] [On Play] up to 1 [Charlotte Katakuri] +2000 this turn.
  { cardNumber: 'EB03-032', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Charlotte Katakuri' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // EB03-033 (character) Charlotte Brulee —
  //   [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck by
  //   your effect, if your Leader has the {Big Mom Pirates} type, add up to 1 DON!! card from your DON!!
  //   deck and rest it.
  // NOTE: not yet implemented (needs template).

  // EB03-034 (character) Charlotte Linlin —
  //   [On Play] Draw 1 card and place 1 card from your hand at the top of your deck. Then, add up to 1
  //   DON!! card from your DON!! deck and set it as active.[On K.O.] DON!! −1: Add up to 1 card from the
  //   top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // EB03-035 (character) Charlotte Pudding —
  //   [Blocker][On Play] If the number of DON!! cards on your field is equal to or less than the number on
  //   your opponent's field, add up to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // EB03-036 — [On Play] DON!! −1: K.O. up to 2 opp Characters with base cost 3 or less.
  { cardNumber: 'EB03-036', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 3 } }, optional: true, maxTargets: 2 }] } },

  // EB03-037 (character) Lim —
  //   [On Play] If you have 7 or more DON!! cards on your field, all of your {ODYSSEY} type Leader and
  //   Character cards gain +1000 power until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // EB03-038 (event) Thanks for the Treat. ♡ —
  //   [Main] You may rest 1 of your DON!! cards: If the number of DON!! cards on your field is equal to or
  //   less than the number on your opponent's field and you only have Characters with a type including
  //   "GERMA", add up to 2 DON!! cards from your DON!! deck and rest them.[Counter] Your Leader gains +3000
  //   power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB03-039 (character) Ulti —
  //   [On Play] If your Leader has the {Animal Kingdom Pirates} type, draw 1 card and trash 1 card from
  //   your hand. Then, play up to 1 Character card with 6000 power or less and no base effect from your
  //   trash.
  // NOTE: not yet implemented (needs template).

  // EB03-041 (character) Kujyaku —
  //   [Opponent's Turn] All of your {SWORD} type Characters with a cost of 6 or less gain +2000 power.[On
  //   Play] You may trash 1 {Navy} type card from your hand: Draw 2 cards.
  // NOTE: not yet implemented (needs template).

  // EB03-042 (character) Koala —
  //   If your Leader has the {Revolutionary Army} type, this Character gains +4 cost.[Opponent's Turn] [On
  //   K.O.] Play up to 1 {Revolutionary Army} type Character card with a cost of 6 or less other than
  //   [Koala] or up to 1 [Nico Robin] with a cost of 6 or less from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // EB03-043 (character) Stussy —
  //   [Blocker][On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of
  //   your deck in any order: K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // EB03-044 (character) Black Maria —
  //   If your Leader is multicolored, this Character gains [Blocker].[On Play] Look at 5 cards from the top
  //   of your deck; reveal up to 1 [Onigashima Island] and add it to your hand. Then, place the rest at the
  //   bottom of your deck in any order and play up to 1 [Onigashima Island] from your hand.
  // NOTE: not yet implemented (needs template).

  // EB03-045 (character) Perona —
  //   [Blocker][On Play] Give up to 1 rested DON!! card to your Leader or 1 of your Characters. Then, if
  //   you have 10 or more cards in your trash, play up to 1 {Thriller Bark Pirates} type Character card
  //   with a cost of 2 or less from your trash rested.
  // NOTE: not yet implemented (needs template).

  // EB03-046 (character) Miss Doublefinger(Zala) —
  //   [On Play] If there is a Character with a cost of 0 or with a cost of 8 or more, draw 1 card.[On K.O.]
  //   Trash 2 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // EB03-047 - [On Play] Trash top 3 cards of deck. [On K.O.] Draw 1.
  {
    cardNumber: 'EB03-047',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // EB03-048 (character) Rebecca —
  //   [Blocker][On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Dressrosa} type Stage
  //   card and add it to your hand. Then, place the rest at the bottom of your deck in any order and play
  //   up to 1 {Dressrosa} type Stage card with a cost of 1 from your hand.
  // NOTE: not yet implemented (needs template).

  // EB03-049 (event) I Knew You People Were Behind This. —
  //   [Main] You may rest 7 of your DON!! cards: If your Leader is [Perona], play up to 1 {Thriller Bark
  //   Pirates} type Character card with a cost of 6 or less and up to 1 {Thriller Bark Pirates} type
  //   Character card with a cost of 4 or less from your hand or trash.[Counter] Your Leader gains +3000
  //   power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB03-050 — [On Play] up to 1 {Sky Island} Character gains [Double Attack] this turn.
  { cardNumber: 'EB03-050', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Sky Island' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }] } },

  // EB03-051 (character) Charlotte Smoothie —
  //   [On Play] If you have a face-up Life card, K.O. up to 1 of your opponent's Characters with a cost of
  //   2 or less. Then, turn all of your Life cards face-down.
  // NOTE: not yet implemented (needs template).

  // EB03-052 (character) Shirahoshi —
  //   [Activate: Main] You may trash this Character: If your Leader is [Shirahoshi], add 1 card from the
  //   top of your deck to the top of your Life cards. Then, all of your {Neptunian} type Characters gain
  //   +1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-053 (character) Nami —
  //   [On Play] Give up to 1 rested DON!! card to your Leader. Then, if your opponent has 3 or more Life
  //   cards, add up to 1 card from the top of your opponent's Life cards to the owner's hand.[On K.O.] You
  //   may turn 1 card from the top of your Life cards face-up: Play up to 1 Character card with 6000 power
  //   or less from your hand.
  // NOTE: not yet implemented (needs template).

  // EB03-054 (character) Nico Robin —
  //   [On Play] You may trash 1 card from the top of your Life cards: Add up to 1 card from the top of your
  //   deck to the top of your Life cards. [Trigger] You may trash 1 card from your hand: Play this card.
  // NOTE: not yet implemented (needs template).

  // EB03-055 (character) Nico Robin —
  //   [On Play] You may trash 1 card from the top of your Life cards: If your Leader has the {Straw Hat
  //   Crew} type, add up to 2 cards from the top of your deck to the top of your Life cards.[Opponent's
  //   Turn] [On K.O.] You may deal 1 damage to your opponent.
  // NOTE: not yet implemented (needs template).

  // EB03-056 (character) Belo Betty —
  //   [On Play] You may turn 1 card from the top of your Life cards face-up: K.O. up to 1 of your
  //   opponent's Characters with a base cost of 3 or less.
  // NOTE: not yet implemented (needs template).

  // EB03-057 — [On Play] give up to 3 rested DON!! to your Leader. [On K.O.] trash up to 1 top of opponent's Life.
  {
    cardNumber: 'EB03-057',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] } },
    ],
  },

  // EB03-058 — [Your Turn] [On Play] If 2 or less Life, draw 1. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'EB03-058',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // EB03-059 (character) S-Snake —
  //   [On Play] If your Leader has the {Egghead} type and you have 2 or more Life cards, add up to 1
  //   Character card with a [Trigger] from your hand to the top of your Life cards face-up. [Trigger] Up to
  //   1 of your opponent's Characters with a cost of 6 or less other than [Monkey.D.Luffy] cannot attack
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // EB03-060 — (Event) [Main] If Leader [Nami], look 4, reveal up to 1 cost 2-8, add to hand, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB03-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2, maxCost: 8 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2, maxCost: 8 }, remainder: 'bottom' }] } },
    ],
  },

  // EB03-061 (character) Uta —
  //   [Activate: Main] [Once Per Turn] Set up to 1 of your DON!! cards as active. Then, rest up to 1 of
  //   your opponent's DON!! cards or Characters with a cost of 4 or less.[End of Your Turn] You may rest 1
  //   of your DON!! cards: Set up to 1 of your {FILM} type Characters as active.
  // NOTE: not yet implemented (needs template).

  // EB03-062 — [Rush] [Activate: Main] trash 1 from hand + trash this: add 1 top of deck to top of Life; then play up to 1 [Trafalgar Law] cost<=7 from hand.
  { cardNumber: 'EB03-062', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' } },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Trafalgar Law', maxCost: 7 } },
  ] } },

  // EB04-001 (leader) Jewelry Bonney —
  //   [Opponent's Turn] If you have 1 or less Life cards, this Leader gains +2000 power.[Activate: Main]
  //   [Once Per Turn] Give up to 1 of your opponent's Characters −1000 power during this turn. Then, if you
  //   have 2 or more Life cards, you may add 1 card from the top of your Life cards to your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-002 - [On Play] Look at 4; add Egghead or Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB04-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Egghead' }, { typeIncludes: 'Straw Hat Crew' }], excludeSelfName: true } }] },
  },

  // EB04-003 (character) Smoker & Tashigi —
  //   [Rush] (This card can attack on the turn in which it is played.)[Opponent's Turn] Your {Navy} type
  //   Leader's base power becomes 7000.
  // NOTE: not yet implemented (needs template).

  // EB04-004 (character) Zeff —
  //   [When Attacking] Your Leader's base power becomes 7000 until the end of your opponent's next End
  //   Phase.
  // NOTE: not yet implemented (needs template).

  // EB04-005 (character) Trafalgar Law —
  //   This Character cannot attack unless your opponent has 2 or more Characters with a base power of 5000
  //   or more.
  // NOTE: not yet implemented (needs template).

  // EB04-006 - [On Play] Look at 7; add up to 1 [Lulucia Kingdom].
  {
    cardNumber: 'EB04-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Lulucia Kingdom' } }] },
  },

  // EB04-007 (character) Roronoa Zoro —
  //   [On Play] Your Leader gains +2000 power until the end of your opponent's next End Phase.[Activate:
  //   Main] [Once Per Turn] If your opponent has a Character with 8000 power or more, this Character gains
  //   [Rush: Character] during this turn.
  // NOTE: not yet implemented (needs template).

  // EB04-008 — (Event) [Main] If 2 or less Life, give up to 1 opp Character −3000 this turn. [Counter] Your Leader +3000 battle.
  {
    cardNumber: 'EB04-008',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // EB04-009 (event) It's My Student's Farewell. I Want It to Be Proper. —
  //   [Main] You may give 1 active DON!! card to 1 of your [Silvers Rayleigh]: Give up to 1 of your
  //   opponent's Characters −2000 power during this turn.[Counter] Up to 1 of your Characters or [Silvers
  //   Rayleigh] gains +2000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB04-010 (stage) Lulucia Kingdom —
  //   [Opponent's Turn] All of your Characters with a base cost of 1 gain +5000 power.[On Play] Set the
  //   power of up to 1 of your opponent's Characters to 0 during this turn.
  // NOTE: not yet implemented (needs template).

  // EB04-011 (character) Scaled Neptunian —
  //   [Rush: Character] (This card can attack Characters on the turn in which it is played.)[On Play] Draw
  //   a card for each of your {Neptunian} type Characters. Then, trash the same number of cards from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // EB04-012 (character) Kikunojo —
  //   [Activate: Main] [Once Per Turn] If this Character was played on this turn, set your {Land of Wano}
  //   type Leader as active.
  // NOTE: not yet implemented (needs template).

  // EB04-013 (character) Carrot —
  //   [On Play] If your Leader has the {Minks} type, set up to 2 of your {Minks} type Characters and your
  //   Leader as active.
  // NOTE: not yet implemented (needs template).

  // EB04-014 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to your Leader.
  { cardNumber: 'EB04-014', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },

  // EB04-015 (character) Jinbe —
  //   [Blocker][On K.O.] You may rest 1 of your cards: If your Leader has the {Fish-Man} or {Merfolk} type,
  //   play up to 1 green Character card with a cost of 6 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-016 (character) Bird Neptunian —
  //   [Activate: Main] Set up to 1 of your DON!! cards as active. Then, you cannot set DON!! cards as
  //   active using Character effects during this turn.[When Attacking] If you have 3 or more {Neptunian}
  //   type Characters, rest up to 1 of your opponent's Characters with a cost of 8 or less.
  // NOTE: not yet implemented (needs template).

  // EB04-017 (character) Mystoms —
  //   [Your Turn] If you have 3 or more {Minks} type Characters, give all of your opponent's Characters −1
  //   cost.[On Play] If your Leader has the {Minks} type, play up to 1 {Minks} type Character card with a
  //   cost of 5 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-018 — [On Play] rest this: K.O. up to 1 opp rested Character with 8000 power or less.
  { cardNumber: 'EB04-018', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxPower: 8000 } }, optional: true }] } },

  // EB04-019 (event) Eleclaw —
  //   [Main] You may rest 1 of your cards: If your Leader has the {Minks} type, give up to 1 of your
  //   opponent's Characters −3 cost during this turn.[Counter] Up to 1 of your {Minks} type Leader or
  //   Character cards gains +3000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB04-020 — (Event) [Counter] up to 1 {Fish-Man} Leader/Character +3000 battle; then set up to 1 {Fish-Man} Character active. [Trigger] rest opp Character cost<=4.
  {
    cardNumber: 'EB04-020',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Fish-Man' } }, amount: 3000, duration: 'duringThisBattle', optional: true },
        { fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Fish-Man' }, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // EB04-021 — [On Play] If Leader [Nefeltari Vivi], draw 2 and trash 1. [Activate: Main] [Once Per Turn] trash 1 from hand: give up to 1 rested DON!! to your Leader or 1 Character.
  {
    cardNumber: 'EB04-021',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // EB04-022 (character) Issho —
  //   [On Play] You may trash 2 cards from your hand: If your opponent has 6 or more cards in their hand,
  //   your opponent places 2 cards from their hand at the bottom of their deck in any order.[DON!! x1]
  //   [When Attacking] You may trash 1 card from your hand: Give up to 1 of your opponent's Characters
  //   −2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // EB04-023 (character) Chaka & Pell —
  //   [Double Attack] (This card deals 2 damage.)[On Play] You may give your active Leader −5000 power
  //   during this turn: Draw 2 cards.
  // NOTE: not yet implemented (needs template).

  // EB04-024 — [Activate: Main] rest this + trash 1 from hand: up to 1 {Alabasta} Character gains [Unblockable] this turn.
  { cardNumber: 'EB04-024', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Alabasta' } }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true },
  ] } },

  // EB04-025 (character) Nefeltari Vivi —
  //   [On Play] Play up to 1 {Alabasta} type Character card with a cost of 8 or less other than [Nefeltari
  //   Vivi] from your hand. Then, your opponent places 1 card from their hand at the bottom of their deck.
  // NOTE: not yet implemented (needs template).

  // EB04-026 — [On Play] Place up to 1 opp Character cost<=1 at bottom of deck. [When Attacking] Draw 1 and trash 1 from hand.
  {
    cardNumber: 'EB04-026',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // EB04-027 — [On Play] draw 2 and trash 1. [Trigger] play up to 1 Character with 5000 power or less and a [Trigger] from hand.
  {
    cardNumber: 'EB04-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxPower: 5000, hasTrigger: true } }] } },
    ],
  },

  // EB04-028 (event) Ice Time —
  //   [Main] You may trash 1 card from your hand: If your Leader has the {Navy} type, up to 2 of your
  //   opponent's Characters with 10000 power or less cannot attack until the end of your opponent's next
  //   End Phase. [Trigger] Return up to 1 Character with a cost of 5 or less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // EB04-029 — (Event) [Main] If Leader [Sanji], look 3, reveal up to 1 [Sanji] or Event, add to hand, trash rest. [Counter] trash 1 from hand: up to 1 [Sanji] +4000 battle.
  {
    cardNumber: 'EB04-029',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Sanji' } }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // EB04-030 (character) Kaido —
  //   If this Character would be K.O.'d, you may return 1 DON!! card from your field to your DON!! deck
  //   instead.[On Play] DON!! −2: If your Leader has the {Animal Kingdom Pirates} type, this Character
  //   gains [Rush] during this turn. Then, rest up to 1 of your opponent's Characters with a cost of 7 or
  //   less.
  // NOTE: not yet implemented (needs template).

  // EB04-031 (character) King —
  //   If this Character would be K.O.'d, you may return 1 DON!! card from your field to your DON!! deck
  //   instead.[Activate: Main] [Once Per Turn] If your Leader has the {Animal Kingdom Pirates} type and you
  //   have no other [King] Characters, add up to 1 DON!! card from your DON!! deck and set it as active,
  //   and add up to 1 additional DON!! card and rest it.
  // NOTE: not yet implemented (needs template).

  // EB04-032 (character) Queen —
  //   [On Play] You may trash 1 {Animal Kingdom Pirates} type card from your hand: Draw 2 cards.[Activate:
  //   Main] [Once Per Turn] You may rest 2 of your DON!! cards: If your Leader has the {Animal Kingdom
  //   Pirates} type, add up to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // EB04-033 (character) Groggy Monsters —
  //   [On Play] DON!! −1: If you have 3 or more {Foxy Pirates} type Characters, K.O. up to 1 of your
  //   opponent's Characters with 6000 base power or less.
  // NOTE: not yet implemented (needs template).

  // EB04-034 (character) Charlotte Pudding —
  //   [Blocker][On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: If you have
  //   4 or more Events in your trash, up to 1 of your Leader or Character cards gains +2000 power during
  //   this battle.
  // NOTE: not yet implemented (needs template).

  // EB04-035 (character) Hitokiri Kamazo —
  //   [Blocker][Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck,
  //   if your Leader has the {Kid Pirates} type, add up to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // EB04-036 (character) Foxy —
  //   [On Play] DON!! −1: If your Leader has the {Foxy Pirates} type, draw 2 cards and trash 1 card from
  //   your hand. Then, rest up to 1 of your opponent's Characters with a cost of 9 or less.[Activate: Main]
  //   [Once Per Turn] Add up to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // EB04-037 - [On Play] If Leader has Foxy Pirates, look at 5; add Foxy Pirates.
  {
    cardNumber: 'EB04-037',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Foxy Pirates' } }] },
  },

  // EB04-038 (character) Rosinante & Law —
  //   Under the rules of this game, also treat this card's name as [Trafalgar Law] and [Donquixote
  //   Rosinante].[Blocker][On Play] If the number of DON!! cards on your field is equal to or less than the
  //   number on your opponent's field, draw 1 card. Then, add up to 1 DON!! card from your DON!! deck and
  //   set it as active.
  // NOTE: not yet implemented (needs template).

  // EB04-039 — [On Play] add 1 DON!! from deck active. [Activate: Main] trash this: play up to 1 {Kid Pirates} Character cost<=5 from hand.
  {
    cardNumber: 'EB04-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Kid Pirates', maxCost: 5 } }] } },
    ],
  },

  // EB04-040 (event) Flame Dragon Torch —
  //   [Main] You may rest 6 of your DON!! cards: Up to 1 of your [Kaido] cards gains +3000 power during
  //   this turn. Then, rest up to 1 of your opponent's Characters.[Counter] DON!! −1: Your Leader gains
  //   +4000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB04-041 (event) Stealth Black —
  //   [Main] If your Leader is [Sanji] and you have 4 or more DON!! cards on your field, play up to 1
  //   [Sanji] with 6000 power or less from your hand or trash. [Trigger] Draw 2 cards and trash 1 card from
  //   your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-042 — [On Play] trash 3 from top of deck: give up to 1 opp Character −1 cost this turn.
  { cardNumber: 'EB04-042', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'trashTopDeck', count: 3 },
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true },
  ] } },

  // EB04-043 (character) Kaku —
  //   [Once Per Turn] If your black Character with a base cost of 5 or less would be K.O.'d by your
  //   opponent's effect, you may place 3 cards from your trash at the bottom of your deck in any order
  //   instead.[On Play] Trash 2 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // EB04-044 (character) Koby —
  //   [Once Per Turn] If your Leader's type includes "Navy" and this Character would be removed from the
  //   field, you may trash 1 card from your hand instead.[Your Turn] [Once Per Turn] When your opponent's
  //   Character is K.O.'d, draw 1 card.
  // NOTE: not yet implemented (needs template).

  // EB04-045 (character) Ginny —
  //   [Activate: Main] You may rest this Character: If there are 2 or more Characters with a cost of 8 or
  //   more, up to 1 of your {Revolutionary Army} type Leader or Character cards gains +1000 power during
  //   this turn.
  // NOTE: not yet implemented (needs template).

  // EB04-046 (character) Doll —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[Opponent's Turn] All of your {Navy} type Characters gain +2 cost.
  // NOTE: not yet implemented (needs template).

  // EB04-047 (character) Helmeppo —
  //   [Activate: Main] You may trash this Character: Play up to 1 {SWORD} type Character card with a cost
  //   of 3 or less other than [Helmeppo] from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // EB04-048 (character) Rob Lucci —
  //   If your Leader's type includes "CP", this Character gains +1000 power and +2 cost for every 5 cards
  //   in your trash.[On Play] You may trash 1 of your Characters: Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // EB04-049 — (Event) [Main] trash 2 from top of deck: K.O. up to 1 opp Character base cost 5 or less. [Trigger] Activate [Main].
  {
    cardNumber: 'EB04-049',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
    ],
  },

  // EB04-050 (event) I'll Whip You Into Shape. ♡ —
  //   [Main] Up to 1 of your {SWORD} type Leader or Character cards can also attack active Characters
  //   during this turn.[Counter] Your Leader gains +3000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // EB04-051 (character) Emet —
  //   This Character cannot attack unless there is a Character with 12000 base power or more. [Trigger]
  //   Give all of your opponent's Characters −3000 power during this turn. Then, if you have 0 Life cards,
  //   play this card.
  // NOTE: not yet implemented (needs template).

  // EB04-052 (character) Sanji —
  //   [When Attacking] This Character's base power becomes the same as your opponent's Leader during this
  //   turn.[On K.O.] If you have 2 or less Life cards, play up to 1 yellow Character card with 6000 power
  //   or less from your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-053 — [Blocker] [On Block] If 2 or less Life, draw 1.
  { cardNumber: 'EB04-053', templateId: 'ability', params: { timing: 'onBlock', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // EB04-054 (character) Bartholomew Kuma —
  //   [On Play] If you have 2 or less Life cards, add up to 1 card from the top of your deck to the top of
  //   your Life cards.[On K.O.] Add up to 1 card from the top of your opponent's Life cards to the owner's
  //   hand.
  // NOTE: not yet implemented (needs template).

  // EB04-055 (character) Bartholomew Kuma —
  //   [On K.O.] Play up to 1 {Revolutionary Army} type Character card with a cost of 4 or less from your
  //   hand. [Trigger] If your Leader has the {Revolutionary Army} type and you and your opponent have a
  //   total of 5 or less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // EB04-056 (character) Pacifista —
  //   If you have [Jewelry Bonney] and you have 0 Life cards, this Character gains [Blocker].(After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // EB04-057 (character) Vegapunk —
  //   If you have 2 or less Life cards, all of your yellow {Scientist} type Characters cannot be removed
  //   from the field by your opponent's effects.[DON!! x1] This Character gains [Blocker].
  // NOTE: not yet implemented (needs template).

  // EB04-058 (character) Borsalino —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] If you have 2 or less Life cards, add up to 1 card from the top of your deck
  //   to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // EB04-059 (event) Black Rope Dragon Twister —
  //   [Main] You may turn 1 card from the top of your Life cards face-up: If you have less Characters than
  //   your opponent, K.O. up to 1 of your opponent's Characters with a cost of 6 or less and up to 1 of
  //   your opponent's Characters with a cost of 5 or less. [Trigger] Draw 2 cards and trash 1 card from
  //   your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-060 (event) Gum-Gum Hawk Gatling —
  //   [Main] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1
  //   {Egghead} type Character card from your hand to the top of your Life cards face-up. Then, give up to
  //   1 of your opponent's Characters −1000 power during this turn. [Trigger] Draw 2 cards and trash 1 card
  //   from your hand.
  // NOTE: not yet implemented (needs template).

  // EB04-061 (character) Monkey.D.Luffy —
  //   If you have 1 or less Life cards, give this card in your hand −1 cost.[On Play] You may trash 1 card
  //   from your hand: Your Leader gains +2000 power until the end of your opponent's next End Phase. Then,
  //   this Character gains [Blocker] until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'EB03-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },
];
