/**
 * Reviewed effect template assignments - Main Booster OP12.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP12_ASSIGNMENTS: CardEffectAssignment[] = [
  // OP12-001 (leader) Silvers Rayleigh —
  //   Under the rules of this game, you cannot include cards with a cost of 5 or more in your
  //   deck.[Activate: Main] [Once Per Turn] You may reveal 2 Events from your hand: Up to 1 of your
  //   Characters with 4000 base power or less gains +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-003 (character) Crocus —
  //   [On K.O.] You may reveal 2 Events from your hand: Play up to 1 red Character card with 3000 power or
  //   less from your hand.
  // NOTE: not yet implemented (needs template).

  // OP12-004 (character) Kouzuki Oden —
  //   [Activate: Main] [Once Per Turn] You may reveal 2 Events from your hand: This Character gains +2000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-006 - [On Play] Look at 5; add [Monkey.D.Luffy] or red Event.
  {
    cardNumber: 'OP12-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { category: 'event', color: 'red' }] } }] },
  },

  // ── Triage batch (OP12 expressible). "reveal 2 Events from hand" cost, "give active DON!! to [named]", and Events-in-trash gates are deferred. ──
  // OP12-007 — [On Play] up to 1 {Roger Pirates} Character gains [Rush] this turn (exclude-[Shanks] dropped).
  { cardNumber: 'OP12-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Roger Pirates' } }, keyword: 'rush', duration: 'duringThisTurn', optional: true }] } },

  // OP12-008 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand: give up to 1 opp Leader/Character −2000 this turn.
  { cardNumber: 'OP12-008', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP12-009 (character) Jinbe —
  //   [On Play] You may reveal 2 Events from your hand: This Character gains [Rush] during this turn. Then,
  //   this Character gains +1000 power until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP12-012 (character) Buggy —
  //   [On Play] Up to 1 of your Characters with a type including "Roger Pirates" other than [Buggy] gains
  //   [Blocker] until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP12-013 (character) Hatchan —
  //   [Activate: Main] You may rest this Character and reveal 2 Events from your hand: Give up to 2 rested
  //   DON!! cards to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // OP12-014 (character) Boa Hancock —
  //   [On Play] Look at 5 cards from the top of your deck; reveal up to 1 [Monkey.D.Luffy] or red Event and
  //   add it to your hand. Then, place the rest at the bottom of your deck in any order.[Activate: Main]
  //   You may trash this Character: Give up to 2 rested DON!! cards to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // OP12-015 (character) Monkey.D.Luffy —
  //   If you have a total of 2 or more given DON!! cards, this Character gains +2000 power.[On Play] You
  //   may reveal 2 Events from your hand: Play up to 1 red Character card with 3000 power or less from your
  //   hand. Then, give up to 1 rested DON!! card to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // OP12-016 (event) To Never Doubt--That Is Power! —
  //   [Main] You may give 2 active DON!! cards to 1 of your [Silvers Rayleigh]: Your opponent cannot
  //   activate [Blocker] when the card given these DON!! cards attacks during this turn.[Counter] Up to 1
  //   of your Characters or [Silvers Rayleigh] gains +2000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP12-017 (event) Color of Observation Haki —
  //   [Main] You may give 1 active DON!! card to 1 of your [Silvers Rayleigh]: Look at 4 cards from the top
  //   of your deck; reveal up to 1 red Event or up to 1 Character card with a cost of 3 or more and add it
  //   to your hand. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP12-018 (event) Color of the Supreme King Haki —
  //   [Counter] Up to 1 of your Characters or [Silvers Rayleigh] gains +2000 power during this battle.
  //   Then, you may rest 1 of your DON!! cards. If you do, give your opponent's Leader and all of their
  //   Characters −1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-019 (event) Color of Arms Haki —
  //   [Main] You may give 1 active DON!! card to 1 of your [Silvers Rayleigh]: Up to 1 of your Leader or
  //   Character cards gains +1000 power during this turn.[Counter] Up to 1 of your Characters or [Silvers
  //   Rayleigh] gains +2000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP12-020 (leader) Roronoa Zoro —
  //   [DON!! x3] [Activate: Main] [Once Per Turn] If this Leader battles your opponent's Character during
  //   this turn, set this Leader as active. Then, this Leader cannot attack your opponent's Characters with
  //   a base cost of 7 or less during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-021 (character) Ipponmatsu —
  //   If your Leader has the <Slash> attribute and you have 6 or more rested DON!! cards, this Character
  //   cannot be rested by your opponent's effects.[Blocker]
  // NOTE: not yet implemented (needs template).

  // OP12-022 (character) Inuarashi —
  //   [Activate: Main] You may rest this Character: Up to 1 of your opponent's rested Characters with a
  //   cost of 5 or less will not become active in your opponent's next Refresh Phase.
  // NOTE: not yet implemented (needs template).

  // OP12-024 (character) Gyukimaru —
  //   If this Character is active, this Character cannot be K.O.'d by your opponent's effects.[When
  //   Attacking] If you have a total of 3 or more given DON!! cards, rest up to 1 of your opponent's
  //   Characters with a base cost of 6 or less.
  // NOTE: not yet implemented (needs template).

  // OP12-026 (character) Kuina —
  //   [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a base
  //   cost of 4 or less. Then, give up to 3 rested DON!! cards to your [Roronoa Zoro] Leader.
  // NOTE: not yet implemented (needs template).

  // OP12-027 (character) Koushirou —
  //   If your <Slash> attribute Character with a cost of 5 or less other than this Character would be
  //   K.O.'d by your opponent's effect, you may rest this Character instead.[Blocker]
  // NOTE: not yet implemented (needs template).

  // OP12-028 (character) Kouzuki Hiyori —
  //   [Activate: Main] You may rest 1 of your DON!! cards and this Character: If your Leader is [Roronoa
  //   Zoro], look at 5 cards from the top of your deck; reveal up to 1 <Slash> attribute card or green
  //   Event and add it to your hand. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP12-029 — [On Play] Rest up to 1 opp Character cost ≤2, then K.O. up to 1 opp rested Character with base cost ≤1.
  { cardNumber: 'OP12-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBaseCost: 1 } }, optional: true }] } },

  // OP12-030 — [Blocker][On Play] Set up to 4 DON!! active. PARTIAL: the "cannot play base-cost-7+ Characters this turn" restriction is deferred.
  { cardNumber: 'OP12-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 4 }] } },

  // OP12-031 (character) Tashigi —
  //   [On Play] Rest up to 1 of your opponent's Characters with a base cost of 6 or less. Then, give up to
  //   3 rested DON!! cards to your [Roronoa Zoro] Leader.
  // NOTE: not yet implemented (needs template).

  // OP12-033 — [Blocker][On Block] Rest up to 1 opp Character cost ≤5.
  { cardNumber: 'OP12-033', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  // OP12-034 (character) Perona —
  //   [On Play] If your Leader has the <Slash> attribute, look at 5 cards from the top of your deck; reveal
  //   up to 1 <Slash> attribute card or green Event and add it to your hand. Then, place the rest at the
  //   bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP12-036 (character) Roronoa Zoro —
  //   This card in your hand cannot be played by effects.If your Leader has the <Slash> attribute, this
  //   Character cannot be K.O.'d in battle by <Slash> attribute cards and gains +1000 power.
  // NOTE: not yet implemented (needs template).

  // OP12-037 (event) Demon Aura Nine Sword Style Asura Blades Drawn Dead Man's Game —
  //   [Main] You may rest 3 of your DON!! cards: Rest up to a total of 2 of your opponent's Characters or
  //   DON!! cards.[Counter] Your Leader gains +3000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP12-038 — [Main] rest 2 DON!!: K.O. up to 2 opp rested Characters base cost ≤4. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP12-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBaseCost: 4 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP12-039 — [Trigger] up to 1 Leader/Char +1000 this turn. PARTIAL: the [Main] "set your Zoro Leader active" needs a set-Leader-active op (deferred).
  { cardNumber: 'OP12-039', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },

  // OP12-040 (leader) Kuzan —
  //   When a card is trashed from your hand by your {Navy} type card's effect, draw cards equal to the
  //   number of cards trashed.
  // NOTE: not yet implemented (needs template).

  // OP12-041 (leader) — [When Attacking] If your DON!! ≤ opponent's, add 1 DON!! (rested). PARTIAL: the "activate Event from hand" main is deferred.
  { cardNumber: 'OP12-041', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP12-042 — [On Play] Place up to 1 opp Character with base cost ≤1 at bottom of deck. PARTIAL: the static +1 cost clause is deferred.
  { cardNumber: 'OP12-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBaseCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP12-043 (character) Kuzan —
  //   If you have 5 or more cards in your hand, this Character gains +1 cost.[On Play] You may trash 1 card
  //   from your hand: Up to 1 of your opponent's Characters cannot attack until the end of your opponent's
  //   next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP12-044 — [On Play] If Leader {Navy}, draw 2. [Activate: Main][OPT] trash 1 → give 1 rested DON!! to Leader/1 Char.
  {
    cardNumber: 'OP12-044',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP12-046 — [On Play] Trash 2 from hand. PARTIAL: the trash-self activate bounce is deferred.
  { cardNumber: 'OP12-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 2 }] } },

  // OP12-047 — [On Play] trash 1 → Look 5, reveal up to 2 {Navy} to hand (exclude-[Sengoku] dropped), rest to bottom.
  { cardNumber: 'OP12-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },

  // OP12-048 (character) Donquixote Rosinante —
  //   [Opponent's Turn] If your blue {Navy} type Character would be removed from the field by your
  //   opponent's effect, you may rest this Character and trash 1 card from your hand instead.
  // NOTE: not yet implemented (needs template).

  // OP12-051 (character) Hina —
  //   [Activate: Main] You may rest this Character and trash 1 card from your hand: Up to 1 of your
  //   opponent's Characters with a base cost of 4 or less cannot activate [Blocker] during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-053 (character) Borsalino —
  //   [Once Per Turn] If this Character would be removed from the field by your opponent's effect, you may
  //   trash 1 card from your hand instead.[Opponent's Turn] If your Leader has the {Navy} type, this
  //   Character gains [Blocker] and +1000 power.
  // NOTE: not yet implemented (needs template).

  // OP12-054 — [On Play] If Leader {The Seven Warlords of the Sea}: return up to 1 Character cost ≤1 to hand (exclude-self dropped).
  { cardNumber: 'OP12-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP12-056 — [On Play] trash 1 → play up to 1 blue {Navy} Character (≤8000 base power) from hand (exclude-[Garp] dropped).
  { cardNumber: 'OP12-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'playFromHand', filter: { category: 'character', color: 'blue', typeIncludes: 'Navy', maxPower: 8000 } }] } },

  // OP12-057 — [Counter] up to 1 Leader/Char +4000 this battle, then trash 1 from hand. [Trigger] trash 1 → draw 1.
  {
    cardNumber: 'OP12-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP12-058 (event) I Will Make Whitebeard the King of the Pirates —
  //   [Main] If your Leader's type includes "Whitebeard Pirates", reveal 1 card from the top of your deck.
  //   If that card is a Character card with a type including "Whitebeard Pirates" and a cost of 9 or less,
  //   you may play that card. If you do, that Character gains [Rush] during this turn. [Trigger] Draw 1
  //   card.
  // NOTE: not yet implemented (needs template).

  // OP12-059 — [Main] If Leader [Sanji], draw 1. PARTIAL: the [Counter] Events-in-trash buff is deferred.
  { cardNumber: 'OP12-059', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP12-060 (event) Boeuf Burst —
  //   [Main] If your Leader is multicolored, choose one:• Return up to 1 of your opponent's Characters with
  //   a cost of 4 or less to the owner's hand.• If you have 6 or less cards in your hand, draw 2 cards.
  // NOTE: not yet implemented (needs template).

  // OP12-061 (leader) Donquixote Rosinante —
  //   [Once Per Turn] If your [Trafalgar Law] would be K.O.'d, you may add 1 card from the top of your Life
  //   cards to your hand instead.[Activate: Main] [Once Per Turn] DON!! −1: The next time you play
  //   [Trafalgar Law] with a cost of 4 or more from your hand during this turn, the cost will be reduced by
  //   2.
  // NOTE: not yet implemented (needs template).

  // OP12-062 — [On Play] If Leader [Sanji] and your DON!! ≤ opponent's, add 1 DON!! (rested), then draw 1.
  { cardNumber: 'OP12-062', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Sanji' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'draw', amount: 1 }] } },

  // OP12-063 (character) Vinsmoke Reiju —
  //   If you have 4 or more Events in your trash, this Character gains +2000 power and +5 cost.[Blocker]
  //   (After your opponent declares an attack, you may rest this card to make it the new target of the
  //   attack.)
  // NOTE: not yet implemented (needs template).

  // OP12-065 (character) Emporio.Ivankov —
  //   If you have 4 or more Events in your trash, this Character gains [Blocker].[On K.O.] Add up to 1
  //   Event from your trash to your hand.
  // NOTE: not yet implemented (needs template).

  // OP12-066 (character) Carne —
  //   If you have 4 or more Events in your trash, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP12-069 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: If Leader {Baroque Works}, up to 1 Leader/Character +2000 battle.
  { cardNumber: 'OP12-069', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },

  // OP12-070 (character) Sanji —
  //   This Character gains +1000 power for every 5 Events in your trash.If this Character would be removed
  //   from the field by your opponent's effect, you may return 1 DON!! card from your field to your DON!!
  //   deck instead.
  // NOTE: not yet implemented (needs template).

  // OP12-071 - [On Play] Look at 4; add [Sanji] or Event.
  {
    cardNumber: 'OP12-071',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] } }] },
  },

  // OP12-072 (character) Zeff —
  //   When a DON!! card on your field is returned to your DON!! deck, if your Leader is [Sanji], this
  //   Character gains [Rush] during this turn.(This card can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // OP12-073 (character) Trafalgar Law —
  //   [On Play] If the number of DON!! cards on your field is equal to or less than the number on your
  //   opponent's field, add up to 1 DON!! card from your DON!! deck and set it as active. Then, all of your
  //   [Donquixote Rosinante] and {Heart Pirates} type Characters gain +1000 power until the end of your
  //   opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP12-074 (character) Patty —
  //   [On Play] You may trash 1 Event from your hand: If your Leader is [Sanji], add up to 1 DON!! card
  //   from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP12-075 — [On Play] K.O. up to 1 opp Character cost ≤3. [Trigger] DON!! −1: Play this card. PARTIAL: opponent's DON!! ramp drawback deferred.
  {
    cardNumber: 'OP12-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP12-077 (event) The "Extinguishes All Sound Created by Your Influence" Technique —
  //   [Main] Select up to 1 of your [Trafalgar Law] cards and that card gains +2000 power during this turn.
  //   Then, if the selected card attacks during this turn, your opponent cannot activate [Blocker].
  //   [Trigger] Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP12-078 — [Main] If your DON!! ≤ opponent's, draw 1, then give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP12-078', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP12-079 — [Main] If Leader [Sanji]: Look 3, add up to 1 card to hand, rest to bottom.
  { cardNumber: 'OP12-079', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }] } },

  // OP12-080 (stage) Baratie —
  //   [Activate: Main] You may place this Stage at the bottom of the owner's deck: If your Leader is
  //   [Sanji], look at 3 cards from the top of your deck; reveal up to 1 Event and add it to your hand.
  //   Then, place the rest at the bottom of your deck in any order. [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // OP12-081 (leader) Koala —
  //   When this Leader attacks your opponent's Leader, if you have 2 or more Characters with a cost of 8 or
  //   more, draw 1 card.[Once Per Turn] This effect can be activated when your opponent plays a Character
  //   with a base cost of 8 or more, or when your opponent plays a Character using a Character's effect.
  //   Your opponent adds 1 card from the top of their Life cards to their hand.
  // NOTE: not yet implemented (needs template).

  // OP12-084 — [Blocker][On Play] If Leader {Revolutionary Army}, trash 3 from top of deck.
  { cardNumber: 'OP12-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'trashTopDeck', count: 3 }] } },

  // OP12-085 (character) Karasu —
  //   If your Leader has the {Revolutionary Army} type, this Character gains +3 cost.[When Attacking] If
  //   your Leader has the {Revolutionary Army} type and your opponent has 5 or more cards in their hand,
  //   your opponent trashes 1 card from their hand.
  // NOTE: not yet implemented (needs template).

  // OP12-086 - [On Play] If Leader has Revolutionary Army, look at 3; add Revolutionary Army other than self or [Nico Robin], trash rest.
  {
    cardNumber: 'OP12-086',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'searchTopDeck', look: 3,
      pick: 1,
      reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Revolutionary Army', excludeSelfName: true }, { name: 'Nico Robin' }] },
      remainder: 'trash' }] },
  },

  // OP12-087 — [On Play] trash 1 → if opp 5+ hand, opp trashes 2. PARTIAL: static [Blocker]/+3 cost clause deferred.
  { cardNumber: 'OP12-087', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 5 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 2, ifPrevious: 'previousMovedAny' }] } },

  // OP12-089 — [On K.O.] If Leader {Revolutionary Army}, K.O. up to 1 opp Character base cost ≤4. PARTIAL: static [Blocker]/+4 cost deferred.
  { cardNumber: 'OP12-089', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }] } },

  // OP12-090 — [When Attacking] trash 2 from top of deck: give up to 1 opp Character −2 cost this turn.
  { cardNumber: 'OP12-090', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }] } },

  // OP12-091 (character) Poker —
  //   [Activate: Main] [Once Per Turn] You may place 3 cards from your trash at the bottom of your deck in
  //   any order: Up to 2 of your {SMILE} type Characters gain +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-093 (character) Morley —
  //   If your Leader has the {Revolutionary Army} type, this Character gains +4 cost.
  // NOTE: not yet implemented (needs template).

  // OP12-094 (character) Monkey.D.Dragon —
  //   [On Play] You may place 3 {Revolutionary Army} type cards from your trash at the bottom of your deck
  //   in any order: If your Leader has the {Revolutionary Army} type, play up to 1 Character card with a
  //   cost of 6 or less from your trash.
  // NOTE: not yet implemented (needs template).

  // OP12-095 — [On Play] Draw 1, trash 1. PARTIAL: static +4 cost clause deferred.
  { cardNumber: 'OP12-095', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // OP12-096 — [Main] K.O. up to 1 opp Character cost ≤4. [Trigger] Draw 1, trash 1 from top of deck. PARTIAL: the 8-cost upgrade is deferred.
  {
    cardNumber: 'OP12-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },

  // OP12-097 — [Main]/[Trigger] Look 3, reveal up to 1 {Revolutionary Army} to hand, trash the rest (exclude-name dropped).
  {
    cardNumber: 'OP12-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, remainder: 'trash' }] } },
    ],
  },

  // OP12-098 (event) Hair Removal Fist —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   you have a {Revolutionary Army} type Character with a cost of 8 or more, that card gains an
  //   additional +2000 power during this battle. [Trigger] Draw 1 card and trash 1 card from the top of
  //   your deck.
  // NOTE: not yet implemented (needs template).

  // OP12-099 (character) Kalgara —
  //   [Your Turn] When a card is removed from your or your opponent's Life cards, draw 1 card. Then, you
  //   cannot draw cards using your own effects during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-100 — [On Play] add 1 top Life to hand → Draw 2, trash 1. PARTIAL: static [Blocker]/+3 cost clause deferred.
  { cardNumber: 'OP12-100', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 1, ifPrevious: 'previousMovedAny' }] } },

  // OP12-101 (character) Jewelry Bonney —
  //   [Activate: Main] You may rest this Character: Your {Supernovas} type Leader gains +1000 power until
  //   the end of your opponent's next turn. [Trigger] If your Leader has the {Supernovas} type, play this
  //   card.
  // NOTE: not yet implemented (needs template).

  // OP12-102 (character) Shirahoshi —
  //   If your Character with a base cost of 6 or less would be removed from the field by your opponent's
  //   effect, you may turn 1 card from the top of your Life cards face-up instead.[Opponent's Turn] If you
  //   have no other [Shirahoshi] with a base cost of 2, all of your {Neptunian} type Characters gain +2000
  //   power.
  // NOTE: not yet implemented (needs template).

  // OP12-104 — [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP12-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP12-105 (character) Trafalgar Lammy —
  //   [Your Turn] [On Play] Up to 1 of your [Trafalgar Law] cards gains +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP12-107 — static: if ≤2 Life, this Character gains [Rush]. [On K.O.] add top of deck to top of Life.
  {
    cardNumber: 'OP12-107',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
    ],
  },

  // OP12-108 - [On Play] Look at 5; add up to 1 [Trafalgar Law].
  {
    cardNumber: 'OP12-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Trafalgar Law' } }] },
  },

  // OP12-109 — [Trigger] K.O. up to 1 opp Character cost ≤1. PARTIAL: "add this card to your hand" self-return deferred.
  { cardNumber: 'OP12-109', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // OP12-112 — [Trigger] If Leader multicolored, draw 2.
  { cardNumber: 'OP12-112', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP12-113 — [Trigger] K.O. up to 1 opp Character cost ≤1. PARTIAL: [On K.O.] play-rested and self-return are deferred.
  { cardNumber: 'OP12-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // OP12-115 — [Counter] up to 1 Leader/Char +2000 this battle. PARTIAL: the "≤2 Life → recur [Law]" rider is deferred.
  { cardNumber: 'OP12-115', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },

  // OP12-116 — [Main] Look 5, reveal up to 2 {Shandian Warrior}/[Mont Blanc Noland] to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP12-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Shandian Warrior' }, { name: 'Mont Blanc Noland' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP12-117 (event) Slam Gibson —
  //   [Main] You may rest 5 of your DON!! cards: If your Leader has the {Supernovas} type, add up to 1
  //   Character with a cost of 9 or less to the top or bottom of the owner's Life cards face-down.[Counter]
  //   Your Leader gains +3000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP12-118 (character) Jewelry Bonney —
  //   [Blocker][On Play] If you have 8 or more rested cards, draw 2 cards and trash 1 card from your hand.
  //   Then, set up to 1 of your DON!! cards as active.
  // NOTE: not yet implemented (needs template).

  // OP12-119 (character) Bartholomew Kuma —
  //   [On Play] You may trash 1 card from your hand: Add up to 1 card from the top of your deck to the top
  //   of your Life cards. Then, this Character gains +2 cost until the end of your opponent's next End
  //   Phase.[Opponent's Turn] [On K.O.] Add up to 1 card from the top of your deck to the top of your Life
  //   cards.
  // NOTE: not yet implemented (needs template).
];
