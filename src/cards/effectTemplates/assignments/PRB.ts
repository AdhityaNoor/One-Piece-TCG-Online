/**
 * Reviewed effect template assignments - Premium Booster (PRB) sets.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const PRB_ASSIGNMENTS: CardEffectAssignment[] = [

  // PRB02-003 — [Blocker] [On Play] trash 1 Character with 6000+ power from hand: draw 2.
  { cardNumber: 'PRB02-003', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { category: 'character', minPower: 6000 }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }] } },

  // PRB01-001 (leader) Sanji —
  {
    cardNumber: 'PRB01-001',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { noBaseEffect: true, maxCost: 8 } }, keyword: 'rush', duration: 'duringThisTurn', optional: true, maxTargets: 1 }],
    },
  },




  // PRB02-004 — [Blocker] [On Your Opponent's Attack] [Once Per Turn] Set up to 1 of your DON!! cards as active.
  { cardNumber: 'PRB02-004', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // PRB02-005 (character) Monkey.D.Luffy —
  //   [Your Turn] [On Play] If your Leader is multicolored and your opponent has 7 or less DON!! cards on
  //   their field, your opponent rests 1 of their active DON!! cards at the start of their next Main Phase.
  { cardNumber: 'PRB02-005', templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'leaderMulticolor' }, { kind: 'opponentDonFieldCount', atMost: 7 }], functions: [{ fn: 'restOpponentDonAtStartOfNextMain' }] } },

  {
    cardNumber: 'PRB02-006',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerRestReplacementSelf',
        sourceCondition: { turn: 'opponent' },
        effectSourceController: 'opponent',
        effectSourceCategory: 'character',
        duration: 'permanent',
      }],
    },
  },


  // PRB02-009 (character) Mr.3(Galdino) —
  //   This effect can be activated when this Character is rested by your opponent's effect. You may trash
  //   this Character and draw 2 cards.[Blocker]
  // PARTIAL: "rested by opponent's effect" trigger deferred; mapped onRested trash-self → draw 2.
  { cardNumber: 'PRB02-009', templateId: 'ability', params: { timing: 'onRested', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'draw', amount: 2 }] } },



  // PRB02-017 (character) Boa Hancock —
  //   [On Play] You may trash 1 card with a [Trigger] from your hand: Your opponent's rested Leader or up
  //   to 1 of your opponent's Characters other than [Monkey.D.Luffy] cannot attack until the end of your
  //   opponent's next End Phase. [Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or
  //   less.
  {
    cardNumber: 'PRB02-017',
    templates: [
      {
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true },
            {
              fn: 'preventAttack',
              target: { group: 'leaderOrCharacters', player: 'opponent', filter: { restedLeader: true, excludeName: 'Monkey.D.Luffy' } },
              duration: 'endOfOpponentsTurn',
              optional: true,
              maxTargets: 1,
              ifPrevious: 'previousMovedAny',
            },
          ],
        },
      },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true, maxTargets: 1 }] } },
    ],
  },


  { cardNumber: 'PRB02-001', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Navy' }] } }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, optional: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 6 }], ifPrevious: 'previousSelectedAny' }] } }] },


  // Closed 2026-07-16 field-removal replacement pass: KO-replacement (self −2000 power, opponent-effect, OPT) via registerKoReplacementSelf.
  { cardNumber: 'PRB02-002', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementSelf', scope: 'effect', oncePerTurn: true, replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', giveSelfPowerPenalty: { amount: 2000, duration: 'duringThisTurn' }, duration: 'permanent' }] } },
    { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  ] },


  { cardNumber: 'PRB02-007', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea', excludeSelfName: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } }] },


  { cardNumber: 'PRB02-012', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } }] },


  { cardNumber: 'PRB02-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4 }, rested: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },


  // Closed 2026-07-16 conditional keyword/cost aura pass: static [Blocker] + cost aura gated by Blackbeard Pirates leader, via self-named addKeywordAuraControllerCharacters/addCostAuraControllerCharacters.
  { cardNumber: 'PRB02-015', templates: [
    { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [
      { fn: 'addKeywordAuraControllerCharacters', keyword: 'blocker', duration: 'permanent', anyOfNames: ['Shiryu'], gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }] },
      { fn: 'addCostAuraControllerCharacters', amount: 4, duration: 'permanent', anyOfNames: ['Shiryu'], gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }] },
    ] } },
    { templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }] } },
  ] },


  { cardNumber: 'PRB02-016', templates: [{ templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } }] },


  // PRB02-010 — [On Play] DON!! −2: If Leader {Big Mom Pirates} and opponent has 6+ DON!!, draw 2, then play up to 1 {Big Mom Pirates} 6000–8000 power Character from hand.
  { cardNumber: 'PRB02-010', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }, { kind: 'opponentDonFieldCount', atLeast: 6 }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Big Mom Pirates', minPower: 6000, maxPower: 8000 }, ifPrevious: 'previousSelectedAny' }] } },


  // Closed 2026-07-16 conditional keyword/cost aura pass: static −3 cost in hand (15+ trash) via addCostAuraSameCardInHand; [Blocker] is printed.
  { cardNumber: 'PRB02-014', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -3, duration: 'permanent', gate: [{ kind: 'selfTrashCount', atLeast: 15 }] }] } },


  // PRB02-018 — [On Play] If face-up Life: play up to 1 [Sabo]/[Ace]/[Luffy] cost==2 from hand or trash.
  {
    cardNumber: 'PRB02-018',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'selfHasFaceUpLife' }],
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Play from:',
        options: [
          { label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { category: 'character', exactCost: 2, anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }] } }] },
          { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { category: 'character', exactCost: 2, anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }] } }] },
        ],
      }],
    },
  },

  // --- codegen batch ---
  { cardNumber: 'PRB02-008', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 2 }] } },

  { cardNumber: 'PRB02-011', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

];
