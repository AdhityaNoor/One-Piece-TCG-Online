/**
 * Reviewed effect template assignments - Starter Deck ST29 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST29_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST29-001 (leader) — [When Attacking] If ≤2 Life, draw 1, trash 1.
  { cardNumber: 'ST29-001', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
  // ST29-003 — [Trigger] K.O. up to 1 opp Character cost ≤3. PARTIAL: static ≤-Life +1000 buff deferred.
  { cardNumber: 'ST29-003', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // ST29-004 — [On Play] Look 4, reveal up to 1 {Straw Hat Crew} to hand, rest to bottom. [Trigger] trash 1 → play this.
  {
    cardNumber: 'ST29-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // ST29-007 — [On K.O.] add 1 top/bottom Life to hand → add 1 from hand to top of Life. PARTIAL: name-target [Trigger] buff deferred.
  { cardNumber: 'ST29-007', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // ST29-012 — [Activate: Main][OPT] give up to 1 rested DON!! to 1 [Monkey.D.Luffy] card. [Trigger] play this.
  {
    cardNumber: 'ST29-012',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // ST29-015 — [Counter] up to 1 Leader/Char +2000 this battle, then if ≤1 Life give opp Leader/Char −2000. [Trigger] Draw 1.
  {
    cardNumber: 'ST29-015',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // ST29-016 — [Counter] your Leader +3000 this battle. PARTIAL: the [Main] unblockable-Leader clause is deferred.
  { cardNumber: 'ST29-016', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
  // ST29-017 — [Counter] up to 1 Leader/Char +4000 this battle, then if ≤2 Life K.O. opp cost ≤3. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'ST29-017',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
];
