/**
 * Reviewed effect template assignments — Promotional cards (P-xxx).
 */
import type { CardEffectAssignment } from '../assembler';

export const P_ASSIGNMENTS: CardEffectAssignment[] = [

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

  // P-060 — (Event) [Main] rest 1 of your [Uta] Characters: rest up to 2 of opponent's DON!!.
  { cardNumber: 'P-060', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'controller', filter: { name: 'Uta' } }, optional: true }, { fn: 'restOpponentDon', maxTargets: 2, ifPrevious: 'previousSelectedAny' }] } },

  // P-055 (character) Monkey.D.Luffy —
  //   [On Play] You may trash 2 cards from your hand: Your opponent places 1 of their Characters at the
  //   bottom of the owner's deck.
  // NOTE: not yet implemented (needs template).

  // P-057 (event) Fleeting Lullaby —
  //   [Main] If your Leader is [Uta], up to 2 of your opponent's rested Characters with a cost of 4 or less
  //   will not become active in your opponent's next Refresh Phase. [Trigger] Activate this card's [Main]
  //   effect.
  // NOTE: not yet implemented (needs template).

  // P-058 (event) Where the Wind Blows —
  //   [Main] If your Leader is [Uta], set all of your {FILM} type Characters as active at the end of this
  //   turn. [Trigger] Set all of your {FILM} type Characters as active.
  // NOTE: not yet implemented (needs template).

  // P-059 (event) The World's Continuation —
  //   [Counter] If your Leader is [Uta], you may return any number of Characters on your field to the
  //   owner's hand. Up to 1 of your Leader or Character cards gains +2000 power during this battle for
  //   every returned Character.
  // NOTE: not yet implemented (needs template).

  // P-060 (event) Tot Musica —
  //   [Main] You may rest 1 of your [Uta] cards: Rest up to 2 of your opponent's DON!! cards.
  // NOTE: not yet implemented (needs template).

  // P-063 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  { cardNumber: 'P-063', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  { cardNumber: 'P-068', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },

  // P-069 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'P-069', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  // P-073 — [Activate: Main][OPT] add 1 top/bottom Life to hand → this Character +1000 this turn.
  { cardNumber: 'P-073', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },

  // P-074 (character) Portgas.D.Ace —
  //   [Activate: Main] You may return this Character to the owner's hand: Look at 5 cards from the top of
  //   your deck and place them at the top or bottom of the deck in any order.
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

  // P-078 (character) Adio —
  //   If you have 2 or more rested {ODYSSEY} type Characters, this Character gains +1000 power.
  // NOTE: not yet implemented (needs template).

  // P-079 (character) Lim —
  //   [Blocker] (After your opponent declares an attack, you may rest this card to make it the new target
  //   of the attack.)[End of Your Turn] If you have 2 or more rested {ODYSSEY} type Characters, set this
  //   Character as active.
  // NOTE: not yet implemented (needs template).

  // P-081 (character) Dracule Mihawk —
  //   [Activate: Main] You may return this Character to the owner's hand: If you have 3 or more blue {Cross
  //   Guild} type Characters, play up to 1 {Cross Guild} type Character card with a cost of 5 from your
  //   hand.
  // NOTE: not yet implemented (needs template).

  // P-082 (character) Crocodile —
  //   [Your Turn] [On Play] If your Leader has the {Cross Guild} type or a type including "Baroque Works",
  //   place up to 1 of your opponent's Characters with 2000 power or less at the bottom of the owner's
  //   deck.
  // NOTE: not yet implemented (needs template).

  // P-083 — [DON!! x1][When Attacking] trash 1 (Character filter dropped) → give up to 1 opp Character −1000, then draw 1.
  { cardNumber: 'P-083', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },

  // P-084 (character) Buggy —
  //   This Character cannot attack.If your Leader is [Buggy], all Characters with a cost of 3 or 4 cannot
  //   attack.[On Play] Play up to 1 {Cross Guild} type Character card with a cost of 6 or less from your
  //   hand.
  //   PARTIAL: the self "cannot attack" lock is implemented below; the leader-gated global cost-3/4 aura remains deferred.
  { cardNumber: 'P-084', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent' }] } },

  // P-085 (character) Jewelry Bonney —
  //   [On Play] If your Leader has the {Supernovas} type and the number of your Life cards is equal to or
  //   less than the number of your opponent's Life cards, add up to 1 of your opponent's Characters with a
  //   cost of 4 or less to the top or bottom of the owner's Life cards face-up.
  // NOTE: not yet implemented (needs template).

  // P-088 (character) Trafalgar Law —
  //   [Trigger] If your Leader has the {Supernovas} type and you and your opponent have a total of 5 or
  //   less Life cards, play this card.
  // NOTE: not yet implemented (needs template).

  // P-105 — [On Play] add 1 top/bottom Life to hand → give up to 1 rested DON!! to Leader/1 Char. PARTIAL: static [Blocker]/+4 cost deferred.
  { cardNumber: 'P-105', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },

];
