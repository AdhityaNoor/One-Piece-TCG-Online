/**
 * Reviewed effect template assignments — Starter Deck ST10 (Heart Pirates / Law + Luffy + Kid, red/purple).
 *
 * A DON!! ramp / DON!!-return deck. Most cards are parameterization of existing templates
 * (DON!! −N cost, addDonFromDeck, koOpponentCharacter by power, addPowerControllerLeader, gates).
 * Two tiny reusable additions this pass: `opponentHand` gate (ST10-010) and `maxPower` on
 * moveToBottomDeck (ST10-001).
 *
 * DEFERRED (need engine capability not yet present):
 *   ST10-002 (leader) — "If you have 0 OR 8+ DON!! on your field": a disjunctive DON!!-count gate. NEW.
 *   ST10-004 Sanji — "If your opponent has a Character with 5000+ power, gains [Rush]": needs a
 *            gate reading a Character's live power (kept out to avoid a power<->gates import cycle). NEW.
 *   ST10-006 Luffy — "When your opponent activates a [Blocker], K.O. ...": reactive on-Blocker timing. NEW.
 *   ST10-007 / 011 / 014 — "When a DON!! card on your field is returned to your DON!! deck, ...":
 *            a reactive on-DON-returned timing (with [Once Per Turn]). NEW reactive family.
 *
 * ST10-010 / ST10-014's [Blocker] is card data.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST10_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST10-001 (leader) Law — [Activate: Main] [Once Per Turn] DON!! −3: Place up to 1 opponent
  //   Character with 3000 power or less at the bottom of the owner's deck, and play up to 1 Character (cost <=4) from hand.
  {
    cardNumber: 'ST10-001',
    templateId: 'ability',
    params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 3 }], functions: [{ fn: 'moveToBottomDeck', maxPower: 3000, target: 'opponent' }, { fn: 'playFromHand', filter: { maxCost: 4 } }] },
  },

  // ST10-003 (leader) Kid — [Your Turn] If you have 4 or more Life, −1000 self.
  //   [When Attacking] DON!! −1: +2000 self during this turn.
  {
    cardNumber: 'ST10-003',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: -1000, duration: 'permanent', condition: { turn: 'your', gate: [{ kind: 'selfLife', atLeast: 4 }] } }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },
    ],
  },

  // ST10-005 Jinbe — [DON!! x1] [When Attacking] Give up to 1 opponent Character −2000 power this turn.
  { cardNumber: 'ST10-005', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'modifyPowerOpponent', amount: -2000 }] } },

  // ST10-008 Shachi & Penguin — [On Play] If you have 3 or less DON!! on your field, add 2 DON!! and rest them.
  {
    cardNumber: 'ST10-008',
    templateId: 'ability',
    params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atMost: 3 }], functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }] },
  },

  // ST10-009 Jean Bart — [On Play] ➀ (rest 1 DON!!): Add 1 DON!! and set it active.
  {
    cardNumber: 'ST10-009',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] },
  },

  // ST10-010 Law — [Blocker] (card data) + [On Play] DON!! −1: If your opponent has 7+ cards in hand,
  //   trash 2 cards from your opponent's hand (opponent chooses).
  {
    cardNumber: 'ST10-010',
    templateId: 'ability',
    params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'opponentHand', atLeast: 7 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 2 }] },
  },

  // ST10-012 Bepo — [On Play]/[When Attacking] If your opponent has more DON!! than you, add 1 DON!! and rest it.
  {
    cardNumber: 'ST10-012',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'opponentDonMoreThanSelf' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },

  // ST10-013 Kid — [On Play]/[When Attacking] DON!! −1: Your Leader gains +1000 until the start of your next turn.
  {
    cardNumber: 'ST10-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerControllerLeader', amount: 1000, duration: 'untilStartOfNextTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerControllerLeader', amount: 1000, duration: 'untilStartOfNextTurn' }] } },
    ],
  },

  // ST10-015 (event) Gum-Gum Giant Sumo Slap — [Counter] Up to 1 of your Leader/Character +2000 during
  //   this battle, and K.O. up to 1 opponent Character with 2000 power or less.
  {
    cardNumber: 'ST10-015',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 2000, duration: 'duringThisBattle' }, { fn: 'koOpponentCharacter', filter: { maxPower: 2000 } }] },
  },

  // ST10-016 (event) Gum-Gum Kong Gatling — [Main] K.O. up to 1 opponent Character with 7000 power or less.
  //   [Trigger] Your Leader gains +1000 until the start of your next turn.
  {
    cardNumber: 'ST10-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'koOpponentCharacter', filter: { maxPower: 7000 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPowerControllerLeader', amount: 1000, duration: 'untilStartOfNextTurn' }] } },
    ],
  },

  // ST10-017 (event) Punk Vise — [Main] Rest up to 1 opponent Character (cost <=2), and add 1 DON!! (rested).
  //   [Trigger] Add 1 DON!! and set it active.
  {
    cardNumber: 'ST10-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'restOpponentCharacter', filter: { maxCost: 2 } }, { fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
];
