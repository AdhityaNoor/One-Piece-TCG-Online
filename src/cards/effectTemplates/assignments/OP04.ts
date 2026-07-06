/**
 * Reviewed effect template assignments - Main Booster OP04.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP04_ASSIGNMENTS: CardEffectAssignment[] = [
  // OP04-001 (leader) Nefeltari Vivi —
  //   This Leader cannot attack.[Activate: Main] [Once Per Turn] ➁ (You may rest the specified number of
  //   DON!! cards in your cost area.): Draw 1 card and up to 1 of your Characters gains [Rush] during this
  //   turn.(This card can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // OP04-002 (character) Igaram —
  //   [Activate: Main] You may rest this Character and give your 1 active Leader −5000 power during this
  //   turn: Look at 5 cards from the top of your deck; reveal up to 1 {Alabasta} type card and add it to
  //   your hand. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP04 coverage batch: base-power targeting, trigger-play, and simple activated draw.
  { cardNumber: 'OP04-003', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },

  // OP04-004 (character) Karoo —
  //   [Activate: Main] You may rest this Character: Give up to 1 rested DON!! card to each of your
  //   {Alabasta} type Characters.
  // NOTE: not yet implemented (needs template).

  // OP04-005 (character) Kung Fu Jugon —
  //   If you have a [Kung Fu Jugon] other than this Character, this Character gains [Blocker].(After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP04-006 (character) Koza —
  //   [When Attacking] You may give your 1 active Leader −5000 power during this turn: This Character gains
  //   +2000 power until the start of your next turn.
  // NOTE: not yet implemented (needs template).

  // ── Triage batch (OP04 expressible): Alabasta/Dressrosa/Wano lines. ────────
  // OP04-008 Chaka — [DON!! x1][When Attacking] If Leader [Nefeltari Vivi]: −3000 to 1 opp, then K.O. one at 0 power or less.
  { cardNumber: 'OP04-008', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true }] } },

  // OP04-009 (character) Super Spot-Billed Duck Troops —
  //   [When Attacking] You may give your 1 active Leader −5000 power during this turn: Return this
  //   Character to the owner's hand at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-010 Tony Tony.Chopper — [On Play] Play up to 1 {Animal} Character with base power 3000 or less from hand.
  { cardNumber: 'OP04-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Animal', maxPower: 3000 } }] } },

  // OP04-011 (character) Nami —
  //   [When Attacking] Reveal 1 card from the top of your deck. If the revealed card is a Character card
  //   with 6000 power or more, this Character gains +3000 power during this turn. Then, place the revealed
  //   card at the bottom of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-012 (character) Nefeltari Cobra —
  //   [Your Turn] All of your {Alabasta} type Characters other than this Character gain +1000 power.
  // NOTE: not yet implemented (needs template).

  // OP04-013 Pell — [DON!! x1][When Attacking] K.O. up to 1 opp Character with 4000 power or less.
  { cardNumber: 'OP04-013', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },

  // OP04-015 Roronoa Zoro — [On Play] Give up to 1 opp Character −2000 power this turn.
  { cardNumber: 'OP04-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP04-016 Bad Manners Kick Course — [Counter] trash 1 → +3000 battle. [Trigger] give 1 opp Leader/Char −3000 this turn.
  {
    cardNumber: 'OP04-016',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP04-017 Happiness Punch — [Counter] give up to 1 opp Leader/Char −2000 this turn.
  //   PARTIAL: the "if your Leader is active, −1000 more" rider needs a leader-active gate (deferred).
  { cardNumber: 'OP04-017', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP04-018 Enchanting Vertigo Dance — [Main]/[Trigger] If Leader {Alabasta}: give up to 2 opp Characters −2000 this turn.
  {
    cardNumber: 'OP04-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
    ],
  },

  // OP04-019 Donquixote Doflamingo (leader) — [End of Your Turn] Set up to 2 DON!! active.
  { cardNumber: 'OP04-019', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP04-020 (leader) Issho —
  //   [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost.[End of Your Turn] ➀ (You may
  //   rest the specified number of DON!! cards in your cost area.): Set up to 1 of your Characters with a
  //   cost of 5 or less as active.
  // NOTE: not yet implemented (needs template).

  // OP04-021 — [On Your Opponent's Attack] rest 2 DON!!: rest up to 1 of opponent's DON!!.
  { cardNumber: 'OP04-021', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'restOpponentDon', maxTargets: 1 }] } },

  // OP04-022 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  {
    cardNumber: 'OP04-022',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] },
  },

  // OP04-024 (character) Sugar —
  //   [Opponent's Turn] [Once Per Turn] When your opponent plays a Character, if your Leader has the
  //   {Donquixote Pirates} type, rest up to 1 of your opponent's Characters. Then, rest this Character.[On
  //   Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // OP04-025 — [On Your Opponent's Attack] rest 2 DON!!: rest up to 1 opp Character cost<=4.
  { cardNumber: 'OP04-025', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP04-026 (character) Senor Pink —
  //   [When Attacking] ➀ (You may rest the specified number of DON!! cards in your cost area.): If your
  //   Leader has the {Donquixote Pirates} type, rest up to 1 of your opponent's Characters with a cost of 4
  //   or less. Then, set up to 1 of your DON!! cards as active at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-027 Daddy Masterson — [DON!! x1][End of Your Turn] Set this Character active.
  { cardNumber: 'OP04-027', templateId: 'ability', params: { timing: 'endOfTurn', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'setActiveSelf' }] } },

  // OP04-028 (character) Diamante —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[DON!! x1] [End of Your Turn] If you have 2 or more active DON!! cards, set this
  //   Character as active.
  // NOTE: not yet implemented (needs template).

  // OP04-029 Dellinger — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'OP04-029', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP04-030 Trebol — [On Play] K.O. up to 1 opp rested Character with a cost of 5 or less.
  //   (The [On Your Opponent's Attack] rest clause needs an onOpponentAttack timing — deferred.)
  { cardNumber: 'OP04-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] } },

  // OP04-033 (character) Machvise —
  //   [On Play] If your Leader has the {Donquixote Pirates} type, rest up to 1 of your opponent's
  //   Characters with a cost of 5 or less. Then, set up to 1 of your DON!! cards as active at the end of
  //   this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-034 (character) Lao.G —
  //   [End of Your Turn] If you have 3 or more active DON!! cards, K.O. up to 1 of your opponent's rested
  //   Characters with a cost of 3 or less.
  // NOTE: not yet implemented (needs template).

  // OP04-035 Spiderweb — [Counter] +4000 battle, then set up to 1 of your Characters active. [Trigger] Leader +2000 this turn.
  {
    cardNumber: 'OP04-035',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'setActiveControllerCharacter', maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'duringThisTurn' }] } },
    ],
  },

  // OP04-036 Donquixote Family — [Counter]/[Trigger] Look at 5; reveal up to 1 {Donquixote Pirates} to hand, rest to bottom.
  {
    cardNumber: 'OP04-036',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
    ],
  },

  // OP04-037 Flapping Thread — [Counter] If Leader {Donquixote Pirates}: +2000 this turn. [Trigger] K.O. 1 opp rested Char cost ≤4.
  {
    cardNumber: 'OP04-037',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP04-038 The Weak Do Not Have the Right... — [Main]/[Counter] Rest 1 opp Leader/Char, then K.O. 1 opp rested Char cost ≤6. [Trigger] Set up to 5 DON!! active.
  {
    cardNumber: 'OP04-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerDon', maxTargets: 5 }] } },
    ],
  },

  // OP04-039 (leader) Rebecca —
  //   This Leader cannot attack.[Activate: Main] [Once Per Turn] ➀ (You may rest the specified number of
  //   DON!! cards in your cost area.): If you have 6 or less cards in your hand, look at 2 cards from the
  //   top of your deck; reveal up to 1 {Dressrosa} type card and add it to your hand. Then, trash the rest.
  // NOTE: not yet implemented (needs template).

  // OP04-040 (leader) Queen —
  //   [DON!! x1] [When Attacking] If you have a total of 4 or less cards in your Life area and hand, draw 1
  //   card. If you have a Character with a cost of 8 or more, you may add up to 1 card from the top of your
  //   deck to the top of your Life cards instead of drawing 1 card.
  // NOTE: not yet implemented (needs template).

  // OP04-041 (character) Apis —
  //   [On Play] You may trash 2 cards from your hand: Look at 5 cards from the top of your deck; reveal up
  //   to 1 {East Blue} type card and add it to your hand. Then, place the rest at the bottom of your deck
  //   in any order.
  // NOTE: not yet implemented (needs template).

  // OP04-042 (character) Ipponmatsu —
  //   [On Play] Up to 1 of your <Slash> attribute Characters gains +3000 power during this turn. Then,
  //   trash 1 card from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-043 (character) Ulti —
  //   [DON!! x1] [When Attacking] Return up to 1 Character with a cost of 2 or less to the owner's hand or
  //   the bottom of their deck.
  // NOTE: not yet implemented (needs template).

  // OP04-044 Kaido — [On Play] Return up to 1 Character cost ≤8 and up to 1 Character cost ≤3 to the owner's hand.
  { cardNumber: 'OP04-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP04-045 — [On Play] Draw 1 card.
  { cardNumber: 'OP04-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP04-046 (character) Queen —
  //   [On Play] If your Leader has the {Animal Kingdom Pirates} type, look at 7 cards from the top of your
  //   deck; reveal a total of up to 2 [Plague Rounds] or [Ice Oni] cards and add them to your hand. Then,
  //   place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP04-047 (character) Ice Oni —
  //   [Your Turn] At the end of a battle in which this Character battles your opponent's Character with a
  //   cost of 5 or less, place the opponent's Character you battled with at the bottom of the owner's deck.
  // NOTE: not yet implemented (needs template).

  // OP04-048 (character) Sasaki —
  //   [On Play] Return all cards in your hand to your deck and shuffle your deck. Then, draw cards equal to
  //   the number you returned to your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-049 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP04-049', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP04-050 (character) Hanger —
  //   [Activate: Main] You may trash 1 card from your hand and rest this Character: Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP04-051 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP04-051',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } }] },
  },

  {
    cardNumber: 'OP04-052',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }, { kind: 'restThis' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-053 (character) Page One —
  //   [DON!! x1] [Once Per Turn] When you activate an Event, draw 1 card. Then, place 1 card from your hand
  //   at the bottom of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-055 (event) Plague Rounds —
  //   [Main] You may trash 1 [Ice Oni] from your hand and place 1 Character with a cost of 4 or less at the
  //   bottom of the owner's deck: Play 1 [Ice Oni] from your trash. [Trigger] Activate this card's [Main]
  //   effect.
  // NOTE: not yet implemented (needs template).

  // OP04-056 Gum-Gum Red Roc — [Main] Place up to 1 Character at bottom of owner's deck. [Trigger] cost ≤4.
  {
    cardNumber: 'OP04-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP04-057 Dragon Twister Demolition Breath — [Counter] +4000 battle, then place 1 Char cost ≤1 at bottom of deck. [Trigger] return 1 Char cost ≤6 to hand.
  {
    cardNumber: 'OP04-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP04-058 (leader) Crocodile —
  //   [Opponent's Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck by
  //   your effect, add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP04-059 — [On Your Opponent's Attack] DON!! −1: If Leader {Water Seven}, this Character gains [Blocker] this turn.
  { cardNumber: 'OP04-059', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'duringThisTurn' }] } },

  // OP04-060 (character) Crocodile —
  //   [On Play] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): If your Leader's type includes "Baroque Works", add up to 1 card from the top of your deck to
  //   the top of your Life cards.[On Your Opponent's Attack] [Once Per Turn] DON!! −1: Draw 1 card and
  //   trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP04-063 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: If Leader {Water Seven}, up to 1 Leader/Character +1000 battle.
  { cardNumber: 'OP04-063', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },

  // OP04-064 (character) Ms. All Sunday —
  //   [On Play] Add up to 1 DON!! card from your DON!! deck and rest it. Then, if you have 6 or more DON!!
  //   cards on your field, draw 1 card. [Trigger] DON!! −2 (You may return the specified number of DON!!
  //   cards from your field to your DON!! deck.): Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-065 (character) Miss.Goldenweek(Marianne) —
  //   [On Play] If your Leader's type includes "Baroque Works", up to 1 of your opponent's Characters with
  //   a cost of 5 or less cannot attack until the start of your next turn. [Trigger] DON!! −1 (You may
  //   return the specified number of DON!! cards from your field to your DON!! deck.): Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-066 (character) Miss.Valentine(Mikita) —
  //   [On Play] Look at 5 cards from the top of your deck; reveal up to 1 card with a type including
  //   "Baroque Works" and add it to your hand. Then, place the rest at the bottom of your deck in any
  //   order. [Trigger] DON!! −1 (You may return the specified number of DON!! cards from your field to your
  //   DON!! deck.): Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-067 (character) Miss.MerryChristmas(Drophy) —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.) [Trigger] DON!! −1 (You may return the specified number of DON!! cards from your
  //   field to your DON!! deck.): Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-068 (character) Yokozuna —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Your Opponent's Attack] DON!! −1 (You may return the specified number of DON!!
  //   cards from your field to your DON!! deck.): Return up to 1 of your opponent's Characters with a cost
  //   of 2 or less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP04-069 (character) Mr.2.Bon.Kurei(Bentham) —
  //   [On Your Opponent's Attack] DON!! −1 (You may return the specified number of DON!! cards from your
  //   field to your DON!! deck.): This Character's base power becomes the same as the power of your
  //   opponent's attacking Leader or Character during this turn. [Trigger] DON!! −1: Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-070 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: give up to 1 opp Character −1000 this turn.
  { cardNumber: 'OP04-070', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP04-071 — [On Your Opponent's Attack] DON!! −1: this Character gains [Blocker] and +1000 battle.
  { cardNumber: 'OP04-071', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'duringThisBattle' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' },
  ] } },

  // OP04-072 — [On Your Opponent's Attack] [Once Per Turn] DON!! −2 + rest this: K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'OP04-072', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 2 }, { kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP04-073 (character) Mr.13 & Ms.Friday —
  //   [Activate: Main] You may trash this Character and 1 of your Characters with a type including "Baroque
  //   Works": Add up to 1 DON!! card from your DON!! deck and set it as active. [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-074 Colors Trap — [Counter] DON!! −1: +1000 battle, then rest 1 opp Char cost ≤4. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-074',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP04-075 Nez-Palm Cannon — [Counter] +6000 battle, then if ≤2 Life add 1 DON!! (rested). [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-075',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 6000, duration: 'duringThisBattle', optional: true }, { fn: 'addDonFromDeck', count: 1, rested: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP04-076 Weakness...Is an Unforgivable Sin. — [Counter] DON!! −1: +1000 this turn. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-076',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP04-079 (character) Orlumbus —
  //   [Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −4 cost during this turn
  //   and trash 2 cards from the top of your deck. Then, K.O. 1 of your {Dressrosa} type Characters.
  // NOTE: not yet implemented (needs template).

  // OP04-080 (character) Gyats —
  //   [On Play] Up to 1 of your {Dressrosa} type Characters can also attack active Characters during this
  //   turn.
  // NOTE: not yet implemented (needs template).

  // OP04-081 (character) Cavendish —
  //   [DON!! x1] This Character can also attack active Characters.[When Attacking] You may rest your
  //   Leader: K.O. up to 1 of your opponent's Characters with a cost of 1 or less. Then, trash 2 cards from
  //   the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-082 (character) Kyros —
  //   If this Character would be K.O.'d, you may rest your Leader or 1 [Corrida Coliseum] instead.[On Play]
  //   If your Leader is [Rebecca], K.O. up to 1 of your opponent's Characters with a cost of 1 or less.
  //   Then, trash 1 card from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-083 (character) Sabo —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] None of your Characters can be K.O.'d by effects until the start of your
  //   next turn. Then, draw 2 cards and trash 2 cards from your hand.
  // NOTE: not yet implemented (needs template).

  // OP04-084 (character) Stussy —
  //   [On Play] Look at 3 cards from the top of your deck and play up to 1 Character card with a type
  //   including "CP" other than [Stussy] and a cost of 2 or less. Then, trash the rest.
  // NOTE: not yet implemented (needs template).

  // OP04-086 (character) Chinjao —
  //   [DON!! x1] When this Character battles and K.O.'s your opponent's Character, draw 2 cards and trash 2
  //   cards from your hand.
  // NOTE: not yet implemented (needs template).

  // OP04-088 (character) Hajrudin —
  //   [Activate: Main] You may rest your 1 Leader: Give up to 1 of your opponent's Characters −4 cost
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-090 (character) Monkey.D.Luffy —
  //   This Character can also attack active Characters.[Activate: Main] [Once Per Turn] You may return 7
  //   cards from your trash to the bottom of your deck in any order: Set this Character as active. Then,
  //   this Character will not become active in your next Refresh Phase.
  // NOTE: not yet implemented (needs template).

  // OP04-091 (character) Leo —
  //   [On Play] You may rest your 1 Leader: If your Leader has the {Dressrosa} type, K.O. up to 1 of your
  //   opponent's Characters with a cost of 1 or less. Then, trash 2 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-092 - [On Play] Look at 3; add Dressrosa other than this card's name, trash rest.
  {
    cardNumber: 'OP04-092',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP04-093 Gum-Gum King Kong Gun — [Main] up to 1 {Dressrosa} Character +6000 this turn. [Trigger] draw 3, trash 2.
  //   PARTIAL: the "if 15+ trash, that card gains [Double Attack]" rider needs a trash-count gate (deferred).
  {
    cardNumber: 'OP04-093',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 6000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
    ],
  },

  // OP04-094 Trueno Bastardo — [Main] K.O. up to 1 opp Character cost ≤4.
  //   PARTIAL: the "if 15+ trash, cost ≤6 instead" upgrade (trash gate) and the [Trigger] "rest your Leader: K.O." (rest-leader cost) are deferred.
  { cardNumber: 'OP04-094', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP04-095 (event) Barrier!! —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   you have 15 or more cards in your trash, that card gains an additional +2000 power during this
  //   battle. [Trigger] Draw 2 cards and trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP04-096 (stage) Corrida Coliseum —
  //   If your Leader has the {Dressrosa} type, your {Dressrosa} type Characters can attack Characters on
  //   the turn in which they are played.
  // NOTE: not yet implemented (needs template).

  // OP04-097 — [On Play] Add up to 1 opp {Animal}/{SMILE} Character cost<=3 to the top of opponent's Life face-up.
  { cardNumber: 'OP04-097', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { anyOfTypes: ['Animal', 'SMILE'], maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'top', faceUp: true }, optional: true }] } },

  // OP04-098 (character) Toko —
  //   [On Play] You may trash 2 {Land of Wano} type cards from your hand: If you have 1 or less Life cards,
  //   add 1 card from the top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // OP04-099 (character) Olin —
  //   Also treat this card's name as [Charlotte Linlin] according to the rules. [Trigger] If you have 1 or
  //   less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-100 (character) Capone"Gang"Bege —
  //   [Trigger] Up to 1 of your opponent's Leader or Character cards cannot attack during this turn.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP04-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },

  // OP04-102 (character) Kin'emon —
  //   [Activate: Main] [Once Per Turn] ➀ (You may rest the specified number of DON!! cards in your cost
  //   area.) You may add 1 card from the top or bottom of your Life cards to your hand: Set this Character
  //   as active.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP04-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-104 (character) Sanji —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.) [Trigger] You may trash 1 card from your hand: Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-105 — [Activate: Main] [Once Per Turn] you may trash 1 card with a [Trigger] from hand: rest up to 1 opp Character cost<=2.
  { cardNumber: 'OP04-105', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP04-106 (character) Charlotte Bavarois —
  //   [DON!! x1] If you have less Life cards than your opponent, this Character gains +1000 power.
  //   [Trigger] You may trash 1 card from your hand: Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-108 (character) Charlotte Moscato —
  //   [DON!! x1] This Character gains [Banish].(When this card deals damage, the target card is trashed
  //   without activating its Trigger.) [Trigger] You may trash 1 card from your hand: Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-109 (character) Tonoyasu —
  //   [Activate: Main] You may trash this Character: Up to 1 of your {Land of Wano} type Leader or
  //   Character cards gains +3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-110 — [Blocker] [On K.O.] Add up to 1 opp Character cost<=3 to the top or bottom of opponent's Life face-up.
  { cardNumber: 'OP04-110', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

  // OP04-111 (character) Hera —
  //   [Activate: Main] You may trash 1 of your {Homies} type Characters other than this Character and rest
  //   this Character: Set up to 1 of your [Charlotte Linlin] Characters as active. [Trigger] Play this
  //   card.
  // NOTE: not yet implemented (needs template).

  // OP04-112 (character) Yamato —
  //   [On Play] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the total of
  //   your and your opponent's Life cards. Then, if you have 1 or less Life cards, add up to 1 card from
  //   the top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP04-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP04-115 Gun Modoki — [Main] add 1 top/bottom Life to hand → up to 1 {Land of Wano} Character gains [Double Attack] this turn. [Trigger] Leader/Char +1000 this turn.
  {
    cardNumber: 'OP04-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP04-116 Diable Jambe Joue Shot — [Counter] +6000 battle. [Trigger] draw 1.
  //   PARTIAL: the "if combined Life ≤4, K.O. 1 opp Char cost ≤2" rider needs a combined-Life gate (deferred).
  {
    cardNumber: 'OP04-116',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 6000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP04-117 — (Event) [Main] Add up to 1 opp Character cost<=3 to top or bottom of opponent's Life face-up. [Trigger] add 1 top/bottom Life to hand: add up to 1 from hand to top of Life.
  {
    cardNumber: 'OP04-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
      ] } },
    ],
  },

  // OP04-118 (character) Nefeltari Vivi —
  //   All of your red Characters with a cost of 3 or more other than this Character gain [Rush].(This card
  //   can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // OP04-119 (character) Donquixote Rosinante —
  //   [Opponent's Turn] If this Character is rested, your active Characters with a base cost of 5 cannot be
  //   K.O.'d by effects.[On Play] You may rest this Character: Play up to 1 green Character card with a
  //   cost of 5 from your hand.
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'OP04-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'leaderOrCharacters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 3 }] } },
  { cardNumber: 'OP04-032', templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
  { cardNumber: 'OP04-061', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  {
    cardNumber: 'OP04-085',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },
];
