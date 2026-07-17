/**
 * Reviewed effect template assignments — Extra Booster sets (EB01, EB02).
 *
 * Only add a card here after:
 *   1. Reading the card's English effect text.
 *   2. Confirming the chosen template + params match the real ruling behavior.
 *   3. Verifying the resulting EffectProgram is JSON-serializable.
 *
 * Do NOT copy raw effect text into params. Params are structural only.
 */
import type { CardEffectAssignment } from '../assembler';

export const EB_ASSIGNMENTS: CardEffectAssignment[] = [

  // --- Batch: EB01 expressible ---
  // --- Batch: EB02 expressible ---
  // --- Batch: EB03 expressible ---
  // --- Batch: EB04 expressible ---
  // EB01-001 (leader) Kouzuki Oden — PARTIAL: +1000 Counter aura for Land of Wano without Counter deferred; cost≥5 gate approximated.
  {
    cardNumber: 'EB01-001',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Land of Wano', atLeast: 1 }],
      functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'untilStartOfNextTurn' }],
    },
  },

  {
    cardNumber: 'EB01-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          oncePerTurn: true,
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            {
              fn: 'addPower',
              target: { group: 'leaderOrCharacters', player: 'opponent' },
              amount: -2000,
              duration: 'duringThisTurn',
              optional: true,
              ifPrevious: 'previousMovedAny',
              ifGate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Land of Wano' }, { kind: 'leaderType', type: 'Whitebeard Pirates' }] }],
            },
          ],
        },
      },
    ],
  },
  // EB01-003 - [Rush] [When Attacking] If opponent has 2 or less Life, this Character +2000 this turn.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking power effect is templated.
  { cardNumber: 'EB01-003', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentLife', atMost: 2 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // EB01-004 — [When Attacking] You may give your active Leader −5000: up to 1 opp Character −3000 this turn.
  {
    cardNumber: 'EB01-004',
    templateId: 'ability',
    params: {
      timing: 'whenAttacking',
      functions: [
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'leaderActive' }] },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },
  // EB01-006 - [Blocker] [DON!! x2] [When Attacking] Give opponent Character -3000 power.
  // Note: [Blocker] is an engine keyword flag. Only the when-attacking power effect is templated.
  { cardNumber: 'EB01-006', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // EB01-007 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'EB01-007', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // EB01-008 — [Once Per Turn] K.O. replacement: trash Event or Stage from hand (effect scope only).
  {
    cardNumber: 'EB01-008',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        scope: 'effect',
        oncePerTurn: true,
        trashFromHand: { count: 1, filter: { categories: ['event', 'stage'] } },
        duration: 'permanent',
      }],
    },
  },
  // EB01-009 (event) Just Shut Up and Come with Us!!!! —
  //   [Counter] Look at 5 cards from the top of your deck and play up to 1 {Animal} type Character card
  //   with a cost of 3 or less. Then, place the rest at the bottom of your deck in any order.
  {
    cardNumber: 'EB01-009',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: false, destination: 'play', filter: { category: 'character', typeIncludes: 'Animal', maxCost: 3 }, remainder: 'bottom' }] },
  },

  // EB01-010 — (Event) [Counter] K.O. up to 1 opp Character 6000 base power or less. [Trigger] 5000 base power or less.
  {
    cardNumber: 'EB01-010',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'EB01-011',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { exactBasePower: 1000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1 },
        { fn: 'draw', amount: 1 },
      ],
    },
  },
  // EB01-012 (character) Cavendish —
  //   [On Play]/[When Attacking] If your Leader has the {Supernovas} type and you have no other [Cavendish]
  //   Characters, set up to 2 of your DON!! cards as active.
  {
    cardNumber: 'EB01-012',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'selfOtherNamedCharacterCount', name: 'Cavendish', atMost: 0 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'selfOtherNamedCharacterCount', name: 'Cavendish', atMost: 0 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
    ],
  },

  // EB01-013 — [Activate: Main] trash this: play up to 1 {Land of Wano} cost<=5 (other than [Kouzuki Hiyori]) from hand; then draw 1.
  { cardNumber: 'EB01-013', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 5, excludeSelfName: true } },
    { fn: 'draw', amount: 1 },
  ] } },

  // EB01-014 — [DON!! x1] [Your Turn] +1000 power for every 3 of your rested DON!!.
  { cardNumber: 'EB01-014', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerRestedDon', step: 3, amountPer: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your' } }] } },

  // EB01-015 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-016 - [Activate: Main] Rest this Character: K.O. up to 1 rested opponent Character cost 1 or less.
  { cardNumber: 'EB01-016', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 1 } }, optional: true }] } },

  // EB01-019 - [Counter] +4000 to Leader/Character, then reveal-search top 3 for Donquixote Pirates Character.
  {
    cardNumber: 'EB01-019',
    templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates' } }] },
  },

  // EB01-020 (event) Chambres — return 1 Character, play cost≤2 Character different color than returned.
  {
    cardNumber: 'EB01-020',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          gate: [{ kind: 'leaderType', type: 'Supernovas' }],
          functions: [
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
            { fn: 'playFromHand', filter: { category: 'character', maxCost: 2, excludeColorsOfPreviousMove: true }, optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          gate: [{ kind: 'leaderType', type: 'Supernovas' }],
          functions: [
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
            { fn: 'playFromHand', filter: { category: 'character', maxCost: 2, excludeColorsOfPreviousMove: true }, optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  {
    cardNumber: 'EB01-021',
    templateId: 'ability',
    params: {
      timing: 'endOfTurn',
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Impel Down', minBaseCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
        { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' },
      ],
    },
  },
  // EB01-022 — [End of Your Turn] If you have 2 or less cards in hand, draw 2.
  { cardNumber: 'EB01-022', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 2 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // EB01-023 — [On Play] Draw 1 card.
  { cardNumber: 'EB01-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // EB01-024 (character) Hamlet —
  //   If you have 4 or less cards in your hand, all of your {SMILE} type Characters gain +1000 power.
  { cardNumber: 'EB01-024', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', anyOfTypes: ['SMILE'], gate: [{ kind: 'selfHand', atMost: 4 }] }] } },

  // EB01-026 - [DON!! x1] [When Attacking] If hand has 1 or less, return cost <=3 Character to hand.
  { cardNumber: 'EB01-026', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHand', atMost: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // EB01-027 — If Leader {Baroque Works}, +1000 power for every 2 Events in trash. [On Play] Draw 2 and trash 1.
  {
    cardNumber: 'EB01-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerTrashEvents', step: 2, amountPer: 1000, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Baroque Works' }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // EB01-028 — Counter: +2000 if Leader {Impel Down}; then return 1 opp active Character to hand. Trigger: return cost≤3 to deck bottom.
  {
    cardNumber: 'EB01-028',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifGate: [{ kind: 'leaderType', type: 'Impel Down' }] },
            { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { rested: false } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }],
        },
      },
    ],
  },

  // EB01-029 (event) Sorry. I'm a Goner. —
  {
    cardNumber: 'EB01-029',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'revealTopThen', filter: { minCost: 4 }, then: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] },
            { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'deck', player: 'owner', position: 'bottom' } },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'EB01-030',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'moveSelfToBottomDeck' },
            { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1, ifPrevious: 'previousMovedAny' },
            { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // EB01-031 — [On Play] DON!! −1: If Leader {Water Seven}, add up to 2 Characters cost<=4 from trash to hand.
  { cardNumber: 'EB01-031', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 2 }] } },

  // EB01-033 — [On Play] DON!! −1: If Leader {Water Seven}, play up to 1 {Water Seven} Character cost==5 (other than Blueno) from hand or trash.
  {
    cardNumber: 'EB01-033',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      cost: [{ kind: 'donMinus', count: 1 }],
      gate: [{ kind: 'leaderType', type: 'Water Seven' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Play Water Seven Character from:',
        options: [
          { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Water Seven', exactCost: 5, excludeSelfName: true } }] },
          { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Water Seven', exactCost: 5, excludeSelfName: true } }] },
        ],
      }],
    },
  },

  {
    cardNumber: 'EB01-034',
    templateId: 'ability',
    params: {
      timing: 'onOpponentsAttack',
      oncePerTurn: true,
      cost: [{ kind: 'donMinus', count: 1 }],
      gate: [{ kind: 'leaderType', type: 'Baroque Works' }],
      functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }],
    },
  },
  // EB01-035 — [On Play] If Leader {Baroque Works}, up to 1 Leader/Character +1000 this turn. [Trigger] DON!! −1: play this.
  {
    cardNumber: 'EB01-035',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // EB01-036 - [Rush] [On K.O.] If Leader has Impel Down type, add 1 rested DON!!.
  // Note: [Rush] is an engine keyword flag. Only the on-K.O. DON!! ramp is templated.
  {
    cardNumber: 'EB01-036',
    templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] },
  },

  // EB01-037 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: K.O. up to 1 opp Character cost<=2.
  { cardNumber: 'EB01-037', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-038 - [Counter] DON!! -1 redirect attack to your Baroque Works Character. [Trigger] DON!! -1 draw 2.
  {
    cardNumber: 'EB01-038',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'redirectAttackTarget', target: { group: 'characters', player: 'controller' }, optional: false }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // EB01-039 - [Main] DON!! -1: K.O. cost <=8. [Trigger] add 1 active DON!!.
  {
    cardNumber: 'EB01-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // EB01-040 — (Leader) [Activate: Main] [Once Per Turn] turn 1 top Life face-up: K.O. up to 1 opp Character cost 0.
  { cardNumber: 'EB01-040', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true, ifPrevious: 'previousSelectedAny' }] } },

  // EB01-043 — [On Play] place 3 CP cards from trash at bottom: play up to 1 CP Character cost<=4 (other than self) from trash rested.
  { cardNumber: 'EB01-043', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 },
    { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'CP', maxCost: 4, excludeSelfName: true }, rested: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // EB01-042 — [Activate: Main] trash self: play Dressrosa cost≤3 rested; opp −2 cost.
  {
    cardNumber: 'EB01-042',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'trashThis' }],
      functions: [
        { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Dressrosa', maxCost: 3, excludeSelfName: true }, rested: true },
        { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true },
      ],
    },
  },

  // EB01-044 — [Activate: Main] rest this: up to 1 of your [Spandam] Characters +3000 this turn.
  { cardNumber: 'EB01-044', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Spandam' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  // EB01-045 — [On Play] If opponent has a cost-0 Character, this Character gains [Rush] this turn.
  { cardNumber: 'EB01-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifGate: [{ kind: 'opponentHasCharacterExactCost', exactCost: 0 }] }] } },

  // EB01-046 - [On Play]/[When Attacking] Give opponent Character -1 cost, then K.O. cost 0.
  {
    cardNumber: 'EB01-046',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
    ],
  },

  // EB01-047 — [Once Per Turn] When a Character is K.O.'d, draw 1 and trash 1 from hand.
  { cardNumber: 'EB01-047', templateId: 'ability', params: { timing: 'onCharacterKoed', oncePerTurn: true, functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // EB01-048 — [Activate: Main] You may rest this Character: Give up to 1 of your opponent's Characters −4 cost.
  {
    cardNumber: 'EB01-048',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] },
  },

  // EB01-049 — [On Play] K.O. up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-050 — (Event) [Counter] If 30+ cards in trash, add up to 1 top of deck to top of Life.
  { cardNumber: 'EB01-050', templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfTrashCount', atLeast: 30 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

  // EB01-051 — (Event) [Main] trash 2 from top of deck: K.O. up to 1 opp Character cost<=5. [Trigger] Activate [Main].
  {
    cardNumber: 'EB01-051',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // EB01-053 — [On Play] Place up to 1 opp Character cost<=3 at the top or bottom of opponent's Life face-up. [Trigger] give up to 1 opp Leader/Character −3000 this turn.
  { cardNumber: 'EB01-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose one:', options: [
    { label: 'reorderOpponentLife', functions: [{ fn: 'lookLifeAndReorder', player: 'opponent' }] },
    { label: 'turnYourLifeFaceDown', functions: [{ fn: 'turnAllLifeFace', faceUp: false }] },
  ] }] } },

  {
    cardNumber: 'EB01-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB01-054 - [Blocker] [On Play] If opponent has 1 or less Life, K.O. cost 3 or less.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play K.O. is templated.
  {
    cardNumber: 'EB01-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  },

  // EB01-056 — [On Play] add 1 top/bottom Life to hand: draw 1.
  { cardNumber: 'EB01-056', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // EB01-058 — [DON!! x1] [Your Turn] If 2 or less Life, this Character +2000 (continuous, composed).
  { cardNumber: 'EB01-058', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },

  // EB01-057 — [Blocker] is printed. [On K.O. by opponent effect] deck top → Life top.
  {
    cardNumber: 'EB01-057',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      gate: [{ kind: 'koByOpponentEffect' }],
      functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }],
    },
  },

  // EB01-059 — Kingdom Come: Main K.O. + trash Life until 1; Trigger K.O. by combined Life total.
  {
    cardNumber: 'EB01-059',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true },
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', untilLife: 1 }, to: { zone: 'trash', player: 'owner' } },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromCombinedLife: true } }, optional: true }],
        },
      },
    ],
  },

  // EB01-060 — Kami: Main play Enel from hand or trash, then trash Life until 1; Trigger draw 2 trash 1.
  {
    cardNumber: 'EB01-060',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            {
              fn: 'chooseOne',
              chooser: 'controller',
              prompt: 'Play Enel from:',
              options: [
                { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Enel', maxCost: 7 } }] },
                { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Enel', maxCost: 7 } }] },
              ],
            },
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', untilLife: 1 }, to: { zone: 'trash', player: 'owner' } },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },
  // EB01-061 - [On Play] add 1 active DON!!. [When Attacking] copy selected opponent Character power.
  {
    cardNumber: 'EB01-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB02-002 — [Activate: Main] rest this: up to 1 {Revolutionary Army} Character (other than self) +2000 this turn.
  { cardNumber: 'EB02-002', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army', excludeSelf: true } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // EB02-005 — [Your Turn] +2000 (composed)
  { cardNumber: 'EB02-005', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'your' } }] } },

  // EB02-006 — [Activate: Main] [Once Per Turn] If Leader {Land of Wano} or [Portgas.D.Ace], give up to 1 rested DON!! to your Leader.
  { cardNumber: 'EB02-006', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Land of Wano' }, { kind: 'leaderName', name: 'Portgas.D.Ace' }] }], functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },

  // EB02-003 — [DON!! x2] [Opponent's Turn] +2000 power (continuous); [On Play] if Leader {Straw Hat Crew}: give up to 1 rested DON!! to your Leader or 1 Character.
  {
    cardNumber: 'EB02-003',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'opponent' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'giveDon', count: 1 }] } },
    ],
  },

  // EB02-007 - [Main] up to 3 Leader/Characters +1000, then K.O. power <=3000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'EB02-007',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },

  // EB02-008 — (Event) [Main] look 4, reveal up to 1 card cost 4+, add to hand, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB02-008',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-012 — If you have [Sarfunkel], this Character gains [Blocker] (continuous, composed).
  { cardNumber: 'EB02-012', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Sarfunkel' }] } }] } },

  // EB02-009 — Thousand Sunny: rest this Stage, give up to 1 currently given DON!! to 1 {Straw Hat Crew} Character.
  {
    cardNumber: 'EB02-009',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [{ fn: 'giveGivenDon', count: 1, optional: true, targetTypeIncludes: 'Straw Hat Crew' }],
    },
  },
  // EB02-010 (leader) Monkey.D.Luffy —
  //   [Activate: Main] [Once Per Turn] DON!! −2: If the only Characters on your field are {Straw Hat Crew}
  //   type Characters, set up to 2 of your DON!! cards as active. Then, this Leader gains +1000 power until
  //   the end of your opponent's next turn.
  {
    cardNumber: 'EB02-010',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'donMinus', count: 2 }],
      gate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'Straw Hat Crew' }],
      functions: [
        { fn: 'setActiveControllerDon', maxTargets: 2 },
        { fn: 'addPowerSelf', amount: 1000, duration: 'endOfOpponentsTurn' },
      ],
    },
  },

  // EB02-011 — [On Play] if Leader {Fish-Man}/{East Blue}: give rested DON!! to Leader; up to 1 opp cost≤5 cannot be rested.
  { cardNumber: 'EB02-011', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Fish-Man' }, { kind: 'leaderType', type: 'East Blue' }] }], functions: [
    { fn: 'giveDonControllerLeader', count: 1 },
    { fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true },
  ] } },

  // EB02-013 — [On Play] If 3+ DON!! on field, look 7, reveal up to 1 [Zou], add to hand, rest to bottom; then play up to 1 [Zou] from hand.
  { cardNumber: 'EB02-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 3 }], functions: [
    { fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Zou' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { name: 'Zou' } },
  ] } },

  // EB02-014 - [On Play] Play up to 1 [Gaimon] from hand.
  {
    cardNumber: 'EB02-014',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Gaimon' } }] },
  },

  // EB02-015 — [On Play] up to 1 opp rested Character won't become active next Refresh Phase, then set up to 1 DON active at end of turn.
  { cardNumber: 'EB02-015', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true },
    { fn: 'setActiveControllerDonAtEndOfTurn', maxTargets: 1 },
  ] } },

  // EB02-016 — [On Play] Play up to 1 {Animal} Character cost<=3 from hand.
  { cardNumber: 'EB02-016', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Animal', maxCost: 3 } }] } },

  // EB02-017 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB02-017',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } }] },
  },

  {
    cardNumber: 'EB02-018',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfOtherNamedCharacterCount', name: 'Buggy', atMost: 0 }], functions: [{ fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // EB02-019 — [On Play] if Leader {Straw Hat Crew}: rest up to 1 opp Character with a cost of 4 or less.
  //   Static: if opponent has 2+ Characters, this Character can attack Characters on the turn it is played.
  {
    cardNumber: 'EB02-019',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'addKeyword',
            target: { ref: 'self' },
            keyword: 'canAttackActive',
            duration: 'permanent',
            condition: { gate: [{ kind: 'opponentCharacterCount', atLeast: 2 }, { kind: 'selfPlayedThisTurn' }] },
          }],
        },
      },
    ],
  },

  // EB02-020 — (Event) [Main] look 4, reveal up to 1 cost 4+, add, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB02-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-021 — (Event) [Main] up to 1 {Straw Hat Crew} Character +6000 this turn; then it won't become active next Refresh. [Trigger] rest opp Character cost<=4.
  {
    cardNumber: 'EB02-021',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew' } }, amount: 6000, duration: 'duringThisTurn', optional: true },
        { fn: 'preventRefresh', target: { ref: 'previous' } },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // EB02-022 — [On Play] if ≤2 Characters with 5000+ power, play up to 1 vanilla Character ≤6000 power from hand.
  {
    cardNumber: 'EB02-022',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'selfCharacterCurrentPowerCount', power: 5000, atMost: 2 }],
      functions: [{ fn: 'playFromHand', filter: { category: 'character', maxBasePower: 6000, noBaseEffect: true } }],
    },
  },

  {
    cardNumber: 'EB02-023',
    templateId: 'ability',
    params: {
      timing: 'onRemovedFromField',
      oncePerTurn: true,
      condition: { turn: 'your' },
      gate: [
        { kind: 'removedFromFieldCategory', category: 'character' },
        { kind: 'removedFromFieldController', player: 'opponent' },
        { kind: 'removedByEffectController', player: 'controller' },
        { kind: 'removedToZone', zone: 'hand' },
      ],
      functions: [{ fn: 'searchTopDeck', look: 3, pick: 3, reveal: false, destination: 'deckTopOrBottom' }],
    },
  },

  // EB02-024 — [On Play] Draw 2, place 2 from hand at bottom of deck; then return up to 1 Character cost<=1 to hand.
  { cardNumber: 'EB02-024', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // EB02-025 (character) Donquixote Rosinante —
  //   [Activate: Main] You may rest 1 of your DON!! cards and this Character: If your Leader is [Donquixote
  //   Rosinante], look at 5 cards from the top of your deck; play up to 1 Character card with a cost of 2
  //   or less rested. Then, place the rest at the bottom of your deck in any order.
  {
    cardNumber: 'EB02-025',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }],
      gate: [{ kind: 'leaderName', name: 'Donquixote Rosinante' }],
      functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: false, destination: 'play', filter: { category: 'character', maxCost: 2 }, remainder: 'bottom', rested: true }],
    },
  },

  // EB02-026 - [On Play] If Leader is multicolored and hand has 5 or less cards, draw 2.
  {
    cardNumber: 'EB02-026',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] },
  },

  // EB02-027 — [On Play] Place up to 1 opp Character with 1000 power or less at bottom of deck.
  { cardNumber: 'EB02-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 1000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // EB02-028 (character) Portgas.D.Ace —
  //   [On Play] If your Leader's type includes "Whitebeard Pirates", look at 5 cards from the top of your
  //   deck; reveal up to 1 Character card with a cost of 2 and add it to your hand. Then, place the rest at
  //   the bottom of your deck in any order and play up to 1 Character card with a cost of 2 from your hand
  //   rested.
  {
    cardNumber: 'EB02-028',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }],
      functions: [
        { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactCost: 2 }, remainder: 'bottom' },
        { fn: 'playFromHand', filter: { category: 'character', exactCost: 2 }, rested: true },
      ],
    },
  },

  // EB02-030 — [Counter] battle K.O. replacement aura for this turn; [Trigger] draw 1.
  {
    cardNumber: 'EB02-030',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [{
            fn: 'registerKoReplacementAura',
            scope: 'battle',
            trashFromHand: { count: 1 },
            duration: 'duringThisTurn',
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // EB02-031 — (Event) same searcher as EB02-008.
  {
    cardNumber: 'EB02-031',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-033 — if you have [Merry Go], [Blocker]
  { cardNumber: 'EB02-033', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Merry Go' }] } }] } },

  // EB02-032 (character) Iceburg —
  {
    cardNumber: 'EB02-032',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'selfDonFieldCount', atLeast: 3 }],
      functions: [
        { fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Galley-La Company' }, remainder: 'bottom' },
        { fn: 'playFromHand', filter: { name: 'Galley-La Company' } },
      ],
    },
  },

  // EB02-035 - [Your Turn][OPT] when 2+ DON!! return, add 1 active DON!!. [On Play] draw if DON!! <= opponent.
  {
    cardNumber: 'EB02-035',
    templates: [
      { templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 2 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // EB02-036 — [Blocker] [On K.O.] DON!! −1: look 3, reveal up to 1 {Straw Hat Crew}, add to hand, rest to bottom.
  { cardNumber: 'EB02-036', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },

  // EB02-037 (character) Franky —
  //   [On Play]/[When Attacking] If your Leader has the {Straw Hat Crew} type and the number of DON!! cards
  //   on your field is equal to or less than the number on your opponent's field, add up to 1 DON!! card
  //   from your DON!! deck and rest it.
  {
    cardNumber: 'EB02-037',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },

  // EB02-038 — [On Play] Play up to 1 {Impel Down} Character cost<=2 from hand.
  { cardNumber: 'EB02-038', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 2 } }] } },

  // EB02-039 — [Main] trash GERMA 66 Character ≤4000 base power: if DON!! ≤ opponent's, play same-name Character 5000–7000 power from trash.
  // PARTIAL: "same card name as the trashed card" filter on playFromTrash is deferred.
  {
    cardNumber: 'EB02-039',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', typeIncludes: 'GERMA 66', maxBasePower: 4000 }, optional: true },
        {
          fn: 'playFromTrash',
          filter: { category: 'character', minBasePower: 5000, maxBasePower: 7000 },
          ifPrevious: 'previousMovedAny',
          ifGate: [{ kind: 'selfDonAtMostOpponent' }],
        },
      ],
    },
  },

  // EB02-040 — (Event) same searcher.
  {
    cardNumber: 'EB02-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  {
    cardNumber: 'EB02-041',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'draw', amount: 1 }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          gate: [{ kind: 'selfDonAtMostOpponent' }],
          functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew' } }, amount: 2, duration: 'endOfOpponentsTurn', optional: true }],
        },
      },
    ],
  },
  // EB02-044 — [Blocker] [On Play] Play up to 1 black {Navy} Character cost<=4 from trash rested.
  { cardNumber: 'EB02-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', color: 'black', typeIncludes: 'Navy', maxCost: 4 }, rested: true }] } },

  {
    cardNumber: 'EB02-045',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 },
        {
          fn: 'chooseOne',
          chooser: 'controller',
          prompt: 'Choose one:',
          ifPrevious: 'previousMovedAny',
          options: [
            { label: 'draw1', functions: [{ fn: 'draw', amount: 1 }] },
            { label: 'oppTrashHand', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifGate: [{ kind: 'opponentHand', atLeast: 5 }] }] },
          ],
        },
      ],
    },
  },
  // EB02-046 - [On Play] Trash top 2 cards of deck, then give opponent Character -1 cost.
  {
    cardNumber: 'EB02-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] },
  },

  // EB02-047 — [Activate: Main] trash 1 from hand + trash this: play CP Character cost<=5 (other than [Blueno]) from trash.
  { cardNumber: 'EB02-047', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'CP', maxCost: 5, excludeSelfName: true } },
  ] } },

  // EB02-048 — [On Play] add [Laboon] from trash to hand. [On K.O.] play [Laboon] cost<=4 from hand.
  {
    cardNumber: 'EB02-048',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: 'Laboon' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Laboon', maxCost: 4 } }] } },
    ],
  },

  // EB02-049 — [On Play] give up to 2 rested DON!! to your Leader. [Activate: Main] rest this: If Leader [Monkey.D.Garp], K.O. up to 1 opp Character cost<=1.
  {
    cardNumber: 'EB02-049',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Monkey.D.Garp' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
    ],
  },

  // EB02-050 — (Event) same searcher.
  {
    cardNumber: 'EB02-050',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  {
    cardNumber: 'EB02-051',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'koCost2', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] },
          { label: 'minus4Cost', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, duration: 'duringThisTurn', optional: true }] },
        ],
      }],
    },
  },
  {
    cardNumber: 'EB02-052',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Sky Island' }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 1 }] },
            { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },
  // EB02-053 — [On Play]/[On K.O.] look at top of your or opponent's Life, place top or bottom.
  {
    cardNumber: 'EB02-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
    ],
  },

  // EB02-054 - [Blocker] [On Play] If you have 2 or less Life, draw 2 and trash 1.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play draw/trash is templated.
  {
    cardNumber: 'EB02-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] },
  },

  // EB02-055 — [Trigger] If Leader {Fish-Man} or {Merfolk} and 2 or less Life, play this.
  { cardNumber: 'EB02-055', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Fish-Man' }, { kind: 'leaderType', type: 'Merfolk' }] }, { kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // EB02-057 — [When Attacking] add 1 top/bottom Life to hand: add up to 1 opp Character cost<=3 to top or bottom of opponent's Life face-up.
  { cardNumber: 'EB02-057', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true },
  ] } },

  {
    cardNumber: 'EB02-056',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Scientist', maxCost: 5, excludeSelfName: true }, remainder: 'bottom' },
            { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Scientist', maxCost: 5, excludeSelfName: true } },
            { fn: 'optionalTrashFromHand', count: 1, ifGate: [{ kind: 'opponentCharacterCount', atMost: 2 }] },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // EB02-058 — (Event) same searcher.
  {
    cardNumber: 'EB02-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-059 — (Event) [Counter] +1000 battle; then if 1 or less Life, play yellow {Straw Hat Crew} or [Sanji] cost<=5 from hand.
  { cardNumber: 'EB02-059', templateId: 'ability', params: { timing: 'counter', functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true },
    { fn: 'playFromHand', filter: { category: 'character', anyOf: [{ color: 'yellow', typeIncludes: 'Straw Hat Crew' }, { name: 'Sanji' }], maxCost: 5 }, ifGate: [{ kind: 'selfLife', atMost: 1 }] },
  ] } },

  {
    cardNumber: 'EB02-060',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'turnTopLifeFace', faceUp: true },
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew' } }, amount: 1000, duration: 'endOfOpponentsTurn', optional: true, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },
  // EB02-061 (character) Monkey.D.Luffy — Rush gate + [When Attacking] return 2 active DON!! → set active + Life to hand.
  {
    cardNumber: 'EB02-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentDonFieldCount', atLeast: 5 }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          oncePerTurn: true,
          cost: [{ kind: 'donMinus', count: 2, activeOnly: true }],
          functions: [
            { fn: 'setActiveSelf' },
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // EB03-001 — K.O. replacement aura (cost ≥4); [Activate: Main] rest: −2000 opp Character + Rush to no-[When Attacking] Character.
  {
    cardNumber: 'EB03-001',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementAura',
            oncePerTurn: true,
            trashFromHand: { count: 1 },
            targetCondition: { minBaseCost: 4 },
            duration: 'permanent',
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restThis' }],
          functions: [
            { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
            { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { noBaseEffect: true } }, keyword: 'rush', duration: 'duringThisTurn', optional: true },
          ],
        },
      },
    ],
  },

  // EB03-003 — [On Play] if Leader [Uta]: draw 2, play up to 1 vanilla Character ≤6000 base power from hand.
  {
    cardNumber: 'EB03-003',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderName', name: 'Uta' }],
      functions: [
        { fn: 'draw', amount: 2 },
        { fn: 'playFromHand', filter: { category: 'character', maxBasePower: 6000, noBaseEffect: true } },
      ],
    },
  },

  // EB03-004 — [Opponent's Turn] If Leader multicolored and no Characters with 6000 base power or more, this Character +4000.
  {
    cardNumber: 'EB03-004',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addPowerSelf', amount: 4000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderMulticolor' }, { kind: 'selfCharacterBasePowerCount', power: 6000, atMost: 0 }] } }],
    },
  },

  // EB03-005 — [On Play] If Leader [Sugar], play Dressrosa ≤6000 power from hand rested.
  {
    cardNumber: 'EB03-005',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderName', name: 'Sugar' }],
      functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates', maxBasePower: 6000 }, rested: true }],
    },
  },

  // EB03-006 — [On Play] You may give your active Leader −5000: draw 1. [Activate: Main] Alabasta: opp Character −1000.
  {
    cardNumber: 'EB03-006',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'leaderActive' }] },
            { fn: 'draw', amount: 1, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB03-007 — [On K.O.] play up to 1 vanilla Character ≤6000 base power from hand. [Blocker] is a printed keyword.
  {
    cardNumber: 'EB03-007',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      functions: [{ fn: 'playFromHand', filter: { category: 'character', maxBasePower: 6000, noBaseEffect: true } }],
    },
  },
  {
    cardNumber: 'EB03-008',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'SWORD' } }, keyword: 'canAttackActive', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'SWORD' } }, keyword: 'canAttackActive', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'SWORD' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB03-009 — [Activate: Main] rest this: up to 1 vanilla Character +2000 this turn.
  {
    cardNumber: 'EB03-009',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { noBaseEffect: true } }, amount: 2000, duration: 'duringThisTurn', optional: true }],
    },
  },
  // EB03-010 - [Blocker] [On Play] Look at 5; add Character power 1000 or less, or Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-play search is templated.
  {
    cardNumber: 'EB03-010',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ category: 'character', maxPower: 1000 }, { category: 'event' }] } }] },
  },

  // EB03-011 — (Event) [Counter] If Leader [Nefeltari Vivi], up to 1 Leader/Character +4000 battle. [Trigger] give up to 1 opp Character −2000 this turn.
  {
    cardNumber: 'EB03-011',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB03-016 — [On Play] If Leader [Kouzuki Oden], draw 1. [Activate: Main] trash this: give up to 1 rested DON!! to your Leader.
  {
    cardNumber: 'EB03-016',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Kouzuki Oden' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },
    ],
  },

  {
    cardNumber: 'EB03-012',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'restOpponentDon', functions: [{ fn: 'restOpponentDon', maxTargets: 1, optional: true }] },
          { label: 'restAnimalOrSmile', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { anyOfTypes: ['Animal', 'SMILE'], maxCost: 3 } }, optional: true }] },
        ],
      }],
    },
  },
  // EB03-013 (character) Carrot —
  //   [Activate: Main] [Once Per Turn] If this Character was played on this turn, K.O. up to 1 of your
  //   opponent's rested Characters with a cost of 5 or less. Then, play up to 1 [Zou] from your hand.
  { cardNumber: 'EB03-013', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfPlayedThisTurn' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5, rested: true } }, optional: true, maxTargets: 1 }, { fn: 'playFromHand', filter: { category: 'character', name: 'Zou' }, maxTargets: 1 }] } },

  // EB03-014 — [Activate: Main] rest: give up to 2 rested DON to <Slash> attribute Leader.
  {
    cardNumber: 'EB03-014',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      gate: [{ kind: 'leaderAttribute', attribute: 'slash' }],
      functions: [{ fn: 'giveDonControllerLeader', count: 2 }],
    },
  },

  // EB03-015 — give rested DON to Fish-Man/Merfolk Leader or Character; rest opp cost≤2.
  {
    cardNumber: 'EB03-015',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'giveDon', count: 1, optional: true, anyOfTypes: ['Fish-Man', 'Merfolk'] },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true },
      ],
    },
  },

  // EB03-017 — [On Play] if Leader {Supernovas}: set 1 DON!! active; up to 1 opp cost≤8 cannot be rested.
  { cardNumber: 'EB03-017', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [
    { fn: 'setActiveControllerDon', maxTargets: 1 },
    { fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, duration: 'endOfOpponentsTurn', optional: true },
  ] } },

  // EB03-018 — [Opponent's Turn] K.O. immune to opp effects + [Blocker]. [End of Your Turn] rest DON + trash hand → set active.
  {
    cardNumber: 'EB03-018',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [
            { fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { turn: 'opponent' } },
            { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { turn: 'opponent' } },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'endOfTurn',
          functions: [
            { fn: 'restControllerDon', maxTargets: 1, optional: true },
            { fn: 'optionalTrashFromHand', count: 1, ifPrevious: 'previousSelectedAny' },
            { fn: 'setActiveSelf', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // EB03-020 — [Counter] +2000 then +2000 more if 2+ FILM; [Trigger] set 1 Character active.
  {
    cardNumber: 'EB03-020',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1 },
            { fn: 'addPower', target: { ref: 'previous' }, amount: 2000, duration: 'duringThisBattle', ifPrevious: 'previousSelectedAny', ifGate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'FILM', atLeast: 2 }] },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1 }] } },
    ],
  },

  // EB03-021 — [On Play] trash 1 from hand: place up to 1 opp Character (4000 base power or less) and up to 1 Character (base cost 3 or less) at bottom of deck.
  { cardNumber: 'EB03-021', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent', filter: { maxBasePower: 4000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { maxBaseCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
  ] } },

  // EB03-022 — [Blocker] [On Play] Place up to 1 Character cost<=4 at bottom of deck.
  { cardNumber: 'EB03-022', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // EB04-054 (character) Bartholomew Kuma —
  {
    cardNumber: 'EB04-054',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          gate: [{ kind: 'selfLife', atMost: 2 }],
          functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onKO',
          functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' }, optional: true }],
        },
      },
    ],
  },

  // EB04-055 — [On K.O.] play Rev Army cost≤4 from hand. [Trigger] if Leader {Revolutionary Army} and combined Life ≤5, play this card.
  {
    cardNumber: 'EB04-055',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxCost: 4 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }, { kind: 'combinedLifeTotal', atMost: 5 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // EB04-056 — if [Jewelry Bonney] and 0 Life, this Character gains [Blocker].
  {
    cardNumber: 'EB04-056',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'addKeyword',
        target: { ref: 'self' },
        keyword: 'blocker',
        duration: 'permanent',
        condition: { gate: [{ kind: 'selfControlsNamed', name: 'Jewelry Bonney' }, { kind: 'selfLife', atMost: 0 }] },
      }],
    },
  },

  // EB04-057 — If 2 or less Life, yellow {Scientist} Characters cannot be removed by opponent's effects. [DON!! x1] this Character gains [Blocker].
  {
    cardNumber: 'EB04-057',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventFieldRemovalAuraControllerCharacters', duration: 'permanent', anyOfTypes: ['Scientist'], anyOfColors: ['yellow'], effectSourceController: 'opponent', gate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
    ],
  },

  // EB04-059 — PARTIAL: "fewer Characters than opponent" dual-K.O. Main deferred; mapped [Trigger] draw 2 trash 1.
  {
    cardNumber: 'EB04-059',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'turnTopLifeFace', faceUp: true },
            { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, ifPrevious: 'previousSelectedAny' },
            { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // EB04-060 — PARTIAL: Life top/bottom → hand + Egghead hand → Life face-up Main deferred; mapped Trigger + opp −1000 on simplified Main.
  {
    cardNumber: 'EB04-060',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
            { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // EB04-061 — if ≤1 Life, this card in hand −1 cost; [On Play] trash 1: Leader +2000 and self [Blocker] until end of opponent's next End Phase.
  {
    cardNumber: 'EB04-061',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{ fn: 'addCostAuraSameCardInHand', amount: -1, duration: 'permanent', gate: [{ kind: 'selfLife', atMost: 1 }] }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn', ifPrevious: 'previousMovedAny' },
            { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'endOfOpponentsTurn', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // --- codegen batch ---
  { cardNumber: 'EB03-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // EB03-024 (character) Nefeltari Vivi — [Blocker] is a keyword flag.
  {
    cardNumber: 'EB03-024',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'playFromHand', filter: { category: 'character', maxCost: 5, anyOf: [{ typeIncludes: 'Alabasta' }, { typeIncludes: 'Straw Hat Crew' }] } },
        { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' },
      ],
    },
  },

  // EB03-025 — [On Play] trash 1 from hand: return up to 1 Character with 6000 base power to hand.
  { cardNumber: 'EB03-025', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 6000 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // EB03-026 — [On Play] opp hand≥5 → opp bottom-deck 1. [Activate: Main][OPT] bottom-deck 1 Char: give Leader + 1 Char 1 rested DON each.
  {
    cardNumber: 'EB03-026',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          gate: [{ kind: 'opponentHand', atLeast: 5 }],
          functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1, chooser: 'opponent' }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
            { fn: 'giveDonLeaderAndCharacter', count: 1 },
          ],
        },
      },
    ],
  },

  // EB03-027 — [On Play] Return up to 1 Character with 7000 base power to hand.
  { cardNumber: 'EB03-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 7000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // EB03-028 — [On Play] Trash 1 from hand. [Activate: Main] trash this: if 4 or less cards in hand, draw 2.
  {
    cardNumber: 'EB03-028',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfHand', atMost: 4 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // EB03-029 — (Event) [Main] rest 4 DON!!: If Leader [Boa Hancock], play up to 1 {Amazon Lily}/{Kuja Pirates} Character cost<=6 from hand. [Counter] up to 1 [Boa Hancock] +3000 battle.
  {
    cardNumber: 'EB03-029',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 4 }], gate: [{ kind: 'leaderName', name: 'Boa Hancock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], maxCost: 6 } }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Boa Hancock' } }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
    ],
  },

  // EB03-031 (character) Vinsmoke Reiju —
  //   [Your Turn] [On Play] DON!! −1: If your Leader is [Sanji], activate the [Main] effect of up to 1
  //   Event card with a cost of 7 or less in your trash.
  {
    cardNumber: 'EB03-031',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      condition: { turn: 'your' },
      cost: [{ kind: 'donMinus', count: 1 }],
      gate: [{ kind: 'leaderName', name: 'Sanji' }],
      functions: [{ fn: 'activateEventFromTrash', filter: { category: 'event', maxCost: 7 }, maxTargets: 1 }],
    },
  },

  // EB03-032 — [Your Turn] [On Play] up to 1 [Charlotte Katakuri] +2000 this turn.
  { cardNumber: 'EB03-032', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Charlotte Katakuri' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // EB03-033 Charlotte Brulee — [Opponent's Turn] onDonReturned: if Leader {Big Mom Pirates}, add 1 rested DON!!.
  { cardNumber: 'EB03-033', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'opponent' }, gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }, { kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // EB03-034 — [On Play] draw 1, place 1 hand card on deck top, add 1 active DON!!; [On K.O.] DON!! −1: deck top → Life top.
  {
    cardNumber: 'EB03-034',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'draw', amount: 1 },
            { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'top' }, maxTargets: 1 },
            { fn: 'addDonFromDeck', count: 1, rested: false },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onKO',
          cost: [{ kind: 'donMinus', count: 1 }],
          functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }],
        },
      },
    ],
  },

  // EB03-035 — [On Play] if DON!! ≤ opponent's: add 1 rested DON!! from deck. [Blocker] is card data.
  {
    cardNumber: 'EB03-035',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'selfDonAtMostOpponent' }],
      functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }],
    },
  },

  // EB03-036 — [On Play] DON!! −1: K.O. up to 2 opp Characters with base cost 3 or less.
  { cardNumber: 'EB03-036', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 3 } }, optional: true, maxTargets: 2 }] } },

  // EB03-043 — [Blocker] [On Play] place 2 CP from trash at bottom: K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'EB03-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }, { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // EB03-037 — [On Play] if 7+ DON!! on field: your {ODYSSEY} Leader and Characters gain +1000 power until end of opponent's next turn.
  { cardNumber: 'EB03-037', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'endOfOpponentsTurn', anyOfTypes: ['ODYSSEY'] }] } },

  // EB03-038 — [Main] rest 1 DON!!: if DON!! ≤ opponent's and only GERMA Characters, add 2 rested DON!!; [Counter] Leader +3000 battle.
  {
    cardNumber: 'EB03-038',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restDon', count: 1 }],
          gate: [{ kind: 'selfDonAtMostOpponent' }, { kind: 'selfAllCharactersTyped', typeIncludes: 'GERMA' }],
          functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }],
        },
      },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // EB03-039 — [On Play] if Leader {Animal Kingdom Pirates}: draw 1, trash 1, then play up to 1 vanilla Character ≤6000 power from trash.
  {
    cardNumber: 'EB03-039',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }],
      functions: [
        { fn: 'drawAndTrash', drawCount: 1, trashCount: 1 },
        { fn: 'playFromTrash', filter: { category: 'character', maxBasePower: 6000, noBaseEffect: true } },
      ],
    },
  },

  // EB03-041 — [Opponent's Turn] SWORD Characters cost ≤6 +2000; [On Play] trash 1 {Navy} from hand: draw 2.
  {
    cardNumber: 'EB03-041',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'addPowerAuraControllerCharacters',
            amount: 2000,
            duration: 'permanent',
            anyOfTypes: ['SWORD'],
            sourceCondition: { turn: 'opponent' },
            targetCondition: { maxCost: 6 },
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Navy' }, optional: true },
            { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // EB03-042 — +4 cost if Leader {Revolutionary Army}; [Opponent's Turn] [On K.O.] play Rev Army or [Nico Robin] from hand/trash.
  {
    cardNumber: 'EB03-042',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onKO',
          condition: { turn: 'opponent' },
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'Play which Character?',
            options: [
              {
                label: 'revolutionaryArmy',
                functions: [{
                  fn: 'chooseOne',
                  chooser: 'controller',
                  prompt: 'Revolutionary Army from:',
                  options: [
                    { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxCost: 6, excludeSelfName: true } }] },
                    { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxCost: 6, excludeSelfName: true } }] },
                  ],
                }],
              },
              {
                label: 'nicoRobin',
                functions: [{
                  fn: 'chooseOne',
                  chooser: 'controller',
                  prompt: 'Nico Robin from:',
                  options: [
                    { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Nico Robin', maxCost: 6 } }] },
                    { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Nico Robin', maxCost: 6 } }] },
                  ],
                }],
              },
            ],
          }],
        },
      },
    ],
  },

  // EB03-044 (character) Black Maria —
  {
    cardNumber: 'EB03-044',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderMulticolor' }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Onigashima Island' }, remainder: 'bottom' },
            { fn: 'playFromHand', filter: { name: 'Onigashima Island' }, optional: true },
          ],
        },
      },
    ],
  },

  // EB03-045 — [On Play] give 1 rested DON!!; if 10+ trash, play 1 {Thriller Bark Pirates} cost ≤2 from trash rested. [Blocker] is card data.
  {
    cardNumber: 'EB03-045',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'giveDon', count: 1 },
        {
          fn: 'playFromTrash',
          filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 },
          rested: true,
          ifGate: [{ kind: 'selfTrashCount', atLeast: 10 }],
        },
      ],
    },
  },

  // EB03-046 — [On Play] if cost-0 or cost-8+ Character exists: draw 1; [On K.O.] trash top 2 of deck.
  {
    cardNumber: 'EB03-046',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          gate: [{ kind: 'anyOf', gates: [{ kind: 'anyCharacterExactCost', exactCost: 0 }, { kind: 'anyCharacterCostAtLeast', atLeast: 8 }] }],
          functions: [{ fn: 'draw', amount: 1 }],
        },
      },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 2 }] } },
    ],
  },

  // EB03-047 - [On Play] Trash top 3 cards of deck. [On K.O.] Draw 1.
  {
    cardNumber: 'EB03-047',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // EB03-048 (character) Rebecca —
  //   [Blocker][On Play] Look at 5 cards from the top of your deck; reveal up to 1 {Dressrosa} type Stage
  //   card and add it to your hand. Then, place the rest at the bottom of your deck in any order and play
  //   up to 1 {Dressrosa} type Stage card with a cost of 1 from your hand.
  {
    cardNumber: 'EB03-048',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'stage', typeIncludes: 'Dressrosa' }, remainder: 'bottom' },
        { fn: 'playFromHand', filter: { category: 'stage', typeIncludes: 'Dressrosa', exactCost: 1 }, maxTargets: 1 },
      ],
    },
  },

  // EB03-049 — [Main] rest 7 DON!!: if Leader [Perona], play Thriller Bark cost≤6 and cost≤4 from hand or trash each.
  {
    cardNumber: 'EB03-049',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restDon', count: 7 }],
          gate: [{ kind: 'leaderName', name: 'Perona' }],
          functions: [
            {
              fn: 'chooseOne',
              chooser: 'controller',
              prompt: 'Play Thriller Bark (cost ≤6) from:',
              options: [
                { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 6 } }] },
                { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 6 } }] },
              ],
            },
            {
              fn: 'chooseOne',
              chooser: 'controller',
              prompt: 'Play Thriller Bark (cost ≤4) from:',
              options: [
                { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } }] },
                { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } }] },
              ],
            },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // EB03-050 — [On Play] up to 1 {Sky Island} Character gains [Double Attack] this turn.
  { cardNumber: 'EB03-050', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Sky Island' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }] } },

  // EB03-056 — [On Play] turn 1 top Life face-up: K.O. up to 1 opp Character base cost 3 or less.
  { cardNumber: 'EB03-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 3 } }, optional: true, ifPrevious: 'previousSelectedAny' }] } },

  // EB03-051 (character) Charlotte Smoothie —
  //   [On Play] If you have a face-up Life card, K.O. up to 1 of your opponent's Characters with a cost of
  //   2 or less. Then, turn all of your Life cards face-down.
  { cardNumber: 'EB03-051', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHasFaceUpLife' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'turnAllLifeFace', faceUp: false }] } },

  // EB03-052 — [Activate: Main] trash this: if Leader [Shirahoshi], add 1 top-deck card to top of Life; then all {Neptunian} Characters +1000 this turn.
  { cardNumber: 'EB03-052', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderName', name: 'Shirahoshi' }], functions: [
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' } },
    { fn: 'addPowerControllerCharactersAll', amount: 1000, duration: 'duringThisTurn', filter: { typeIncludes: 'Neptunian' } },
  ] } },

  // EB03-053 (character) Nami —
  //   [On Play] Give up to 1 rested DON!! card to your Leader. Then, if your opponent has 3 or more Life
  //   cards, add up to 1 card from the top of your opponent's Life cards to the owner's hand.[On K.O.] You
  //   may turn 1 card from the top of your Life cards face-up: Play up to 1 Character card with 6000 power
  //   or less from your hand.
  {
    cardNumber: 'EB03-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 1 }, { fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true, ifGate: [{ kind: 'opponentLife', atLeast: 3 }] }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'turnTopLifeFace', faceUp: true }, { fn: 'playFromHand', filter: { category: 'character', maxPower: 6000 }, ifPrevious: 'previousSelectedAny' }] } },
    ],
  },

  // EB03-054 — [On Play] trash top Life optional → deck top to Life; [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'EB03-054',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true },
            { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // EB03-055 (character) Nico Robin —
  //   PARTIAL: [Opponent's Turn] [On K.O.] deal 1 damage deferred.
  {
    cardNumber: 'EB03-055',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 2 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifGate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // EB03-057 — [On Play] give up to 3 rested DON!! to your Leader. [On K.O.] trash up to 1 top of opponent's Life.
  {
    cardNumber: 'EB03-057',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] } },
    ],
  },

  // EB03-058 — [Your Turn] [On Play] If 2 or less Life, draw 1. [Trigger] If Leader [Vegapunk], play this.
  {
    cardNumber: 'EB03-058',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Vegapunk' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // EB03-059 - [On Play] Egghead 2+ Life: add Trigger Character from hand to Life face-up. [Trigger] prevent attack.
  {
    cardNumber: 'EB03-059',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          gate: [{ kind: 'leaderType', type: 'Egghead' }, { kind: 'selfLife', atLeast: 2 }],
          functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { category: 'character', hasTrigger: true } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [{
            fn: 'preventAttack',
            target: { group: 'characters', player: 'opponent', filter: { maxCost: 6, excludeName: 'Monkey.D.Luffy' } },
            duration: 'duringThisTurn',
            optional: true,
          }],
        },
      },
    ],
  },

  // EB03-060 — (Event) [Main] If Leader [Nami], look 4, reveal up to 1 cost 2-8, add to hand, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB03-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2, maxCost: 8 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2, maxCost: 8 }, remainder: 'bottom' }] } },
    ],
  },

  // EB03-061 (character) Uta —
  //   [Activate: Main] [Once Per Turn] Set up to 1 of your DON!! cards as active. Then, rest up to 1 of
  //   your opponent's DON!! cards or Characters with a cost of 4 or less.[End of Your Turn] You may rest 1
  //   of your DON!! cards: Set up to 1 of your {FILM} type Characters as active.
  {
    cardNumber: 'EB03-061',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'setActiveControllerDon', maxTargets: 1 },
        { fn: 'rest', target: { group: 'charactersOrDon', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'restDon', count: 1 }], functions: [
        { fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'FILM' }, maxTargets: 1, optional: true },
      ] } },
    ],
  },

  // EB03-062 — [Rush] [Activate: Main] trash 1 from hand + trash this: add 1 top of deck to top of Life; then play up to 1 [Trafalgar Law] cost<=7 from hand.
  { cardNumber: 'EB03-062', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' } },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Trafalgar Law', maxCost: 7 } },
  ] } },

  // EB04-001 (leader) Jewelry Bonney —
  {
    cardNumber: 'EB04-001',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfLife', atMost: 1 }] } }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [
            { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' }, optional: true, ifGate: [{ kind: 'selfLife', atLeast: 2 }] },
          ],
        },
      },
    ],
  },

  // EB04-002 - [On Play] Look at 4; add Egghead or Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB04-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Egghead' }, { typeIncludes: 'Straw Hat Crew' }], excludeSelfName: true } }] },
  },

  // EB04-003 — [Rush] (keyword flag) [Opponent's Turn] Your {Navy} type Leader's base power becomes 7000.
  // Note: [Rush] is an engine keyword flag. Only the continuous base-power set is templated. Registered
  // on enter-play as a permanent continuous effect gated to opponent's turn + a {Navy} Leader.
  { cardNumber: 'EB04-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Navy' }] } }] } },

  // EB04-004 — [When Attacking] Your Leader's base power becomes 7000 until the end of your opponent's next End Phase.
  { cardNumber: 'EB04-004', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'endOfOpponentsTurn' }] } },

  // EB04-005 — Cannot attack unless opponent has 2+ Characters with base power ≥5000.
  { cardNumber: 'EB04-005', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent', attackUnlessGate: [{ kind: 'opponentCharacterBasePowerCount', power: 5000, atLeast: 2 }] }] } },
  // EB04-006 - [On Play] Look at 7; add up to 1 [Lulucia Kingdom].
  {
    cardNumber: 'EB04-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Lulucia Kingdom' } }] },
  },

  // EB04-007 — [On Play] your Leader gains +2000 power until end of opponent's next turn. [Activate: Main] if opponent has 8000+ power Character, gain [Rush: Character].
  {
    cardNumber: 'EB04-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'opponentCharacterCurrentPowerCount', power: 8000, atLeast: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackCharactersWhileSummoningSick', duration: 'duringThisTurn' }] } },
    ],
  },

  // EB04-008 — (Event) [Main] If 2 or less Life, give up to 1 opp Character −3000 this turn. [Counter] Your Leader +3000 battle.
  {
    cardNumber: 'EB04-008',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // EB04-009 - [Main] give 1 active DON!! to [Silvers Rayleigh]: opp Character -2000. [Counter] +2000.
  {
    cardNumber: 'EB04-009',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'giveDon', count: 1, targetName: 'Silvers Rayleigh', activeDonOnly: true, optional: true },
            { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }],
        },
      },
    ],
  },

  // EB04-010 (stage) Lulucia Kingdom —
  //   [Opponent's Turn] All of your Characters with a base cost of 1 gain +5000 power.[On Play] Set the
  //   power of up to 1 of your opponent's Characters to 0 during this turn.
  {
    cardNumber: 'EB04-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 5000, duration: 'permanent', sourceCondition: { turn: 'opponent' }, targetCondition: { maxBaseCost: 1, minBaseCost: 1 } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setBasePower', target: { group: 'characters', player: 'opponent' }, value: 0, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // EB04-011 (character) Scaled Neptunian —
  //   [Rush: Character] [On Play] Draw per {Neptunian}, trash same number from hand.
  {
    cardNumber: 'EB04-011',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackActive', duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrashByTypedCharacterCount', typeIncludes: 'Neptunian' }] } },
    ],
  },

  // EB04-012 (character) Kikunojo —
  //   [Activate: Main] [Once Per Turn] If this Character was played on this turn, set your {Land of Wano}
  //   type Leader as active.
  { cardNumber: 'EB04-012', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfPlayedThisTurn' }], functions: [{ fn: 'setActiveControllerLeader' }] } },

  // EB04-013 (character) Carrot —
  //   [On Play] If your Leader has the {Minks} type, set up to 2 of your {Minks} type Characters and your
  //   Leader as active.
  { cardNumber: 'EB04-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [
    { fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks' }, maxTargets: 2, optional: true },
    { fn: 'setActiveControllerLeader' },
  ] } },
  // EB04-014 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to your Leader.
  { cardNumber: 'EB04-014', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },

  // EB04-015 — [On K.O.] rest 1 of your cards: if Leader {Fish-Man}/{Merfolk}, play 1 green Character cost ≤6 from hand. [Blocker] is card data.
  {
    cardNumber: 'EB04-015',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      functions: [
        { fn: 'rest', target: { group: 'leaderOrCharacters', player: 'controller' }, optional: true, maxTargets: 1 },
        {
          fn: 'playFromHand',
          filter: { category: 'character', color: 'green', maxCost: 6 },
          maxTargets: 1,
          ifPrevious: 'previousSelectedAny',
          ifGate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Fish-Man' }, { kind: 'leaderType', type: 'Merfolk' }] }],
        },
      ],
    },
  },

  // EB04-016 — [Activate: Main] set 1 DON active, then block Character-effect DON set-active. [When Attacking] Neptunian≥3: rest opp cost≤8.
  {
    cardNumber: 'EB04-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'setActiveControllerDon', maxTargets: 1 },
        { fn: 'preventControllerCharacterSetActiveDon', duration: 'duringThisTurn' },
      ] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Neptunian', atLeast: 3 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true }] } },
    ],
  },

  // EB04-017 — [On Play] if Leader {Minks}: play up to 1 {Minks} Character with a cost of 5 or less from hand.
  //   [Your Turn] if you have 3+ {Minks} Characters, give all of your opponent's Characters −1 cost.
  //   The cost aura is registered on enter-play and applied each read only while it's your turn AND the
  //   board gate (selfTypedCharacterCount Minks >= 3) still holds — see the board-gated `gate` on aura ops.
  {
    cardNumber: 'EB04-017',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Minks', maxCost: 5 } }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -1, duration: 'permanent', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Minks', atLeast: 3 }], sourceCondition: { turn: 'your' } }] } },
    ],
  },

  // EB04-018 — [On Play] rest this: K.O. up to 1 opp rested Character with 8000 power or less.
  { cardNumber: 'EB04-018', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxPower: 8000 } }, optional: true }] } },

  // EB04-019 — [Main] rest 1 card: if Leader {Minks}, opp Character −3 cost; [Counter] Minks Leader/Character +3000 battle.
  {
    cardNumber: 'EB04-019',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'rest', target: { group: 'leaderOrCharacters', player: 'controller' }, optional: true, maxTargets: 1 },
            {
              fn: 'addCost',
              target: { group: 'characters', player: 'opponent' },
              amount: -3,
              duration: 'duringThisTurn',
              optional: true,
              ifPrevious: 'previousSelectedAny',
              ifGate: [{ kind: 'leaderType', type: 'Minks' }],
            },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Minks' } }, amount: 3000, duration: 'duringThisBattle', optional: true }],
        },
      },
    ],
  },

  // EB04-020 — (Event) [Counter] up to 1 {Fish-Man} Leader/Character +3000 battle; then set up to 1 {Fish-Man} Character active. [Trigger] rest opp Character cost<=4.
  {
    cardNumber: 'EB04-020',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Fish-Man' } }, amount: 3000, duration: 'duringThisBattle', optional: true },
        { fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Fish-Man' }, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // EB04-021 — [On Play] If Leader [Nefeltari Vivi], draw 2 and trash 1. [Activate: Main] [Once Per Turn] trash 1 from hand: give up to 1 rested DON!! to your Leader or 1 Character.
  {
    cardNumber: 'EB04-021',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // EB04-022 - [On Play] trash 2 from hand: if opponent has 6+ hand, they bottom-deck 2 from hand. [DON!! x1] [When Attacking] trash 1: opp Character -2000.
  {
    cardNumber: 'EB04-022',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'optionalTrashFromHand', count: 2 },
            { fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, minTargets: 2, maxTargets: 2, chooser: 'opponent', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'opponentHand', atLeast: 6 }] },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          condition: { donAttachedAtLeast: 1 },
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // EB04-023 — [On Play] Leader −5000 this turn: draw 2. [Double Attack] is card data.
  {
    cardNumber: 'EB04-023',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: -5000, duration: 'duringThisTurn', optional: true },
        { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' },
      ],
    },
  },

  // EB04-024 — [Activate: Main] rest this + trash 1 from hand: up to 1 {Alabasta} Character gains [Unblockable] this turn.
  { cardNumber: 'EB04-024', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Alabasta' } }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true },
  ] } },

  // EB04-025 (character) Nefeltari Vivi —
  //   [On Play] Play up to 1 {Alabasta} type Character card with a cost of 8 or less other than [Nefeltari
  //   Vivi] from your hand. Then, your opponent places 1 card from their hand at the bottom of their deck.
  {
    cardNumber: 'EB04-025',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Alabasta', maxCost: 8, excludeSelfName: true } },
        { fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1, chooser: 'opponent' },
      ],
    },
  },

  // EB04-026 — [On Play] Place up to 1 opp Character cost<=1 at bottom of deck. [When Attacking] Draw 1 and trash 1 from hand.
  {
    cardNumber: 'EB04-026',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // EB04-027 — [On Play] draw 2 and trash 1. [Trigger] play up to 1 Character with 5000 power or less and a [Trigger] from hand.
  {
    cardNumber: 'EB04-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxPower: 5000, hasTrigger: true } }] } },
    ],
  },

  // EB04-028 (event) Ice Time —
  //   [Main] You may trash 1 card from your hand: If your Leader has the {Navy} type, up to 2 of your
  //   opponent's Characters with 10000 power or less cannot attack until the end of your opponent's next
  //   End Phase. [Trigger] Return up to 1 Character with a cost of 5 or less to the owner's hand.
  {
    cardNumber: 'EB04-028',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          gate: [{ kind: 'leaderType', type: 'Navy' }],
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxPower: 10000 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 2, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // EB04-029 — (Event) [Main] If Leader [Sanji], look 3, reveal up to 1 [Sanji] or Event, add to hand, trash rest. [Counter] trash 1 from hand: up to 1 [Sanji] +4000 battle.
  {
    cardNumber: 'EB04-029',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Sanji' } }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // EB04-033 — [On Play] DON!! −1: If 3+ {Foxy Pirates} Characters, K.O. up to 1 opp Character base power 6000 or less.
  { cardNumber: 'EB04-033', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Foxy Pirates', atLeast: 3 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },

  // EB04-030 — K.O. replacement (return 1 DON!!); [On Play] DON!! -2 grants Rush and rests an opponent Character.
  {
    cardNumber: 'EB04-030',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementSelf', returnDon: { count: 1 }, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, optional: true },
      ] } },
    ],
  },

  // EB04-031 — K.O. replacement (return 1 DON!!); [Activate: Main] adds active + rested DON!! if no other [King].
  {
    cardNumber: 'EB04-031',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementSelf', returnDon: { count: 1 }, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }, { kind: 'selfOtherNamedCharacterCount', name: 'King', atMost: 0 }], functions: [
        { fn: 'addDonFromDeck', count: 1, rested: false },
        { fn: 'addDonFromDeck', count: 1, rested: true },
      ] } },
    ],
  },

  // EB04-032 — [On Play] trash 1 {Animal Kingdom Pirates} from hand: draw 2; [Activate: Main] rest 2 DON!!: if Leader {Animal Kingdom Pirates}, add 1 rested DON!!.
  {
    cardNumber: 'EB04-032',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Animal Kingdom Pirates' }, optional: true },
            { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          cost: [{ kind: 'restDon', count: 2 }],
          gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }],
          functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }],
        },
      },
    ],
  },

  // EB04-034 — [On Your Opponent's Attack] trash 1 from hand: if 4+ Events in trash, Leader/Character +2000 battle. [Blocker] is card data.
  {
    cardNumber: 'EB04-034',
    templateId: 'ability',
    params: {
      timing: 'onOpponentsAttack',
      oncePerTurn: true,
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        {
          fn: 'addPower',
          target: { group: 'leaderOrCharacters', player: 'controller' },
          amount: 2000,
          duration: 'duringThisBattle',
          optional: true,
          ifPrevious: 'previousMovedAny',
          ifGate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }],
        },
      ],
    },
  },

  // EB04-035 Hitokiri Kamazo — [Blocker] is card data. [Your Turn] onDonReturned: if Leader {Kid Pirates}, add 1 rested DON!!.
  { cardNumber: 'EB04-035', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'Kid Pirates' }, { kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // EB04-036 — [On Play] DON!! −1: if Leader {Foxy Pirates}, draw 2 trash 1, rest opp Character cost ≤9; [Activate: Main] add 1 rested DON!!.
  {
    cardNumber: 'EB04-036',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          cost: [{ kind: 'donMinus', count: 1 }],
          gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }],
          functions: [
            { fn: 'drawAndTrash', drawCount: 2, trashCount: 1 },
            { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 9 } }, optional: true },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },

  // EB04-037 - [On Play] If Leader has Foxy Pirates, look at 5; add Foxy Pirates.
  {
    cardNumber: 'EB04-037',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Foxy Pirates' } }] },
  },

  // EB04-038 (character) Rosinante & Law — PARTIAL: alternate-name rules deferred. [Blocker] is a keyword flag.
  {
    cardNumber: 'EB04-038',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'selfDonAtMostOpponent' }],
      functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'addDonFromDeck', count: 1, rested: false },
      ],
    },
  },

  // EB04-039 — [On Play] add 1 DON!! from deck active. [Activate: Main] trash this: play up to 1 {Kid Pirates} Character cost<=5 from hand.
  {
    cardNumber: 'EB04-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Kid Pirates', maxCost: 5 } }] } },
    ],
  },

  // EB04-040 — [Main] rest 6 DON!!: [Kaido] +3000 this turn, rest 1 opp Character; [Counter] DON!! −1: Leader +4000 battle.
  {
    cardNumber: 'EB04-040',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restDon', count: 6 }],
          functions: [
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Kaido' } }, amount: 3000, duration: 'duringThisTurn', optional: true },
            { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          cost: [{ kind: 'donMinus', count: 1 }],
          functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle' }],
        },
      },
    ],
  },

  // EB04-041 — [Main] if Leader [Sanji] and 4+ DON!! on field, play [Sanji] ≤6000 power from hand or trash; [Trigger] draw 2 trash 1.
  {
    cardNumber: 'EB04-041',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          gate: [{ kind: 'leaderName', name: 'Sanji' }, { kind: 'selfDonFieldCount', atLeast: 4 }],
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'Play Sanji from:',
            options: [
              { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Sanji', maxPower: 6000 } }] },
              { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Sanji', maxPower: 6000 } }] },
            ],
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // EB04-042 — [On Play] trash 3 from top of deck: give up to 1 opp Character −1 cost this turn.
  { cardNumber: 'EB04-042', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'trashTopDeck', count: 3 },
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true },
  ] } },

  // EB04-043 — [Once Per Turn] black Character base cost ≤5: opponent-effect K.O. → place 3 from trash to deck bottom. [On Play] trash 2 from deck top.
  {
    cardNumber: 'EB04-043',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementAura',
            scope: 'effect',
            effectSourceController: 'opponent',
            oncePerTurn: true,
            targetCondition: { color: 'black', maxBaseCost: 5 },
            trashTrashToDeckBottom: { count: 3 },
            duration: 'permanent',
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }] } },
    ],
  },

  // EB04-044 (character) Koby —
  //   [Once Per Turn] If your Leader's type includes "Navy" and this Character would be removed from the
  //   field, you may trash 1 card from your hand instead.[Your Turn] [Once Per Turn] When your opponent's
  //   Character is K.O.'d, draw 1 card.
  // Closed 2026-07-16 field-removal replacement pass: leader-type-gated field-removal replacement
  // (trash 1 from hand instead) via registerKoReplacementSelf + activationGate.
  {
    cardNumber: 'EB04-044',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{ fn: 'registerKoReplacementSelf', scope: 'effect', oncePerTurn: true, replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], activationGate: [{ kind: 'leaderType', type: 'Navy' }], trashFromHand: { count: 1 }, duration: 'permanent' }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onCharacterKoed',
          oncePerTurn: true,
          condition: { turn: 'your' },
          gate: [{ kind: 'koedCharacterController', player: 'opponent' }],
          functions: [{ fn: 'draw', amount: 1 }],
        },
      },
    ],
  },

  // EB04-045 — [Activate: Main] rest this: if 2+ Characters cost >=8, Revolutionary Army Leader/Character +1000 this turn.
  {
    cardNumber: 'EB04-045',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [{
        fn: 'addPower',
        target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } },
        amount: 1000,
        duration: 'duringThisTurn',
        optional: true,
        ifGate: [{ kind: 'anyCharacterCostCount', minCost: 8, atLeast: 2 }],
      }],
    },
  },

  // EB04-046 — [Opponent's Turn] all of your {Navy} Characters gain +2 cost (continuous cost aura).
  //   [Blocker] is an unconditional printed keyword flag (card metadata, not templated here).
  { cardNumber: 'EB04-046', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraControllerCharacters', amount: 2, duration: 'permanent', anyOfTypes: ['Navy'], sourceCondition: { turn: 'opponent' } }] } },

  // EB04-047 — [Activate: Main] trash this: play 1 {SWORD} Character cost ≤3 (other than [Helmeppo]) from hand or trash.
  {
    cardNumber: 'EB04-047',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'trashThis' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Play SWORD Character from:',
        options: [
          { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'SWORD', maxCost: 3, excludeSelfName: true } }] },
          { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'SWORD', maxCost: 3, excludeSelfName: true } }] },
        ],
      }],
    },
  },

  // EB04-048 — if Leader is {CP}, +1000 power/+2 cost per 5 trash; [On Play] trash 1 Character: draw 1.
  {
    cardNumber: 'EB04-048',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [
            { fn: 'addPowerSelfScaling', per: 'controllerTrash', step: 5, amountPer: 1000, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'CP' }] } },
            { fn: 'addCost', target: { ref: 'self' }, amount: 0, scale: { per: 'controllerTrash', step: 5, amountPer: 2 }, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'CP' }] } },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 },
            { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // EB04-049 — (Event) [Main] trash 2 from top of deck: K.O. up to 1 opp Character base cost 5 or less. [Trigger] Activate [Main].
  {
    cardNumber: 'EB04-049',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'EB04-050',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'SWORD' } }, keyword: 'canAttackActive', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // EB04-051 - Cannot attack unless any Character has base power >=12000. [Trigger] all opponent Characters -3000, then play at 0 Life.
  {
    cardNumber: 'EB04-051',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'preventAttack',
            target: { ref: 'self' },
            duration: 'permanent',
            attackUnlessGate: [{ kind: 'anyCharacterBasePowerAtLeast', power: 12000 }],
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [
            { fn: 'addPowerAuraOpponentCharacters', amount: -3000, duration: 'duringThisTurn' },
            { fn: 'triggerPlaySelf', ifGate: [{ kind: 'selfLife', atMost: 0 }] },
          ],
        },
      },
    ],
  },
  // EB04-052 - [When Attacking] copy opponent Leader power. [On K.O.] at 2 or less Life, play yellow Character power <=6000.
  {
    cardNumber: 'EB04-052',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'leader', player: 'opponent' }, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: {
        timing: 'onKO',
        gate: [{ kind: 'selfLife', atMost: 2 }],
        functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'yellow', maxPower: 6000 } }],
      } },
    ],
  },

  // EB04-053 — [Blocker] [On Block] If 2 or less Life, draw 1.
  { cardNumber: 'EB04-053', templateId: 'ability', params: { timing: 'onBlock', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // EB04-058 — [Blocker] [On Play] If 2 or less Life, add up to 1 top of deck to top of Life.
  { cardNumber: 'EB04-058', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },

];
