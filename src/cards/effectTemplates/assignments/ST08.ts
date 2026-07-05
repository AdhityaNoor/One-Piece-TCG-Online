/**
 * Reviewed effect template assignments — Starter Deck ST08 (Monkey.D.Luffy / black).
 *
 * A black cost-reduction / K.O. deck. Mostly parameterization of existing templates
 * (modifyCostOpponent, koOpponentCharacter, restThis cost, draw). New this pass, each reusing
 * existing ops/templates with a small selector/param addition:
 *   - `koAllCharacters` (ST08-005 mass wipe — reuses ko op + allCharacters selector).
 *   - `koImmunitySelf` gained `attackerCategory` (ST08-002 "cannot be K.O.'d in battle by Leaders").
 *   - `battleOpponent` selector + koBattleOpponent/koSelf (ST08-013 battle K.O. exchange, reuse ko op).
 *   - generic moveCards from controller Life top to hand (ST08-014 main) + modifyCostOpponent.
 *   - `onCharacterKoed` reactive timing + giveDonControllerLeader (ST08-001, reuse giveDon op).
 *
 * KNOWN LIMITATION: ST08-001's reactive fires per Character trashed this action; a Character both
 * played and K.O.'d within the same action is not counted (rare). ST08-013's optional K.O. counts
 * as "done" even against a K.O.-immune opponent (would still K.O. itself) — rare edge.
 *
 * Vanilla / keyword-only (no runtime program): ST08-003 Gaimon, ST08-010 Garp, ST08-011 Luffy,
 *   ST08-012 Laboon. ST08-006/007's [Blocker] is card data; only their non-Blocker abilities are here.
 */
import type { CardEffectAssignment } from '../assembler';

export const ST08_ASSIGNMENTS: CardEffectAssignment[] = [
  // ST08-001 (leader) Luffy — [Your Turn] When a Character is K.O.'d, give up to 1 rested DON!! to this Leader.
  {
    cardNumber: 'ST08-001',
    templateId: 'ability',
    params: { timing: 'onCharacterKoed', condition: { turn: 'your' }, functions: [{ fn: 'giveDonControllerLeader', count: 1 }] },
  },

  // ST08-002 Uta — "This Character cannot be K.O.'d in battle by Leaders." +
  //   [Activate: Main] You may rest this Character: Give up to 1 opponent Character −2 cost this turn.
  {
    cardNumber: 'ST08-002',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', attackerCategory: 'leader' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'modifyCostOpponent', amount: -2 }] } },
    ],
  },

  // ST08-004 Koby — [Activate: Main] You may rest this Character: K.O. up to 1 opponent Character cost <=2.
  {
    cardNumber: 'ST08-004',
    templateId: 'ability',
    params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 2 } }] },
  },

  // ST08-005 Shanks — [On Play] You may trash 1 card from your hand: K.O. all Characters with a cost of 1 or less.
  {
    cardNumber: 'ST08-005',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'koAllCharacters', filter: { maxCost: 1 }, ifPrevious: 'previousMovedAny' }] },
  },

  // ST08-006 Shirahoshi — [Blocker] (card data) + [On Play] Give up to 1 opponent Character −4 cost.
  { cardNumber: 'ST08-006', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -4 }] } },

  // ST08-007 Nefeltari Vivi — [Blocker] (card data) + [Trigger] Play this card.
  { cardNumber: 'ST08-007', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ST08-008 Higuma — [On Play] Give up to 1 opponent Character −2 cost during this turn.
  { cardNumber: 'ST08-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -2 }] } },

  // ST08-009 Makino — [On Play] If there is a Character with a cost of 0, draw 1 card.
  {
    cardNumber: 'ST08-009',
    templateId: 'ability',
    params: { timing: 'onPlay', gate: [{ kind: 'anyCharacterExactCost', exactCost: 0 }], functions: [{ fn: 'draw', amount: 1 }] },
  },

  // ST08-015 (event) Gum-Gum Pistol — [Main] K.O. up to 1 opponent Character cost <=2. [Trigger] Draw 1.
  {
    cardNumber: 'ST08-015',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'koOpponentCharacter', filter: { maxCost: 2 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // ST08-013 Mr.2 Bon Kurei — [DON!! x1] At the end of a battle in which this Character battles your
  //   opponent's Character, you may K.O. the opponent's Character you battled with. If you do, K.O. this Character.
  {
    cardNumber: 'ST08-013',
    templateId: 'ability',
    params: { timing: 'onBattle', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'koBattleOpponent' }, { fn: 'koSelf', ifPrevious: 'previousMovedAny' }] },
  },

  // ST08-014 (event) Gum-Gum Bell — [Main] You may add 1 card from the top of your Life cards to your hand:
  //   Give up to 1 opponent Character −7 cost this turn. [Trigger] Add up to 1 black Character (cost <=2) from your trash to hand.
  {
    cardNumber: 'ST08-014',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'modifyCostOpponent', amount: -7, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveFromTrashToHand', filter: { color: 'black', category: 'character', maxCost: 2 } }] } },
    ],
  },
];
