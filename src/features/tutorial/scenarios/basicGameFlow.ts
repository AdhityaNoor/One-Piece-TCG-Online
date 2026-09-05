/**
 * THE MATCH. One continuous, ordered list of beats that reproduces the
 * official Teaching App's "Basic Game Flow" scenario
 * (tutorial.onepiece-cardgame.com, scenario id `basic_battle1`) turn for
 * turn, play for play.
 *
 * WHY THIS FILE REPLACED PER-CHAPTER SCENARIOS
 * The previous tutorial built a FRESH, fabricated mid-game board for every
 * chapter ("you have 4 DON!! and Sanji in hand", parked at turn 3). Nothing
 * carried forward, so the narration and the board drifted apart and none of
 * it resembled a real game. The official app has no such problem because it
 * is one match from setup to game over. So is this: the engine is started
 * once, and every beat below advances that same GameState.
 *
 * HOW IT DIFFERS FROM THE OFFICIAL APP
 * The official app is not a game — it is a 236-step slideshow that assigns
 * absolute board state per step (`player/character/lineup/cards/0/cardId`,
 * `orientation`, ...) with no rules engine behind it. Here every beat with an
 * `action` is dispatched through the REAL engine
 * (validateAction/executeAction), so the board cannot say something the
 * rules disagree with. tutorialScript.e2e.test.ts plays this entire list
 * against the engine and asserts the exact Life totals at every turn — if a
 * line of narration ever stops matching the rules, that test fails.
 *
 * WHO ACTS
 *  - `narration`  — no action; the player reads and presses Next. Used for
 *                   the automatic phases (Refresh/Draw/DON!!, 6-2..6-4),
 *                   which the engine runs itself via advanceAutomaticPhases.
 *  - `instructor` — the tutorial dispatches this for the opponent.
 *  - `player`     — the studying player must perform it; TutorialActionValidator
 *                   gates dispatch to exactly this action.
 *
 * CARD EFFECTS ARE OFF, DELIBERATELY
 * The scenario runs with an EMPTY effect registry, so no [On Play],
 * [Trigger] or other ability fires. This is not a shortcut around our effect
 * system — it is what the official scenario itself does, and it says so on
 * screen ("Note: During this battle, we will ignore card effects that
 * activate when a card is played"). It also makes the match perfectly
 * deterministic. Teaching effects is the job of the official app's
 * `basic_battle2` / `basic_battle3` scenarios, which are a separate build.
 */import { LEADER, OPPOSING_LEADER, own, opposing } from './refs';
import { TUTORIAL_DECK_INSTRUCTOR, TUTORIAL_DECK_PLAYER } from '../tutorialDecks';
import type { DeckStackSlot, TutorialBeat, TutorialChapter, TutorialScenarioDef } from '../types';

/**
 * The studying player's opening five, in the order the official scenario
 * deals them (`tutorialFirstDrawHands/hands`). tutorialScenario.ts stacks
 * the deck so the engine's own deal produces exactly this hand.
 */
const OPENING_HAND = ['OP05-063', 'ST18-004', 'ST18-003', 'ST18-002', 'OP05-068'] as const;

/**
 * Every card drawn after the opening hand, in draw order. The player's list
 * is what the official scenario names on screen ("You draw [Uso-Hachi]");
 * the Instructor's draws are never named there, so any legal card will do —
 * but they must still be stacked, or a shuffle could hand the Instructor a
 * card the script then cannot afford to play.
 */
const SCRIPTED_DRAWS = {
  /** Turns 2, 4, 6, 8. */
  player: ['ST18-001', 'OP05-070', 'P-041', 'ST18-001'],
  /** Turns 3, 5, 7 (the first player skips their turn-1 draw, 6-3-1). */
  instructor: ['OP03-112', 'ST07-006', 'OP03-105'],
} as const;

