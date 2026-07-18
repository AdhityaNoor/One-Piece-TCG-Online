/**
 * Reviewed effect template assignments - Starter Deck ST29 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST29_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST29-001 (leader) — [When Attacking] If ≤2 Life, draw 1, trash 1.
  { cardNumber: 'ST29-001', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // ST29-002 (character) Usopp —
  //   [On Play]/[When Attacking] Rest up to 1 of your opponent's Characters with a cost equal to or less
  //   than the number of your opponent's Life cards.
  {
    cardNumber: 'ST29-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true }] } },
    ],
  },

  // ST29-003 — static +1000 if Life ≤ opponent's; [Trigger] K.O. up to 1 opp Character cost ≤3.
  {
    cardNumber: 'ST29-003',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfLifeAtMostOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },

  // ST29-004 — [On Play] Look 4, reveal up to 1 {Straw Hat Crew} to hand, rest to bottom. [Trigger] trash 1 → play this.
  {
    cardNumber: 'ST29-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // --- codegen batch ---
  { cardNumber: 'ST29-005', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Monkey.D.Luffy' }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST29-007 — [On K.O.] add 1 top/bottom Life to hand → add 1 from hand to top of Life.
  //   [Trigger] Up to 1 of your [Monkey.D.Luffy] cards gains +2000 power during this turn.
  {
    cardNumber: 'ST29-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Monkey.D.Luffy' } }, amount: 2000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  { cardNumber: 'ST29-009', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Monkey.D.Luffy' }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST29-008 — Egghead ally: opponent-effect K.O. → turn top Life face-up. [Trigger] play when Leader is Luffy.
  {
    cardNumber: 'ST29-008',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementAura',
            scope: 'effect',
            effectSourceController: 'opponent',
            anyOfTypes: ['Egghead'],
            turnTopLifeFace: { faceUp: true },
            duration: 'permanent',
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Monkey.D.Luffy' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ST29-012 — [Activate: Main][OPT] give up to 1 rested DON!! to 1 [Monkey.D.Luffy] card. [Trigger] play this.
  {
    cardNumber: 'ST29-012',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ST29-014 — [Activate: Main] [Once Per Turn] trash 1 [Trigger] card from hand: draw 1 and give up to 1 rested DON!! to your Leader or 1 Character.
  { cardNumber: 'ST29-014', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'draw', amount: 1, ifPrevious: 'previousSelectedAny' },
    { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
  ] } },

  // ST29-013 — [Trigger] K.O. up to 1 opp Character cost ≤ combined Life (both players).
  { cardNumber: 'ST29-013', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCostFromCombinedLife: true } }, optional: true }] } },

  // ST29-015 — [Counter] up to 1 Leader/Char +2000 this battle, then if ≤1 Life give opp Leader/Char −2000. [Trigger] Draw 1.
  {
    cardNumber: 'ST29-015',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'selfLife', atMost: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // ST29-016 — [Main] Your [Monkey.D.Luffy] Leader gains [Unblockable] during this turn. [Counter] Your Leader gains +3000 power during this battle.
  {
    cardNumber: 'ST29-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Monkey.D.Luffy' }], functions: [{ fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'unblockable', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // ST29-017 — [Counter] up to 1 Leader/Char +4000 this battle, then if ≤2 Life K.O. opp cost ≤3. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'ST29-017',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

];
