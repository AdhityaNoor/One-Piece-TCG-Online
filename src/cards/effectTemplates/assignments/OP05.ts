/**
 * Reviewed effect template assignments - Main Booster OP05.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP05_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP05-001 (leader) Sabo —
  //   [DON!! x1] [Opponent's Turn] [Once Per Turn] If your Character with 5000 power or more would be
  //   K.O.'d, you may give that Character −1000 power during this turn instead of that Character being
  //   K.O.'d.
  // NOTE: not yet implemented (needs template).

  // OP05-002 (leader) Belo Betty —
  //   [Activate: Main] [Once Per Turn] You may trash 1 {Revolutionary Army} type card from your hand: Up to
  //   3 of your {Revolutionary Army} type Characters or Characters with a [Trigger] gain +3000 power during
  //   this turn.
  // NOTE: not yet implemented (needs template).

  // OP05-003 (character) Inazuma —
  //   If you have a Character with 7000 power or more other than this Character, this Character gains
  //   [Rush].(This card can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // OP05-004 (character) Emporio.Ivankov —
  //   [Activate: Main] [Once Per Turn] If this Character has 7000 power or more, play up to 1
  //   {Revolutionary Army} type Character card with 5000 power or less other than [Emporio.Ivankov] from
  //   your hand.
  // NOTE: not yet implemented (needs template).

  // ── Triage batch (OP05 expressible): Revolutionary Army / Donquixote / Kid / DON!!-ramp lines. ──
  // OP05-005 Belo Betty — [On Play] If Leader {Revolutionary Army}: give up to 1 opp Leader/Char −1000 this turn.
  //   PARTIAL: the [When Attacking] "if this Character has 7000+ power" rider needs a self-power gate (deferred).
  { cardNumber: 'OP05-005', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP05-006 — [On Play] If Leader {Revolutionary Army}: give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP05-006', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP05-007 (character) Sabo —
  //   [On Play] K.O. up to 2 of your opponent's Characters with a total power of 4000 or less.
  // NOTE: not yet implemented (needs template).

  // OP05-008 — [DON!! x1][Activate: Main][Once Per Turn] Give up to 2 rested DON!! to your Leader or 1 Character.
  { cardNumber: 'OP05-008', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP05-009 (character) Toh-Toh —
  //   [On Play] Draw 1 card if your Leader has 0 power or less.
  // NOTE: not yet implemented (needs template).

  // OP05-010 — [On Play] K.O. up to 1 of your opponent's Characters with 1000 power or less.
  { cardNumber: 'OP05-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 1000 } }, optional: true }] } },

  // OP05-011 — [On Play] K.O. up to 1 opp Character with 2000 power or less. [Trigger] If Leader multicolored, play this card.
  {
    cardNumber: 'OP05-011',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP05-014 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  { cardNumber: 'OP05-014', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP05-015 — [On Play] Look at 5; add up to 1 Revolutionary Army (excl. same name).
  {
    cardNumber: 'OP05-015',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army', excludeSelfName: true } }] },
  },

  // OP05-016 (character) Morley —
  //   [When Attacking] If this Character has 7000 power or more, your opponent cannot activate [Blocker]
  //   during this battle. [Trigger] You may trash 1 card from your hand: If your Leader is multicolored,
  //   play this card.
  // NOTE: not yet implemented (needs template).

  // OP05-017 (character) Lindbergh —
  //   [When Attacking] If this Character has 7000 power or more, K.O. up to 1 of your opponent's Characters
  //   with 3000 power or less. [Trigger] You may trash 1 card from your hand: If your Leader is
  //   multicolored, play this card.
  // NOTE: not yet implemented (needs template).

  // OP05 coverage batch: movement, search, DON!! -N, play-from-hand, and gated draw.
  {
    cardNumber: 'OP05-018',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000 } }] } },
    ],
  },

  // OP05-019 Fire Fist — [Main]/[Trigger] give up to 1 opp Char −4000 this turn, then if ≤2 Life K.O. one at 0 power or less.
  {
    cardNumber: 'OP05-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
    ],
  },

  {
    cardNumber: 'OP05-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP05-021 (stage) — [Activate: Main] rest this Stage + trash 1 hand: Look 3, reveal up to 1 {Revolutionary Army} to hand, rest to bottom.
  { cardNumber: 'OP05-021', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, ifPrevious: 'previousMovedAny' }] } },

  // OP05-022 (leader) Donquixote Rosinante —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[End of Your Turn] If you have 6 or less cards in your hand, set this Leader as
  //   active.
  // NOTE: not yet implemented (needs template).

  // OP05-023 — [DON!! x1][When Attacking] K.O. up to 1 opp rested Character cost ≤3.
  { cardNumber: 'OP05-023', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },

  // OP05-025 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  {
    cardNumber: 'OP05-025',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  },

  // OP05-119 (character) Monkey.D.Luffy —
  //   [On Play] DON!! −10: Place all of your Characters except this Character at the bottom of your deck in
  //   any order. Then, take an extra turn after this one.[Activate: Main] [Once Per Turn] ➀: Add up to 1
  //   DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // --- codegen batch ---
  { cardNumber: 'OP05-027', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  { cardNumber: 'OP05-028', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] } },

  // OP05-026 (character) Sarquiss —
  //   [DON!! x1] [When Attacking] [Once Per Turn] You may rest 1 of your Characters with a cost of 3 or
  //   more: Set this Character as active.
  // NOTE: not yet implemented (needs template).

  // OP05-029 — [On Your Opponent's Attack] [Once Per Turn] rest 1 DON!!: rest up to 1 opp Character cost<=6.
  { cardNumber: 'OP05-029', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },

  // OP05-031 — [When Attacking] [Once Per Turn] If you have 2 or more rested Characters, set up to 1 of your rested Characters (cost 1) as active.
  { cardNumber: 'OP05-031', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { exactCost: 1, rested: true }, maxTargets: 1 }] } },

  // OP05-030 (character) Donquixote Rosinante —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[Opponent's Turn] If your rested Character would be K.O.'d, you may trash this
  //   Character instead.
  // NOTE: not yet implemented (needs template).

  // OP05-031 (character) Buffalo —
  //   [When Attacking] [Once Per Turn] If you have 2 or more rested Characters, set up to 1 of your rested
  //   Characters with a cost of 1 as active.
  // NOTE: not yet implemented (needs template).

  // OP05-032 (character) Pica —
  //   [End of Your Turn] ①: Set this Character as active.[Once Per Turn] If this Character would be K.O.'d,
  //   you may rest 1 of your Characters with a cost of 3 or more other than [Pica] instead.
  // NOTE: not yet implemented (needs template).

  // OP05-033 — [Activate: Main] rest 1 DON!! + rest this: play up to 1 {Donquixote Pirates} Character cost ≤2 from hand.
  { cardNumber: 'OP05-033', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates', maxCost: 2 } }] } },

  // OP05-034 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Donquixote Pirates} to hand, rest to bottom.
  { cardNumber: 'OP05-034', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },

  // OP05-036 — [Blocker][On Block] Rest up to 1 opp Character cost ≤4.
  { cardNumber: 'OP05-036', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP05-037 — [Counter] trash 1 → +3000 battle. [Trigger] Rest up to 1 opp Character cost ≤4.
  {
    cardNumber: 'OP05-037',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP05-038 — [Counter] +4000 battle, then trash 1 → set up to 3 DON!! active. [Trigger] Rest up to 1 opp Character cost ≤3.
  //   PARTIAL: trigger narrowed to opp Characters (the "or Leader" option is dropped — opp-leaderOrCharacters has no cost filter).
  {
    cardNumber: 'OP05-038',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'optionalTrashFromHand', count: 1 }, { fn: 'setActiveControllerDon', maxTargets: 3, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP05-039 — [Counter] +4000 battle, then K.O. up to 1 opp rested Char cost ≤3. [Trigger] K.O. up to 1 opp rested Char cost ≤5.
  {
    cardNumber: 'OP05-039',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] } },
    ],
  },

  // OP05-040 (stage) Birdcage —
  //   If your Leader is [Donquixote Doflamingo], all Characters with a cost of 5 or less do not become
  //   active in your and your opponent's Refresh Phases.[End of Your Turn] If you have 10 DON!! cards on
  //   your field, K.O. all rested Characters with a cost of 5 or less. Then, trash this Stage.
  // NOTE: not yet implemented (needs template).

  // OP05-041 (leader) — [Activate: Main][OPT] trash 1 → draw 1. [When Attacking] give up to 1 opp Char −1 cost this turn.
  {
    cardNumber: 'OP05-041',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP05-042 (character) Issho —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 7 or less cannot attack until the
  //   start of your next turn.
  // NOTE: not yet implemented (needs template).

  // OP05-043 (character) Ulti —
  //   [On Play] If your Leader is multicolored, look at 3 cards from the top of your deck and add up to 1
  //   card to your hand. Then, place the rest at the top or bottom of the deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP05-045 — [Activate: Main] rest this + trash 1 hand: place up to 1 Character cost ≤2 at bottom of deck.
  { cardNumber: 'OP05-045', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP05-046 — [On K.O.] Draw 1, then place 1 card from hand at bottom of deck.
  { cardNumber: 'OP05-046', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' } }] } },

  // OP05-047 — [Blocker][On Block] Draw 1 if ≤3 hand, then this Character +1000 this battle.
  { cardNumber: 'OP05-047', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 3 }] }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' }] } },

  { cardNumber: 'OP05-048', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  { cardNumber: 'OP05-049', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  { cardNumber: 'OP05-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 1 }] } },

  { cardNumber: 'OP05-051', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP05-053 (character) Mozambia —
  //   [Your Turn] [Once Per Turn] When you draw a card outside of your Draw Phase, this Character gains
  //   +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP05-054 — [On Play] Draw 2, then place 2 cards from hand at bottom of deck.
  { cardNumber: 'OP05-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },

  // OP05-055 — [Blocker][On Play] Look at 5, place them at top or bottom of deck in any order.
  { cardNumber: 'OP05-055', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // OP05-056 (character) X.Barrels —
  //   [On Play] You may place 1 of your Characters other than this Character at the bottom of your deck:
  //   Draw 1 card.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP05-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP05-058 (event) It's a Waste of Human Life!! —
  //   [Main] Place all Characters with a cost of 3 or less at the bottom of the owner's deck. Then, you and
  //   your opponent trash cards from your hands until you each have 5 cards in your hands. [Trigger] Place
  //   all Characters with a cost of 2 or less at the bottom of the owner's deck.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP05-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP05-060 (leader) Monkey.D.Luffy —
  //   [Activate: Main] [Once Per Turn] You may add 1 card from the top of your Life cards to your hand: If
  //   you have 0 or 3 or more DON!! cards on your field, add up to 1 DON!! card from your DON!! deck and
  //   set it as active.
  // NOTE: not yet implemented (needs template).

  // OP05-061 — [DON!! x1][When Attacking] If 8+ DON!!: rest up to 1 opp Character cost ≤4.
  { cardNumber: 'OP05-061', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP05-062 — if 10 DON!! on field, [Blocker]
  { cardNumber: 'OP05-062', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }] } }] } },

  // OP05-062 (character) O-Nami —
  //   If you have 10 DON!! cards on your field, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP05-063 — [On Play] If 8+ DON!!: K.O. up to 1 opp Character cost ≤3.
  { cardNumber: 'OP05-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP05-064 — [On Play] Look at 5; add up to 1 Kid Pirates (excl. same name).
  {
    cardNumber: 'OP05-064',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Kid Pirates', excludeSelfName: true } }] },
  },

  // OP05-066 — [Blocker][Opponent's Turn] If 10 DON!!: this Character +1000 (continuous, opponent's turn only).
  { cardNumber: 'OP05-066', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }] } }] } },

  { cardNumber: 'OP05-067', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  // OP05-068 (character) Chopa-Emon —
  //   [On Play] If you have 8 or more DON!! cards on your field, set up to 1 of your purple {Straw Hat
  //   Crew} type Characters with 6000 power or less as active.
  // NOTE: not yet implemented (needs template).

  // OP05-069 — [When Attacking] If opp has more DON!! than you: Look 5, reveal up to 1 {Heart Pirates} to hand, rest to bottom.
  { cardNumber: 'OP05-069', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Heart Pirates' } }] } },

  // OP05-070 — [DON!! x1] If 8+ DON!!: this Character gains [Rush].
  { cardNumber: 'OP05-070', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] } }] } },

  // OP05-071 — [When Attacking] If opp has more DON!! than you: give up to 1 opp Character −2000 this turn.
  { cardNumber: 'OP05-071', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP05-072 — [On Play] If 8+ DON!!: give up to 2 opp Characters −2000 this turn.
  { cardNumber: 'OP05-072', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },

  // OP05-073 — [On Play] trash 1 → add 1 DON!! (rested). [Trigger] DON!! −1: play this card.
  {
    cardNumber: 'OP05-073',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP05-074 (character) Eustass"Captain"Kid —
  //   [Blocker][Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck,
  //   add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP05-075 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: play up to 1 {Baroque Works} Character cost<=3 from hand.
  { cardNumber: 'OP05-075', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Baroque Works', maxCost: 3 } }] } },

  {
    cardNumber: 'OP05-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { typeIncludes: 'Kid Pirates' }, { typeIncludes: 'Heart Pirates' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { typeIncludes: 'Kid Pirates' }, { typeIncludes: 'Heart Pirates' }] } }] } },
    ],
  },

  {
    cardNumber: 'OP05-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  {
    cardNumber: 'OP05-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Kid Pirates' } }, amount: 5000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  { cardNumber: 'OP05-081', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true }] } },

  // OP05-079 (character) Viola —
  //   [On Play] Your opponent places 3 cards from their trash at the bottom of their deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP05-080 (character) Elizabello II —
  //   [When Attacking] [Once Per Turn] You may return 20 cards from your trash to your deck and shuffle it:
  //   This Character gains [Double Attack] and +10000 power during this battle.(This card deals 2 damage.)
  // NOTE: not yet implemented (needs template).

  // OP05-082 (character) Shirahoshi —
  //   [Activate: Main] You may rest this Character and place 2 cards from your trash at the bottom of your
  //   deck in any order: If your opponent has 6 or more cards in their hand, your opponent trashes 1 card
  //   from their hand.
  // NOTE: not yet implemented (needs template).

  // OP05-084 (character) Saint Charlos —
  //   [Your Turn] If the only Characters on your field are {Celestial Dragons} type Characters, give all of
  //   your opponent's Characters −4 cost.
  // NOTE: not yet implemented (needs template).

  // OP05-085 — [Blocker][On Play] Trash 1 card from the top of your deck.
  { cardNumber: 'OP05-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 1 }] } },

  // OP05-086 — if 10+ cards in trash, [Blocker]
  { cardNumber: 'OP05-086', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 10 }] } }] } },

  // OP05-086 (character) Nefeltari Vivi —
  //   If you have 10 or more cards in your trash, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP05-087 (character) Hakuba —
  //   [DON!! x1] [When Attacking] You may K.O. 1 of your Characters other than this Character: Give up to 1
  //   of your opponent's Characters −5 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // OP05-088 (character) Mansherry —
  //   [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may rest
  //   this Character and place 2 cards from your trash at the bottom of your deck in any order: Add up to 1
  //   black Character card with a cost of 3 to 5 from your trash to your hand.
  // NOTE: not yet implemented (needs template).

  // OP05-089 (character) Saint Mjosgard —
  //   [Activate: Main] ➀ (You may rest the specified number of DON!! cards in your cost area.) You may rest
  //   this Character and 1 of your Characters: Add up to 1 black Character card with a cost of 1 from your
  //   trash to your hand.
  // NOTE: not yet implemented (needs template).

  // OP05-090 — [Blocker][On Play]/[On K.O.] up to 1 {Dressrosa} Character +2000 this turn.
  {
    cardNumber: 'OP05-090',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP05-091 (character) Rebecca —
  //   [Blocker][On Play] Add up to 1 black Character card with a cost of 3 to 7 other than [Rebecca] from
  //   your trash to your hand. Then, play up to 1 black Character card with a cost of 3 or less from your
  //   hand rested.
  // NOTE: not yet implemented (needs template).

  // OP05-092 (character) Saint Rosward —
  //   [Your Turn] If the only Characters on your field are {Celestial Dragons} type Characters, give all of
  //   your opponent's Characters −6 cost.
  // NOTE: not yet implemented (needs template).

  // OP05-093 (character) Rob Lucci —
  //   [On Play] You may place 3 cards from your trash at the bottom of your deck in any order: K.O. up to 1
  //   of your opponent's Characters with a cost of 2 or less and up to 1 of your opponent's Characters with
  //   a cost of 1 or less.
  // NOTE: not yet implemented (needs template).

  // OP05-094 Overheat — [Main] give up to 1 opp Character −3 cost this turn. [Trigger] Draw 2, trash 1.
  //   PARTIAL: the "cost-0 opp Character won't become active next Refresh" rider (preventRefresh) is deferred.
  {
    cardNumber: 'OP05-094',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP05-095 — [Counter] up to 1 Leader/Char +4000 this battle.
  //   PARTIAL: the "if 15+ trash, K.O. 1 opp Char cost ≤4" rider needs a trash-count gate (deferred).
  { cardNumber: 'OP05-095', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },

  // OP05-096 (event) I Bid 500 Million!! —
  //   [Main] Choose one:• K.O. up to 1 of your opponent's Characters with a cost of 1 or less.• Return up
  //   to 1 of your opponent's Characters with a cost of 1 or less to the owner's hand.• Place up to 1 of
  //   your opponent's Characters with a cost of 1 or less at the top or bottom of their Life cards
  //   face-up.Then, if you have a {Celestial Dragons} type Character, draw 1 card. [Trigger] K.O. up to 1
  //   of your opponent's Characters with a cost of 6 or less, or return it to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP05-097 (stage) Mary Geoise —
  //   [Your Turn] The cost of playing {Celestial Dragons} type Character cards with a cost of 2 or more
  //   from your hand will be reduced by 1.
  // NOTE: not yet implemented (needs template).

  // OP05-098 (leader) Enel —
  //   [Opponent's Turn] [Once Per Turn] When your number of Life cards becomes 0, add 1 card from the top
  //   of your deck to the top of your Life cards. Then, trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP05-099 (character) Amazon —
  //   [On Your Opponent's Attack] You may rest this Character: Your opponent may trash 1 card from the top
  //   of their Life cards. If they do not, give up to 1 of your opponent's Leader or Character cards −2000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP05-100 (character) Enel —
  //   [Rush][Once Per Turn] If this Character would leave the field, you may trash 1 card from the top of
  //   your Life cards instead. If there is a [Monkey.D.Luffy] Character, this effect is negated.
  // NOTE: not yet implemented (needs template).

  // OP05-101 — static: if ≤2 Life, +1000. [On Play] Look 5, reveal up to 1 [Holly] to hand (rest to bottom), then play up to 1 [Holly].
  {
    cardNumber: 'OP05-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Holly' } }, { fn: 'playFromHand', filter: { category: 'character', name: 'Holly' } }] } },
    ],
  },

  // OP05-102 (character) Gedatsu —
  //   [On Play] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of
  //   your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  // OP05-103 (character) Kotori —
  //   [On Play] If you have [Hotori], K.O. up to 1 of your opponent's Characters with a cost equal to or
  //   less than the number of your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  // OP05-104 (character) Conis —
  //   [On Play] You may place 1 of your Stages at the bottom of your deck: Draw 1 card and trash 1 card
  //   from your hand.
  // NOTE: not yet implemented (needs template).

  // OP05-105 — [Trigger] trash 1 → play this card.
  { cardNumber: 'OP05-105', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },

  // OP05-106 — [On Play] Look 5, reveal up to 1 {Sky Island} to hand, rest to bottom. [Trigger] play this card.
  //   PARTIAL: "other than [Shura]" exclusion is dropped (arbitrary-name exclusion not modeled).
  {
    cardNumber: 'OP05-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP05-107 (character) Lieutenant Spacey —
  //   [Your Turn] [Once Per Turn] When a card is added to your hand from your Life, this Character gains
  //   +2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP05-109 (character) Pagaya —
  //   [Once Per Turn] When a [Trigger] activates, draw 2 cards and trash 2 cards from your hand.
  // NOTE: not yet implemented (needs template).

  // OP05-111 (character) Hotori —
  //   [On Play] You may play 1 [Kotori] from your hand: Add up to 1 of your opponent's Characters with a
  //   cost of 3 or less to the top or bottom of your opponent's Life cards face-up.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP05-112', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Sky Island', exactCost: 1 } }] } },

  // OP05-114 (event) El Thor —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   your opponent has 2 or less Life cards, that card gains an additional +2000 power during this battle.
  //   [Trigger] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of
  //   your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP05-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP05-116 (event) Hino Bird Zap —
  //   [Main] K.O. up to 1 of your opponent's Characters with a cost equal to or less than the number of
  //   your opponent's Life cards. [Trigger] Activate this card's [Main] effect.
  // NOTE: not yet implemented (needs template).

  // OP05-117 — [On Play] Look at 5; add up to 1 Sky Island type.
  {
    cardNumber: 'OP05-117',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },

  { cardNumber: 'OP05-118', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'draw', amount: 4 }] } },

];
