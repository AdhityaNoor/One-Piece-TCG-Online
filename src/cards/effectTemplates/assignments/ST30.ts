/**
 * Reviewed effect template assignments - Starter Deck ST30.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST30_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST30-001 (leader) Luffy & Ace —
  //   If you have a Character with 7000 base power or more, give this Leader −2000 power.[Opponent's Turn]
  //   All of your [Portgas.D.Ace] and [Monkey.D.Luffy] cards gain +3000 power.
  {
    cardNumber: 'ST30-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: -2000, duration: 'permanent', condition: { gate: [{ kind: 'selfHasCharacterBasePowerAtLeast', power: 7000 }] } }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerTypes', amount: 3000, duration: 'permanent', anyOfNames: ['Portgas.D.Ace', 'Monkey.D.Luffy'], sourceCondition: { turn: 'opponent' } }] } },
    ],
  },

  // ST30-002 - [On Play] Look at 5; add Character card with exactly 6000 power.
  {
    cardNumber: 'ST30-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 } }] },
  },

  // ST30-004 — [On Play] reveal 2 Characters with 6000 power from hand: draw 3 and trash 2.
  { cardNumber: 'ST30-004', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 6000, atLeast: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },

  // ST30-006 — [On Play] trash 1 Character with 6000 power from hand: draw 2.
  { cardNumber: 'ST30-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', exactPower: 6000 }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },

  // ST30-003 — [Your Turn] all Characters with 6000 base power +1000.
  { cardNumber: 'ST30-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'permanent', targetCondition: { exactBasePower: 6000 }, sourceCondition: { turn: 'your' } }] } },

  // ST30-004 (character) Emporio.Ivankov —
  //   [On Play] You may reveal 2 Character cards with 6000 power from your hand: Draw 3 cards and trash 2
  //   cards from your hand.
  // NOTE: not yet implemented (needs template).

  // ST30-006 (character) Jinbe —
  //   [On Play] You may trash 1 Character card with 6000 power from your hand: Draw 2 cards.
  // NOTE: not yet implemented (needs template).

  // ── Triage batch (ST30 expressible). "reveal 6000-power Char from hand" costs and self/named power gates deferred. ──
  // ST30-007 — [On Play] rest 1 DON!!: this gains [Rush] this turn. [When Attacking] give up to 1 opp Character −1000.
  {
    cardNumber: 'ST30-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // --- codegen batch ---
  { cardNumber: 'ST30-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 1 }] } },

  // ST30-008 — [On K.O.] trash 6000-power Character from hand → play this from trash rested.
  { cardNumber: 'ST30-008', templateId: 'ability', params: { timing: 'onKO', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', exactPower: 6000 }, optional: true },
    { fn: 'playFromTrash', filter: { name: 'Marco' }, rested: true, ifPrevious: 'previousMovedAny' },
  ] } },

  {
    cardNumber: 'ST30-009',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
        effectSourceController: 'opponent',
        targetCondition: { exactBasePower: 6000 },
        trashSelfAndDraw: { amount: 1 },
        duration: 'permanent',
      }],
    },
  },


  {
    cardNumber: 'ST30-011',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
        effectSourceController: 'opponent',
        targetCondition: { exactBasePower: 6000 },
        restSource: true,
        duration: 'permanent',
      }],
    },
  },

  // ST30-012 — [On Play] rest 1 DON!!: this gains [Rush] this turn. [When Attacking] rest up to 1 opp [Blocker] Character.
  {
    cardNumber: 'ST30-012',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { hasBlocker: true } }, optional: true }] } },
    ],
  },

  // ST30-014 — PARTIAL: 6000 base power target filter on giveDon deferred; rest this → give 2 DON!! mapped.
  { cardNumber: 'ST30-014', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'giveDon', count: 2 }] } },

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

];
