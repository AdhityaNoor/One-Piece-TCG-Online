/**
 * Reviewed effect template assignments — Starter Deck ST09 (Land of Wano / Yamato, yellow).
 *
 * A yellow Life-manipulation deck. Almost every card is now PURE parameterization of existing
 * templates — evidence the effect language covers this archetype: static conditional self buffs
 * gated on Life count and generic moveCards compositions for Life/deck movement.
 *
 * DEFERRED (need engine capability not yet present):
 *   ST09-010 Ace — "If this would be K.O.'d, trash 1 Life instead": a K.O. REPLACEMENT effect. NEW.
 *   ST09-015 (event, rider) — "add an opponent's Character to the top/bottom of the owner's Life
 *            face-up": opponent-Character-to-Life. NEW (the +4000 Counter + draw Trigger ARE below).
 *
 * PARTIAL: ST09-002 / ST09-009 [Trigger] cards — the rest/K.O. effect is implemented, but the
 *   "and add this card to your hand" clause (trigger returns to hand instead of trashing) is not
 *   yet modeled and is omitted.
 *
 * Vanilla: ST09-003 Ulti, ST09-006 Momonosuke, ST09-011 Luffy, ST09-013 Yamato.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST09_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST09-001 (leader) Yamato — [DON!! x1] [Opponent's Turn] If you have 2 or less Life, +1000.
  {
    cardNumber: 'ST09-001',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'opponent', gate: [{ kind: 'selfLife', atMost: 2 }] } }] },
  },

  // ST09-002 Uzuki Tempura — [Trigger] Rest up to 1 opponent Character cost <=2 (and add this card
  //   to your hand — the return-to-hand clause is not yet modeled).
  { cardNumber: 'ST09-002', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'restOpponentCharacter', filter: { maxCost: 2 } }] } },

  // ST09-004 Kaido — [DON!! x1] If you have 2 or less Life, this Character cannot be K.O.'d in battle.
  {
    cardNumber: 'ST09-004',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfLife', atMost: 2 }] } }] },
  },

  // ST09-005 Kouzuki Oden — [DON!! x1] gains [Double Attack]. [On K.O.] You may trash 2 cards from
  //   your hand: Add up to 1 card from the top of your deck to the top of your Life cards.
  {
    cardNumber: 'ST09-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeywordSelf', keyword: 'doubleAttack', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // ST09-007 Shinobu — [Blocker] (card data) + [On Block] You may add 1 card from the top or bottom
  //   of your Life cards to your hand: This Character gains +4000 power during this battle.
  {
    cardNumber: 'ST09-007',
    templateId: 'ability',
    params: { timing: 'onBlock', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 4000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' }] },
  },

  // ST09-008 Shimotsuki Ushimaru — [DON!! x1] [When Attacking] You may add 1 top/bottom Life to hand:
  //   Play up to 1 yellow {Land of Wano} Character with a cost of 4 or less from your hand.
  {
    cardNumber: 'ST09-008',
    templateId: 'ability',
    params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'playFromHand', filter: { color: 'yellow', typeIncludes: 'Land of Wano', maxCost: 4 }, ifPrevious: 'previousMovedAny' }] },
  },

  // ST09-012 Yamato — [When Attacking] You may add 1 top/bottom Life to hand: +2000 until the start of your next turn.
  {
    cardNumber: 'ST09-012',
    templateId: 'ability',
    params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn', ifPrevious: 'previousMovedAny' }] },
  },

  // ST09-009 Fugetsu Omusubi — [Trigger] K.O. up to 1 opponent Character cost <=1 (add-to-hand clause omitted).
  { cardNumber: 'ST09-009', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 1 } }] } },

  // ST09-014 (event) Narikabura Arrow — [Counter] If you have 2 or less Life, give up to 1 opponent
  //   Leader/Character −3000 power this turn. [Trigger] You may trash 2: add top of deck to top of Life.
  {
    cardNumber: 'ST09-014',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'modifyPowerOpponentLeaderOrCharacter', amount: -3000, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, ifPrevious: 'previousMovedAny' }] } },
    ],
  },
];
