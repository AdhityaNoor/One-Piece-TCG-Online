/**
 * Reviewed effect template assignments - Main Booster OP13.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP13_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP13-001 (leader) Monkey.D.Luffy —
  //   [DON!! x1] [On Your Opponent's Attack] If you have 5 or less active DON!! cards, you may rest any
  //   number of your DON!! cards. For every DON!! card rested this way, this Leader or up to 1 of your
  //   {Straw Hat Crew} type Characters gains +2000 power during this battle.
  // NOTE: not yet implemented (needs template).

  // OP13-002 (leader) Portgas.D.Ace —
  //   [On Your Opponent's Attack] [Once Per Turn] You may trash 1 card from your hand: Give up to 1 of your
  //   opponent's Leader or Character cards −2000 power during this battle.[DON!! x1] [Once Per Turn] When
  //   you take damage or your Character with 6000 base power or more is K.O.'d, draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP13-003 (leader) Gol.D.Roger —
  //   If you have any DON!! cards on your field, 1 DON!! card placed during your DON!! Phase is given to
  //   your Leader.If you have 9 or less DON!! cards on your field, give this Leader −2000 power.
  //   PARTIAL: the DON-placement routing rule is deferred (needs DON-phase modifier).
  { cardNumber: 'OP13-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: -2000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 9 }] } }] } },

  // OP13-004 (leader) Sabo —
  //   If you have 4 or more Life cards, give this Leader −1000 power.[DON!! x1] If you have a Character
  //   with a cost of 8 or more, your Leader and all of your Characters gain +1000 power.
  {
    cardNumber: 'OP13-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: -1000, duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atLeast: 4 }] } }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 8 }] }] } },
    ],
  },

  // ── Triage batch (OP13 expressible). "give DON!! to [named]" is approximated as give-to-Leader/Char; OR-type/attr gates, any-DON-given & trash-count gates, and "turn Life face-up" cost are deferred. ──
  { cardNumber: 'OP13-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },

  { cardNumber: 'OP13-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP13-009 — If you have a {Mountain Bandits} Character other than this card, this Character gains [Double Attack].
  { cardNumber: 'OP13-009', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Mountain Bandits', atLeast: 2 }] } }] } },

  // OP13-007 (character) Ace & Sabo & Luffy —
  //   [Activate: Main] You may give 1 of your active DON!! cards to 1 of your Leader or Character cards and
  //   trash this Character: Give up to 1 of your opponent's Characters −3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP13-008 — aura K.O. replacement: trash this Character to save ally {Revolutionary Army} from opp effect K.O.
  {
    cardNumber: 'OP13-008',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Revolutionary Army'],
        trashSource: true,
        duration: 'permanent',
      }],
    },
  },
  // OP13-009 (character) Curly.Dadan —
  //   If you have a {Mountain Bandits} type Character other than this card, this Character gains [Double
  //   Attack].
  // NOTE: not yet implemented (needs template).

  // OP13-012 - [On Play] Look at 4; add Alabasta or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP13-012',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Alabasta' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } }] },
  },

  // OP13-013 — [On Play] K.O. up to 1 of your opponent's Characters with 0 power.
  { cardNumber: 'OP13-013', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true }] } },

  // OP13-014 — [Trigger] up to 1 [Portgas.D.Ace] +3000 this turn.
  { cardNumber: 'OP13-014', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Portgas.D.Ace' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  // OP13-015 — [Activate: Main] rest this: up to 1 [Monkey.D.Luffy] +2000 this turn.
  { cardNumber: 'OP13-015', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Monkey.D.Luffy' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP13-014 (character) Portgas.D.Rouge —
  //   [Trigger] Up to 1 of your [Portgas.D.Ace] cards gains +3000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP13-015 (character) Makino —
  //   [Activate: Main] You may rest this Character: Up to 1 of your [Monkey.D.Luffy] cards gains +2000
  //   power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP13-016 (character) Monkey.D.Garp —
  //   [On Play] If your Leader is [Sabo], [Portgas.D.Ace] or [Monkey.D.Luffy], look at 4 cards from the top
  //   of your deck; reveal up to 1 card with a cost of 3 or more and add it to your hand. Then, place the
  //   rest at the bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // OP13-017 (character) Monkey.D.Dragon —
  //   [Once Per Turn] If your {Revolutionary Army} type Character would be removed from the field by your
  //   opponent's effect, you may give this Character −2000 power during this turn instead.
  // NOTE: not yet implemented (needs template).

  // OP13-019 — [Main] rest 4 DON!!: give up to 1 opp Char −3000, K.O. up to 1 opp Char 3000 power or less. [Counter] Leader +3000.
  {
    cardNumber: 'OP13-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 4 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  {
    cardNumber: 'OP13-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP13-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'giveDon', count: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP13-022 (stage) — [Activate: Main] rest this: up to 1 Character base power ≤2000 +1000 this turn.
  { cardNumber: 'OP13-022', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { maxBasePower: 2000 } }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },

  // OP13-023 — [On Play] Set up to 2 DON!! active. PARTIAL: base-cost-5 play restriction and [On K.O.] play-rested deferred.
  { cardNumber: 'OP13-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP13-024 (character) Gordon —
  //   [On Play] You may reveal 1 {Music} or {FILM} type card from your hand: Set up to 2 of your DON!!
  //   cards as active at the end of this turn.
  // NOTE: not yet implemented (needs template).

  // OP13-025 (character) Koby —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] If your Leader has the {FILM} type or the <Strike> attribute, set up to 1 of
  //   your DON!! cards as active.
  // NOTE: not yet implemented (needs template).

  // OP13-026 (character) Sunny-Kun —
  //   [Activate: Main] [Once Per Turn] You may rest 1 of your DON!! cards: This Character gains +2000 power
  //   until the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // OP13-027 — [On Play] Set up to 2 DON!! active. PARTIAL: OR-type [End of Your Turn] ramp deferred.
  { cardNumber: 'OP13-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP13-028 (character) Shanks —
  //   [On Play] Set all of your DON!! cards as active. Then, you cannot play cards from your hand during
  //   this turn.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP13-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP13-031 (character) Trafalgar Law —
  //   If you have 1 or less Life cards, this Character gains [Blocker].[On Play] You may return 1 of your
  //   Characters to the owner's hand: Play up to 1 Character card with a cost of 5 or less from your hand
  //   rested.
  // NOTE: not yet implemented (needs template).

  // OP13-032 (character) Nico Robin —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 8 or less cannot be rested until the
  //   end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP13-033 — [On K.O.] Rest up to 2 opp Characters (the "or DON!!" option is dropped).
  { cardNumber: 'OP13-033', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 2 }] } },

  // OP13-034 — [On Play] If Leader {FILM} or {Straw Hat Crew}, set up to 1 DON!! active.
  { cardNumber: 'OP13-034', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'FILM' }, { kind: 'leaderType', type: 'Straw Hat Crew' }] }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP13-034 (character) Brook —
  //   [On Play] If your Leader has the {FILM} or {Straw Hat Crew} type, set up to 1 of your DON!! cards as
  //   active.
  // NOTE: not yet implemented (needs template).

  // OP13-035/037 — [End of Your Turn] Set this Character active (the "or 1 DON!!" alternative is dropped).
  { cardNumber: 'OP13-035', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },

  { cardNumber: 'OP13-037', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },

  // OP13-038 (event) Gum-Gum Elephant Gun —
  //   [Main] Rest up to 1 of your opponent's Characters with a cost of 5 or less. Then, set up to 2 of your
  //   DON!! cards as active at the end of this turn. [Trigger] Rest up to 1 of your opponent's Characters
  //   with a cost of 5 or less.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP13-039',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP13-040 — [Counter] Leader +3000. PARTIAL: the [Main] rest-2-DON preventRefresh is deferred.
  { cardNumber: 'OP13-040', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  { cardNumber: 'OP13-041', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }] } },

  // OP13-042 — [Blocker][On Play] Draw 2, trash 1, then give up to 2 rested DON!! to Leader/1 Char (the "each" split is approximated).
  { cardNumber: 'OP13-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'giveDon', count: 2 }] } },

  { cardNumber: 'OP13-043', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  {
    cardNumber: 'OP13-044',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  { cardNumber: 'OP13-045', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHand', atMost: 4 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP13-046 — PARTIAL: field-removal clause and [Double Attack] keyword deferred.
  {
    cardNumber: 'OP13-046',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        scope: 'effect',
        oncePerTurn: true,
        trashFromHand: { count: 1, filter: { typeIncludes: 'Whitebeard Pirates' } },
        duration: 'permanent',
      }],
    },
  },
  // OP13-047 — aura K.O. replacement: trash this Character to save ally Whitebeard Pirates from opp effect K.O.
  {
    cardNumber: 'OP13-047',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Whitebeard Pirates'],
        trashSource: true,
        duration: 'permanent',
      }],
    },
  },

  { cardNumber: 'OP13-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Boa Hancock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Boa Hancock', maxCost: 3 } }] } },

  // OP13-051 — [On K.O.] If Leader [Boa Hancock] or multicolored, draw 2.
  { cardNumber: 'OP13-051', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderName', name: 'Boa Hancock' }, { kind: 'leaderMulticolor' }] }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP13-051 (character) Boa Hancock —
  //   [On K.O.] If your Leader is [Boa Hancock] or multicolored, draw 2 cards.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP13-052', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Boa Hancock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Boa Hancock', maxCost: 6 } }] } },

  // OP13-053 (character) Marshall.D.Teach —
  //   [When Attacking] You may trash 1 of your Characters with a type including "Whitebeard Pirates": Draw
  //   1 card and this Character gains [Banish] during this turn.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP13-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'giveDon', count: 1 }] } },

  // OP13-055 (character) Rakuyo —
  //   [When Attacking] If you have 4 or less cards in your hand, all of your Characters with a type
  //   including "Whitebeard Pirates" gain +1000 power during this turn.
  //   The "if 4 or less cards" is checked once at attack time (ability gate); the granted +1000 then
  //   lasts the whole turn regardless of later hand size, so the aura itself carries no board gate.
  { cardNumber: 'OP13-055', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHand', atMost: 4 }], functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'duringThisTurn', anyOfTypes: ['Whitebeard Pirates'] }] } },

  { cardNumber: 'OP13-056', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP13-057 — [Counter] Leader +3000. PARTIAL: the [Main] rest-1-DON unblockable-Leader clause is deferred.
  { cardNumber: 'OP13-057', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  {
    cardNumber: 'OP13-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  {
    cardNumber: 'OP13-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP13-060 — aura K.O. replacement: trash this Character to save ally Roger Pirates from opp effect K.O.
  {
    cardNumber: 'OP13-060',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Roger Pirates'],
        trashSource: true,
        duration: 'permanent',
      }],
    },
  },
  // OP13-061 (character) Inuarashi —
  //   [On Play] If you have any DON!! cards given, add up to 1 DON!! card from your DON!! deck and rest it.
  //   Then, K.O. up to 1 of your opponent's Characters with a cost of 1 or less.
  // NOTE: not yet implemented (needs template).

  // OP13-062 — [When Attacking] Return up to 1 opp Character base power ≤3000 to hand. PARTIAL: any-DON-given [On Play] ramp deferred.
  { cardNumber: 'OP13-062', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP13-063 — [Blocker] [On Play] If you have any given DON!!, add up to 1 DON!! from deck rested.
  { cardNumber: 'OP13-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP13-063 (character) Kouzuki Oden —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] If you have any DON!! cards given, add up to 1 DON!! card from your DON!!
  //   deck and rest it.
  // NOTE: not yet implemented (needs template).

  // OP13-064 (character) Gol.D.Roger —
  //   Your Leader and all of your Characters that do not have a type including "Roger Pirates" have their
  //   effects negated.[On Play] DON!! −3: Your Leader gains +2000 power until the end of your opponent's
  //   next End Phase. Then, give all of your opponent's Characters −2000 power until the end of your
  //   opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // OP13-065 - [On Play] Look at 5; add Roger Pirates card other than this card's name.
  {
    cardNumber: 'OP13-065',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Roger Pirates', excludeSelfName: true } }] },
  },

  // OP13-066 (character) Silvers Rayleigh —
  //   [Rush][On Play] If you have any DON!! cards given, rest up to 1 of your opponent's Characters with a
  //   cost of 5 or less. Then, add up to 1 DON!! card from your DON!! deck and set it as active at the end
  //   of this turn.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP13-067', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Roger Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'addDonFromDeck', count: 1, rested: true }] } },

  {
    cardNumber: 'OP13-068',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Roger Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },

  { cardNumber: 'OP13-069', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'stage', maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  { cardNumber: 'OP13-071', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, optional: true }] } },

  // OP13-072 — [On Play] If Leader {Roger Pirates} and you have any given DON!!, add up to 1 DON!! from deck rested.
  { cardNumber: 'OP13-072', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Roger Pirates' }, { kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP13-072 (character) Buggy —
  //   [On Play] If your Leader's type includes "Roger Pirates" and you have any DON!! cards given, add up
  //   to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  { cardNumber: 'OP13-074', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Homies', maxPower: 3000 } }] } },

  // OP13-075/077 — [Counter] Leader +3000. PARTIAL: any-DON-given [Main] payoffs deferred.
  { cardNumber: 'OP13-075', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  // OP13-076 — [Counter] trash 1 → up to 1 Leader/Char +3000 this battle. PARTIAL: any-DON-given [Main] payoff deferred.
  { cardNumber: 'OP13-076', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP13-077', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' }] } },

  // OP13-078 (stage) Oro Jackson —
  //   [Once Per Turn] When your Character with a type including "Roger Pirates" is removed from the field
  //   by your opponent's effect, add up to 1 DON!! card from your DON!! deck and rest it.
  // NOTE: not yet implemented (needs template).

  // OP13-079 (leader) Imu —
  //   Under the rules of this game, you cannot include Events with a cost of 2 or more in your deck and at
  //   the start of the game, play up to 1 {Mary Geoise} type Stage card from your deck.[Activate: Main]
  //   [Once Per Turn] You may trash 1 of your {Celestial Dragons} type Characters or 1 card from your hand:
  //   Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // OP13-080 (character) St. Ethanbaron V. Nusjuro —
  //   If you have 7 or more cards in your trash, this Character cannot be removed from the field by your
  //   opponent's effects and gains [Rush].[When Attacking] If you have 10 or more cards in your trash, give
  //   up to 1 of your opponent's Characters −2000 power during this turn.
  // NOTE: not yet implemented (needs template).

  // OP13-081 (character) Koala —
  //   If your Leader has the {Revolutionary Army} type, this Character gains +3 cost.[Activate: Main] [Once
  //   Per Turn] You may place 1 card from your trash at the bottom of your deck: Give up to 1 rested DON!!
  //   card to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // OP13-082 (character) Five Elders —
  //   [Activate: Main] If your Leader is [Imu], you may rest 1 of your DON!! cards and trash 1 card from
  //   your hand: Trash all of your Characters and play up to 5 {Five Elders} type Character cards with 5000
  //   power and different card names from your trash.
  // NOTE: not yet implemented (needs template).

  // OP13-083 — [On Play] Look 5, reveal up to 1 {Five Elders} to hand, rest to bottom. PARTIAL: static trash-count immunity deferred.
  { cardNumber: 'OP13-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Five Elders' }, remainder: 'bottom' }] } },

  // OP13-084 (character) St. Shepherd Ju Peter —
  //   If you have 7 or more cards in your trash, this Character cannot be removed from the field by your
  //   opponent's effects.[Your Turn] If you have 10 or more cards in your trash, set the base power of all
  //   of your {Five Elders} type Characters to 7000.
  // NOTE: not yet implemented (needs template).

  // OP13-086 - [On Play] Look at 3; add Celestial Dragons other than self, trash rest, then trash 1 from hand.
  {
    cardNumber: 'OP13-086',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  { cardNumber: 'OP13-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 1 }] } },

  // OP13-089 — [On K.O.] Draw 1. PARTIAL: static trash-count immunity/[Blocker] deferred.
  { cardNumber: 'OP13-089', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP13-091 — [On Play] trash 1 → K.O. up to 1 opp Character base cost ≤5. PARTIAL: static trash-count immunity/[Blocker] deferred.
  { cardNumber: 'OP13-091', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP13-092 (character) Saint Mjosgard —
  //   [On Play] If you have 3 or less Life cards, play up to 1 {Mary Geoise} type Stage card with a cost of
  //   1 from your trash.
  // NOTE: not yet implemented (needs template).

  // OP13-093 - [Blocker] [On Play] Draw 2 cards, then trash 2 cards from hand.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw/trash is templated.
  { cardNumber: 'OP13-093', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  { cardNumber: 'OP13-094', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Celestial Dragons' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP13-095 (character) Saint Rosward —
  //   [On Play] You may trash 1 card from your hand: If you only have {Celestial Dragons} type Characters,
  //   K.O. up to 2 of your opponent's Characters with a base cost of 3 or less.
  // NOTE: not yet implemented (needs template).

  {
    cardNumber: 'OP13-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons' }, remainder: 'trash' }] } },
    ],
  },

  // OP13-097 — [Counter] Leader +3000. PARTIAL: the only-CD-Characters [Main] K.O. gate is deferred.
  { cardNumber: 'OP13-097', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  // OP13-098 — [Counter] If Leader [Imu], up to 1 Leader/Char +4000 this battle. PARTIAL: the [Main] Stage K.O. is deferred.
  { cardNumber: 'OP13-098', templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Imu' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },

  // OP13-099 (stage) The Empty Throne —
  //   [Your Turn] If you have 19 or more cards in your trash, your Leader gains +1000 power.[Activate:
  //   Main] You may rest this card and 3 of your DON!! cards: Play up to 1 black {Five Elders} type
  //   Character card with a cost equal to or less than the number of DON!! cards on your field from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // OP13-100 (leader) Jewelry Bonney —
  //   [Your Turn] [Once Per Turn] This effect can be activated when you play a Character with a [Trigger].
  //   Give up to 2 rested DON!! cards to 1 of your Leader or Character cards.
  // NOTE: not yet implemented (needs template).

  // OP13-102 — [Trigger] Draw 1, rest up to 1 opp Character cost ≤3. PARTIAL: the trash-self [Main] is deferred.
  { cardNumber: 'OP13-102', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  { cardNumber: 'OP13-104', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP13-105 (character) Kouzuki Momonosuke —
  //   [On Play] Look at all of your Life cards and place them back in your Life area in any order.
  // NOTE: not yet implemented (needs template).

  // OP13-106 (character) Conney —
  //   [Opponent's Turn] When a [Trigger] activates, this Character gains [Blocker] during this turn.
  //   [Trigger] Play this card.
  // NOTE: not yet implemented (needs template).

  // OP13-108 — [On Play] If Leader {Egghead}, this gains [Rush] this turn. [Trigger] if ≤1 Life rest opp cost ≤7. PARTIAL: opp-life drawback deferred.
  {
    cardNumber: 'OP13-108',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, optional: true }] } },
    ],
  },

  // OP13-109 — [Trigger] Draw 2, trash 1. PARTIAL: the turn-Life-face-up replacement is deferred.
  { cardNumber: 'OP13-109', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP13-110 — [Blocker] [On Play] If Leader {Egghead}, play up to 1 Character cost<=5 with a [Trigger] from hand.
  { cardNumber: 'OP13-110', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5, hasTrigger: true } }] } },

  // OP13-112 — If you have 2 or more given DON!!, this Character gains [Blocker].
  { cardNumber: 'OP13-112', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfGivenDonCount', atLeast: 2 }] } }] } },

  // OP13-112 (character) Vegapunk —
  //   If you have a total of 2 or more given DON!! cards, this Character gains [Blocker].(After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // OP13-113 — [On Play] look 4, reveal up to 1 card with a [Trigger] (other than [Lilith]), add to hand, rest to bottom. [Trigger] Activate this effect.
  {
    cardNumber: 'OP13-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { hasTrigger: true, excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { hasTrigger: true, excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },

  // OP13-114 — [Trigger] trash 1 → play this. PARTIAL: the turn-Life-face-up main is deferred.
  { cardNumber: 'OP13-114', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },

  // OP13-115 — [Counter] +3000 this battle, then if opp ≤2 Life +1000 this turn. [Trigger] Draw 1.
  {
    cardNumber: 'OP13-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'opponentLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  {
    cardNumber: 'OP13-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' }, remainder: 'bottom' }] } },
    ],
  },

  // OP13-117 — [Trigger] Draw 1. PARTIAL: the turn-Life-face-up [Main] K.O. is deferred.
  { cardNumber: 'OP13-117', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },

  // OP13-118 — [Double Attack][On Play] If Leader multicolored, set up to 4 DON!! active. PARTIAL: base-cost-5 play restriction deferred.
  { cardNumber: 'OP13-118', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 4 }] } },

  // OP13-119 — static: if ≤3 Life, [Rush]. [On Play] give 1 rested DON!! to Leader, then return up to 1 opp Char cost ≤5. PARTIAL: opp-play drawback deferred.
  {
    cardNumber: 'OP13-119',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

];
