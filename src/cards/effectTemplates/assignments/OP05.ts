/**
 * Reviewed effect template assignments - Main Booster OP05.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP05_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP05-001 — PARTIAL: K.O. replacement via −1000 power instead deferred; no matching primitive.
  { cardNumber: 'OP05-001', templateId: 'noRuntime', params: {} },

  // OP05-002 - [Activate: Main] [OPT] trash 1 Revolutionary Army: up to 3 Rev Army or [Trigger] Characters +3000 this turn.
  { cardNumber: 'OP05-002', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Revolutionary Army' }, optional: true },
    { fn: 'addPower', ifPrevious: 'previousSelectedAny', target: { group: 'union', targets: [
      { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } },
      { group: 'characters', player: 'controller', filter: { hasTrigger: true } },
    ] }, amount: 3000, duration: 'duringThisTurn', optional: true, maxTargets: 3 },
  ] } },

  // OP05-003 — if another Character has 7000+ current power, [Rush].
  { cardNumber: 'OP05-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfOtherCharacterPowerAtLeast', power: 7000 }] } }] } },

  // OP05-004 — [Activate: Main] [OPT] if this has 7000+ power, play Rev Army ≤5000 other than self from hand.
  { cardNumber: 'OP05-004', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfInstancePowerAtLeast', power: 7000 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000, excludeSelfName: true } }] } },

  // ── Triage batch (OP05 expressible): Revolutionary Army / Donquixote / Kid / DON!!-ramp lines. ──
  // OP05-005 Belo Betty — [On Play] If Leader {Revolutionary Army}: −1000; [When Attacking] if this has 7000+ power: −1000.
  {
    cardNumber: 'OP05-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfInstancePowerAtLeast', power: 7000 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP05-006 — [On Play] If Leader {Revolutionary Army}: give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP05-006', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP05-007 — [On Play] K.O. up to 2 opp Characters with combined power ≤4000.
  { cardNumber: 'OP05-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 2, maxCombinedPower: 4000 }] } },
  // OP05-008 — [DON!! x1][Activate: Main][Once Per Turn] Give up to 2 rested DON!! to your Leader or 1 Character.
  { cardNumber: 'OP05-008', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP05-009 — [On Play] draw 1 if your Leader has 0 power or less.
  { cardNumber: 'OP05-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLeaderPowerAtMost', power: 0 }], functions: [{ fn: 'draw', amount: 1 }] } },

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

  // OP05-016 — [When Attacking] if this has 7000+ power, prevent Blockers this battle.
  // [Trigger] trash 1 from hand: if Leader multicolored, play this.
  {
    cardNumber: 'OP05-016',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfInstancePowerAtLeast', power: 7000 }], functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP05-017 — [When Attacking] if this has 7000+ power, K.O. power<=3000.
  // [Trigger] trash 1 from hand: if Leader multicolored, play this.
  {
    cardNumber: 'OP05-017',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfInstancePowerAtLeast', power: 7000 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

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

  // OP05-022 — [End of Your Turn] if ≤6 cards in hand, set this Leader active.
  { cardNumber: 'OP05-022', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'setActiveSelf' }] } },

  // OP05-023 — [DON!! x1][When Attacking] K.O. up to 1 opp rested Character cost ≤3.
  { cardNumber: 'OP05-023', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },

  // OP05-025 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  {
    cardNumber: 'OP05-025',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  },

  // OP05-119 — PARTIAL: DON!!−10 bottom-deck allies + extra turn deferred; mapped [Activate: Main] ➀ add 1 active DON!!.
  {
    cardNumber: 'OP05-119',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 1 }],
      functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }],
    },
  },

  // --- codegen batch ---
  { cardNumber: 'OP05-027', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  { cardNumber: 'OP05-028', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] } },

  // OP05-026 — [DON!! x1] [When Attacking] [OPT] rest 1 of your Characters cost>=3: set this Character active.
  { cardNumber: 'OP05-026', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { minBaseCost: 3 } }, optional: true },
    { fn: 'setActiveSelf', ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP05-029 — [On Your Opponent's Attack] [Once Per Turn] rest 1 DON!!: rest up to 1 opp Character cost<=6.
  { cardNumber: 'OP05-029', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },

  // OP05-031 — [When Attacking] [Once Per Turn] If you have 2 or more rested Characters, set up to 1 of your rested Characters (cost 1) as active.
  { cardNumber: 'OP05-031', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { exactCost: 1, rested: true }, maxTargets: 1 }] } },

  // OP05-030 — PARTIAL: [Blocker] is printed; aura replacement for rested allies on opponent's turn.
  {
    cardNumber: 'OP05-030',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        targetCondition: { rested: true },
        sourceCondition: { turn: 'opponent' },
        trashSource: true,
        duration: 'permanent',
      }],
    },
  },

  // OP05-032 — [End of Your Turn] ①: set this Character active.
  //   [Once Per Turn] If this Character would be K.O.'d, you may rest 1 of your Characters with a cost of 3 or more other than [Pica].
  {
    cardNumber: 'OP05-032',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'endOfTurn',
          cost: [{ kind: 'restDon', count: 1 }],
          functions: [{ fn: 'setActiveSelf' }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementSelf',
            oncePerTurn: true,
            restCharacter: true,
            restCharacterFilter: { minCost: 3, excludeSourceName: true },
            duration: 'permanent',
          }],
        },
      },
    ],
  },

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

  // OP05-038 — [Counter] +4000 battle, then trash 1 → set up to 3 DON!! active. [Trigger] Rest up to 1 opp Leader/Character cost ≤3.
  {
    cardNumber: 'OP05-038',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'optionalTrashFromHand', count: 1 }, { fn: 'setActiveControllerDon', maxTargets: 3, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
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
  //   Static: if Leader [Donquixote Doflamingo], cost ≤5 Characters do not refresh (both players).
  //   [End of Your Turn] if 10+ field DON!!: K.O. all rested cost ≤5, trash this Stage.
  {
    cardNumber: 'OP05-040',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          gate: [{ kind: 'leaderName', name: 'Donquixote Doflamingo' }],
          functions: [{ fn: 'preventRefreshOnCharactersCostAtMost', maxCost: 5 }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'endOfTurn',
          gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }],
          functions: [
            { fn: 'koAllCharacters', filter: { rested: true, maxCost: 5 } },
            { fn: 'trashSelf' },
          ],
        },
      },
    ],
  },

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
  { cardNumber: 'OP05-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 7 } }, duration: 'untilStartOfNextTurn', optional: true }] } },

  // OP05-043 — [On Play] If Leader multicolored: look 3, add up to 1 to hand, rest top/bottom any order.
  { cardNumber: 'OP05-043', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'hand', remainder: 'deckTopOrBottom' }] } },
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

  // OP05-053 — [Your Turn] [Once Per Turn] When you draw outside Draw Phase, +2000 this turn.
  { cardNumber: 'OP05-053', templateId: 'ability', params: { timing: 'onDrawOutsideDrawPhase', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // OP05-054 — [On Play] Draw 2, then place 2 cards from hand at bottom of deck.
  { cardNumber: 'OP05-054', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },

  // OP05-055 — [Blocker][On Play] Look at 5, place them at top or bottom of deck in any order.
  { cardNumber: 'OP05-055', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // OP05-056 — [On Play] place 1 of your other Characters at bottom of deck: draw 1.
  { cardNumber: 'OP05-056', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { excludeSelf: true } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  {
    cardNumber: 'OP05-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP05-058 (event) It's a Waste of Human Life!! —
  //   [Main] Place all Characters cost ≤3 at deck bottom. Then both players trash hand down to 5.
  //   [Trigger] Place all Characters cost ≤2 at deck bottom.
  {
    cardNumber: 'OP05-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveAllCharactersToBottomDeck', filter: { maxCost: 3 } },
        { fn: 'trashHandDownTo', handSize: 5 },
        { fn: 'trashHandDownTo', handSize: 5, player: 'opponent' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveAllCharactersToBottomDeck', filter: { maxCost: 2 } }] } },
    ],
  },

  {
    cardNumber: 'OP05-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP05-060 — [Activate: Main] [OPT] add Life top to hand: if 0 or 3+ DON!! on field, add 1 DON!! active.
  { cardNumber: 'OP05-060', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'anyOf', gates: [{ kind: 'selfDonFieldCount', atMost: 0 }, { kind: 'selfDonFieldCount', atLeast: 3 }] }] },
  ] } },

  // OP05-061 — [DON!! x1][When Attacking] If 8+ DON!!: rest up to 1 opp Character cost ≤4.
  { cardNumber: 'OP05-061', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP05-062 — if 10 DON!! on field, [Blocker]
  { cardNumber: 'OP05-062', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }] } }] } },

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

  // OP05-068 — [On Play] if 8+ DON!!, set up to 1 purple {Straw Hat Crew} Character cost<=6 and power<=6000 active.
  { cardNumber: 'OP05-068', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { color: 'purple', typeIncludes: 'Straw Hat Crew', maxCost: 6, maxPower: 6000 }, maxTargets: 1 }] } },

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

  { cardNumber: 'OP05-074', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

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

  // OP05-079 — [On Play] opponent places 3 cards from their trash at the bottom of their deck.
  { cardNumber: 'OP05-079', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 3 }] } },

  // OP05-080 - [When Attacking] [OPT] return up to 20 trash to deck, shuffle, then gain Double Attack and +10000.
  { cardNumber: 'OP05-080', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 20 },
    { fn: 'shuffleDeck', ifPrevious: 'previousMovedAny' },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
    { fn: 'addPowerSelf', amount: 10000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP05-082 — rest this + 2 trash→deck bottom: if opp hand ≥6, opp trashes 1 from hand.
  { cardNumber: 'OP05-082', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 },
    { fn: 'trashFromOpponentHandChosenByOpponent', count: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'opponentHand', atLeast: 6 }] },
  ] } },

  // OP05-084 — [Your Turn] if only {Celestial Dragons} on field, all opp Characters −4 cost.
  { cardNumber: 'OP05-084', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -4, duration: 'permanent', gate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'Celestial Dragons' }], sourceCondition: { turn: 'your' } }] } },

  // OP05-085 — [Blocker][On Play] Trash 1 card from the top of your deck.
  { cardNumber: 'OP05-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 1 }] } },

  // OP05-086 — if 10+ cards in trash, [Blocker]
  { cardNumber: 'OP05-086', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashCount', atLeast: 10 }] } }] } },

  // OP05-087 — [DON!! x1] [When Attacking] K.O. 1 of your other Characters: give up to 1 opp Character −5 cost this turn.
  { cardNumber: 'OP05-087', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { excludeSelf: true } }, optional: true, maxTargets: 1 },
    { fn: 'addCost', ifPrevious: 'previousSelectedAny', target: { group: 'characters', player: 'opponent' }, amount: -5, duration: 'duringThisTurn', optional: true },
  ] } },

  // OP05-088 — [Activate: Main] ① + rest this + place 2 from trash at bottom: add black Character cost 3–5 from trash to hand.
  { cardNumber: 'OP05-088', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'trash', player: 'controller', filter: { category: 'character', color: 'black', minCost: 3, maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP05-089 — [Activate: Main] ① + rest this + rest 1 of your Characters: add black Character cost 1 from trash to hand.
  { cardNumber: 'OP05-089', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { excludeSelf: true } }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousSelectedAny', from: { zone: 'trash', player: 'controller', filter: { category: 'character', color: 'black', exactCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP05-090 — [Blocker][On Play]/[On K.O.] up to 1 {Dressrosa} Character +2000 this turn.
  {
    cardNumber: 'OP05-090',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP05-091 — [On Play] add black Character cost 3–7 (not Rebecca) from trash to hand; play black cost≤3 from hand rested.
  { cardNumber: 'OP05-091', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', color: 'black', minCost: 3, maxCost: 7, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'playFromHand', filter: { category: 'character', color: 'black', maxCost: 3 }, rested: true },
  ] } },

  // OP05-092 — [Your Turn] if only {Celestial Dragons} on field, all opp Characters −6 cost.
  { cardNumber: 'OP05-092', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -6, duration: 'permanent', gate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'Celestial Dragons' }], sourceCondition: { turn: 'your' } }] } },

  // OP05-093 — [On Play] place 3 from trash at bottom: K.O. opp cost<=2 and cost<=1.
  { cardNumber: 'OP05-093', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 },
    { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true },
    { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
  ] } },

  // OP05-094 Overheat — [Main] −3 cost; if cost 0, won't refresh next turn. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP05-094',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true },
            { fn: 'preventRefresh', target: { ref: 'previous' }, maxCost: 0, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP05-095 — [Counter] +4000 battle, then if trash >=15, K.O. up to 1 opp Character cost <=4.
  { cardNumber: 'OP05-095', templateId: 'ability', params: { timing: 'counter', functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfTrashCount', atLeast: 15 }] },
  ] } },

  // OP05-096 — [Main] choose one on opp cost<=1 Character; draw 1 if you have Celestial Dragons. [Trigger] K.O. or return opp cost<=6.
  {
    cardNumber: 'OP05-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'koCost1', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] },
          { label: 'returnCost1', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] },
          { label: 'lifeCost1', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] },
        ],
      }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Celestial Dragons', atLeast: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'koCost6', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] },
          { label: 'returnCost6', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] },
        ],
      }] } },
    ],
  },

  // OP05-097 — [Your Turn] reduce playing cost of {Celestial Dragons} Characters cost 2+ from hand by 1.
  {
    cardNumber: 'OP05-097',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'addCostAuraControllerHandCards',
        amount: -1,
        duration: 'permanent',
        filter: { category: 'character', typeIncludes: 'Celestial Dragons', minBaseCost: 2 },
        sourceCondition: { turn: 'your' },
      }],
    },
  },

  // OP05-098 — PARTIAL: onLifeBecomesZero reactive window deferred; no matching primitive.
  { cardNumber: 'OP05-098', templateId: 'noRuntime', params: {} },

  // OP05-099 — [On Your Opponent's Attack] rest this: opponent may trash top Life; if they do not,
  //   give up to 1 opp Leader/Character −2000 this turn.
  { cardNumber: 'OP05-099', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restThis' }], functions: [{
    fn: 'chooseOne',
    chooser: 'opponent',
    prompt: 'Trash the top card of your Life, or take −2000?',
    options: [
      { label: 'trashLife', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] },
      { label: 'powerMinus', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] },
    ],
  }] } },

  // OP05-100 — [Rush] templated. PARTIAL: leave-field life-trash replacement + Luffy negation deferred.
  { cardNumber: 'OP05-100', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent' }] } },

  // OP05-101 — static: if ≤2 Life, +1000. [On Play] Look 5, reveal up to 1 [Holly] to hand (rest to bottom), then play up to 1 [Holly].
  {
    cardNumber: 'OP05-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Holly' } }, { fn: 'playFromHand', filter: { category: 'character', name: 'Holly' } }] } },
    ],
  },

  // OP05-102 — [On Play] K.O. up to 1 opp Character with cost <= opp Life count.
  { cardNumber: 'OP05-102', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },

  // OP05-103 — [On Play] if [Hotori], K.O. up to 1 opp Character with cost <= opp Life count.
  { cardNumber: 'OP05-103', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfControlsNamed', name: 'Hotori' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },

  // OP05-104 — [On Play] place 1 of your Stages at bottom of deck: draw 1 and trash 1 from hand.
  { cardNumber: 'OP05-104', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'stages', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'drawAndTrash', drawCount: 1, trashCount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP05-105 — [Trigger] trash 1 → play this card.
  { cardNumber: 'OP05-105', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },

  // OP05-106 — [On Play] Look 5, reveal up to 1 {Sky Island} other than [Shura] to hand, rest to bottom. [Trigger] play this card.
  {
    cardNumber: 'OP05-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island', excludeCardNames: ['Shura'] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP05-107 — [Your Turn] [Once Per Turn] When Life→hand, +2000 this turn.
  { cardNumber: 'OP05-107', templateId: 'ability', params: { timing: 'onLifeToHand', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // OP05-109 (character) Pagaya — [Once Per Turn] When a [Trigger] activates, draw 2 and trash 2 from hand.
  {
    cardNumber: 'OP05-109',
    templateId: 'ability',
    params: {
      timing: 'onTriggerActivated',
      oncePerTurn: true,
      functions: [{ fn: 'draw', amount: 2 }, { fn: 'trashFromHand', count: 2 }],
    },
  },
  // OP05-111 — [On Play] You may play 1 [Kotori] from hand: add up to 1 opp Character cost≤3 to opp Life face-up (top or bottom).
  { cardNumber: 'OP05-111', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'playFromHand', filter: { category: 'character', name: 'Kotori' } },
    { fn: 'moveCards', ifPrevious: 'previousSelectedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true },
  ] } },

  { cardNumber: 'OP05-112', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Sky Island', exactCost: 1 } }] } },

  // OP05-114 — [Counter] +2000 battle (+2000 more if opp ≤2 Life). [Trigger] K.O. cost <= opp Life count.
  {
    cardNumber: 'OP05-114',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifGate: [{ kind: 'opponentLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP05-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP05-116 — [Main] K.O. up to 1 opp Character with cost <= opp Life count. [Trigger] activates [Main].
  {
    cardNumber: 'OP05-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },
    ],
  },

  // OP05-117 — [On Play] Look at 5; add up to 1 Sky Island type.
  {
    cardNumber: 'OP05-117',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Sky Island' } }] },
  },

  { cardNumber: 'OP05-118', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'draw', amount: 4 }] } },

];
