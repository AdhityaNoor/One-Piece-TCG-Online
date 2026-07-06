/**
 * Reviewed effect template assignments - Starter Deck ST18.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST18_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (ST18 expressible) — 8+ DON!! payoff Character effects. ──
  { cardNumber: 'ST18-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
  { cardNumber: 'ST18-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'draw', amount: 2 }] } },
  { cardNumber: 'ST18-003', templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'draw', amount: 1 }] } },
  { cardNumber: 'ST18-005', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'purple', typeIncludes: 'Straw Hat Crew', maxCost: 5 } }] } },

  // ST18-004 - [On Play] Look at 5; add purple Straw Hat Crew.
  {
    cardNumber: 'ST18-004',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'purple', typeIncludes: 'Straw Hat Crew' } }] },
  },
];
