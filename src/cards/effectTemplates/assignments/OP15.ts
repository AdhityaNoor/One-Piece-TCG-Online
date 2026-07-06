/**
 * Reviewed effect template assignments - Main Booster OP15.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP15_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP15-006 — if 4+ Events in trash, +2000
  { cardNumber: 'OP15-006', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] } }] } },

  // OP15-001 (leader) Krieg —
  //   [DON!! x1] [Opponent's Turn] If the only Characters on your field are {East Blue} type Characters,
  //   give all of your opponent's Characters −2000 power.[Activate: Main] [Once Per Turn] Rest up to 1 of
  //   your opponent's Characters that has 2 or more DON!! cards given.
  // NOTE: not yet implemented (needs template).

  // OP15-002 (leader) Lucy —
  //   [When Attacking]/[On Your Opponent's Attack] You may trash any number of Event or Stage cards from
  //   your hand. This Leader gains +1000 power during this battle for every card trashed.[Activate: Main]
  //   [Once Per Turn] If you have activated an Event with a base cost of 3 or more during this turn, draw 1
  //   card.
  // NOTE: not yet implemented (needs template).

  // OP15-003 (character) Alvida —
  //   If this Character would be K.O.'d, you may trash 1 Character card with a power of 6000 or less from
  //   your hand instead.[Activate: Main] [Once Per Turn] You may give 1 of your opponent's rested DON!!
  //   cards to 1 of your opponent's Characters: Give up to 1 rested DON!! card to its owner's Leader or 1
  //   of their Characters.
  // NOTE: not yet implemented (needs template).

  // OP15-004 (character) Sea Cat —
  //   [On Play] If your Leader has 0 power or less, give up to 1 of your opponent's Characters −3000 power
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // OP15-005 (character) Cabaji —
  //   [When Attacking] If your opponent has any DON!! cards given, this Character gains +2000 power during
  //   this turn.
  // NOTE: not yet implemented (needs template).

  // OP15-006 (character) Cavendish —
  //   If you have 4 or more Events in your trash, this Character gains +2000 power.
  // NOTE: not yet implemented (needs template).

  // ── Triage batch (OP15 expressible). Opponent-DON manipulation, name-target buffs, turn-Life-face costs, and trash-count gates are deferred. ──
  { cardNumber: 'OP15-007', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5 } }] } },

  // OP15-008 (character) Krieg —
  //   [On Play] Give up to 3 of your opponent's rested DON!! cards to 1 of your opponent's Characters.
  //   Then, this Character gains [Rush] during this turn.[Activate: Main] [Once Per Turn] If this Character
  //   was played on this turn, give all of your opponent's Characters −1000 power during this turn for
  //   every DON!! card given to that Character.
  // NOTE: not yet implemented (needs template).

  // OP15-009 (character) Koby —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may give your Leader −2000 power during this turn instead.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP15-010', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP15-011 — [On K.O.] If Leader {East Blue}, K.O. up to 1 opp Character base power ≤6000. PARTIAL: conditional [Blocker]/+2000 deferred.
  { cardNumber: 'OP15-011', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },

  {
    cardNumber: 'OP15-012',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-013 (character) Pincers —
  //   If your Leader has 0 power or less, give this card in your hand −2 cost.[Blocker] (After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP15-014 (character) Bartolomeo —
  //   If this Character would be K.O.'d, you may trash 1 Event from your hand instead.[On Play] Activate up
  //   to 1 {Dressrosa} type Event with a base cost of 3 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // OP15-015 (character) Higuma —
  //   [On Play] Give up to 1 of your opponent's rested DON!! cards to 1 of your opponent's Characters.
  //   Then, give −1000 power during this turn to up to 1 of your opponent's Characters with a DON!! card
  //   given.
  // NOTE: not yet implemented (needs template).

  // OP15-017 (character) Morgan —
  //   [Blocker][Activate: Main] [Once Per Turn] You may give 1 of your opponent's rested DON!! cards to 1
  //   of your opponent's Characters: Give up to 1 rested DON!! card to its owner's Leader or 1 of their
  //   Characters.
  // NOTE: not yet implemented (needs template).

  // OP15-018 (character) Mohji —
  //   [When Attacking] K.O. up to 1 of your opponent's Characters with 3000 power or less with a DON!! card
  //   given.
  // NOTE: not yet implemented (needs template).

  // OP15-019 (event) Barrier Bulls —
  //   [Main] Draw 1 card and your Leader gains +1000 power until the end of your opponent's next End Phase.
  //   [Trigger] Give up to 1 of your opponent's Characters −4000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP15-020 (event) Fire Fist —
  //   [Main] Your Leader gains +3000 power during this turn and give up to 1 of your opponent's Characters
  //   −8000 power until the end of your opponent's next End Phase. Then, you may trash 2 cards from your
  //   hand. If you do, K.O. up to 1 of your opponent's Characters with 0 power or less.
  // NOTE: not yet implemented (needs template).

  // OP15-021 — [Main]/[Counter] give up to 1 opp Character −3000. PARTIAL: static Events-in-trash −cost is deferred.
  {
    cardNumber: 'OP15-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP15-022 (leader) Brook —
  //   Under the rules of this game, you do not lose when your deck has 0 cards. You lose at the end of the
  //   turn in which your deck becomes 0 cards.[Activate: Main] [Once Per Turn] Trash 4 cards from the top
  //   of your deck. Then, if your deck has 0 cards, set up to 1 of your Characters as active.
  // NOTE: not yet implemented (needs template).

  // OP15-023 (character) Arlong —
  //   [On K.O.] Up to 2 of your opponent's rested cards will not become active in your opponent's next
  //   Refresh Phase.[Activate: Main] [Once Per Turn] You may give 1 of your opponent's rested DON!! cards
  //   to 1 of your opponent's Characters: Give up to 1 DON!! card from its owner's cost area to its owner's
  //   Leader or 1 of their Characters.
  // NOTE: not yet implemented (needs template).

  // OP15-024 (character) Usopp —
  //   [Opponent's Turn] This Character cannot be rested by your opponent's Leader and Character effects and
  //   gains [Blocker].[On K.O.] Rest up to 1 of your opponent's Leader or Character cards with a cost of 7
  //   or less.
  // NOTE: not yet implemented (needs template).

  // OP15-025 (character) Kuro —
  //   [Blocker][On Play] Give up to 2 DON!! cards from your opponent's cost area to 1 of your opponent's
  //   Characters. Then, at the end of this turn, up to 1 rested Character with 3 or more DON!! cards given
  //   will not become active in your opponent's next Refresh Phase.
  // NOTE: not yet implemented (needs template).

  // OP15-026 — [On Play] Look 3, reveal up to 1 {East Blue} to hand, rest to bottom. PARTIAL: trash-self opp-DON activate deferred.
  { cardNumber: 'OP15-026', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom' }] } },

  // OP15-027 (character) Dracule Mihawk —
  //   [On Play] Rest up to 1 of your opponent's Characters with a DON!! card given.
  // NOTE: not yet implemented (needs template).

  // OP15-028 (character) Meowban Brothers —
  //   [On Play] If your Leader has the {East Blue} type, give up to 1 DON!! card from your opponent's cost
  //   area to 1 of your opponent's Characters.
  // NOTE: not yet implemented (needs template).

  // OP15-029 (character) Bartholomew Kuma —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 5 or less cannot be rested until the
  //   end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP15-031 (character) Purinpurin —
  //   [On Play] Select up to 1 of your opponent's rested Characters. If the chosen Character has a cost
  //   equal to the number of DON!! cards given to it, K.O. it.
  // NOTE: not yet implemented (needs template).

  // OP15-032 — [On Play] Rest up to 1 opp Character. PARTIAL: trash-self activate deferred.
  { cardNumber: 'OP15-032', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },

  // OP15-033 (character) Hody Jones —
  //   [On Play] Set your {Fish-Man} type Leader as active. Then, add 1 card from the top of your Life cards
  //   to your hand.
  // NOTE: not yet implemented (needs template).

  // OP15-034 (character) Yorki —
  //   [Your Turn] [On Play] Up to 1 of your [Brook] cards gains +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP15-035 (character) Laboon —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may rest 2 of your cards instead.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP15-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP15-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'East Blue' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-038 (event) It's an Order! Do Not Defy Me!!! —
  //   [Main] Up to 1 of your opponent's rested Characters with a cost of 8 or less that has 2 or more DON!!
  //   cards given will not become active in your opponent's next Refresh Phase.[Counter] Up to 1 of your
  //   [Krieg] cards gains +4000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP15-039 (leader) Rebecca —
  //   This Leader cannot attack.[Activate: Main] You may rest this Leader and return 1 of your {Dressrosa}
  //   type Characters to the owner's hand: Play up to 1 {Dressrosa} type Character card with a cost of 3
  //   from your hand.
  // NOTE: not yet implemented (needs template).

  // OP15-040 — [On Play] Look at 3; add up to 1 Dressrosa type.
  {
    cardNumber: 'OP15-040',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' } }] },
  },

  // OP15-041 — [On K.O.] Draw 1. [Activate: Main][OPT] place 1 own Char at bottom of deck → this gains [Rush].
  {
    cardNumber: 'OP15-041',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP15-042 — [On Play] trash 1 → if Leader [Rebecca], this gains [Rush]. PARTIAL: [On K.O.] self-recur deferred.
  { cardNumber: 'OP15-042', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Rebecca' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP15-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Bobby Funk' } }] } },

  // OP15-044 - [Blocker] [On K.O.] Look at 3; add up to 1 Dressrosa Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-K.O. search is templated.
  {
    cardNumber: 'OP15-044',
    templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', typeIncludes: 'Dressrosa' } }] },
  },

  // OP15-045 — [Blocker][On Play] trash 1 → Draw 2 (Event-category filter approximated as any card).
  { cardNumber: 'OP15-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' }] } },

  // OP15-050 — if you have [Kelly Funk], +3000
  { cardNumber: 'OP15-050', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Kelly Funk' }] } }] } },

  // OP15-046 (character) Sabo —
  //   [Blocker][On Play] If your Leader has the {Dressrosa} type, activate up to 1 {Dressrosa} type Event
  //   from your hand.
  // NOTE: not yet implemented (needs template).

  // OP15-047 (character) Sanji —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] Up to 1 of your Characters gains [Unblockable] during this turn.(This card
  //   cannot be blocked.)
  // NOTE: not yet implemented (needs template).

  // OP15-048 (character) Chinjao —
  //   [On Play] You may trash 1 Event from your hand: Draw 2 cards.[Opponent's Turn] [On K.O.] Your
  //   opponent places 1 card from their hand at the bottom of their deck.
  // NOTE: not yet implemented (needs template).

  // OP15-050 (character) Bobby Funk —
  //   If you have [Kelly Funk], this Character gains +3000 power.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP15-051', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Dressrosa' }] } }] } },

  // OP15-052 (character) Leo —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may place 1 of your Characters at the bottom of the owner's deck instead.
  // NOTE: not yet implemented (needs template).

  // OP15-053 — [On Play] Look 3, reveal up to 1 {Dressrosa} to hand, rest to bottom. PARTIAL: conditional [Blocker] deferred.
  { cardNumber: 'OP15-053', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },

  // OP15-054 (event) And No One Else Can Have It! It's Our Memento of Him —
  //   [Main] If your Leader is [Lucy], choose one:• Draw 2 cards and trash 1 card from your hand. Then,
  //   play up to 1 {Dressrosa} type Character card with a cost of 4 or less from your hand.• Return up to 1
  //   Stage to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP15-055 (event) Go Ahead and Use 'Em, Mr. Luffy!!! —
  //   [Main] Choose one:• Draw 2 cards.• Up to 1 of your {Dressrosa} type Characters gains [Blocker] until
  //   the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP15-056 — [Main] Draw 2. [Trigger] Draw 2. PARTIAL: the "[Lucy] Leader gains [Double Attack]/+3000" clause is deferred.
  {
    cardNumber: 'OP15-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP15-057 (stage) — [On Play] If Leader {Dressrosa}, draw 1. PARTIAL: [On Opponent's Attack] clause deferred.
  { cardNumber: 'OP15-057', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP15-058 (leader) Enel —
  //   Under the rules of this game, your DON!! deck consists of 6 cards.[Activate: Main] [Once Per Turn] If
  //   it is your second turn or later, add up to 1 DON!! card from your DON!! deck and set it as active,
  //   and add up to 4 additional DON!! cards and rest them. Then, give up to 4 rested DON!! cards to 1 of
  //   your Characters.
  // NOTE: not yet implemented (needs template).

  // OP15-059 (character) Amazon —
  //   [On Your Opponent's Attack] You may rest this Character: Your opponent may return 1 of their active
  //   DON!! cards to their DON!! deck. If they do not, give up to 1 of your opponent's Leader or Character
  //   cards −2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP15-060 (character) Enel —
  //   If you have 6 or less DON!! cards on your field, this Character cannot be removed from the field by
  //   your opponent's effects and gains +2000 power.[Activate: Main] DON!! −1: This Character gains
  //   [Blocker] until the end of your opponent's next End Phase. Then, trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP15-061 - [On Play] DON!! -1: draw 1. [When Attacking] if <=6 DON!!, -1000 opponent Character.
  {
    cardNumber: 'OP15-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP15-063 - [On Play] DON!! -1: draw 1. [On K.O.] if <=6 DON!!, K.O. power <=2000.
  {
    cardNumber: 'OP15-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
    ],
  },

  // OP15-064 — [Activate: Main] DON!! −2 + rest this: If you have [Satori] and [Hotori], rest up to 1 opp Character with 5000 power or less.
  { cardNumber: 'OP15-064', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'selfControlsNamed', name: 'Satori' }, { kind: 'selfControlsNamed', name: 'Hotori' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },

  // OP15-119 (character) Monkey.D.Luffy —
  //   If you have 6 or more DON!! cards on your field, this Character gains [Rush].When your opponent
  //   activates an Event or [Blocker], reveal up to 1 card from the top of your Life cards. This Character
  //   gains +1000 power during this turn per 1 cost on the revealed card.
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'OP15-065', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { maxCost: 2 }, then: [{ fn: 'addDonFromDeck', count: 1, rested: true }] }] } },

  {
    cardNumber: 'OP15-066',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'searchTopDeck', look: 2, pick: 2, reveal: false, destination: 'deckTopOrBottom' }] } },
    ],
  },

  {
    cardNumber: 'OP15-067',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-068 — if 6 or less DON!! on field, [Blocker]
  { cardNumber: 'OP15-068', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },

  // OP15-068 (character) Heavenly Warriors —
  //   If you have 6 or less DON!! cards on your field, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP15-069 (character) Nola —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may return 1 DON!! card from your field to your DON!! deck instead.
  // NOTE: not yet implemented (needs template).

  // OP15-070 (character) Fuza —
  //   All of your [Shura] cards and this Character gain [Unblockable].(This card cannot be
  //   blocked.)[Opponent's Turn] All of your [Shura] cards' base power and this Character's base power
  //   become 6000.
  // NOTE: not yet implemented (needs template).

  // OP15-071 (character) Holly —
  //   All of your [Ohm] cards and this Character gain [Double Attack].(This card deals 2
  //   damage.)[Opponent's Turn] All of your [Ohm] cards' base power and this Character's base power become
  //   6000.
  // NOTE: not yet implemented (needs template).

  // OP15-072 — [Activate: Main] DON!! −2 + rest this: If you have [Kotori] and [Satori], give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP15-072', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'selfControlsNamed', name: 'Kotori' }, { kind: 'selfControlsNamed', name: 'Satori' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP15-073 — [Blocker][On Play] play up to 1 [Heavenly Warriors] cost 1 or {Vassals} cost 1 from hand.
  { cardNumber: 'OP15-073', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', exactCost: 1, anyOf: [{ name: 'Heavenly Warriors' }, { typeIncludes: 'Vassals' }] } }] } },

  // OP15-074 (event) Varie —
  //   [Main] DON!! −1: If your Leader is [Enel], draw 1 card. Then, up to 1 of your Characters gains +2
  //   cost until the end of your opponent's next End Phase.[Counter] Up to 1 of your [Enel] cards gains
  //   +2000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP15-075 — [Main] DON!! −1: If Leader [Enel], up to 1 Leader/Char +1000 this turn, K.O. opp ≤3000 power. PARTIAL: [Counter] [Enel] buff deferred.
  { cardNumber: 'OP15-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },

  // OP15-076 — [Main] DON!! −1: If Leader [Enel], draw 1, give up to 1 opp Character −1000. PARTIAL: [Counter] [Enel] buff deferred.
  { cardNumber: 'OP15-076', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderName', name: 'Enel' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP15-077 — [Main] DON!! −1: Draw 1. PARTIAL: the preventRefresh rider is deferred.
  { cardNumber: 'OP15-077', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP15-078 - [Main] DON!! -2: draw 1, then rest power <=5000. [Counter] +1000, then if <=6 DON!! draw 1.
  {
    cardNumber: 'OP15-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfDonFieldCount', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-079 (character) Absalom —
  //   [On K.O.] Add up to 1 {Thriller Bark Pirates} type card from your trash to your hand. [Trigger]
  //   Activate this card's [On K.O.] effect.
  // NOTE: not yet implemented (needs template).

  // OP15-080 (character) Oars —
  //   If you have [Gecko Moria] with 10000 power or more on your field and there are no other [Oars] cards,
  //   this Character gains +7000 power.[On K.O.] You may place 3 cards from your trash at the bottom of
  //   your deck in any order: Play this Character card from your trash.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP15-081', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },

  {
    cardNumber: 'OP15-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP15-083 — [On Play] Trash 3 from top of deck. PARTIAL: trash-self 15-trash activate deferred.
  { cardNumber: 'OP15-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },

  {
    cardNumber: 'OP15-084',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP15-085 — [On Play] Trash 3 from top of deck. PARTIAL: trash-self recur activate deferred.
  { cardNumber: 'OP15-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },

  // OP15-086 — [On Play] If Leader {Straw Hat Crew}, play {Straw Hat Crew} cost ≤7 from trash (granted [Rush] dropped).
  { cardNumber: 'OP15-086', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 7 } }] } },

  // OP15-087 — [On Play] Draw 2, trash 2. PARTIAL: static 10-trash [Blocker] deferred.
  { cardNumber: 'OP15-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP15-088 — static: this Character +6 cost. [On Play] trash 3 from top of deck → play {Straw Hat Crew} cost ≤2 from trash.
  {
    cardNumber: 'OP15-088',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 6, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 2 } }] } },
    ],
  },

  // OP15-090 (character) Perona —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may trash 1 card from your hand instead.
  // NOTE: not yet implemented (needs template).

  // OP15-091 (character) Margarita —
  //   [On Play] Place up to 1 card from your opponent's trash at the bottom of the owner's deck.
  // NOTE: not yet implemented (needs template).

  // OP15-092 (character) Monkey.D.Luffy —
  //   Apply each of the following effects based on the number of cards in your trash:• If there are 10 or
  //   more cards, this Character's base power becomes 9000 and it gains +10 cost.• If you have 20 or more
  //   cards, during your opponent's turn, your Leader's base power becomes 7000.• If you have 30 or more
  //   cards, this Character gains +1000 power.
  // NOTE: not yet implemented (needs template).

  // OP15-093 (character) The Risky Brothers —
  //   [Activate: Main] You may trash this Character: If you have 15 or more cards in your trash, up to 1 of
  //   your [Monkey.D.Luffy] Characters gains [Rush: Character] and the <Slash> attribute during this turn.
  // NOTE: not yet implemented (needs template).

  // OP15-094 (character) Roronoa Zoro —
  //   If your {Straw Hat Crew} type Character other than this Character would be removed from the field by
  //   your opponent's effect, you may trash this Character instead.[Blocker]
  // NOTE: not yet implemented (needs template).

  // OP15-095 (event) Gum-Gum Storm —
  //   [Main] You may rest 1 of your DON!! cards: If you have 15 or more cards in your trash, up to 1 of
  //   your {Straw Hat Crew} type Leader or Character cards gains +3000 power during this turn.[Counter] If
  //   you have 15 or more cards in your trash, up to 1 of your Leader or Character cards gains +4000 power
  //   during this battle.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP15-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP15-097 (event) I Find It Embarrassing as a Human Being —
  //   [Main] If you have 10 or more cards in your trash, up to 1 of your opponent's Characters with a base
  //   cost of 5 or less cannot attack until the end of your opponent's next End Phase. [Trigger] Activate
  //   this card's [Main] effect.
  // NOTE: not yet implemented (needs template).

  // OP15-098 (leader) Monkey.D.Luffy —
  //   If your {Sky Island} type Character with 6000 base power or more would be removed from the field by
  //   your opponent, you may add 1 card from the top of your Life cards to your hand instead.
  // NOTE: not yet implemented (needs template).

  // OP15-099 (character) Urouge —
  //   [On Play] You may trash 1 {Supernovas} type card from your hand: This Character gains [Rush] during
  //   this turn.[Activate: Main] You may turn 1 card from the top of your Life cards face-down: Give up to
  //   1 rested DON!! card to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // OP15-100 (character) Kamakiri —
  //   [On Play] You may trash this Character and add 1 card from the top of your Life cards to your hand:
  //   K.O. up to 1 of your opponent's Characters with a cost of 6 or less.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP15-101', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Mont Blanc Noland' }, { typeIncludes: 'Shandian Warrior' }] }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },

  // OP15-102 (character) Gan.Fall —
  //   If you have a {Sky Island} type Character with 7000 power or more, give this card in your hand −3
  //   cost.[On Play] Rest up to 1 of your opponent's Characters with a cost equal to or less than the
  //   number of your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  // OP15-103 — [Trigger] Draw 1, then if ≤2 Life play this card.
  { cardNumber: 'OP15-103', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'triggerPlaySelf', ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },

  {
    cardNumber: 'OP15-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP15-105 (character) Jewelry Bonney —
  //   If your Character with 7000 base power or less would be removed from the field by your opponent's
  //   effect, you may add 1 card from the top of your Life cards to your hand instead.
  // NOTE: not yet implemented (needs template).

  // OP15-106 — [Trigger] Draw 1, then play up to 1 yellow Character cost ≤2 from hand (Stage option dropped).
  { cardNumber: 'OP15-106', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', color: 'yellow', maxCost: 2 } }] } },

  // OP15-108 — [On Play] Look at 3; add up to 1 Sky Island type.
  {
    cardNumber: 'OP15-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },

  // OP15-109 — [On Play] If Leader {Straw Hat Crew}: add 1 top Life to hand → add top of deck to top of Life → play {Sky Island} cost ≤5 from hand.
  { cardNumber: 'OP15-109', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Sky Island', maxCost: 5 } }] } },

  // OP15-110 — [On K.O.] If Leader {Shandian Warrior}, add up to 1 top of deck to top of Life.
  { cardNumber: 'OP15-110', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Shandian Warrior' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

  // OP15-110 (character) Braham —
  //   [On K.O.] If your Leader has the {Shandian Warrior} type, add up to 1 card from the top of your deck
  //   to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // OP15-111 (character) Mont Blanc Noland —
  //   [DON!! x1] [When Attacking] Up to 1 of your [Kalgara] cards gains [Rush] during this turn.(This card
  //   can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP15-112', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Shandian Warrior', maxCost: 3 } }] } },

  { cardNumber: 'OP15-113', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP15-114 — [Activate: Main][OPT] give up to 1 rested DON!! to Leader/1 Char. PARTIAL: the turn-Life-face-up mass-debuff [On Play] is deferred.
  { cardNumber: 'OP15-114', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  {
    cardNumber: 'OP15-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP15-116 — [Counter] your Leader +4000 this battle. PARTIAL: the Straw-Hat [Main] Life-trash/refill is deferred.
  { cardNumber: 'OP15-116', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle' }] } },

  {
    cardNumber: 'OP15-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Sky Island' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP15-118 — static: if ≤6 DON!!, cannot be removed by opp effects and +2000. [On Play] DON!! −1: Look 5, add up to 1, rest to bottom, trash 1.
  {
    cardNumber: 'OP15-118',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }, { fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 6 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

];
