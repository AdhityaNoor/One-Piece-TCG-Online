/**
 * Reviewed effect template assignments — Promotional cards (P-xxx).
 */
import type { CardEffectAssignment } from '../assembler';

export const P_ASSIGNMENTS: CardEffectAssignment[] = [


  // P-074 — return this Character to hand, then look at 5 and place them top or bottom.
  { cardNumber: 'P-074', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'returnSelfToHand' }, { fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom', ifPrevious: 'previousMovedAny' }] } },


  // P-081 — [Activate: Main] return this to hand: If you have 3+ blue {Cross Guild} Characters, play up to 1 {Cross Guild} cost-5 Character from hand.
  { cardNumber: 'P-081', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Cross Guild', color: 'blue', atLeast: 3 }], functions: [{ fn: 'returnSelfToHand' }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', exactCost: 5 }, ifPrevious: 'previousMovedAny' }] } },

  // --- codegen batch ---
  { cardNumber: 'P-014', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ── Triage batch (P expressible). ──
  // P-029 — [End of Your Turn] rest this: set up to 1 {FILM} Character other than [Bartolomeo] active.
  { cardNumber: 'P-029', templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'restThis' }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'FILM', excludeCardNames: ['Bartolomeo'] } }] } },

  // P-030 — [On K.O.] Place up to 1 Character cost ≤3 at bottom of deck.
  { cardNumber: 'P-030', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // P-044 — [DON!! x1] If ≤4 hand, this Character +2000.
  { cardNumber: 'P-044', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfHand', atMost: 4 }] } }] } },

  // P-053 — [On Play] If ≤3 hand, return up to 1 opp Character cost ≤3 to hand.
  { cardNumber: 'P-053', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // P-055 — [On Play] trash 2 from hand: opp places 1 Character at bottom of deck.
  { cardNumber: 'P-055', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 2 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // P-057 — [Main] if Leader [Uta], up to 2 opp rested Characters cost<=4 won't refresh. [Trigger] Activate [Main].
  {
    cardNumber: 'P-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true, maxTargets: 2 }] } },
    ],
  },

  // P-058 — [Main] if Leader [Uta], set all {FILM} Characters active at end of turn. [Trigger] set all {FILM} active.
  {
    cardNumber: 'P-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'FILM' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'FILM' } }] } },
    ],
  },

  // P-059 — [Counter] If Leader [Uta], you may return any number of your Characters to hand.
  //   Up to 1 of your Leader or Character cards gains +2000 during this battle for every returned Character.
  //   maxTargets:-1 = any number; captureCount snapshots the returned count into `returned` before the
  //   buff-target choice reuses `t`; the scaled addPower reads it via countVar/amountPer.
  { cardNumber: 'P-059', templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: -1 },
    { fn: 'captureCount', into: 'returned' },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 0, countVar: 'returned', amountPer: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // P-060 — [Main] rest 1 [Uta]: rest up to 2 opp DON!!.
  { cardNumber: 'P-060', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'controller', filter: { name: 'Uta' } }, optional: true }, { fn: 'restOpponentDon', maxTargets: 2, ifPrevious: 'previousSelectedAny' }] } },

  // P-063 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  { cardNumber: 'P-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  { cardNumber: 'P-068', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // P-069 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'P-069', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // P-073 — [Activate: Main][OPT] add 1 top/bottom Life to hand → this Character +1000 this turn.
  { cardNumber: 'P-073', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },

  // P-075 — [On Play] give up to 1 rested DON!! to Leader/1 Char. [When Attacking] if you have a cost-8+ Character, draw 1 trash 1.
  {
    cardNumber: 'P-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // P-078 — if 2+ rested {ODYSSEY} Characters, +1000
  { cardNumber: 'P-078', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'ODYSSEY', atLeast: 2, rested: true }] } }] } },

  // P-079 — [Blocker] [End of Your Turn] If 2+ rested {ODYSSEY} Characters, set this Character as active.
  { cardNumber: 'P-079', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'ODYSSEY', atLeast: 2, rested: true }], functions: [{ fn: 'setActiveSelf' }] } },

  // P-082 — [Your Turn] [On Play] if Leader {Cross Guild} or {Baroque Works}, place up to 1 opp Character power<=2000 at bottom of deck.
  { cardNumber: 'P-082', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Cross Guild' }, { kind: 'leaderType', type: 'Baroque Works' }] }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // P-083 — [DON!! x1][When Attacking] trash 1 Character -> give up to 1 opp Character -1000, then draw 1.
  { cardNumber: 'P-083', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'optionalTrashFromHand', count: 1, filter: { category: 'character' } }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },

  // P-084 (character) Buggy —
  //   This Character cannot attack. If Leader [Buggy], all Characters cost 3 or 4 cannot attack.
  //   [On Play] Play up to 1 {Cross Guild} Character cost ≤6 from hand.
  {
    cardNumber: 'P-084',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent' },
        { fn: 'preventAttackAll', duration: 'permanent', player: 'both', charactersOnly: true, condition: { minCost: 3, maxCost: 4, gate: [{ kind: 'leaderName', name: 'Buggy' }] } },
      ] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', maxCost: 6 } }] } },
    ],
  },

  // P-085 — [On Play] if Leader {Supernovas} and self Life <= opp Life, add up to 1 opp Character cost<=4 to top/bottom of owner's Life face-up.
  { cardNumber: 'P-085', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

  // P-088 — [Trigger] if Leader {Supernovas} and combined Life ≤5, play this card.
  { cardNumber: 'P-088', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'combinedLifeTotal', atMost: 5 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // P-105 — If your Leader has {Revolutionary Army}, this Character gains [Blocker] and +4 cost.
  //   [On Play] You may add 1 top/bottom Life to hand: give up to 1 rested DON!! to your Leader or 1 Character.
  {
    cardNumber: 'P-105',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } },
        { fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } },
      ] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // ── Triage batch 2026-07-18: expressible P gap after promo catalog restore. ──
  { cardNumber: 'P-001', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
  { cardNumber: 'P-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
  { cardNumber: 'P-004', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
  { cardNumber: 'P-006', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'your' } }] } },
  { cardNumber: 'P-008', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
  { cardNumber: 'P-011', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { noBaseEffect: true } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  { cardNumber: 'P-013', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveSelfToBottomDeck' }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'P-017', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  { cardNumber: 'P-019', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
  { cardNumber: 'P-020', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  { cardNumber: 'P-026', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true }] } },
  // Alias [Franky] is normalization (aliasNames); map opponent-turn aura only.
  { cardNumber: 'P-027', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', targetCondition: { maxBasePower: 3000 }, sourceCondition: { turn: 'opponent' } }] } },
  { cardNumber: 'P-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  { cardNumber: 'P-032', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -2, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'your' } }] } },
  { cardNumber: 'P-033', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveSelfToBottomDeck' }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'P-034', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
  { cardNumber: 'P-035', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'P-036', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
    { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },
  { cardNumber: 'P-037', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' }] } },
  { cardNumber: 'P-038', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restLeader' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  { cardNumber: 'P-042', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  { cardNumber: 'P-043', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  { cardNumber: 'P-047', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 3 }] }] } },
  { cardNumber: 'P-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },
  // [Blocker] from printed keyword flags; map DON!! power only.
  { cardNumber: 'P-050', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 4000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfHand', atMost: 3 }] } }] } },
  { cardNumber: 'P-051', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'optionalTrashFromHand', anyNumber: true },
    { fn: 'addPowerSelfPerPreviousTrashed', amountPer: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
  ] } },
  { cardNumber: 'P-056', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  { cardNumber: 'P-065', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentHasCharacterExactCost', exactCost: 0 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn' }] } },
  { cardNumber: 'P-066', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', anyOfTypes: ['Kuja Pirates'], gate: [{ kind: 'selfHand', atMost: 5 }], sourceCondition: { turn: 'your' } }] } },
  { cardNumber: 'P-076', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Navy' }, optional: true },
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },
  {
    cardNumber: 'P-086',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'donMinus', count: 3 }],
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { minPower: 3000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Heart Pirates', maxCost: 4 }, ifPrevious: 'previousMovedAny' },
      ],
    },
  },
  {
    cardNumber: 'P-090',
    templateId: 'ability',
    params: {
      timing: 'onKO',
      condition: { turn: 'opponent' },
      cost: [{ kind: 'donMinus', count: 1 }],
      functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Big Mom Pirates', maxCostFromOpponentDon: true, excludeCardNames: ['Charlotte Smoothie'] } }],
    },
  },
  // [Blocker] from printed flags.
  { cardNumber: 'P-093', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  {
    cardNumber: 'P-096',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1, targetName: 'Nami', charactersOnly: true, optional: true }] } },
    ],
  },
  { cardNumber: 'P-101', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },
  { cardNumber: 'P-103', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'topOrBottom' }, maxTargets: 2 },
    { fn: 'giveDonControllerLeader', count: 1 },
  ] } },
  { cardNumber: 'P-107', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'selfDonFieldCount', atLeast: 10 }, { kind: 'opponentDonFieldCount', atLeast: 10 }] }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn' }] } },
  { cardNumber: 'P-112', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [
    { fn: 'giveDonControllerLeader', count: 1 },
    { fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } },
  ] } },
  {
    cardNumber: 'P-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'opponent' } },
        { fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'opponent' } },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  { cardNumber: 'P-135', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  {
    cardNumber: 'P-155',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ── Triage batch 2026-07-18: remaining needsPrimitive P cards expressible with existing catalog. ──
  // P-007 — [DON!! x1] cannot be K.O.'d in battle by ＜Strike＞ Leaders/Characters.
  { cardNumber: 'P-007', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1 }, attackerAttribute: 'strike' }] } },

  // P-025 — [DON!! x1] cannot be K.O.'d in battle by Characters without ＜Special＞.
  { cardNumber: 'P-025', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1 }, attackerCategory: 'character', attackerWithoutAttribute: 'special' }] } },

  // P-077 — [OPT] When 2+ DON!! returned: add 1 DON!! rested, then set up to 1 purple Stage active.
  { cardNumber: 'P-077', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 2 }], functions: [
    { fn: 'addDonFromDeck', count: 1, rested: true },
    { fn: 'setActiveControllerStage', filter: { color: 'purple' }, maxTargets: 1 },
  ] } },

  // P-009 — [On Play] If opponent hand ≥6, opponent adds 1 Life to hand.
  { cardNumber: 'P-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 6 }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' } }] } },

  // P-010 — [End of Your Turn] Add 1 DON!! from DON!! deck set as active.
  { cardNumber: 'P-010', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },

  // P-048 — [DON!! x1] [When Attacking] If Life ≥4, opponent places 1 hand card at bottom of deck.
  { cardNumber: 'P-048', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfLife', atLeast: 4 }], functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1, chooser: 'opponent' }] } },

  // P-052 — [DON!! x1] cannot be K.O.'d in battle by <Slash> cards.
  { cardNumber: 'P-052', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1 }, attackerAttribute: 'slash' }] } },

  // P-054 — [DON!! x1] cannot be K.O.'d in battle by <Strike> cards.
  { cardNumber: 'P-054', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1 }, attackerAttribute: 'strike' }] } },

  // P-062 — [Activate: Main] [OPT] rest opp Character cost≤4 + this +1000 this turn; Then Life top → hand.
  { cardNumber: 'P-062', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // P-067 — If this Character is rested, opponent cannot attack any card other than this Character.
  { cardNumber: 'P-067', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'setForcedAttackTarget', duration: 'permanent', condition: { rested: true } }] } },

  // P-071 — [On K.O.] You may add this Character to your hand.
  { cardNumber: 'P-071', templateId: 'ability', params: { timing: 'onKO', optionalActivate: true, functions: [{ fn: 'returnSelfToHand' }] } },

  // P-072 — [On Play]/[On K.O.] Rest up to 1 opp Character cost≤4.
  {
    cardNumber: 'P-072',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // P-091 — [On Play] play {Neptunian}/{Fish-Man Island} cost≤5 from hand.
  //   [Activate: Main] rest this: up to 1 {Neptunian} can attack Characters the turn it is played.
  {
    cardNumber: 'P-091',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Neptunian' }, { typeIncludes: 'Fish-Man Island' }], maxCost: 5 } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Neptunian' } }, keyword: 'canAttackCharactersWhileSummoningSick', duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // P-092 — [Opponent's Turn] −3000. [When Attacking] If Leader {Navy}, Leader base power becomes 7000 until end of opponent's next turn.
  {
    cardNumber: 'P-092',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: -3000, duration: 'permanent', condition: { turn: 'opponent' } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'endOfOpponentsTurn' }] } },
    ],
  },

  // P-097 — [On Play]/[When Attacking] opponent cannot activate [Blocker] this turn.
  {
    cardNumber: 'P-097',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn' }] } },
    ],
  },

  // P-098 — [Blocker] printed. [On Play] If you do NOT have 5 Characters cost≥5, bottom-deck this.
  { cardNumber: 'P-098', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveSelfToBottomDeck', ifGate: [{ kind: 'selfCharacterCostCount', minCost: 5, atMost: 4 }] }] } },

  // P-099 — [When Attacking] DON!! −10: set this Character as active.
  { cardNumber: 'P-099', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 10 }], functions: [{ fn: 'setActiveSelf' }] } },

  // P-100 — [When Attacking] Negate effects of opponent Leader + all Characters this turn.
  { cardNumber: 'P-100', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'negateControllerEffects', player: 'opponent', duration: 'duringThisTurn', appliesToCategories: ['leader', 'character'] }] } },

  // P-102 — [On Play] If Leader {Straw Hat Crew}, set up to 2 DON!! as active.
  { cardNumber: 'P-102', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Straw Hat Crew' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },

  // P-104 — If either player has 10 DON!! on field, cannot be removed by opponent's effects.
  { cardNumber: 'P-104', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventFieldRemoval', target: { ref: 'self' }, duration: 'permanent', effectSourceController: 'opponent', condition: { gate: [{ kind: 'anyOf', gates: [{ kind: 'selfDonFieldCount', atLeast: 10 }, { kind: 'opponentDonFieldCount', atLeast: 10 }] }] } }] } },

  // P-106 — [End of Your Turn] may turn top Life face-up: set up to 1 {Egghead} active. [Trigger] Draw 1 + K.O. cost≤2.
  {
    cardNumber: 'P-106',
    templates: [
      { templateId: 'ability', params: { timing: 'endOfTurn', functions: [
        { fn: 'turnTopLifeFace', faceUp: true },
        { fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'Egghead', rested: true }, ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true },
      ] } },
    ],
  },

  // P-114 — [Blocker] printed. [End of Your Turn] If you have any active DON!!, set this Character as active.
  { cardNumber: 'P-114', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfActiveDonCount', atLeast: 1 }], functions: [{ fn: 'setActiveSelf' }] } },

  // P-115 — [On Play] Give up to 1 rested DON!! to Leader/Character. [Trigger] Play yellow Character ≤5000 power with [Trigger] from hand.
  {
    cardNumber: 'P-115',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'yellow', maxPower: 5000, hasTrigger: true } }] } },
    ],
  },

  // ── Triage batch 2026-07-18: close remaining defer (7 → 0). ──
  // P-002 — [Main] return hand → shuffle → draw equal. [Trigger] Activate [Main].
  {
    cardNumber: 'P-002',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'returnHandShuffleDraw' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'returnHandShuffleDraw' }] } },
    ],
  },
  // P-005 — [Activate: Main] DON!! −2: this Character gains [Banish] this turn.
  { cardNumber: 'P-005', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'duringThisTurn' }] } },
  // P-024 — [Main] Leader +1000 per your Character this turn. [Trigger] up to 1 Leader/Character +1000 this turn.
  {
    cardNumber: 'P-024',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 0, duration: 'duringThisTurn', scale: { per: 'controllerCharacters', step: 1, amountPer: 1000 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // P-039 — Printed [Banish] is card data. [DON!! x2] If 0 Life, +2000.
  { cardNumber: 'P-039', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 2, gate: [{ kind: 'selfLife', atMost: 0 }] } }] } },
  // P-046 — [On Play] You may place all hand at deck bottom; if you do, draw equal.
  //   Known limitation: "in any order" → place in current hand order (no interactive reorder).
  { cardNumber: 'P-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnHandShuffleDraw', destination: 'bottom', optional: true }] } },
  // P-111 — [OPT] If {Straw Hat Crew} would be removed by opponent effect, rest 1 DON!! instead.
  { cardNumber: 'P-111', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{
    fn: 'registerKoReplacementAura',
    scope: 'effect',
    oncePerTurn: true,
    anyOfTypes: ['Straw Hat Crew'],
    replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
    effectSourceController: 'opponent',
    restDon: { count: 1 },
    duration: 'permanent',
  }] } },
  // P-117 (leader) Nami — East Blue deck-only; empty deck → win; [DON!! x1] on Life damage may trash top deck.
  {
    cardNumber: 'P-117',
    templates: [
      { templateId: 'staticFlags', params: { mustHaveType: 'East Blue' } },
      { templateId: 'ability', params: { timing: 'startOfGame', functions: [{ fn: 'replaceEmptyDeckDefeatWithWin' }] } },
      { templateId: 'ability', params: { timing: 'onLifeDamageDealt', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'trashTopDeck', count: 1, optional: true }] } },
    ],
  },

  // Vanilla promos (no effect text).
  { cardNumber: 'P-012', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-015', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-016', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-021', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-022', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-023', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-041', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-061', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-064', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-070', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-080', templateId: 'noRuntime', params: {} },
  { cardNumber: 'P-089', templateId: 'noRuntime', params: {} },

];
