/**
 * Reviewed effect template assignments - Starter Deck ST32.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST32_ASSIGNMENTS: CardEffectAssignment[] = [
  {
    cardNumber: 'ST32-001',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        {
          fn: 'chooseOne',
          chooser: 'controller',
          prompt: 'Choose a card to rest.',
          options: [
            {
              label: 'leader',
              functions: [
                { fn: 'rest', target: { group: 'leader', player: 'controller' }, optional: true, ifGate: [{ kind: 'leaderAttribute', attribute: 'slash' }] },
                { fn: 'drawAndTrash', drawCount: 2, trashCount: 1, ifPrevious: 'previousSelectedAny' },
              ],
            },
            {
              label: 'don',
              functions: [
                { fn: 'restControllerDon', maxTargets: 1, optional: true },
                { fn: 'drawAndTrash', drawCount: 2, trashCount: 1, ifPrevious: 'previousSelectedAny' },
              ],
            },
          ],
        },
      ],
    },
  },

  {
    cardNumber: 'ST32-002',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 6 } }, duration: 'endOfOpponentsTurn', optional: true },
      ],
    },
  },

  {
    cardNumber: 'ST32-003',
    templates: [
      { templateId: 'ability', params: { timing: 'onRested', condition: { turn: 'your' }, functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderAttribute', attribute: 'slash' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 5, anyOf: [{ name: 'Perona' }, { attribute: 'slash' }] } }] } },
    ],
  },

  { cardNumber: 'ST32-004', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackCharactersWhileSummoningSick', duration: 'permanent', condition: { gate: [{ kind: 'leaderAttribute', attribute: 'slash' }] } }] } },
    { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },
  ] },

  { cardNumber: 'ST32-005', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackCharactersWhileSummoningSick', duration: 'permanent' }] } },
    { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderAttribute', attribute: 'slash' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
  ] },
];
