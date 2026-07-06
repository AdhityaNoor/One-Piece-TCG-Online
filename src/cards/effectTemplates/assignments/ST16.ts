/**
 * Reviewed effect template assignments - Starter Deck ST16 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST16_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST16-004 — [On Play] K.O. up to 1 of your opponent's rested Characters.
  { cardNumber: 'ST16-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } },
];
