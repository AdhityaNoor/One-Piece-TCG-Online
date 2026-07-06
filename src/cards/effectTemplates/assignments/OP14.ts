/**
 * Reviewed effect template assignments - Main Booster OP14.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP14_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP14-001 (leader) Trafalgar Law —
  //   [Activate: Main] [Once Per Turn] Select 2 of your {Supernovas} or {Heart Pirates} type Characters.
  //   Swap the base power of the selected Characters with each other during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-002 (character) Urouge —
  //   [When Attacking] If this Character has 5000 power or more, draw 1 card and K.O. up to 1 of your
  //   opponent's Characters with 3000 base power or less.
  // NOTE: not yet implemented (needs template).

  // OP14-003 (character) Capone"Gang"Bege —
  //   This Character cannot be K.O.'d by effects of your opponent's Characters with 5000 base power or
  //   less.
  // NOTE: not yet implemented (needs template).

  // OP14-004 (character) Cavendish —
  //   If this Character has 5000 power or more, this Character gains [Rush].(This card can attack on the
  //   turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // OP14-015 — [Rush] [When Attacking] Give up to 1 of your opponent's Characters −1000 power.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking effect is templated.
  // OP14-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP14-005', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP14-011 — [DON!! x2] [Blocker]
  { cardNumber: 'OP14-011', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },

  // OP14-006 (character) Shachi & Penguin —
  //   [When Attacking] If this Character has 5000 power or more, give up to 1 of your opponent's Characters
  //   −2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-009 (character) Trafalgar Law —
  //   [Rush][On Your Opponent's Attack] [Once Per Turn] You may trash 2 cards from your hand: Select your
  //   Leader and 1 Character. Swap the base power of the selected cards with each other during this battle.
  // NOTE: not yet implemented (needs template).

  // OP14-010 (character) Basil Hawkins —
  //   [On K.O.] Look at 5 cards from the top of your deck; play up to 1 {Supernovas} type Character card
  //   with 2000 power or less other than [Basil Hawkins]. Then, place the rest at the bottom of your deck
  //   in any order.
  // NOTE: not yet implemented (needs template).

  // OP14-011 (character) Bartolomeo —
  //   [DON!! x2] This Character gains [Blocker].(After your opponent declares an attack, you may rest this
  //   card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP14-012 (character) Bepo —
  //   [When Attacking] If this Character has 5000 power or more, give up to 2 rested DON!! cards to your
  //   Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // OP14-013 - [On Play] Search Supernovas other than self. [When Attacking] Give opponent Character -1000 power.
  {
    cardNumber: 'OP14-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // ── Triage batch (OP14 expressible). Self-power gates, "becomes rested" triggers, "rest N of your cards" cost, and choice/target-swap effects are deferred. ──
  { cardNumber: 'OP14-014', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 2000 } }] } },

  { cardNumber: 'OP14-015', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-016 — [DON!! x1][When Attacking] give up to 1 opp Character −2000. PARTIAL: removal-replacement deferred.
  { cardNumber: 'OP14-016', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-017 (event) Chambres —
  //   [Main] Select 2 of your opponent's Characters with 9000 base power or less. Swap the base power of
  //   the selected Characters with each other during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-018 — [Trigger] play up to 1 red Character ≤2000 power from hand. PARTIAL: the power-gated [Counter] buff is deferred.
  { cardNumber: 'OP14-018', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 2000 } }] } },

  {
    cardNumber: 'OP14-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Supernovas' }, { typeIncludes: 'Straw Hat Crew' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP14-022 — [End of Your Turn] If Leader {FILM} or {Straw Hat Crew}, set up to 2 DON!! active.
  { cardNumber: 'OP14-022', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'FILM' }, { kind: 'leaderType', type: 'Straw Hat Crew' }] }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP14-020 (leader) Dracule Mihawk —
  //   If your opponent's Leader has the <Slash> attribute, this Leader gains +1000 power.[Activate: Main]
  //   [Once Per Turn] You may rest 1 of your cards: If there is a Character with a cost of 5 or more, set
  //   up to 3 of your DON!! cards as active. Then, you cannot play Character cards during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-021 (character) Issho —
  //   [Your Turn] When this Character becomes rested, you may add 1 card from the top of your Life cards to
  //   your hand. If you do, up to 1 of your opponent's rested Characters or Stages will not become active
  //   in your opponent's next Refresh Phase.
  // NOTE: not yet implemented (needs template).

  // OP14-022 (character) Usopp —
  //   [End of Your Turn] If your Leader has the {FILM} or {Straw Hat Crew} type, set up to 2 of your DON!!
  //   cards as active.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP14-023', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },

  // OP14-024 — [On Play] Set up to 3 DON!! active. [On K.O.] Rest up to 1 opp Character. PARTIAL: play restriction deferred.
  {
    cardNumber: 'OP14-024',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP14-025', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Kuro' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'East Blue', maxCost: 6 } }] } },

  // OP14-026 (character) Kouzuki Oden —
  //   [Opponent's Turn] If this Character is rested, this Character gains +2000 power.
  // NOTE: not yet implemented (needs template).

  // OP14-027 (character) Shanks —
  //   [Your Turn] When this Character becomes rested, rest up to 1 of your opponent's Characters with 7000
  //   base power or less.[Opponent's Turn] If this Character is rested, give all of your opponent's
  //   Characters −1000 power.
  // NOTE: not yet implemented (needs template).

  // OP14-028 (character) Johnny —
  //   [Your Turn] When this Character becomes rested, K.O. up to 1 of your opponent's rested Characters
  //   with a cost of 2 or less.
  // NOTE: not yet implemented (needs template).

  // OP14-029 (character) Tashigi —
  //   [Opponent's Turn] If this Character would be removed from the field by your opponent's effect, you
  //   may rest 1 of your cards instead.[Activate: Main] [Once Per Turn] You may rest 2 of your cards: This
  //   Character gains +2000 power until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP14-031 (character) Nami —
  //   [Blocker][On Play] Rest up to 2 of your opponent's Characters with a cost of 8 or less. Then, set up
  //   to 5 of your DON!! cards as active at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-032 (character) Humandrill —
  //   [Your Turn] When this Character becomes rested, rest up to 1 of your opponent's Characters with a
  //   cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // OP14-033 (character) Perona —
  //   [On Play] Up to 2 of your opponent's Characters with a cost of 5 or less cannot be rested until the
  //   end of your opponent's next End Phase.[On K.O.] You may rest 1 of your cards: Play up to 1 green
  //   Character card with a cost of 5 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // OP14-034 (character) Monkey.D.Luffy —
  //   [Your Turn] All of your green {Straw Hat Crew} type Characters with a base cost of 4 or more gain
  //   +1000 power.[Once Per Turn] If your {Straw Hat Crew} type Character would be K.O.'d by your
  //   opponent's effect, you may rest 1 of your Characters instead.
  // NOTE: not yet implemented (needs template).

  // OP14-035 (character) Yosaku —
  //   [Your Turn] When this Character becomes rested, up to 1 of your opponent's rested Characters with a
  //   cost of 4 or less will not become active in your opponent's next Refresh Phase.
  // NOTE: not yet implemented (needs template).

  // OP14-036 (event) Strive to Surpass me, Roronoa Zoro!!! —
  //   [Counter] You may rest 1 of your cards: Up to 1 of your Leader or Character cards gains +4000 power
  //   during this battle. [Trigger] You may rest 1 of your cards: Rest up to 1 of your opponent's
  //   Characters with 7000 base power or less.
  // NOTE: not yet implemented (needs template).

  // OP14-037/038 — [Counter] Leader +3000. PARTIAL: "rest N of your cards" [Main] payoffs deferred.
  { cardNumber: 'OP14-037', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  { cardNumber: 'OP14-038', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  {
    cardNumber: 'OP14-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Dracule Mihawk' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderName', name: 'Dracule Mihawk' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
    ],
  },

  // OP14-040 (leader) — [Activate: Main] trash 1 → give up to 2 rested DON!! to Leader/1 Char (type filter dropped).
  { cardNumber: 'OP14-040', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 2, ifPrevious: 'previousMovedAny' }] } },

  // OP14-041 (leader) Boa Hancock —
  //   [Opponent's Turn] When you play a Character, draw 1 card.[DON!! x1] [Once Per Turn] When one of your
  //   {Amazon Lily} or {Kuja Pirates} type Characters with 5000 base power or more is K.O.'d, add up to 1
  //   card from the top of your opponent's Life cards to the owner's hand.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP14-042', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2 }, remainder: 'bottom' }] } },

  {
    cardNumber: 'OP14-043',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP14-118 (event) You'll Frighten Me... ♡ —
  //   [Counter] If you have 2 or less Life cards, up to 1 of your opponent's active Characters cannot
  //   attack during this turn. [Trigger] Play up to 1 Character card with 6000 power or less and a
  //   [Trigger] from your hand.
  // NOTE: not yet implemented (needs template).

  // OP14-119 (character) Dracule Mihawk —
  //   [Your Turn] When this Character becomes rested, up to 1 of your opponent's Characters with a cost of
  //   9 or less cannot be rested until the end of your opponent's next End Phase.[On Your Opponent's
  //   Attack] [Once Per Turn] You may trash 1 card from your hand: Up to 1 of your Leader or Character
  //   cards gains +2000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP14-120 (character) Crocodile —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 9 or less cannot attack until the end
  //   of your opponent's next End Phase. Then, if your opponent has a Character with a cost of 0 or with a
  //   cost of 8 or more, draw 1 card.[On K.O.] You may trash 1 card from your hand: Play this Character
  //   card from your trash.
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'OP14-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] }] } },

  // OP14-045 — [On K.O.] Draw 1. PARTIAL: the "when a card is trashed from hand → [Rush]" trigger is deferred.
  { cardNumber: 'OP14-045', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP14-046 — [Activate: Main] trash this: up to 1 {Fish-Man}/{Merfolk} Leader/Character +2000 this turn.
  { cardNumber: 'OP14-046', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { anyOfTypes: ['Fish-Man', 'Merfolk'] } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-046 (character) Koala —
  //   [Activate: Main] You may trash this Character: Up to 1 of your {Fish-Man} or {Merfolk} type Leader or
  //   Character cards gains +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP14-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },

  // OP14-048 (character) Shiryu —
  //   [On Play] Return up to 1 of your opponent's Characters to the owner's hand. Then, trash all cards
  //   from your hand.
  // NOTE: not yet implemented (needs template).

  // OP14-049 — [On Play] rest 2 DON!!: Draw 2, return up to 1 Character cost ≤7 to hand. PARTIAL: static [Rush] trigger deferred.
  { cardNumber: 'OP14-049', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 7 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  { cardNumber: 'OP14-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'draw', amount: 1 }] } },

  { cardNumber: 'OP14-051', templateId: 'ability', params: { timing: 'onKO', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'draw', amount: 1 }] } },

  // OP14-052 — [Blocker][On Play] trash 3 from hand: play up to 1 {Impel Down} cost ≤6 from hand.
  { cardNumber: 'OP14-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 3 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 6 } }] } },

  // OP14-053 (character) Vista —
  //   [Blocker][Opponent's Turn] If you have 7 or less cards in your hand, this Character's base power
  //   becomes the same as your Leader's base power.
  // NOTE: not yet implemented (needs template).

  // OP14-054 — [On Play] If Leader {Fish-Man}, draw 3. PARTIAL: the [End of Your Turn] trash-to-5 is deferred.
  { cardNumber: 'OP14-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'draw', amount: 3 }] } },

  // OP14-056 (character) Wadatsumi —
  //   This Character cannot attack.When a card is trashed from your hand by an effect, this Character's
  //   effect is negated during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-057 — [Trigger] Draw 2. PARTIAL: the OR-typed mass buff [Main] is deferred.
  { cardNumber: 'OP14-057', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },

  // OP14-058 — [Main] rest 3 DON!!: play {Fish-Man} ≤3 from hand, return 1 Char with 6000 base power. [Counter] draw 1 + Leader +3000.
  {
    cardNumber: 'OP14-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Fish-Man', maxCost: 3 } }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 6000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  {
    cardNumber: 'OP14-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Jinbe' }, { kind: 'selfHand', atMost: 2 }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP14-060 (leader) Donquixote Doflamingo —
  //   [On Your Opponent's Attack] [Once Per Turn] DON!! −1: Select your Leader or 1 of your {Donquixote
  //   Pirates} type Characters. Change the attack target to the selected card.
  // NOTE: not yet implemented (needs template).

  // OP14-061 — [When Attacking] DON!! −1: give up to 1 opp Character −2000. PARTIAL: removal-replacement deferred.
  { cardNumber: 'OP14-061', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-062 (character) Gladius —
  //   [On K.O.] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): K.O. or rest up to 1 of your opponent's Characters with a base power of 6000 or less.
  // NOTE: not yet implemented (needs template).

  // OP14-063 — [On Play] Add 1 DON!! (active). PARTIAL: opp-DON-gated [On K.O.] play is deferred.
  { cardNumber: 'OP14-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  { cardNumber: 'OP14-064', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 0 } }, optional: true }] } },

  // OP14-065 (character) Senor Pink —
  //   [On K.O.] Your opponent returns 1 DON!! card from their field to their DON!! deck.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP14-067', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' }, remainder: 'bottom' }] } },

  { cardNumber: 'OP14-071', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  // OP14-068 (character) Trebol —
  //   [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, if
  //   your Leader has the {Donquixote Pirates} type, add up to 1 DON!! card from your DON!! deck and rest
  //   it.
  // NOTE: not yet implemented (needs template).

  // OP14-069 (character) Donquixote Doflamingo —
  //   [On Play] DON!! −3: Choose one:• If your Leader has the {Donquixote Pirates} type, K.O. up to 1 of
  //   your opponent's Characters with a cost of 8 or less.• Up to 3 of your opponent's Characters with a
  //   cost of 7 or less cannot be rested until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP14-070 (character) Buffalo —
  //   When this Character becomes rested by your opponent's Character's effect, you may return 1 DON!! card
  //   from your field to your DON!! deck. If you do, set this Character as active.[Blocker]
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP14-072',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP14-074',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'addDonFromDeck', count: 2, rested: true }] } },
    ],
  },

  { cardNumber: 'OP14-075', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  {
    cardNumber: 'OP14-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP14-077 (event) Penta-Chromatic String —
  //   [Counter] Up to 1 of your Leader or Character cards gains +4000 power during this battle. Then, if
  //   your opponent has a Character with 6000 power or more, add up to 1 DON!! card from your DON!! deck
  //   and rest it.
  // NOTE: not yet implemented (needs template).

  // OP14-078 (event) Bullet String —
  //   [Counter] DON!! −1: If your Leader has the {Donquixote Pirates} type, up to 1 of your Leader or
  //   Character cards gains +2000 power during this battle. Then, that card gains an additional +2000 power
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-079 (leader) Crocodile —
  //   All of your opponent's Characters cannot be removed from the field by your effects.[Activate: Main]
  //   [Once Per Turn] You may K.O. 1 of your Characters with a type including "Baroque Works": Give up to 1
  //   of your opponent's Characters −10 cost during this turn. Then, you may trash 2 cards from the top of
  //   your deck.
  // NOTE: not yet implemented (needs template).

  // OP14-080 (leader) Gecko Moria —
  //   [Activate: Main] [Once Per Turn] You may K.O. 1 of your {Thriller Bark Pirates} type Characters: Your
  //   Leader and all of your Characters gain +1000 power during this turn.[When Attacking] You may trash 3
  //   cards from your hand: Add up to 1 card from the top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP14-081',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactBaseCost: 1 } }, optional: true }] } },
    ],
  },

  // OP14-083 — [Activate: Main] trash this: give up to 1 opp 0-cost Character −3000 this turn.
  { cardNumber: 'OP14-083', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP14-082 (character) Oinkchuck —
  //   [On K.O.] All of your {Thriller Bark Pirates} type Characters gain +4 cost until the end of your
  //   opponent's next End Phase. [Trigger] Play up to 1 {Thriller Bark Pirates} type Character card with a
  //   cost of 2 or less from your trash rested.
  // NOTE: not yet implemented (needs template).

  // OP14-083 (character) Ms. Wednesday —
  //   [Activate: Main] You may trash this Character: Give up to 1 of your opponent's 0 cost Characters
  //   −3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP14-084 — [On Play] If Leader "Baroque Works": play 1 {Baroque Works} cost ≤4 and 1 cost 1 from trash.
  { cardNumber: 'OP14-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Baroque Works', exactCost: 1 } }] } },

  { cardNumber: 'OP14-085', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP14-086 (character) Miss Doublefinger(Zala) —
  //   If you have 7 or more cards in your trash, this Character gains +1000 power, and all of your
  //   Characters with a type including "Baroque Works" gain +2 cost.
  // NOTE: not yet implemented (needs template).

  // OP14-087 - [On Play] If Leader type includes Baroque Works, look at 4; add Baroque Works other than self, trash rest.
  {
    cardNumber: 'OP14-087',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP14-088 — [On K.O.] If Leader "Baroque Works", draw 1. PARTIAL: the Stage K.O. is deferred.
  { cardNumber: 'OP14-088', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'draw', amount: 1 }] } },

  {
    cardNumber: 'OP14-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

  // OP14-090 — [On Play] Rest up to 1 opp Character cost 0. PARTIAL: the static "can attack Characters" clause is deferred.
  { cardNumber: 'OP14-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true }] } },

  // OP14-091 (character) Mr.2.Bon.Kurei(Bentham) —
  //   [On K.O.] Play up to 1 Character card with a type including "Baroque Works" and a cost of 5 or less
  //   other than [Mr.2.Bon.Kurei(Bentham)] from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // OP14-092 (character) Mr.3(Galdino) —
  //   [Opponent's Turn] [Once Per Turn] If this Character would be K.O.'d, you may place 3 cards from your
  //   trash at the bottom of your deck in any order instead.
  // NOTE: not yet implemented (needs template).

  // OP14-093 (character) Mr.4(Babe) —
  //   [Blocker][On K.O.] Add up to 1 Character card with a type including "Baroque Works" and a cost of 8
  //   or less from your trash to your hand.
  // NOTE: not yet implemented (needs template).

  // OP14-094 (character) Mr.5(Gem) —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] If there is a Character with a cost of 0 or with a cost of 8 or more, draw 2
  //   cards and trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP14-096 (event) Ground Death —
  //   [Main] You may rest 2 of your DON!! cards: Negate the effect of up to 1 of your opponent's Characters
  //   with a cost of 5 or less during this turn.[Counter] If you have 10 or more cards in your trash, up to
  //   1 of your Leader or Character cards gains +4000 power during this battle.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP14-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'trash' }] } },
    ],
  },

  // OP14-098 (event) Crescent Cutlass —
  //   [Main] If there is a Character with a cost of 0 or with a cost of 8 or more, all of your Characters
  //   with a type including "Baroque Works" gain +3 cost until the end of your opponent's next End
  //   Phase.[Counter] Your Leader gains +3000 power during this battle.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP14-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works' }, remainder: 'trash' }] } },
    ],
  },

  {
    cardNumber: 'OP14-100',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Thriller Bark Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

  { cardNumber: 'OP14-102', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },

  // OP14-103 (character) Gloriosa (Grandma Nyon) —
  //   [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card
  //   from your hand to the top of your Life cards. [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // OP14-104 — [Trigger] Play up to 1 Character cost ≤4 from trash. PARTIAL: the play-or-add-to-Life [On Play] choice is deferred.
  { cardNumber: 'OP14-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4 } }] } },

  { cardNumber: 'OP14-106', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP14-105 (character) Gorgon Sisters —
  //   [Activate: Main] [Once Per Turn] You may reveal 3 {Amazon Lily} or {Kuja Pirates} type cards from
  //   your hand: Give your Leader and all of your Characters up to 1 rested DON!! card each. [Trigger] If
  //   your Leader has the {Kuja Pirates} type, play this card.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP14-107',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  {
    cardNumber: 'OP14-108',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 7000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 7000 } }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP14-109', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },

  // OP14-110 — [Trigger] Play up to 1 {Thriller Bark Pirates} cost ≤4 from trash rested. PARTIAL: the [On K.O.] trigger-filtered play is deferred.
  { cardNumber: 'OP14-110', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },

  // OP14-111 (character) Perona —
  //   [On Play]/[On K.O.] Up to 1 of your opponent's Characters with a cost of 6 or less cannot attack
  //   until the end of your opponent's next End Phase. [Trigger] Play up to 1 {Thriller Bark Pirates} type
  //   Character card with a cost of 4 or less from your trash rested.
  // NOTE: not yet implemented (needs template).

  // OP14-112 — [On Play] If Leader {Warlords}, add top of deck to top of Life. PARTIAL: opp-Life-to-hand and trigger deferred.
  { cardNumber: 'OP14-112', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

  {
    cardNumber: 'OP14-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }] }, remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  {
    cardNumber: 'OP14-114',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP14-115 (character) Rindo —
  //   [Opponent's Turn] [On K.O.] Add up to 1 card from the top of your deck to the top of your Life cards.
  //   Then, you take 1 damage. [Trigger] If your Leader has the {Kuja Pirates} type, play this card.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP14-116',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], maxCost: 4 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  {
    cardNumber: 'OP14-117',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 }, rested: true }] } },
    ],
  },

];
