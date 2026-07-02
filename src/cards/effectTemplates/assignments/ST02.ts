/**
 * Reviewed effect template assignments — Starter Deck ST02 (Whitebeard Pirates).
 *
 * Coverage notes:
 *   SKIPPED (not yet supported in IR):
 *     ST02-001 (leader) — [Activate: Main] DON!! −2 + add Character from trash: trash recovery (TODO).
 *     ST02-002 — [On Play] optional trash + K.O. ≤2: optional cost payment (TODO).
 *     ST02-003 — [On Play] opponent discards 1 from top of deck: mill opponent (TODO).
 *     ST02-004 — [On K.O.] add Character from trash to hand: trash recovery (TODO).
 *     ST02-005 — [On Play] DON!! −3 cost + play from hand: DON!! cost (TODO).
 *     ST02-006 — [On K.O.] look at top 3 + add Whitebeard Pirates: could template but needs review.
 *     ST02-008 — [On Play] DON!! −1 cost + K.O. ≤5: DON!! cost (TODO).
 *     ST02-009 — [On Play] DON!! −1 cost + rest ≤5: DON!! cost (TODO).
 *     ST02-010 — [When Attacking] if opponent Life ≤3, give self +2000: gate (TODO).
 *     ST02-011 — [On Play] DON!! −2 cost + K.O. ≤9: DON!! cost (TODO).
 *     ST02-012 — [On Play] DON!! −2 cost + give self +2000 until turn end: DON!! cost (TODO).
 *     ST02-013 (event) — [Main] trash-1 cost + draw 2 / [Trigger] play character cost 4-: trash cost (TODO).
 *     ST02-014 (event) — [Counter] +2000 + conditional active/rest characters / [Trigger] K.O. ≤3: event (TODO).
 *     ST02-015 (event) — [Main] DON!! −3 + K.O. ≤10 / [Trigger] K.O. ≤5: DON!! cost (TODO).
 */
import type { CardEffectAssignment } from '../assembler';

export const ST02_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST02-007 — [Activate: Main] ➀ You may rest this Character: Look at 5 from top;
  //            reveal up to 1 {Supernovas} type card and add it to your hand.
  //            Two costs: DON!! −1 (➀) AND rest-this-Character.
  {
    cardNumber: 'ST02-007',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'searchTopDeck', look: 5,
      pick: 1,
      reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' } }] },
  },
];
