/**
 * Reviewed effect template assignments - Main Booster OP12.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP12_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP12-003 — [On K.O.] reveal 2 Events from hand: play up to 1 red Character with 3000 power or less from hand.
  { cardNumber: 'OP12-003', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'selfHandMatching', category: 'event', atLeast: 2 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 3000 } }] } },

  // OP12-004 — [Activate: Main] [Once Per Turn] reveal 2 Events from hand: this Character +2000 this turn.
  { cardNumber: 'OP12-004', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfHandMatching', category: 'event', atLeast: 2 }], functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'duringThisTurn' }] } },




  // OP12-006 - [On Play] Look at 5; add [Monkey.D.Luffy] or red Event.
  {
    cardNumber: 'OP12-006',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { category: 'event', color: 'red' }] } }] },
  },

  // ── Triage batch (OP12 expressible). "reveal 2 Events from hand" cost, "give active DON!! to [named]", and Events-in-trash gates are deferred. ──
  // OP12-007 — [On Play] up to 1 {Roger Pirates} Character gains [Rush] this turn (exclude-[Shanks] dropped).
  { cardNumber: 'OP12-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Roger Pirates' } }, keyword: 'rush', duration: 'duringThisTurn', optional: true }] } },

  // OP12-008 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand: give up to 1 opp Leader/Character −2000 this turn.
  { cardNumber: 'OP12-008', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
  ] } },

  // OP12-013 — [Activate: Main] rest this + reveal 2 Events from hand: give up to 2 rested DON!! to your Leader or 1 Character.
  { cardNumber: 'OP12-013', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'selfHandMatching', category: 'event', atLeast: 2 }], functions: [{ fn: 'giveDon', count: 2 }] } },




  // OP12-014 — [On Play] look 5, reveal up to 1 [Monkey.D.Luffy] or red Event, add to hand, rest to bottom.
  { cardNumber: 'OP12-014', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { color: 'red', category: 'event' }] }, remainder: 'bottom' }] } },






  // OP12-016 — [Main] optional give 2 active DON to [Rayleigh] → opp can't block when it attacks. [Counter] +2000 battle.
  {
    cardNumber: 'OP12-016',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'giveDon', count: 2, targetName: 'Silvers Rayleigh', activeDonOnly: true, optional: true },
            { fn: 'preventBlockersOnPreviousTarget', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Silvers Rayleigh' } }, amount: 2000, duration: 'duringThisBattle', optional: true },
            { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { excludeSelf: true } }, amount: 2000, duration: 'duringThisBattle', optional: true },
          ],
        },
      },
    ],
  },

  // OP12-017 - [Main] give 1 active DON!! to [Silvers Rayleigh]: look 4, add red Event or cost 3+ Character.
  {
    cardNumber: 'OP12-017',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [
        { fn: 'giveDon', count: 1, targetName: 'Silvers Rayleigh', activeDonOnly: true, optional: true },
        { fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ category: 'event', color: 'red' }, { category: 'character', minCost: 3 }] }, remainder: 'bottom', ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // OP12-019 — [Main] optional give 1 active DON to [Rayleigh] → +1000 this turn. [Counter] +2000 battle.
  {
    cardNumber: 'OP12-019',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            { fn: 'giveDon', count: 1, targetName: 'Silvers Rayleigh', activeDonOnly: true, optional: true },
            { fn: 'addPower', target: { ref: 'previous' }, amount: 1000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Silvers Rayleigh' } }, amount: 2000, duration: 'duringThisBattle', optional: true },
            { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { excludeSelf: true } }, amount: 2000, duration: 'duringThisBattle', optional: true },
          ],
        },
      },
    ],
  },

  // OP12-020 (leader) Roronoa Zoro —
  //   [DON!! x3] [Activate: Main] [Once Per Turn] If this Leader battles your opponent's Character during
  //   this turn, set this Leader as active. Then, this Leader cannot attack your opponent's Characters with
  //   a base cost of 7 or less during this turn.
  {
    cardNumber: 'OP12-020',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      condition: { donAttachedAtLeast: 3 },
      gate: [{ kind: 'selfBattledOpponentCharacterThisTurn' }],
      functions: [
        { fn: 'setActiveSelf' },
        { fn: 'preventAttack', target: { ref: 'self' }, duration: 'duringThisTurn', forbiddenTargetFilter: { zone: 'character', maxBaseCost: 7 } },
      ],
    },
  },

  // OP12-021 — if Leader <Slash> and 6+ rested DON!!: this Character cannot be rested by opponent effects. [Blocker] is card data.
  {
    cardNumber: 'OP12-021',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'preventRest',
        target: { ref: 'self' },
        duration: 'permanent',
        effectSourceController: 'opponent',
        condition: { gate: [{ kind: 'leaderAttribute', attribute: 'slash' }, { kind: 'selfRestedDonCount', atLeast: 6 }] },
      }],
    },
  },
  // OP12-027 — aura K.O. replacement: rest this Character to save ally <Slash> cost ≤5 from opponent effects. [Blocker] is printed.
  {
    cardNumber: 'OP12-027',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        effectSourceController: 'opponent',
        anyOfAttributes: ['Slash'],
        excludeSource: true,
        targetCondition: { maxCost: 5 },
        restSource: true,
        duration: 'permanent',
      }],
    },
  },

  // OP12-028 — [Activate: Main] rest 1 DON!! + this: if Leader [Zoro], search top 5 for Slash card or green Event.
  {
    cardNumber: 'OP12-028',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restDon', count: 1 }, { kind: 'restThis' }],
      gate: [{ kind: 'leaderName', name: 'Roronoa Zoro' }],
      functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ attribute: 'slash' }, { category: 'event', color: 'green' }] } }],
    },
  },

  // OP12-029 — [On Play] Rest up to 1 opp Character cost ≤2, then K.O. up to 1 opp rested Character with base cost ≤1.
  { cardNumber: 'OP12-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBaseCost: 1 } }, optional: true }] } },

  // OP12-030 — [Blocker][On Play] Set up to 4 DON!! active, then cannot play base-cost-7+ Characters this turn.
  { cardNumber: 'OP12-030', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'setActiveControllerDon', maxTargets: 4 },
    { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn', minBaseCost: 7 },
  ] } },

  // OP12-031 — [On Play] Rest up to 1 opp Character (base cost 6 or less); then give up to 3 rested DON!! to your Leader.
  { cardNumber: 'OP12-031', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 6 } }, optional: true },
    { fn: 'giveDonControllerLeader', count: 3 },
  ] } },


  // OP12-033 — [Blocker][On Block] Rest up to 1 opp Character cost ≤5.
  { cardNumber: 'OP12-033', templateId: 'ability', params: { timing: 'onBlock', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  // OP12-034 — [On Play] if Leader has Slash attribute, search top 5 for Slash card or green Event.
  { cardNumber: 'OP12-034', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderAttribute', attribute: 'slash' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ attribute: 'slash' }, { category: 'event', color: 'green' }] } }] } },

  // OP12-036 (character) Roronoa Zoro —
  //   This card in your hand cannot be played by effects.If your Leader has the <Slash> attribute, this
  //   Character cannot be K.O.'d in battle by <Slash> attribute cards and gains +1000 power.
  // PARTIAL: "this card in your hand cannot be played by effects" remains deferred.
  {
    cardNumber: 'OP12-036',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', gate: [{ kind: 'leaderAttribute', attribute: 'slash' }], functions: [
      { fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', attackerAttribute: 'slash' },
      { fn: 'addPowerSelf', amount: 1000, duration: 'permanent' },
    ] },
  },

  // OP12-037 — [Main] rest 3 DON!!: rest up to 2 opp Characters or DON!!. [Counter] Leader +3000 this battle.
  {
    cardNumber: 'OP12-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], functions: [{ fn: 'rest', target: { group: 'charactersOrDon', player: 'opponent' }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },
  // OP12-038 — [Main] rest 2 DON!!: K.O. up to 2 opp rested Characters base cost ≤4. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP12-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxBaseCost: 4 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP12-039 — [Main] set your Zoro Leader active. [Trigger] up to 1 Leader/Char +1000 this turn.
  {
    cardNumber: 'OP12-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Roronoa Zoro' }], functions: [{ fn: 'setActiveControllerLeader' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP12-040',
    templateId: 'ability',
    params: {
      timing: 'onHandTrashed',
      gate: [{ kind: 'effectSourceTypeIncludes', typeIncludes: 'Navy' }],
      functions: [{ fn: 'drawByEventCount', countField: 'handTrashedCount' }],
    },
  },

  // OP12-041 (leader) — [Activate: Main] DON!! -1: activate a Straw Hat Crew Event cost <=3 from hand. [When Attacking] If your DON!! <= opponent's, add 1 DON!! (rested).
  {
    cardNumber: 'OP12-041',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'activateEventFromHand', filter: { category: 'event', typeIncludes: 'Straw Hat Crew', maxCost: 3 }, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },

  // OP12-042 — If you have 2+ Characters with base cost 5+, +1 cost. [On Play] Place opp base-cost≤1 Character at bottom.
  {
    cardNumber: 'OP12-042',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 1, duration: 'permanent', condition: { gate: [{ kind: 'selfCharacterCostCount', minCost: 5, atLeast: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxBaseCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },

  // OP12-043 (character) Kuzan —
  //   If you have 5 or more cards in your hand, this Character gains +1 cost.[On Play] You may trash 1 card
  //   from your hand: Up to 1 of your opponent's Characters cannot attack until the end of your opponent's
  //   next End Phase.
  {
    cardNumber: 'OP12-043',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 1, duration: 'permanent', condition: { gate: [{ kind: 'selfHand', atLeast: 5 }] } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'preventAttack', target: { group: 'characters', player: 'opponent' }, duration: 'endOfOpponentsTurn', optional: true, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // OP12-044 — [On Play] If Leader {Navy}, draw 2. [Activate: Main][OPT] trash 1 → give 1 rested DON!! to Leader/1 Char.
  {
    cardNumber: 'OP12-044',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'draw', amount: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP12-046 — [On Play] Trash 2 from hand. [Activate: Main] You may trash this Character: return up to 1 Character cost ≤5 to owner's hand.
  {
    cardNumber: 'OP12-046',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true },
      ] } },
    ],
  },

  // OP12-047 — [On Play] trash 1 → Look 5, reveal up to 2 {Navy} to hand (exclude-[Sengoku] dropped), rest to bottom.
  { cardNumber: 'OP12-047', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },

  // OP12-048 (character) Donquixote Rosinante —
  //   [Opponent's Turn] If your blue {Navy} type Character would be removed from the field by your
  //   opponent's effect, you may rest this Character and trash 1 card from your hand instead.
  // PARTIAL: compound rest+trash replacement; blue color filter dropped; mapped restSource only.
  {
    cardNumber: 'OP12-048',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Navy'],
        restSource: true,
        sourceCondition: { turn: 'opponent' },
        duration: 'permanent',
      }],
    },
  },

  // OP12-051 — [Activate: Main] rest this + trash 1 from hand: up to 1 opp Character base cost≤4 cannot activate [Blocker] this turn.
  {
    cardNumber: 'OP12-051',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      cost: [{ kind: 'restThis' }],
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'suppressBlockerOnTarget', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  // OP12-053 — [Once Per Turn] opponent-effect removal replacement; [Opponent's Turn] if Leader {Navy}: [Blocker] and +1000.
  {
    cardNumber: 'OP12-053',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [
      { fn: 'registerKoReplacementSelf', scope: 'effect', oncePerTurn: true, replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', trashFromHand: { count: 1 }, duration: 'permanent' },
      { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Navy' }] } },
      { fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Navy' }] } },
    ] },
  },

  // OP12-054 — [On Play] If Leader {The Seven Warlords of the Sea}: return up to 1 Character cost ≤1 to hand (exclude-self dropped).
  { cardNumber: 'OP12-054', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'The Seven Warlords of the Sea' }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP12-056 — [On Play] trash 1 → play up to 1 blue {Navy} Character (≤8000 base power) from hand (exclude-[Garp] dropped).
  { cardNumber: 'OP12-056', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'playFromHand', filter: { category: 'character', color: 'blue', typeIncludes: 'Navy', maxPower: 8000 } }] } },

  // OP12-057 — [Counter] up to 1 Leader/Char +4000 this battle, then trash 1 from hand. [Trigger] trash 1 → draw 1.
  {
    cardNumber: 'OP12-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'trashFromHand', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },


  // OP12-059 — [Main] If Leader [Sanji], draw 1. [Counter] If 4+ Events in trash, Leader +4000.
  {
    cardNumber: 'OP12-059',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle' }] } },
    ],
  },


  // OP12-061 — [Once Per Turn] [Trafalgar Law] K.O. replacement (top Life → hand). PARTIAL: activate Main deferred.
  {
    cardNumber: 'OP12-061',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        oncePerTurn: true,
        anyOfNames: ['Trafalgar Law'],
        lifeToHand: { position: 'top' },
        duration: 'permanent',
      }],
    },
  },

  // OP12-062 — [On Play] If Leader [Sanji] and your DON!! ≤ opponent's, add 1 DON!! (rested), then draw 1.
  { cardNumber: 'OP12-062', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Sanji' }, { kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }, { fn: 'draw', amount: 1 }] } },

  // OP12-066 — if 4+ Events in trash, [Blocker]
  { cardNumber: 'OP12-066', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] } }] } },

  // OP12-063 — if 4+ Events in trash: this Character gains +2000 power and +5 cost.
  //   [Blocker] is an unconditional printed keyword (handled by card keyword metadata, not templated here).
  { cardNumber: 'OP12-063', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] } }, { fn: 'addCost', target: { ref: 'self' }, amount: 5, duration: 'permanent', condition: { gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] } }] } },

  // OP12-065 — if 4+ Events in trash, this Character gains [Blocker]. [On K.O.] add up to 1 Event from trash to hand.
  {
    cardNumber: 'OP12-065',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event' } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] } },
    ],
  },


  // OP12-069 — [On Your Opponent's Attack] [Once Per Turn] DON!! −1: If Leader {Baroque Works}, up to 1 Leader/Character +2000 battle.
  { cardNumber: 'OP12-069', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Baroque Works' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }] } },

  // OP12-070 — PARTIAL: +1000 per 5 Events in trash and field-removal clause deferred.
  {
    cardNumber: 'OP12-070',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        scope: 'effect',
        returnDon: { count: 1 },
        duration: 'permanent',
      }],
    },
  },
  // OP12-071 - [On Play] Look at 4; add [Sanji] or Event.
  {
    cardNumber: 'OP12-071',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Sanji' }, { category: 'event' }] } }] },
  },

  // OP12-072 (character) Zeff —
  //   When a DON!! card on your field is returned to your DON!! deck, if your Leader is [Sanji], this
  //   Character gains [Rush] during this turn.(This card can attack on the turn in which it is played.)



  // OP12-075 — [On Play] K.O. up to 1 opp Character cost ≤3. [Trigger] DON!! −1: Play this card. PARTIAL: opponent's DON!! ramp drawback deferred.
  {
    cardNumber: 'OP12-075',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP12-077 — [Main] select [Law] +2000; if it attacks, opp cannot activate [Blocker]. [Trigger] draw 1.
  {
    cardNumber: 'OP12-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn', target: 'chosenControllerLeaderOrCharacter', filter: { name: 'Trafalgar Law' }, powerBonus: 2000 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP12-078 — [Main] If your DON!! ≤ opponent's, draw 1, then give up to 1 opp Character −3000 this turn.
  { cardNumber: 'OP12-078', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },

  // OP12-079 — [Main] If Leader [Sanji]: Look 3, add up to 1 card to hand, rest to bottom.
  { cardNumber: 'OP12-079', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }] } },

  {
    cardNumber: 'OP12-080',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'moveCards', from: { zone: 'stages', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 }, { fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { category: 'event' }, remainder: 'bottom', ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP12-081 (leader) Koala — attack opponent's Leader with 2+ cost-8+ Characters → draw 1; [Once Per Turn] on opponent Character play (cost 8+ or via Character effect) → opp top Life to hand.
  {
    cardNumber: 'OP12-081',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          battleTargetIsOpponentLeader: true,
          gate: [{ kind: 'selfCharacterCostCount', minCost: 8, atLeast: 2 }],
          functions: [{ fn: 'draw', amount: 1 }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentCharacterPlayedFromHand',
          oncePerTurn: true,
          gate: [{ kind: 'anyOf', gates: [{ kind: 'playedCharacterBaseCostAtLeast', atLeast: 8 }, { kind: 'playedFromCharacterEffect' }] }],
          functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'hand', player: 'owner' } }],
        },
      },
    ],
  },

  // OP12-084 — [Blocker][On Play] If Leader {Revolutionary Army}, trash 3 from top of deck.
  { cardNumber: 'OP12-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'trashTopDeck', count: 3 }] } },


  // OP12-086 - [On Play] If Leader has Revolutionary Army, look at 3; add Revolutionary Army other than self or [Nico Robin], trash rest.
  {
    cardNumber: 'OP12-086',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'searchTopDeck', look: 3,
      pick: 1,
      reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Revolutionary Army', excludeSelfName: true }, { name: 'Nico Robin' }] },
      remainder: 'trash' }] },
  },

  // OP12-087 — If Leader [Koala]/[Luffy], gains [Blocker]/+3 cost. [On Play] trash 1 → if opp 5+ hand, opp trashes 2.
  {
    cardNumber: 'OP12-087',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderName', name: 'Koala' }, { kind: 'leaderName', name: 'Monkey.D.Luffy' }] }] } },
        { fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent', condition: { gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderName', name: 'Koala' }, { kind: 'leaderName', name: 'Monkey.D.Luffy' }] }] } },
      ] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'opponentHand', atLeast: 5 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 2, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP12-089 — If Leader {Revolutionary Army}, gains [Blocker]/+4 cost. [On K.O.] K.O. up to 1 opp Character base cost ≤4.
  {
    cardNumber: 'OP12-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } },
        { fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } },
      ] } },
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }] } },
    ],
  },

  // OP12-090 — [When Attacking] trash 2 from top of deck: give up to 1 opp Character −2 cost this turn.
  { cardNumber: 'OP12-090', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'trashTopDeck', count: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, duration: 'duringThisTurn', optional: true }] } },

  // OP12-091 — [Activate: Main] [OPT] place 3 from trash at bottom: up to 2 {SMILE} Characters +2000 this turn.
  { cardNumber: 'OP12-091', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 }, { fn: 'addPower', ifPrevious: 'previousMovedAny', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'SMILE' } }, amount: 2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },

  // OP12-093 — If Leader {Revolutionary Army}, this Character gains +4 cost (continuous).
  { cardNumber: 'OP12-093', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } }] } },

  // OP12-094 — [On Play] place 3 {Revolutionary Army} from trash at bottom: If Leader {Revolutionary Army}, play up to 1 Character cost<=6 from trash.
  { cardNumber: 'OP12-094', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }], functions: [
    { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Revolutionary Army' } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 3 },
    { fn: 'playFromTrash', filter: { category: 'character', maxCost: 6 }, ifPrevious: 'previousMovedAny' },
  ] } },




  // OP12-095 — If Leader {Revolutionary Army}, +4 cost. [On Play] Draw 1, trash 1.
  {
    cardNumber: 'OP12-095',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // OP12-096 — [Main] K.O. cost≤4, or cost≤6 if you have an 8+ cost Character. [Trigger] Draw 1, trash top deck.
  {
    cardNumber: 'OP12-096',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose a K.O. target range.', options: [
        { label: 'cost4', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] },
        { label: 'cost6', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, ifGate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }] }] },
      ] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashTopDeck', count: 1 }] } },
    ],
  },

  // OP12-097 — [Main]/[Trigger] Look 3, reveal up to 1 {Revolutionary Army} to hand, trash the rest (exclude-name dropped).
  {
    cardNumber: 'OP12-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, remainder: 'trash' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Revolutionary Army' }, remainder: 'trash' }] } },
    ],
  },


  // OP12-099 — PARTIAL: general Life-removal trigger + "cannot draw" rider deferred; mapped draw on Life damage dealt.
  { cardNumber: 'OP12-099', templateId: 'ability', params: { timing: 'onLifeDamageDealt', condition: { turn: 'your' }, functions: [{ fn: 'draw', amount: 1 }] } },

  // OP12-100 — If 3 or less Life, gains [Blocker]/+3 cost. [On Play] add top Life to hand → Draw 2, trash 1.
  {
    cardNumber: 'OP12-100',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 3 }] } },
        { fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 3 }] } },
      ] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },


  // OP12-102 — removal replacement mapped; the "no other [Shirahoshi] base cost 2" gate is approximated with selfDoesNotControlNamed.
  {
    cardNumber: 'OP12-102',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [
      { fn: 'registerKoReplacementAura', scope: 'effect', replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', targetCondition: { maxBaseCost: 6 }, turnTopLifeFace: { faceUp: true }, duration: 'permanent' },
      { fn: 'addPowerAuraControllerCharacters', amount: 2000, duration: 'permanent', anyOfTypes: ['Neptunian'], gate: [{ kind: 'selfDoesNotControlNamed', name: 'Shirahoshi' }], sourceCondition: { turn: 'opponent' } },
    ] },
  },

  // OP12-104 — [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.
  { cardNumber: 'OP12-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },

  // OP12-105 — [Your Turn] [On Play] up to 1 [Trafalgar Law] +2000 this turn.
  { cardNumber: 'OP12-105', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { name: 'Trafalgar Law' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },


  // OP12-107 — static: if ≤2 Life, this Character gains [Rush]. [On K.O.] add top of deck to top of Life.
  {
    cardNumber: 'OP12-107',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
    ],
  },

  // OP12-108 - [On Play] Look at 5; add up to 1 [Trafalgar Law].
  {
    cardNumber: 'OP12-108',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Trafalgar Law' } }] },
  },

  // OP12-109 — [Trigger] K.O. up to 1 opp Character cost ≤1, then add this card to hand.
  { cardNumber: 'OP12-109', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
    { fn: 'returnSelfToHand' },
  ] } },

  // OP12-112 — [Trigger] If Leader multicolored, draw 2.
  { cardNumber: 'OP12-112', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP12-113 — [On K.O.] If Leader {Supernovas}, play Supernovas cost≤4 from hand rested. [Trigger] K.O. cost≤1, then add this card to hand.
  {
    cardNumber: 'OP12-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Supernovas', maxCost: 4 }, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true },
        { fn: 'returnSelfToHand' },
      ] } },
    ],
  },

  // OP12-115 — [Counter] up to 1 Leader/Char +2000 this battle. If ≤2 Life, add [Trafalgar Law] from trash to hand.
  { cardNumber: 'OP12-115', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: 'Trafalgar Law' } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },

  // OP12-116 — [Main] Look 5, reveal up to 2 {Shandian Warrior}/[Mont Blanc Noland] to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP12-116',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Shandian Warrior' }, { name: 'Mont Blanc Noland' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  { cardNumber: 'OP12-001', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfHandMatching', category: 'event', atLeast: 2 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { maxBasePower: 4000 } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },

  { cardNumber: 'OP12-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'event', atLeast: 2 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }, { fn: 'addPowerSelf', amount: 1000, duration: 'endOfOpponentsTurn' }] } },

  { cardNumber: 'OP12-012', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Roger Pirates', excludeSelf: true } }, keyword: 'blocker', duration: 'endOfOpponentsTurn', optional: true }] } },

  { cardNumber: 'OP12-015', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { gate: [{ kind: 'selfGivenDonCount', atLeast: 2 }] } }] } }, { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'event', atLeast: 2 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', color: 'red', maxPower: 3000 } }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } }] },

  { cardNumber: 'OP12-018', templateId: 'ability', params: { timing: 'counter', functions: [
    { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Silvers Rayleigh' } }, amount: 2000, duration: 'duringThisBattle', optional: true },
    { fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { excludeSelf: true } }, amount: 2000, duration: 'duringThisBattle', optional: true },
    { fn: 'restControllerDon', maxTargets: 1, optional: true },
    { fn: 'addPower', target: { group: 'leader', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
    { fn: 'addPowerAuraOpponentCharacters', amount: -1000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
  ] } },

  { cardNumber: 'OP12-022', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] } },

  // OP12-024 — active-only: cannot be K.O.'d by opponent effects. [When Attacking] given DON≥3: rest opp base cost≤6.
  { cardNumber: 'OP12-024', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent', condition: { rested: false }, effectSourceController: 'opponent' }] } },
    { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfGivenDonCount', atLeast: 3 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 6 } }, optional: true }] } },
  ] },

  { cardNumber: 'OP12-026', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }, { fn: 'giveDonControllerLeader', count: 3 }] } },

  { cardNumber: 'OP12-058', templates: [{ templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'revealTopThen', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 9 }, then: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', maxCost: 9 }, maxTargets: 1 }, { fn: 'addKeyword', target: { ref: 'previous' }, keyword: 'rush', duration: 'duringThisTurn' }] }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } }] },

  { cardNumber: 'OP12-060', templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose one', options: [{ label: 'return', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 4 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] }, { label: 'draw', functions: [{ fn: 'draw', amount: 2, ifGate: [{ kind: 'selfHand', atMost: 6 }] }] }] }] } },

  { cardNumber: 'OP12-073', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }, { fn: 'addPowerAuraControllerCharacters', amount: 1000, duration: 'endOfOpponentsTurn', anyOfNames: ['Donquixote Rosinante'], anyOfTypes: ['Heart Pirates'] }] } },

  { cardNumber: 'OP12-074', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Sanji' }], functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'event' }, optional: true }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousSelectedAny' }] } },

  { cardNumber: 'OP12-085', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent', condition: { gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }] } }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }, { kind: 'opponentHand', atLeast: 5 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } }] },

  { cardNumber: 'OP12-098', templates: [{ templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, ifGate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }] }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'trashTopDeck', count: 1 }] } }] },

  { cardNumber: 'OP12-101', templates: [{ templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'endOfOpponentsTurn' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Supernovas' }], functions: [{ fn: 'triggerPlaySelf' }] } }] },

  { cardNumber: 'OP12-117', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  { cardNumber: 'OP12-118', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCardCount', atLeast: 8 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  { cardNumber: 'OP12-119', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }, { fn: 'addCost', target: { ref: 'self' }, amount: 2, duration: 'endOfOpponentsTurn', ifPrevious: 'previousMovedAny' }] } }, { templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } }] },

  { cardNumber: 'OP12-072', templateId: 'ability', params: { timing: 'onDonReturned', gate: [{ kind: 'leaderName', name: 'Sanji' }, { kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },

];
