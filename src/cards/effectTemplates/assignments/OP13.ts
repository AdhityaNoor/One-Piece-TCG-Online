/**
 * Reviewed effect template assignments - Main Booster OP13.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP13_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP13-001 — PARTIAL: variable DON rest → scaling +2000 deferred; mapped rest-1-DON → +2000 Straw Hat Crew battle buff.
  {
    cardNumber: 'OP13-001',
    templateId: 'ability',
    params: {
      timing: 'onOpponentsAttack',
      condition: { donAttachedAtLeast: 1 },
      cost: [{ kind: 'restDon', count: 1 }],
      functions: [{
        fn: 'addPower',
        target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew' } },
        amount: 2000,
        duration: 'duringThisBattle',
        optional: true,
      }],
    },
  },

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
  {
    cardNumber: 'OP13-007',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Give 1 active DON!! and trash this Character?',
        options: [
          { label: 'skip', functions: [] },
          {
            label: 'pay',
            functions: [
              { fn: 'giveDon', count: 1, activeDonOnly: true },
              { fn: 'trashSelf', ifPrevious: 'previousMovedAny' },
              { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
            ],
          },
        ],
      }],
    },
  },

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



  // OP13-016 — [On Play] if Leader is Sabo/Ace/Luffy, search top 4 for cost 3+ card.
  {
    cardNumber: 'OP13-016',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderName', name: 'Sabo' }, { kind: 'leaderName', name: 'Portgas.D.Ace' }, { kind: 'leaderName', name: 'Monkey.D.Luffy' }] }],
      functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 3 } }],
    },
  },

  {
    cardNumber: 'OP13-017',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        oncePerTurn: true,
        replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
        effectSourceController: 'opponent',
        anyOfTypes: ['Revolutionary Army'],
        giveSelfPowerPenalty: { amount: 2000, duration: 'duringThisTurn' },
        duration: 'permanent',
      }],
    },
  },

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

  // OP13-023 — [On Play] set 2 DON active + block base-cost-5+ Characters. [On K.O.] play cost≤5 Character rested.
  {
    cardNumber: 'OP13-023',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'setActiveControllerDon', maxTargets: 2 },
        { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn', minBaseCost: 5 },
      ] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5 }, rested: true }] } },
    ],
  },

  // OP13-024 (character) Gordon —
  //   [On Play] You may reveal 1 {Music} or {FILM} from hand: set up to 2 DON!! active at end of turn.
  {
    cardNumber: 'OP13-024',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        {
          fn: 'optionalRevealTypeFromHand',
          filter: { anyOf: [{ typeIncludes: 'Music' }, { typeIncludes: 'FILM' }] },
          prompt: 'You may reveal 1 {Music} or {FILM} type card from your hand.',
        },
        { fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 2, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },



  // OP13-027 — [On Play] set up to 2 DON!! active. [End of Your Turn] if Leader {FILM} or {Straw Hat Crew}, set up to 1 DON!! active.
  {
    cardNumber: 'OP13-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'FILM' }, { kind: 'leaderType', type: 'Straw Hat Crew' }] }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
    ],
  },

  // OP13-028 — [On Play] Set all DON active, then cannot play cards from hand this turn.
  {
    cardNumber: 'OP13-028',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'setActiveControllerDon', maxTargets: 10 },
        { fn: 'preventControllerHandPlay', duration: 'duringThisTurn' },
      ],
    },
  },

  { cardNumber: 'OP13-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // OP13-032 (character) Nico Robin —
  //   [On Play] Up to 1 of your opponent's Characters with a cost of 8 or less cannot be rested until the
  //   end of your opponent's next End Phase.
  { cardNumber: 'OP13-032', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP13-033 — [On K.O.] Rest up to 2 opposing Characters or DON!! cards.
  { cardNumber: 'OP13-033', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose cards to rest.', options: [{ label: 'characters', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 2 }] }, { label: 'don', functions: [{ fn: 'restOpponentDon', maxTargets: 2 }] }] }] } },

  // OP13-034 — [On Play] If Leader {FILM} or {Straw Hat Crew}, set up to 1 DON!! active.
  { cardNumber: 'OP13-034', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'FILM' }, { kind: 'leaderType', type: 'Straw Hat Crew' }] }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },


  // OP13-035/037 — [End of Your Turn] Set this Character or up to 1 DON!! active.
  { cardNumber: 'OP13-035', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose a card to set active.', options: [{ label: 'thisCharacter', functions: [{ fn: 'setActiveSelf' }] }, { label: 'don', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] }] }] } },

  { cardNumber: 'OP13-037', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose a card to set active.', options: [{ label: 'thisCharacter', functions: [{ fn: 'setActiveSelf' }] }, { label: 'don', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] }] }] } },


  {
    cardNumber: 'OP13-039',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP13-040 — [Main] Rest 2 DON!!: up to 2 rested opponent Characters cost <=7 do not refresh. [Counter] Leader +3000.
  {
    cardNumber: 'OP13-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 7 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

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

  // OP13-046 — [Double Attack]; [OPT] if K.O.'d or removed by opponent effect, trash Whitebeard Pirates from hand instead.
  {
    cardNumber: 'OP13-046',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementSelf',
            scope: 'effect',
            oncePerTurn: true,
            replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
            effectSourceController: 'opponent',
            trashFromHand: { count: 1, filter: { typeIncludes: 'Whitebeard Pirates' } },
            duration: 'permanent',
          }],
        },
      },
    ],
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


  { cardNumber: 'OP13-052', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Boa Hancock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Boa Hancock', maxCost: 6 } }] } },

  // OP13-053 (character) Marshall.D.Teach —
  //   [When Attacking] You may trash 1 of your Characters with a type including "Whitebeard Pirates": Draw
  //   1 card and this Character gains [Banish] during this turn.
  { cardNumber: 'OP13-053', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Trash 1 Whitebeard Pirates Character?',
    options: [
      { label: 'skip', functions: [] },
      { label: 'pay', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Whitebeard Pirates' } }, to: { zone: 'trash', player: 'owner' }, minTargets: 1, maxTargets: 1 },
        { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
      ] },
    ],
  }] } },

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

  {
    cardNumber: 'OP13-062',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP13-063 — [Blocker] [On Play] If you have any given DON!!, add up to 1 DON!! from deck rested.
  { cardNumber: 'OP13-063', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },


  // PARTIAL: static type-filtered controller negation deferred; mapped [On Play] DON!! −3 payoff only.
  {
    cardNumber: 'OP13-064',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      cost: [{ kind: 'donMinus', count: 3 }],
      functions: [
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn' },
        { fn: 'addPowerAuraOpponentCharacters', amount: -2000, duration: 'endOfOpponentsTurn' },
      ],
    },
  },

  // OP13-065 - [On Play] Look at 5; add Roger Pirates card other than this card's name.
  {
    cardNumber: 'OP13-065',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Roger Pirates', excludeSelfName: true } }] },
  },


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


  { cardNumber: 'OP13-074', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Homies', maxPower: 3000 } }] } },

  {
    cardNumber: 'OP13-075',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'leaderName', name: 'Gol.D.Roger' }, { kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  {
    cardNumber: 'OP13-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 5 }], gate: [{ kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -8000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  { cardNumber: 'OP13-077', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' }] } },

  // OP13-078 (stage) Oro Jackson —
  //   [Once Per Turn] When your Character with a type including "Roger Pirates" is removed from the field
  //   by your opponent's effect, add up to 1 DON!! card from your DON!! deck and rest it.
  { cardNumber: 'OP13-078', templateId: 'ability', params: {
    timing: 'onRemovedFromField',
    oncePerTurn: true,
    gate: [
      { kind: 'removedFromFieldCategory', category: 'character' },
      { kind: 'removedFromFieldController', player: 'controller' },
      { kind: 'removedFromFieldTypeIncludes', typeIncludes: 'Roger Pirates' },
      { kind: 'removedByEffectController', player: 'opponent' },
    ],
    functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }],
  } },
  // OP13-079 (leader) Imu —
  //   Under the rules of this game, you cannot include Events with a cost of 2 or more in your deck and at
  //   the start of the game, play up to 1 {Mary Geoise} type Stage card from your deck.[Activate: Main]
  //   [Once Per Turn] You may trash 1 of your {Celestial Dragons} type Characters or 1 card from your hand:
  //   Draw 1 card.
  // PARTIAL: deck construction and start-of-game Stage play remain deferred.
  { cardNumber: 'OP13-079', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose a card to trash.',
    options: [
      { label: 'character', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Celestial Dragons' } }, to: { zone: 'trash', player: 'owner' }, minTargets: 1, maxTargets: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] },
      { label: 'hand', functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] },
    ],
  }] } },

  // OP13-080 (character) St. Ethanbaron V. Nusjuro —
  //   If you have 7 or more cards in your trash, this Character cannot be removed from the field by your
  //   opponent's effects and gains [Rush].[When Attacking] If you have 10 or more cards in your trash, give
  //   up to 1 of your opponent's Characters −2000 power during this turn.
  // PARTIAL: field-removal immunity remains deferred; [Rush] and attack debuff are mapped.
  {
    cardNumber: 'OP13-080',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 7 }] } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfTrashCount', atLeast: 10 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP13-081 (character) Koala —
  //   If your Leader has the {Revolutionary Army} type, this Character gains +3 cost.[Activate: Main] [Once
  //   Per Turn] You may place 1 card from your trash at the bottom of your deck: Give up to 1 rested DON!!
  //   card to your Leader or 1 of your Characters.
  {
    cardNumber: 'OP13-081',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Place 1 card from trash at the bottom of your deck?',
        options: [
          { label: 'skip', functions: [] },
          { label: 'pay', functions: [
            { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, minTargets: 1, maxTargets: 1 },
            { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
          ] },
        ],
      }] } },
    ],
  },

  // OP13-082 (character) Five Elders —
  //   [Activate: Main] If your Leader is [Imu], you may rest 1 of your DON!! cards and trash 1 card from
  //   your hand: Trash all of your Characters and play up to 5 {Five Elders} type Character cards with 5000
  //   power and different card names from your trash.
  // PARTIAL: "different card names" across the played cards is not enforced yet.
  {
    cardNumber: 'OP13-082',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restDon', count: 1 }],
      gate: [{ kind: 'leaderName', name: 'Imu' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Trash 1 card from hand?',
        options: [
          { label: 'skip', functions: [] },
          {
            label: 'pay',
            functions: [
              { fn: 'trashFromHand', count: 1 },
              { fn: 'moveAllCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'trash', player: 'owner' }, ifPrevious: 'previousMovedAny' },
              { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Five Elders', exactPower: 5000 }, maxTargets: 5 },
            ],
          },
        ],
      }],
    },
  },

  // OP13-083 — [On Play] Look 5, reveal up to 1 {Five Elders} to hand, rest to bottom. PARTIAL: static trash-count immunity deferred.
  { cardNumber: 'OP13-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Five Elders' }, remainder: 'bottom' }] } },

  // OP13-084 (character) St. Shepherd Ju Peter —
  //   If you have 7 or more cards in your trash, this Character cannot be removed from the field by your
  //   opponent's effects.[Your Turn] If you have 10 or more cards in your trash, set the base power of all
  //   of your {Five Elders} type Characters to 7000.
  // PARTIAL: field-removal immunity remains deferred; Five Elders base-power aura is mapped.
  { cardNumber: 'OP13-084', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'setBasePowerAuraControllerTypes', value: 7000, duration: 'permanent', anyOfTypes: ['Five Elders'], sourceCondition: { turn: 'your' }, gate: [{ kind: 'selfTrashCount', atLeast: 10 }] }] } },

  // OP13-086 - [On Play] Look at 3; add Celestial Dragons other than self, trash rest, then trash 1 from hand.
  {
    cardNumber: 'OP13-086',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  { cardNumber: 'OP13-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 1 }] } },

  // OP13-089 — [On K.O.] Draw 1. PARTIAL: static trash-count immunity deferred.
  {
    cardNumber: 'OP13-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 7 }] } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP13-091 — [On Play] trash 1 → K.O. up to 1 opp Character base cost ≤5. PARTIAL: static trash-count immunity deferred.
  {
    cardNumber: 'OP13-091',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 7 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },


  // OP13-093 - [Blocker] [On Play] Draw 2 cards, then trash 2 cards from hand.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw/trash is templated.
  { cardNumber: 'OP13-093', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  { cardNumber: 'OP13-094', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Celestial Dragons' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },


  {
    cardNumber: 'OP13-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons' }, remainder: 'trash' }] } },
    ],
  },

  // OP13-097 — [Main] Rest 5 DON!!: if only Celestial Dragons Characters, K.O. opp Character base cost <=6. [Counter] Leader +3000.
  {
    cardNumber: 'OP13-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 5 }], gate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'Celestial Dragons' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP13-098 — [Main] Rest 1 DON!!: if Leader [Imu], trash opponent Stage cost 7. [Counter] If Leader [Imu], +4000.
  {
    cardNumber: 'OP13-098',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], gate: [{ kind: 'leaderName', name: 'Imu' }], functions: [{ fn: 'moveCards', from: { zone: 'stages', player: 'opponent', filter: { exactCost: 7 } }, to: { zone: 'trash', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Imu' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
    ],
  },

  // OP13-099 — PARTIAL: play cost should scale with DON!! on field; mapped maxCost 10 proxy.
  {
    cardNumber: 'OP13-099',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'permanent', condition: { turn: 'your', gate: [{ kind: 'selfTrashCount', atLeast: 19 }] } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }, { kind: 'restDon', count: 3 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'black', typeIncludes: 'Five Elders', maxCost: 10 }, optional: true }] } },
    ],
  },

  // OP13-100 (leader) Jewelry Bonney —
  //   [Your Turn] [Once Per Turn] This effect can be activated when you play a Character with a [Trigger].
  //   Give up to 2 rested DON!! cards to 1 of your Leader or Character cards.
  // PARTIAL: played-Character [Trigger] gate deferred; mapped giveDon on any Character play.
  {
    cardNumber: 'OP13-100',
    templateId: 'ability',
    params: {
      timing: 'onCharacterPlayedFromHand',
      oncePerTurn: true,
      condition: { turn: 'your' },
      functions: [{ fn: 'giveDon', count: 2 }],
    },
  },

  // OP13-102 — [Trigger] Draw 1, rest up to 1 opp Character cost <=3.
  //   [Activate: Main] Trash this Character: if your Life <= opponent's Life, draw 1, then rest up to 1 opp Character cost <=3.
  {
    cardNumber: 'OP13-102',
    templates: [
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfLifeAtMostOpponent' }], functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true },
      ] } },
    ],
  },

  { cardNumber: 'OP13-104', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP13-105 (character) Kouzuki Momonosuke —
  //   [On Play] Look at all of your Life cards and place them back in your Life area in any order.
  { cardNumber: 'OP13-105', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'lookLifeAndReorder' }] } },

  {
    cardNumber: 'OP13-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onTriggerActivated', condition: { turn: 'opponent' }, functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP13-108 — [On Play] If Leader {Egghead}, this gains [Rush] and opponent adds top Life to hand. [Trigger] if ≤1 Life rest opp cost ≤7.
  {
    cardNumber: 'OP13-108',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
        { fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' } },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, optional: true }] } },
    ],
  },

  // OP13-109 — If removed by opponent effect, turn top Life face-up instead. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP13-109',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementSelf',
            scope: 'effect',
            replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
            effectSourceController: 'opponent',
            turnTopLifeFace: { faceUp: true },
            duration: 'permanent',
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP13-110 — [Blocker] [On Play] If Leader {Egghead}, play up to 1 Character cost<=5 with a [Trigger] from hand.
  { cardNumber: 'OP13-110', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5, hasTrigger: true } }] } },

  // OP13-112 — If you have 2 or more given DON!!, this Character gains [Blocker].
  { cardNumber: 'OP13-112', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfGivenDonCount', atLeast: 2 }] } }] } },


  // OP13-113 — [On Play] look 4, reveal up to 1 card with a [Trigger] (other than [Lilith]), add to hand, rest to bottom. [Trigger] Activate this effect.
  {
    cardNumber: 'OP13-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { hasTrigger: true, excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { hasTrigger: true, excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },

  {
    cardNumber: 'OP13-114',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

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

  {
    cardNumber: 'OP13-117',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 6 } }, optional: true, ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP13-118 — [Double Attack][On Play] If Leader multicolored, set up to 4 DON!! active, then cannot play base-cost-5+ Characters this turn.
  { cardNumber: 'OP13-118', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [
    { fn: 'setActiveControllerDon', maxTargets: 4 },
    { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn', minBaseCost: 5 },
  ] } },

  // OP13-119 — static: if ≤3 Life, [Rush]. [On Play] give 1 rested DON!! to Leader, then return up to 1 opp Char cost ≤5. PARTIAL: opp-play drawback deferred.
  {
    cardNumber: 'OP13-119',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP13-025', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'FILM' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  { cardNumber: 'OP13-026', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn' }] } },

  { cardNumber: 'OP13-038', templates: [{ templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } }, { templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } }] },

  { cardNumber: 'OP13-061', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  { cardNumber: 'OP13-066', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfGivenDonCount', atLeast: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },

  { cardNumber: 'OP13-092', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'playFromTrash', filter: { category: 'stage', typeIncludes: 'Mary Geoise', exactCost: 1 } }] } },

  { cardNumber: 'OP13-095', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 3 } }, optional: true, maxTargets: 2, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'Celestial Dragons' }] }] } },

  // PARTIAL: onOpponentsAttack −2000 only; damage/KO draw trigger deferred.
  { cardNumber: 'OP13-002', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },

  { cardNumber: 'OP13-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP13-120 — [Activate: Main] [OPT] Character +2 cost until end of opp next turn, then give 1 rested DON!!.
  { cardNumber: 'OP13-120', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'addCost', target: { group: 'characters', player: 'controller' }, amount: 2, duration: 'endOfOpponentsTurn', optional: true },
    { fn: 'giveDon', count: 1, ifPrevious: 'previousSelectedAny' },
  ] } },

];
