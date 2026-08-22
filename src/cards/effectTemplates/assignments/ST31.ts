/**
 * Reviewed effect template assignments - Starter Deck ST31.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST31_ASSIGNMENTS: CardEffectAssignment[] = [
  {
    cardNumber: 'ST31-001',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Straw Hat Crew', maxCost: 5, excludeSelfName: true } }] } },
    ],
  },

  { cardNumber: 'ST31-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { typeIncludes: 'Straw Hat Crew', exactCost: 1 } }] } },

  {
    cardNumber: 'ST31-003',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } },
        { fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } },
      ],
    },
  },

  // PARTIAL: ST31-004 maps ONE −1000 target; "For every {Straw Hat Crew} type card on your
  // field, give up to 1 of your opponent's Characters −1000 power" is not expressible either way,
  // and the two readings need DIFFERENT primitives — so this needs a ruling before it is curated:
  //   (a) up to N different targets at −1000 each. addPower's maxTargets is a fixed number; there
  //       is no count-driven target cap. NEEDS: maxTargets sourced from a board count.
  //   (b) one target at −1000 × N. Expressible via addPower `scale`, EXCEPT that PowerScaleSource
  //       has no type-filtered field count — `controllerCharacters` counts every Character and
  //       omits the Leader/Stage, while the card says "{Straw Hat Crew} type CARD on your field".
  //       NEEDS: a `controllerTypedCards` PowerScaleSource.
  // Reading (a) is the more natural parse of the clause order, but do not curate on that guess.
  {
    cardNumber: 'ST31-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  {
    cardNumber: 'ST31-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'giveDon', count: 1, optional: true, targetName: 'Monkey.D.Luffy' }] } },
    ],
  },
];
