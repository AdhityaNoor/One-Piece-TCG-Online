/**
 * Reviewed effect template assignments - Starter Deck ST30.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST30_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST30-001 (leader) Luffy & Ace —
  //   If you have a Character with 7000 base power or more, give this Leader −2000 power.[Opponent's Turn]
  //   All of your [Portgas.D.Ace] and [Monkey.D.Luffy] cards gain +3000 power.
  // NOTE: not yet implemented (needs template).

  // ST30-002 - [On Play] Look at 5; add Character card with exactly 6000 power.
  {
    cardNumber: 'ST30-002',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 } }] },
  },

  // ST30-004 — [On Play] reveal 2 Characters with 6000 power from hand: draw 3 and trash 2.
  { cardNumber: 'ST30-004', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 6000, atLeast: 2 }], functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },

  // ST30-006 — [On Play] trash 1 Character with 6000 power from hand: draw 2.
  { cardNumber: 'ST30-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', exactPower: 6000 }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },

  // ST30-003 (character) Edward.Newgate —
  //   [Your Turn] All of your Characters with 6000 base power gain +1000 power.
  // NOTE: not yet implemented (needs template).

  // ST30-004 (character) Emporio.Ivankov —
  //   [On Play] You may reveal 2 Character cards with 6000 power from your hand: Draw 3 cards and trash 2
  //   cards from your hand.
  // NOTE: not yet implemented (needs template).

  // ST30-006 (character) Jinbe —
  //   [On Play] You may trash 1 Character card with 6000 power from your hand: Draw 2 cards.
  // NOTE: not yet implemented (needs template).

  // ── Triage batch (ST30 expressible). "reveal 6000-power Char from hand" costs and self/named power gates deferred. ──
  // ST30-007 — [On Play] rest 1 DON!!: this gains [Rush] this turn. [When Attacking] give up to 1 opp Character −1000.
  {
    cardNumber: 'ST30-007',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // --- codegen batch ---
  { cardNumber: 'ST30-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 1 }] } },

  // ST30-008 (character) Marco —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[On K.O.] You may trash 1 Character card with 6000 power from your hand: Play this
  //   Character card from your trash rested.
  // NOTE: not yet implemented (needs template).

  // ST30-009 (character) LittleOars Jr. —
  //   If your Character with 6000 base power would be removed from the field by your opponent's effect, you
  //   may trash this Character and draw 1 card instead.
  // NOTE: not yet implemented (needs template).

  // ST30-011 (character) Buggy —
  //   If your Character with 6000 base power would be removed from the field by your opponent's effect, you
  //   may rest this Character instead.[Blocker] (After your opponent declares an attack, you may rest this
  //   card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).

  // ST30-012 — [On Play] rest 1 DON!!: this gains [Rush] this turn. [When Attacking] rest up to 1 opp [Blocker] Character.
  {
    cardNumber: 'ST30-012',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { hasBlocker: true } }, optional: true }] } },
    ],
  },

  // ST30-014 (character) Mr.3(Galdino) —
  //   [Activate: Main] You may rest this Character: Give up to 2 of your Characters with 6000 base power up
  //   to 2 rested DON!! cards each.
  // NOTE: not yet implemented (needs template).

  // ST30-015 — [Trigger] K.O. up to 1 opp Character 6000 power or less. PARTIAL: the power-count-gated [Counter] buff is deferred.
  { cardNumber: 'ST30-015', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },

  // ST30-016 — [Counter] up to 1 Leader/Char +3000 this battle. PARTIAL: named+power draw rider deferred.
  { cardNumber: 'ST30-016', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },

  // ST30-017 — [Main]/[Trigger] Look 5, reveal up to 1 Character with 6000 power to hand, rest to bottom.
  {
    cardNumber: 'ST30-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', exactPower: 6000 }, remainder: 'bottom' }] } },
    ],
  },

];
