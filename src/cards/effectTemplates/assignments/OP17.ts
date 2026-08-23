/**
 * Reviewed effect template assignments - Main Booster OP17
 * ("The World's Strongest Warriors", 119 card numbers, released 2026-08-28).
 *
 * Structural params only; never copy raw effect text into assignments.
 *
 * Curation notes for this set:
 *   - Static keywords ([Blocker], [Rush], [Trigger]) come from the scraped
 *     CardDefinition, so a card whose ONLY printed ability is a static keyword
 *     needs no entry here.
 *   - "You may trash N cards from your hand:" is NOT an AbilityCost — the cost
 *     union has no hand-trash member — so it is modeled as a leading
 *     `optionalTrashFromHand` function plus `ifPrevious: 'previousMovedAny'` on
 *     the payload, matching the OP10-OP16 idiom.
 *   - The Elbaph package keys off "If there is a Character with a cost of 12 or
 *     more", which is a CONTINUOUS board check, so the static self-buffs use
 *     `condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] }`
 *     (re-read on every power/keyword read) rather than an ability-level gate
 *     (checked once at fire time).
 *
 * Cards needing a primitive the engine does not have yet are NOT here; see the
 * deferral notes at the bottom of this file and effect-partial-curation.csv.
 */
import type { CardEffectAssignment } from '../assembler';

