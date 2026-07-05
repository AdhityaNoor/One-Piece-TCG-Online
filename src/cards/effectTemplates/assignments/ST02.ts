/**
 * Reviewed effect template assignments — Starter Deck ST02 (Worst Generation / Eustass "Captain" Kid).
 *
 * Set-first coverage. Card texts are reference only; behavior is composed from
 * reviewed template functions -> IR ops. Raw text never executes.
 *
 * NEW capabilities introduced for this set:
 *   - `setActive` op (inverse of `rest`) — setActiveSelf / setActiveControllerCharacter
 *     / setActiveControllerDon.
 *   - `rest` now also rests DON!!; `restOpponentDon` template (ST02-008 DON!! denial).
 *   - `onBattle` timing — fires when the source attacks and battles an opponent
 *     Character (ST02-010). Enforces [Once Per Turn] in fireOnBattle.
 *   - `endOfTurn` timing — fires in the source controller's End Phase (ST02-013).
 *   - `addPowerAura` op — dynamic filtered anthem gated on source state
 *     (addPowerAuraControllerTypes) for X.Drake's lord effect (ST02-014).
 * Everything else here is parameterization of existing templates.
 *
 * Vanilla / keyword-only (no runtime program needed): ST02-002 Vito, ST02-004 Capone
 *   Bege ([Blocker] = card data), ST02-006 Koby, ST02-011 Heat, ST02-012 Bepo.
 * ST02-013's [Blocker] is also card data; only its [End of Your Turn] ability is here.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST02_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST02-001 (leader) Eustass"Captain"Kid — [Activate: Main] [Once Per Turn] ③ (rest 3 DON!!),
  // trash 1 card from your hand: Set this Leader as active.
  {
    cardNumber: 'ST02-001',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 3 }],
      functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'setActiveSelf' }],
    },
  },

  // ST02-003 Urouge — [DON!! x1] If you have 3 or more Characters, this card gains +2000 power.
  // Static conditional self-buff: gate on the MODIFIER (re-evaluated per read), like ST01-013.
  {
    cardNumber: 'ST02-003',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfCharacterCount', atLeast: 3 }] } }],
    },
  },

  // ST02-005 Killer — [On Play] K.O. up to 1 of your opponent's rested Characters with cost <=3.
  //                    [Trigger] Play this card.
  {
    cardNumber: 'ST02-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'koOpponentCharacter', filter: { rested: true, maxCost: 3 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // ST02-007 Jewelry Bonney — [Activate: Main] ➀ (rest 1 DON!!), rest this Character:
  //   Look at 5 from top; reveal up to 1 {Supernovas} type card and add it to your hand.
  {
    cardNumber: 'ST02-007',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }],
      functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Supernovas' } }],
    },
  },

  // ST02-009 Trafalgar Law — [On Play] Set up to 1 of your {Supernovas}/{Heart Pirates}
  //   rested Characters with cost <=5 as active.
  {
    cardNumber: 'ST02-009',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'setActiveControllerCharacter', filter: { rested: true, maxCost: 5, anyOfTypes: ['Supernovas', 'Heart Pirates'] } }],
    },
  },

  // ST02-015 (event) Scalpel — [Counter] Up to 1 of your Leader/Character +2000 during this
  //   battle. Then, set up to 1 of your DON!! active. [Trigger] Set up to 2 of your DON!! active.
  {
    cardNumber: 'ST02-015',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 2000, duration: 'duringThisBattle' }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
    ],
  },

  // ST02-016 (event) Repel — [Counter] Up to 1 of your Leader/Character +4000 during this
  //   battle. Then, set up to 1 of your DON!! active.
  {
    cardNumber: 'ST02-016',
    templateId: 'ability',
    params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 4000, duration: 'duringThisBattle' }, { fn: 'setActiveControllerDon', maxTargets: 1 }] },
  },

  // ST02-017 (event) Straw Sword — [Main] Rest up to 1 of your opponent's Characters.
  //   [Trigger] Play up to 1 {Supernovas} type card with cost <=2 from your hand.
  {
    cardNumber: 'ST02-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'restOpponentCharacter', filter: {}, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Supernovas', maxCost: 2 } }] } },
    ],
  },

  // ST02-008 Scratchmen Apoo — [DON!! x1] [When Attacking] Rest up to 1 of your opponent's DON!! cards.
  {
    cardNumber: 'ST02-008',
    templateId: 'ability',
    params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'restOpponentDon', maxTargets: 1 }] },
  },

  // ST02-010 Basil Hawkins — [DON!! x1] [Once Per Turn] [Your Turn] If this Character battles
  //   your opponent's Character, set this card as active.
  {
    cardNumber: 'ST02-010',
    templateId: 'ability',
    params: { timing: 'onBattle', oncePerTurn: true, condition: { donAttachedAtLeast: 1, turn: 'your' }, functions: [{ fn: 'setActiveSelf' }] },
  },

  // ST02-013 Eustass"Captain"Kid (character) — [Blocker] (card data) +
  //   [DON!! x1] [End of Your Turn] Set this card as active.
  {
    cardNumber: 'ST02-013',
    templateId: 'ability',
    params: { timing: 'endOfTurn', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'setActiveSelf' }] },
  },

  // ST02-014 X.Drake — [DON!! x1] [Your Turn] If this Character is rested, your {Supernovas}
  //   or {Navy} type Leaders and Characters gain +1000 power. (Dynamic anthem gated on source state.)
  {
    cardNumber: 'ST02-014',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addPowerAuraControllerTypes', amount: 1000, duration: 'permanent', anyOfTypes: ['Supernovas', 'Navy'], sourceCondition: { rested: true, donAttachedAtLeast: 1, turn: 'your' } }],
    },
  },
];
