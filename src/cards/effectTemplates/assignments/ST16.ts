/**
 * Reviewed effect template assignments - Starter Deck ST16 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST16_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST16-001 (character) Uta —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[Activate: Main] [Once Per Turn] You may trash 1 {FILM} type card from your hand: Give
  //   up to 1 rested DON!! card to your Leader or 1 of your Characters.
  // NOTE: not yet implemented (needs template).

  // ST16-002 (character) Gordon —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On Your Opponent's Attack] You may trash any number of {Music} type cards from your
  //   hand. Your Leader or 1 of your Characters gains +1000 power during this battle for every card
  //   trashed.
  // NOTE: not yet implemented (needs template).

  // ST16-003 (character) Charlotte Katakuri —
  //   If your Leader has the {FILM} type and you have 6 or more rested cards, this Character gains +2000
  //   power.
  // NOTE: not yet implemented (needs template).

  // ST16-004 — [On Play] K.O. up to 1 of your opponent's rested Characters.
  { cardNumber: 'ST16-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } },

  // ST16-005 (character) Monkey.D.Luffy —
  //   If you have a rested [Uta], this Character gains +1000 power.
  // NOTE: not yet implemented (needs template).
];
