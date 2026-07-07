/**
 * Reviewed effect template assignments - Starter Deck ST22 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 * Most of ST22 is "reveal top of deck; if {Whitebeard Pirates}, ..." (reveal-conditional) or
 * "reveal from hand" costs — both deferred until those capabilities exist.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST22_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST22-001 (leader) Ace & Newgate —
  //   [Activate: Main] [Once Per Turn] You may reveal 1 card with a type including "Whitebeard Pirates"
  //   from your hand: Draw 1 card and place the revealed card at the top of your deck.
  // NOTE: not yet implemented (needs template).

  // ST22-002 — [On Play] Look 5, reveal up to 1 {Whitebeard Pirates} to hand, rest to bottom (exclude-[Izo] dropped). PARTIAL: opp-attack trash-self deferred.
  { cardNumber: 'ST22-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Whitebeard Pirates' }, remainder: 'bottom' }] } },

  // --- codegen batch ---
  { cardNumber: 'ST22-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'draw', amount: 2 }] }] } },

  { cardNumber: 'ST22-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] }] } },

  { cardNumber: 'ST22-007', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'giveDon', count: 1 }] }] } },

  // ST22-011 — [Your Turn] [On Play] reveal 2 {Whitebeard Pirates} cards from hand: up to 1 of your Leader +2000 this turn.
  { cardNumber: 'ST22-011', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'selfHandMatching', typeIncludes: 'Whitebeard Pirates', atLeast: 2 }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // ST22-005 (character) Kouzuki Oden —
  //   If this Character would be removed from the field by your opponent's effect, you may trash 2 cards
  //   from your hand instead.[Activate: Main] [Once Per Turn] You may rest 3 of your DON!! cards and return
  //   1 of your Characters other than this Character to the owner's hand: Set this Character as active.
  // NOTE: not yet implemented (needs template).

  // ST22-011 (character) Whitey Bay —
  //   [Your Turn] [On Play] You may reveal 2 cards with a type including "Whitebeard Pirates" from your
  //   hand: Up to 1 of your Leader with a type including "Whitebeard Pirates" gains +2000 power during this
  //   turn.
  // NOTE: not yet implemented (needs template).

  // ST22-012 — K.O. replacement (trash 1 from hand, opp effect, OPT) + [When Attacking] reveal top for +1000.
  {
    cardNumber: 'ST22-012',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementSelf',
            scope: 'effect',
            oncePerTurn: true,
            trashFromHand: { count: 1 },
            duration: 'permanent',
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [{
            fn: 'revealTopThen',
            filter: { typeIncludes: 'Whitebeard Pirates' },
            then: [{ fn: 'addPowerSelf', amount: 1000, duration: 'endOfOpponentsTurn' }],
          }],
        },
      },
    ],
  },

  // ST22-015 (event) I Am Whitebeard!! —
  //   [Main] If your Leader's type includes "Whitebeard Pirates", play up to 1 [Edward.Newgate] from your
  //   hand. Then, you may add 1 card from the top or bottom of your Life cards to your hand. If you do, up
  //   to 1 of your Leader gains +2000 power until the end of your opponent's next turn.
  // NOTE: not yet implemented (needs template).

  // ST22-016 — [Trigger] Draw 1. PARTIAL: the reveal-conditional [Counter] buff is deferred.
  { cardNumber: 'ST22-016', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },

  // ST22-017 — [Trigger] Return up to 1 Character cost ≤3 to hand. PARTIAL: the reveal-from-hand [Main] is deferred.
  { cardNumber: 'ST22-017', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

];
