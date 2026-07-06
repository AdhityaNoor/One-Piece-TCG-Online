/**
 * Reviewed effect template assignments - Starter Deck ST15 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST15_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST15-002 — [On Play] give up to 1 rested DON!! to Leader/1 Char. [Activate: Main] rest this: K.O. up to 1 opp Character 5000 power or less.
  {
    cardNumber: 'ST15-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
    ],
  },
  // ST15-004 — [On Play] If Leader {Whitebeard Pirates}, give up to 1 opp Character −2000, then add 1 top Life to hand.
  { cardNumber: 'ST15-004', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } }] } },
  // ST15-005 — static: if Leader {Whitebeard Pirates}, this Character gains [Rush]. PARTIAL: removal-replacement deferred.
  { cardNumber: 'ST15-005', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }] } }] } },
];
