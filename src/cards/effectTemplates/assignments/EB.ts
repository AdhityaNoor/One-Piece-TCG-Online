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
  // EB01-007 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'EB01-007', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // EB01-015 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
  // EB01-016 - [Activate: Main] Rest this Character: K.O. up to 1 rested opponent Character cost 1 or less.
  { cardNumber: 'EB01-016', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 1 } }, optional: true }] } },
  // EB01-023 — [On Play] Draw 1 card.
  { cardNumber: 'EB01-023', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },

  // EB01-003 - [Rush] [When Attacking] If opponent has 2 or less Life, this Character +2000 this turn.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking power effect is templated.
  { cardNumber: 'EB01-003', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentLife', atMost: 2 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },

  // EB01-006 - [Blocker] [DON!! x2] [When Attacking] Give opponent Character -3000 power.
  // Note: [Blocker] is an engine keyword flag. Only the when-attacking power effect is templated.
  { cardNumber: 'EB01-006', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // EB01-026 - [DON!! x1] [When Attacking] If hand has 1 or less, return cost <=3 Character to hand.
  { cardNumber: 'EB01-026', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHand', atMost: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // EB01-019 - [Counter] +4000 to Leader/Character, then reveal-search top 3 for Donquixote Pirates Character.
  {
    cardNumber: 'EB01-019',
    templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Donquixote Pirates' } }] },
  },

  // EB01-048 — [Activate: Main] You may rest this Character: Give up to 1 of your opponent's Characters −4 cost.
  {
    cardNumber: 'EB01-048',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] },
  },

  // EB01-049 — [On Play] K.O. up to 1 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'EB01-049', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // EB01-046 - [On Play]/[When Attacking] Give opponent Character -1 cost, then K.O. cost 0.
  {
    cardNumber: 'EB01-046',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true }] } },
    ],
  },

  // EB01-054 - [Blocker] [On Play] If opponent has 1 or less Life, K.O. cost 3 or less.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play K.O. is templated.
  {
    cardNumber: 'EB01-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentLife', atMost: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  },

  // EB01-036 - [Rush] [On K.O.] If Leader has Impel Down type, add 1 rested DON!!.
  // Note: [Rush] is an engine keyword flag. Only the on-K.O. DON!! ramp is templated.
  {
    cardNumber: 'EB01-036',
    templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] },
  },
  // EB01-039 - [Main] DON!! -1: K.O. cost <=8. [Trigger] add 1 active DON!!.
  {
    cardNumber: 'EB01-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // EB02-026 - [On Play] If Leader is multicolored and hand has 5 or less cards, draw 2.
  {
    cardNumber: 'EB02-026',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] },
  },
  // EB02-007 - [Main] up to 3 Leader/Characters +1000, then K.O. power <=3000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'EB02-007',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },

  // EB02-014 - [On Play] Play up to 1 [Gaimon] from hand.
  {
    cardNumber: 'EB02-014',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Gaimon' } }] },
  },

  // EB02-046 - [On Play] Trash top 2 cards of deck, then give opponent Character -1 cost.
  {
    cardNumber: 'EB02-046',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] },
  },

  // EB02-054 - [Blocker] [On Play] If you have 2 or less Life, draw 2 and trash 1.
  // Note: [Blocker] is an engine keyword flag. Only the gated on-play draw/trash is templated.
  {
    cardNumber: 'EB02-054',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] },
  },

  // EB02-017 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB02-017',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } }] },
  },

  // EB03-010 - [Blocker] [On Play] Look at 5; add Character power 1000 or less, or Event.
  // Note: [Blocker] is an engine keyword flag. Only the on-play search is templated.
  {
    cardNumber: 'EB03-010',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ category: 'character', maxPower: 1000 }, { category: 'event' }] } }] },
  },

  // EB03-047 - [On Play] Trash top 3 cards of deck. [On K.O.] Draw 1.
  {
    cardNumber: 'EB03-047',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // EB04-006 - [On Play] Look at 7; add up to 1 [Lulucia Kingdom].
  {
    cardNumber: 'EB04-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Lulucia Kingdom' } }] },
  },
  // EB04-002 - [On Play] Look at 4; add Egghead or Straw Hat Crew other than this card's name.
  {
    cardNumber: 'EB04-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Egghead' }, { typeIncludes: 'Straw Hat Crew' }], excludeSelfName: true } }] },
  },
  // EB04-037 - [On Play] If Leader has Foxy Pirates, look at 5; add Foxy Pirates.
  {
    cardNumber: 'EB04-037',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Foxy Pirates' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Foxy Pirates' } }] },
  },

  // --- Batch: EB01 expressible ---

  // EB01-010 — (Event) [Counter] K.O. up to 1 opp Character 6000 base power or less. [Trigger] 5000 base power or less.
  {
    cardNumber: 'EB01-010',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 6000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },
    ],
  },

  // EB01-013 — [Activate: Main] trash this: play up to 1 {Land of Wano} cost<=5 (other than [Kouzuki Hiyori]) from hand; then draw 1.
  { cardNumber: 'EB01-013', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 5, excludeSelfName: true } },
    { fn: 'draw', amount: 1 },
  ] } },

  // EB01-022 — [End of Your Turn] If you have 2 or less cards in hand, draw 2.
  { cardNumber: 'EB01-022', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 2 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // EB01-031 — [On Play] DON!! −1: If Leader {Water Seven}, add up to 2 Characters cost<=4 from trash to hand.
  { cardNumber: 'EB01-031', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 2 }] } },

  // EB01-035 — [On Play] If Leader {Baroque Works}, up to 1 Leader/Character +1000 this turn. [Trigger] DON!! −1: play this.
  {
    cardNumber: 'EB01-035',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // EB01-044 — [Activate: Main] rest this: up to 1 of your [Spandam] Characters +3000 this turn.
  { cardNumber: 'EB01-044', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Spandam' } }, amount: 3000, duration: 'duringThisTurn', optional: true }] } },

  // EB01-047 — [Once Per Turn] When a Character is K.O.'d, draw 1 and trash 1 from hand.
  { cardNumber: 'EB01-047', templateId: 'ability', params: { timing: 'onCharacterKoed', oncePerTurn: true, functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // EB01-051 — (Event) [Main] trash 2 from top of deck: K.O. up to 1 opp Character cost<=5. [Trigger] Activate [Main].
  {
    cardNumber: 'EB01-051',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // EB01-056 — [On Play] add 1 top/bottom Life to hand: draw 1.
  { cardNumber: 'EB01-056', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: EB02 expressible ---

  // EB02-002 — [Activate: Main] rest this: up to 1 {Revolutionary Army} Character (other than self) +2000 this turn.
  { cardNumber: 'EB02-002', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army', excludeSelf: true } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // EB02-008 — (Event) [Main] look 4, reveal up to 1 card cost 4+, add to hand, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB02-008',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-013 — [On Play] If 3+ DON!! on field, look 7, reveal up to 1 [Zou], add to hand, rest to bottom; then play up to 1 [Zou] from hand.
  { cardNumber: 'EB02-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 3 }], functions: [
    { fn: 'searchTopDeck', look: 7, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Zou' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { name: 'Zou' } },
  ] } },

  // EB02-016 — [On Play] Play up to 1 {Animal} Character cost<=3 from hand.
  { cardNumber: 'EB02-016', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Animal', maxCost: 3 } }] } },

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

  // EB02-024 — [On Play] Draw 2, place 2 from hand at bottom of deck; then return up to 1 Character cost<=1 to hand.
  { cardNumber: 'EB02-024', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // EB02-027 — [On Play] Place up to 1 opp Character with 1000 power or less at bottom of deck.
  { cardNumber: 'EB02-027', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 1000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // EB02-031 — (Event) same searcher as EB02-008.
  {
    cardNumber: 'EB02-031',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-036 — [Blocker] [On K.O.] DON!! −1: look 3, reveal up to 1 {Straw Hat Crew}, add to hand, rest to bottom.
  { cardNumber: 'EB02-036', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },

  // EB02-038 — [On Play] Play up to 1 {Impel Down} Character cost<=2 from hand.
  { cardNumber: 'EB02-038', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 2 } }] } },

  // EB02-040 — (Event) same searcher.
  {
    cardNumber: 'EB02-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 4 }, remainder: 'bottom' }] } },
    ],
  },

  // EB02-044 — [Blocker] [On Play] Play up to 1 black {Navy} Character cost<=4 from trash rested.
  { cardNumber: 'EB02-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', color: 'black', typeIncludes: 'Navy', maxCost: 4 }, rested: true }] } },

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

  // EB02-053 — [On Play]/[On K.O.] look at top of your or opponent's Life, place top or bottom.
  {
    cardNumber: 'EB02-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
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

  // --- Batch: EB03 expressible ---

  // EB03-011 — (Event) [Counter] If Leader [Nefeltari Vivi], up to 1 Leader/Character +4000 battle. [Trigger] give up to 1 opp Character −2000 this turn.
  {
    cardNumber: 'EB03-011',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
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

  // EB03-025 — [On Play] trash 1 from hand: return up to 1 Character with 6000 base power to hand.
  { cardNumber: 'EB03-025', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { exactBasePower: 6000 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

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

  // EB03-032 — [Your Turn] [On Play] up to 1 [Charlotte Katakuri] +2000 this turn.
  { cardNumber: 'EB03-032', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Charlotte Katakuri' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // EB03-036 — [On Play] DON!! −1: K.O. up to 2 opp Characters with base cost 3 or less.
  { cardNumber: 'EB03-036', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 3 } }, optional: true, maxTargets: 2 }] } },

  // EB03-050 — [On Play] up to 1 {Sky Island} Character gains [Double Attack] this turn.
  { cardNumber: 'EB03-050', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Sky Island' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }] } },

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

  // EB03-060 — (Event) [Main] If Leader [Nami], look 4, reveal up to 1 cost 2-8, add to hand, rest to bottom. [Trigger] Activate [Main].
  {
    cardNumber: 'EB03-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2, maxCost: 8 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { minCost: 2, maxCost: 8 }, remainder: 'bottom' }] } },
    ],
  },

  // EB03-062 — [Rush] [Activate: Main] trash 1 from hand + trash this: add 1 top of deck to top of Life; then play up to 1 [Trafalgar Law] cost<=7 from hand.
  { cardNumber: 'EB03-062', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' } },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Trafalgar Law', maxCost: 7 } },
  ] } },

  // --- Batch: EB04 expressible ---

  // EB04-008 — (Event) [Main] If 2 or less Life, give up to 1 opp Character −3000 this turn. [Counter] Your Leader +3000 battle.
  {
    cardNumber: 'EB04-008',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // EB04-014 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to your Leader.
  { cardNumber: 'EB04-014', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },

  // EB04-018 — [On Play] rest this: K.O. up to 1 opp rested Character with 8000 power or less.
  { cardNumber: 'EB04-018', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxPower: 8000 } }, optional: true }] } },

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

  // EB04-024 — [Activate: Main] rest this + trash 1 from hand: up to 1 {Alabasta} Character gains [Unblockable] this turn.
  { cardNumber: 'EB04-024', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Alabasta' } }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true },
  ] } },

  // EB04-026 — [On Play] Place up to 1 opp Character cost<=1 at bottom of deck. [When Attacking] Draw 1 and trash 1 from hand.
  {
    cardNumber: 'EB04-026',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
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

  // EB04-039 — [On Play] add 1 DON!! from deck active. [Activate: Main] trash this: play up to 1 {Kid Pirates} Character cost<=5 from hand.
  {
    cardNumber: 'EB04-039',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Kid Pirates', maxCost: 5 } }] } },
    ],
  },

  // EB04-042 — [On Play] trash 3 from top of deck: give up to 1 opp Character −1 cost this turn.
  { cardNumber: 'EB04-042', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'trashTopDeck', count: 3 },
    { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true },
  ] } },

  // EB04-049 — (Event) [Main] trash 2 from top of deck: K.O. up to 1 opp Character base cost 5 or less. [Trigger] Activate [Main].
  {
    cardNumber: 'EB04-049',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 5 } }, optional: true }] } },
    ],
  },

  // EB04-053 — [Blocker] [On Block] If 2 or less Life, draw 1.
  { cardNumber: 'EB04-053', templateId: 'ability', params: { timing: 'onBlock', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // EB04-027 — [On Play] draw 2 and trash 1. [Trigger] play up to 1 Character with 5000 power or less and a [Trigger] from hand.
  {
    cardNumber: 'EB04-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxPower: 5000, hasTrigger: true } }] } },
    ],
  },


  // EB01-053 — [On Play] Place up to 1 opp Character cost<=3 at the top or bottom of opponent's Life face-up. [Trigger] give up to 1 opp Leader/Character −3000 this turn.
  {
    cardNumber: 'EB01-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },


  // EB01-037 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: K.O. up to 1 opp Character cost<=2.
  { cardNumber: 'EB01-037', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },


  // EB01-027 — If Leader {Baroque Works}, +1000 power for every 2 Events in trash. [On Play] Draw 2 and trash 1.
  {
    cardNumber: 'EB01-027',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerTrashEvents', step: 2, amountPer: 1000, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Baroque Works' }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
];
