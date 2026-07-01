/**
 * Reviewed effect template assignments — Main Booster sets (OP01–OP16).
 *
 * Only add a card here after:
 *   1. Reading the card's English effect text.
 *   2. Confirming the chosen template + params match the real ruling behavior.
 *   3. Verifying the resulting EffectProgram is JSON-serializable.
 *
 * Do NOT copy raw effect text into params. Params are structural only.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP_ASSIGNMENTS: CardEffectAssignment[] = [
  // OP01 -----------------------------------------------------------------------

  // OP01-016 — [On Play] Look at 5 from top; add up to 1 Straw Hat Crew (excl. same name).
  {
    cardNumber: 'OP01-016',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true } },
  },
  // OP01-033 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP01-033', templateId: 'onPlayRestOpponentCharacter', params: { filter: { maxCost: 4 } } },
  // OP01-048 — [On Play] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP01-048', templateId: 'onPlayRestOpponentCharacter', params: { filter: { maxCost: 3 } } },
  // OP01-080 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP01-080', templateId: 'onKODraw', params: { amount: 1 } },
  // OP01-113 — [On K.O.] Add 1 DON!! from DON!! deck (rested).
  { cardNumber: 'OP01-113', templateId: 'onKOAddDonFromDeck', params: { count: 1, rested: true } },

  // OP02 -----------------------------------------------------------------------

  // OP02-011 — [On Play] K.O. up to 1 of your opponent's Characters with 3000 power or less.
  { cardNumber: 'OP02-011', templateId: 'onPlayKoOpponentCharacter', params: { filter: { maxPower: 3000 } } },

  // OP03 -----------------------------------------------------------------------

  // OP03-011 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  { cardNumber: 'OP03-011', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -2000, donRequired: 1 } },

  // OP03-062 — [On Play] Look at 5; add up to 1 Water Seven type (excl. same name).
  {
    cardNumber: 'OP03-062',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Water Seven', excludeSelfName: true } },
  },

  // OP04 -----------------------------------------------------------------------

  // OP04-022 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  {
    cardNumber: 'OP04-022',
    templateId: 'activateMainRest',
    params: { filter: { maxCost: 1 }, cost: [{ kind: 'restThis' }] },
  },
  // OP04-045 — [On Play] Draw 1 card.
  { cardNumber: 'OP04-045', templateId: 'onPlayDraw', params: { amount: 1 } },
  // OP04-049 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP04-049', templateId: 'onKODraw', params: { amount: 1 } },
  // OP04-051 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP04-051',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } },
  },

  // OP05 -----------------------------------------------------------------------

  // OP05-010 — [On Play] K.O. up to 1 of your opponent's Characters with 1000 power or less.
  { cardNumber: 'OP05-010', templateId: 'onPlayKoOpponentCharacter', params: { filter: { maxPower: 1000 } } },
  // OP05-014 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  { cardNumber: 'OP05-014', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -2000, donRequired: 1 } },
  // OP05-015 — [On Play] Look at 5; add up to 1 Revolutionary Army (excl. same name).
  {
    cardNumber: 'OP05-015',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Revolutionary Army', excludeSelfName: true } },
  },
  // OP05-025 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  {
    cardNumber: 'OP05-025',
    templateId: 'activateMainRest',
    params: { filter: { maxCost: 3 }, cost: [{ kind: 'restThis' }] },
  },
  // OP05-064 — [On Play] Look at 5; add up to 1 Kid Pirates (excl. same name).
  {
    cardNumber: 'OP05-064',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Kid Pirates', excludeSelfName: true } },
  },
  // OP05-117 — [On Play] Look at 5; add up to 1 Sky Island type.
  {
    cardNumber: 'OP05-117',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Sky Island' } },
  },

  // OP06 -----------------------------------------------------------------------

  // OP06-007 — [On Play] K.O. up to 1 of your opponent's Characters with 10000 power or less.
  { cardNumber: 'OP06-007', templateId: 'onPlayKoOpponentCharacter', params: { filter: { maxPower: 10000 } } },
  // OP06-050 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP06-050',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Navy', excludeSelfName: true } },
  },

  // OP07 -----------------------------------------------------------------------

  // OP07-044 — [On Play] Draw 1 card.
  { cardNumber: 'OP07-044', templateId: 'onPlayDraw', params: { amount: 1 } },
  // OP07-046 — [On Play] Look at 5; add up to 1 The Seven Warlords of the Sea.
  {
    cardNumber: 'OP07-046',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'The Seven Warlords of the Sea' } },
  },

  // OP08 -----------------------------------------------------------------------

  // OP08-034 — [On Play] Look at 5; add up to 1 Minks (excl. same name).
  {
    cardNumber: 'OP08-034',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Minks', excludeSelfName: true } },
  },
  // OP08-080 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP08-080',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } },
  },
  // OP08-087 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −1 cost.
  // Note: [Blocker] is an engine keyword flag, not an IR ability. Only the activate effect is templated.
  {
    cardNumber: 'OP08-087',
    templateId: 'activateMainModifyCostOpponent',
    params: { amount: -1, oncePerTurn: true },
  },

  // OP09 -----------------------------------------------------------------------

  // OP09-002 — [On Play] Look at 5; add up to 1 Red-Haired Pirates.
  {
    cardNumber: 'OP09-002',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Red-Haired Pirates' } },
  },
  // OP09-003 — [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  { cardNumber: 'OP09-003', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -2000 } },

  // OP10 -----------------------------------------------------------------------

  // OP10-004 — [On Play] Look at 5; add up to 1 Punk Hazard (excl. same name).
  {
    cardNumber: 'OP10-004',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Punk Hazard', excludeSelfName: true } },
  },
  // OP10-111 — [On Play] Look at 5; add up to 1 Supernovas (excl. same name).
  {
    cardNumber: 'OP10-111',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Supernovas', excludeSelfName: true } },
  },

  // OP12 -----------------------------------------------------------------------

  // OP12-104 — [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP12-104', templateId: 'triggerKoOpponentCharacter', params: { filter: { maxCost: 4 } } },

  // OP13 -----------------------------------------------------------------------

  // OP13-013 — [On Play] K.O. up to 1 of your opponent's Characters with 0 power.
  { cardNumber: 'OP13-013', templateId: 'onPlayKoOpponentCharacter', params: { filter: { maxPower: 0 } } },

  // OP14 -----------------------------------------------------------------------

  // OP14-015 — [Rush] [When Attacking] Give up to 1 of your opponent's Characters −1000 power.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking effect is templated.
  { cardNumber: 'OP14-015', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -1000 } },

  // OP15 -----------------------------------------------------------------------

  // OP15-040 — [On Play] Look at 3; add up to 1 Dressrosa type.
  {
    cardNumber: 'OP15-040',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 3, pick: 1, filter: { typeIncludes: 'Dressrosa' } },
  },
  // OP15-108 — [On Play] Look at 3; add up to 1 Sky Island type.
  {
    cardNumber: 'OP15-108',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 3, pick: 1, filter: { typeIncludes: 'Sky Island' } },
  },

  // OP16 -----------------------------------------------------------------------

  // OP16-064 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP16-064',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Navy', excludeSelfName: true } },
  },
  // OP16-072 — [On Play] Look at 5; add up to 1 Impel Down type.
  {
    cardNumber: 'OP16-072',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Impel Down' } },
  },
];
