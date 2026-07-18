/**
 * Reviewed effect template assignments - Starter Deck ST22 (triage batch).
 * Structural params only; never copy raw effect text into assignments.
 * Most of ST22 is "reveal top of deck; if {Whitebeard Pirates}, ..." (reveal-conditional) or
 * "reveal from hand" costs — both deferred until those capabilities exist.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST22_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST22-001 — reveal 1 {Whitebeard Pirates} from hand: draw 1, then place the revealed card on top of deck.
  { cardNumber: 'ST22-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'optionalRevealTypeFromHand', filter: { typeIncludes: 'Whitebeard Pirates' }, prompt: 'You may reveal 1 {Whitebeard Pirates} type card from your hand.', then: [
      { fn: 'draw', amount: 1 },
      { fn: 'movePreviousSelection', to: { zone: 'deck', player: 'owner', position: 'top' } },
    ] },
  ] } },

  // ST22-002 — [On Play] Look 5, reveal up to 1 {Whitebeard Pirates} to hand, rest to bottom (other than [Izo]).
  //   [On Your Opponent's Attack] You may trash this Character: draw 1, place 1 card from hand at bottom of deck.
  {
    cardNumber: 'ST22-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Whitebeard Pirates', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'trashThis' }], functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1 },
      ] } },
    ],
  },

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
  // Closed 2026-07-16 field-removal replacement pass: removal replacement (trash 2 from hand) via
  // registerKoReplacementSelf; activateMain bounce → setActive is separately mapped.
  {
    cardNumber: 'ST22-005',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          cost: [{ kind: 'restDon', count: 3 }],
          functions: [
            { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { excludeSelf: true } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
            { fn: 'setActiveSelf', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{ fn: 'registerKoReplacementSelf', scope: 'effect', replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', trashFromHand: { count: 2 }, duration: 'permanent' }],
        },
      },
    ],
  },

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
  {
    cardNumber: 'ST22-015',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }],
          functions: [
            { fn: 'playFromHand', filter: { name: 'Edward.Newgate' }, optional: true },
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true },
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'endOfOpponentsTurn', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // ST22-016 — [Counter] Reveal top of deck; if its type includes {Whitebeard Pirates}, up to 1 Leader/Character +4000 this battle. [Trigger] Draw 1.
  {
    cardNumber: 'ST22-016',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'revealTopThen', filter: { typeIncludes: 'Whitebeard Pirates' }, then: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // ST22-017 — [Main] reveal 2 {Whitebeard Pirates}: draw 1, bottom-deck up to 1 cost≤5 Character. [Trigger] return cost≤3 Character to hand.
  {
    cardNumber: 'ST22-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'optionalRevealTypeFromHand', count: 2, filter: { typeIncludes: 'Whitebeard Pirates' }, prompt: 'You may reveal 2 {Whitebeard Pirates} type cards from your hand.', then: [
          { fn: 'draw', amount: 1 },
          { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        ] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

];