export const OP17_ASSIGNMENTS: CardEffectAssignment[] = [

  // ── Whitebeard Pirates (red) ──────────────────────────────────────────────

  // OP17-001 (leader) Edward.Newgate — [On Your Opponent's Attack] [Once Per Turn]
  //   trash 1 from hand: up to 1 of your Leader or Characters +4000 this battle.
  { cardNumber: 'OP17-001', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },

  // OP17-002 Atmos — [Opponent's Turn] this Character gains +3000 power.
  { cardNumber: 'OP17-002', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent' } }] } },

  // OP17-003 Izo — [On Play] if Leader is [Edward.Newgate] or {Land of Wano}:
  //   give up to 1 opponent RESTED Character −6000 this turn.
  //   ([Rush: Character] comes from the definition — see hasRush note at the bottom.)
  { cardNumber: 'OP17-003', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderName', name: 'Edward.Newgate' }, { kind: 'leaderType', type: 'Land of Wano' }] }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, amount: -6000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP17-004 Inuarashi & Nekomamushi — [On Play] up to 1 of your {Land of Wano}
  //   or "Whitebeard Pirates" Characters gains [Rush] this turn.
  { cardNumber: 'OP17-004', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller', filter: { anyOfTypes: ['Land of Wano', 'Whitebeard Pirates'] } }, keyword: 'rush', duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP17-007 Kouzuki Oden — [On Play] if Leader is [Edward.Newgate] or {Land of Wano}:
  //   play up to 1 {Land of Wano} / "Whitebeard Pirates" Character with 6000 power or less from hand.
  //   REVIEW: the "with 6000 power or less" clause is read as applying to BOTH type branches.
  { cardNumber: 'OP17-007', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyOf', gates: [{ kind: 'leaderName', name: 'Edward.Newgate' }, { kind: 'leaderType', type: 'Land of Wano' }] }], functions: [{ fn: 'playFromHand', filter: { category: 'character', maxPower: 6000, anyOf: [{ typeIncludes: 'Land of Wano' }, { typeIncludes: 'Whitebeard Pirates' }] }, maxTargets: 1, optional: true }] } },

  // OP17-009 Haruta — [Opponent's Turn] +3000. [On Play] K.O. up to 1 opponent Character with 2000 base power or less.
  {
    cardNumber: 'OP17-009',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 2000 } }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-010 Fossa — [Activate: Main] [Once Per Turn] if opponent has a 10000+ power Character
  //   and you have no other [Fossa]: this Character gains [Blocker] and +2000 until end of opponent's next End Phase.
  { cardNumber: 'OP17-010', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'opponentCharacterCurrentPowerCount', power: 10000, atLeast: 1 }, { kind: 'selfOtherNamedCharacterCount', name: 'Fossa', atMost: 0 }], functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'endOfOpponentsTurn' }, { fn: 'addPowerSelf', amount: 2000, duration: 'endOfOpponentsTurn' }] } },

  // OP17-011 Blamenco — [DON!! x2] [When Attacking] give up to 1 opponent Character −4000 this turn.
  { cardNumber: 'OP17-011', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 2 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -4000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP17-012 Blenheim — [On K.O.] play up to 1 cost-1 "Whitebeard Pirates" card from hand.
  { cardNumber: 'OP17-012', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromHand', filter: { exactCost: 1, typeIncludes: 'Whitebeard Pirates' }, maxTargets: 1, optional: true }] } },

  // OP17-013 Portgas.D.Ace — hand cost −2 while opponent has a 10000+ power Character.
  //   [On Play] if Leader is [Edward.Newgate]: opponent rested Character −6000 this turn.
  {
    cardNumber: 'OP17-013',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -2, duration: 'permanent', gate: [{ kind: 'opponentCharacterCurrentPowerCount', power: 10000, atLeast: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Edward.Newgate' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, amount: -6000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-014 Whitey Bay — [On Play] K.O. up to 1 opponent Character with 2000 base power or less.
  //   [On Your Opponent's Attack] trash this Character: your Leader +1000 this battle.
  {
    cardNumber: 'OP17-014',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 2000 } }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP17-016 Rakuyo — [On Play] K.O. up to 2 opponent Characters with 2000 base power or less.
  { cardNumber: 'OP17-016', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxBasePower: 2000 } }, optional: true, maxTargets: 2 }] } },

  // OP17-017 Ga Ha Ha Ha!! — [Counter] "Whitebeard Pirates" Leader/Character +2000 this battle,
  //   then opponent Leader/Character −2000 this turn.
  { cardNumber: 'OP17-017', templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Whitebeard Pirates' } }, amount: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP17-018 The Power to Destroy the World — [Main] rest 2 DON!!: K.O. up to 1 opponent Stage.
  //   [Counter] if you have 2+ Characters with 8000 base power or more: Leader/Character +4000 this battle.
  {
    cardNumber: 'OP17-018',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'stages', player: 'opponent' }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'selfCharacterBasePowerCount', power: 8000, mode: 'atLeast', atLeast: 2 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  // ── Red-Haired Pirates (red) ──────────────────────────────────────────────

  // OP17-025 Building Snake — [On K.O.] K.O. up to 1 opponent rested Character cost<=6.
  //   [Activate: Main] [Once Per Turn] give up to 1 rested DON!! to your [Shanks] Leader.
  {
    cardNumber: 'OP17-025',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'leaderName', name: 'Shanks' }], functions: [{ fn: 'giveDonControllerLeader', count: 1 }] } },
    ],
  },

  // OP17-026 Fugar — [When Attacking] if Leader is {Red-Haired Pirates}: rest up to 1 opponent Character cost<=2.
  //   [On K.O.] draw 1.
  {
    cardNumber: 'OP17-026',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP17-028 Bonk Punch & Monster — [On Play] K.O. up to 1 opponent rested Character cost<=6.
  { cardNumber: 'OP17-028', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true, maxTargets: 1 }] } },

  // OP17-036 Withdraw Now and Allow Me to Save Face — [Main] rest 6 DON!!: rest up to 1 opponent
  //   Character, then K.O. up to 2 opponent rested Characters cost<=6. [Counter] [Shanks] +4000.
  {
    cardNumber: 'OP17-036',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 6 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { rested: true, maxCost: 6 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Shanks' } }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-038 I Think He's Seen an Ugly Future... — [Main] rest 4 of your cards: rest up to 1 opponent Character.
  //   [Counter] trash 1 from hand: Leader/Character +3000 this battle.
  {
    cardNumber: 'OP17-038',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'restControllerCards', count: 4, optional: true }, { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 1, ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // ── Rocks Pirates (black/purple) ──────────────────────────────────────────

  // OP17-039 (leader) Rocks.D.Xebec — [When Attacking] trash 1 from hand: reveal top deck;
  //   if it includes "Rocks Pirates", draw 2.
  { cardNumber: 'OP17-039', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'revealTopThen', filter: { typeIncludes: 'Rocks Pirates' }, then: [{ fn: 'draw', amount: 2 }], ifPrevious: 'previousMovedAny' }] } },

  // OP17-041 Wang Zhi — [On Play] trash 1 from hand: place ALL opponent Characters with a
  //   BASE cost of 1 at the bottom of the owner's deck.
  { cardNumber: 'OP17-041', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveAllCards', from: { zone: 'characters', player: 'opponent', filter: { exactBaseCost: 1 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, ifPrevious: 'previousMovedAny' }] } },

  // OP17-042 Kaido — [On Play] reveal 3 "Rocks Pirates" cards from hand: opponent Character −3000 this turn.
  { cardNumber: 'OP17-042', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalRevealTypeFromHand', count: 3, filter: { typeIncludes: 'Rocks Pirates' }, prompt: 'You may reveal 3 "Rocks Pirates" cards from your hand.' }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousSelectedAny' }] } },

  // OP17-052 Don Marlon — [On Play] add up to 1 cost-0 blue Event from trash to hand.
  { cardNumber: 'OP17-052', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'event', color: 'blue', exactCost: 0 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] } },

  // OP17-055 There's No Authority in the World That Lasts Forever!!! —
  //   [Main] rest 1 DON!!: [Rocks.D.Xebec] gains [Unblockable] this turn.
  //   [Counter] "Rocks Pirates" Leader/Character +2000 this battle.
  {
    cardNumber: 'OP17-055',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 1 }], functions: [{ fn: 'addKeyword', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Rocks.D.Xebec' } }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Rocks Pirates' } }, amount: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-056 Rocks Pirates — [Main] rest 5 DON!!: return up to 1 Character cost<=6 to owner's hand.
  //   [Counter] "Rocks Pirates" Leader/Character +2000 this battle.
  {
    cardNumber: 'OP17-056',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 5 }], functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 6 } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Rocks Pirates' } }, amount: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-057 Fullalead (stage) — [On Your Opponent's Attack] rest this Stage + trash 1 from hand:
  //   "Rocks Pirates" Leader/Character +1000 this battle.
  { cardNumber: 'OP17-057', templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'restThis' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Rocks Pirates' } }, amount: 1000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },

  // OP17-059 Aramaki — [On Play] DON!! −1: draw 1 and K.O. up to 2 opponent Characters cost<=2.
  { cardNumber: 'OP17-059', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },

  // ── Animal Kingdom Pirates (purple) ───────────────────────────────────────

  // OP17-061 Lead Performers — [On Play] DON!! −1: if Leader is {Animal Kingdom Pirates},
  //   add up to 1 card from top of deck to top of Life.
  //   [Activate: Main] trash this Character: play up to 1 [King]/[Queen]/[Jack] from hand.
  {
    cardNumber: 'OP17-061',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'playFromHand', filter: { anyOf: [{ name: 'King' }, { name: 'Queen' }, { name: 'Jack' }] }, maxTargets: 1, optional: true }] } },
    ],
  },

  // OP17-064 King — [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand:
  //   Leader/Character +2000 this battle.
  { cardNumber: 'OP17-064', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 2000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },

  // OP17-066 Kurozumi Orochi — [On Play] DON!! −1: if you have a cost-10+ Character, draw 2 and trash 1.
  { cardNumber: 'OP17-066', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 10 }], functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] } },

  // OP17-067 Kurozumi Kanjuro — [On Play] DON!! −1: if you have a cost-10+ Character, rest up to 1 opponent Character.
  { cardNumber: 'OP17-067', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 10 }], functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 1 }] } },

  // OP17-068 Sasaki — [When Attacking] trash 2 from hand: if Leader is {Animal Kingdom Pirates},
  //   add up to 2 rested DON!! from the DON!! deck.
  { cardNumber: 'OP17-068', templateId: 'ability', params: { timing: 'whenAttacking', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'addDonFromDeck', count: 2, rested: true, ifPrevious: 'previousMovedAny' }] } },

  // OP17-071 Who's.Who — [On Play] DON!! −1: K.O. up to 2 opponent Characters cost<=2. [Trigger] play this card.
  {
    cardNumber: 'OP17-071',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-072 Black Maria — [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand:
  //   Leader/Character +1000 this battle.
  { cardNumber: 'OP17-072', templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },

  // OP17-073 Basil Hawkins — [On Play] trash 1 from hand: if Leader is {Animal Kingdom Pirates},
  //   add up to 1 ACTIVE DON!! from the DON!! deck.
  { cardNumber: 'OP17-073', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addDonFromDeck', count: 1, rested: false, ifPrevious: 'previousMovedAny' }] } },

  // OP17-075 X.Drake — [On Play] DON!! −2: trash 1 card from your opponent's hand (opponent chooses).
  { cardNumber: 'OP17-075', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 2 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },

  // OP17-076 Wo Ro Ro Ro Ro... I Think I've Sobered Up —
  //   [Counter] trash 1 from hand: Leader/Character +3000 this battle. [Trigger] DON!! −1: draw 2.
  {
    cardNumber: 'OP17-076',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 2 }] } },
    ],
  },

  // OP17-077 Kundali Dragon Swarm — [Main] rest 3 DON!! + trash 2 from hand: if Leader is
  //   {Animal Kingdom Pirates}, add up to 3 rested DON!!. [Counter] DON!! −1: your Leader +4000 this battle.
  {
    cardNumber: 'OP17-077',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'addDonFromDeck', count: 3, rested: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP17-078 Drunken Dragon Bagua — [Main] rest 2 DON!! + trash 2 from hand: if Leader is
  //   {Animal Kingdom Pirates}, add up to 3 rested DON!!. [Counter] Leader/Character +4000 this battle.
  {
    cardNumber: 'OP17-078',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 2 }, { fn: 'addDonFromDeck', count: 3, rested: true, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  // ── Elbaph / cost-12 package (Straw Hat, yellow-green) ────────────────────

  // OP17-079 (leader) Monkey.D.Luffy — all of your Characters with a cost of 12 or more gain [Blocker].
  { cardNumber: 'OP17-079', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeywordAuraControllerCharacters', keyword: 'blocker', duration: 'permanent', targetCondition: { minCost: 12 } }] } },

  // OP17-081 Gerd — if Leader is {Elbaph}, this Character gains +12 cost.
  //   [On Play] trash 1 from hand: add up to 1 Character cost<=8 other than [Gerd] from trash to hand.
  {
    cardNumber: 'OP17-081',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', gate: [{ kind: 'leaderType', type: 'Elbaph' }], functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 12, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { category: 'character', maxCost: 8, excludeSelfName: true } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP17-082 Sanji — continuous +3000 while a cost-12+ Character is on either field.
  //   [On Play] draw 2 and trash 2 from hand.
  {
    cardNumber: 'OP17-082',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
    ],
  },

  // OP17-083 Jinbe — continuous [Blocker] + +3000 while a cost-12+ Character is on either field.
  {
    cardNumber: 'OP17-083',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [
        { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'blocker', duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } },
        { fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } },
      ],
    },
  },

  // OP17-084 Tony Tony.Chopper — [On Play] if a cost-12+ Character exists,
  //   up to 1 of your Characters gains [Unblockable] this turn.
  { cardNumber: 'OP17-084', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }], functions: [{ fn: 'addKeyword', target: { group: 'characters', player: 'controller' }, keyword: 'unblockable', duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP17-086 Nami — [On Play] trash 1 {Elbaph} card from hand: draw 2.
  { cardNumber: 'OP17-086', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Elbaph' }, optional: true }, { fn: 'draw', amount: 2, ifPrevious: 'previousMovedAny' }] } },

  // OP17-087 Nico Robin — continuous +3000 while a cost-12+ Character exists.
  //   [On Play] if a cost-12+ Character exists, opponent Character −3000 this turn.
  {
    cardNumber: 'OP17-087',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-090 Franky — continuous +3000 while a cost-12+ Character exists.
  //   [On Play] if a cost-12+ Character exists, K.O. up to 1 opponent Character cost<=2.
  {
    cardNumber: 'OP17-090',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-093 Monkey.D.Luffy — continuous [Rush] while a cost-12+ Character exists.
  //   [On Play] draw 1 and play up to 1 Character cost<=2 from trash.
  {
    cardNumber: 'OP17-093',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromTrash', filter: { category: 'character', maxCost: 2 }, maxTargets: 1 }] } },
    ],
  },

  // OP17-094 Rodo — if Leader is {Elbaph}, this Character gains +12 cost.
  { cardNumber: 'OP17-094', templateId: 'ability', params: { timing: 'onEnterPlay', gate: [{ kind: 'leaderType', type: 'Elbaph' }], functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 12, duration: 'permanent' }] } },

  // OP17-096 I'm Luffy!! The Man Who Will Be King of the Pirates!! —
  //   [Counter] if a cost-12+ Character exists: Leader/Character +4000 this battle.
  //   [Trigger] add up to 1 {Elbaph} card from trash to hand.
  {
    cardNumber: 'OP17-096',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }], functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'moveCards', from: { zone: 'trash', player: 'controller', filter: { typeIncludes: 'Elbaph' } }, to: { zone: 'hand', player: 'owner' }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-097 I'll Feed on This Rage and Use It to Bring the World to Ruin!!! —
  //   [Main] all opponent Characters −1 cost this turn. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP17-097',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'addCostAuraOpponentCharacters', amount: -1, duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // OP17-098 Gum-Gum Kong Gun — [Main] rest 6 DON!!: if a cost-12+ Character exists,
  //   K.O. up to 2 opponent Characters cost<=6. [Counter] your Leader +3000 this battle.
  {
    cardNumber: 'OP17-098',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 6 }], gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }], functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle' }] } },
    ],
  },

  // ── Big Mom Pirates (yellow) ──────────────────────────────────────────────

  // OP17-049 Charlotte Linlin — [On Play] opponent chooses: you draw 2, OR they trash 2 from hand.
  //   [On Your Opponent's Attack] [Once Per Turn] trash 1 from hand: Leader/Character +1000 this battle.
  {
    cardNumber: 'OP17-049',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'chooseOne', chooser: 'opponent', prompt: 'Choose one: opponent draws 2 cards, or you trash 2 cards from your hand.', options: [{ label: 'draw2', functions: [{ fn: 'draw', amount: 2 }] }, { label: 'opponentTrash2', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 2 }] }] }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 1000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP17-050 Streusen — [On Play] look at top 2, reorder to top or bottom, then draw 1.
  { cardNumber: 'OP17-050', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 2, pick: 2, reveal: false, destination: 'deckTopOrBottom' }, { fn: 'draw', amount: 1 }] } },

  // OP17-099 (leader) Charlotte Linlin — [When Attacking] trash 1 from hand: opponent chooses —
  //   you trash 1 from hand then add top of deck to top of Life, OR they trash 1 from their hand.
  { cardNumber: 'OP17-099', templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'chooseOne', chooser: 'opponent', prompt: 'Choose one.', ifPrevious: 'previousMovedAny', options: [{ label: 'controllerTrashThenLife', functions: [{ fn: 'trashFromHand', count: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] }, { label: 'opponentTrash', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] }] }] } },

  // OP17-101 Caribou — [Activate: Main] [Once Per Turn] add 1 top Life card to hand:
  //   opponent Character −3000 this turn.
  //   [Trigger] trash 1 from hand: K.O. up to 1 opponent Character cost<=5.
  {
    cardNumber: 'OP17-101',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP17-102 Charlotte Oven — [On K.O.] play up to 1 Character with 4000 power or less
  //   other than [Charlotte Oven] from trash. [Trigger] play this card.
  {
    cardNumber: 'OP17-102',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'playFromTrash', filter: { category: 'character', maxPower: 4000, excludeSelfName: true }, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-103 Charlotte Katakuri — [Your Turn] [On Play] if Leader is {Big Mom Pirates}:
  //   add top of deck to top of Life, then opponent Character −3000 this turn. [Trigger] play this card.
  {
    cardNumber: 'OP17-103',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-104 Charlotte Cracker — [Your Turn] [On Play] rest 2 DON!!: if Leader is {Big Mom Pirates},
  //   add top of deck to top of Life. [Trigger] play this card.
  {
    cardNumber: 'OP17-104',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, cost: [{ kind: 'restDon', count: 2 }], gate: [{ kind: 'leaderType', type: 'Big Mom Pirates' }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-107 Charlotte Daifuku — [Trigger] play this card.
  { cardNumber: 'OP17-107', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },

  // OP17-108 Charlotte Brulee — [Trigger] rest up to 1 opponent Character cost<=6.
  { cardNumber: 'OP17-108', templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, maxTargets: 1 }] } },

  // OP17-109 Charlotte Pudding — [On Play] trash 1 card WITH A [Trigger] from hand: draw 3.
  { cardNumber: 'OP17-109', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { hasTrigger: true }, optional: true }, { fn: 'draw', amount: 3, ifPrevious: 'previousMovedAny' }] } },

  // OP17-110 Charlotte Perospero — [Your Turn] [On Play] play up to 1 {Big Mom Pirates} Character
  //   cost<=6 from hand, then this Character gains [Rush] this turn. [Trigger] play this card.
  {
    cardNumber: 'OP17-110',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, functions: [{ fn: 'playFromHand', filter: { category: 'character', typeIncludes: 'Big Mom Pirates', maxCost: 6 }, maxTargets: 1, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-114 Sweet 3 Generals — [Your Turn] [On Play] rest 2 DON!!: draw 1 and add top of deck to
  //   top of Life, then give up to 2 opponent Characters −3000 this turn. [Trigger] play this card.
  {
    cardNumber: 'OP17-114',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 2 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-115 Don't you know that even in the cruel world of pirates there's still a code of honor?!! —
  //   [Main] your [Charlotte Linlin] Leader gains [Unblockable] this turn.
  //   [Counter] up to 1 of your [Charlotte Linlin] +4000 this battle.
  {
    cardNumber: 'OP17-115',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', gate: [{ kind: 'leaderName', name: 'Charlotte Linlin' }], functions: [{ fn: 'addKeyword', target: { group: 'leader', player: 'controller' }, keyword: 'unblockable', duration: 'duringThisTurn' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Linlin' } }, amount: 4000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-117 Maser Saber — [Counter] up to 1 of your [Charlotte Linlin] +3000 this battle.
  //   [Trigger] "Your opponent may trash 3 cards from their hand. If they do NOT, K.O. up to 1 of
  //   your opponent's Characters with a cost of 6 or less."
  //
  //   The K.O. fires on the DECLINE branch, which cannot itself hold a board-group target — so the
  //   chooseOne carries only the payment, and the K.O. sits after it, gated on how much was
  //   actually trashed. `atMost: 2` (not "var unbound") is the faithful reading: the opponent
  //   escapes the K.O. only by trashing a full 3, so an opponent holding fewer than 3 cards — who
  //   trashes what they have via the softlock escape — still eats the K.O., exactly as "if they do
  //   not [trash 3]" says.
  {
    cardNumber: 'OP17-117',
    templates: [
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { name: 'Charlotte Linlin' } }, amount: 3000, duration: 'duringThisBattle', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'chooseOne', chooser: 'opponent', prompt: 'You may trash 3 cards from your hand to prevent a K.O.', options: [{ label: 'trash3', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 3 }, { fn: 'captureCount', from: '__lastMovedIds', into: 'op17117OppPaid' }] }, { label: 'decline', functions: [] }] }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, optional: true, maxTargets: 1, ifGate: [{ kind: 'boundVarsTotalCount', varNames: ['op17117OppPaid'], atMost: 2 }] }] } },
    ],
  },

  // ══ Batch 2 ═══════════════════════════════════════════════════════════════
  // Cards triage bucketed as needsPrimitive/defer that existing primitives DO
  // cover once combined. The recurring unlocks: `setBasePower` on the Leader for
  // "base power becomes N", `setActiveControllerDon` for "set DON!! as active",
  // `searchTopDeck` (+ remainder) for the look-N/reveal-1/rest-to-bottom digs,
  // `registerKoReplacement*` for the "would be removed … instead" family, and
  // `oncePerTurnKey` for "[When Attacking]/[On Your Opponent's Attack] [Once Per Turn]".

  // OP17-005 Edward.Newgate — hand cost −4 while opponent has a 10000+ power Character.
  //   [On Play] your MONOCOLORED Leader's base power becomes 8000 until end of opponent's next End Phase.
  {
    cardNumber: 'OP17-005',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCostAuraSameCardInHand', amount: -4, duration: 'permanent', gate: [{ kind: 'opponentCharacterCurrentPowerCount', power: 10000, atLeast: 1 }] }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'noneOf', gates: [{ kind: 'leaderMulticolor' }] }], functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 8000, duration: 'endOfOpponentsTurn' }] } },
    ],
  },

  // OP17-008 Jozu — [On Play] your [Edward.Newgate] Leader's base power becomes 8000 until end of opponent's next End Phase.
  { cardNumber: 'OP17-008', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderName', name: 'Edward.Newgate' }], functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 8000, duration: 'endOfOpponentsTurn' }] } },

  // OP17-015 Marco — PARTIAL: only the [On K.O.] half is curated.
  //   The replacement half ("you may K.O. THIS Character instead") has no matching
  //   KoReplacementAction: `trashSource` trashes without firing [On K.O.], and this
  //   card's whole identity is that its own [On K.O.] replays it from the trash.
  //   Needs a `koSource` replacement action. Do not substitute trashSource.
  { cardNumber: 'OP17-015', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Whitebeard Pirates' }, optional: true }, { fn: 'playSelfFromTrash', ifPrevious: 'previousMovedAny' }] } },

  // OP17-019 I Don't Have Time to Chat with Snot-Nosed Brats — [Main] dig 5, reveal 1
  //   "Whitebeard Pirates" to hand, rest to the bottom. [Trigger] your Leader +1000 this turn.
  {
    cardNumber: 'OP17-019',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Whitebeard Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 1000, duration: 'duringThisTurn' }] } },
    ],
  },

  // OP17-021 Crone Oli — if your "Red-Haired Pirates" Character would be removed from the
  //   field by an OPPONENT'S effect, you may rest 1 of your cards instead.
  { cardNumber: 'OP17-021', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', anyOfTypes: ['Red-Haired Pirates'], restCards: { count: 1 }, duration: 'permanent' }] } },

  // OP17-022 Shanks — [On Play] set up to 2 of your DON!! as active, then rest ALL opponent Characters.
  { cardNumber: 'OP17-022', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 2 }, { fn: 'restAllCharacters', player: 'opponent' }] } },

  // OP17-023 Nami — if one of your {East Blue}/{Straw Hat Crew} Characters would be K.O.'d
  //   (by ANY source, not just the opponent's), you may rest this Character instead.
  { cardNumber: 'OP17-023', templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'any', replacementTriggers: ['ko'], anyOfTypes: ['East Blue', 'Straw Hat Crew'], restSource: true, duration: 'permanent' }] } },

  // OP17-024 Howling Gab — [Banish] is a static definition flag; [On Play] rest up to 1 opponent Character.
  { cardNumber: 'OP17-024', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 1 }] } },

  // OP17-027 Benn.Beckman — [On Play] if Leader is {Red-Haired Pirates}: draw 1, rest up to 2 opponent Characters.
  { cardNumber: 'OP17-027', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 2 }] } },

  // OP17-029 Hongo — [On Play] set up to 1 DON!! active, then rest up to 2 opponent Characters cost<=2.
  { cardNumber: 'OP17-029', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2 } }, optional: true, maxTargets: 2 }] } },

  // OP17-030 Monkey.D.Luffy — [On Play] rest 1 DON!!: this Character gains [Rush] this turn.
  //   [Activate: Main] [Once Per Turn] if you have 5 or less cards in hand, set up to 1 DON!! active.
  {
    cardNumber: 'OP17-030',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'restControllerDon', maxTargets: 1, optional: true }, { fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn', ifPrevious: 'previousSelectedAny' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfHand', atMost: 5 }], functions: [{ fn: 'setActiveControllerDon', maxTargets: 1 }] } },
    ],
  },

  // OP17-031 Yasopp — [On Play] draw 1, rest up to 1 opponent Character cost<=8.
  //   [End of Your Turn] set up to 1 of your "Red-Haired Pirates" Characters as active.
  {
    cardNumber: 'OP17-031',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 8 } }, optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'endOfTurn', functions: [{ fn: 'setActiveControllerCharacter', filter: { typeIncludes: 'Red-Haired Pirates' }, maxTargets: 1, optional: true }] } },
    ],
  },

  // OP17-032 Limejuice — [On Play] dig 3, reveal 1 "Red-Haired Pirates" to hand, rest to the bottom.
  { cardNumber: 'OP17-032', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Red-Haired Pirates' }, remainder: 'bottom' }] } },

  // OP17-033 Lucky.Roux — same dig as OP17-032, plus
  //   [On Your Opponent's Attack] trash this Character: rest up to 1 opponent Leader or Character.
  {
    cardNumber: 'OP17-033',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Red-Haired Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'rest', target: { group: 'leaderOrCharacters', player: 'opponent' }, optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-037 Are You That Afraid of the New Era?!! — [Main] dig 5 for "Red-Haired Pirates".
  //   [Counter] rest 1 of your cards: Leader/Character +3000 this battle.
  {
    cardNumber: 'OP17-037',
    templates: [
      { templateId: 'ability', params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Red-Haired Pirates' }, remainder: 'bottom' }] } },
      { templateId: 'ability', params: { timing: 'counter', functions: [{ fn: 'restControllerCards', count: 1, optional: true }, { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', optional: true, maxTargets: 1, ifPrevious: 'previousSelectedAny' }] } },
    ],
  },

  // OP17-040 Edward.Newgate — [On Play] draw 1. Then a single [Once Per Turn] budget shared across
  //   "when your Leader attacks OR is attacked" — modeled as two timings on one oncePerTurnKey.
  {
    cardNumber: 'OP17-040',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, oncePerTurnKey: 'op17-040-rocks-leader', gate: [{ kind: 'leaderType', type: 'Rocks Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, oncePerTurnKey: 'op17-040-rocks-leader', gate: [{ kind: 'leaderType', type: 'Rocks Pirates' }], functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 3000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP17-043 Ganzui — if THIS Character would be removed from the field (by any source),
  //   you may trash 2 from hand instead. [On Play] your Leader's base power becomes 6000.
  {
    cardNumber: 'OP17-043',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementSelf', scope: 'any', replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], trashFromHand: { count: 2 }, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 6000, duration: 'endOfOpponentsTurn' }] } },
    ],
  },

  // OP17-044 Captain John — while your Leader is "Rocks Pirates" AND this Character is rested,
  //   the opponent may only attack [Captain John].
  //   [Activate: Main] rest this Character: draw 1 and trash 1 from hand.
  {
    cardNumber: 'OP17-044',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', gate: [{ kind: 'leaderType', type: 'Rocks Pirates' }], functions: [{ fn: 'setForcedAttackTarget', duration: 'permanent', condition: { rested: true } }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restThis' }], functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] } },
    ],
  },

  // OP17-045 Kyo — if one of your Characters would be removed by the OPPONENT'S effect,
  //   you may trash 2 from hand instead. [On Play] draw 1.
  {
    cardNumber: 'OP17-045',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', trashFromHand: { count: 2 }, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
    ],
  },

  // OP17-046 Gloriosa — [On Play] place up to 1 Character (either side) cost<=5 at the bottom of its owner's deck.
  { cardNumber: 'OP17-046', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 5 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true, maxTargets: 1 }] } },

  // OP17-047 Shiki — [End of Your Turn] if you have 2 or less cards in hand,
  //   your opponent places 1 card from their hand at the bottom of their deck (they choose).
  { cardNumber: 'OP17-047', templateId: 'ability', params: { timing: 'endOfTurn', gate: [{ kind: 'selfHand', atMost: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, minTargets: 1, maxTargets: 1, chooser: 'opponent' }] } },

  // OP17-048 Shiki — one [Once Per Turn] budget shared across attacking and being attacked.
  {
    cardNumber: 'OP17-048',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, oncePerTurnKey: 'op17-048-rocks-debuff', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Rocks Pirates' }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, oncePerTurnKey: 'op17-048-rocks-debuff', functions: [{ fn: 'trashTypeFromHand', count: 1, filter: { typeIncludes: 'Rocks Pirates' }, optional: true }, { fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -3000, duration: 'duringThisTurn', optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP17-053 Barbell — [On K.O.] opponent bottom-decks 2 from hand (they choose).
  //   [Activate: Main] [Once Per Turn] trash 1 from hand: this Character +3000 this turn.
  {
    cardNumber: 'OP17-053',
    templates: [
      { templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, minTargets: 2, maxTargets: 2, chooser: 'opponent' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'optionalTrashFromHand', count: 1 }, { fn: 'addPowerSelf', amount: 3000, duration: 'duringThisTurn', ifPrevious: 'previousMovedAny' }] } },
    ],
  },

  // OP17-054 Miss Buckingham Stussy — [On Play] up to 1 opponent Character with BASE cost 6 or less
  //   cannot attack until end of opponent's next End Phase.
  //   [Activate: Main] rest 3 DON!! + this Character: same lock with no cost restriction.
  {
    cardNumber: 'OP17-054',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxBaseCost: 6 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 3 }, { kind: 'restThis' }], functions: [{ fn: 'preventAttack', target: { group: 'characters', player: 'opponent' }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-058 Kaido — one [Once Per Turn] DON!! −1 budget shared across attacking and being attacked.
  {
    cardNumber: 'OP17-058',
    templates: [
      { templateId: 'ability', params: { timing: 'whenAttacking', oncePerTurn: true, oncePerTurnKey: 'op17-058-debuff', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
      { templateId: 'ability', params: { timing: 'onOpponentsAttack', oncePerTurn: true, oncePerTurnKey: 'op17-058-debuff', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },
    ],
  },

  // OP17-060 Ulti & Page One — [On Play] if Leader is {Animal Kingdom Pirates}: add 1 ACTIVE DON!!,
  //   then K.O. up to 1 opponent Character with 3000 power or less.
  { cardNumber: 'OP17-060', templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxPower: 3000 } }, optional: true, maxTargets: 1 }] } },

  // OP17-062 Kaido — [Your Turn] [Once Per Turn] when a DON!! on your field returns to the DON!! deck:
  //   add up to 1 ACTIVE DON!! from the deck, then set up to 1 of your DON!! as active.
  { cardNumber: 'OP17-062', templateId: 'ability', params: { timing: 'onDonReturned', oncePerTurn: true, condition: { turn: 'your' }, gate: [{ kind: 'selfDonReturnedThisAction', atLeast: 1 }], functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }, { fn: 'setActiveControllerDon', maxTargets: 1 }] } },

  // OP17-063 Kaido — all Character cards in hand WITHOUT a printed Counter get +1000 Counter.
  //   [Activate: Main] [Once Per Turn] DON!! −1: if this was played this turn, negate up to 1 opponent
  //   Character cost<=6 for the turn AND K.O. it (the K.O. targets the just-negated card via `previous`).
  {
    cardNumber: 'OP17-063',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCounterAuraControllerCharactersInHand', amount: 1000, withoutPrintedCounter: true, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'selfPlayedThisTurn' }], functions: [{ fn: 'negateEffect', target: { group: 'characters', player: 'opponent', filter: { maxCost: 6 } }, duration: 'duringThisTurn', optional: true, maxTargets: 1 }, { fn: 'ko', target: { ref: 'previous' } }] } },
    ],
  },

  // OP17-065 Queen — [Banish] is static; [On Play] DON!! −1: draw 1, and up to 2 opponent
  //   Characters cost<=5 cannot attack until end of opponent's next End Phase.
  { cardNumber: 'OP17-065', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }, { fn: 'preventAttack', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 2 }] } },

  // OP17-069 Jack — [On Play] DON!! −1: if Leader is {Animal Kingdom Pirates}, opponent Character −2000 this turn.
  { cardNumber: 'OP17-069', templateId: 'ability', params: { timing: 'onPlay', cost: [{ kind: 'donMinus', count: 1 }], gate: [{ kind: 'leaderType', type: 'Animal Kingdom Pirates' }], functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true, maxTargets: 1 }] } },

  // OP17-074 Yamato — [On Play] add up to 1 RESTED DON!! from your DON!! deck.
  { cardNumber: 'OP17-074', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addDonFromDeck', count: 1, rested: true }] } },

  // OP17-080 Usopp — continuous +3000 while a cost-12+ Character exists.
  //   [On Play] dig 3, reveal 1 {Elbaph} to hand, TRASH the rest.
  {
    cardNumber: 'OP17-080',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Elbaph' }, remainder: 'trash' }] } },
    ],
  },

  // OP17-089 Jaguar.D.Saul — UNCONDITIONAL +12 cost (no Leader gate, unlike OP17-081/094).
  //   [On Play] dig 3, reveal 1 {Elbaph} to hand, trash the rest.
  {
    cardNumber: 'OP17-089',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 12, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Elbaph' }, remainder: 'trash' }] } },
    ],
  },

  // OP17-091 Brook — continuous +3000 while a cost-12+ Character exists.
  //   [On Play] if a cost-12+ Character exists, opponent trashes 1 from hand.
  {
    cardNumber: 'OP17-091',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }], functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
    ],
  },

  // OP17-095 Roronoa Zoro — continuous +3000 while a cost-12+ Character exists, plus the
  //   "bottom-deck 3 from your trash instead" replacement against opponent removal.
  {
    cardNumber: 'OP17-095',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] } }] } },
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'registerKoReplacementAura', scope: 'effect', replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'], effectSourceController: 'opponent', trashTrashToDeckBottom: { count: 3 }, duration: 'permanent' }] } },
    ],
  },

  // OP17-106 Charlotte Smoothie — [Your Turn] [On Play] rest 2 DON!!: add top of deck to top of Life,
  //   then opponent trashes 1 from hand. [Trigger] play this card.
  {
    cardNumber: 'OP17-106',
    templates: [
      { templateId: 'ability', params: { timing: 'onPlay', condition: { turn: 'your' }, cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }, { fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] } },
      { templateId: 'ability', params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] } },
    ],
  },

  // OP17-111 Charlotte Mont-d'or — [On Play] reveal 2 [Trigger] cards from hand:
  //   K.O. up to 2 opponent Characters cost<=1.
  { cardNumber: 'OP17-111', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'optionalRevealTypeFromHand', count: 2, filter: { hasTrigger: true }, prompt: 'You may reveal 2 cards with a [Trigger] from your hand.' }, { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 1 } }, optional: true, maxTargets: 2, ifPrevious: 'previousSelectedAny' }] } },

  // OP17-112 Charlotte Linlin — PARTIAL: only the [On Play] half is curated. Both modes move
  //   between FIXED zones, so they are legal inside a chooseOne branch (no target selection).
  //   The [Your Turn] aura ("base power of all your Characters with a [Trigger] AND 4000 base power
  //   becomes 8000") is deferred: setBasePowerAuraControllerTypes filters only by type/name — it has
  //   no hasTrigger or exactBasePower field.
  { cardNumber: 'OP17-112', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'chooseOne', chooser: 'controller', prompt: 'Choose one.', options: [{ label: 'deckTopToLife', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true }] }, { label: 'opponentLifeToHand', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top' }, to: { zone: 'hand', player: 'owner' }, optional: true }] }] }] } },

  // OP17-113 Streusen — [On Play] dig 3, reveal 1 {Big Mom Pirates} to hand, rest to the bottom.
  { cardNumber: 'OP17-113', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Big Mom Pirates' }, remainder: 'bottom' }] } },

  // OP17-116 Fulgora — PARTIAL: only the [Main] half is curated. The [Counter] half needs a gate
  //   counting the controller's Characters that carry a printed [Trigger]; no such AbilityGate exists
  //   (selfHandMatching counts the HAND, and the field-count gates key off cost/power/type/name).
  { cardNumber: 'OP17-116', templateId: 'ability', params: { timing: 'activateMain', cost: [{ kind: 'restDon', count: 2 }], functions: [{ fn: 'ko', target: { group: 'stages', player: 'opponent' }, optional: true, maxTargets: 1 }] } },

  // OP17-020 (leader) Shanks — [Activate: Main] [Once Per Turn] "trash 1 from hand OR rest 1 DON!!:"
  //   is a CHOICE OF COSTS, which the cost[] union cannot express (costs there are ANDed). Modeled as
  //   a chooseOne over the two payments, with the payload gated on the payment landing.
  //   Two things make this correct:
  //     - The trash branch is a MANDATORY trashFromHand (min 1). The "You may" in the card text is the
  //       decision to activate at all, which [Activate: Main] already models — so once a branch is
  //       chosen, the cost is owed.
  //     - `restControllerDon` hard-codes min: 0 (factories.ts ignores its `optional` flag), so the DON!!
  //       branch CAN be declined. `ifPrevious: 'previousSelectedAny'` on the payload is what stops a
  //       decline from producing a free preventRefresh — it reads __lastSelected, which branch ops write.
  { cardNumber: 'OP17-020', templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Choose a cost to pay.', options: [{ label: 'trashFromHand', functions: [{ fn: 'trashFromHand', count: 1 }] }, { label: 'restDon', functions: [{ fn: 'restControllerDon', maxTargets: 1 }] }] }, { fn: 'preventRefresh', target: { group: 'characters', player: 'opponent', filter: { rested: true } }, optional: true, maxTargets: 1, ifPrevious: 'previousSelectedAny' }] } },

  // OP17-085 Dorry / OP17-092 Brogy — unconditional +12 cost, plus [On Play] if Leader is {Elbaph}:
  //   play up to 1 of the partner giant (cost<=5) from your HAND OR TRASH, then you cannot play
  //   Character cards for the rest of the turn.
  //
  //   "from your hand or trash" is one choice spanning two zones, and no single primitive unions
  //   them — but a chooseOne over playFromHand / playFromTrash does the job. Zone selection
  //   (hand, trash, deck-top, Life) is legal inside a chooseOne branch; only BOARD-GROUP targeting
  //   is rejected there.
  //
  //   The trailing restriction is deliberately NOT gated on the play landing: a plain "Then" is not
  //   an ifPrevious gate, and declining an "up to 1" still counts as resolving the prior step.
  {
    cardNumber: 'OP17-085',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 12, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Elbaph' }], functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Play up to 1 [Brogy] with a cost of 5 or less from your hand or trash.', options: [{ label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Brogy', maxCost: 5 }, maxTargets: 1 }] }, { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Brogy', maxCost: 5 }, maxTargets: 1 }] }] }, { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' }] } },
    ],
  },
  {
    cardNumber: 'OP17-092',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 12, duration: 'permanent' }] } },
      { templateId: 'ability', params: { timing: 'onPlay', gate: [{ kind: 'leaderType', type: 'Elbaph' }], functions: [{ fn: 'chooseOne', chooser: 'controller', prompt: 'Play up to 1 [Dorry] with a cost of 5 or less from your hand or trash.', options: [{ label: 'fromHand', functions: [{ fn: 'playFromHand', filter: { name: 'Dorry', maxCost: 5 }, maxTargets: 1 }] }, { label: 'fromTrash', functions: [{ fn: 'playFromTrash', filter: { name: 'Dorry', maxCost: 5 }, maxTargets: 1 }] }] }, { fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' }] } },
    ],
  },

  // OP17-119 Loki — +12 cost always, +3000 on the opponent's turn, and
  //   [On Play] K.O. opponent Characters with a TOTAL cost of 4 or less.
  //   maxTargets 4 is exact rather than a guess: no Character in the catalog has a base cost
  //   below 1, so a combined cap of 4 admits at most 4 cards. (A cost-reducing effect could in
  //   principle push a printed-1 Character to current cost 0 and allow a 5th; the combined-cost
  //   cap still holds, so the only loss would be one extra K.O. in that corner case.)
  //   optional (min 0) rather than mandatory on purpose: candidate lists are not pre-filtered by
  //   the combined cap, so a forced min of 1 would softlock when every opponent Character costs
  //   more than 4.
  {
    cardNumber: 'OP17-119',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCost', target: { ref: 'self' }, amount: 12, duration: 'permanent' }, { fn: 'addPowerSelf', amount: 3000, duration: 'permanent', condition: { turn: 'opponent' } }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true, maxTargets: 4, maxCombinedCost: 4 }] } },
    ],
  },

  // OP17-034 Rockstar — [Activate: Main] [Once Per Turn] if the OPPONENT'S Leader has 6000 power
  //   or more: set up to 1 DON!! active, then your {Red-Haired Pirates} Leader's base power
  //   becomes 6000 until end of opponent's next End Phase.
  //   The Leader-type check sits on the second op as an `ifGate`, not on the ability: the text
  //   gates only the base-power clause on the Leader's type, so a non-{Red-Haired Pirates} Leader
  //   should still get the DON!! refresh.
  {
    cardNumber: 'OP17-034',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      oncePerTurn: true,
      gate: [{ kind: 'opponentLeaderPowerAtLeast', power: 6000 }],
      functions: [
        { fn: 'setActiveControllerDon', maxTargets: 1 },
        { fn: 'setBasePower', target: { group: 'leader', player: 'controller' }, value: 6000, duration: 'endOfOpponentsTurn', ifGate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }] },
      ],
    },
  },

  // OP17-118 Rocks.D.Xebec — "If you only have Characters without a Counter, this card in your
  //   hand has a +2000 Counter." plus [On Play] draw 1, then play up to 2 "Rocks Pirates" cards
  //   with DIFFERENT names and a combined cost of 9 or less.
  //
  //   The Counter clause is a HAND static: it must raise this card's own Counter while it sits in
  //   hand, before any copy has been played. `addCounterAuraSameCardInHand` is read directly off
  //   the card's program by handSelfCounterDelta for exactly that reason — the onEnterPlay aura
  //   shape alone would only ever reach a duplicate copy once one was on the field.
  //   The gate is vacuously true with no Characters out, which is correct: with an empty board
  //   there is no Character WITH a Counter.
  {
    cardNumber: 'OP17-118',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addCounterAuraSameCardInHand', amount: 2000, duration: 'permanent', gate: [{ kind: 'selfAllCharactersWithoutCounter' }] }] } },
      { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }, { fn: 'playFromHand', filter: { typeIncludes: 'Rocks Pirates' }, maxTargets: 2, distinctNames: true, maxCombinedCost: 9 }] } },
    ],
  },

];

