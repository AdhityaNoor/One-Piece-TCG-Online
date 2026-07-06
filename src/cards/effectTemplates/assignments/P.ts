/**
 * Reviewed effect template assignments — Promotional cards (P-xxx).
 */
import type { CardEffectAssignment } from '../assembler';

export const P_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (P expressible). ──
  // P-029 — [End of Your Turn] rest this: set up to 1 {FILM} Character active (exclude-[Bartolomeo] dropped).
  { cardNumber: 'P-029', templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'restThis' }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'FILM' } }] } },
  // P-030 — [On K.O.] Place up to 1 Character cost ≤3 at bottom of deck.
  { cardNumber: 'P-030', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
  // P-044 — [DON!! x1] If ≤4 hand, this Character +2000.
  { cardNumber: 'P-044', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfHand', atMost: 4 }] } }] } },
  // P-053 — [On Play] If ≤3 hand, return up to 1 opp Character cost ≤3 to hand.
  { cardNumber: 'P-053', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // P-073 — [Activate: Main][OPT] add 1 top/bottom Life to hand → this Character +1000 this turn.
  { cardNumber: 'P-073', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
  // P-075 — [On Play] give up to 1 rested DON!! to Leader/1 Char. [When Attacking] if you have a cost-8+ Character, draw 1 trash 1.
  {
    cardNumber: 'P-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },
  // P-083 — [DON!! x1][When Attacking] trash 1 (Character filter dropped) → give up to 1 opp Character −1000, then draw 1.
  { cardNumber: 'P-083', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
  // P-105 — [On Play] add 1 top/bottom Life to hand → give up to 1 rested DON!! to Leader/1 Char. PARTIAL: static [Blocker]/+4 cost deferred.
  { cardNumber: 'P-105', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },

  // P-063 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  { cardNumber: 'P-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },
  // P-069 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'P-069', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
];
