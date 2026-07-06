/**
 * Reviewed effect template assignments - Main Booster OP10.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP10_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP10-090 — [Blocker] [On K.O.] Play up to 1 {Dressrosa} Character cost<=3 from your trash rested.
  { cardNumber: 'OP10-090', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Dressrosa', maxCost: 3 }, rested: true }] } },

  // OP10-075 — [Activate: Main] Trash this: if your DON!! <= opponent's, draw 1.
  { cardNumber: 'OP10-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }] } },
  // OP10-093 — [Activate: Main] Trash this: up to 1 of your black Characters gains +3 cost until end of opp next turn.
  { cardNumber: 'OP10-093', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { color: 'black' } }, amount: 3, duration: 'endOfOpponentsTurn', optional: true }] } },
  // OP10-076 — [On Play] You may trash 1 from hand: if Leader {Donquixote Pirates}, add 1 DON!! from deck and set it active.
  { cardNumber: 'OP10-076', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' },
  ] } },

  // --- Batch: OP10 expressible with existing primitives (+ rested-char gate) ---

  // OP10-006 — [On Play] Search [Smiley] to hand, rest to bottom.
  { cardNumber: 'OP10-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Smiley' }, remainder: 'bottom' }] } },
  // OP10-007 — [On Play] Play up to 1 {Punk Hazard} Character with a cost of 2 or less from your hand.
  { cardNumber: 'OP10-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Punk Hazard', maxCost: 2 } }] } },
  // OP10-009 — [On Play] If Leader {Punk Hazard}, give up to 1 opp Character −3000 during this turn.
  { cardNumber: 'OP10-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Punk Hazard' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
  // OP10-015 — [On Play] Give up to 1 opp Character −1000 during this turn.
  { cardNumber: 'OP10-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
  // OP10-020 — [Main] Give opp Character −4000; if 2 or less Life, +1000 to a Leader/Character. [Trigger] K.O. opp power<=3000.
  {
    cardNumber: 'OP10-020',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true }] } },
    ],
  },
  // OP10-023 — [On Play] If Leader {Navy}, rest up to 2 opp Characters cost<=5.
  { cardNumber: 'OP10-023', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, maxTargets: 2 }] } },
  // OP10-024 — [On Play] If 2+ rested Characters, rest opp cost<=5, then K.O. opp rested cost<=3.
  { cardNumber: 'OP10-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true },
  ] } },
  // OP10-025 — [On Play] If 2+ rested Characters, draw 3 & trash 2.
  { cardNumber: 'OP10-025', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
  // OP10-029 — [On Play] If 2+ rested Characters, set up to 1 rested {ODYSSEY} Character cost<=5 as active.
  { cardNumber: 'OP10-029', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'ODYSSEY', rested: true, maxCost: 5 } }] } },
  // OP10-039 — [Main] If Leader {ODYSSEY}, search up to 2 {ODYSSEY} Characters. [Trigger] Rest opp cost<=5.
  {
    cardNumber: 'OP10-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'ODYSSEY' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'ODYSSEY' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },
  // OP10-041 — [Main] Rest opp cost<=6, then K.O. opp rested cost<=5. [Trigger] Rest opp cost<=4.
  {
    cardNumber: 'OP10-041',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP10-045 — [When Attacking] [OPT] Draw 2 & trash 1.
  { cardNumber: 'OP10-045', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP10-046 — [On Play] Return up to 1 Character with a cost of 5 or less to the owner's hand.
  { cardNumber: 'OP10-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP10-051 — [DON!! x1] [When Attacking] Search up to 1 {Revolutionary Army} Character.
  { cardNumber: 'OP10-051', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Revolutionary Army' }, remainder: 'bottom' }] } },
  // OP10-059 — [Main] Search {Dressrosa} Character. [Trigger] same.
  {
    cardNumber: 'OP10-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Dressrosa' }, remainder: 'bottom' }] } },
    ],
  },
  // OP10-060 — [Main] Place opp Character power<=6000 at bottom of deck. [Trigger] same.
  {
    cardNumber: 'OP10-060',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },
  // OP10-061 — [Main] Draw 1, then return opp cost<=2 to hand. [Trigger] Return Character cost<=2 to hand.
  {
    cardNumber: 'OP10-061',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP10-078 — [Main]/[Counter] Search {Donquixote Pirates} (excl. self).
  {
    cardNumber: 'OP10-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates', excludeSelfName: true }, remainder: 'bottom' }] } },
    ],
  },
  // OP10-079 — [Main] K.O. opp cost<=5, then add 1 DON!! active. [Trigger] Add 1 DON!! active.
  {
    cardNumber: 'OP10-079',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
        { fn: 'addDonFromDeck', count: 1, rested: false },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP10-102 — [Activate: Main] [OPT] Up to 3 {Revolutionary Army} Characters +1000, then add top Life card to hand.
  { cardNumber: 'OP10-102', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP10-004 — [On Play] Look at 5; add up to 1 Punk Hazard (excl. same name).
  {
    cardNumber: 'OP10-004',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Punk Hazard', excludeSelfName: true } }] },
  },
  // OP10-111 — [On Play] Look at 5; add up to 1 Supernovas (excl. same name).
  {
    cardNumber: 'OP10-111',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas', excludeSelfName: true } }] },
  },
];
