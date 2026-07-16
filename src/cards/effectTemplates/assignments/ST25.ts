/**
 * Reviewed effect template assignments - Starter Deck ST25 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST25_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST25-001 — [On Play] If Leader [Buggy], draw 3, trash 2. PARTIAL: static typed-count +1 cost deferred.
  { cardNumber: 'ST25-001', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Buggy' }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },

  // ST25-002 — Closed 2026-07-16: [Opponent's Turn] this Character +5000; static 2+ cost-5 Characters -> [Blocker] + cost via self-named aura fns.
  { cardNumber: 'ST25-002', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
    { fn: 'addPowerSelf', amount: 5000, duration: 'permanent', condition: { turn: 'opponent' } },
    { fn: 'addKeywordAuraControllerCharacters', keyword: 'blocker', duration: 'permanent', anyOfNames: ['Cabaji'], gate: [{ kind: 'selfCharacterBaseCostCount', minBaseCost: 5, atLeast: 2 }] },
    { fn: 'addCostAuraControllerCharacters', amount: 1, duration: 'permanent', anyOfNames: ['Cabaji'], gate: [{ kind: 'selfCharacterBaseCostCount', minBaseCost: 5, atLeast: 2 }] },
  ] } },

  // ST25-003 — Closed 2026-07-16 field-removal replacement pass: [On Play] Draw 2, trash 1, then play up to 1
  // {Cross Guild} cost ≤4 from hand, plus the {Cross Guild} field-removal replacement (trash 1 from hand, OPT)
  // via registerKoReplacementAura.
  { cardNumber: 'ST25-003', templates: [
    { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', maxCost: 4 } }] } },
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', oncePerTurn: true, replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', anyOfTypes: ['Cross Guild'], trashFromHand: { count: 1 }, duration: 'permanent' }] } },
  ] },

  // ST25-004 — [Activate: Main] trash 1 + trash this: if Leader [Buggy], play {Cross Guild} cost≤6.
  { cardNumber: 'ST25-004', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', maxCost: 6 }, ifGate: [{ kind: 'leaderName', name: 'Buggy' }], ifPrevious: 'previousMovedAny' },
  ] } },

  // ST25-005 — Closed 2026-07-16: [On K.O.] If Leader [Buggy] and ≤3 hand, draw 1; static 2+ cost-5 Characters -> [Blocker] + cost via self-named aura fns.
  { cardNumber: 'ST25-005', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
      { fn: 'addKeywordAuraControllerCharacters', keyword: 'blocker', duration: 'permanent', anyOfNames: ['Mohji'], gate: [{ kind: 'selfCharacterBaseCostCount', minBaseCost: 5, atLeast: 2 }] },
      { fn: 'addCostAuraControllerCharacters', amount: 1, duration: 'permanent', anyOfNames: ['Mohji'], gate: [{ kind: 'selfCharacterBaseCostCount', minBaseCost: 5, atLeast: 2 }] },
    ] } },
    { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderName', name: 'Buggy' }, { kind: 'selfHand', atMost: 3 }], functions: [{ fn: 'draw', amount: 1 }] } },
  ] },
];
