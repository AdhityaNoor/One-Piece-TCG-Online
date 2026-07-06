/**
 * Reviewed effect template assignments - Starter Deck ST27 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST27_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST27-001 (character) Avalo Pizarro —
  //   [Activate: Main] [Once Per Turn] You may rest 1 of your [Fullalead] cards: If your Leader has the
  //   {Blackbeard Pirates} type, this Character gains +4000 power during this turn.[On K.O.] Draw 1 card.
  // NOTE: not yet implemented (needs template).

  // ST27-002 — [On K.O.] Draw 1. PARTIAL: the trash-self −cost activate is deferred.
  { cardNumber: 'ST27-002', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  // ST27-003 — [Blocker][On K.O.] Play up to 1 {Blackbeard Pirates} cost ≤5 from trash rested.
  { cardNumber: 'ST27-003', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Blackbeard Pirates', maxCost: 5 }, rested: true }] } },

  // ST27-004 (character) Sanjuan.Wolf —
  //   If your Leader has the {Blackbeard Pirates} type, this Character gains [Blocker] and +1 cost for
  //   every 4 cards in your trash.(After your opponent declares an attack, you may rest this card to make
  //   it the new target of the attack.)[On Play] Trash 1 card from your hand.
  // NOTE: not yet implemented (needs template).

  // ST27-005 — [Activate: Main] rest this: K.O. up to 1 Character cost ≤3. [On K.O.] add up to 1 black card from trash to hand.
  {
    cardNumber: 'ST27-005',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'any', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { color: 'black' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
];
