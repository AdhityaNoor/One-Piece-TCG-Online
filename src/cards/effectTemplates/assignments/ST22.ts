/**
 * Reviewed effect template assignments - Starter Deck ST22 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 * Most of ST22 is "reveal top of deck; if {Whitebeard Pirates}, ..." (reveal-conditional) or
 * "reveal from hand" costs — both deferred until those capabilities exist.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST22_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST22-002 — [On Play] Look 5, reveal up to 1 {Whitebeard Pirates} to hand, rest to bottom (exclude-[Izo] dropped). PARTIAL: opp-attack trash-self deferred.
  { cardNumber: 'ST22-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Whitebeard Pirates' }, remainder: 'bottom' }] } },
  // ST22-016 — [Trigger] Draw 1. PARTIAL: the reveal-conditional [Counter] buff is deferred.
  { cardNumber: 'ST22-016', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
  // ST22-017 — [Trigger] Return up to 1 Character cost ≤3 to hand. PARTIAL: the reveal-from-hand [Main] is deferred.
  { cardNumber: 'ST22-017', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
];
