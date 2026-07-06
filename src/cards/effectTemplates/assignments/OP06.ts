/**
 * Reviewed effect template assignments - Main Booster OP06.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP06_ASSIGNMENTS: CardEffectAssignment[] = [
  // --- Batch: OP06 cards expressible with existing primitives (no new capability) ---
  // --- Batch 2: further OP06 cards expressible with existing primitives ---
  // --- Batch 3: remaining OP06 cleanly-expressible cards (life-to-hand buffs, conditional immunity) ---
  // OP06-001 (leader) Uta —
  //   [When Attacking] You may trash 1 {FILM} type card from your hand: Give up to 1 of your opponent's
  //   Characters −2000 power during this turn. Then, add up to 1 DON!! card from your DON!! deck and rest
  //   it.
  // NOTE: not yet implemented (needs template).

  // OP06-002 (character) Inazuma —
  //   If this Character has 7000 power or more, this Character gains [Banish].(When this card deals damage,
  //   the target card is trashed without activating its Trigger.)
  // NOTE: not yet implemented (needs template).

  // OP06-003 (character) Emporio.Ivankov —
  //   [On Play] Look at 3 cards from the top of your deck and play up to 1 {Revolutionary Army} type
  //   Character card with 5000 power or less. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP06-004 — [On Play] Play up to 1 [Lily Carnation] from your hand.
  { cardNumber: 'OP06-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Lily Carnation' } }] } },

  // OP06-006 (character) Saga —
  //   [DON!! x1] [When Attacking] This Character gains +1000 power until the start of your next turn. Then,
  //   trash 1 of your {FILM} type Characters at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-007 — [On Play] K.O. up to 1 of your opponent's Characters with 10000 power or less.
  { cardNumber: 'OP06-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 10000 } }, optional: true }] } },

  // OP06-009 (character) Shuraiya —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[When Attacking]/[On Block] [Once Per Turn] This Character becomes the same power as
  //   your opponent's Leader until the start of your next turn.
  // NOTE: not yet implemented (needs template).

  // OP06-010 (character) Douglas Bullet —
  //   If your Leader has the {FILM} type, this Character gains [Blocker].(After your opponent declares an
  //   attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP06-011 (character) Tot Musica —
  //   [Activate: Main] [Once Per Turn] You may rest 1 of your [Uta] cards: This Character gains +5000 power
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-012 (character) Bear.King —
  //   If your opponent has a Leader or Character with a base power of 6000 or more, this Character cannot
  //   be K.O.'d in battle.
  // NOTE: not yet implemented (needs template).

  // OP06-013 — [On Play] Look at 3; reveal up to 1 {FILM} card, add to hand, rest to bottom. [Trigger] Activate [On Play].
  {
    cardNumber: 'OP06-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
    ],
  },

  // OP06-014 (character) Ratchet —
  //   [On Your Opponent's Attack] You may trash any number of {FILM} type cards from your hand. Your Leader
  //   or 1 of your Characters gains +1000 power during this battle for every card trashed.
  // NOTE: not yet implemented (needs template).

  // OP06-015 (character) Lily Carnation —
  //   [Activate: Main] [Once Per Turn] You may trash 1 of your Characters with 6000 power or more: Play up
  //   to 1 {FILM} type Character card with 2000 to 5000 power from your trash rested.
  // NOTE: not yet implemented (needs template).

  // OP06-016 (character) Raise Max —
  //   [Activate: Main] You may place this Character at the bottom of the owner's deck: Give up to 1 of your
  //   opponent's Characters −3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-017 — [Main]/[Counter] add 1 top Life to hand → up to 1 Leader/Char +3000 this turn.
  {
    cardNumber: 'OP06-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP06-018 (event) Gum-Gum King Kong Gatling —
  //   [Main] Up to 1 of your Leader or Character cards gains +3000 power during this turn. Then, if your
  //   opponent has a Character with 7000 power or more, up to 1 of your Leader or Character cards gains
  //   +1000 power during this turn. [Trigger] K.O. up to 1 of your opponent's Characters with 5000 power or
  //   less.
  // NOTE: not yet implemented (needs template).

  // OP06-019 - [Main] K.O. power <=5000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'OP06-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },

  // OP06-020 (leader) Hody Jones —
  //   [Activate: Main] You may rest this Leader: Rest up to 1 of your opponent's DON!! cards or Characters
  //   with a cost of 3 or less. Then, you cannot add Life cards to your hand using your own effects during
  //   this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-021 (leader) Perona —
  //   [Activate: Main] [Once Per Turn] Choose one:• Rest up to 1 of your opponent's Characters with a cost
  //   of 4 or less.• Give up to 1 of your opponent's Characters −1 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-022 — (Leader) [Activate: Main] [Once Per Turn] If opponent has 3 or less Life, give up to 2 rested DON!! to 1 of your Characters.
  { cardNumber: 'OP06-022', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP06-023 (character) Arlong —
  //   [On Play] You may trash 1 card from your hand: Up to 1 of your opponent's rested Leader cannot attack
  //   until the end of your opponent's next turn. [Trigger] Rest up to 1 of your opponent's Characters with
  //   a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // OP06-024 — [On Play] If Leader {New Fish-Man Pirates}, play up to 1 {Fish-Man} cost<=4 from hand. Then add 1 top Life to hand.
  { cardNumber: 'OP06-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Fish-Man', maxCost: 4 } },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-025 - [On Play] Look at 4; add Fish-Man or Merfolk other than this card's name.
  {
    cardNumber: 'OP06-025',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], excludeSelfName: true } }] },
  },

  // OP06-026 (character) Koushirou —
  //   [On Play] Set up to 1 of your <Slash> attribute Characters with a cost of 4 or less as active. Then,
  //   you cannot attack a Leader during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-027 — [On K.O.] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP06-027', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP06-028 — [DON!! x1] [When Attacking] If Leader {New Fish-Man Pirates}, set up to 1 DON!! active, this +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-028', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'setActiveControllerDon', maxTargets: 1 },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-029 — [DON!! x1] [When Attacking] [Once Per Turn] If Leader {New Fish-Man Pirates}, set this active, +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-029', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'setActiveSelf' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-030 — [When Attacking] If Leader {New Fish-Man Pirates}, cannot be KO'd in battle + +2000 until start of next turn, add 1 top Life to hand.
  { cardNumber: 'OP06-030', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'koImmunitySelf', scope: 'battle', duration: 'untilStartOfNextTurn' },
    { fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-031 — [Trigger] Play up to 1 {Fish-Man} or {Merfolk} Character cost<=3 from your hand.
  { cardNumber: 'OP06-031', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },

  // OP06-033 (character) Vander Decken IX —
  //   [On Play] You may trash 1 {Fish-Man} type card from your hand or 1 [The Ark Noah] from your hand or
  //   field: K.O. up to 1 of your opponent's rested Characters.
  // NOTE: not yet implemented (needs template).

  // OP06-034 — [Activate: Main] [Once Per Turn] Rest up to 1 opp Character cost<=4, this +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-034', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-035 (character) Hody Jones —
  //   [Rush] (This card can attack on the turn in which it is played.)[On Play] Rest up to a total of 2 of
  //   your opponent's Characters or DON!! cards. Then, add 1 card from the top of your Life cards to your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // OP06-036 — [On Play]/[On K.O.] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less.
  {
    cardNumber: 'OP06-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP06-038 (event) The Billion-fold World Trichiliocosm —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   you have 8 or more rested cards, that card gains an additional +2000 power during this battle.
  //   [Trigger] K.O. up to 1 of your opponent's rested Characters with a cost of 3 or less.
  // NOTE: not yet implemented (needs template).

  // OP06-039 (event) You Ain't Even Worth Killing Time!! —
  //   [Main] Choose one:• Rest up to 1 of your opponent's Characters with a cost of 6 or less.• K.O. up to
  //   1 of your opponent's rested Characters with a cost of 6 or less. [Trigger] Activate this card's
  //   [Main] effect.
  // NOTE: not yet implemented (needs template).

  // OP06-040 — [Main] K.O. up to 2 of your opponent's rested Characters with a cost of 3 or less. [Trigger] same.
  {
    cardNumber: 'OP06-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
    ],
  },

  // OP06-041 (stage) The Ark Noah —
  //   [On Play] Rest all of your opponent's Characters. [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // OP06-042 (leader) Vinsmoke Reiju —
  //   [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, draw 1
  //   card.
  // NOTE: not yet implemented (needs template).

  // OP06-043 (character) Aramaki —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[Activate: Main] [Once Per Turn] You may trash 1 card from your hand and place 1
  //   Character with a cost of 2 or less at the bottom of the owner's deck: This Character gains +3000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-044 (character) Gion —
  //   [Your Turn] [Once Per Turn] When your opponent activates an Event, your opponent must place 1 card
  //   from their hand at the bottom of their deck.
  // NOTE: not yet implemented (needs template).

  // OP06-045 — [On Play] Draw 2 cards and place 2 cards from your hand at the bottom of your deck.
  { cardNumber: 'OP06-045', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
  ] } },

  // OP06-046 — [On Play] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP06-047 (character) Charlotte Pudding —
  //   [On Play] Your opponent returns all cards in their hand to their deck and shuffles their deck. Then,
  //   your opponent draws 5 cards.
  // NOTE: not yet implemented (needs template).

  // OP06-048 (character) Zeff —
  //   [Your Turn] When your opponent activates [Blocker] or an Event, if your Leader has the {East Blue}
  //   type, you may trash 4 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP06-050 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP06-050',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },

  // OP06-051 (character) Tsuru —
  //   [On Play] You may trash 2 cards from your hand: Your opponent returns 1 of their Characters to the
  //   owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP06-052 — [DON!! x1] If ≤4 cards in hand, this Character cannot be K.O.'d in battle.
  { cardNumber: 'OP06-052', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfHand', atMost: 4 }] } }] } },

  // OP06-053 — [On K.O.] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-053', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP06-054 (character) Borsalino —
  //   If you have 5 or less cards in your hand, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP06-055 (character) Monkey.D.Garp —
  //   [DON!! x2] [When Attacking] If you have 4 or less cards in your hand, your opponent cannot activate
  //   [Blocker] during this battle.
  // NOTE: not yet implemented (needs template).

  // OP06-056 — [Main] Place up to 1 opp Character cost<=2 and up to 1 opp Character cost<=1 at bottom of deck. [Trigger] same.
  {
    cardNumber: 'OP06-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
    ],
  },

  // OP06-057 (event) But I Will Never Doubt a Woman's Tears!!!! —
  //   [Main] Up to 1 of your Leader or Character cards gains +1000 power during this turn. Then, reveal 1
  //   card from the top of your deck, play up to 1 Character card with a cost of 2, and place the rest at
  //   the top or bottom of your deck. [Trigger] Play up to 1 Character card with a cost of 2 from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // OP06-058 — [Main] Place up to 2 Characters cost<=6 at bottom of deck. [Trigger] Place up to 1 Character cost<=5.
  {
    cardNumber: 'OP06-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP06-059 — [Counter] up to 1 Leader/Char +1000 this turn, and draw 1. [Trigger] Look at 5, place top or bottom in any order.
  {
    cardNumber: 'OP06-059',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }, { fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },
    ],
  },

  // OP06-060 (character) Vinsmoke Ichiji —
  //   [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your
  //   DON!! deck.) You may trash this Character: If your Leader has the {GERMA 66} type, play up to 1
  //   [Vinsmoke Ichiji] with a cost of 7 from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // OP06-061 — [On Play] If your DON!! ≤ opponent's, give opp Character −2000 and this Character gains [Rush].
  { cardNumber: 'OP06-061', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
  ] } },

  // OP06-062 (character) Vinsmoke Judge —
  //   [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.) You may trash 2 cards from your hand: Play up to 4 {GERMA 66} type Character cards with
  //   different card names and 4000 power or less from your trash.[Activate: Main] [Once Per Turn] DON!!
  //   −1: Rest up to 1 of your opponent's DON!! cards.
  // NOTE: not yet implemented (needs template).

  // OP06-063 — [On Play] You may trash 1 from hand: if DON!! <= opponent's, add up to 1 {The Vinsmoke Family} Character (<=4000 power) from trash to hand.
  { cardNumber: 'OP06-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'The Vinsmoke Family', maxPower: 4000 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP06-064 (character) Vinsmoke Niji —
  //   [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your
  //   DON!! deck.) You may trash this Character: If your Leader has the {GERMA 66} type, play up to 1
  //   [Vinsmoke Niji] with a cost of 5 from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // OP06-065 (character) Vinsmoke Niji —
  //   [On Play] If the number of DON!! cards on your field is equal to or less than the number on your
  //   opponent's field, choose one:• K.O. up to 1 of your opponent's Characters with a cost of 2 or less.•
  //   Return up to 1 of your opponent's Characters with a cost of 4 or less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP06-066 (character) Vinsmoke Yonji —
  //   [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your
  //   DON!! deck.) You may trash this Character: If your Leader has the {GERMA 66} type, play up to 1
  //   [Vinsmoke Yonji] with a cost of 4 from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // OP06-067 — static: if your DON!! ≤ opponent's, this Character +1000 (Blocker is card data).
  { cardNumber: 'OP06-067', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonAtMostOpponent' }] } }] } },

  // OP06-068 (character) Vinsmoke Reiju —
  //   [Activate: Main] DON!! −1 (You may return the specified number of DON!! cards from your field to your
  //   DON!! deck.) You may trash this Character: If your Leader has the {GERMA 66} type, play up to 1
  //   [Vinsmoke Reiju] with a cost of 4 from your hand or trash.
  // NOTE: not yet implemented (needs template).

  // OP06-069 — [On Play] If your DON!! ≤ opponent's and you have 5 or less cards in hand, draw 2.
  { cardNumber: 'OP06-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP06-071 — [On Play] DON!! −1: if Leader {FILM}, add up to 2 {FILM} Character cards cost<=4 from trash to hand.
  { cardNumber: 'OP06-071', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'FILM' }], functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'FILM', maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 2 },
  ] } },

  // OP06-072 (character) Cosette —
  //   If your Leader has the {GERMA 66} type and the number of DON!! cards on your field is at least 2 less
  //   than the number on your opponent's field, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP06-073 — [Blocker] [On Play] If you have 8+ DON!! on field, draw 1 and trash 1 from hand.
  { cardNumber: 'OP06-073', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // OP06-074 (character) Zephyr (Navy) —
  //   [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): Negate the effect of up to 1 of your opponent's Characters during this turn. Then, if that
  //   Character has 5000 power or less, K.O. it.
  // NOTE: not yet implemented (needs template).

  // OP06-075 — [On Play] DON!! −1: Rest up to 2 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'OP06-075', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },

  // OP06-076 (character) Hitokiri Kamazo —
  //   [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, K.O. up
  //   to 1 of your opponent's Characters with a cost of 2 or less.
  // NOTE: not yet implemented (needs template).

  // OP06-077 — [Main] If your DON!! ≤ opponent's, place opp Character cost<=5 at bottom of deck. [Trigger] opp Character cost<=4.
  {
    cardNumber: 'OP06-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP06-078 — [Main] Look at 5; reveal up to 1 GERMA-type (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP06-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP06-079 — (Stage) [Activate: Main] trash 1 from hand + rest this Stage: look 3, reveal up to 1 "GERMA" type, add to hand, rest to bottom.
  { cardNumber: 'OP06-079', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'bottom' },
  ] } },

  // OP06-080 — (Leader) [DON!! x1] [When Attacking] rest 2 DON!! + trash 1 from hand: trash 2 top of deck, play up to 1 {Thriller Bark Pirates} cost<=4 from trash.
  { cardNumber: 'OP06-080', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, cost: [{ kind: 'restDon', count: 2 }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'trashTopDeck', count: 2 },
    { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } },
  ] } },

  // OP06-081 (character) Absalom —
  //   [On Play] You may return 2 cards from your trash to the bottom of your deck in any order: K.O. up to
  //   1 Character with a cost of 2 or less.
  // NOTE: not yet implemented (needs template).

  // OP06-082 — [On Play]/[On K.O.] If Leader {Thriller Bark Pirates}, draw 2 and trash 2 from hand.
  {
    cardNumber: 'OP06-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
    ],
  },

  // OP06-083 (character) Oars —
  //   This Character cannot attack.[Activate: Main] You may K.O. 1 of your {Thriller Bark Pirates} type
  //   Characters: This Character's effect is negated during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-084 — [On K.O.] Up to 1 of your Leader or Character cards gains +1000 power during this turn.
  { cardNumber: 'OP06-084', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },

  // OP06-085 (character) Kumacy —
  //   [DON!! x2] [Your Turn] This Character gains +1000 power for every 5 cards in your trash.
  // NOTE: not yet implemented (needs template).

  // OP06-086 (character) Gecko Moria —
  //   [On Play] Choose up to 1 Character card with a cost of 4 or less and up to 1 Character card with a
  //   cost of 2 or less from your trash. Play 1 card and play the other card rested.
  // NOTE: not yet implemented (needs template).

  // OP06-088 (character) Sai —
  //   If your Leader has the {Dressrosa} type and is active, this Character gains +2000 power.
  // NOTE: not yet implemented (needs template).

  // OP06-089 — [On Play]/[On K.O.] Trash 3 cards from the top of your deck.
  {
    cardNumber: 'OP06-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
    ],
  },

  // OP06-090 (character) Dr. Hogback —
  //   [On Play] You may return 2 cards from your trash to the bottom of your deck in any order: Add up to 1
  //   {Thriller Bark Pirates} type card other than [Dr. Hogback] from your trash to your hand.
  // NOTE: not yet implemented (needs template).

  // OP06-091 — [On Play] If Leader {Thriller Bark Pirates}, trash 5 cards from the top of your deck.
  { cardNumber: 'OP06-091', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },

  // OP06-092 (character) Brook —
  //   [On Play] Choose one:• Trash up to 1 of your opponent's Characters with a cost of 4 or less.• Your
  //   opponent places 3 cards from their trash at the bottom of their deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP06-093 (character) Perona —
  //   [On Play] If your opponent has 5 or more cards in their hand, choose one:• Your opponent trashes 1
  //   card from their hand.• Give up to 1 of your opponent's Characters −3 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // OP06-095 (event) Shadows Asgard —
  //   [Main]/[Counter] Your Leader gains +1000 power during this turn. Then, you may K.O. any number of
  //   your {Thriller Bark Pirates} type Characters with a cost of 2 or less. Your Leader gains an
  //   additional +1000 power during this turn for every Character K.O.'d. [Trigger] Draw 2 cards and trash
  //   1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP06-096 (event) ...Nothing...at All!!! —
  //   [Counter] You may add 1 card from the top of your Life cards to your hand: Your Characters with a
  //   cost of 7 or less cannot be K.O.'d in battle during this turn. [Trigger] Activate this card's
  //   [Counter] effect.
  // NOTE: not yet implemented (needs template).

  // OP06-097 — [Main] Trash 1 card from your opponent's hand. [Trigger] same.
  {
    cardNumber: 'OP06-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },

  // OP06-098 — [Activate: Main] Rest 1 DON!! + rest this Stage: if Leader {Thriller Bark Pirates}, play {Thriller Bark} cost<=2 from trash rested.
  { cardNumber: 'OP06-098', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] } },

  // OP06-099 — [On Play] Look at up to 1 card from the top of your or your opponent's Life; place it at the top or bottom.
  { cardNumber: 'OP06-099', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // OP06-100 (character) Inuarashi —
  //   [DON!! x2] [When Attacking] You may trash 1 card from your hand: K.O. up to 1 of your opponent's
  //   Characters with a cost equal to or less than the number of your opponent's Life cards. [Trigger] If
  //   your opponent has 3 or less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP06-101 — [On Play] Up to 1 of your Leader or Character gains [Banish] this turn. [Trigger] K.O. up to 1 opp Character cost<=5.
  {
    cardNumber: 'OP06-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller' }, keyword: 'banish', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // OP06-102 (character) Kamakiri —
  //   [Activate: Main] [Once Per Turn] You may place 1 Stage with a cost of 1 at the bottom of the owner's
  //   deck: K.O. up to 1 of your opponent's Characters with a cost of 2 or less. [Trigger] If you have 2 or
  //   less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP06-103 — [When Attacking] trash 2 from hand: add up to 1 of your Characters with 0 power to top or bottom of owner's Life face-up. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-103',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'controller', filter: { maxPower: 0 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-104 — [On K.O.] If opponent has 3 or less Life, add up to 1 top of deck to top of Life. [Trigger] If opponent has 3 or less Life, play this.
  {
    cardNumber: 'OP06-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-106 (character) Kouzuki Hiyori —
  //   [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Add up to 1 card
  //   from your hand to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // OP06-107 (character) Kouzuki Momonosuke —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] Add up to 1 of your {Land of Wano} type Characters other than [Kouzuki
  //   Momonosuke] to the top or bottom of the owner's Life cards face-up.
  // NOTE: not yet implemented (needs template).

  // OP06-108 — [Trigger] Up to 1 of your {Land of Wano} Leader or Character gains +2000 power during this turn.
  { cardNumber: 'OP06-108', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP06-109 — [DON!! x2] If opp ≤3 Life, cannot be K.O.'d by effects. [Trigger] If opp ≤3 Life, play this.
  {
    cardNumber: 'OP06-109',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { donAttachedAtLeast: 2, gate: [{ kind: 'opponentLife', atMost: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-110 (character) Nekomamushi —
  //   [DON!! x2] This Character can also attack your opponent's active Characters. [Trigger] If your
  //   opponent has 3 or less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP06-111 (character) Braham —
  //   [Activate: Main] [Once Per Turn] You may place 1 Stage with a cost of 1 at the bottom of the owner's
  //   deck: Rest up to 1 of your opponent's Characters with a cost of 4 or less. [Trigger] If you have 2 or
  //   less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP06-112 — [When Attacking] You may trash 1 from hand: rest opp DON!!. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-112',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'restOpponentDon', maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-113 (character) Raki —
  //   If you have a {Shandian Warrior} type Character other than [Raki], this Character gains
  //   [Blocker].(After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP06-114 (character) Wyper —
  //   [On Play] You may place 1 Stage with a cost of 1 at the bottom of the owner's deck: Look at 5 cards
  //   from the top of your deck; reveal up to 1 [Upper Yard] or {Shandian Warrior} type card and add it to
  //   your hand. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP06-115 — [Counter] trash 1 → +3000 battle. [Trigger] If 0 Life, add top of deck to top of Life, then trash 1 from hand.
  {
    cardNumber: 'OP06-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 0 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  // OP06-116 (event) Reject —
  //   [Main] Choose one:• K.O. up to 1 of your opponent's Characters with a cost of 5 or less.• If your
  //   opponent has 1 Life card, deal 1 damage to your opponent. Then, add 1 card from the top of your Life
  //   cards to your hand. [Trigger] Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP06-117 (stage) The Ark Maxim —
  //   [Activate: Main] [Once Per Turn] You may rest this card and 1 of your [Enel] cards: K.O. all of your
  //   opponent's Characters with a cost of 2 or less.
  // NOTE: not yet implemented (needs template).

  // OP06-118 — [When Attacking] [Once Per Turn] rest 1 DON!!: set this active. [Activate: Main] [Once Per Turn] rest 2 DON!!: set this active.
  {
    cardNumber: 'OP06-118',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'setActiveSelf' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'setActiveSelf' }] } },
    ],
  },

  // OP06-119 (character) Sanji —
  //   [On Play] Reveal 1 card from the top of your deck and play up to 1 Character with a cost of 9 or less
  //   other than [Sanji]. Then, place the rest at the bottom of your deck.
  // NOTE: not yet implemented (needs template).
];
