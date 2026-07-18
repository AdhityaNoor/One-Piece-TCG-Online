/**
 * Reviewed effect template assignments - Main Booster OP03.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP03_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP03-001 (leader) King — When this Leader attacks or is attacked, trash any number of Event/Stage from hand → +1000 power per card this battle.
  {
    cardNumber: 'OP03-001',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          functions: [
            { fn: 'optionalTrashFromHand', anyNumber: true, filter: { anyOf: [{ category: 'event' }, { category: 'stage' }] } },
            { fn: 'addPowerSelfPerPreviousTrashed', amountPer: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          functions: [
            { fn: 'optionalTrashFromHand', anyNumber: true, filter: { anyOf: [{ category: 'event' }, { category: 'stage' }] } },
            { fn: 'addPowerSelfPerPreviousTrashed', amountPer: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },
  // OP03-002 — [DON!! x1] [When Attacking] opp cannot activate [Blocker] Characters with 2000 or less power.
  { cardNumber: 'OP03-002', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle', blockerPowerAtMost: 2000 }] } },

  // OP03-011 — [DON!! x1] [When Attacking] Give up to 1 of your opponent's Characters −2000 power.
  // OP03-003 - [On Play] Look at 5; add Whitebeard Pirates card other than this card's name.
  {
    cardNumber: 'OP03-003',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Whitebeard Pirates', excludeSelfName: true } }] },
  },

  // OP03-004 — Cannot attack Leader on play turn; [DON!! x1] gains [Rush].
  {
    cardNumber: 'OP03-004',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'preventAttackLeaderWhileSummoningSick', duration: 'permanent' },
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 1 } },
      ],
    },
  },

  // OP03-005 — [Activate: Main] [Once Per Turn] this +2000 this turn; trash this Character at end of turn.
  { cardNumber: 'OP03-005', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }, { fn: 'trashSelfAtEndOfTurn' }] } },

  // OP03-008 — This Character cannot be K.O.'d in battle by <Slash> attribute cards.
  //   [On Play] Look at 5; reveal up to 1 red Event to hand, rest to bottom.
  {
    cardNumber: 'OP03-008',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', attackerAttribute: 'slash' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event', color: 'red' }, remainder: 'bottom' }] } },
    ],
  },

  // OP03-009 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP03-009', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  { cardNumber: 'OP03-011', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP03-012 — [When Attacking] trash 1 red Character with 4000+ current power: draw 1, this +1000 this battle.
  { cardNumber: 'OP03-012', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { color: 'red', minPower: 4000 } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP03-013 — [Your Turn] [On Play] K.O. power<=3000. [On K.O.] trash 1 Event: play this from trash rested.
  {
    cardNumber: 'OP03-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { category: 'event' }, optional: true },
        { fn: 'playFromTrash', filter: { name: 'Marco' }, rested: true, ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP03-014 — [When Attacking] Play up to 1 red Character (cost 1) from hand.
  { cardNumber: 'OP03-014', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', exactCost: 1 } }] } },

  // OP03-015 — [Blocker] [Opponent's Turn] When this Character is K.O.'d, give up to 1 opp Leader/Character −2000 this turn.
  { cardNumber: 'OP03-015', templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  // OP03-016 — (Event) [Main] If Leader [Portgas.D.Ace], K.O. up to 1 opp Character (8000 power or less); Leader gains [Double Attack] and +3000 this turn. [Trigger] K.O. up to 1 opp Character (6000 power or less).
  {
    cardNumber: 'OP03-016',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Portgas.D.Ace' }], functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 8000 } }, optional: true },
        { fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'doubleAttack', duration: 'duringThisTurn' },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisTurn' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 6000 } }, optional: true }] } },
    ],
  },

  // OP03-017 - [Main]/[Counter] If Leader has Whitebeard Pirates, give opponent Character -4000. [Trigger] activates Main.
  {
    cardNumber: 'OP03-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP03-018 — [Main] trash 1 Event: K.O. power<=5000 and power<=4000. [Trigger] K.O. power<=5000.
  {
    cardNumber: 'OP03-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'trashTypeFromHand', count: 1, filter: { category: 'event' }, optional: true },
        { fn: 'ko', ifPrevious: 'previousSelectedAny', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true, maxTargets: 1 },
        { fn: 'ko', ifPrevious: 'previousSelectedAny', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP03-019 - [Main] Leader +4000. [Trigger] opponent Leader/Character -10000.
  {
    cardNumber: 'OP03-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -10000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP03-020 — [Activate: Main] rest 2 DON!! + rest this Stage: if Leader [Portgas.D.Ace], look 5 add Event.
  { cardNumber: 'OP03-020', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }, { kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Portgas.D.Ace' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event' }, remainder: 'bottom' }] } },

  // OP03-021 — [Activate: Main] DON!!−3: rest 2 {East Blue} → set Leader active + rest opp cost≤5.
  { cardNumber: 'OP03-021', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'East Blue' } }, optional: true, maxTargets: 2 },
    { fn: 'setActiveSelf', ifPrevious: 'previousSelectedAny' },
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP03-022 — (Leader) [DON!! x2] [When Attacking] rest 1 DON!!: play up to 1 Character cost<=4 with a [Trigger] from hand.
  { cardNumber: 'OP03-022', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 4, hasTrigger: true } }] } },

  // OP03-024 - [On Play] If Leader has East Blue, rest up to 2 opponent Characters cost 4 or less.
  { cardNumber: 'OP03-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 2 }] } },

  // OP03-025 — [On Play] trash 1 from hand: K.O. up to 2 rested opp cost<=4. [DON!! x1] [Double Attack].
  {
    cardNumber: 'OP03-025',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true, maxTargets: 2 },
      ] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
    ],
  },

  // OP03 coverage batch: East Blue trigger-play characters and Big Mom trigger-play support.
  {
    cardNumber: 'OP03-026',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP03-027 — [On Play] If Leader {East Blue}, rest up to 1 opp Character cost<=2; and if you don't have [Buchi], play up to 1 [Buchi] from hand.
  { cardNumber: 'OP03-027', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Buchi' }, ifGate: [{ kind: 'selfDoesNotControlNamed', name: 'Buchi' }] },
  ] } },

  // OP03-028 — [On Play] choose one: set East Blue Leader/Character cost<=6 active, or rest self + up to 1 opp Character.
  { cardNumber: 'OP03-028', templateId: 'ability', params: { timing: 'onPlay', functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one:',
    options: [
      { label: 'setActiveEastBlue', functions: [{ fn: 'setActiveControllerLeaderOrCharacter', filter: { typeIncludes: 'East Blue', maxCost: 6 }, maxTargets: 1 }] },
      { label: 'restBoth', functions: [{ fn: 'restSelf' }, { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 1 }] },
    ],
  }] } },

  {
    cardNumber: 'OP03-029',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  {
    cardNumber: 'OP03-030',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { color: 'green', typeIncludes: 'East Blue', excludeSelfName: true } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP03-032 (character) Buggy —
  //   This Character cannot be K.O.'d in battle by <Slash> attribute cards.
  { cardNumber: 'OP03-032', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', attackerAttribute: 'slash' }] } },

  // OP03-033 — [Trigger] If Leader {East Blue}, play this card.
  { cardNumber: 'OP03-033', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP03-034 - [On Play] K.O. opponent rested Character with cost 2 or less.
  { cardNumber: 'OP03-034', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 2 } }, optional: true }] } },

  // OP03-037 — (Event) [Main] rest 1 {East Blue} Character: K.O. up to 1 opp rested Character cost<=3. [Trigger] play up to 1 Character cost<=4 with a [Trigger] from hand.
  {
    cardNumber: 'OP03-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'East Blue' } }, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 4, hasTrigger: true } }] } },
    ],
  },

  // OP03-036 — [Main] rest 1 East Blue Character: set [Kuro] active.
  // [Trigger] K.O. rested opp cost<=3.
  {
    cardNumber: 'OP03-036',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'East Blue' } }, optional: true },
        { fn: 'setActiveControllerLeaderOrCharacter', filter: { name: 'Kuro' }, maxTargets: 1, ifPrevious: 'previousSelectedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP03-038 - [Main] Rest up to 2 opponent Characters cost 2 or less. [Trigger] rest cost 5 or less.
  {
    cardNumber: 'OP03-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // OP03-039 - [Main] Rest cost 1 or less, then your Character +1000. [Trigger] rest cost 4 or less.
  {
    cardNumber: 'OP03-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP03-040 (leader) Nami —
  //   When your deck is reduced to 0, you win the game instead of losing, according to the rules.[DON!! x1]
  //   When this Leader's attack deals damage to your opponent's Life, you may trash 1 card from the top of
  //   your deck.
  {
    cardNumber: 'OP03-040',
    templates: [
      { templateId: 'ability', params: { timing: 'startOfGame', functions: [{ fn: 'replaceEmptyDeckDefeatWithWin' }] } },
      { templateId: 'ability', params: { timing: 'onLifeDamageDealt', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'trashTopDeck', count: 1, optional: true }] } },
    ],
  },

  // OP03-041 — [DON!! x1] When this Character's attack deals Life damage, trash 7 from deck top.
  { cardNumber: 'OP03-041', templateId: 'ability', params: { timing: 'onLifeDamageDealt', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'trashTopDeck', count: 7, optional: true }] } },

  // OP03-042 — [On Play] Add up to 1 blue [Usopp] from trash to hand.
  { cardNumber: 'OP03-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { color: 'blue', name: 'Usopp' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP03-043 — [When you deal damage to opponent's Life] you may trash 3 from top of deck. If you do, trash this Character.
  {
    cardNumber: 'OP03-043',
    templateId: 'ability',
    params: {
      timing: 'onLifeDamageDealt',
      functions: [
        { fn: 'trashTopDeck', count: 3, optional: true },
        { fn: 'trashSelf', ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // OP03-044 - [On Play] Draw 2 cards, then trash 2 cards from hand.
  { cardNumber: 'OP03-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP03-045 — [Blocker] [Opponent's Turn] If 20 or less cards in deck, this Character +3000.
  { cardNumber: 'OP03-045', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfDeckCount', atMost: 20 }] } }] } },

  // OP03-047 - [DON!! x1] on Life damage trash 7 from deck. [On Play] return cost<=3 + trash 2 from deck.
  {
    cardNumber: 'OP03-047',
    templates: [
      { templateId: 'ability', params: { timing: 'onLifeDamageDealt', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'trashTopDeck', count: 7, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'trashTopDeck', count: 2 },
      ] } },
    ],
  },

  // OP03-048 - [On Play] If Leader is Nami, return opponent Character cost 5 or less.
  { cardNumber: 'OP03-048', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Nami' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP03-049 — [On Play] If 20 or less cards in deck, return up to 1 Character cost<=3 to hand.
  { cardNumber: 'OP03-049', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDeckCount', atMost: 20 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP03-050 — [Blocker] [On K.O.] trash 1 from top of deck.
  { cardNumber: 'OP03-050', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 1 }] } },

  // OP03-051 - [DON!! x1] on Life damage trash 7 from deck. [On K.O.] trash 3 from deck.
  {
    cardNumber: 'OP03-051',
    templates: [
      { templateId: 'ability', params: { timing: 'onLifeDamageDealt', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'trashTopDeck', count: 7, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
    ],
  },

  // OP03-053 — [DON!! x1] if 20 or less cards in deck, +2000
  { cardNumber: 'OP03-053', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfDeckCount', atMost: 20 }] } }] } },

  // OP03-054 — (Event) [Counter] +2000 battle, then trash 1 from top of deck. [Trigger] draw 1 and trash 1 from top of deck.
  {
    cardNumber: 'OP03-054',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'trashTopDeck', count: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },

  // OP03-055 — (Event) [Counter] trash 1 from hand: Leader +4000 battle, then trash 2 from top of deck. [Trigger] return up to 1 Character cost<=4 to hand.
  {
    cardNumber: 'OP03-055',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
        { fn: 'trashTopDeck', count: 2 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP03-056 - [Main] Draw 2 cards. [Trigger] activates the Main effect.
  {
    cardNumber: 'OP03-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP03-057 — (Event) [Main] Place up to 1 Character cost<=5 at bottom of deck. [Trigger] Place up to 1 Character cost<=3 at bottom of deck.
  {
    cardNumber: 'OP03-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP03-058 — [Activate: Main] DON!! −1: you may rest this Leader → play {Galley-La Company} cost≤5 from hand. Cannot attack is static below.
  {
    cardNumber: 'OP03-058',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { group: 'leader', player: 'controller' }, duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'donMinus', count: 1 }],
          functions: [
            { fn: 'rest', target: { group: 'leader', player: 'controller' }, optional: true },
            { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Galley-La Company', maxCost: 5 }, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
    ],
  },

  // OP03-059 — [When Attacking] DON!! −1: this Character gains [Banish] during this battle.
  { cardNumber: 'OP03-059', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'duringThisBattle' }] } },

  // OP03-060 - [When Attacking] DON!! -1: draw 2, then trash 1.
  { cardNumber: 'OP03-060', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP03-062 — [On Play] Look at 5; add up to 1 Water Seven type (excl. same name).
  {
    cardNumber: 'OP03-062',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Water Seven', excludeSelfName: true } }] },
  },

  // OP03-063 - [Blocker] [On Play] DON!! -1: if Leader has Water Seven, draw 1.
  // Note: [Blocker] is an engine keyword flag. Only the on-play draw is templated.
  { cardNumber: 'OP03-063', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP03-064 - [On K.O.] If Leader has Galley-La Company, add 1 DON!! rested.
  { cardNumber: 'OP03-064', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Galley-La Company' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP03-066 — [On Play] rest 2 DON!!: add 1 DON!! from deck active; then if 8+ DON!! on field, K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'OP03-066', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [
    { fn: 'addDonFromDeck', count: 1, rested: false },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, ifGate: [{ kind: 'selfDonFieldCount', atLeast: 8 }] },
  ] } },

  // OP03-067 - [DON!! x1] [When Attacking] If Leader has Galley-La Company, add 1 DON!! rested.
  { cardNumber: 'OP03-067', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderType', type: 'Galley-La Company' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP03-068 — [Banish] [On K.O.] If Leader {Impel Down}, add 1 DON!! from deck rested.
  { cardNumber: 'OP03-068', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP03-069 - [On K.O.] If Leader has Impel Down, draw 2 then trash 1.
  { cardNumber: 'OP03-069', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP03-070 — [On Play] DON!! −1: trash 1 Character cost 5 from hand → this gains [Rush] this turn.
  { cardNumber: 'OP03-070', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', exactCost: 5 }, optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP03-071 - [When Attacking] DON!! -1: rest opponent Character cost 5 or less.
  { cardNumber: 'OP03-071', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  // OP03-072 — (Event) [Counter] trash 1 from hand: +3000 battle. [Trigger] add 1 DON!! from deck active.
  {
    cardNumber: 'OP03-072',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },

  // OP03-073 - [Main] DON!! -1: if Leader has Water Seven, K.O. cost 2 or less. [Trigger] activates Main.
  {
    cardNumber: 'OP03-073',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Water Seven' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },

  // OP03-074 — (Event) [Main] DON!! −2: place up to 1 opp Character cost<=4 at bottom of deck. [Trigger] Activate [Main].
  {
    cardNumber: 'OP03-074',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP03-075 - [Activate: Main] Rest this Stage: if Leader is Iceburg, add 1 DON!! rested.
  { cardNumber: 'OP03-075', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderName', name: 'Iceburg' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP03-079 — [DON!! x1] cannot be K.O.'d in battle
  { cardNumber: 'OP03-079', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },

  // OP03-080 — [On Play] place 2 CP from trash at bottom: K.O. up to 1 opp Character cost<=3.
  { cardNumber: 'OP03-080', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }, { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP03-076 — [Your Turn] [Once Per Turn] when opp Character is K.O.'d, you may trash 2 hand: set this Leader active.
  {
    cardNumber: 'OP03-076',
    templateId: 'ability',
    params: {
      timing: 'onCharacterKoed',
      oncePerTurn: true,
      condition: { turn: 'your' },
      gate: [{ kind: 'koedCharacterController', player: 'opponent' }],
      functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'setActiveControllerLeader', ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // OP03-077 — [DON!! x2][When Attacking] rest 2 DON!! + trash 1 hand → if ≤1 Life, deck top to Life.
  {
    cardNumber: 'OP03-077',
    templateId: 'ability',
    params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, cost: [{ kind: 'restDon', count: 2 }], functions: [
      { fn: 'optionalTrashFromHand', count: 1 },
      { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 1 }] },
    ] },
  },

  // OP03-078 - [DON!! x1][Your Turn] opponent Characters -3 cost. [On Play] if opponent has 6+ hand, trash 2 from their hand.
  {
    cardNumber: 'OP03-078',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -3, duration: 'permanent', sourceCondition: { donAttachedAtLeast: 1, turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 6 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 2 }] } },
    ],
  },

  // OP03-081 - [On Play] Draw 2, trash 2, then give opponent Character -2 cost.
  { cardNumber: 'OP03-081', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true }] } },

  // OP03-083 — [On Play] Look at 5 cards from the top of your deck and trash up to 2, then place the rest at the bottom in any order.
  { cardNumber: 'OP03-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'trash', remainder: 'bottom' }] } },

  // OP03-086 - [On Play] If Leader type includes CP, look at 3; add CP card other than this card's name, trash rest.
  {
    cardNumber: 'OP03-086',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'CP' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'CP', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP03-088 — cannot be K.O.'d by effects
  { cardNumber: 'OP03-088', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent' }] } },

  // OP03-089 - [On Play] Look at 3; add Navy other than this card's name, trash rest.
  {
    cardNumber: 'OP03-089',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP03-090 — [DON!! x1] [Blocker]. [On K.O.] play up to 1 CP cost<=4 from trash rested.
  {
    cardNumber: 'OP03-090',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'CP', maxCost: 4 }, rested: true }] } },
    ],
  },

  // OP03-091 — [On Play] set up to 1 opp vanilla Character cost to 0 this turn.
  { cardNumber: 'OP03-091', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setBaseCost', target: { group: 'characters', player: 'opponent', filter: { noBaseEffect: true } }, value: 0, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP03-092 — [On Play] place 2 CP from trash at bottom: this Character gains [Rush] this turn.
  { cardNumber: 'OP03-092', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'CP' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }, { fn: 'addKeyword', ifPrevious: 'previousMovedAny', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },

  // OP03-093 — [On Play] trash 1 from hand: if Leader CP, K.O. up to 1 opp Character cost<=1.
  { cardNumber: 'OP03-093', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'ko', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'leaderType', type: 'CP' }], target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
  ] } },

  // OP03-094 — [Main] if Leader CP, look 5 play CP cost<=5, trash rest. [Trigger] play black Character cost<=3 from trash.
  {
    cardNumber: 'OP03-094',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'CP' }], functions: [
        { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'CP', maxCost: 5 }, remainder: 'trash' },
        { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'CP', maxCost: 5 } },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromTrash', filter: { category: 'character', color: 'black', maxCost: 3 }, rested: false }] } },
    ],
  },

  // OP03-095 — (Event) [Main] Give up to 2 opp Characters −2 cost this turn. [Trigger] opponent trashes 1 from hand.
  {
    cardNumber: 'OP03-095',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },

  // OP03-096 — [Main] choose one: K.O. cost-0 Character or trash opp Stage cost<=3. [Trigger] draw 2.
  {
    cardNumber: 'OP03-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'koCost0', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true, maxTargets: 1 }] },
          { label: 'trashStage', functions: [{ fn: 'moveCards', from: { zone: 'stages', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 }] },
        ],
      }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP03-097 — (Event) [Counter] trash 1 from hand: +3000 battle. [Trigger] draw 1, then K.O. up to 1 opp Character cost<=1.
  {
    cardNumber: 'OP03-097',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
      ] } },
    ],
  },

  // OP03-098 — [Activate: Main] rest this Stage: if Leader CP, give up to 1 opp Character −2 cost. [Trigger] play this.
  {
    cardNumber: 'OP03-098',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'CP' }], functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP03-099 — (Leader) [DON!! x1] [When Attacking] look at top of your or opponent's Life, place top/bottom; then this Leader +1000 battle.
  { cardNumber: 'OP03-099', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle' },
  ] } },

  // OP03-100 — [Trigger] trash 1 from top or bottom of Life: play this card.
  { cardNumber: 'OP03-100', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'trash', player: 'owner' }, optional: true },
    { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP03-102 — [DON!! x2] [When Attacking] add Life top/bottom to hand: add deck top to Life top.
  { cardNumber: 'OP03-102', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
  ] } },

  // OP03-104 — [Blocker] [On Play] Look at top of your or opponent's Life, place it top or bottom.
  { cardNumber: 'OP03-104', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // OP03-105 — [DON!! x1] [When Attacking] you may trash 1 card with a [Trigger] from hand: this Character +3000 battle.
  { cardNumber: 'OP03-105', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'addPowerSelf', amount: 3000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP03-108 — [DON!! x1] if less Life than opponent, [Double Attack] +1000. [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'OP03-108',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'doubleAttack', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfLifeLessThanOpponent' }] } },
        { fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfLifeLessThanOpponent' }] } },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP03-109 — [On Play] trash 1 from top/bottom of Life: add deck top to Life top.
  { cardNumber: 'OP03-109', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'trash', player: 'owner' }, optional: true },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
  ] } },

  // OP03-110 — [When Attacking] add Life top/bottom to hand: +2000 this battle. [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'OP03-110',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
        { fn: 'addPowerSelf', amount: 2000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP03-112 - [On Play] Look at 4; add [Sanji] or Big Mom Pirates other than this card's name.
  {
    cardNumber: 'OP03-112',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { typeIncludes: 'Big Mom Pirates' }], excludeSelfName: true } }] },
  },

  // OP03-113 — [On K.O.] look 3, reveal up to 1 {Big Mom Pirates}, add to hand, rest to bottom. [Trigger] trash 1 from hand: play this.
  {
    cardNumber: 'OP03-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
      ] } },
    ],
  },

  // OP03-114 - [On Play] if Leader Big Mom Pirates, add deck top to Life, then trash top opponent Life.
  { cardNumber: 'OP03-114', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [
    { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
    { fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' }, optional: true },
  ] } },

  // OP03-115 — [On Play] you may trash 1 card with a [Trigger] from hand: K.O. up to 1 opp Character cost<=1.
  { cardNumber: 'OP03-115', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  {
    cardNumber: 'OP03-116',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  {
    cardNumber: 'OP03-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Linlin' } }, amount: 1000, duration: 'untilStartOfNextTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP03-118 — (Event) [Counter] +5000 battle. [Trigger] trash 2 from hand: add 1 top of deck to top of Life.
  {
    cardNumber: 'OP03-118',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 5000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true },
      ] } },
    ],
  },

  // OP03-119 — (Event) [Main] If less Life than opponent, K.O. up to 1 opp Character cost<=4. [Trigger] play up to 1 Character cost<=4 with a [Trigger] from hand.
  {
    cardNumber: 'OP03-119',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfLifeLessThanOpponent' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 4, hasTrigger: true } }] } },
    ],
  },

  // OP03-120 — [Main] if opp Life>=4, trash up to 1 from top of opp Life. [Trigger] activates [Main].
  {
    cardNumber: 'OP03-120',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'opponentLife', atLeast: 4 }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atLeast: 4 }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true }] } },
    ],
  },

  // OP03-121 — [Main] trash 1 from top of Life: K.O. opp cost<=5. [Trigger] K.O. opp cost<=5.
  {
    cardNumber: 'OP03-121',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'trash', player: 'owner' }, optional: true },
        { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // OP03-122 — [On Play] Return up to 1 Character cost<=6 to hand; then draw 2 and trash 2 from hand.
  { cardNumber: 'OP03-122', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
    { fn: 'drawAndTrash', drawCount: 2, trashCount: 2 },
  ] } },

  // OP03-123 — [On Play] Add up to 1 Character cost<=8 to the top or bottom of owner's Life face-up.
  { cardNumber: 'OP03-123', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 8 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true }] } },

];
