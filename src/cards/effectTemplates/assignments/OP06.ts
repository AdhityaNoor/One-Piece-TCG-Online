/**
 * Reviewed effect template assignments - Main Booster OP06.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP06_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP06-098 — [Activate: Main] Rest 1 DON!! + rest this Stage: if Leader {Thriller Bark Pirates}, play {Thriller Bark} cost<=2 from trash rested.
  { cardNumber: 'OP06-098', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] } },

  // OP06-112 — [When Attacking] You may trash 1 from hand: rest opp DON!!. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-112',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'restOpponentDon', maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // --- Batch: OP06 cards expressible with existing primitives (no new capability) ---

  // OP06-061 — [On Play] If your DON!! ≤ opponent's, give opp Character −2000 and this Character gains [Rush].
  { cardNumber: 'OP06-061', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
  ] } },
  // OP06-069 — [On Play] If your DON!! ≤ opponent's and you have 5 or less cards in hand, draw 2.
  { cardNumber: 'OP06-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] } },
  // OP06-077 — [Main] If your DON!! ≤ opponent's, place opp Character cost<=5 at bottom of deck. [Trigger] opp Character cost<=4.
  {
    cardNumber: 'OP06-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP06-013 — [On Play] Look at 3; reveal up to 1 {FILM} card, add to hand, rest to bottom. [Trigger] Activate [On Play].
  {
    cardNumber: 'OP06-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
    ],
  },
  // OP06-027 — [On K.O.] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP06-027', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP06-036 — [On Play]/[On K.O.] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less.
  {
    cardNumber: 'OP06-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP06-040 — [Main] K.O. up to 2 of your opponent's rested Characters with a cost of 3 or less. [Trigger] same.
  {
    cardNumber: 'OP06-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
    ],
  },
  // OP06-046 — [On Play] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP06-053 — [On K.O.] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-053', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // OP06-056 — [Main] Place up to 1 opp Character cost<=2 and up to 1 opp Character cost<=1 at bottom of deck. [Trigger] same.
  {
    cardNumber: 'OP06-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
    ],
  },
  // OP06-058 — [Main] Place up to 2 Characters cost<=6 at bottom of deck. [Trigger] Place up to 1 Character cost<=5.
  {
    cardNumber: 'OP06-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },
  // OP06-075 — [On Play] DON!! −1: Rest up to 2 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'OP06-075', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },
  // OP06-078 — [Main] Look at 5; reveal up to 1 GERMA-type (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP06-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP06-084 — [On K.O.] Up to 1 of your Leader or Character cards gains +1000 power during this turn.
  { cardNumber: 'OP06-084', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  // OP06-089 — [On Play]/[On K.O.] Trash 3 cards from the top of your deck.
  {
    cardNumber: 'OP06-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
    ],
  },
  // OP06-097 — [Main] Trash 1 card from your opponent's hand. [Trigger] same.
  {
    cardNumber: 'OP06-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },
  // OP06-101 — [On Play] Up to 1 of your Leader or Character gains [Banish] this turn. [Trigger] K.O. up to 1 opp Character cost<=5.
  {
    cardNumber: 'OP06-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller' }, keyword: 'banish', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },
  // OP06-108 — [Trigger] Up to 1 of your {Land of Wano} Leader or Character gains +2000 power during this turn.
  { cardNumber: 'OP06-108', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP06-007 — [On Play] K.O. up to 1 of your opponent's Characters with 10000 power or less.
  { cardNumber: 'OP06-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 10000 } }, optional: true }] } },
  // OP06-019 - [Main] K.O. power <=5000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'OP06-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },
  // OP06-050 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP06-050',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },
  // OP06-025 - [On Play] Look at 4; add Fish-Man or Merfolk other than this card's name.
  {
    cardNumber: 'OP06-025',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], excludeSelfName: true } }] },
  },
];
