/**
 * Reviewed effect template assignments - Main Booster OP06.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP06_ASSIGNMENTS: CardEffectAssignment[] = [

  // --- Batch: OP06 cards expressible with existing primitives (no new capability) ---
  // --- Batch 2: further OP06 cards expressible with existing primitives ---
  // --- Batch 3: remaining OP06 cleanly-expressible cards (life-to-hand buffs, conditional immunity) ---
  // OP06-001 — [When Attacking] trash 1 {FILM} from hand: opp Character −2000, add 1 rested DON!!.
  { cardNumber: 'OP06-001', templateId: 'ability', params: { timing: 'whenAttacking', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'FILM' }, optional: true },
    { fn: 'addPower', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
    { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP06-002 — [Opponent's Turn] If this Character has 7000+ power, gains [Banish].
  { cardNumber: 'OP06-002', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'banish', duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'selfInstancePowerAtLeast', power: 7000 }] } }] } },
  // OP06-003 — [On Play] Look at 3; play up to 1 {Revolutionary Army} Character power<=5000; rest to bottom.
  { cardNumber: 'OP06-003', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000 }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Revolutionary Army', maxPower: 5000 }, maxTargets: 1 },
  ] } },

  // OP06-004 — [On Play] Play up to 1 [Lily Carnation] from your hand.
  { cardNumber: 'OP06-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Lily Carnation' } }] } },

  // OP06-006 — [DON!! x1] [When Attacking] +1000 until start of next turn; trash 1 {FILM} Character at end of turn.
  { cardNumber: 'OP06-006', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'addPowerSelf', amount: 1000, duration: 'untilStartOfNextTurn' },
    { fn: 'trashControllerCharacterAtEndOfTurn', filter: { typeIncludes: 'FILM' } },
  ] } },

  // OP06-007 — [On Play] K.O. up to 1 of your opponent's Characters with 10000 power or less.
  { cardNumber: 'OP06-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 10000 } }, optional: true }] } },

  // OP06-010 — if Leader {FILM}, [Blocker]
  { cardNumber: 'OP06-010', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'FILM' }] } }] } },

  // OP06-012 — if opponent has a Leader/Character with 6000+ base power, cannot be K.O.'d in battle
  { cardNumber: 'OP06-012', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { gate: [{ kind: 'opponentHasCharacterBasePowerAtLeast', power: 6000 }] } }] } },

  // OP06-009 — [Blocker]. [When Attacking]/[On Block] [OPT] become same power as opp Leader until start of your next turn.
  {
    cardNumber: 'OP06-009',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, oncePerTurnKey: 'op06-009-power', functions: [
        { fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'leader', player: 'opponent' }, duration: 'untilStartOfNextTurn' },
      ] } },
      { templateId: 'ability', params: { timing: 'onBlock', oncePerTurn: true, oncePerTurnKey: 'op06-009-power', functions: [
        { fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'leader', player: 'opponent' }, duration: 'untilStartOfNextTurn' },
      ] } },
    ],
  },
  // OP06-011 — [Activate: Main] [Once Per Turn] rest 1 [Uta] card: this +5000 this turn.
  { cardNumber: 'OP06-011', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'rest', target: { group: 'union', targets: [{ group: 'characters', player: 'controller', filter: { name: 'Uta' } }, { group: 'leaderOrStages', player: 'controller', filter: { name: 'Uta' } }] }, optional: true, maxTargets: 1 },
    { fn: 'addPowerSelf', amount: 5000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP06-013 — [On Play] Look at 3; reveal up to 1 {FILM} card, add to hand, rest to bottom. [Trigger] Activate [On Play].
  {
    cardNumber: 'OP06-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'FILM' }, remainder: 'bottom' }] } },
    ],
  },

  // OP06-014 — trash any number of {FILM} from hand; +1000 battle power per card trashed.
  { cardNumber: 'OP06-014', templateId: 'ability', params: { timing: 'onOpponentsAttack', functions: [
    { fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'FILM' }, optional: true, anyNumber: true },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 0, amountPer: 1000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },
  // OP06-015 — [Activate: Main] [Once Per Turn] trash 1 Character with 6000+ current power: play {FILM} cost 2–5 from trash rested.
  { cardNumber: 'OP06-015', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { minPower: 6000 } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'playFromTrash', ifPrevious: 'previousMovedAny', filter: { category: 'character', typeIncludes: 'FILM', minCost: 2, maxCost: 5 }, rested: true, maxTargets: 1 },
  ] } },

  // OP06-016 — [Activate: Main] place this at bottom of deck: give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP06-016', templateId: 'ability', params: { timing: 'activateMain', functions: [
    { fn: 'moveCards', from: { zone: 'characters', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'addPower', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
  ] } },

  // OP06-017 — [Main]/[Counter] add 1 top Life to hand → up to 1 Leader/Char +3000 this turn.
  {
    cardNumber: 'OP06-017',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP06-018 — [Main] +3000; if opp has 7000+ power Character, +1000 more. [Trigger] K.O. power<=5000.
  {
    cardNumber: 'OP06-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, ifGate: [{ kind: 'opponentHasCharacterBasePowerAtLeast', power: 7000 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
    ],
  },

  // OP06-019 - [Main] K.O. power <=5000. [Trigger] K.O. power <=4000.
  {
    cardNumber: 'OP06-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
    ],
  },

  // OP06-020 (leader) Hody Jones —
  //   [Activate: Main] You may rest this Leader: Rest up to 1 of your opponent's DON!! cards or Characters
  //   with a cost of 3 or less. Then, prevent your own effects from adding Life cards to hand this turn.
  {
    cardNumber: 'OP06-020',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'rest', target: { group: 'charactersOrDon', player: 'opponent', filter: { maxCost: 3 } }, optional: true, maxTargets: 1 },
        { fn: 'preventControllerLifeToHand', duration: 'duringThisTurn' },
      ],
    },
  },

  // OP06-021 — [Activate: Main] [Once Per Turn] choose one: rest opp Character cost<=4 or −1 cost.
  { cardNumber: 'OP06-021', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one:',
    options: [
      { label: 'restCost4', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 1 }] },
      { label: 'minus1Cost', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] },
    ],
  }] } },

  // OP06-022 — (Leader) [Activate: Main] [Once Per Turn] If opponent has 3 or less Life, give up to 2 rested DON!! to 1 of your Characters.
  { cardNumber: 'OP06-022', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'giveDon', count: 2 }] } },

  // OP06-023 — [On Play] optional trash 1: rested opp Leader cannot attack until end of opp next turn. [Trigger] rest opp cost≤4.
  {
    cardNumber: 'OP06-023',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'preventAttack', target: { group: 'leader', player: 'opponent', filter: { rested: true } }, duration: 'endOfOpponentsTurn', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP06-024 — [On Play] If Leader {New Fish-Man Pirates}, play up to 1 {Fish-Man} cost<=4 from hand. Then add 1 top Life to hand.
  { cardNumber: 'OP06-024', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Fish-Man', maxCost: 4 } },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-025 - [On Play] Look at 4; add Fish-Man or Merfolk other than this card's name.
  {
    cardNumber: 'OP06-025',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], excludeSelfName: true } }] },
  },

  // OP06-026 (character) Koushirou —
  //   [On Play] Set up to 1 of your <Slash> attribute Characters with a cost of 4 or less as active. Then,
  //   you cannot attack a Leader during this turn.
  //   Closed 2026-07-16: <Slash> attribute filter wired into setActiveControllerCharacter's filter.
  { cardNumber: 'OP06-026', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'setActiveControllerCharacter', filter: { maxCost: 4, attribute: 'slash' }, maxTargets: 1, optional: true },
    { fn: 'preventAttackAll', duration: 'duringThisTurn', forbiddenTarget: 'leader' },
  ] } },
  // OP06-027 — [On K.O.] Rest up to 1 of your opponent's Characters with a cost of 3 or less.
  { cardNumber: 'OP06-027', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },

  // OP06-028 — [DON!! x1] [When Attacking] If Leader {New Fish-Man Pirates}, set up to 1 DON!! active, this +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-028', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'setActiveControllerDon', maxTargets: 1 },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-029 — [DON!! x1] [When Attacking] [Once Per Turn] If Leader {New Fish-Man Pirates}, set this active, +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-029', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, oncePerTurn: true, gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'setActiveSelf' },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-030 — [When Attacking] If Leader {New Fish-Man Pirates}, cannot be KO'd in battle + +2000 until start of next turn, add 1 top Life to hand.
  { cardNumber: 'OP06-030', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'New Fish-Man Pirates' }], functions: [
    { fn: 'koImmunitySelf', scope: 'battle', duration: 'untilStartOfNextTurn' },
    { fn: 'addPowerSelf', amount: 2000, duration: 'untilStartOfNextTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-031 — [Trigger] Play up to 1 {Fish-Man} or {Merfolk} Character cost<=3 from your hand.
  { cardNumber: 'OP06-031', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', anyOf: [{ typeIncludes: 'Fish-Man' }, { typeIncludes: 'Merfolk' }], maxCost: 3 } }] } },

  // OP06-033 — [On Play] trash {Fish-Man} from hand or [The Ark Noah] from hand/field: K.O. up to 1 opp rested Character.
  { cardNumber: 'OP06-033', templateId: 'ability', params: { timing: 'onPlay', functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Trash cost:',
    options: [
      { label: 'trashFishMan', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Fish-Man' } }] },
      { label: 'trashArkNoahHand', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { name: 'The Ark Noah' } }] },
      { label: 'trashArkNoahField', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { name: 'The Ark Noah' } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 }] },
    ],
  }, { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 1 }] } },

  // OP06-034 — [Activate: Main] [Once Per Turn] Rest up to 1 opp Character cost<=4, this +1000, add 1 top Life to hand.
  { cardNumber: 'OP06-034', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true },
    { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisTurn' },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },

  // OP06-035 — [Rush] is card data. [On Play] Rest up to 2 opp Characters or DON!! → add top Life to hand.
  { cardNumber: 'OP06-035', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'rest', target: { group: 'charactersOrDon', player: 'opponent' }, optional: true, maxTargets: 2 },
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' } },
  ] } },
  // OP06-036 — [On Play]/[On K.O.] K.O. up to 1 of your opponent's rested Characters with a cost of 4 or less.
  {
    cardNumber: 'OP06-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },

  // OP06-038 — [Counter] +2000 battle; +2000 more if 8+ rested cards. [Trigger] K.O. rested cost<=3.
  {
    cardNumber: 'OP06-038',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifGate: [{ kind: 'selfRestedCardCount', atLeast: 8 }] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
    ],
  },

  // OP06-039 — [Main] choose one: rest cost<=6 or K.O. rested cost<=6. [Trigger] activate [Main].
  {
    cardNumber: 'OP06-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'restCost6', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, maxTargets: 1 }] },
          { label: 'koRestedCost6', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true, maxTargets: 1 }] },
        ],
      }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          { label: 'restCost6', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, maxTargets: 1 }] },
          { label: 'koRestedCost6', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true, maxTargets: 1 }] },
        ],
      }] } },
    ],
  },

  // OP06-040 — [Main] K.O. up to 2 of your opponent's rested Characters with a cost of 3 or less. [Trigger] same.
  {
    cardNumber: 'OP06-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true, maxTargets: 2 }] } },
    ],
  },

  // OP06-041 — [On Play] rest all opp Characters. [Trigger] play this Stage.
  {
    cardNumber: 'OP06-041',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restAllCharacters', player: 'opponent' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  {
    cardNumber: 'OP06-042',
    templates: [
      { templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP06-043 — [Activate: Main] [Once Per Turn] trash 1 from hand + place Character cost<=2 at deck bottom: this +3000.
  { cardNumber: 'OP06-043', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
  ] } },

  // OP06-044 (character) Gion —
  //   [Your Turn] [Once Per Turn] When your opponent activates an Event, your opponent must place 1 card
  //   from their hand at the bottom of their deck.
  { cardNumber: 'OP06-044', templateId: 'ability', params: { timing: 'onOpponentEventActivated', oncePerTurn: true, condition: { turn: 'your' }, functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1, chooser: 'opponent' }] } },

  // OP06-045 — [On Play] Draw 2 cards and place 2 cards from your hand at the bottom of your deck.
  { cardNumber: 'OP06-045', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'draw', amount: 2 },
    { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 },
  ] } },

  // OP06-119 — [On Play] Reveal top deck; play up to 1 Character cost <=9 other than [Sanji], bottom the rest.
  { cardNumber: 'OP06-119', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 1, pick: 1, reveal: true, destination: 'play', filter: { category: 'character', maxCost: 9, excludeSelfName: true }, remainder: 'bottom' }] } },

  // OP06-046 — [On Play] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP06-047 — [On Play] Opponent returns all hand to deck, shuffles, draws 5.
  { cardNumber: 'OP06-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnHandShuffleDraw', player: 'opponent', drawAmount: 5 }] } },

  // OP06-048 — [Your Turn] When opponent activates Blocker or Event, if Leader {East Blue}, trash 4 from deck.
  {
    cardNumber: 'OP06-048',
    templates: [
      { templateId: 'ability', params: { timing: 'onOpponentEventActivated', condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'trashTopDeck', count: 4, optional: true }] } },
      { templateId: 'ability', params: { timing: 'onOpponentBlockerActivated', condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'East Blue' }], functions: [{ fn: 'trashTopDeck', count: 4, optional: true }] } },
    ],
  },

  // OP06-050 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP06-050',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },

  // OP06-051 — [On Play] trash 2 from hand: opp returns 1 Character to hand.
  { cardNumber: 'OP06-051', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 2 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'opponent' }, to: { zone: 'hand', player: 'owner' }, maxTargets: 1 },
  ] } },

  // OP06-052 — [DON!! x1] If ≤4 cards in hand, this Character cannot be K.O.'d in battle.
  { cardNumber: 'OP06-052', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfHand', atMost: 4 }] } }] } },

  // OP06-053 — [On K.O.] Place up to 1 Character with a cost of 2 or less at the bottom of the owner's deck.
  { cardNumber: 'OP06-053', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },

  // OP06-054 — if 5 or less cards in hand, [Blocker]
  { cardNumber: 'OP06-054', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfHand', atMost: 5 }] } }] } },

  // OP06-055 — [DON!! x2] [When Attacking] If 4 or less cards in hand, opponent cannot activate [Blocker] this battle.
  { cardNumber: 'OP06-055', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, gate: [{ kind: 'selfHand', atMost: 4 }], functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle' }] } },

  // OP06-056 — [Main] Place up to 1 opp Character cost<=2 and up to 1 opp Character cost<=1 at bottom of deck. [Trigger] same.
  {
    cardNumber: 'OP06-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 2 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
        { fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true },
      ] } },
    ],
  },

  // OP06-057 — [Main] +1000; reveal top, play up to 1 Character cost 2, place rest top or bottom. [Trigger] play cost 2 from hand.
  {
    cardNumber: 'OP06-057',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true },
        { fn: 'searchTopDeck', look: 1, pick: 1, reveal: true, destination: 'play', filter: { category: 'character', exactCost: 2 }, remainder: 'deckTopOrBottom' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'playFromHand', filter: { category: 'character', exactCost: 2 }, maxTargets: 1 }] } },
    ],
  },

  // OP06-058 — [Main] Place up to 2 Characters cost<=6 at bottom of deck. [Trigger] Place up to 1 Character cost<=5.
  {
    cardNumber: 'OP06-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP06-059 — [Counter] up to 1 Leader/Char +1000 this turn, and draw 1. [Trigger] Look at 5, place top or bottom in any order.
  {
    cardNumber: 'OP06-059',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }, { fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 5, reveal: false, destination: 'deckTopOrBottom' }] } },
    ],
  },

  // OP06-060 — [Activate: Main] DON!! −1 + trash this: if Leader {GERMA 66}, play [Vinsmoke Ichiji] cost==7 from hand or trash.
  { cardNumber: 'OP06-060', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'GERMA 66' }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Play Vinsmoke Ichiji from:',
    options: [
      { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Vinsmoke Ichiji', exactCost: 7 } }] },
      { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Vinsmoke Ichiji', exactCost: 7 } }] },
    ],
  }] } },

  // OP06-061 — [On Play] If your DON!! ≤ opponent's, give opp Character −2000 and this Character gains [Rush].
  { cardNumber: 'OP06-061', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' },
  ] } },

  // OP06-062 — [On Play] DON!! −1 + trash 2 from hand: play up to 4 {GERMA 66} power<=4000 from trash. [Activate: Main] DON!! −1: rest 1 opp DON!!.
  {
    cardNumber: 'OP06-062',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'playFromTrash', ifPrevious: 'previousMovedAny', filter: { category: 'character', typeIncludes: 'GERMA 66', maxPower: 4000 }, maxTargets: 4 },
      ] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'restOpponentDon', maxTargets: 1, optional: true }] } },
    ],
  },

  // OP06-063 — [On Play] You may trash 1 from hand: if DON!! <= opponent's, add up to 1 {The Vinsmoke Family} Character (<=4000 power) from trash to hand.
  { cardNumber: 'OP06-063', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfDonAtMostOpponent' }], from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'The Vinsmoke Family', maxPower: 4000 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
  ] } },

  // OP06-064 — [Activate: Main] DON!! −1 + trash this: if Leader {GERMA 66}, play [Vinsmoke Niji] cost==5 from hand or trash.
  { cardNumber: 'OP06-064', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'GERMA 66' }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Play Vinsmoke Niji from:',
    options: [
      { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Vinsmoke Niji', exactCost: 5 } }] },
      { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Vinsmoke Niji', exactCost: 5 } }] },
    ],
  }] } },

  // OP06-065 — [On Play] if DON!! <= opponent's, choose one: K.O. cost<=2 or return hand cost<=4.
  { cardNumber: 'OP06-065', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one:',
    options: [
      { label: 'koCost2', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 1 }] },
      { label: 'returnHandCost4', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] },
    ],
  }] } },

  // OP06-066 — [Activate: Main] DON!! −1 + trash this: if Leader {GERMA 66}, play [Vinsmoke Yonji] cost==4 from hand or trash.
  { cardNumber: 'OP06-066', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'GERMA 66' }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Play Vinsmoke Yonji from:',
    options: [
      { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Vinsmoke Yonji', exactCost: 4 } }] },
      { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Vinsmoke Yonji', exactCost: 4 } }] },
    ],
  }] } },

  // OP06-067 — static: if your DON!! ≤ opponent's, this Character +1000 (Blocker is card data).
  { cardNumber: 'OP06-067', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfDonAtMostOpponent' }] } }] } },

  // OP06-068 — [Activate: Main] DON!! −1 + trash this: if Leader {GERMA 66}, play [Vinsmoke Reiju] cost==4 from hand or trash.
  { cardNumber: 'OP06-068', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'GERMA 66' }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Play Vinsmoke Reiju from:',
    options: [
      { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Vinsmoke Reiju', exactCost: 4 } }] },
      { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Vinsmoke Reiju', exactCost: 4 } }] },
    ],
  }] } },

  // OP06-069 — [On Play] If your DON!! ≤ opponent's and you have 5 or less cards in hand, draw 2.
  { cardNumber: 'OP06-069', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }, { kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP06-071 — [On Play] DON!! −1: if Leader {FILM}, add up to 2 {FILM} Character cards cost<=4 from trash to hand.
  { cardNumber: 'OP06-071', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'FILM' }], functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'FILM', maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 2 },
  ] } },

  // OP06-072 — If Leader {GERMA 66} and your DON!! is at least 2 less than opponent's, this gains [Blocker].
  { cardNumber: 'OP06-072', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'GERMA 66' }, { kind: 'selfDonAtLeastLessThanOpponent', count: 2 }] } }] } },

  // OP06-073 — [Blocker] [On Play] If you have 8+ DON!! on field, draw 1 and trash 1 from hand.
  { cardNumber: 'OP06-073', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonFieldCount', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },

  // OP06-074 — [On Play] DON!! −1: negate up to 1 opp Character; if THAT Character has ≤5000 power, K.O. it.
  { cardNumber: 'OP06-074', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [
    { fn: 'negateEffect', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
    { fn: 'ko', target: { ref: 'previous' }, ifPrevious: 'previousSelectedAny', ifPreviousSelectedPowerAtMost: 5000 },
  ] } },

  // OP06-075 — [On Play] DON!! −1: Rest up to 2 of your opponent's Characters with a cost of 2 or less.
  { cardNumber: 'OP06-075', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },

  { cardNumber: 'OP06-076', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },

  // OP06-077 — [Main] If your DON!! ≤ opponent's, place opp Character cost<=5 at bottom of deck. [Trigger] opp Character cost<=4.
  {
    cardNumber: 'OP06-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP06-078 — [Main] Look at 5; reveal up to 1 GERMA-type (other than self), add to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP06-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA', excludeSelfName: true }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP06-079 — (Stage) [Activate: Main] trash 1 from hand + rest this Stage: look 3, reveal up to 1 "GERMA" type, add to hand, rest to bottom.
  { cardNumber: 'OP06-079', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'GERMA' }, remainder: 'bottom' },
  ] } },

  // OP06-080 — (Leader) [DON!! x1] [When Attacking] rest 2 DON!! + trash 1 from hand: trash 2 top of deck, play up to 1 {Thriller Bark Pirates} cost<=4 from trash.
  { cardNumber: 'OP06-080', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, cost: [{ kind: 'restDon', count: 2 }], functions: [
    { fn: 'trashFromHand', count: 1 },
    { fn: 'trashTopDeck', count: 2 },
    { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 4 } },
  ] } },

  // OP06-081 — [On Play] return 2 from trash to deck bottom: K.O. up to 1 Character cost<=2.
  { cardNumber: 'OP06-081', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 },
    { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'any', filter: { maxCost: 2 } }, optional: true, maxTargets: 1 },
  ] } },

  // OP06-082 — [On Play]/[On K.O.] If Leader {Thriller Bark Pirates}, draw 2 and trash 2 from hand.
  {
    cardNumber: 'OP06-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
    ],
  },

  // OP06-083 — cannot attack; [Activate: Main] you may K.O. 1 of your {Thriller Bark Pirates}: negate this Character's effects this turn.
  {
    cardNumber: 'OP06-083',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'preventAttack', target: { ref: 'self' }, duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates' } }, optional: true },
            { fn: 'negateEffect', target: { ref: 'self' }, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // OP06-084 — [On K.O.] Up to 1 of your Leader or Character cards gains +1000 power during this turn.
  { cardNumber: 'OP06-084', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },

  // OP06-085 — [DON!! x2] [Your Turn] +1000 power for every 5 cards in your trash.
  { cardNumber: 'OP06-085', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerTrash', step: 5, amountPer: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 2, turn: 'your' } }] } },

  // OP06-086 — [On Play] up to 1 Character ≤4 and up to 1 Character ≤2 from trash; play 1 active and the other rested.
  { cardNumber: 'OP06-086', templateId: 'ability', params: { timing: 'onPlay', functions: [{
    fn: 'playPairOneRested',
    zone: 'trash',
    picks: [
      { filter: { category: 'character', maxCost: 4 }, prompt: 'Choose up to 1 Character card with a cost of 4 or less from your trash.' },
      { filter: { category: 'character', maxCost: 2 }, prompt: 'Choose up to 1 Character card with a cost of 2 or less from your trash.' },
    ],
  }] } },

  // OP06-088 — if Leader {Dressrosa} is active, this Character gains +2000 power.
  { cardNumber: 'OP06-088', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Dressrosa' }, { kind: 'leaderActive' }] } }] } },

  // OP06-089 — [On Play]/[On K.O.] Trash 3 cards from the top of your deck.
  {
    cardNumber: 'OP06-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTopDeck', count: 3 }] } },
    ],
  },

  // OP06-090 — [On Play] return 2 from trash to deck bottom: add up to 1 {Thriller Bark Pirates} (not [Dr. Hogback]) from trash to hand.
  { cardNumber: 'OP06-090', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 2 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates', excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
  ] } },

  // OP06-091 — [On Play] If Leader {Thriller Bark Pirates}, trash 5 cards from the top of your deck.
  { cardNumber: 'OP06-091', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'trashTopDeck', count: 5 }] } },

  // OP06-092 — [On Play] choose one: K.O. opp cost<=4 or opp places 3 trash cards at deck bottom.
  { cardNumber: 'OP06-092', templateId: 'ability', params: { timing: 'onPlay', functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one:',
    options: [
      { label: 'koCost4', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 1 }] },
      { label: 'oppTrashToDeck', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 3 }] },
    ],
  }] } },

  // OP06-093 — [On Play] if opp has 5+ hand cards, choose one: opp trashes 1 hand or −3 cost.
  { cardNumber: 'OP06-093', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 5 }], functions: [{
    fn: 'chooseOne',
    chooser: 'controller',
    prompt: 'Choose one:',
    options: [
      { label: 'oppTrashHand', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] },
      { label: 'minus3Cost', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] },
    ],
  }] } },

  // OP06-095 (event) Shadows Asgard —
  //   [Main]/[Counter] Your Leader gains +1000 power during this turn. Then, you may K.O. any number of your
  //   {Thriller Bark Pirates} cost ≤2 Characters. Your Leader gains an additional +1000 for every Character K.O.'d.
  //   `maxTargets: -1` = "any number" (chooseTargets clamps a negative max to all candidates); the K.O. binds
  //   var `t`, and the second addPower scales +1000 × count(t) via `countVar` / `amountPer`. [Trigger] draw 2, trash 1.
  {
    cardNumber: 'OP06-095',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' },
            { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates', maxCost: 2 } }, optional: true, maxTargets: -1 },
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 0, countVar: 't', amountPer: 1000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' },
            { fn: 'ko', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Thriller Bark Pirates', maxCost: 2 } }, optional: true, maxTargets: -1 },
            { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 0, countVar: 't', amountPer: 1000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP06-096 (event) ...Nothing...at All!!! —
  //   [Counter] add top Life to hand: Characters cost <=7 cannot be K.O.'d in battle this turn.
  {
    cardNumber: 'OP06-096',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
            { fn: 'koImmunityAuraControllerCharacters', scope: 'battle', duration: 'duringThisTurn', targetCondition: { maxCost: 7 }, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [
            { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true },
            { fn: 'koImmunityAuraControllerCharacters', scope: 'battle', duration: 'duringThisTurn', targetCondition: { maxCost: 7 }, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // OP06-097 — [Main] Trash 1 card from your opponent's hand. [Trigger] same.
  {
    cardNumber: 'OP06-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },

  // OP06-098 — [Activate: Main] Rest 1 DON!! + rest this Stage: if Leader {Thriller Bark Pirates}, play {Thriller Bark} cost<=2 from trash rested.
  { cardNumber: 'OP06-098', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Thriller Bark Pirates', maxCost: 2 }, rested: true }] } },

  // OP06-099 — [On Play] Look at up to 1 card from the top of your or your opponent's Life; place it at the top or bottom.
  { cardNumber: 'OP06-099', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] } },

  // OP06-100 — [DON!! x2] [When Attacking] trash 1 from hand: K.O. cost<=opp Life. [Trigger] if opp <=3 Life, play this.
  {
    cardNumber: 'OP06-100',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCostFromOpponentLife: true } }, optional: true, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-101 — [On Play] Up to 1 of your Leader or Character gains [Banish] this turn. [Trigger] K.O. up to 1 opp Character cost<=5.
  {
    cardNumber: 'OP06-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller' }, keyword: 'banish', duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },
    ],
  },

  // OP06-102 — [Activate: Main] [Once Per Turn] place cost-1 Stage at deck bottom: K.O. opp cost<=2. [Trigger] if <=2 Life, play this.
  {
    cardNumber: 'OP06-102',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'moveCards', from: { zone: 'stages', player: 'controller', filter: { exactCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
        { fn: 'ko', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-103 — [When Attacking] trash 2 from hand: add up to 1 of your Characters with 0 power to top or bottom of owner's Life face-up. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-103',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'characters', player: 'controller', filter: { maxPower: 0 } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-104 — [On K.O.] If opponent has 3 or less Life, add up to 1 top of deck to top of Life. [Trigger] If opponent has 3 or less Life, play this.
  {
    cardNumber: 'OP06-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-106 — [On Play] add Life top/bottom to hand: add up to 1 from hand to top of Life.
  { cardNumber: 'OP06-106', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
    { fn: 'moveCards', ifPrevious: 'previousMovedAny', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, maxTargets: 1 },
  ] } },

  // OP06-107 — [On Play] add up to 1 {Land of Wano} Character (not [Kouzuki Momonosuke]) to top/bottom of owner's Life face-up.
  { cardNumber: 'OP06-107', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { typeIncludes: 'Land of Wano', excludeSelfName: true } }, to: { zone: 'life', player: 'owner', position: 'topOrBottom', faceUp: true }, optional: true, maxTargets: 1 }] } },

  // OP06-108 — [Trigger] Up to 1 of your {Land of Wano} Leader or Character gains +2000 power during this turn.
  { cardNumber: 'OP06-108', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  // OP06-109 — [DON!! x2] If opp ≤3 Life, cannot be K.O.'d by effects. [Trigger] If opp ≤3 Life, play this.
  {
    cardNumber: 'OP06-109',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { donAttachedAtLeast: 2, gate: [{ kind: 'opponentLife', atMost: 3 }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-110 (character) Nekomamushi —
  //   [DON!! x2] This Character can also attack your opponent's active Characters. [Trigger] If your
  //   opponent has 3 or less Life cards, play this card.
  {
    cardNumber: 'OP06-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'canAttackActive', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-111 — [Activate: Main] [Once Per Turn] place cost-1 Stage at deck bottom: rest opp cost<=4. [Trigger] if <=2 Life, play this.
  {
    cardNumber: 'OP06-111',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [
        { fn: 'moveCards', from: { zone: 'stages', player: 'controller', filter: { exactCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
        { fn: 'rest', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 1 },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-112 — [When Attacking] You may trash 1 from hand: rest opp DON!!. [Trigger] If opp <=3 Life, play this.
  {
    cardNumber: 'OP06-112',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'restOpponentDon', maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'opponentLife', atMost: 3 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP06-113 — if another {Shandian Warrior} on field, [Blocker].
  { cardNumber: 'OP06-113', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Shandian Warrior', atLeast: 2 }] } }] } },

  // OP06-114 — [On Play] place cost-1 Stage at deck bottom: look 5, add up to 1 [Upper Yard] or {Shandian Warrior}.
  { cardNumber: 'OP06-114', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'moveCards', from: { zone: 'stages', player: 'controller', filter: { exactCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 },
    { fn: 'searchTopDeck', ifPrevious: 'previousMovedAny', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Upper Yard' }, { typeIncludes: 'Shandian Warrior' }] }, remainder: 'bottom' },
  ] } },

  // OP06-115 — [Counter] trash 1 → +3000 battle. [Trigger] If 0 Life, add top of deck to top of Life, then trash 1 from hand.
  {
    cardNumber: 'OP06-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 0 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  // OP06-116 — Choose one: K.O. opp ≤5; OR if opp has 1 Life, deal 1 damage, then your Life top → hand. [Trigger] Draw 1.
  {
    cardNumber: 'OP06-116',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'Choose one:',
            options: [
              { label: 'ko', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] },
              {
                label: 'damage',
                functions: [
                  { fn: 'dealDamage', player: 'opponent', amount: 1, ifGate: [{ kind: 'opponentLife', atLeast: 1, atMost: 1 }] },
                  {
                    fn: 'moveCards',
                    from: { zone: 'life', player: 'controller', position: 'top' },
                    to: { zone: 'hand', player: 'owner' },
                    ifPrevious: 'previousMovedAny',
                  },
                ],
              },
            ],
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP06-117 — [Activate: Main] [Once Per Turn] rest this + rest 1 [Enel]: K.O. all opp Characters cost<=2.
  { cardNumber: 'OP06-117', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restThis' }], functions: [
    { fn: 'rest', target: { group: 'characters', player: 'controller', filter: { name: 'Enel' } }, optional: true, maxTargets: 1 },
    { fn: 'koAllCharacters', player: 'opponent', filter: { maxCost: 2 }, ifPrevious: 'previousSelectedAny' },
  ] } },

  // OP06-118 — [When Attacking] [Once Per Turn] rest 1 DON!!: set this active. [Activate: Main] [Once Per Turn] rest 2 DON!!: set this active.
  {
    cardNumber: 'OP06-118',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'setActiveSelf' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'setActiveSelf' }] } },
    ],
  },

];
