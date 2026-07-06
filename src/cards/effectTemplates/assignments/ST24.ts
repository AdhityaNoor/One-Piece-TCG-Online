/**
 * Reviewed effect template assignments - Starter Deck ST24 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST24_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST24-001 (character) Capone"Gang"Bege —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Play] If you have 6 or more rested cards, draw 1 card and trash 1 card from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // ST24-002 — [On Play] Look 5, reveal up to 1 {Supernovas} to hand, rest to bottom. PARTIAL: opp-attack trash-self ramp deferred.
  { cardNumber: 'ST24-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' }, remainder: 'bottom' }] } },

  // ST24-003 — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'ST24-003', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // ST24-004 (character) Law & Bepo —
  //   [On Play] Rest up to 1 of your opponent's Characters and that Character will not become active in
  //   your opponent's next Refresh Phase. Then, if your opponent has 2 or more rested Characters, your
  //   Leader gains +2000 power until the end of your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).

  // ST24-005 (character) X.Drake —
  //   [On Play] If your Leader has the {Supernovas} type, rest up to 1 of your opponent's Characters with a
  //   cost of 5 or less. Then, set up to 1 of your DON!! cards as active at the end of this turn.
  // NOTE: not yet implemented (needs template).
];
