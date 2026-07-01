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
  // OP02-096 - [On Play] Draw 1. [When Attacking] Give opponent Character -4 cost this turn.
  {
    cardNumber: 'OP02-096',
    templates: [
      { templateId: 'onPlayDraw', params: { amount: 1 } },
      { templateId: 'whenAttackingModifyCostOpponent', params: { amount: -4 } },
    ],
  },
  // OP02-058 - [On Play] Look at 5; add blue Impel Down card other than this card's name.
  {
    cardNumber: 'OP02-058',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { color: 'blue', typeIncludes: 'Impel Down', excludeSelfName: true } },
  },
  // OP02-083 - [On Play] Look at 5; add purple Impel Down card other than this card's name.
  {
    cardNumber: 'OP02-083',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { color: 'purple', typeIncludes: 'Impel Down', excludeSelfName: true } },
  },

  // OP03 -----------------------------------------------------------------------

  // OP03-011 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  // OP03-003 - [On Play] Look at 5; add Whitebeard Pirates card other than this card's name.
  {
    cardNumber: 'OP03-003',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Whitebeard Pirates', excludeSelfName: true } },
  },

  // OP03-009 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP03-009', templateId: 'activateMainGiveDon', params: { count: 1 } },

  { cardNumber: 'OP03-011', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -2000, donRequired: 1 } },

  // OP03-062 — [On Play] Look at 5; add up to 1 Water Seven type (excl. same name).
  {
    cardNumber: 'OP03-062',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Water Seven', excludeSelfName: true } },
  },
  // OP03-044 - [On Play] Draw 2 cards, then trash 2 cards from hand.
  { cardNumber: 'OP03-044', templateId: 'onPlayDrawAndTrash', params: { drawCount: 2, trashCount: 2 } },
  // OP03-112 - [On Play] Look at 4; add [Sanji] or Big Mom Pirates other than this card's name.
  {
    cardNumber: 'OP03-112',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ name: 'Sanji' }, { typeIncludes: 'Big Mom Pirates' }], excludeSelfName: true } },
  },
  // OP03-086 - [On Play] If Leader type includes CP, look at 3; add CP card other than this card's name, trash rest.
  {
    cardNumber: 'OP03-086',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 3, pick: 1, filter: { typeIncludes: 'CP', excludeSelfName: true }, remainder: 'trash', gate: [{ kind: 'leaderType', type: 'CP' }] },
  },
  // OP03-089 - [On Play] Look at 3; add Navy other than this card's name, trash rest.
  {
    cardNumber: 'OP03-089',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 3, pick: 1, filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' },
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
  // OP04-092 - [On Play] Look at 3; add Dressrosa other than this card's name, trash rest.
  {
    cardNumber: 'OP04-092',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 3, pick: 1, filter: { typeIncludes: 'Dressrosa', excludeSelfName: true }, remainder: 'trash' },
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
  // OP06-025 - [On Play] Look at 4; add Fish-Man or Merfolk other than this card's name.
  {
    cardNumber: 'OP06-025',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], excludeSelfName: true } },
  },

  // OP07 -----------------------------------------------------------------------

  // OP07-044 — [On Play] Draw 1 card.
  { cardNumber: 'OP07-044', templateId: 'onPlayDraw', params: { amount: 1 } },
  // OP07-054 - [Blocker] [On Play] Draw 1 card.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw is templated.
  { cardNumber: 'OP07-054', templateId: 'onPlayDraw', params: { amount: 1 } },
  // OP07-015 - [Rush] [On Play] Give up to 2 rested DON!! to Leader/Character.
  // Note: [Rush] is an engine keyword flag. Only the on-play DON!! attach is templated.
  { cardNumber: 'OP07-015', templateId: 'onPlayGiveDon', params: { count: 2 } },
  // OP07-046 — [On Play] Look at 5; add up to 1 The Seven Warlords of the Sea.
  {
    cardNumber: 'OP07-046',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'The Seven Warlords of the Sea' } },
  },
  // OP07-022 - [On Play] Look at 5; add green Land of Wano other than this card's name.
  {
    cardNumber: 'OP07-022',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { color: 'green', typeIncludes: 'Land of Wano', excludeSelfName: true } },
  },
  // OP07-041 - [On Play] Look at 5; add Amazon Lily or Kuja Pirates other than this card's name.
  {
    cardNumber: 'OP07-041',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { anyOf: [{ typeIncludes: 'Amazon Lily' }, { typeIncludes: 'Kuja Pirates' }], excludeSelfName: true } },
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
  // OP08-015 - [On Play] Look at 4; add [Tony Tony.Chopper] or Drum Kingdom other than this card's name.
  {
    cardNumber: 'OP08-015',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ name: 'Tony Tony.Chopper' }, { typeIncludes: 'Drum Kingdom' }], excludeSelfName: true } },
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
  // OP09-048 - [Blocker] [On Play] Draw 2 cards and trash 1 card from hand.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw/trash is templated.
  { cardNumber: 'OP09-048', templateId: 'onPlayDrawAndTrash', params: { drawCount: 2, trashCount: 1 } },
  // OP09-056 - [On Play] Look at 4; add Cross Guild or type including Baroque Works other than this card's name.
  {
    cardNumber: 'OP09-056',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ typeIncludes: 'Cross Guild' }, { typeIncludes: 'Baroque Works' }], excludeSelfName: true } },
  },
  // OP09-069 - [On Play] Look at 4; add Straw Hat Crew or Heart Pirates with cost 2+.
  {
    cardNumber: 'OP09-069',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { typeIncludes: 'Heart Pirates' }], minCost: 2 } },
  },

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

  // OP11 -----------------------------------------------------------------------

  // OP11-016 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP11-016', templateId: 'activateMainGiveDon', params: { count: 1 } },
  // OP11-029 - [Blocker] [On Play] Rest up to 1 opponent Character with cost 1 or less.
  // Note: [Blocker] is an engine keyword flag. Only the on-play rest is templated.
  { cardNumber: 'OP11-029', templateId: 'onPlayRestOpponentCharacter', params: { filter: { maxCost: 1 } } },
  // OP11-048 - [On Play] Look at 4; add Firetank Pirates or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP11-048',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ typeIncludes: 'Firetank Pirates' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } },
  },
  // OP11-047 - [On Play] If Leader has The Vinsmoke Family, look at 5; add GERMA, trash rest.
  {
    cardNumber: 'OP11-047',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'GERMA' }, remainder: 'trash', gate: [{ kind: 'leaderType', type: 'The Vinsmoke Family' }] },
  },

  // OP12 -----------------------------------------------------------------------

  // OP12-104 — [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP12-104', templateId: 'triggerKoOpponentCharacter', params: { filter: { maxCost: 4 } } },
  // OP12-108 - [On Play] Look at 5; add up to 1 [Trafalgar Law].
  {
    cardNumber: 'OP12-108',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { name: 'Trafalgar Law' } },
  },
  // OP12-006 - [On Play] Look at 5; add [Monkey.D.Luffy] or red Event.
  {
    cardNumber: 'OP12-006',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { category: 'event', color: 'red' }] } },
  },
  // OP12-071 - [On Play] Look at 4; add [Sanji] or Event.
  {
    cardNumber: 'OP12-071',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] } },
  },
  // OP12-086 - [On Play] If Leader has Revolutionary Army, look at 3; add Revolutionary Army other than self or [Nico Robin], trash rest.
  {
    cardNumber: 'OP12-086',
    templateId: 'onPlaySearchTopDeck',
    params: {
      look: 3,
      pick: 1,
      filter: { anyOf: [{ typeIncludes: 'Revolutionary Army', excludeSelfName: true }, { name: 'Nico Robin' }] },
      remainder: 'trash',
      gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }],
    },
  },

  // OP13 -----------------------------------------------------------------------

  // OP13-013 — [On Play] K.O. up to 1 of your opponent's Characters with 0 power.
  { cardNumber: 'OP13-013', templateId: 'onPlayKoOpponentCharacter', params: { filter: { maxPower: 0 } } },
  // OP13-065 - [On Play] Look at 5; add Roger Pirates card other than this card's name.
  {
    cardNumber: 'OP13-065',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 5, pick: 1, filter: { typeIncludes: 'Roger Pirates', excludeSelfName: true } },
  },
  // OP13-093 - [Blocker] [On Play] Draw 2 cards, then trash 2 cards from hand.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw/trash is templated.
  { cardNumber: 'OP13-093', templateId: 'onPlayDrawAndTrash', params: { drawCount: 2, trashCount: 2 } },
  // OP13-012 - [On Play] Look at 4; add Alabasta or Straw Hat Crew with cost 2+.
  {
    cardNumber: 'OP13-012',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { anyOf: [{ typeIncludes: 'Alabasta' }, { typeIncludes: 'Straw Hat Crew' }], minCost: 2 } },
  },

  // OP14 -----------------------------------------------------------------------

  // OP14-015 — [Rush] [When Attacking] Give up to 1 of your opponent's Characters −1000 power.
  // Note: [Rush] is an engine keyword flag. Only the when-attacking effect is templated.
  // OP14-005 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP14-005', templateId: 'activateMainGiveDon', params: { count: 1 } },

  { cardNumber: 'OP14-015', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -1000 } },
  // OP14-087 - [On Play] If Leader type includes Baroque Works, look at 4; add Baroque Works other than self, trash rest.
  {
    cardNumber: 'OP14-087',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { typeIncludes: 'Baroque Works', excludeSelfName: true }, remainder: 'trash', gate: [{ kind: 'leaderType', type: 'Baroque Works' }] },
  },

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

  // OP16-052 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP16-052', templateId: 'activateMainGiveDon', params: { count: 1 } },

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
  // OP16-091 - [On Play] If Leader has Land of Wano, look at 4; add Land of Wano other than self, trash rest.
  {
    cardNumber: 'OP16-091',
    templateId: 'onPlaySearchTopDeck',
    params: { look: 4, pick: 1, filter: { typeIncludes: 'Land of Wano', excludeSelfName: true }, remainder: 'trash', gate: [{ kind: 'leaderType', type: 'Land of Wano' }] },
  },
];
