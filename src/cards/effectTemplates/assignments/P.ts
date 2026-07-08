/**
 * Reviewed effect template assignments — Promotional cards (P-xxx).
 */
import type { CardEffectAssignment } from '../assembler';

export const P_ASSIGNMENTS: CardEffectAssignment[] = [


  // PARTIAL: "return this Character" not instance-locked; mapped optional char→hand then reorder.
  { cardNumber: 'P-074', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }, { fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom', ifPrevious: 'previousMovedAny' }] } },


  // PARTIAL: return-self + leader gate + play Cross Guild cost 5 deferred; mapped playFromHand only.
  { cardNumber: 'P-081', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Cross Guild', atLeast: 3 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Cross Guild', maxCost: 5 } }] } },

  // --- codegen batch ---
  { cardNumber: 'P-014', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ── Triage batch (P expressible). ──
  // P-029 — [End of Your Turn] rest this: set up to 1 {FILM} Character active (exclude-[Bartolomeo] dropped).
  { cardNumber: 'P-029', templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'restThis' }], functions: [{ fn: 'setActiveControllerCharacter', maxTargets: 1, filter: { typeIncludes: 'FILM' } }] } },

  // P-030 — [On K.O.] Place up to 1 Character cost ≤3 at bottom of deck.
  { cardNumber: 'P-030', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // P-044 — [DON!! x1] If ≤4 hand, this Character +2000.
  { cardNumber: 'P-044', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfHand', atMost: 4 }] } }] } },

  // P-053 — [On Play] If ≤3 hand, return up to 1 opp Character cost ≤3 to hand.
  { cardNumber: 'P-053', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // P-055 — [On Play] trash 2 from hand: opp places 1 Character at bottom of deck.
  { cardNumber: 'P-055', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 2 },
    { fn: 'moveCards', from: { zone: 'characters', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // P-057 — [Main] if Leader [Uta], up to 2 opp rested Characters cost<=4 won't refresh. [Trigger] Activate [Main].
  {
    cardNumber: 'P-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true, maxTargets: 2 }] } },
    ],
  },

  // P-058 — [Main] if Leader [Uta], set all {FILM} Characters active at end of turn. [Trigger] set all {FILM} active.
  {
    cardNumber: 'P-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'FILM' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'FILM' } }] } },
    ],
  },

  // P-059 — [Counter] if Leader [Uta], return any number of your Characters to hand, then +2000 battle.
  //   PARTIAL: per-returned scaling deferred; mapped as optional return + flat +2000 after any return.
  { cardNumber: 'P-059', templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderName', name: 'Uta' }], functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // P-060 — [Main] rest 1 [Uta]: rest up to 2 opp DON!!.
  { cardNumber: 'P-060', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'controller', filter: { name: 'Uta' } }, optional: true }, { fn: 'restOpponentDon', maxTargets: 2, ifPrevious: 'previousSelectedAny' }] } },

  // P-063 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  { cardNumber: 'P-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  { cardNumber: 'P-068', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // P-069 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'P-069', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // P-073 — [Activate: Main][OPT] add 1 top/bottom Life to hand → this Character +1000 this turn.
  { cardNumber: 'P-073', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },

  // P-074 (character) Portgas.D.Ace —
  //   [Activate: Main] You may return this Character to the owner's hand: Look at 5 cards from the top of
  //   your deck and place them at the top or bottom of your deck in any order.
  // NOTE: not yet implemented (needs template).

  // P-075 — [On Play] give up to 1 rested DON!! to Leader/1 Char. [When Attacking] if you have a cost-8+ Character, draw 1 trash 1.
  {
    cardNumber: 'P-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // P-078 — if 2+ rested {ODYSSEY} Characters, +1000
  { cardNumber: 'P-078', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'ODYSSEY', atLeast: 2, rested: true }] } }] } },

  // P-079 — [Blocker] [End of Your Turn] If 2+ rested {ODYSSEY} Characters, set this Character as active.
  { cardNumber: 'P-079', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'ODYSSEY', atLeast: 2, rested: true }], functions: [{ fn: 'setActiveSelf' }] } },

  // P-081 (character) Dracule Mihawk —
  //   [Activate: Main] You may return this Character to the owner's hand: If you have 3 or more blue {Cross
  //   Guild} type Characters, play up to 1 {Cross Guild} type Character card with a cost of 5 from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // P-082 — [Your Turn] [On Play] if Leader {Cross Guild} or {Baroque Works}, place up to 1 opp Character power<=2000 at bottom of deck.
  { cardNumber: 'P-082', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderType', type: 'Cross Guild' }, { kind: 'leaderType', type: 'Baroque Works' }] }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxPower: 2000 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // P-083 — [DON!! x1][When Attacking] trash 1 (Character filter dropped) → give up to 1 opp Character −1000, then draw 1.
  { cardNumber: 'P-083', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },

  // P-084 (character) Buggy —
  //   This Character cannot attack.If your Leader is [Buggy], all Characters with a cost of 3 or 4 cannot
  //   attack.[On Play] Play up to 1 {Cross Guild} type Character card with a cost of 6 or less from your
  //   hand.
  //   PARTIAL: the self "cannot attack" lock is implemented below; the leader-gated global cost-3/4 aura remains deferred.
  { cardNumber: 'P-084', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent' }] } },

  // P-085 — [On Play] if Leader {Supernovas} and self Life <= opp Life, add up to 1 opp Character cost<=4 to top/bottom of owner's Life face-up.
  { cardNumber: 'P-085', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

  // P-088 — [Trigger] if Leader {Supernovas} and combined Life ≤5, play this card.
  { cardNumber: 'P-088', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Supernovas' }, { kind: 'combinedLifeTotal', atMost: 5 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // P-105 — [On Play] add 1 top/bottom Life to hand → give up to 1 rested DON!! to Leader/1 Char. PARTIAL: static [Blocker]/+4 cost deferred.
  { cardNumber: 'P-105', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },

];
