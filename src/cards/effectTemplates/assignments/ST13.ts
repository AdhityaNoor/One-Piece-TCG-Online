/**
 * Reviewed effect template assignments — Starter Deck ST13 (Sabo/Ace/Luffy, red/yellow).
 *
 * A Life-matters deck. Most cards manipulate the Life area in ways that are still being built out
 * (reorder-all-Life, reveal-top-Life-then-play, add-hand/deck-to-Life-face-up). This file covers the
 * subset expressible with existing abstractions; the Life-reorder / reveal-and-play-from-Life family
 * is DEFERRED (ST13-001..007, 009, 010, 012, 014, 016 and the Life riders on the events).
 *
 * PARTIAL: ST13-017 / ST13-018 [Counter] — the power boost is implemented; the "Then, reorder all your
 *   Life" / "if 0 Life draw 1" rider and the Life-swap [Trigger] are deferred.
 */
import type { CardEffectAssignment } from '../assembler';

const SEARCH_BROTHERS = {
  fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand',
  filter: { anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }], maxCost: 5 },
} as const;

export const ST13_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST13-001 — PARTIAL: 7000 power filter on Life-add deferred; mapped char→Life face-up + +2000.
  { cardNumber: 'ST13-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { minCost: 3 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true },
    { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // ST13-002 — PARTIAL: face-up Life + EOT trash face-up Life deferred; mapped search cost-5 Character to Life top.
  {
    cardNumber: 'ST13-002',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      condition: { donAttachedAtLeast: 2 },
      functions: [{
        fn: 'searchTopDeck',
        look: 5,
        pick: 1,
        reveal: true,
        destination: 'lifeTop',
        filter: { category: 'character', exactCost: 5 },
        remainder: 'bottom',
      }],
    },
  },

  // ST13-003 (leader) Monkey.D.Luffy —
  //   Your face-up Life cards are placed at the bottom of your deck instead of being added to your hand,
  //   according to the rules.[DON!! x2] [Activate: Main] [Once Per Turn] You may trash 1 card from your
  //   hand: If you have 0 Life cards, add up to 2 Character cards with a cost of 5 from your hand or trash
  //   to the top of your Life cards face-up.
  // ST13-003 — PARTIAL: face-up Life-to-deck-bottom replacement rule deferred.
  //   [Activate: Main] trash 1 from hand: if 0 Life, add up to 2 cost-5 Characters from hand or trash to Life top face-up.
  {
    cardNumber: 'ST13-003',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      condition: { donAttachedAtLeast: 2 },
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        {
          fn: 'chooseOne',
          chooser: 'controller',
          prompt: 'Add Characters from:',
          ifGate: [{ kind: 'selfLife', atMost: 0 }],
          ifPrevious: 'previousMovedAny',
          options: [
            { label: 'fromHand', functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { category: 'character', exactCost: 5 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, maxTargets: 2 }] },
            { label: 'fromTrash', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', exactCost: 5 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, maxTargets: 2 }] },
          ],
        },
      ],
    },
  },

  // ST13-004 (character) Edward.Newgate —
  //   [On Play] Add 1 card from the top of your deck to the top of your Life cards. Then, look at all your
  //   Life cards; place 1 card at the top of your deck and place the rest back in your Life area in any
  //   order.
  { cardNumber: 'ST13-004', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' } },
    { fn: 'lookLifeAndReorder', moveOneToDeckTop: true },
  ] } },

  // ST13-005 — PARTIAL: reveal-from-hand semantics approximated via filtered hand→Life face-down move.
  {
    cardNumber: 'ST13-005',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'trash', player: 'owner' }, optional: true },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { category: 'character', exactCost: 5 } }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST13-006 — [Blocker][On Play] play up to 1 each of [Sabo], [Portgas.D.Ace], [Monkey.D.Luffy] with cost 2 from hand.
  { cardNumber: 'ST13-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Sabo', exactCost: 2 } }, { fn: 'playFromHand', filter: { category: 'character', name: 'Portgas.D.Ace', exactCost: 2 } }, { fn: 'playFromHand', filter: { category: 'character', name: 'Monkey.D.Luffy', exactCost: 2 } }] } },

  // ST13-007 — PARTIAL: reveal-top-Life-then-play chain deferred; mapped trash-self → turn top Life face-up → play matching Character → Leader +2000.
  {
    cardNumber: 'ST13-007',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'trashThis' }],
      functions: [
        { fn: 'turnTopLifeFace', faceUp: true },
        { fn: 'playFromHand', filter: { category: 'character', name: 'Sabo', exactCost: 5 }, optional: true, ifPrevious: 'previousSelectedAny' },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST13-008 Sabo — [On Play] You may trash 1 from the top/bottom of your Life: K.O. up to 1 opponent Character cost <=5.
  {
    cardNumber: 'ST13-008',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'trash', player: 'owner' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, ifPrevious: 'previousMovedAny', optional: true }] },
  },

  // ST13-009 — PARTIAL: "face-up Life" gate not modeled; turn-top-face-down + opp-hand gate mapped.
  {
    cardNumber: 'ST13-009',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'turnTopLifeFace', faceUp: false },
        { fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' }, optional: true, ifPrevious: 'previousSelectedAny', ifGate: [{ kind: 'opponentHand', atLeast: 7 }] },
      ],
    },
  },

  // ST13-010 — PARTIAL: reveal-top-Life-then-play chain deferred; mapped trash-self → turn top Life face-up → play matching Character → Leader +2000.
  {
    cardNumber: 'ST13-010',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'trashThis' }],
      functions: [
        { fn: 'turnTopLifeFace', faceUp: true },
        { fn: 'playFromHand', filter: { category: 'character', name: 'Portgas.D.Ace', exactCost: 5 }, optional: true, ifPrevious: 'previousSelectedAny' },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST13-011 Ace — [On Play] If you have 2 or less Life cards, this Character gains [Rush].
  {
    cardNumber: 'ST13-011',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] },
  },

  // ST13-012 (character) Makino —
  //   [On Play] You may add 1 card from the top or bottom of your Life cards to your hand: Look at all of
  //   your Life cards and place them back in your Life area in any order.
  { cardNumber: 'ST13-012', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'lookLifeAndReorder', ifPrevious: 'previousMovedAny' },
  ] } },

  // ST13-013 — [On Play] Look at 5; add [Sabo]/[Ace]/[Luffy] with cost 5 or less to hand.
  { cardNumber: 'ST13-013', templateId: 'ability', params: { timing: 'onPlay', functions: [SEARCH_BROTHERS] } },

  // ST13-014 — PARTIAL: reveal-top-Life-then-play chain deferred; mapped trash-self → turn top Life face-up → play matching Character → Leader +2000.
  {
    cardNumber: 'ST13-014',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'trashThis' }],
      functions: [
        { fn: 'turnTopLifeFace', faceUp: true },
        { fn: 'playFromHand', filter: { category: 'character', name: 'Monkey.D.Luffy', exactCost: 5 }, optional: true, ifPrevious: 'previousSelectedAny' },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'untilStartOfNextTurn', optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST13-015 — [Activate: Main][OPT] this Character +2000 until start of next turn, then if 1+ Life draw 1.
  //   PARTIAL: the "trash 1 from top of your Life" drawback needs a controller-Life-to-trash op (deferred).
  { cardNumber: 'ST13-015', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn' }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfLife', atLeast: 1 }] }] } },

  // ST13-016 (character) Yamato —
  //   [Rush] (This card can attack on the turn in which it is played.)[On Play] Look at all your Life
  //   cards; place 1 at the top of your deck and place the rest back in your Life area in any order.
  {
    cardNumber: 'ST13-016',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'lookLifeAndReorder', moveOneToDeckTop: true }] } },
    ],
  },

  // ST13-017 (event) Flame Dragon King — [Counter] Up to 1 of your Leader/Character +4000 this battle. (Life reorder + Trigger deferred.)
  {
    cardNumber: 'ST13-017',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] },
  },

  // ST13-018 (event) Gum-Gum Jet Spear — [Counter] Up to 1 of your Leader/Character +2000 this battle. (0-Life draw + Trigger deferred.)
  {
    cardNumber: 'ST13-018',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] },
  },

  // ST13-019 (event) The Three Brothers' Bond — [Main] Look at 5; add [Sabo]/[Ace]/[Luffy] cost <=5 to hand.
  //   [Trigger] Activate this card's [Main] effect.
  {
    cardNumber: 'ST13-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [SEARCH_BROTHERS] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [SEARCH_BROTHERS] } },
    ],
  },
];
