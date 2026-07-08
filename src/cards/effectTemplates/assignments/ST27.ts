/**
 * Reviewed effect template assignments - Starter Deck ST27 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST27_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST27-001 — [Activate: Main] [OPT] rest [Fullalead] → +4000 if {Blackbeard Pirates} Leader; [On K.O.] draw 1.
  {
    cardNumber: 'ST27-001',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { name: 'Fullalead' } }, optional: true },
        { fn: 'addPowerSelf', amount: 4000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny', ifGate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }] },
      ] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // ST27-002 — [On K.O.] Draw 1. PARTIAL: the trash-self −cost activate is deferred.
  { cardNumber: 'ST27-002', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },

  // ST27-003 — [Blocker][On K.O.] Play up to 1 {Blackbeard Pirates} cost ≤5 from trash rested.
  { cardNumber: 'ST27-003', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Blackbeard Pirates', maxCost: 5 }, rested: true }] } },

  // ST27-004 — PARTIAL: +1 cost per 4 trash → flat +1 at 4+ trash; [On Play] trash 1 from hand mapped.
  {
    cardNumber: 'ST27-004',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [
            { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }] } },
            { fn: 'addCost', target: { ref: 'self' }, amount: 1, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }, { kind: 'selfTrashCount', atLeast: 4 }] } },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  // ST27-005 — [Activate: Main] rest this: K.O. up to 1 Character cost ≤3. [On K.O.] add up to 1 black card from trash to hand.
  {
    cardNumber: 'ST27-005',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'any', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { color: 'black' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
];
