/**
 * Reviewed effect template assignments — Starter Deck ST04 (Animal Kingdom Pirates, purple / Kaido).
 *
 * A DON!! −N deck: almost every card is parameterization of existing templates
 * (donMinus cost + K.O. / draw / ramp / play-from-hand). The one NEW capability is
 * generic `moveCards` from opponent Life to owner trash (ST04-001 Kaido leader).
 *
 * KNOWN LIMITATION: "Trash up to 1 of your opponent's Life cards" is taken as trashing the
 * TOP Life card (Life is face-down, so there is nothing to choose); the "up to" opt-out is
 * auto-taken (it is pure advantage for the controller).
 *
 * Vanilla / keyword-only (no runtime program): ST04-007 Sheepshead, ST04-009 Ginrummy,
 *   ST04-011 Black Maria ([Blocker] = card data), ST04-012 Page One, ST04-013 X.Drake.
 *   ST04-005's [Blocker] is also card data; only its [On Play] ability is here.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST04_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST04-001 (leader) Kaido — [Activate: Main] [Once Per Turn] DON!! −7: Trash up to 1 of your
  //   opponent's Life cards.
  {
    cardNumber: 'ST04-001',
    templateId: 'ability',
    params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 7 }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] },
  },

  // ST04-002 Ulti — [On Play] DON!! −1: Play up to 1 [Page One] card with a cost of 4 or less from your hand.
  {
    cardNumber: 'ST04-002',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { name: 'Page One', maxCost: 4 } }] },
  },

  // ST04-003 Kaido — [On Play] DON!! −5: K.O. up to 1 opponent Character cost <=6. This Character gains [Rush] this turn.
  {
    cardNumber: 'ST04-003',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 5 }], functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 6 } }, { fn: 'addKeywordSelf', keyword: 'rush', duration: 'duringThisTurn' }] },
  },

  // ST04-004 King — [On Play] DON!! −1: K.O. up to 1 opponent Character cost <=4.
  {
    cardNumber: 'ST04-004',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 4 } }] },
  },

  // ST04-005 Queen — [Blocker] (card data) + [On Play] DON!! −1: Draw 2 and trash 1 from hand.
  {
    cardNumber: 'ST04-005',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] },
  },

  // ST04-006 Sasaki — [On Play] DON!! −1: Draw 1.
  {
    cardNumber: 'ST04-006',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] },
  },

  // ST04-008 Jack — [On Play] You may trash 1 card from your hand: Add 1 DON!! from your DON!! deck and set it active.
  {
    cardNumber: 'ST04-008',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' }] },
  },

  // ST04-010 Who's-Who — [On Play] DON!! −1: K.O. up to 1 opponent Character cost <=3. [Trigger] Play this card.
  {
    cardNumber: 'ST04-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ST04-014 (event) Lead Performer "Disaster" — [Main] Draw 1, then add 1 DON!! (active). [Trigger] same.
  {
    cardNumber: 'ST04-014',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 1 }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // ST04-015 (event) Brachio Bomber — [Main] K.O. up to 1 opponent Character cost <=6, then add 1 DON!! (active).
  //   [Trigger] Add 1 DON!! (active).
  {
    cardNumber: 'ST04-015',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 6 } }, { fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // ST04-016 (event) Blast Breath — [Counter] DON!! −1: Up to 1 of your Leader/Character +4000 during this battle.
  {
    cardNumber: 'ST04-016',
    templateId: 'ability',
    params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerController', amount: 4000, duration: 'duringThisBattle' }] },
  },

  // ST04-017 (stage) Onigashima Island — [Activate: Main] rest this Stage: If your Leader has the
  //   {Animal Kingdom Pirates} type, add 1 DON!! from your DON!! deck and rest it.
  {
    cardNumber: 'ST04-017',
    templateId: 'ability',
    params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] },
  },
];
