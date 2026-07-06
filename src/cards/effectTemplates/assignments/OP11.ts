/**
 * Reviewed effect template assignments - Main Booster OP11.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP11_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP11-028 — [On Play] Up to 1 opp rested Character won't become active next Refresh. [Trigger] K.O. opp rested cost<=3.
  {
    cardNumber: 'OP11-028',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP11-004 — [On Play] Search {Navy} (excl. self). [Activate: Main] Trash this: up to 1 of your Characters +1000.
  {
    cardNumber: 'OP11-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP11-008 — [Blocker] [On Play] You may trash 1 from hand: if Leader {Navy}, give up to 1 opp Character −6000.
  { cardNumber: 'OP11-008', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -6000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },
  // OP11-118 — [Rush] [When Attacking] You may trash 1 from hand: return Character cost<=4 to hand, then give 1 rested DON!!.
  { cardNumber: 'OP11-118', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, ifPrevious: 'previousMovedAny' },
    { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: OP11 expressible with existing primitives ---

  // OP11-002 — [On Play] Give opp Character −1000, then K.O. opp Character with 0 power or less.
  { cardNumber: 'OP11-002', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true },
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
  // OP11-037 — [Main] Search ({Neptunian} or {Fish-Man Island}) Character. [Trigger] Draw 1.
  {
    cardNumber: 'OP11-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Neptunian' }, { typeIncludes: 'Fish-Man Island' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP11-044 — [Activate: Main] [OPT] You may trash 1 from hand: all your {GERMA 66} Characters +1000.
  { cardNumber: 'OP11-044', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPowerControllerCharactersAll', amount: 1000, duration: 'duringThisTurn', filter: { typeIncludes: 'GERMA 66' }, ifPrevious: 'previousMovedAny' },
  ] } },
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
  // OP11-075 — [On Play] If Leader is [Nico Robin] and 7+ DON!! on field, draw 2. [Trigger] same.
  {
    cardNumber: 'OP11-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nico Robin' }, { kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Nico Robin' }, { kind: 'selfDonFieldCount', atLeast: 7 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },
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
  // OP11-099 — [Main] Search {Navy} (excl. self), trash the rest. [Trigger] same.
  {
    cardNumber: 'OP11-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] } },
    ],
  },
  // OP11-106 — [On Play] You may add 1 Life card (top/bottom) to hand: K.O. up to 1 opp Character cost<=5.
  { cardNumber: 'OP11-106', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP11-016 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP11-016', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
  // OP11-029 - [Blocker] [On Play] Rest up to 1 opponent Character with cost 1 or less.
  // Note: [Blocker] is an engine keyword flag. Only the on-play rest is templated.
  { cardNumber: 'OP11-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // OP11-048 - [On Play] Look at 4; add Firetank Pirates or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP11-048',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Firetank Pirates' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } }] },
  },
  // OP11-047 - [On Play] If Leader has The Vinsmoke Family, look at 5; add GERMA, trash rest.
  {
    cardNumber: 'OP11-047',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Vinsmoke Family' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'trash' }] },
  },
];
