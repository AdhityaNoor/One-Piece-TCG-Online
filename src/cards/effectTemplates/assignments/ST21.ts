/**
 * Reviewed effect template assignments - Starter Deck ST21 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST21_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST21-001 (leader) — [DON!! x1][Activate: Main][OPT] give up to 2 rested DON!! to 1 Character.
  { cardNumber: 'ST21-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'giveDon', count: 2 }] } },
  // ST21-002 — [DON!! x2][Opponent's Turn] this Character +2000.
  { cardNumber: 'ST21-002', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'opponent' } }] } },
  // ST21-009 — [Activate: Main][OPT] give up to 2 rested DON!! to 1 {Straw Hat Crew} Leader/Char (type filter approximated).
  { cardNumber: 'ST21-009', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 2 }] } },
  // ST21-010 — [DON!! x2][When Attacking] K.O. up to 1 opp Character 4000 power or less.
  { cardNumber: 'ST21-010', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
  // ST21-012 — [When Attacking] give up to 2 rested DON!! to Leader/1 Char.
  { cardNumber: 'ST21-012', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'giveDon', count: 2 }] } },
  // ST21-014 — [Rush][When Attacking] give up to 1 rested DON!! to Leader/1 Char.
  { cardNumber: 'ST21-014', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'giveDon', count: 1 }] } },
  // ST21-015 — [DON!! x2] this Character gains [Rush]. [On K.O.] play up to 1 red Character 6000 power or less from hand (exclude-[Zoro] dropped).
  {
    cardNumber: 'ST21-015',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 6000 } }] } },
    ],
  },
  // ST21-016 — [Main] up to 1 Leader/Char +1000 this turn. [Trigger] K.O. up to 1 opp Character 4000 power or less. PARTIAL: opp-Blocker-disable rider deferred.
  {
    cardNumber: 'ST21-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },
  // ST21-017 — [Main]/[Trigger] give up to 1 opp Character −5000 this turn. PARTIAL: the power-gated follow-up K.O. is deferred.
  {
    cardNumber: 'ST21-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -5000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // --- codegen batch ---
  { cardNumber: 'ST21-004', templateId: 'ability', params: { timing: 'onKO', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'draw', amount: 1 }] } },

];
