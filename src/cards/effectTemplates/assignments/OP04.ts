/**
 * Reviewed effect template assignments - Main Booster OP04.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP04_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP04-001 (leader) Nefeltari Vivi —
  //   PARTIAL: the static "cannot attack" lock is implemented below; the activated power-and-play ability remains deferred.
  { cardNumber: 'OP04-001', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },

  //   your hand. Then, place the rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP04 coverage batch: base-power targeting, trigger-play, and simple activated draw.
  { cardNumber: 'OP04-003', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },

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

  { cardNumber: 'OP04-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Animal', maxPower: 3000 } }] } },

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

  //   Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // OP04-025 — [On Your Opponent's Attack] rest 2 DON!!: rest up to 1 opp Character cost<=4.
  { cardNumber: 'OP04-025', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

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

  {
    cardNumber: 'OP04-036',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
    ],
  },

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

  //   in any order.
  // NOTE: not yet implemented (needs template).

  // OP04-039 (leader) Rebecca —
  //   PARTIAL: the static "cannot attack" lock is implemented below; the activated life-to-play ability remains deferred.
  { cardNumber: 'OP04-039', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },

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

  { cardNumber: 'OP04-046', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'searchTopDeck', look: 7, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Plague Rounds' }, { name: 'Ice Oni' }] }, remainder: 'bottom' }] } },

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

  // OP04-050 — [Activate: Main] trash 1 from hand + rest this: draw 1.
  { cardNumber: 'OP04-050', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'draw', amount: 1 }] } },

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

  { cardNumber: 'OP04-059', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'duringThisTurn' }] } },

  { cardNumber: 'OP04-061', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  { cardNumber: 'OP04-063', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },

  // OP04-064 — [On Play] add 1 DON!! rested; then if 6+ DON!! draw 1. [Trigger] DON!! −2: play this.
  {
    cardNumber: 'OP04-064',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfDonFieldCount', atLeast: 6 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-066 — [On Play] look 5, reveal up to 1 "Baroque Works" type, add to hand, rest to bottom. [Trigger] DON!! −1: play this.
  {
    cardNumber: 'OP04-066',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Baroque Works' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP04-067 — [Blocker] [Trigger] DON!! −1: play this.
  { cardNumber: 'OP04-067', templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP04-064 (character) Ms. All Sunday —
  //   [On Play] Add up to 1 DON!! card from your DON!! deck and rest it. Then, if you have 6 or more DON!!
  //   cards on your field, draw 1 card. [Trigger] DON!! −2 (You may return the specified number of DON!!
  //   cards from your field to your DON!! deck.): Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-065 (character) Miss.Goldenweek(Marianne) —
  //   [On Play] If your Leader's type includes "Baroque Works", up to 1 of your opponent's Characters with
  //   a cost of 5 or less cannot attack until the start of your next turn. [Trigger] DON!! −1 (You may
  //   return the specified number of DON!! cards from your field to your DON!! deck.): Play this card.
  { cardNumber: 'OP04-065', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'untilStartOfNextTurn', optional: true }] } },

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

  // OP04-080 (character) Gyats —
  //   [On Play] Up to 1 of your {Dressrosa} type Characters can also attack active Characters during this turn.
  { cardNumber: 'OP04-080', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, keyword: 'canAttackActive', duration: 'duringThisTurn', optional: true }] } },

  // OP04-081 (character) Cavendish —
  //   PARTIAL: the [DON!! x1] active-Character attack grant is implemented below; the attack-triggered K.O. line remains deferred.
  { cardNumber: 'OP04-081', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackActive', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },

  // OP04-083 — [Blocker] [On Play] none of your Characters can be K.O.'d by effects until start of next turn; then draw 2 and trash 2.
  { cardNumber: 'OP04-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'koImmunityControllerCharactersAll', scope: 'effect', duration: 'untilStartOfNextTurn' }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  {
    cardNumber: 'OP04-085',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Dressrosa' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },

  //   opponent's Characters with a cost of 1 or less. Then, trash 2 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP04-090 (character) Monkey.D.Luffy —
  //   PARTIAL: the static active-Character attack grant is implemented below; the recycle-to-set-active line remains deferred.
  { cardNumber: 'OP04-090', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackActive', duration: 'permanent' }] } },

  // OP04-092 - [On Play] Look at 3; add Dressrosa other than this card's name, trash rest.
  {
    cardNumber: 'OP04-092',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa', excludeSelfName: true }, remainder: 'trash' }] },
  },

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

  { cardNumber: 'OP04-097', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { anyOfTypes: ['Animal', 'SMILE'], maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'top', faceUp: true }, optional: true }] } },

  //   add 1 card from the top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  // OP04-099 (character) Olin —
  //   Also treat this card's name as [Charlotte Linlin] according to the rules. [Trigger] If you have 1 or
  //   less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-100 (character) Capone"Gang"Bege —
  //   [Trigger] Up to 1 of your opponent's Leader or Character cards cannot attack during this turn.
  { cardNumber: 'OP04-100', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'preventAttack', target: { group: 'leaderOrCharacters', player: 'opponent' }, duration: 'duringThisTurn', optional: true }] } },

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

  // OP04-104 — [Blocker] [Trigger] trash 1 from hand: play this.
  { cardNumber: 'OP04-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },

  // OP04-104 (character) Sanji —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.) [Trigger] You may trash 1 card from your hand: Play this card.
  // NOTE: not yet implemented (needs template).

  // OP04-105 — [Activate: Main] [Once Per Turn] you may trash 1 card with a [Trigger] from hand: rest up to 1 opp Character cost<=2.
  { cardNumber: 'OP04-105', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  { cardNumber: 'OP04-109', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  //   Character cards gains +3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP04-110 — [Blocker] [On K.O.] Add up to 1 opp Character cost<=3 to the top or bottom of opponent's Life face-up.
  { cardNumber: 'OP04-110', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

  //   this Character: Set up to 1 of your [Charlotte Linlin] Characters as active. [Trigger] Play this
  //   card.
  // NOTE: not yet implemented (needs template).

  // OP04-112 (character) Yamato —
  //   [On Play] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the total of
  //   your and your opponent's Life cards. Then, if you have 1 or less Life cards, add up to 1 card from
  //   the top of your deck to the top of your Life cards.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP04-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

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

];