/**
 * WHAT REMAINS IN OP17 — every one of these is blocked on a NAMED missing primitive,
 * not on curation effort. Do not work around them by approximating.
 *
 * Fully uncurated (1):
 *   OP17-105 Charlotte Chiffon  NOT a primitive gap — Limitless's own card page truncates the text
 *                            mid-sentence ("…Return up to 1 of your opponent's Characters with a").
 *                            Needs the printed card before it can be curated.
 *
 * Partially curated (3) — the missing half and what would unblock it. Each was re-checked
 * against the catalog rather than trusted from an earlier note:
 *   OP17-015 Marco           Replacement "you may K.O. THIS Character instead" has no matching
 *                            KoReplacementAction. `trashSource` is NOT a substitute — VERIFIED in
 *                            koAttempt.ts, which moves the card straight to trash and logs
 *                            "trashed as a K.O. replacement (not K.O.'d)". Marco's whole identity
 *                            is that his own [On K.O.] replays him from the trash, so the
 *                            substitution would delete the card's function.
 *                            NEEDS: a `koSource` action that routes through fireOnKO.
 *   OP17-112 Charlotte Linlin  Aura over "Characters with a [Trigger] AND 4000 base power".
 *                            setBasePowerAuraControllerTypes filters only by type/name, and
 *                            PowerAuraFilterGroup has no hasTrigger or base-power field. Could be
 *                            faked by enumerating matching card names into `anyOfNames`, but that
 *                            bakes catalog data into an assignment and silently rots on every new
 *                            set — not worth it. NEEDS: hasTrigger + exactBasePower on the aura.
 *   OP17-116 Fulgora         [Counter] gated on "2 or more Characters with a [Trigger]" on the
 *                            FIELD. TargetFilter has hasTrigger for SELECTION, but no AbilityGate
 *                            counts field cards by [Trigger] (selfHandMatching is hand-only).
 *                            NEEDS: a trigger-count field gate.
 *   OP17-118 Rocks.D.Xebec   [On Play] IS curated. The Counter clause needs BOTH an "all your
 *                            Characters lack a printed Counter" gate and a self-in-hand Counter
 *                            aura (addCounterAuraControllerCharactersInHand targets matching
 *                            Characters, not the source card).
 *
 * CLOSED since the first pass:
 *   - `opponentLeaderPowerAtLeast` (gate) and `maxCombinedCost` (chooseTargets, wired through ko
 *     and playFromHand) were added to the engine, completing OP17-034 and OP17-119 and unblocking
 *     OP17-118's [On Play].
 *   - OP17-020, OP17-085, OP17-092 and OP17-117 needed NO new engine code — they were deferred on
 *     an over-broad reading of the chooseOne constraint. Branches reject only BOARD-GROUP
 *     targeting; hand / trash / DON!! / deck-top / Life selection all compile fine. The pattern
 *     that unlocks all four: put the choice (of cost, of zone, of payment) inside the chooseOne,
 *     keep any board-group targeting AFTER it, and bridge the two with `captureCount` +
 *     `ifGate: boundVarsTotalCount`.
 *
 * KNOWN DATA ISSUE (not fixable from this file): "[Rush: Character]" is parsed as full
 * `hasRush` in both scripts/scrape-limitless/scrapeOutput.ts and
 * src/cards/normalization/normalizeCardPrinting.ts, so OP17-003/027/048/069 currently gain
 * unrestricted [Rush] instead of the Character-only variant the engine models as
 * `canAttackCharactersWhileSummoningSick`. The same substring parse makes conditional
 * [Blocker]/[Rush] unconditional (OP17-083 Jinbe, leader OP17-079).
 */
