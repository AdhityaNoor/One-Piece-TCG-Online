/**
 * Reviewed effect template assignments - Main Booster OP08.
 *
 * Structural params only; never copy raw effect text into assignments.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP08_ASSIGNMENTS: CardEffectAssignment[] = [
  // ── Triage batch (OP08 expressible). "top or bottom of deck" placement is approximated as bottom. ──
  // OP08-002 (leader) — [DON!! x1][Activate: Main][OPT] Draw 1, place 1 from hand at bottom of deck, then give up to 1 opp Character −2000.
  { cardNumber: 'OP08-002', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' } }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP08-005 — [On Play] Give up to 1 opp Character −2000 this turn. PARTIAL: "if you don't have [Kuromarimo], play it" needs a named-absence gate (deferred).
  { cardNumber: 'OP08-005', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
  // OP08-008 — [On Play] give up to 1 opp Character −1000. [DON!! x1][Activate: Main][OPT] add 1 top Life to hand → this gains [Rush] this turn.
  {
    cardNumber: 'OP08-008',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP08-010 — [DON!! x1][Activate: Main][OPT] up to 1 of your {Animal} Characters +1000 this turn (self-exclusion dropped).
  { cardNumber: 'OP08-010', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { typeIncludes: 'Animal' } }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
  // OP08-013 — [DON!! x2] This Character gains [Rush].
  { cardNumber: 'OP08-013', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }] } },
  // OP08-050 — [Blocker][On Play] Draw 2, place 2 from hand at bottom of deck.
  { cardNumber: 'OP08-050', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 2 }] } },
  // OP08-053 — [Main] If Leader {Whitebeard Pirates}: Look 3, reveal up to 1 {Whitebeard Pirates}/[Monkey.D.Luffy] to hand, rest to bottom. [Trigger] Draw 1.
  {
    cardNumber: 'OP08-053',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Whitebeard Pirates' }], functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Whitebeard Pirates' }, { name: 'Monkey.D.Luffy' }] }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },
  // OP08-069 — [On Play] DON!! −1, trash 1 → add top of deck to top of Life. PARTIAL: "add opp Character to their Life face-up" is deferred.
  { cardNumber: 'OP08-069', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top', count: 1 }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' }] } },
  // OP08-075 — [Main] DON!! −1: Rest up to 1 opp Character cost ≤2. [Trigger] add 1 DON!! (active). PARTIAL: "turn all your Life face-down" deferred.
  {
    cardNumber: 'OP08-075',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }] } },
    ],
  },
  // OP08-084 — static: this Character +4 cost. [Activate: Main] rest this: draw 1, trash 1, then K.O. up to 1 opp Character cost ≤3.
  {
    cardNumber: 'OP08-084',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 4, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP08-105 — [Trigger] Draw 2, trash 1. PARTIAL: the [DON!! x1] custom "when a card leaves opp Life" trigger is deferred.
  { cardNumber: 'OP08-105', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
  // OP08-114 — [DON!! x1] If fewer Life than opp, this Character +2000. [Trigger] trash 1 → if ≤2 Life play this.
  //   PARTIAL: the "cannot be K.O.'d in battle by <Slash>" attribute immunity is deferred.
  {
    cardNumber: 'OP08-114',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 2000, duration: 'permanent', condition: { donAttachedAtLeast: 1, gate: [{ kind: 'selfLifeLessThanOpponent' }] } }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', gate: [{ kind: 'selfLife', atMost: 2 }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' }] } },
    ],
  },
  // OP08-115 — [Counter] If Leader {Shandian Warrior}: up to 1 Leader/Char +3000 this battle. [Trigger] Draw 2, trash 1.
  //   PARTIAL: "then play [Upper Yard]" (a Stage) is deferred — playFromHand plays Characters only.
  {
    cardNumber: 'OP08-115',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'leaderType', type: 'Shandian Warrior' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },
    ],
  },
  // OP08-116 — [Counter] up to 1 Leader/Char +4000 this battle, then add 1 top/bottom Life to hand → add 1 {Shandian Warrior} from hand to top of Life face-up.
  { cardNumber: 'OP08-116', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true }, { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'moveCards', from: { zone: 'hand', player: 'controller', filter: { typeIncludes: 'Shandian Warrior' } }, to: { zone: 'life', player: 'controller', position: 'top', faceUp: true }, optional: true, ifPrevious: 'previousMovedAny' }] } },

  // OP08-022 — [On Play] If Leader {Minks}, up to 2 opp rested Characters cost<=5 won't become active next Refresh.
  { cardNumber: 'OP08-022', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 5 } }, optional: true, maxTargets: 2 }] } },
  // OP08-023 — [On Play]/[When Attacking] Up to 1 opp rested Character cost<=7 won't become active next Refresh.
  {
    cardNumber: 'OP08-023',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 7 } }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 7 } }, optional: true }] } },
    ],
  },
  // OP08-024 — [When Attacking] Up to 1 opp rested Character cost<=4 won't become active next Refresh.
  { cardNumber: 'OP08-024', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 4 } }, optional: true }] } },
  // OP08-025 — [On Play] Up to 1 opp rested Character cost<=3 won't become active next Refresh.
  { cardNumber: 'OP08-025', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 3 } }, optional: true }] } },
  // OP08-026 — [DON!! x1] [When Attacking] Up to 1 opp rested Character cost<=1 won't become active next Refresh.
  { cardNumber: 'OP08-026', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 1 } }, optional: true }] } },

  // OP08-090 — [On Play] Play up to 1 {SMILE} Character with a cost of 2 or less from your trash.
  { cardNumber: 'OP08-090', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', typeIncludes: 'SMILE', maxCost: 2 } }] } },
  // OP08-092 — [On Play] Play up to 1 [Ulti] with a cost of 4 or less from your trash.
  { cardNumber: 'OP08-092', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'playFromTrash', filter: { category: 'character', name: 'Ulti', maxCost: 4 } }] } },

  // OP08-059 — [Activate: Main] Trash this: if Leader {Animal Kingdom Pirates} and 10 DON!!, play [King] cost<=7 from hand.
  { cardNumber: 'OP08-059', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }, { kind: 'selfDonFieldCount', atLeast: 10 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'King', maxCost: 7 } }] } },

  // --- Batch: OP08 cards expressible with existing primitives (+ new selfDonAtMostOpponent gate) ---

  // OP08-012 — [DON!! x2] [When Attacking] If Leader is {Drum Kingdom}, K.O. up to 1 opp Character with 4000 power or less.
  { cardNumber: 'OP08-012', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, gate: [{ kind: 'leaderType', type: 'Drum Kingdom' }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 4000 } }, optional: true }] } },
  // OP08-014 — [DON!! x1] [When Attacking] Give opp Character −2000; this Character gains +2000 until end of opp next turn.
  { cardNumber: 'OP08-014', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [
    { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
    { fn: 'addPowerSelf', amount: 2000, duration: 'endOfOpponentsTurn' },
  ] } },
  // OP08-017 — [Counter] +4000 to a Leader/Character, then −1000 to an opp Leader/Character. [Trigger] +1000.
  {
    cardNumber: 'OP08-017',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -1000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP08-018 — [Main] up to 3 of your Characters +1000, then opp Character −2000. [Trigger] opp Leader/Character −3000.
  {
    cardNumber: 'OP08-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 1000, duration: 'duringThisTurn', optional: true, maxTargets: 3 },
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true }] } },
    ],
  },
  // OP08-019 — [Main]/[Counter] opp Character −3000, then your Character +3000. [Trigger] K.O. opp Character power<=5000.
  {
    cardNumber: 'OP08-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [
        { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true },
        { fn: 'addPower', target: { group: 'characters', player: 'controller' }, amount: 3000, duration: 'duringThisTurn', optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 5000 } }, optional: true }] } },
    ],
  },
  // OP08-031 — [On Play] Set up to 1 of your {Minks} Characters with a cost of 2 or less as active.
  { cardNumber: 'OP08-031', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks', maxCost: 2 } }] } },
  // OP08-032 — [Activate: Main] Rest this: If Leader is {Minks}, set up to 1 of your DON!! cards as active.
  { cardNumber: 'OP08-032', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
  // OP08-039 — [Activate: Main] Rest this: if Leader {Minks}, set 1 DON active. [End of Your Turn] Set up to 1 {Minks} Character active.
  {
    cardNumber: 'OP08-039',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], gate: [{ kind: 'leaderType', type: 'Minks' }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Minks' } }] } },
    ],
  },
  // OP08-042 — [DON!! x1] [When Attacking] Return up to 1 Character with a cost of 3 or less to the owner's hand.
  { cardNumber: 'OP08-042', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 3 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
  // OP08-051 — [On Play] Up to 1 of your [Edward Weevil] cards gains +2000 power during this turn.
  { cardNumber: 'OP08-051', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Edward Weevil' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  // OP08-061 — [When Attacking] DON!! −1: K.O. up to 1 opp Character with a cost of 3 or less.
  { cardNumber: 'OP08-061', templateId: 'ability', params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
  // OP08-064 — [Activate: Main] DON!! −1: Play up to 1 [Biscuit Warrior] from your hand.
  { cardNumber: 'OP08-064', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Biscuit Warrior' } }] } },
  // OP08-066 — [Blocker] [On K.O.] Add up to 1 DON!! card from your DON!! deck and rest it.
  { cardNumber: 'OP08-066', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
  // OP08-068 — [On K.O.] Add DON!! rested. [Trigger] DON!! −1: Play this card.
  {
    cardNumber: 'OP08-068',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },
  // OP08-070 — [Blocker] [On K.O.] DON!! −1: Play up to 1 [Viscount Hiyoko] with a cost of 5 or less from your hand.
  { cardNumber: 'OP08-070', templateId: 'ability', params: { timing: 'onKO', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Viscount Hiyoko', maxCost: 5 } }] } },
  // OP08-071 — [Opponent's Turn] [On K.O.] DON!! −1: Play up to 1 [Baron Tamago] cost<=4 from deck, then shuffle.
  { cardNumber: 'OP08-071', templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Baron Tamago', maxCost: 4 } }] } },
  // OP08-073 — [Opponent's Turn] [On K.O.] DON!! −1: Play up to 1 [Count Niwatori] cost<=6 from deck, then shuffle.
  { cardNumber: 'OP08-073', templateId: 'ability', params: { timing: 'onKO', condition: { turn: 'opponent' }, cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Count Niwatori', maxCost: 6 } }] } },
  // OP08-085 — [DON!! x1] [When Attacking] If you have a Character with cost 8+, K.O. up to 1 opp Character cost<=4.
  { cardNumber: 'OP08-085', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } }, optional: true }] } },
  // OP08-088 — [On Play] Up to 1 of your Characters gains +1 cost until the end of your opponent's next turn.
  { cardNumber: 'OP08-088', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'controller' }, amount: 1, duration: 'endOfOpponentsTurn', optional: true }] } },
  // OP08-091 — [On Play] You may trash 1 from hand: K.O. opp Character cost<=3. [Trigger] K.O. opp Character cost<=3.
  {
    cardNumber: 'OP08-091',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny' },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP08-097 — [Main] If Leader {Animal Kingdom Pirates}, −2 cost to opp then K.O. opp cost 0. [Trigger] K.O. opp cost<=3.
  {
    cardNumber: 'OP08-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [
        { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true },
      ] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] } },
    ],
  },
  // OP08-104 — [Trigger] You may trash 1 from hand: Play this card. Then, draw 1 card.
  { cardNumber: 'OP08-104', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny' },
    { fn: 'draw', amount: 1, ifPrevious: 'previousMovedAny' },
  ] } },
  // OP08-107 — [Activate: Main] Rest this: Up to 1 of your [Charlotte Pudding] cards gains +2000 power during this turn.
  { cardNumber: 'OP08-107', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Pudding' } }, amount: 2000, duration: 'duringThisTurn', optional: true }] } },
  // OP08-110 — [On Play] Search {reveal [Upper Yard]} to hand, rest to bottom, then play up to 1 [Upper Yard] from hand.
  { cardNumber: 'OP08-110', templateId: 'ability', params: { timing: 'onPlay', functions: [
    { fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { name: 'Upper Yard' }, remainder: 'bottom' },
    { fn: 'playFromHand', filter: { category: 'character', name: 'Upper Yard' } },
  ] } },
  // OP08-111 — [DON!! x1] [When Attacking] Opp can't Blocker this battle. [Trigger] trash 1: if <=2 Life, play this.
  {
    cardNumber: 'OP08-111',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
      ] } },
    ],
  },
  // OP08-113 — [Trigger] You may trash 1: if <=2 Life, play this and K.O. up to 1 opp Character cost<=3.
  { cardNumber: 'OP08-113', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [
    { fn: 'optionalTrashFromHand', count: 1 },
    { fn: 'triggerPlaySelf', ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
    { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
  ] } },

  // OP08-034 — [On Play] Look at 5; add up to 1 Minks (excl. same name).
  {
    cardNumber: 'OP08-034',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Minks', excludeSelfName: true } }] },
  },
  // OP08-080 — [On Play] Look at 5; add up to 1 Animal Kingdom Pirates (excl. same name).
  {
    cardNumber: 'OP08-080',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Animal Kingdom Pirates', excludeSelfName: true } }] },
  },
  // OP08-015 - [On Play] Look at 4; add [Tony Tony.Chopper] or Drum Kingdom other than this card's name.
  {
    cardNumber: 'OP08-015',
    templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ name: 'Tony Tony.Chopper' }, { typeIncludes: 'Drum Kingdom' }], excludeSelfName: true } }] },
  },
  // OP08-087 — [Blocker] [Activate: Main] [Once Per Turn] Give up to 1 of your opponent's Characters −1 cost.
  // Note: [Blocker] is an engine keyword flag, not an IR ability. Only the activate effect is templated.
  {
    cardNumber: 'OP08-087',
    templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -1, optional: true }] },
  },
];