/** Chapter order, and the turn each one covers. Drives the sidebar header. */
const CHAPTERS: readonly TutorialChapter[] = [
  { id: 'preparingForBattle', title: 'Preparing for Battle', turn: 0 },
  { id: 'instructorTurn1', title: "Opponent's Turn - Going First", turn: 1 },
  { id: 'yourTurn2', title: 'Your Turn - Playing a Character', turn: 2 },
  { id: 'instructorTurn3', title: "Opponent's Turn - The First Attack", turn: 3 },
  { id: 'yourTurn4', title: 'Your Turn - Attacking Back', turn: 4 },
  { id: 'instructorTurn5', title: "Opponent's Turn - Under Pressure", turn: 5 },
  { id: 'yourTurn6', title: 'Your Turn - K.O. a Character', turn: 6 },
  { id: 'instructorTurn7', title: "Opponent's Turn - Defending", turn: 7 },
  { id: 'yourTurn8', title: 'Your Turn - Winning the Game', turn: 8 },
];

const BEATS: readonly TutorialBeat[] = [
  // --- Chapter 1 - Preparing for Battle (Section 5) ------------------------
  {
    id: 'setup.needs',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'narration',
    lines: [
      'Welcome aboard! To play, you need 1 Leader card, a 50-card deck, and 10 DON!! cards.',
      'Your deck and your DON!! deck are shuffled and placed in their own zones.',
    ],
    highlight: 'deckZone',
  },
  {
    id: 'setup.leader',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'narration',
    lines: [
      'Your Leader card is placed face-up in the Leader area, where it stays for the whole game.',
      'You are Monkey.D.Luffy; the Instructor is Charlotte Katakuri. Both have 5000 power and 5 Life.',
    ],
    highlight: 'leaderZone',
  },
  {
    id: 'setup.goingFirst',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'instructor',
    lines: [
      'Rock-paper-scissors decides who goes first, and the winner chooses.',
      'I won the throw, so I will take the first turn - which means you go second.',
    ],
    action: { kind: 'chooseGoingFirst', goingFirst: true },
  },
  {
    id: 'setup.mulligan.instructor',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'instructor',
    lines: ['Both players now draw 5 cards. I will keep mine.'],
    highlight: 'handZone',
    action: { kind: 'mulligan', redraw: false },
  },
  {
    id: 'setup.mulligan.player',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'player',
    lines: [
      'You may redraw your opening hand once - that is called a mulligan.',
      'This hand is a good one, so we will keep it.',
    ],
    highlight: 'handZone',
    objective: 'Keep your opening hand.',
    action: { kind: 'mulligan', redraw: false },
  },
  {
    id: 'setup.life',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'narration',
    lines: [
      'Finally, cards equal to your Leader’s Life value go face-down into your Life area.',
      'You never look at them. They shield your Leader - each hit sends the top one to your hand.',
    ],
    highlight: 'lifeZone',
  },
  {
    id: 'setup.victory',
    chapter: 'preparingForBattle',
    turn: 0,
    actor: 'narration',
    lines: [
      'You win by landing a successful attack on your opponent’s Leader while they have 0 Life cards.',
      'You also win if your opponent has no cards left in their deck. Let’s begin!',
    ],
  },

  // --- Chapter 2 - Turn 1, Instructor (going first) ------------------------
  {
    id: 't1.phases',
    chapter: 'instructorTurn1',
    turn: 1,
    actor: 'narration',
    lines: [
      'Every turn runs the same five phases: Refresh, Draw, DON!!, Main, End.',
      'The player going first skips their Draw Phase on turn 1, so my turn opens at the DON!! Phase.',
    ],
  },
  {
    id: 't1.don',
    chapter: 'instructorTurn1',
    turn: 1,
    actor: 'narration',
    lines: [
      'The DON!! Phase normally places 2 DON!! into the cost area.',
      'On the very first turn the player going first takes only 1 - that is my whole budget.',
    ],
    highlight: 'donZone',
  },
  {
    id: 't1.play',
    chapter: 'instructorTurn1',
    turn: 1,
    actor: 'instructor',
    lines: [
      'With 1 DON!! I can play a Character costing 1. Here comes Streusen.',
      'Playing a Character rests DON!! equal to its cost.',
    ],
    action: { kind: 'playCharacter', cardNumber: 'OP03-115' },
  },
  {
    id: 't1.end',
    chapter: 'instructorTurn1',
    turn: 1,
    actor: 'instructor',
    lines: ['Neither player may attack on their own first turn, so that is all I can do. Turn end.'],
    action: { kind: 'endMainPhase' },
  },

  // --- Chapter 3 - Turn 2, You --------------------------------------------
  {
    id: 't2.draw',
    chapter: 'yourTurn2',
    turn: 2,
    actor: 'narration',
    lines: [
      'Your turn. The player going second DOES draw on their first turn.',
      'The Draw Phase took the top card of your deck - Uso-Hachi - straight into your hand.',
    ],
    highlight: 'handZone',
  },
  {
    id: 't2.don',
    chapter: 'yourTurn2',
    turn: 2,
    actor: 'narration',
    lines: ['Your DON!! Phase placed 2 DON!! into your cost area. You can spend up to 2 this turn.'],
    highlight: 'donZone',
  },
  {
    id: 't2.play',
    chapter: 'yourTurn2',
    turn: 2,
    actor: 'player',
    lines: [
      'In your Main Phase you play cards from your hand by resting DON!! equal to their cost.',
      'Chopa-Emon costs 2, and you have exactly 2 active DON!!.',
    ],
    highlight: 'handZone',
    objective: 'Play Chopa-Emon (cost 2) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'OP05-068' },
  },
  {
    id: 't2.end',
    chapter: 'yourTurn2',
    turn: 2,
    actor: 'player',
    lines: [
      'Your DON!! are spent, and you cannot attack on your first turn either.',
      'Nothing left to do - end your turn.',
    ],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },

  // --- Chapter 4 - Turn 3, Instructor: the first attack --------------------
  {
    id: 't3.refresh',
    chapter: 'instructorTurn3',
    turn: 3,
    actor: 'narration',
    lines: [
      'My Refresh Phase set my rested cards active, then I drew and took 2 more DON!!.',
      'That is 3 DON!! for me - and from turn 3 onward, attacks are legal.',
    ],
  },
  {
    id: 't3.attack',
    chapter: 'instructorTurn3',
    turn: 3,
    actor: 'instructor',
    lines: [
      'A Leader may attack. Declaring an attack rests the attacking card for the turn.',
      'My Katakuri, 5000 power, attacks your Leader.',
    ],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 't3.pass',
    chapter: 'instructorTurn3',
    turn: 3,
    actor: 'player',
    lines: [
      'You may defend here - but let this one through so you can see what a hit does.',
      'An attack succeeds when the attacker’s power is equal to or greater than the defender’s. 5000 vs 5000 lands.',
    ],
    objective: 'Pass and let the attack through.',
    action: { kind: 'passStep' },
  },
  {
    id: 't3.damage',
    chapter: 'instructorTurn3',
    turn: 3,
    actor: 'narration',
    lines: [
      'A successful attack on a Leader removes 1 Life card - and it goes to that player’s hand.',
      'You are down to 4 Life, but your hand just grew. Life is a shield you get to spend.',
    ],
    highlight: 'lifeZone',
  },
  {
    id: 't3.play',
    chapter: 'instructorTurn3',
    turn: 3,
    actor: 'instructor',
    lines: ['You can act as often as you like in a Main Phase. I have 3 DON!! left, so Pekoms joins me.'],
    action: { kind: 'playCharacter', cardNumber: 'ST07-014' },
  },
  { id: 't3.end', chapter: 'instructorTurn3', turn: 3, actor: 'instructor', lines: ['Turn end.'], action: { kind: 'endMainPhase' } },

  // --- Chapter 5 - Turn 4, You: attacking back -----------------------------
  {
    id: 't4.upkeep',
    chapter: 'yourTurn4',
    turn: 4,
    actor: 'narration',
    lines: [
      'Your Refresh Phase set everything active again, you drew Fra-Nosuke, and took 2 more DON!!.',
      'You have 4 DON!! and, from this turn, the right to attack.',
    ],
    highlight: 'donZone',
  },
  {
    id: 't4.attack',
    chapter: 'yourTurn4',
    turn: 4,
    actor: 'player',
    lines: [
      'Your Leader can attack without spending any DON!! - attacking only rests the attacker.',
      'Select your Leader, then choose the Instructor’s Leader as the target.',
    ],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor’s Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 't4.pass', chapter: 'yourTurn4', turn: 4, actor: 'instructor', lines: ['I have nothing I want to spend on that. The hit lands.'], action: { kind: 'passStep' } },
  {
    id: 't4.damage',
    chapter: 'yourTurn4',
    turn: 4,
    actor: 'narration',
    lines: ['5000 against 5000 - your attack succeeded, and my Life drops to 4.'],
  },
  {
    id: 't4.play',
    chapter: 'yourTurn4',
    turn: 4,
    actor: 'player',
    lines: [
      'Your 4 DON!! are still active - attacking never costs DON!!.',
      'Zoro-Juurou costs 4 and has 6000 power. Put him on the field.',
    ],
    highlight: 'handZone',
    objective: 'Play Zoro-Juurou (cost 4) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'ST18-004' },
  },
  {
    id: 't4.end',
    chapter: 'yourTurn4',
    turn: 4,
    actor: 'player',
    lines: ['A Character cannot attack on the turn it is played, so Zoro-Juurou waits. End your turn.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },

  // --- Chapter 6 - Turn 5, Instructor: under pressure ----------------------
  {
    id: 't5.upkeep',
    chapter: 'instructorTurn5',
    turn: 5,
    actor: 'narration',
    lines: ['I refresh, draw, and take 2 more DON!! - 5 now. Both my Leader and Pekoms are active.'],
  },
  {
    id: 't5.attack1',
    chapter: 'instructorTurn5',
    turn: 5,
    actor: 'instructor',
    lines: ['Katakuri attacks your Leader again.'],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 't5.pass1',
    chapter: 'instructorTurn5',
    turn: 5,
    actor: 'player',
    lines: ['Let it through once more - I want you to feel the pressure before you learn to answer it.'],
    objective: 'Pass and take the hit.',
    action: { kind: 'passStep' },
  },
  {
    id: 't5.attack2',
    chapter: 'instructorTurn5',
    turn: 5,
    actor: 'instructor',
    lines: [
      'I still have an active Character, and every active card may attack once per turn.',
      'Pekoms, 5000 power, attacks your Leader too.',
    ],
    action: { kind: 'attack', attacker: own('ST07-014'), target: OPPOSING_LEADER },
  },
  {
    id: 't5.pass2',
    chapter: 'instructorTurn5',
    turn: 5,
    actor: 'player',
    lines: ['Pass again. You are down to 2 Life - but you now hold three cards taken from it.'],
    objective: 'Pass and take the hit.',
    action: { kind: 'passStep' },
  },
  {
    id: 't5.play',
    chapter: 'instructorTurn5',
    turn: 5,
    actor: 'instructor',
    lines: ['And with DON!! to spare, Charlotte Opera joins the board. Things look grim for you.'],
    action: { kind: 'playCharacter', cardNumber: 'OP03-106' },
  },
  { id: 't5.end', chapter: 'instructorTurn5', turn: 5, actor: 'instructor', lines: ['Turn end.'], action: { kind: 'endMainPhase' } },

  // --- Chapter 7 - Turn 6, You: K.O. a Character ---------------------------
  {
    id: 't6.upkeep',
    chapter: 'yourTurn6',
    turn: 6,
    actor: 'narration',
    lines: [
      'Refresh, draw Monkey.D.Luffy, take 2 DON!! - you are on 6, and Zoro-Juurou is ready.',
      'Time to fight back.',
    ],
  },
  {
    id: 't6.attackLeader',
    chapter: 'yourTurn6',
    turn: 6,
    actor: 'player',
    lines: ['Start with your Leader, straight at mine.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor’s Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 't6.pass1', chapter: 'yourTurn6', turn: 6, actor: 'instructor', lines: ['Through it goes. I am down to 3 Life.'], action: { kind: 'passStep' } },
  {
    id: 't6.attackPekoms',
    chapter: 'yourTurn6',
    turn: 6,
    actor: 'player',
    lines: [
      'Attacks can also target the opponent’s Characters - but only RESTED ones.',
      'Pekoms attacked last turn, so he is still rested. Zoro-Juurou’s 6000 beats his 5000.',
    ],
    highlight: 'characterAreaZone',
    objective: 'Attack the rested Pekoms with Zoro-Juurou.',
    action: { kind: 'attack', attacker: own('ST18-004'), target: opposing('ST07-014') },
  },
  { id: 't6.pass2', chapter: 'yourTurn6', turn: 6, actor: 'instructor', lines: ['Nothing to say to that one.'], action: { kind: 'passStep' } },
  {
    id: 't6.ko',
    chapter: 'yourTurn6',
    turn: 6,
    actor: 'narration',
    lines: [
      'When an attack beats a Character, that Character is K.O.’d and goes to the trash.',
      'Pekoms is gone. Attacking a Character costs the defender a card instead of Life.',
    ],
    highlight: 'trashZone',
  },
  {
    id: 't6.play',
    chapter: 'yourTurn6',
    turn: 6,
    actor: 'player',
    lines: ['You still have 6 DON!! active. San-Gorou costs 5 - build your board while you press.'],
    highlight: 'handZone',
    objective: 'Play San-Gorou (cost 5) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'ST18-003' },
  },
  {
    id: 't6.end',
    chapter: 'yourTurn6',
    turn: 6,
    actor: 'player',
    lines: ['That is a real board now. End your turn.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },

  // --- Chapter 8 - Turn 7, Instructor: you learn to defend -----------------
  {
    id: 't7.upkeep',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'narration',
    lines: [
      'The Instructor refreshes, draws, and reaches 7 DON!!.',
      'This turn you learn the answer to all of this: the Counter.',
    ],
  },
  {
    id: 't7.attackZoro',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'instructor',
    lines: [
      'Your Zoro-Juurou attacked last turn, so he is rested - and a legal target.',
      'Charlotte Opera, 6000 power, goes after him. Equal power still succeeds.',
    ],
    highlight: 'characterAreaZone',
    action: { kind: 'attack', attacker: own('OP03-106'), target: opposing('ST18-004') },
  },
  {
    id: 't7.counterZoro',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'player',
    lines: [
      'Cards in your hand have a Counter value. Discard one while defending to add that power.',
      'O-Robi gives +1000, taking Zoro-Juurou to 7000 - above Opera’s 6000, so he survives.',
    ],
    highlight: 'handZone',
    objective: 'Counter with O-Robi to save Zoro-Juurou.',
    action: { kind: 'counterCharacter', cardNumber: 'OP05-063', boostTarget: own('ST18-004') },
  },
  {
    id: 't7.passZoro',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'player',
    lines: ['That is enough power. Pass to resolve the battle - the card you used goes to the trash.'],
    objective: 'Pass to resolve the battle.',
    action: { kind: 'passStep' },
  },
  {
    id: 't7.attackLeader',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'instructor',
    lines: ['Zoro-Juurou held. Then Katakuri comes for your Leader instead.'],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 't7.counterLeader',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'player',
    lines: [
      'You are on 2 Life - this one you cannot afford to take.',
      'O-Nami gives +1000, putting your Leader at 6000 against Katakuri’s 5000.',
    ],
    highlight: 'handZone',
    objective: 'Counter with O-Nami to protect your Leader.',
    action: { kind: 'counterCharacter', cardNumber: 'ST18-002', boostTarget: LEADER },
  },
  {
    id: 't7.passLeader',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'player',
    lines: ['Pass to resolve it. Your Life holds at 2.'],
    objective: 'Pass to resolve the battle.',
    action: { kind: 'passStep' },
  },
  {
    id: 't7.play',
    chapter: 'instructorTurn7',
    turn: 7,
    actor: 'instructor',
    lines: ['Well defended. I still have DON!! to spend, so Charlotte Linlin arrives.'],
    action: { kind: 'playCharacter', cardNumber: 'ST20-005' },
  },
  { id: 't7.end', chapter: 'instructorTurn7', turn: 7, actor: 'instructor', lines: ['Turn end. Your move - and I am low on Life.'], action: { kind: 'endMainPhase' } },

  // --- Chapter 9 - Turn 8, You: winning the game ---------------------------
  {
    id: 't8.upkeep',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'narration',
    lines: [
      'Refresh sets everything active, you draw, and you are on 8 DON!!.',
      'The Instructor has 3 Life and you have three ready attackers. Count it out with me.',
    ],
  },
  {
    id: 't8.attackZoro',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'player',
    lines: ['Zoro-Juurou first, 6000 into a 5000 Leader.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor’s Leader with Zoro-Juurou.',
    action: { kind: 'attack', attacker: own('ST18-004'), target: OPPOSING_LEADER },
  },
  { id: 't8.pass1', chapter: 'yourTurn8', turn: 8, actor: 'instructor', lines: ['Two Life left.'], action: { kind: 'passStep' } },
  {
    id: 't8.attackSan',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'player',
    lines: ['San-Gorou next - also 6000.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor’s Leader with San-Gorou.',
    action: { kind: 'attack', attacker: own('ST18-003'), target: OPPOSING_LEADER },
  },
  { id: 't8.pass2', chapter: 'yourTurn8', turn: 8, actor: 'instructor', lines: ['One Life left.'], action: { kind: 'passStep' } },
  {
    id: 't8.attackLeader',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'player',
    lines: ['Now your Leader.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor’s Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 't8.pass3', chapter: 'yourTurn8', turn: 8, actor: 'instructor', lines: ['That is my last Life card.'], action: { kind: 'passStep' } },
  {
    id: 't8.lethalSetup',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'narration',
    lines: [
      'The Instructor is on 0 Life. One more successful attack on their Leader wins the game.',
      'Only Chopa-Emon is still active - but 3000 power cannot beat a 5000 Leader.',
    ],
    highlight: 'characterAreaZone',
  },
  {
    id: 't8.giveDon',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'player',
    lines: [
      'This is the second use of DON!!: give them to a Leader or Character for +1000 power each, for the turn.',
      'Your 8 DON!! are still active, because attacking never spends them. Hand them to Chopa-Emon.',
    ],
    highlight: 'characterAreaZone',
    objective: 'Give DON!! to Chopa-Emon so it can beat a 5000 Leader.',
    action: { kind: 'giveDon', target: own('OP05-068'), count: 8, minCount: 2 },
  },
  {
    id: 't8.finish',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'player',
    lines: ['Chopa-Emon can outmuscle a 5000 Leader now. Land the finishing blow.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor’s Leader with Chopa-Emon.',
    action: { kind: 'attack', attacker: own('OP05-068'), target: OPPOSING_LEADER },
  },
  { id: 't8.passFinal', chapter: 'yourTurn8', turn: 8, actor: 'instructor', lines: ['Nothing left to stop it.'], action: { kind: 'passStep' } },
  {
    id: 't8.victory',
    chapter: 'yourTurn8',
    turn: 8,
    actor: 'narration',
    lines: [
      'That is the game. Damage taken with no Life cards left ends it.',
      'Attack, defend, and manage DON!! better than your opponent - that is the whole loop. Well sailed!',
    ],
  },
];


/**
 * The Instructor's opening five. The official app never shows the
 * opponent's hand, so only the four cards the script actually plays are
 * pinned — Streusen (turn 1), Pekoms (turn 3), Opera (turn 5) and Linlin
 * (turn 7). The fifth slot is left to the shuffle.
 */
const INSTRUCTOR_OPENING_HAND: readonly DeckStackSlot[] = ['OP03-115', 'ST07-014', 'OP03-106', 'ST20-005', null];

/** Nothing in this scenario reads a Life card by name, so all five are left shuffled (5-2-1-7). */
const LIFE_UNPINNED: readonly DeckStackSlot[] = [null, null, null, null, null];

export const BASIC_GAME_FLOW: TutorialScenarioDef = {
  id: 'basicGameFlow',
  title: 'Basic Game Flow',
  blurb: 'One full match from setup to victory — the loop the whole game runs on.',
  teaches: ['Setup & mulligan', 'The 5 phases', 'Playing Characters', 'Attacking & Life', 'K.O.', 'Counter', 'Giving DON!!'],
  // The official scenario prints "we will ignore card effects that activate
  // when a card is played" on screen; an empty registry is that, enforced.
  effects: 'off',
  rngSeed: 'tutorial-basic-game-flow',
  decks: { player: TUTORIAL_DECK_PLAYER, instructor: TUTORIAL_DECK_INSTRUCTOR },
  openingHand: OPENING_HAND,
  instructorOpeningHand: INSTRUCTOR_OPENING_HAND,
  life: { player: LIFE_UNPINNED, instructor: LIFE_UNPINNED },
  draws: { player: SCRIPTED_DRAWS.player, instructor: SCRIPTED_DRAWS.instructor },
  chapters: CHAPTERS,
  beats: BEATS,
};
