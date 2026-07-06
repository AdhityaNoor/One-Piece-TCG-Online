/**
 * Reviewed effect template assignments - Main Booster OP04.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP04_ASSIGNMENTS: CardEffectAssignment[] = [

  // OP04-022 — [Activate: Main] You may rest this Character: Rest up to 1 of your opponent's Characters with a cost of 1 or less.
  {
    cardNumber: 'OP04-022',
    templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true }] },
  },
  // OP04-045 — [On Play] Draw 1 card.
  { cardNumber: 'OP04-045', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP04-049 — [On K.O.] Draw 1 card.
  { cardNumber: 'OP04-049', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
  // OP04-051 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP04-051',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } }] },
  },
  // OP04-092 - [On Play] Look at 3; add Dressrosa other than this card's name, trash rest.
  {
    cardNumber: 'OP04-092',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Dressrosa', excludeSelfName: true }, remainder: 'trash' }] },
  },
  // OP04 coverage batch: base-power targeting, trigger-play, and simple activated draw.
  { cardNumber: 'OP04-003', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 5000 } }, optional: true }] } },
  {
    cardNumber: 'OP04-052',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }, { kind: 'restThis' }], functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  {
    cardNumber: 'OP04-101',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
    ],
  },
  {
    cardNumber: 'OP04-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  { cardNumber: 'OP04-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // ── Triage batch (OP04 expressible): Alabasta/Dressrosa/Wano lines. ────────
  // OP04-008 Chaka — [DON!! x1][When Attacking] If Leader [Nefeltari Vivi]: −3000 to 1 opp, then K.O. one at 0 power or less.
  { cardNumber: 'OP04-008', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'leaderName', name: 'Nefeltari Vivi' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 0 } }, optional: true }] } },
  // OP04-010 Tony Tony.Chopper — [On Play] Play up to 1 {Animal} Character with base power 3000 or less from hand.
  { cardNumber: 'OP04-010', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { typeIncludes: 'Animal', maxPower: 3000 } }] } },
  // OP04-013 Pell — [DON!! x1][When Attacking] K.O. up to 1 opp Character with 4000 power or less.
  { cardNumber: 'OP04-013', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
  // OP04-015 Roronoa Zoro — [On Play] Give up to 1 opp Character −2000 power this turn.
  { cardNumber: 'OP04-015', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP04-016 Bad Manners Kick Course — [Counter] trash 1 → +3000 battle. [Trigger] give 1 opp Leader/Char −3000 this turn.
  {
    cardNumber: 'OP04-016',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP04-017 Happiness Punch — [Counter] give up to 1 opp Leader/Char −2000 this turn.
  //   PARTIAL: the "if your Leader is active, −1000 more" rider needs a leader-active gate (deferred).
  { cardNumber: 'OP04-017', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP04-018 Enchanting Vertigo Dance — [Main]/[Trigger] If Leader {Alabasta}: give up to 2 opp Characters −2000 this turn.
  {
    cardNumber: 'OP04-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'leaderType', type: 'Alabasta' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
    ],
  },
  // OP04-019 Donquixote Doflamingo (leader) — [End of Your Turn] Set up to 2 DON!! active.
  { cardNumber: 'OP04-019', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }] } },
  // OP04-027 Daddy Masterson — [DON!! x1][End of Your Turn] Set this Character active.
  { cardNumber: 'OP04-027', templateId: 'ability', params: { timing: 'endOfTurn', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'setActiveSelf' }] } },
  // OP04-029 Dellinger — [End of Your Turn] Set up to 1 DON!! active.
  { cardNumber: 'OP04-029', templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
  // OP04-030 Trebol — [On Play] K.O. up to 1 opp rested Character with a cost of 5 or less.
  //   (The [On Your Opponent's Attack] rest clause needs an onOpponentAttack timing — deferred.)
  { cardNumber: 'OP04-030', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true }] } },
  // OP04-035 Spiderweb — [Counter] +4000 battle, then set up to 1 of your Characters active. [Trigger] Leader +2000 this turn.
  {
    cardNumber: 'OP04-035',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'setActiveControllerCharacter', maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 2000, duration: 'duringThisTurn' }] } },
    ],
  },
  // OP04-036 Donquixote Family — [Counter]/[Trigger] Look at 5; reveal up to 1 {Donquixote Pirates} to hand, rest to bottom.
  {
    cardNumber: 'OP04-036',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Donquixote Pirates' } }] } },
    ],
  },
  // OP04-037 Flapping Thread — [Counter] If Leader {Donquixote Pirates}: +2000 this turn. [Trigger] K.O. 1 opp rested Char cost ≤4.
  {
    cardNumber: 'OP04-037',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Donquixote Pirates' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
    ],
  },
  // OP04-038 The Weak Do Not Have the Right... — [Main]/[Counter] Rest 1 opp Leader/Char, then K.O. 1 opp rested Char cost ≤6. [Trigger] Set up to 5 DON!! active.
  {
    cardNumber: 'OP04-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'setActiveControllerDon', maxTargets: 5 }] } },
    ],
  },
  // OP04-044 Kaido — [On Play] Return up to 1 Character cost ≤8 and up to 1 Character cost ≤3 to the owner's hand.
  { cardNumber: 'OP04-044', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 8 } }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP04-056 Gum-Gum Red Roc — [Main] Place up to 1 Character at bottom of owner's deck. [Trigger] cost ≤4.
  {
    cardNumber: 'OP04-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 4 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
    ],
  },
  // OP04-057 Dragon Twister Demolition Breath — [Counter] +4000 battle, then place 1 Char cost ≤1 at bottom of deck. [Trigger] return 1 Char cost ≤6 to hand.
  {
    cardNumber: 'OP04-057',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
    ],
  },
  // OP04-074 Colors Trap — [Counter] DON!! −1: +1000 battle, then rest 1 opp Char cost ≤4. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-074',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP04-075 Nez-Palm Cannon — [Counter] +6000 battle, then if ≤2 Life add 1 DON!! (rested). [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-075',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 6000, duration: 'duringThisBattle', optional: true }, { fn: 'addDonFromDeck', count: 1, rested: true, ifGate: [{ kind: 'selfLife', atMost: 2 }] }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP04-076 Weakness...Is an Unforgivable Sin. — [Counter] DON!! −1: +1000 this turn. [Trigger] add 1 DON!! (active).
  {
    cardNumber: 'OP04-076',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP04-093 Gum-Gum King Kong Gun — [Main] up to 1 {Dressrosa} Character +6000 this turn. [Trigger] draw 3, trash 2.
  //   PARTIAL: the "if 15+ trash, that card gains [Double Attack]" rider needs a trash-count gate (deferred).
  {
    cardNumber: 'OP04-093',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Dressrosa' } }, amount: 6000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 3, trashCount: 2 }] } },
    ],
  },
  // OP04-094 Trueno Bastardo — [Main] K.O. up to 1 opp Character cost ≤4.
  //   PARTIAL: the "if 15+ trash, cost ≤6 instead" upgrade (trash gate) and the [Trigger] "rest your Leader: K.O." (rest-leader cost) are deferred.
  { cardNumber: 'OP04-094', templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP04-115 Gun Modoki — [Main] add 1 top/bottom Life to hand → up to 1 {Land of Wano} Character gains [Double Attack] this turn. [Trigger] Leader/Char +1000 this turn.
  {
    cardNumber: 'OP04-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Land of Wano' } }, keyword: 'doubleAttack', duration: 'duringThisTurn', optional: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP04-116 Diable Jambe Joue Shot — [Counter] +6000 battle. [Trigger] draw 1.
  //   PARTIAL: the "if combined Life ≤4, K.O. 1 opp Char cost ≤2" rider needs a combined-Life gate (deferred).
  {
    cardNumber: 'OP04-116',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 6000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
];
