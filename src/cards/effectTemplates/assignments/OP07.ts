/**
 * Reviewed effect template assignments - Main Booster OP07.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP07_ASSIGNMENTS: CardEffectAssignment[] = [

  // --- Batch: OP07 cards expressible with existing primitives (no new capability) ---
  // OP07-001 (leader) Monkey.D.Dragon —
  {
    cardNumber: 'OP07-001',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [{ fn: 'giveGivenDon', count: 2, optional: true }],
    },
  },

  // OP07-002 (character) Ain —
  {
    cardNumber: 'OP07-002',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'setBasePower', target: { group: 'characters', player: 'opponent' }, value: 0, duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
    },
  },

  // OP07-003 — [Activate: Main] Trash this: give up to 2 opp Characters −2000 during this turn.
  { cardNumber: 'OP07-003', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },

  // OP07-004 — [On Play] You may trash 1 from hand: search up to 1 Character with 2000 power or less.
  { cardNumber: 'OP07-004', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', maxPower: 2000 }, remainder: 'bottom', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-005 — [Blocker] [On Play] Give up to 1 of your opponent's Characters −2000 power during this turn.
  { cardNumber: 'OP07-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // --- codegen batch ---
  { cardNumber: 'OP07-008', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP07-006 — PARTIAL: "active Leader" requirement not gated.
  { cardNumber: 'OP07-006', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true },
    { fn: 'drawAndTrash', drawCount: 1, trashCount: 1, ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP07-009 — [On Play] Up to 1 of your red Characters with a cost of 1 gains [Double Attack] during this turn.
  { cardNumber: 'OP07-009', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { color: 'red', exactCost: 1 } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }] } },

  // OP07-010 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand: up to 1 Leader/Character +2000 battle.
  { cardNumber: 'OP07-010', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-011 — [DON!! x1] [When Attacking] K.O. up to 1 of your opponent's Characters with 2000 power or less.
  { cardNumber: 'OP07-011', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, optional: true }] } },

  // OP07-012 — [On Play] Give up to 1 of your opponent's Characters −1000 power during this turn.
  { cardNumber: 'OP07-012', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },

  // OP07-013 - [On Play] If Leader is Portgas.D.Ace, look at 5; add Portgas.D.Ace or red Event.
  {
    cardNumber: 'OP07-013',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Portgas.D.Ace' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Portgas.D.Ace' }, { category: 'event', color: 'red' }] } }] },
  },

  // OP07-014 — [On Play] Up to 1 of your [Portgas.D.Ace] cards gains +2000 power during this turn.
  { cardNumber: 'OP07-014', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Portgas.D.Ace' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP07-015 - [Rush] [On Play] Give up to 2 rested DON!! to Leader/Character.
  // Note: [Rush] is an engine keyword flag. Only the on-play DON!! attach is templated.
  { cardNumber: 'OP07-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP07-016 — [Main] +2000 to a {Revolutionary Army} Character, then −1000 to an opponent Character. [Trigger] same.
  {
    cardNumber: 'OP07-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 2000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 2000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ] } },
    ],
  },

  // ── Triage batch (OP07 expressible): Warlords/Fish-Man/Foxy/Egghead lines. ──
  // OP07-017 Bombardment — [Main]/[Trigger] K.O. up to 1 opp Character with 3000 power or less.
  //   PARTIAL: the "and up to 1 opp Stage cost ≤1" clause needs a Stage target (no Stage selector yet).
  {
    cardNumber: 'OP07-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
    ],
  },

  // OP07-018 (event) KEEP OUT —
  //   [Counter] Up to 1 of your {Revolutionary Army} type Characters gains +2000 power until the end of
  //   your next turn. [Trigger] Activate this card's [Counter] effect.
  {
    cardNumber: 'OP07-018',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true }] } },
    ],
  },

  // OP07-019 — (Leader) [On Your Opponent's Attack] [Once Per Turn] rest 1 DON!!: rest up to 1 opp Leader/Character.
  { cardNumber: 'OP07-019', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }] } },

  // OP07-020 — [Blocker][On K.O.] If Leader {Fish-Man}: play up to 1 {Fish-Man}/{Merfolk} Character cost ≤3 from hand.
  { cardNumber: 'OP07-020', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Fish-Man' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },

  // OP07-021 — [Blocker] [End of Your Turn] Set up to 1 of your DON!! cards as active.
  { cardNumber: 'OP07-021', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP07-022 - [On Play] Look at 5; add green Land of Wano other than this card's name.
  {
    cardNumber: 'OP07-022',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'green', typeIncludes: 'Land of Wano', excludeSelfName: true } }] },
  },

  // OP07-023 — static: if 6+ rested DON!!, this Character +1000 (Blocker is card data).
  { cardNumber: 'OP07-023', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfRestedDonCount', atLeast: 6 }] } }] } },

  // OP07-024 — [On Your Opponent's Attack] rest this: up to 1 {Fish-Man} Character cost<=5 gains [Blocker] this turn.
  { cardNumber: 'OP07-024', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Fish-Man', maxCost: 5 } }, keyword: 'blocker', duration: 'duringThisTurn', optional: true }] } },

  // OP07-029 — if Leader {Supernovas}, [Blocker]
  { cardNumber: 'OP07-029', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Supernovas' }] } }] } },

  // OP07-030 — if you have [Camie], [Blocker]
  { cardNumber: 'OP07-030', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Camie' }] } }] } },

  // OP07-025 — PARTIAL: played Character should enter rested (playFromHand has no rested flag).
  { cardNumber: 'OP07-025', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Caribou', maxCost: 4 } }] } },

  // OP07-026 (character) Jewelry Bonney —
  //   PARTIAL: rested DON!! cards not included in preventRefresh target.
  {
    cardNumber: 'OP07-026',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 1 }],
    },
  },

  // OP07-029 (character) Basil Hawkins —
  //   If your Leader has the {Supernovas} type, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)[Once Per Turn]
  //   If this Character would be removed from the field by your opponent's effect, you may rest 1 of your
  //   opponent's Characters instead.
  // NOTE: not yet implemented (needs template).

  // OP07-030 (character) Pappag —
  //   If you have a [Camie] Character, this Character gains [Blocker].(After your opponent declares an
  //   attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP07-031 — PARTIAL: fires on any Character rest during your turn, not only rests caused by your effects.
  { cardNumber: 'OP07-031', templateId: 'ability', params: { timing: 'onRested', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // OP07-032 — [On Play] if Leader {Fish-Man}/{Merfolk}: rest up to 1 opp Character with a cost of 6 or less.
  //   PARTIAL: the static "can attack Characters on the turn it is played" is deferred.
  { cardNumber: 'OP07-032', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Fish-Man' }, { kind: 'leaderType', type: 'Merfolk' }] }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },

  // OP07-033 — If 3+ Characters, your cost≤3 Characters other than [Luffy] cannot be K.O.'d by opponent effects.
  { cardNumber: 'OP07-033', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunityAuraControllerCharacters', scope: 'effect', duration: 'permanent', excludeSource: true, targetCondition: { maxCost: 3, gate: [{ kind: 'selfCharacterCount', atLeast: 3 }] }, effectSourceController: 'opponent' }] } },

  // OP07-034 — [When Attacking] If you have 3 or more Characters, this Character gains +2000 power during this turn.
  { cardNumber: 'OP07-034', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfCharacterCount', atLeast: 3 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // OP07-035 — [Counter] +2000 to a Leader/Character; if 3+ Characters, +1000 more to that card. [Trigger] K.O. opp rested cost<=4.
  {
    cardNumber: 'OP07-035',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { ref: 'previous' }, amount: 1000, duration: 'duringThisBattle', ifGate: [{ kind: 'selfCharacterCount', atLeast: 3 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP07-036 — [Main] up to 1 Leader/Char +3000 this turn. [Trigger] Rest up to 1 opp Character cost ≤4.
  //   PARTIAL: the "rest your cost-3+ Character → rest opp cost ≤5" mid-clause needs a min-cost in-play filter (deferred).
  {
    cardNumber: 'OP07-036',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP07-037 — [Main] Look at 5; reveal up to 1 {Supernovas} (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP07-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP07-038 (leader) Boa Hancock —
  //   [Your Turn] [Once Per Turn] This effect can be activated when a Character is removed from the field
  //   by your effect. If you have 5 or less cards in your hand, draw 1 card.
  { cardNumber: 'OP07-038', templateId: 'ability', params: {
    timing: 'onRemovedFromField',
    oncePerTurn: true,
    condition: { turn: 'your' },
    gate: [{ kind: 'removedFromFieldCategory', category: 'character' }, { kind: 'removedByEffectController', player: 'controller' }],
    functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 5 }] }],
  } },
  // OP07-039 — [DON!! x1] [When Attacking] Look at 3 and place them at the top or bottom of the deck in any order.
  { cardNumber: 'OP07-039', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 3, pick: 0, reveal: false, destination: 'deckTopOrBottom' }] } },

  // OP07-040 — [On Play] ① : Return up to 1 Character with a cost of 2 or less to the owner's hand.
  { cardNumber: 'OP07-040', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP07-041 - [On Play] Look at 5; add Amazon Lily or Kuja Pirates other than this card's name.
  {
    cardNumber: 'OP07-041',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], excludeSelfName: true } }] },
  },

  // OP07-042 (character) Gecko Moria —
  //   [Once Per Turn] If your Leader has the {The Seven Warlords of the Sea} type and this Character would
  //   be removed from the field by your opponent's effect, you may place 1 of your Characters other than
  //   [Gecko Moria] at the bottom of the owner's deck instead.
  // NOTE: not yet implemented (needs template).

  // OP07-043 — [On Play] Up to 1 of your [Boa Hancock] cards gains +2000 power during this turn.
  { cardNumber: 'OP07-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Boa Hancock' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP07-044 — [On Play] Draw 1 card.
  { cardNumber: 'OP07-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP07-045 — [On Play] Play up to 1 {The Seven Warlords of the Sea} Character with a cost of 4 or less other than [Jinbe] from hand.
  { cardNumber: 'OP07-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'The Seven Warlords of the Sea', maxCost: 4, excludeSelfName: true } }] } },

  // OP07-046 — [On Play] Look at 5; add up to 1 The Seven Warlords of the Sea.
  {
    cardNumber: 'OP07-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea' } }] },
  },

  // OP07-053 — [Blocker] [On Play] Draw 2 and place 2 from hand at the bottom of your deck.
  { cardNumber: 'OP07-053', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },

  // OP07-047 — PARTIAL: self-return not instance-locked; opponent hand discard approximates bottom-deck placement.
  { cardNumber: 'OP07-047', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'opponentHand', atLeast: 6 }] },
  ] } },

  // OP07-048 (character) Donquixote Doflamingo —
  //   [Activate: Main] [Once Per Turn] ➁ (You may rest the specified number of DON!! cards in your cost
  //   area.): Reveal 1 card from the top of your deck. If that card is a {The Seven Warlords of the Sea}
  //   type Character card with a cost of 4 or less, you may play that card rested. Then, place the rest at
  //   the bottom of your deck.
  {
    cardNumber: 'OP07-048',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 2 }],
      functions: [{ fn: 'searchTopDeck', look: 1, pick: 1, reveal: true, destination: 'play', filter: { category: 'character', typeIncludes: 'The Seven Warlords of the Sea', maxCost: 4 }, remainder: 'bottom', rested: true }],
    },
  },

  // OP07-049 — PARTIAL: played Character should enter rested (playFromHand has no rested flag).
  { cardNumber: 'OP07-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Edward Weevil', maxCost: 4 } }] } },

  { cardNumber: 'OP07-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], atLeast: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP07-051 — PARTIAL: place cost≤1 Character at bottom of deck deferred; preventAttack on opp char other than Luffy mapped.
  {
    cardNumber: 'OP07-051',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { excludeName: 'Monkey.D.Luffy' } }, duration: 'endOfOpponentsTurn', optional: true }],
    },
  },

  { cardNumber: 'OP07-052', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfAnyTypedCharacterCount', anyOfTypes: ['Amazon Lily', 'Kuja Pirates'], atLeast: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP07-053 (character) Portgas.D.Ace —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] Draw 2 cards and place 2 cards from your hand at the top or bottom of your
  //   deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP07-054 - [Blocker] [On Play] Draw 1 card.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw is templated.
  { cardNumber: 'OP07-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP07-055 — [Counter] +4000 battle, then return up to 1 of your Characters to hand. [Trigger] return own → return 1 opp Character cost ≤5.
  {
    cardNumber: 'OP07-055',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP07-056 — [Counter] return cost-2+ Character → +4000 battle. [Trigger] draw 2, place 2 hand cards at bottom.
  {
    cardNumber: 'OP07-056',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { minCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'draw', amount: 2 },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
      ] } },
    ],
  },

  // OP07-057 — [Main] select Warlords Leader/Char +2000; if it attacks, opp cannot activate [Blocker]. [Trigger] draw 1.
  {
    cardNumber: 'OP07-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn', target: 'chosenControllerLeaderOrCharacter', filter: { typeIncludes: 'The Seven Warlords of the Sea' }, powerBonus: 2000 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP07-058 (stage) — [Activate: Main] rest this Stage + trash 1: If Leader {Kuja Pirates}, return up to 1 {Amazon Lily}/{Kuja Pirates} Character to hand.
  { cardNumber: 'OP07-058', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { anyOfTypes: ['Amazon Lily', 'Kuja Pirates'] } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP07-059 (leader) Foxy —
  //   PARTIAL: rested DON!! preventRefresh not modeled; mapped rested Leader + Character only.
  {
    cardNumber: 'OP07-059',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      cost: [{ kind: 'donMinus', count: 3 }],
      gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Foxy Pirates', atLeast: 3 }],
      functions: [
        { fn: 'preventRefresh', target: { group: 'leader', player: 'opponent', filter: { rested: true } }, optional: true },
        { fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 1 },
      ],
    },
  },

  // OP07-060 — PARTIAL: "no other [Itomimizu]" gate not modeled.
  { cardNumber: 'OP07-060', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP07-061 — [On Play] DON!! −1: If Leader {The Vinsmoke Family}, draw 1.
  { cardNumber: 'OP07-061', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'The Vinsmoke Family' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP07-062 — [On Play] If your DON!! ≤ opponent's, return up to 1 {The Vinsmoke Family} Character with cost 1 to hand.
  { cardNumber: 'OP07-062', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'The Vinsmoke Family', exactCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP07-063 (character) Capote —
  //   [On Play] DON!! −1 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): If your Leader has the {Foxy Pirates} type, up to 1 of your opponent's Characters with a cost
  //   of 6 or less cannot attack until the end of your opponent's next turn.
  { cardNumber: 'OP07-063', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP07-064 — PARTIAL: "at least 2 less DON!!" approximated as selfDonAtMostOpponent (not deficit-of-2).
  { cardNumber: 'OP07-064', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -3, duration: 'permanent', gate: [{ kind: 'selfDonAtMostOpponent' }] }] } },

  // OP07-065 — [On Play] If Leader {Foxy Pirates} and DON!! ≤ opponent's, add 1 DON!! from deck and set it active.
  { cardNumber: 'OP07-065', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  // OP07-066 — [Blocker] [On Play] If your DON!! ≤ opponent's, add 1 DON!! from deck and rest it.
  { cardNumber: 'OP07-066', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP07-068 — [DON!! x1] [When Attacking] If your DON!! ≤ opponent's, add 1 DON!! from deck and rest it.
  { cardNumber: 'OP07-068', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP07-069 — If your DON!! ≤ opponent's, your {Foxy Pirates} Characters other than [Pickles] cannot be K.O.'d by opponent effects.
  {
    cardNumber: 'OP07-069',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'koImmunityAuraControllerCharacters',
        scope: 'effect',
        duration: 'permanent',
        anyOfTypes: ['Foxy Pirates'],
        excludeSource: true,
        effectSourceController: 'opponent',
        targetCondition: { gate: [{ kind: 'selfDonAtMostOpponent' }] },
      }],
    },
  },

  // OP07-070 — [On Play] If your DON!! ≤ opponent's, play up to 1 {Foxy Pirates} card with a cost of 4 or less from hand.
  { cardNumber: 'OP07-070', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Foxy Pirates', maxCost: 4 } }] } },

  // OP07-071 — [Activate: Main][Once Per Turn] Add 1 DON!! and rest it.
  //   [Opponent's Turn] Give all of your opponent's Characters −1000 power.
  {
    cardNumber: 'OP07-071',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraOpponentCharacters', amount: -1000, duration: 'permanent', sourceCondition: { turn: 'opponent' } }] } },
    ],
  },

  // OP07-072 — [On Play] DON!! −1: Look 5, reveal up to 1 {Foxy Pirates} to hand (rest to bottom), then play up to 1 purple Character (≤4000 base power) from hand.
  { cardNumber: 'OP07-072', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Foxy Pirates' }, remainder: 'bottom' }, { fn: 'playFromHand', filter: { category: 'character', color: 'purple', maxPower: 4000 } }] } },

  // OP07-073 — [Activate: Main][Once Per Turn] DON!! −3: If opp has 3+ Characters, set this active.
  { cardNumber: 'OP07-073', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 3 }], gate: [{ kind: 'opponentCharacterCount', atLeast: 3 }], functions: [{ fn: 'setActiveSelf' }] } },

  // OP07-074 — [Activate: Main] Trash this: if Leader {Foxy Pirates}, add 1 DON!! from deck and rest it.
  { cardNumber: 'OP07-074', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP07-075 — PARTIAL: "up to 1 each of Leader and Character" approximated as up to 2 leaderOrCharacters picks.
  { cardNumber: 'OP07-075', templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 },
  ] } },

  // OP07-076 — [Counter] DON!! −1: +2000 battle, then rest up to 1 opp Character. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP07-076',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP07-077 (event) We're Going to Claim the One Piece!!! —
  //   [Main] If your Leader has the {Animal Kingdom Pirates} or {Big Mom Pirates} type, look at 5 cards
  //   from the top of your deck; reveal up to 1 {Animal Kingdom Pirates} or {Big Mom Pirates} type card and
  //   add it to your hand. Then, place the rest at the bottom of your deck in any order. [Trigger] Activate
  //   this card's [Main] effect.
  {
    cardNumber: 'OP07-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }, { kind: 'leaderType', type: 'Big Mom Pirates' }] }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Animal Kingdom Pirates' }, { typeIncludes: 'Big Mom Pirates' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }, { kind: 'leaderType', type: 'Big Mom Pirates' }] }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Animal Kingdom Pirates' }, { typeIncludes: 'Big Mom Pirates' }] }, remainder: 'bottom' }] } },
    ],
  },

  // OP07-078 (event) Megaton Nine-Tails Rush —
  //   PARTIAL: [Foxy] Leader not covered by setActiveControllerCharacter.
  {
    cardNumber: 'OP07-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'setActiveControllerCharacter', filter: { name: 'Foxy' }, maxTargets: 1, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP07-079 (leader) — [When Attacking] trash 2 from top of deck: give up to 1 opp Character −1 cost this turn.
  { cardNumber: 'OP07-079', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true }] } },

  // OP07-080 — [On Play] place 2 CP from trash at bottom: give up to 1 opp Character −3 cost this turn.
  { cardNumber: 'OP07-080', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }, { fn: 'addCost', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true }] } },

  // OP07-080 (character) Kaku —
  //   [On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck
  //   in any order: Give up to 1 of your opponent's Characters −3 cost during this turn.
  // NOTE: not yet implemented (needs template).

  // OP07-081 (character) Kalifa —
  //   [DON!! x1] [Your Turn] Give all of your opponent's Characters −1 cost.
  { cardNumber: 'OP07-081', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -1, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'your' } }] } },

  // OP07-082 — [On Play] Trash 2 from the top of your deck and give up to 1 opponent Character −1 cost during this turn.
  { cardNumber: 'OP07-082', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] } },

  // OP07-083 (character) Gecko Moria —
  //   [Activate: Main] You may place 4 {Thriller Bark Pirates} type cards from your trash at the bottom of
  //   your deck in any order: This Character gains [Banish] and +1000 power during this turn.(When this
  //   card deals damage, the target card is trashed without activating its Trigger.)
  // NOTE: not yet implemented (needs template).

  // OP07-085 — [On Play] trash 1 of your Characters: K.O. up to 1 opponent Character.
  { cardNumber: 'OP07-085', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-086 — [On Play] Trash 2 from the top of your deck and give up to 1 opponent Character −2 cost during this turn.
  { cardNumber: 'OP07-086', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },

  // OP07-087 — [Your Turn] if opponent has a cost-0 Character, +3000
  { cardNumber: 'OP07-087', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'your', gate: [{ kind: 'opponentHasCharacterExactCost', exactCost: 0 }] } }] } },

  // OP07-087 (character) Baskerville —
  //   [Your Turn] If your opponent has a Character with a cost of 0, this Character gains +3000 power.
  // NOTE: not yet implemented (needs template).

  // OP07-088 — [On Play] Up to 1 of your [Rob Lucci] cards gains +2000 power during this turn.
  { cardNumber: 'OP07-088', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Rob Lucci' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP07-092 — [On Play] place 2 CP from trash at bottom: K.O. up to 1 opp Character cost<=1.
  { cardNumber: 'OP07-092', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }, { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  { cardNumber: 'OP07-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }, { fn: 'revealOpponentHand' }, { fn: 'draw', amount: 1, player: 'opponent' }] } },

  // OP07-091 — PARTIAL: +1000 per 3 cards placed (dynamic scaling) deferred; mapped flat +1000 after trash reorder.
  { cardNumber: 'OP07-091', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true },
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', minCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 9 },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-092 (character) Joseph —
  //   [On Play] You may place 2 cards with a type including "CP" from your trash at the bottom of your deck
  //   in any order: K.O. up to 1 of your opponent's Characters with a cost of 1 or less.
  // NOTE: not yet implemented (needs template).

  // OP07-093 — [On Play] reorder 3 trash → deck bottom: opp trashes 1 hand, then optional opp trash → deck bottom.
  { cardNumber: 'OP07-093', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 },
    { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifPrevious: 'previousMovedAny' },
    { fn: 'moveCards', from: { zone: 'trash', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
  ] } },

  // OP07-094 — [Counter] up to 1 Leader/Char +2000 this battle. [Trigger] Return up to 1 of your Characters to hand.
  //   PARTIAL: the "if 10+ trash, return your CP-type Character" rider needs a trash-count gate (deferred).
  {
    cardNumber: 'OP07-094',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP07-095 — [Counter] +4000 battle (+2000 more if 10+ trash). [Trigger] +1000 this turn.
  {
    cardNumber: 'OP07-095',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifGate: [{ kind: 'selfTrashCount', atLeast: 10 }], ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP07-096 — [Main] Draw 1. [Trigger] K.O. up to 1 opp Character cost ≤3.
  //   PARTIAL: the "if 10+ trash, give opp −3 cost" rider needs a trash-count gate (deferred).
  {
    cardNumber: 'OP07-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP07-097 (leader) Vegapunk —
  //   This Leader cannot attack.[Activate: Main] [Once Per Turn] ① (You may rest the specified number of
  //   DON!! cards in your cost area.): Select up to 1 {Egghead} type card with a cost of 5 or less from
  //   your hand and play it or add it to the top of your Life cards face-up.
  //   PARTIAL: the static "cannot attack" lock is implemented below; the activated play-or-life ability remains deferred.
  { cardNumber: 'OP07-097', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },

  // OP07-098 — static: if fewer Life than opponent, cannot be K.O.'d in battle. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'OP07-098',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { gate: [{ kind: 'selfLifeLessThanOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-099 — [Trigger] up to 1 {Egghead} Leader/Character +2000 until start of your next turn.
  { cardNumber: 'OP07-099', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Egghead' } }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true }] } },

  // OP07-100 — [On Play] If 2 or less Life, draw 2 & trash 2. [Trigger] If Leader is [Vegapunk], play this card.
  {
    cardNumber: 'OP07-100',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-101 — [Blocker] [Trigger] If Leader is [Vegapunk], play this card.
  { cardNumber: 'OP07-101', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP07-102 — [Trigger] Return up to 1 opp Character cost ≤4 to hand.
  //   PARTIAL: the "and add this card to your hand" self-return clause is deferred (trigger-returns-to-hand family).
  { cardNumber: 'OP07-102', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP07-103 (character) Tony Tony.Chopper —
  //   PARTIAL: "add this card to your hand" on Trigger deferred.
  {
    cardNumber: 'OP07-103',
    templateId: 'ability',
    params: {
      timing: 'lifeTrigger',
      functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Egghead' } }, keyword: 'blocker', duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
    },
  },

  // OP07-104 — [Trigger] If your Leader has the {Egghead} type, draw 2 cards.
  { cardNumber: 'OP07-104', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP07-105 — [On K.O.] If <=2 Life, play {Egghead} cost<=4 from trash rested. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'OP07-105',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Egghead', maxCost: 4 }, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-106 — [DON!! x1][When Attacking] If ≤1 Life, K.O. up to 1 opp Character cost ≤3.
  { cardNumber: 'OP07-106', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP07-107 — [Trigger] Draw 1. Then, if you have 1 or less Life cards, play this card.
  { cardNumber: 'OP07-107', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'triggerPlaySelf', ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },

  // OP07-109 — [Activate: Main] Trash this: if <=2 Life, K.O. opp cost<=4 then draw 1. [Trigger] K.O. opp cost<=4.
  {
    cardNumber: 'OP07-109',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfLife', atMost: 2 }], functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
        { fn: 'draw', amount: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP07-110 — [On Play] add 1 top/bottom Life to hand → K.O. up to 1 opp Character cost ≤2. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'OP07-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-111 — [On Play] Search {Egghead} (other than [Lilith]). [Trigger] If Leader is [Vegapunk], play this card.
  {
    cardNumber: 'OP07-111',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Egghead', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-112 — [When Attacking][Once Per Turn] add 1 top/bottom Life to hand → rest up to 1 opp Character cost ≤4, then if ≤1 Life add top of deck to top of Life.
  { cardNumber: 'OP07-112', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },

  // OP07-113 — [Trigger] If your Leader has the {Egghead} type, rest up to 1 of your opponent's Leader or Character cards.
  { cardNumber: 'OP07-113', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }] } },

  // OP07-114 — [Main] Look at 5; reveal up to 1 {Egghead} (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP07-114',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Egghead', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP07-115 — [Counter] If <=2 Life, +3000 to a Leader/Character. [Trigger] Play {Egghead} Character cost<=5 from trash.
  {
    cardNumber: 'OP07-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Egghead', maxCost: 5 } }] } },
    ],
  },

  // OP07-116 — [Main]/[Counter] +1000 to a Leader/Character; if opp has 2 or less Life, rest opp cost<=4. [Trigger] rest opp cost<=4.
  {
    cardNumber: 'OP07-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'opponentLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'opponentLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP07-117 (stage) — [End of Your Turn] If ≤3 Life, set up to 1 {Egghead} Character cost ≤5 active. [Trigger] Play this.
  {
    cardNumber: 'OP07-117',
    templates: [
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'Egghead', maxCost: 5 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP07-118 — [On Play] You may trash 1 from hand: K.O. up to 1 opp Character cost<=5 and up to 1 opp Character cost<=3.
  { cardNumber: 'OP07-118', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP07-119 — [On Play] Add up to 1 card from top of deck to top of Life. Then, if 2 or less Life, this Character gains [Rush] this turn.
  {
    cardNumber: 'OP07-119',
    templateId: 'ability', params: { timing: 'onPlay', functions: [
      { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
      { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
    ] },
  },

];
