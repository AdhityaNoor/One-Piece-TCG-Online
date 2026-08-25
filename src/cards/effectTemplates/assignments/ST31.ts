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

  // ST31-004 Monkey.D.Luffy — "[On Play] For every {Straw Hat Crew} type card on your field,
  //   give up to 1 of your opponent's Characters −1000 power during this turn."
  //
  //   RULING RESOLVED (was: needs a ruling; two readings). Reading (b) — ONE target at −1000 × N —
  //   is correct, on the precedent of OP13-001, which is the same clause grammar:
  //     "For every DON!! card rested this way, this Leader or UP TO 1 of your {Straw Hat Crew} type
  //      Characters gains +2000 power during this battle."
  //   and is curated as a single target with `amountPer`. "up to 1" is the TARGET quantifier; "for
  //   every" scales the AMOUNT. Reading (a) would have needed "up to N of your opponent's Characters".
  //
  //   The count is snapshotted at RESOLUTION via captureFieldTypeCount, not expressed as a
  //   continuous `scale`: scale is re-read on every power lookup, so K.O.ing a Straw Hat later in
  //   the turn would retroactively shrink a debuff the card already applied.
  //   "card on your field" is Leader + Characters + Stages — hence controllerFieldCards, not
  //   controllerCharacters.
  {
    cardNumber: 'ST31-004',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'captureFieldTypeCount', typeIncludes: 'Straw Hat Crew', into: 'st31ShcField' },
            { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: 0, amountPer: -1000, countVar: 'st31ShcField', duration: 'duringThisTurn', optional: true, maxTargets: 1 },
          ],
        },
      },
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
