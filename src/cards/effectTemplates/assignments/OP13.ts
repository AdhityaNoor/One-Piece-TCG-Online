/**
 * Reviewed effect template assignments - Main Booster OP13.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP13_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP13 expressible). "give DON!! to [named]" is approximated as give-to-Leader/Char; OR-type/attr gates, any-DON-given & trash-count gates, and "turn Life face-up" cost are deferred. ──
  { cardNumber: 'OP13-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
  { cardNumber: 'OP13-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },
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
  // OP13-027 — [On Play] Set up to 2 DON!! active. PARTIAL: OR-type [End of Your Turn] ramp deferred.
  { cardNumber: 'OP13-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
  { cardNumber: 'OP13-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
  // OP13-033 — [On K.O.] Rest up to 2 opp Characters (the "or DON!!" option is dropped).
  { cardNumber: 'OP13-033', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 2 }] } },
  // OP13-035/037 — [End of Your Turn] Set this Character active (the "or 1 DON!!" alternative is dropped).
  { cardNumber: 'OP13-035', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },
  { cardNumber: 'OP13-037', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveSelf' }] } },
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
  { cardNumber: 'OP13-050', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Boa Hancock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Boa Hancock', maxCost: 3 } }] } },
  { cardNumber: 'OP13-052', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Boa Hancock' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Boa Hancock', maxCost: 6 } }] } },
  { cardNumber: 'OP13-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 3 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'giveDon', count: 1 }] } },
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
  // OP13-062 — [When Attacking] Return up to 1 opp Character base power ≤3000 to hand. PARTIAL: any-DON-given [On Play] ramp deferred.
  { cardNumber: 'OP13-062', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
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
  { cardNumber: 'OP13-074', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Homies', maxPower: 3000 } }] } },
  // OP13-075/077 — [Counter] Leader +3000. PARTIAL: any-DON-given [Main] payoffs deferred.
  { cardNumber: 'OP13-075', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  { cardNumber: 'OP13-077', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' }] } },
  // OP13-076 — [Counter] trash 1 → up to 1 Leader/Char +3000 this battle. PARTIAL: any-DON-given [Main] payoff deferred.
  { cardNumber: 'OP13-076', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
  // OP13-083 — [On Play] Look 5, reveal up to 1 {Five Elders} to hand, rest to bottom. PARTIAL: static trash-count immunity deferred.
  { cardNumber: 'OP13-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Five Elders' }, remainder: 'bottom' }] } },
  { cardNumber: 'OP13-087', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 1 }] } },
  // OP13-089 — [On K.O.] Draw 1. PARTIAL: static trash-count immunity/[Blocker] deferred.
  { cardNumber: 'OP13-089', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP13-091 — [On Play] trash 1 → K.O. up to 1 opp Character base cost ≤5. PARTIAL: static trash-count immunity/[Blocker] deferred.
  { cardNumber: 'OP13-091', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  { cardNumber: 'OP13-094', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Celestial Dragons' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
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
  // OP13-102 — [Trigger] Draw 1, rest up to 1 opp Character cost ≤3. PARTIAL: the trash-self [Main] is deferred.
  { cardNumber: 'OP13-102', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  { cardNumber: 'OP13-104', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
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

  // OP13-013 — [On Play] K.O. up to 1 of your opponent's Characters with 0 power.
  { cardNumber: 'OP13-013', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true }] } },
  // OP13-065 - [On Play] Look at 5; add Roger Pirates card other than this card's name.
  {
    cardNumber: 'OP13-065',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Roger Pirates', excludeSelfName: true } }] },
  },
  // OP13-093 - [Blocker] [On Play] Draw 2 cards, then trash 2 cards from hand.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw/trash is templated.
  { cardNumber: 'OP13-093', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
  // OP13-012 - [On Play] Look at 4; add Alabasta or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP13-012',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Alabasta' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } }] },
  },
  // OP13-086 - [On Play] Look at 3; add Celestial Dragons other than self, trash rest, then trash 1 from hand.
  {
    cardNumber: 'OP13-086',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  // OP13-110 — [Blocker] [On Play] If Leader {Egghead}, play up to 1 Character cost<=5 with a [Trigger] from hand.
  { cardNumber: 'OP13-110', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Egghead' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5, hasTrigger: true } }] } },

  // OP13-113 — [On Play] look 4, reveal up to 1 card with a [Trigger] (other than [Lilith]), add to hand, rest to bottom. [Trigger] Activate this effect.
  {
    cardNumber: 'OP13-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { hasTrigger: true, excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { hasTrigger: true, excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },

];
