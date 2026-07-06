/**
 * Reviewed effect template assignments - Starter Deck ST20 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST20_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST20-002 — [Trigger] trash 1 → play this card. PARTIAL: the K.O.-replacement is deferred.
  { cardNumber: 'ST20-002', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
  // ST20-003 — [Trigger] peek 1 of your/opp's top Life, place top or bottom. PARTIAL: "add this card to your hand" deferred.
  { cardNumber: 'ST20-003', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },
  // ST20-004 — [On Play] add 1 top Life to hand → set up to 1 {Big Mom Pirates} cost ≤3 active. [Trigger] rest up to 1 opp Character cost ≤3.
  {
    cardNumber: 'ST20-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'Big Mom Pirates', maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
];
