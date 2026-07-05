/**
 * Reviewed effect template assignments - Main Booster OP08.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP08_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP08-034 — [On Play] Look at 5; add up to 1 Minks (excl. same name).
  {
    cardNumber: 'OP08-034',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Minks', excludeSelfName: true } }] },
  },
  // OP08-080 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP08-080',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } }] },
  },
  // OP08-015 - [On Play] Look at 4; add [Tony Tony.Chopper] or Drum Kingdom other than this card's name.
  {
    cardNumber: 'OP08-015',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Tony Tony.Chopper' }, { typeIncludes: 'Drum Kingdom' }], excludeSelfName: true } }] },
  },
  // OP08-087 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −1 cost.
  // Note: [Blocker] is an engine keyword flag, not an IR ability. Only the activate effect is templated.
  {
    cardNumber: 'OP08-087',
    templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] },
  },
];
