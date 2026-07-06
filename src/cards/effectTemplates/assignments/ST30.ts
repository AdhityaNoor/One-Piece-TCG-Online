/**
 * Reviewed effect template assignments - Starter Deck ST30.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST30_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (ST30 expressible). "reveal 6000-power Char from hand" costs and self/named power gates deferred. ──
  // ST30-007 — [On Play] rest 1 DON!!: this gains [Rush] this turn. [When Attacking] give up to 1 opp Character −1000.
  {
    cardNumber: 'ST30-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // ST30-012 — [On Play] rest 1 DON!!: this gains [Rush] this turn. [When Attacking] rest up to 1 opp [Blocker] Character.
  {
    cardNumber: 'ST30-012',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { hasBlocker: true } }, optional: true }] } },
    ],
  },
  // ST30-015 — [Trigger] K.O. up to 1 opp Character 6000 power or less. PARTIAL: the power-count-gated [Counter] buff is deferred.
  { cardNumber: 'ST30-015', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },
  // ST30-016 — [Counter] up to 1 Leader/Char +3000 this battle. PARTIAL: named+power draw rider deferred.
  { cardNumber: 'ST30-016', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
  // ST30-017 — [Main]/[Trigger] Look 5, reveal up to 1 Character with 6000 power to hand, rest to bottom.
  {
    cardNumber: 'ST30-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 }, remainder: 'bottom' }] } },
    ],
  },

  // ST30-002 - [On Play] Look at 5; add Character card with exactly 6000 power.
  {
    cardNumber: 'ST30-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 } }] },
  },
];
