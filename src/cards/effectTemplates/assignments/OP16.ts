/**
 * Reviewed effect template assignments - Main Booster OP16.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP16_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP16-002 — [On Play] reveal 1 Character with 8000 power from hand: draw 1.
  { cardNumber: 'OP16-002', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP16-001 (leader) Portgas.D.Ace —
  //   [Activate: Main] [Once Per Turn] Up to 1 of your [Monkey.D.Luffy] Characters or up to 1 of your
  //   Characters with a type including "Whitebeard Pirates", with 8000 power or more, gains [Rush] during
  //   this turn.
  {
    cardNumber: 'OP16-001',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [
        {
          fn: 'chooseOne',
          chooser: 'controller',
          prompt: 'Choose a Character to gain Rush.',
          options: [
            { label: 'skip', functions: [] },
            { label: 'luffy', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { name: 'Monkey.D.Luffy', minBasePower: 8000 } }, keyword: 'rush', duration: 'duringThisTurn', optional: true, maxTargets: 1 }] },
            { label: 'whitebeardPirates', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Whitebeard Pirates', minBasePower: 8000 } }, keyword: 'rush', duration: 'duringThisTurn', optional: true, maxTargets: 1 }] },
          ],
        },
      ],
    },
  },


  // OP16-003 — [Your Turn] your Leader gains [Double Attack] and +2000 power. [On Play] reveal 2 8000-power Characters: opp Character -6000.
  {
    cardNumber: 'OP16-003',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'doubleAttack', duration: 'permanent', condition: { turn: 'your' } }, { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'permanent', condition: { turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalRevealTypeFromHand', count: 2, filter: { category: 'character', exactPower: 8000 }, prompt: 'You may reveal 2 Character cards with 8000 power from your hand.' }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -6000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' }] } },
    ],
  },

  // OP16-005 (character) Thatch —
  //   If you have a Character with 8000 power or more and a type including "Whitebeard Pirates", give this
  //   card in your hand −3 cost.[Blocker]
  { cardNumber: 'OP16-005', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -3, duration: 'permanent', gate: [{ kind: 'selfTypedCharacterPowerAtLeast', typeIncludes: 'Whitebeard Pirates', power: 8000 }] }] } },

  // ── Triage batch (OP16 expressible). Named-present gates and opp-Life-to-opponent's-hand are deferred. ──
  { cardNumber: 'OP16-006', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },

  { cardNumber: 'OP16-013', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 8000 } }, optional: true }] } },

  // OP16-014 (character) Marco —
  //   If one of your Characters would be removed from the field by your opponent's effect, you may K.O.
  //   this Character instead.[On K.O.] You may trash 1 Character card with 8000 power from your hand: Play
  //   this Character card from your trash.
  {
    cardNumber: 'OP16-014',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'registerKoReplacementAura',
            scope: 'effect',
            charactersOnly: true,
            trashSource: true,
            duration: 'permanent',
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'onKO',
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'Trash an 8000-power Character from hand to play this from trash?',
            options: [
              { label: 'skip', functions: [] },
              {
                label: 'pay',
                functions: [
                  { fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', exactPower: 8000 } },
                  { fn: 'playFromTrash', filter: { category: 'character', name: 'Marco' }, ifPrevious: 'previousSelectedAny' },
                ],
              },
            ],
          }],
        },
      },
    ],
  },

  // OP16-015 (character) Monkey.D.Luffy —
  //   If your Leader's card name includes "Ace" and you have 6 or more DON!! cards on your field, give this
  //   card in your hand −2 cost.[On Your Opponent's Attack] You may trash 1 Character card with 8000 power
  //   from your hand: Your Leader and this Character's base power becomes 7000 during this turn.
  {
    cardNumber: 'OP16-015',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -2, duration: 'permanent', gate: [{ kind: 'leaderNameIncludes', name: 'Ace' }, { kind: 'selfDonFieldCount', atLeast: 6 }] }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          functions: [{
            fn: 'chooseOne',
            chooser: 'controller',
            prompt: 'Trash an 8000-power Character from hand?',
            options: [
              { label: 'skip', functions: [] },
              {
                label: 'pay',
                functions: [
                  { fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', exactPower: 8000 } },
                  { fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 7000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
                  { fn: 'setBasePower', target: { ref: 'self' }, value: 7000, duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' },
                ],
              },
            ],
          }],
        },
      },
    ],
  },

  // OP16-018 — aura K.O. replacement: trash Char ≥6000 from hand to save ally {Red-Haired Pirates}.
  {
    cardNumber: 'OP16-018',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        oncePerTurn: true,
        anyOfTypes: ['Red-Haired Pirates'],
        trashFromHand: { count: 1, filter: { category: 'character', minCurrentPower: 6000 } },
        duration: 'permanent',
      }],
    },
  },

  {
    cardNumber: 'OP16-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Whitebeard Pirates', exactPower: 8000 }, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' }] } },
    ],
  },

  // OP16-020 (event) If You're Coming with Me... Kiss Your Lives Goodbye!! —
  //   [Main] You may rest 1 of your DON!! cards and reveal 1 Character card with 8000 power from your hand:
  //   Draw 1 card.[Counter] You may trash 1 card from your hand: Up to 1 of your Leader or Character cards
  //   gains +3000 power during this battle.
  {
    cardNumber: 'OP16-020',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          cost: [{ kind: 'restDon', count: 1 }],
          functions: [
            { fn: 'optionalRevealTypeFromHand', filter: { category: 'character', exactPower: 8000 }, prompt: 'You may reveal 1 Character card with 8000 power from your hand.' },
            { fn: 'draw', amount: 1, ifPrevious: 'previousSelectedAny' },
          ],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'counter',
          functions: [
            { fn: 'optionalTrashFromHand', count: 1 },
            { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ],
  },

  // OP16-021 (stage) — [On Play] If Leader {Whitebeard Pirates}, Look 3, add up to 1, rest to bottom. [Activate: Main] Trash this Stage: give rested DON.
  {
    cardNumber: 'OP16-021',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'hand', remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'giveDon', count: 1, optional: true }] } },
    ],
  },

  // OP16-022 (leader) Monkey.D.Luffy —
  {
    cardNumber: 'OP16-022',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      gate: [{ kind: 'selfAllCharactersTyped', typeIncludes: 'Impel Down' }],
      functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }],
    },
  },

  // OP16-024 (character) Inazuma —
  //   When this Character is K.O.'d by your opponent's effect, rest up to 1 of your opponent's
  //   Characters.[Blocker] is printed on the card.
  { cardNumber: 'OP16-024', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'koByOpponentEffect' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }] } },

  // OP16-025 — [When Attacking] If you have [Antlerkov], play up to 1 Character cost<=2 from hand.
  { cardNumber: 'OP16-025', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfControlsNamed', name: 'Antlerkov' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },

  { cardNumber: 'OP16-026', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' }, remainder: 'bottom' }, { fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },

  { cardNumber: 'OP16-027', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1 } }] } },

  // OP16-029 — [When Attacking] If you have [Bunkov], play up to 1 Character cost<=2 from hand.
  { cardNumber: 'OP16-029', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfControlsNamed', name: 'Bunkov' }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },


  { cardNumber: 'OP16-031', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Prisoner of Impel Down' } }] } },

  // OP16-032 (character) Boa Hancock —
  //   [Unblockable] (This card cannot be blocked.)[On Play] Up to 1 of your opponent's Characters other
  //   than [Monkey.D.Luffy] cannot be rested until the end of your opponent's next End Phase.
  {
    cardNumber: 'OP16-032',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'unblockable', duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { excludeName: 'Monkey.D.Luffy' } }, duration: 'endOfOpponentsTurn', optional: true }] } },
    ],
  },

  // OP16-033 (character) Morley — [Unblockable]. K.O. replacement rests 2 of your cards.
  {
    cardNumber: 'OP16-033',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'unblockable', duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementSelf', scope: 'any', restCards: { count: 2 }, duration: 'permanent' }] } },
    ],
  },


  { cardNumber: 'OP16-035', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true }, { fn: 'optionalTrashFromHand', count: 1 }, { fn: 'giveDon', count: 3, ifPrevious: 'previousMovedAny' }] } },

  // OP16-036 - [On Play] rest up to 1 opp Character cost<=4. [When Attacking] base power becomes opponent Leader power.
  {
    cardNumber: 'OP16-036',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'leader', player: 'opponent' }, duration: 'duringThisTurn' }] } },
    ],
  },

  { cardNumber: 'OP16-037', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },

  // OP16-038 — [Main] rest 6 DON!!: if 5 differently named {Impel Down} Characters, set Leader and all Characters active. [Counter] Leader +3000.
  {
    cardNumber: 'OP16-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 6 }], gate: [{ kind: 'selfTypedCharacterDistinctNameCount', typeIncludes: 'Impel Down', atLeast: 5 }], functions: [{ fn: 'setActiveControllerLeader' }, { fn: 'setActiveControllerCharacters' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },


  // OP16-040 — [Main] if [Monkey.D.Luffy] and [Mr.3(Galdino)], prevent-refresh rested opp Character cost <=6. [Counter] Leader +3000.
  {
    cardNumber: 'OP16-040',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfControlsNamed', name: 'Monkey.D.Luffy' }, { kind: 'selfControlsNamed', name: 'Mr.3(Galdino)' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, duration: 'endOfOpponentsTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP16-043 — [Blocker] [On K.O.] rest 1 {Dressrosa} Leader/Stage: return up to 1 opp Character cost<=5 to hand.
  { cardNumber: 'OP16-043', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'restControllerLeaderOrStage', typeIncludes: 'Dressrosa' }, { fn: 'moveCards', ifPrevious: 'previousSelectedAny', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },

  // OP16-041 (leader) Buggy —
  //   [DON!! x1] [Once Per Turn] This effect can be activated when your {Impel Down} type Character card is
  //   removed from the field. Play up to 1 [Prisoner of Impel Down] card from your hand.
  {
    cardNumber: 'OP16-041',
    templateId: 'ability',
    params: {
      timing: 'onRemovedFromField',
      oncePerTurn: true,
      condition: { donAttachedAtLeast: 1 },
      gate: [
        { kind: 'removedFromFieldCategory', category: 'character' },
        { kind: 'removedFromFieldController', player: 'controller' },
        { kind: 'removedFromFieldTypeIncludes', typeIncludes: 'Impel Down' },
      ],
      functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Prisoner of Impel Down' } }],
    },
  },

  // OP16-042 (character) Prisoner of Impel Down —
  //   Under the rules of this game, you may have any number of this card in your deck.
  { cardNumber: 'OP16-042', templateId: 'noRuntime', params: {} },

  // OP16-047 (character) Donquixote Doflamingo —
  //   [Activate: Main] You may rest this Character: If your opponent has 8 or more cards in their hand,
  //   they place 2 cards from their hand at the bottom of their deck in any order.
  { cardNumber: 'OP16-047', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'opponentHand', atLeast: 8 }], functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, minTargets: 2, maxTargets: 2, chooser: 'opponent' }] } },

  // OP16-048 — [On Play] If Leader {Impel Down}, draw 1, play [Prisoner of Impel Down] from hand.
  //   [On Your Opponent's Attack] Once per turn, 1 [Prisoner of Impel Down] gains [Blocker] this turn.
  {
    cardNumber: 'OP16-048',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { category: 'character', name: 'Prisoner of Impel Down' } }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { name: 'Prisoner of Impel Down' } }, keyword: 'blocker', duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  { cardNumber: 'OP16-049', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'draw', amount: 1 }] } },

  // OP16-050 (character) Miss Olive —
  //   [Blocker][On Play] You may return 1 of your Characters with a cost of 2 or more to the owner's hand:
  //   Draw 2 cards and trash 1 card from your hand.
  {
    cardNumber: 'OP16-050',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { minCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
        { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' },
        { fn: 'trashFromHand', count: 1, ifPrevious: 'previousMovedAny' },
      ],
    },
  },

  { cardNumber: 'OP16-051', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'draw', amount: 2 }] } },

  // OP16-052 - [Activate: Main] [Once Per Turn] Give up to 1 rested DON!! to Leader/Character.
  { cardNumber: 'OP16-052', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },

  { cardNumber: 'OP16-053', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'selfHand', atMost: 6 }], functions: [{ fn: 'draw', amount: 1 }] } },

  {
    cardNumber: 'OP16-054',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your', gate: [{ kind: 'selfHand', atLeast: 5 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP16-055 - [On Play] draw 1. [DON!! x1][When Attacking] base power becomes opponent Leader power.
  {
    cardNumber: 'OP16-055',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'leader', player: 'opponent' }, duration: 'duringThisTurn' }] } },
    ],
  },

  // OP16-056 (character) Mr.3(Galdino) —
  //   [Activate: Main] You may trash this Character: Draw 2 cards, and up to 1 of your opponent's
  //   Characters with a cost of 9 or less cannot attack until the end of your opponent's next End Phase.
  { cardNumber: 'OP16-056', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 9 } }, duration: 'endOfOpponentsTurn', optional: true }] } },

  // OP16-057 — [Counter] If you have 2+ [Prisoner of Impel Down] cards, +4000. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP16-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfNamedCardCount', name: 'Prisoner of Impel Down', atLeast: 2 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  // OP16-058 (event) The Prisoners Are Rioting!! —
  //   [Main] If you have 10 DON!! cards on your field, all of your [Prisoner of Impel Down] cards' base
  //   power becomes 7000 during this turn.[Counter] Up to 1 of your [Buggy] gains +4000 power during this
  //   battle.
  {
    cardNumber: 'OP16-058',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'selfDonFieldCount', atLeast: 10 }], functions: [{ fn: 'setBasePowerAuraControllerTypes', value: 7000, duration: 'duringThisTurn', anyOfNames: ['Prisoner of Impel Down'] }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Buggy' } }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
    ],
  },

  { cardNumber: 'OP16-059', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  // OP16-060 (leader) Sengoku — DON!! -8 active: play up to 3 {Admiral} Characters with different names from hand.
  { cardNumber: 'OP16-060', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 8, activeOnly: true }], functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Admiral' }, maxTargets: 3, distinctNames: true }] } },

  // OP16-063 — [On Play] Add up to 2 DON!! (rested). [Activate: Main] DON!! -1: 1 opponent Character loses [Blocker] access this turn.
  {
    cardNumber: 'OP16-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'suppressBlockerOnTarget', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP16-064 — [On Play] Look at 5; add up to 1 Navy (excl. same name).
  {
    cardNumber: 'OP16-064',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy', excludeSelfName: true } }] },
  },

  // OP16-065 (character) Sakazuki —
  //   [On Play] DON!! −1: Give up to 1 of your opponent's Characters −6000 power until the end of your
  //   opponent's next End Phase.[Activate: Main] [Once Per Turn] You may rest 1 of your DON!! cards: If
  //   your Leader has the {Navy} type, add up to 2 DON!! cards from your DON!! deck and set them as active.
  {
    cardNumber: 'OP16-065',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          cost: [{ kind: 'donMinus', count: 1 }],
          functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -6000, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 1 }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          oncePerTurn: true,
          cost: [{ kind: 'restDon', count: 1 }],
          gate: [{ kind: 'leaderType', type: 'Navy' }],
          functions: [{ fn: 'addDonFromDeck', count: 2, rested: false }],
        },
      },
    ],
  },

  { cardNumber: 'OP16-066', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'addDonFromDeck', count: 2, rested: true }, { fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },

  // OP16-067 - [On Play] Look at 5; add Navy, bottom rest, then trash 1 from hand.
  {
    cardNumber: 'OP16-067',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
    ],
  },

  {
    cardNumber: 'OP16-068',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn' }] } },
    ],
  },

  // OP16-119 — [On Play] look 3 → up to 1 to Life top, rest bottom in order; [Trigger] negate + K.O.
  {
    cardNumber: 'OP16-119',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [{
            fn: 'searchTopDeck',
            look: 3,
            pick: 1,
            reveal: false,
            destination: 'lifeTop',
            remainder: 'bottom',
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'negateEffect', target: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, maxTargets: 1, ifPrevious: 'previousSelectedAny' },
      ] } },
    ],
  },


  { cardNumber: 'OP16-030', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true }] } }, { templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', filter: { color: 'green', maxCost: 5 } }] } }] },


  {
    cardNumber: 'OP16-034',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelfScaling', per: 'controllerCharacterDistinctNames', step: 1, amountPer: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1, turn: 'your' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' }, remainder: 'bottom' }] } },
    ],
  },


  { cardNumber: 'OP16-039', templates: [{ templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { name: 'Monkey.D.Luffy' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, maxTargets: 2, ifGate: [{ kind: 'leaderType', type: 'Impel Down' }] }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }] } }] },


  { cardNumber: 'OP16-070', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'restDon', count: 2 }], gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },


  // OP16-073 — [On Play] add 1 active + 1 rested DON!!.
  //   [End of Your Turn] DON!! −2: set this active; gains [Blocker] until end of opponent's next End Phase.
  {
    cardNumber: 'OP16-073',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }, { fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'setActiveSelf' }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'endOfOpponentsTurn' }] } },
    ],
  },


  { cardNumber: 'OP16-075', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Navy' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }, { fn: 'addDonFromDeck', count: 1, rested: true }] } },


  // OP16-102 — [On K.O.] Draw 1, then play up to 1 [Fullalead] (a Stage) from hand or trash. [Trigger] same.
  // BUGFIX 2026-07-12: filter.category was 'character' — [Fullalead] (OP09-099) is a Stage, so the play
  // step could never find it. Also added the "or trash" branch the card text requires (was hand-only).
  {
    cardNumber: 'OP16-102',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'chooseOne', chooser: 'controller', prompt: 'Play [Fullalead] from:', options: [
          { label: 'skip', functions: [] },
          { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'stage', name: 'Fullalead' } }] },
          { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'stage', name: 'Fullalead' } }] },
        ] },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'draw', amount: 1 },
        { fn: 'chooseOne', chooser: 'controller', prompt: 'Play [Fullalead] from:', options: [
          { label: 'skip', functions: [] },
          { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'stage', name: 'Fullalead' } }] },
          { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'stage', name: 'Fullalead' } }] },
        ] },
      ] } },
    ],
  },


  { cardNumber: 'OP16-007', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalRevealTypeFromHand', filter: { category: 'character', exactPower: 8000 } }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousSelectedAny' }] } },


  { cardNumber: 'OP16-008', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { exactBasePower: 10000 } }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 8000 } }, optional: true, ifPrevious: 'previousMovedAny' }] } },


  { cardNumber: 'OP16-009', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true }] } },


  { cardNumber: 'OP16-010', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },


  { cardNumber: 'OP16-011', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'draw', amount: 1 }] } },


  { cardNumber: 'OP16-012', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'selfHandMatching', category: 'character', exactPower: 8000, atLeast: 1 }], functions: [{ fn: 'giveDon', count: 1 }] } },


  { cardNumber: 'OP16-017', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { gate: [{ kind: 'selfHand', atMost: 3 }] } }] } },


  // OP16-045 (character) Crocodile —
  //   [Blocker] is card-data (hasBlocker). [On Play] You may return 1 of your Characters with a cost of
  //   2 or more to the owner's hand: Play up to 1 {Impel Down} type Character card with a cost of 2 or
  //   less from your hand. (FAQ: may return this Character itself.)
  {
    cardNumber: 'OP16-045',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [
        { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { minCost: 2 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 },
        { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Impel Down', maxCost: 2 }, ifPrevious: 'previousMovedAny' },
      ],
    },
  },


  {
    cardNumber: 'OP16-087',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'Land of Wano' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Trash this Character to draw and give [Kouzuki Momonosuke] +20 cost?',
        options: [
          { label: 'skip', functions: [] },
          {
            label: 'trashThis',
            functions: [
              { fn: 'trashSelf' },
              { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
              { fn: 'addCost', target: { group: 'characters', player: 'controller', filter: { name: 'Kouzuki Momonosuke' } }, amount: 20, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
            ],
          },
        ],
      }],
    },
  },

  // --- codegen batch ---
  {
    cardNumber: 'OP16-069',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },


  {
    cardNumber: 'OP16-071',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addDonFromDeck', count: 1, rested: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
    ],
  },

  // OP16-072 — [On Play] Look at 5; add up to 1 Impel Down type.
  {
    cardNumber: 'OP16-072',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Impel Down' } }] },
  },


  // OP16-074 (character) Magellan —
  //   [On Play] If your Leader has the {Impel Down} type, your opponent returns 1 DON!! card from their
  //   field to their DON!! deck.[On K.O.] Your opponent returns 4 DON!! cards from their field to their
  //   DON!! deck.
  {
    cardNumber: 'OP16-074',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Impel Down' }], functions: [{ fn: 'returnOpponentDon', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'returnOpponentDon', count: 4 }] } },
    ],
  },


  // OP16-076 — [Main] rest 3 DON!!: up to 3 {Admiral} Characters +2000 this turn. [Counter] If you have an {Admiral}, +4000.
  {
    cardNumber: 'OP16-076',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Admiral' } }, amount: 2000, duration: 'duringThisTurn', optional: true, maxTargets: 3 }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Admiral', atLeast: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }] } },
    ],
  },

  { cardNumber: 'OP16-077', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 2, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' }, remainder: 'bottom' }, { fn: 'trashFromHand', count: 1 }] } },

  // OP16-078 - [On Play] Search Navy. [Activate: Main] DON!! -1, rest this Stage: draw 1, trash 1.
  {
    cardNumber: 'OP16-078',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }, { kind: 'restThis' }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // OP16-079 (leader) Yamato —
  //   When a {Land of Wano} type Character card is played from your trash, that Character gains [Rush]
  //   during this turn.(This card can attack on the turn in which it is played.)
  { cardNumber: 'OP16-079', templateId: 'ability', params: { timing: 'onCharacterPlayedFromTrash', gate: [{ kind: 'playedCharacterTypeIncludes', typeIncludes: 'Land of Wano' }], functions: [{ fn: 'addKeyword', target: { ref: 'eventPlayedCharacter' }, keyword: 'rush', duration: 'duringThisTurn' }] } },

  // OP16-080 (leader) Marshall.D.Teach —
  //   [Opponent's Turn] All of your Characters gain +1 cost.
  //   [On Your Opponent's Attack] [Once Per Turn] optional trash [Trigger] → redirect attack to this Leader or {Blackbeard Pirates} Character.
  //   Static aura uses onEnterPlay; setup fires Leader onEnterPlay via advanceStartOfGameEffects.
  {
    cardNumber: 'OP16-080',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraControllerCharacters', amount: 1, duration: 'permanent', sourceCondition: { turn: 'opponent' } }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onOpponentsAttack',
          oncePerTurn: true,
          functions: [
            { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
            {
              fn: 'redirectAttackTarget',
              target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Blackbeard Pirates', typeFilterCharactersOnly: true } },
              ifPrevious: 'previousMovedAny',
            },
          ],
        },
      },
    ],
  },

  { cardNumber: 'OP16-081', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },

  {
    cardNumber: 'OP16-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 3, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }], functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano' }, remainder: 'trash' }] } },
    ],
  },

  // OP16-083 — [Blocker] [On Play] trash 1 Character cost 8+ from hand: draw 2.
  { cardNumber: 'OP16-083', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', minCost: 8 }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },


  // OP16-084 (character) Kouzuki Momonosuke —
  //   [Activate: Main] You may trash this Character with a cost of 20 or more: If you have 9 or more DON!!
  //   cards on your field, play up to 1 [Kouzuki Momonosuke] with a cost of 9 from your trash.
  { cardNumber: 'OP16-084', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'selfDonFieldCount', atLeast: 9 }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Kouzuki Momonosuke', exactCost: 9 } }] } },

  // OP16-085 — [Blocker][On Play] Play {Land of Wano} cost ≤6 from trash other than [Kouzuki Momonosuke].
  { cardNumber: 'OP16-085', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 6, excludeCardNames: ['Kouzuki Momonosuke'] } }] } },

  { cardNumber: 'OP16-089', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, duration: 'duringThisTurn', optional: true }] } },

  { cardNumber: 'OP16-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] } },

  // OP16-091 - [On Play] If Leader has Land of Wano, look at 4; add Land of Wano other than self, trash rest.
  {
    cardNumber: 'OP16-091',
    templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Land of Wano' }], functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Land of Wano', excludeSelfName: true }, remainder: 'trash' }] },
  },

  // OP16-092 — [On Play] trash 1 Character cost 8+ from hand: draw 2.
  { cardNumber: 'OP16-092', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', minCost: 8 }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },


  { cardNumber: 'OP16-093', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }, { fn: 'giveDon', count: 1 }] } },

  {
    cardNumber: 'OP16-094',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 2 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] } },
    ],
  },

  // OP16-095 — [On Play] up to 1 black {Land of Wano} Character gains [Unblockable] this turn.
  { cardNumber: 'OP16-095', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { color: 'black', typeIncludes: 'Land of Wano' } }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true }] } },


  // OP16-096 — [On K.O.] Play up to 1 [Yamato] cost ≤6 from trash.
  { cardNumber: 'OP16-096', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Yamato', maxCost: 6 } }] } },

  { cardNumber: 'OP16-097', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Land of Wano', maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'playFromHand', filter: { category: 'character', maxCost: 2 } }] } },

  // OP16-098 — [On Play] Draw 1, trash 1.
  //   [Activate: Main] You may trash this Character: play up to 1 black [Yamato] cost 8 from trash.
  {
    cardNumber: 'OP16-098',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [
        { fn: 'playFromTrash', filter: { category: 'character', color: 'black', name: 'Yamato', exactCost: 8 } },
      ] } },
    ],
  },

  {
    cardNumber: 'OP16-099',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 6 }], functions: [{ fn: 'trashTopDeck', count: 5 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Land of Wano', maxCost: 6 } }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  { cardNumber: 'OP16-100', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },

  // OP16-101 — [Main] up to 1 Leader/Char +3000 this turn; if trash has 10+, K.O. cost 2 or less. [Trigger] add [Yamato] from trash to hand.
  {
    cardNumber: 'OP16-101',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, ifGate: [{ kind: 'selfTrashCount', atLeast: 10 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { name: 'Yamato' } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },


  // OP16-103 — [On K.O.] If Leader {Blackbeard Pirates}, draw 1, give up to 1 opp Leader/Char −3000. [Trigger] same.
  {
    cardNumber: 'OP16-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },

  // OP16-104 - [When Attacking] copy selected opponent Character power. [Trigger] draw 1, play Blackbeard Pirates cost 1 from trash.
  {
    cardNumber: 'OP16-104',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'setBasePowerFromSource', target: { ref: 'self' }, source: { group: 'characters', player: 'opponent' }, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'Blackbeard Pirates', exactCost: 1 } }] } },
    ],
  },

  // OP16-105 — [Trigger] If ≤1 Life, play up to 1 each of [Absalom]/[Dr. Hogback]/[Perona] cost ≤4 from trash.
  { cardNumber: 'OP16-105', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 1 }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Absalom', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', name: 'Dr. Hogback', maxCost: 4 } }, { fn: 'playFromTrash', filter: { category: 'character', name: 'Perona', maxCost: 4 } }] } },

  // OP16-106 — [On K.O.]/[Trigger] If Leader {Blackbeard Pirates}, draw 1 and set 1 own Leader/Character base power to 7000 this turn.
  {
    cardNumber: 'OP16-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'setBasePower', target: { group: 'leaderOrCharacters', player: 'controller' }, value: 7000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'setBasePower', target: { group: 'leaderOrCharacters', player: 'controller' }, value: 7000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP16-107 — [On K.O.] up to 1 opp top Life → owner's hand; [Trigger] trash 1 → play this.
  {
    cardNumber: 'OP16-107',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onKO',
          functions: [{
            fn: 'moveCards',
            from: { zone: 'life', player: 'opponent', position: 'top', count: 1 },
            to: { zone: 'hand', player: 'owner' },
            optional: true,
          }],
        },
      },
      {
        templateId: 'ability',
        params: {
          timing: 'lifeTrigger',
          functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }],
        },
      },
    ],
  },

  { cardNumber: 'OP16-108', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Blackbeard Pirates', maxCost: 6 } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  {
    cardNumber: 'OP16-109',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, maxTargets: 2 }] } },
    ],
  },

  {
    cardNumber: 'OP16-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true }] } },
    ],
  },

  { cardNumber: 'OP16-111', templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP16-113 — Has [Blocker] while at 2 or less Life. [Trigger] If Leader {Kuja Pirates}, play this.
  {
    cardNumber: 'OP16-113',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'selfLife', atMost: 2 }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Kuja Pirates' }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  {
    cardNumber: 'OP16-114',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
    ],
  },

  {
    cardNumber: 'OP16-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { hasTrigger: true, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'negateEffect', target: { group: 'leaderOrCharacters', player: 'opponent' }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP16-116 — [Main] If 10 DON!! play Marshall.D.Teach; then opp top Life → owner's hand. [Trigger] Draw 2, trash 1.
  {
    cardNumber: 'OP16-116',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [
            {
              fn: 'playFromHand',
              filter: { category: 'character', name: 'Marshall.D.Teach' },
              ifGate: [{ kind: 'selfDonFieldCount', atLeast: 10 }],
            },
            {
              fn: 'moveCards',
              from: { zone: 'life', player: 'opponent', position: 'top', count: 1 },
              to: { zone: 'hand', player: 'owner' },
              optional: true,
            },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },

  {
    cardNumber: 'OP16-117',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'optionalTrashFromHand', count: 1, filter: { hasTrigger: true } },
        { fn: 'negateEffect', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Blackbeard Pirates' } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP16-118 — hand Counter becomes +2000 for 8000-power Characters; [On Play]/[On K.O.] look 5.
  {
    cardNumber: 'OP16-118',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [{
            fn: 'addCounterAuraControllerCharactersInHand',
            setValue: 2000,
            duration: 'permanent',
            exactBasePower: 8000,
          }],
        },
      },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { typeIncludes: 'Whitebeard Pirates' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Monkey.D.Luffy' }, { typeIncludes: 'Whitebeard Pirates' }] }, remainder: 'bottom' }] } },
    ],
  },

];
