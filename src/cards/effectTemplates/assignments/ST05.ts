/**
 * Reviewed effect template assignments — Starter Deck ST05 (FILM Edition, purple / Shanks).
 *
 * Card texts are reference only; behavior is composed from reviewed template
 * functions -> IR ops. Raw text never executes.
 *
 * NEW capabilities introduced for this set:
 *   - `addKoImmunity` op + `koImmunitySelf` / `koImmunityChosen` templates —
 *     "cannot be K.O.'d" (scope 'battle' | 'any'), checked in the Damage Step and
 *     in effect K.O.s (ST05-008 permanent-in-battle, ST05-017 rider this-turn).
 *   - `addPowerControllerCharactersAll` template — buff ALL of your Characters
 *     (optionally type-filtered), no target choice (ST05-001).
 *   - `opponentDonMoreThanSelf` gate + `trashTypeFromHand` template (ST05-005).
 *   - onBattle `battlingOpponentAttribute` condition + defender-side onBattle firing (ST05-010 1st ability).
 * Everything else reuses existing templates (DON!! −N cost, onBlock timing,
 * addDonFromDeck ramp, searchTopDeck, restOpponentCharacter, addKeywordSelf, etc.).
 *
 * KNOWN LIMITATION (ST05-010 1st ability): onBattle fires AFTER the Damage Step, so
 * Zephyr's +3000 persists for the turn but does not retroactively affect the triggering
 * battle's math (no battle-start trigger point yet). The trash in ST05-005 is modeled as a
 * leading op rather than a formal cost, so a player with no {FILM} card can still start the
 * activation and then be unable to satisfy the mandatory trash choice (edge case).
 *
 * Vanilla / keyword-only (no runtime program): ST05-003 Ann ([Blocker] = card data),
 *   ST05-007 Gordon, ST05-012 Baccarat, ST05-013 Bins, ST05-015 Dr. Indigo.
 *   ST05-004's [Blocker] is also card data; only its [On Block] ability is here.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST05_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST05-001 (leader) Shanks — [Activate: Main] [Once Per Turn] DON!! −3: All of your
  //   {FILM} type Characters gain +2000 power during this turn.
  {
    cardNumber: 'ST05-001',
    templateId: 'ability',
    params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 3 }], functions: [{ fn: 'addPowerControllerCharactersAll', amount: 2000, duration: 'duringThisTurn', filter: { typeIncludes: 'FILM' } }] },
  },

  // ST05-002 Ain — [On Play] Add 1 DON!! from your DON!! deck and rest it.
  { cardNumber: 'ST05-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // ST05-004 Uta — [Blocker] (card data) + [On Block] DON!! −1: Rest up to 1 of your
  //   opponent's Characters with a cost of 5 or less.
  {
    cardNumber: 'ST05-004',
    templateId: 'ability',
    params: { timing: 'onBlock', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'restOpponentCharacter', filter: { maxCost: 5 }, maxTargets: 1 }] },
  },

  // ST05-005 Carina — [Activate: Main] [Once Per Turn] rest this Character + trash 1 {FILM} card:
  //   If your opponent has more DON!! on their field than you, add 2 DON!! from your DON!! deck (rested).
  //   (The gate wraps the whole ability, so it only activates when the ramp would apply.)
  {
    cardNumber: 'ST05-005',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'restThis' }],
      gate: [{ kind: 'opponentDonMoreThanSelf' }],
      functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'FILM' } }, { fn: 'addDonFromDeck', count: 2, rested: true }],
    },
  },

  // ST05-006 Gild Tesoro — [When Attacking] DON!! −2: Draw 2 cards.
  { cardNumber: 'ST05-006', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // ST05-008 Shiki — If you have 8 or more DON!! on your field, this Character cannot be
  //   K.O.'d in battle. (Static conditional battle-K.O. immunity.)
  {
    cardNumber: 'ST05-008',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] } }] },
  },

  // ST05-009 Scarlet — [Trigger] Play this card.
  { cardNumber: 'ST05-009', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST05-010 Zephyr — When this Character battles ＜Strike＞ attribute Characters, +3000 during
  //   this turn. [Activate: Main] [Once Per Turn] DON!! −1: This Character gains +2000 during this turn.
  {
    cardNumber: 'ST05-010',
    templates: [
      { templateId: 'ability', params: { timing: 'onBattle', battlingOpponentAttribute: 'strike', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },
    ],
  },

  // ST05-011 Douglas Bullet — [Activate: Main] [Once Per Turn] DON!! −4: Rest up to 2 of your
  //   opponent's Characters with a cost of 6 or less. Then, this Character gains [Double Attack]
  //   during this turn.
  {
    cardNumber: 'ST05-011',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      cost: [{ kind: 'donMinus', count: 4 }],
      functions: [{ fn: 'restOpponentCharacter', filter: { maxCost: 6 }, maxTargets: 2 }, { fn: 'addKeywordSelf', keyword: 'doubleAttack', duration: 'duringThisTurn' }],
    },
  },

  // ST05-014 Buena Festa — [On Play] Look at 5; reveal up to 1 {FILM} card other than
  //   [Buena Festa] and add it to your hand; rest to the bottom.
  {
    cardNumber: 'ST05-014',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM', excludeSelfName: true } }] },
  },

  // ST05-016 (event) Lion's Threat — [Main] DON!! −2: K.O. up to 1 of your opponent's
  //   Characters with a cost of 5 or less. [Trigger] Add 1 DON!! from your DON!! deck and set it active.
  {
    cardNumber: 'ST05-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 5 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // ST05-017 (event) Union Armada — [Counter] Up to 1 of your {FILM} Leader/Character +4000
  //   during this battle; if that card is a Character, it cannot be K.O.'d during this turn.
  //   [Trigger] Add 1 DON!! from your DON!! deck and set it active.
  {
    cardNumber: 'ST05-017',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPowerController', amount: 4000, duration: 'duringThisBattle', filter: { typeIncludes: 'FILM' } }, { fn: 'koImmunityChosen', scope: 'any', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
];
