/**
 * Reviewed effect template assignments - Starter Deck ST19.
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST19_ASSIGNMENTS: CardEffectAssignment[] = [

  // ST19-001 Smoker — [On Play] You may trash 1 black {Navy} type card from your hand: up to 2 of your
  //   opponent's Characters with a cost of 4 or less cannot attack until the end of your opponent's next turn.
  {
    cardNumber: 'ST19-001',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { color: 'black', typeIncludes: 'Navy' }, optional: true },
        { fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 2, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // ST19-002 — [On Play] trash 2 black {Navy} cards from hand: If Leader {Navy}, draw 3.
  { cardNumber: 'ST19-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'trashTypeFromHand', count: 2, filter: { color: 'black', typeIncludes: 'Navy' } }, { fn: 'draw', amount: 3 }] } },

  // ST19-003 Tashigi — [On Play] If your Leader is [Smoker], give up to 1 of your opponent's Characters
  //   −4 cost during this turn.[Activate: Main] [Once Per Turn] If this Character was played on this turn,
  //   trash up to 1 of your opponent's Characters with a cost of 0.
  {
    cardNumber: 'ST19-003',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Smoker' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfPlayedThisTurn' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 0 } }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // ST19-004 Hina — [DON!! x1] [Opponent's Turn] +4 cost (static).[Activate: Main] [Once Per Turn] You may
  //   place 1 card from your trash at the bottom of your deck: give up to 1 rested DON!! to your Leader or
  //   1 of your Characters.
  {
    cardNumber: 'ST19-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'opponent' } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          functions: [
            { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
            { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // ST19-005 Monkey.D.Garp — [Blocker] (card data).[Activate: Main] [Once Per Turn] You may place 1 card
  //   from your trash at the bottom of your deck: give up to 1 of your opponent's Characters −1 cost during
  //   this turn.
  {
    cardNumber: 'ST19-005',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [
        { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

];
