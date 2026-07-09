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

  // PRB02-006 (character) Roronoa Zoro —
  //   [Opponent's Turn] If this Character would be rested by your opponent's Character's effect, you may
  //   rest 1 of your other Characters instead.[Blocker]
  // NOTE: not yet implemented (needs template).


  // PRB02-009 (character) Mr.3(Galdino) —
  //   This effect can be activated when this Character is rested by your opponent's effect. You may trash
  //   this Character and draw 2 cards.[Blocker]
  // NOTE: not yet implemented (needs template).

  // PRB02-010 (character) Charlotte Pudding —
  //   [On Play] DON!! −2: If your Leader has the {Big Mom Pirates} type and your opponent has 6 or more
  //   DON!! cards on their field, draw 2 cards. Then, play up to 1 {Big Mom Pirates} type Character card
  //   with 6000 to 8000 power from your hand.
  // NOTE: not yet implemented (needs template).



  // PRB02-014 (character) Sabo —
  //   If you have 15 or more cards in your trash, give this card in your hand −3 cost.[Blocker] (After your
  //   opponent declares an attack, you may rest this card to make it the new target of the attack.)
  // NOTE: not yet implemented (needs template).



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

  // PRB02-018 (character) Portgas.D.Ace —
  //   [On Play] If you have a face-up Life card, play up to 1 [Sabo], [Portgas.D.Ace], or [Monkey.D.Luffy]
  //   with a cost of 2 from your hand or trash.
  // NOTE: not yet implemented (needs template).


  { cardNumber: 'PRB02-001', templates: [{ templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { turn: 'opponent', gate: [{ kind: 'leaderType', type: 'Navy' }] } }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 3000 } }, optional: true }, { fn: 'draw', amount: 1, ifGate: [{ kind: 'selfHand', atMost: 6 }], ifPrevious: 'previousSelectedAny' }] } }] },


  // PARTIAL: KO-replacement −2000 deferred.
  { cardNumber: 'PRB02-002', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },


  { cardNumber: 'PRB02-007', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea', excludeSelfName: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } }] },


  { cardNumber: 'PRB02-012', templates: [{ templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true }, remainder: 'bottom' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } }] },


  { cardNumber: 'PRB02-013', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Thriller Bark Pirates' }], functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxCost: 4 }, rested: true }, { fn: 'giveDon', count: 1, ifPrevious: 'previousMovedAny' }] } },


  // PARTIAL: static Blocker/+4 cost deferred.
  { cardNumber: 'PRB02-015', templateId: 'ability', params: { timing: 'onKO', gate: [{ kind: 'leaderType', type: 'Blackbeard Pirates' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 4 } }, optional: true }] } },


  { cardNumber: 'PRB02-016', templates: [{ templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } }, { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } }] },


  // PARTIAL: opponent 6+ DON gate dropped.
  { cardNumber: 'PRB02-010', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'draw', amount: 2 }, { fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Big Mom Pirates', minPower: 6000, maxPower: 8000 }, ifPrevious: 'previousSelectedAny' }] } },


  // PARTIAL: static −3 cost in hand deferred; [Blocker] is printed.
  { cardNumber: 'PRB02-014', templateId: 'ability', params: { timing: 'onEnterPlay', gate: [{ kind: 'selfTrashCount', atLeast: 15 }], functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: -3, duration: 'permanent' }] } },


  // PARTIAL: face-up Life gate + play from trash deferred; mapped hand play only.
  { cardNumber: 'PRB02-018', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', maxCost: 2, anyOf: [{ name: 'Sabo' }, { name: 'Portgas.D.Ace' }, { name: 'Monkey.D.Luffy' }] } }] } },

  // --- codegen batch ---
  { cardNumber: 'PRB02-008', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 2 }] } },

  { cardNumber: 'PRB02-011', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderMulticolor' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

];
