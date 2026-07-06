/**
 * Reviewed effect template assignments - Main Booster OP11.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP11_ASSIGNMENTS: CardEffectAssignment[] = [
  // --- Batch: OP11 expressible with existing primitives ---
  // OP11-001 (leader) Koby —
  //   Your {SWORD} type Characters can attack Characters on the turn in which they are played.[Once Per
  //   Turn] If your {Navy} type Character with 7000 base power or less would be removed from the field by
  //   your opponent's effect, you may place 3 cards from your trash at the bottom of your deck in any order
  //   instead.
  // NOTE: not yet implemented (needs template).

  // OP11-002 — [On Play] Give opp Character −1000, then K.O. opp Character with 0 power or less.
  { cardNumber: 'OP11-002', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true },
  ] } },

  // OP11-004 — [On Play] Search {Navy} (excl. self). [Activate: Main] Trash this: up to 1 of your Characters +1000.
  {
    cardNumber: 'OP11-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP11-005 (character) Smoker —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[DON!! x1] This Character cannot be K.O.'d by effects of Characters without the
  //   <Special> attribute.
  // NOTE: not yet implemented (needs template).

  // OP11-006 (character) Zephyr —
  //   [DON!! x1] [When Attacking] Give up to 1 of your opponent's <Special> attribute Characters −5000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // ── Triage batch (OP11 expressible). "Choose a cost + reveal opp deck" and "turn Life face-down" families are deferred. ──
  // OP11-007 — [Activate: Main] rest this: If Leader {Navy}, up to 1 {Navy} Character +2000 this turn.
  { cardNumber: 'OP11-007', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Navy' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP11-008 — [Blocker] [On Play] You may trash 1 from hand: if Leader {Navy}, give up to 1 opp Character −6000.
  { cardNumber: 'OP11-008', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -6000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP11-009 — [DON!! x2] [When Attacking] Give opp Character −2000 until end of opponent's next turn.
  { cardNumber: 'OP11-009', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP11-010 — [On Play] Give opp Character −2000. [When Attacking] this Character +1000.
  {
    cardNumber: 'OP11-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },
    ],
  },

  // OP11-012 (character) Franky —
  //   [Your Turn] [Once Per Turn] When your opponent activates an Event, all of your Characters gain +2000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-013 (character) Prince Grus —
  //   [When Attacking] All of your opponent's Characters with 2000 power or less cannot activate [Blocker]
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-014 (character) Borsalino —
  //   [Blocker][Activate: Main] You may rest this Character: Up to 1 of your {Navy} type Leader or
  //   Character cards can also attack active Characters during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-016 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP11-016', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // OP11-018 — [Main] Give opp −4000, then K.O. opp power<=6000. [Trigger] K.O. opp power<=6000.
  {
    cardNumber: 'OP11-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },
    ],
  },

  // OP11-019 (event) Glorp Web!! —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   your opponent has a Character with 6000 power or more, up to 1 of your Leader or Character cards
  //   gains +1000 power during this turn. [Trigger] Up to 1 of your Leader or Character cards gains +1000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-020 — [Main] Give up to 2 opp −2000, then a {Navy} Character +1000. [Trigger] K.O. opp power<=4000.
  {
    cardNumber: 'OP11-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 },
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Navy' } }, amount: 1000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },

  // OP11-021 (leader) — [End of Your Turn] If ≤6 hand: set up to 1 {Fish-Man}/{Merfolk} Character and up to 1 DON!! active.
  { cardNumber: 'OP11-021', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { anyOfTypes: ['Fish-Man', 'Merfolk'] } }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP11-022 (leader) Shirahoshi —
  //   This Leader cannot attack.[Activate: Main] [Once Per Turn] You may rest 1 of your DON!! cards and
  //   turn 1 card from the top of your Life cards face-up: Play up to 1 {Neptunian} type Character card or
  //   [Megalo] with a cost equal to or less than the number of DON!! cards on your field from your hand.
  // NOTE: not yet implemented (needs template).

  // OP11-023 — [Trigger] Rest up to 1 opp Character cost ≤4. PARTIAL: the static in-hand −cost clause is deferred.
  { cardNumber: 'OP11-023', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP11-024 (character) Aladine —
  //   When this Character is K.O.'d by your opponent's effect, you may trash 1 card from your hand and rest
  //   1 of your DON!! cards. If you do, play up to 1 {Fish-Man} or {Merfolk} type Character card with a
  //   cost of 6 or less from your hand.
  // NOTE: not yet implemented (needs template).

  // OP11-025 — [On Your Opponent's Attack] [Once Per Turn] rest 1 DON!! + rest this: up to 1 Leader/Character +1000 battle.
  { cardNumber: 'OP11-025', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },

  // OP11-027 (character) Bulge-Eyed Neptunian —
  //   If your Leader is [Shirahoshi], this Character can attack Characters on the turn in which it is
  //   played.
  // NOTE: not yet implemented (needs template).

  // OP11-028 — [On Play] Up to 1 opp rested Character won't become active next Refresh. [Trigger] K.O. opp rested cost<=3.
  {
    cardNumber: 'OP11-028',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP11-029 - [Blocker] [On Play] Rest up to 1 opponent Character with cost 1 or less.
  // Note: [Blocker] is an engine keyword flag. Only the on-play rest is templated.
  { cardNumber: 'OP11-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // OP11-030 — [Activate: Main] rest 1 DON!! + rest this: Look 5, reveal up to 1 {Neptunian}/{Fish-Man Island} to hand, rest to bottom.
  { cardNumber: 'OP11-030', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Neptunian' }, { typeIncludes: 'Fish-Man Island' }] }, remainder: 'bottom' }] } },

  // OP11-031 (character) Jinbe —
  //   [On Play] If your Leader has the {Fish-Man} or {Merfolk} type, rest up to 1 of your opponent's
  //   Characters with a cost of 5 or less.[Activate: Main] [Once Per Turn] Up to 1 of your {Fish-Man} or
  //   {Merfolk} type Characters can attack Characters on the turn in which it is played.
  // NOTE: not yet implemented (needs template).

  // OP11-034 (character) Hatchan —
  //   [Activate: Main] You may rest this Character: If your Leader has the {Fish-Man} or {Merfolk} type, up
  //   to 1 of your opponent's Characters with a cost of 3 or less cannot be rested until the end of your
  //   opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // OP11-035 — [On Play] Rest up to 1 opp Character. PARTIAL: the K.O.-triggered play-from-hand is deferred.
  { cardNumber: 'OP11-035', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },

  // OP11-036 — [On Play] If Leader [Shirahoshi]: Look 5, reveal up to 1 {Neptunian}/[Shirahoshi] to hand, rest to bottom.
  { cardNumber: 'OP11-036', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Shirahoshi' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Neptunian' }, { name: 'Shirahoshi' }] }, remainder: 'bottom' }] } },

  // OP11-037 — [Main] Search ({Neptunian} or {Fish-Man Island}) Character. [Trigger] Draw 1.
  {
    cardNumber: 'OP11-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Neptunian' }, { typeIncludes: 'Fish-Man Island' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP11-038 — [Main] rest 1 DON!!: rest up to 1 opp Character cost ≤5. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP11-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP11-039 — [Counter] up to 1 Leader/Char +3000 this battle (Fish-Man/Merfolk filter dropped), then rest up to 1 opp Char cost ≤3. [Trigger] rest cost ≤4.
  {
    cardNumber: 'OP11-039',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP11-040 (leader) Monkey.D.Luffy —
  //   This effect can be activated at the start of your turn. If you have 8 or more DON!! cards on your
  //   field, look at 5 cards from the top of your deck; reveal up to 1 {Straw Hat Crew} type card and add
  //   it to your hand. Then, place the rest at the top or bottom of the deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP11-041 (leader) Nami —
  //   [Your Turn] [Once Per Turn] This effect can be activated when a card is removed from your or your
  //   opponent's Life cards. If you have 7 or less cards in your hand, draw 1 card.[DON!! x1] [On Your
  //   Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: This Leader gains +2000 power
  //   during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-042 (character) Vito —
  //   [On Play] You may trash 1 {Firetank Pirates} type card from your hand: This Character gains [Rush]
  //   during this turn.(This card can attack on the turn in which it is played.)
  // NOTE: not yet implemented (needs template).

  // OP11-043 (character) Vinsmoke Ichiji —
  //   [Blocker][On Your Opponent's Attack] [Once Per Turn] This effect can be activated when you only have
  //   Characters with a type including "GERMA". Up to 1 of your Leader or Character cards gains +1000 power
  //   during this battle. Then, trash 2 cards from the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP11-044 — [Activate: Main] [OPT] You may trash 1 from hand: all your {GERMA 66} Characters +1000.
  { cardNumber: 'OP11-044', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPowerControllerCharactersAll', amount: 1000, duration: 'duringThisTurn', filter: { typeIncludes: 'GERMA 66' }, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP11-046 (character) Vinsmoke Yonji —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)If you only have Characters with a type including "GERMA", this Character cannot be
  //   K.O.'d or rested by your opponent's effects.
  // NOTE: not yet implemented (needs template).

  // OP11-047 - [On Play] If Leader has The Vinsmoke Family, look at 5; add GERMA, trash rest.
  {
    cardNumber: 'OP11-047',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Vinsmoke Family' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'trash' }] },
  },

  // OP11-048 - [On Play] Look at 4; add Firetank Pirates or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP11-048',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Firetank Pirates' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } }] },
  },

  // OP11-049 — [On Play] Look at 3, place at top or bottom of deck in any order. PARTIAL: [On Opponent's Attack] clause deferred.
  { cardNumber: 'OP11-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 3, reveal: false, destination: 'deckTopOrBottom' }] } },

  // OP11-050 (character) Gotti —
  //   [When Attacking] You may trash 1 {Firetank Pirates} type card from your hand: Return up to 1
  //   Character with a cost of 1 or less to the owner's hand or place it at the bottom of their deck.
  // NOTE: not yet implemented (needs template).

  // OP11-051 (character) Sanji —
  //   When this Character is K.O.'d by your opponent's effect, look at 5 cards from the top of your deck
  //   and play up to 1 {Straw Hat Crew} type Character card with a cost of 5 or less. Then, place the rest
  //   at the bottom of your deck in any order.[On Play] Return up to 1 Character with 5000 base power or
  //   less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP11-054 — [Blocker][On Play] If Leader multicolored: Draw 3, place 2 from hand at bottom of deck.
  { cardNumber: 'OP11-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 3 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },

  // OP11-056 — [Blocker][On Play] Place up to 1 Character with a base cost of 1 at the bottom of the deck.
  { cardNumber: 'OP11-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { exactBaseCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP11-057 (character) Pedro —
  //   If you have 4 or less cards in your hand, this Character gains [Blocker].(After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP11-058 (character) Monkey.D.Luffy —
  //   If you have 5 or more cards in your hand, this Character cannot attack.[Blocker] (After your opponent
  //   declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP11-059 (event) Gum-Gum King Cobra —
  //   [Counter] Up to 1 of your Leader or Character cards gains +2000 power during this battle. Then, if
  //   you have 4 or less cards in your hand, that card gains an additional +2000 power during this battle.
  //   [Trigger] Return up to 1 Character with a cost of 2 or less to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // OP11-060 — [Main] If Leader multicolored, search {Straw Hat Crew} (excl. self). [Trigger] same.
  {
    cardNumber: 'OP11-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },

  // OP11-061 — [Main] Place opp Character with base cost 4 or less at bottom of deck. [Trigger] Place Character cost<=1 at bottom.
  {
    cardNumber: 'OP11-061',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP11-062 (leader) Charlotte Katakuri —
  //   [When Attacking]/[On Your Opponent's Attack] [Once Per Turn] DON!! −1: Look at 1 card from the top of
  //   your opponent's deck. Then, this Leader gains +1000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP11-063 — [On Play] DON!! −1: If Leader {Impel Down}, rest up to 1 opp Character cost ≤3.
  { cardNumber: 'OP11-063', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP11-065 (character) Charlotte Anana —
  //   If you have a purple {Big Mom Pirates} type Character other than [Charlotte Anana], this Character
  //   gains [Blocker].(After your opponent declares an attack, you may rest this card to make it the new
  //   target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP11-066 (character) Charlotte Oven —
  //   [Activate: Main] You may rest this Character: Choose a cost and reveal 1 card from the top of your
  //   opponent's deck. If the revealed card has the chosen cost, K.O. up to 1 of your opponent's Characters
  //   with a base cost of 3 or less. Then, add up to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // OP11-067 — [Blocker][End of Your Turn] Set up to 2 {Big Mom Pirates} Characters active (cost ≥3 filter dropped), then add 1 DON!! (rested).
  { cardNumber: 'OP11-067', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 2, filter: { typeIncludes: 'Big Mom Pirates' } }, { fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP11-069 — [On Play] If Leader {Big Mom Pirates}: add 1 top Life to hand → add 1 DON!! (active).
  { cardNumber: 'OP11-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' }] } },

  // OP11-070 — [On Play] Look 5, reveal up to 1 {Big Mom Pirates} cost ≥2 to hand, rest to bottom. PARTIAL: the peek-opp-deck activate is deferred.
  { cardNumber: 'OP11-070', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates', minCost: 2 }, remainder: 'bottom' }] } },

  // OP11-071 (character) Charlotte Perospero —
  //   [Activate: Main] [Once Per Turn] You may trash 1 card from your hand: Choose a cost and reveal 1 card
  //   from the top of your opponent's deck. If the revealed card has the chosen cost, draw 1 card and add
  //   up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP11-072 (character) Charlotte Mont-d'or —
  //   [Activate: Main] [Once Per Turn] DON!! −1, You may rest this Character: Your opponent places 2 cards
  //   from their trash at the bottom of their deck in any order. Then, add 1 card from the top of your Life
  //   cards to your hand.
  // NOTE: not yet implemented (needs template).

  // OP11-073 (character) Charlotte Linlin —
  //   If your Leader has the {Big Mom Pirates} type, this Character gains [Rush].[On Your Opponent's
  //   Attack] [Once Per Turn] DON!! −5: Choose a cost and reveal 1 card from the top of your opponent's
  //   deck. If the revealed card has the chosen cost, up to 1 of your Leader gains +2000 power during this
  //   turn.
  // NOTE: not yet implemented (needs template).

  // OP11-074 (character) Streusen —
  //   [Activate: Main] [Once Per Turn] DON!! −1, You may rest this Character: Choose a cost and reveal 1
  //   card from the top of your opponent's deck. If the revealed card has the chosen cost, rest up to 1 of
  //   your opponent's Characters with a cost of 4 or less.
  // NOTE: not yet implemented (needs template).

  // OP11-075 — [On Play] If Leader is [Nico Robin] and 7+ DON!! on field, draw 2. [Trigger] same.
  {
    cardNumber: 'OP11-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nico Robin' }, { kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nico Robin' }, { kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP11-076 — [Blocker][On Play] If Leader {Impel Down}: play up to 1 {Impel Down} cost ≤3 from hand.
  { cardNumber: 'OP11-076', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 3 } }] } },

  // OP11-077 (character) Randolph —
  //   [Your Turn] [Once Per Turn] When a DON!! card on your field is returned to your DON!! deck, up to 1
  //   of your {Big Mom Pirates} type Characters gains +2 cost until the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // OP11-079 (event) When Two Men Are Fighting the Last Thing I Need Is Some Half-Hearted Assistance!!!! —
  //   [Counter] Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card
  //   has the chosen cost, up to 1 of your Leader or Character cards gains +5000 power during this battle.
  //   [Trigger] Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP11-080 — [Counter] your Leader +3000 this battle. PARTIAL: the [Main] "rest 2 DON!!: if blue leader, ramp" needs a leader-color gate (deferred).
  { cardNumber: 'OP11-080', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  // OP11-081 (event) Cognac Mama-Mash —
  //   [Main] Choose a cost and reveal 1 card from the top of your opponent's deck. If the revealed card has
  //   the chosen cost, K.O. up to 1 of your opponent's Characters with a base cost of 8 or less. [Trigger]
  //   Add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // OP11-082 (character) Aramaki —
  //   [Activate: Main] You may trash this Character: If your Leader has the {Navy} type, up to 1 of your
  //   {Navy} type Characters can also attack active Characters during this turn. Then, trash 2 cards from
  //   the top of your deck.
  // NOTE: not yet implemented (needs template).

  // OP11-083 — [Blocker][On Play] Trash 2 cards from your hand.
  { cardNumber: 'OP11-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 2 }] } },

  // OP11-084 (character) Kuzan —
  //   [On Play] Trash 3 cards from the top of your deck.[When Attacking] Up to 1 of your {Navy} type Leader
  //   or Character cards can also attack active Characters during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-085 — [On Play] Add up to 1 {SMILE} card with a cost of 5 or less from your trash to your hand.
  { cardNumber: 'OP11-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'SMILE', maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP11-086 — [On Play] Trash 1 from hand. [Activate: Main] Trash this: play up to 1 [Caribou] cost<=4 from trash.
  {
    cardNumber: 'OP11-086',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Caribou', maxCost: 4 } }] } },
    ],
  },

  // OP11-088 (character) Shu —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[Once Per Turn] This effect can be activated when your opponent's Character attacks.
  //   If that Character has the <Slash> attribute, this Character gains +5000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP11-091 (character) Berry Good —
  //   [On Play] Your opponent places 3 Events from their trash at the bottom of their deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP11-092 (character) Helmeppo —
  //   [On Play] You may trash 1 card from your hand: Draw 1 card and play up to 1 {SWORD} type Character
  //   card with a cost of 8 or less other than [Helmeppo] from your trash. Then, place the 1 Character
  //   played by this effect at the bottom of the owner's deck at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-095 (character) Monkey.D.Garp —
  //   [On Play] You may place 3 {Navy} type cards from your trash at the bottom of your deck in any order:
  //   Give up to 1 rested DON!! card to 1 of your Leader. Then, if there is a Character with a cost of 9 or
  //   more, K.O. up to 1 of your opponent's Characters with a cost of 7 or less.
  // NOTE: not yet implemented (needs template).

  // OP11-096 (character) Ripper —
  //   If you have a black {Navy} type Character other than [Ripper], this Character gains [Blocker].(After
  //   your opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP11-097 — [Counter] up to 1 Leader/Char +1000 this battle. PARTIAL: the "10+ trash → recur black Char" rider needs a trash-count gate (deferred).
  { cardNumber: 'OP11-097', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }] } },

  // OP11-098 — [Main] trash 3 from top of deck: K.O. up to 1 opp Character cost ≤2. [Trigger] up to 1 Leader/Char +1000 this turn.
  {
    cardNumber: 'OP11-098',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP11-099 — [Main] Search {Navy} (excl. self), trash the rest. [Trigger] same.
  {
    cardNumber: 'OP11-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] } },
    ],
  },

  // OP11-100 (character) Otohime —
  //   [On Play] If your Leader is [Shirahoshi], you may turn 1 card from the top of your Life cards
  //   face-down: Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP11-101 (character) Capone"Gang"Bege —
  //   [Blocker][Once Per Turn] If your {Supernovas} type Character other than [Capone"Gang"Bege] would be
  //   removed from the field by your opponent's effect, you may add it to the top of your Life cards
  //   face-down instead.
  // NOTE: not yet implemented (needs template).

  // OP11-102 (character) Camie —
  //   [Your Turn] [Once Per Turn] This effect can be activated when your opponent activates an Event or
  //   [Trigger]. If your opponent has 2 or more Life cards, trash 1 card from the top of each of your and
  //   your opponent's Life cards.
  // NOTE: not yet implemented (needs template).

  // OP11-103 (character) Long-Jaw Neptunian —
  //   [Activate: Main] If your Leader is [Shirahoshi], you may rest this Character and turn 1 card from the
  //   top of your Life cards face-down: K.O. up to 1 of your opponent's Characters with a cost of 3 or
  //   less.
  // NOTE: not yet implemented (needs template).

  // OP11-104 (character) Shirley —
  //   [Blocker][On Play] You may turn 1 card from the top of your Life cards face-down: Look at 3 cards
  //   from the top of your deck; reveal up to 1 {Fish-Man Island} type card and add it to your hand. Then,
  //   place the rest at the top or bottom of the deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP11-106 — [On Play] You may add 1 Life card (top/bottom) to hand: K.O. up to 1 opp Character cost<=5.
  { cardNumber: 'OP11-106', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP11-107 (character) Topknot Neptunian —
  //   [Blocker][Activate: Main] [Once Per Turn] If your Leader is [Shirahoshi], you may turn 1 card from
  //   the top of your Life cards face-down: Set this Character as active at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-108 (character) Neptune —
  //   [On Play] If your Leader is [Shirahoshi], you may turn 1 card from the top of your Life cards
  //   face-down: Draw 2 cards and trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // OP11-109 — [On Play] If you have [Camie], draw 2 and trash 2 from hand.
  { cardNumber: 'OP11-109', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfControlsNamed', name: 'Camie' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP11-110 — [On Play] add 1 top/bottom Life to hand → K.O. up to 1 opp Character cost ≤1. PARTIAL: the K.O.-replacement clause is deferred.
  { cardNumber: 'OP11-110', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP11-112 — [Blocker][Opponent's Turn] If Leader [Shirahoshi], this Character +4000.
  { cardNumber: 'OP11-112', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 4000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderName', name: 'Shirahoshi' }] } }] } },

  // OP11-114 — [Counter] your Leader +3000 this battle. PARTIAL: the [Main] combined-Life-gated K.O. is deferred.
  { cardNumber: 'OP11-114', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  // OP11-115 — [Counter] If Leader [Shirahoshi], up to 1 Leader/Char +4000 this battle. [Trigger] K.O. up to 1 opp Character cost ≤2.
  {
    cardNumber: 'OP11-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Shirahoshi' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },

  // OP11-116 (event) Merman Combat Ultramarine —
  //   [Main] Add up to 1 Character with a cost of 6 or less to the top or bottom of the owner's Life cards
  //   face-up. [Trigger] Add up to 1 of your opponent's Characters with a cost of 4 or less to the top or
  //   bottom of the owner's Life cards face-up.
  // NOTE: not yet implemented (needs template).

  // OP11-117 (stage) Fish-Man Island —
  //   [Activate: Main] [Once Per Turn] If your Leader is [Shirahoshi], you may turn 1 card from the top of
  //   your Life cards face-up: Up to 1 of your {Neptunian}, {Fish-Man}, or {Merfolk} type Characters gains
  //   +1000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP11-118 — [Rush] [When Attacking] You may trash 1 from hand: return Character cost<=4 to hand, then give 1 rested DON!!.
  { cardNumber: 'OP11-118', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' },
    { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP11-119 (character) Koby —
  //   [On Play] Up to 1 of your Characters can also attack active Characters during this turn.[When
  //   Attacking] You may place 2 cards from your trash at the bottom of your deck in any order: Up to 1 of
  //   your Leader or Character cards gains +1000 power until the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).
];
