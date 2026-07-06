/**
 * Reviewed effect template assignments - Starter Deck ST26 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST26_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST26-001 (character) Soba Mask —
  //   If you have a [San-Gorou] or [Sanji] Character with 7000 base power or more, give this card in your
  //   hand −5 cost.[On Play] Return all of your [San-Gorou] and [Sanji] Characters to the owner's hand.
  // NOTE: not yet implemented (needs template).

  // ST26-002 — [Blocker][On Play] DON!! −2: Rest up to 1 opp Character cost ≤1 (the "or DON!!" option is dropped).
  { cardNumber: 'ST26-002', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // ST26-003 (character) Nico Robin —
  //   [On Play] DON!! −2 (You may return the specified number of DON!! cards from your field to your DON!!
  //   deck.): Add up to 1 DON!! card from your DON!! deck and set it as active.
  // NOTE: not yet implemented (needs template).

  // ST26-004 — [On Play] DON!! −2: give up to 2 opp Characters −2000 this turn.
  { cardNumber: 'ST26-004', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },

  // ST26-005 (character) Monkey.D.Luffy —
  //   [On Play]/[When Attacking] DON!! −2 (You may return the specified number of DON!! cards from your
  //   field to your DON!! deck.): If your Leader is multicolored and your opponent has 5 or more DON!!
  //   cards on their field, your {Straw Hat Crew} type Leader's base power becomes 7000 until the end of
  //   your opponent's next End Phase.
  // NOTE: not yet implemented (needs template).
];
