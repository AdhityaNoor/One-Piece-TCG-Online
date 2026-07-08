/**
 * Reviewed effect template assignments - Starter Deck ST16 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST16_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST16-001 — [Activate: Main] trash 1 {FILM} from hand → give up to 1 rested DON!!.
  { cardNumber: 'ST16-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'FILM' }, optional: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },

  // ST16-002 — PARTIAL: variable Music trash count → single trash +1000 battle buff (OP06-014 pattern).
  { cardNumber: 'ST16-002', templateId: 'ability', params: { timing: 'onOpponentsAttack', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Music' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },

  // ST16-003 — PARTIAL: "6+ rested cards" → selfRestedCharacterCount; {FILM} Leader gate mapped.
  { cardNumber: 'ST16-003', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'FILM' }, { kind: 'selfRestedCharacterCount', atLeast: 6 }] } }] } },

  // ST16-004 — [On Play] K.O. up to 1 of your opponent's rested Characters.
  { cardNumber: 'ST16-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } },

  // ST16-005 — PARTIAL: "rested [Uta]" approximated as selfControlsNamed (ignores rested state).
  { cardNumber: 'ST16-005', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfControlsNamed', name: 'Uta' }] } }] } },
];
