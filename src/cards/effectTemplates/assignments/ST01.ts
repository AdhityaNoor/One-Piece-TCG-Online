/**
 * Reviewed effect template assignments — Starter Deck ST01 (Straw Hat Crew).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST01-001 (leader) — activateMainGiveDon ✓ ... wait, actually covered below.
 *     ST01-002 — [Trigger] Play this card: needs triggerPlaySelf op (TODO).
 *     ST01-012 — multi-ability ([Rush] + [DON!! x2] block suppression): needs
 *                blockSuppression op (TODO).
 *     ST01-016 (event) — complex blocker suppression + trigger: TODO.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST01_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST01-001 (leader) — [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST01-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // ST01-007 — [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'ST01-007', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // ST01-011 — [On Play] Give up to 2 rested DON!! cards to your Leader or 1 of your Characters.
  { cardNumber: 'ST01-011', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },

  // ST01-012 - [DON!! x2] [When Attacking] opponent cannot activate [Blocker] during this battle. [Rush] is static card data.
  { cardNumber: 'ST01-012', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle' }] } },

  // ST01-005 - [DON!! x1] [When Attacking] Give another Leader/Character +1000 power.
  { cardNumber: 'ST01-005', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPowerController', amount: 1000, duration: 'duringThisTurn', filter: { excludeSelf: true } }] } },

  // ST01-013 — [DON!! x1] Permanent +1000 power when ≥1 DON!! attached.
  { cardNumber: 'ST01-013', templateId: 'ability', params: { timing: 'onEnterPlay', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent' }] } },

  // ST01-014 - [Counter] +3000 to Leader/Character. [Trigger] +1000 to Leader/Character.
  {
    cardNumber: 'ST01-014',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 3000, duration: 'duringThisBattle' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPowerController', amount: 1000, duration: 'duringThisTurn' }] } },
    ],
  },

  // ST01-015 - [Main] K.O. power <=6000. [Trigger] activates the same Main effect.
  {
    cardNumber: 'ST01-015',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'koOpponentCharacter', filter: { maxPower: 6000 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'koOpponentCharacter', filter: { maxPower: 6000 } }] } },
    ],
  },

  // ST01-016 - [Main] selected Straw Hat Crew Leader/Character cannot be blocked this turn; [Trigger] K.O. blocker cost <=3.
  {
    cardNumber: 'ST01-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn', target: 'chosenControllerLeaderOrCharacter', filter: { typeIncludes: 'Straw Hat Crew' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'koOpponentCharacter', filter: { hasBlocker: true, maxCost: 3 } }] } },
    ],
  },

  // ST01-017 - [Activate: Main] Rest this Stage: give Straw Hat Crew Leader/Character +1000.
  { cardNumber: 'ST01-017', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPowerController', amount: 1000, duration: 'duringThisTurn', filter: { typeIncludes: 'Straw Hat Crew' } }] } },
];
