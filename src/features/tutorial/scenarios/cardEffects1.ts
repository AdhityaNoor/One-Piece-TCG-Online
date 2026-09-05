/**
 * SCENARIO 2 — "Mastering Card Effects, Part 1", after the official Teaching
 * App's `basic_battle2`.
 *
 * WHAT MAKES THIS ONE DIFFERENT: `effects: 'curated'`. Basic Game Flow runs
 * with an empty registry so that nothing can fire — that is what the official
 * first scenario does, and it says so on screen. This one exists to teach the
 * abilities themselves, so the match is seeded with the REAL curated effect
 * registry (src/cards/effectTemplates). Every ability the script leans on was
 * read off its curated program first, not off the printed text, because a
 * lesson cannot be taught with an ability the engine only half-implements.
 *
 * The consequence is prompts: a real ability suspends the game on a
 * PendingChoice, and the script has to answer it. Those answers are ordinary
 * beats (`resolveChoice`), and tutorialScript.e2e.test.ts enforces the rule
 * that matters — a beat may raise a prompt only if the very next acting beat
 * answers it, so the player is never left facing a picker the lesson never
 * mentions.
 *
 * SAME TWO LEADERS AS SCENARIO 1, deliberately: the board is already
 * familiar, so the only new thing is that cards now DO something. The
 * Instructor's deck is built almost entirely from vanilla bodies (Pekoms,
 * Baron Tamago, Charlotte Flampe, Bobbin and Anana print no text at all), so
 * the only Instructor ability in the scenario is the one being taught.
 */
import { LEADER, OPPOSING_LEADER, own } from './refs';
import { EFFECTS_DECK_INSTRUCTOR, EFFECTS_DECK_PLAYER } from '../tutorialDecks';
import type { DeckStackSlot, TutorialBeat, TutorialChapter, TutorialScenarioDef } from '../types';

/** Opening five: the turn-2 body, the two lesson Characters, and the two Counter cards. */
const OPENING_HAND = ['OP05-068', 'OP16-068', 'OP09-068', 'OP05-063', 'ST18-002'] as const;

/** Minochihuahua (turn 8's [Rush] lesson) is drawn first; the rest are padding. */
const DRAWS = {
  player: ['EB01-036', 'ST18-004', 'OP05-062', 'OP05-061'],
  instructor: ['OP03-106', 'ST07-002', 'ST07-006'],
} as const;

const INSTRUCTOR_OPENING_HAND: readonly DeckStackSlot[] = ['ST07-002', 'ST07-014', 'ST07-012', 'OP03-103', null];
/**
 * Both Life stacks are pinned to cards that print NO [Trigger].
 *
 * Not cosmetic: with effects on, a successful attack on a Leader reveals a
 * Life card, and a [Trigger] on it stops the game to ask the defender whether
 * to use it (10-1-5-2). That is a real rule and a good lesson — it is just
 * scenario 3's lesson. Letting it fire here would interrupt a Counter or a
 * [Rush] demonstration with a prompt this script never explains.
 */
const PLAYER_LIFE: readonly DeckStackSlot[] = ['OP05-062', 'OP05-061', 'ST18-001', 'ST18-003', 'OP05-066'];
const INSTRUCTOR_LIFE: readonly DeckStackSlot[] = ['ST20-001', 'ST07-004', 'OP03-112', 'ST20-005', 'ST07-006'];

const CHAPTERS: readonly TutorialChapter[] = [
  { id: 'preparing', title: 'Preparing for Battle', turn: 0 },
  { id: 'instructor1', title: "Opponent's Turn - Effects Are On", turn: 1 },
  { id: 'you2', title: 'Your Turn - Reading a Card', turn: 2 },
  { id: 'instructor3', title: "Opponent's Turn - Building a Board", turn: 3 },
  { id: 'you4', title: 'Your Turn - [On Play]', turn: 4 },
  { id: 'instructor5', title: "Opponent's Turn - [DON!! x1]", turn: 5 },
  { id: 'you6', title: 'Your Turn - [Activate: Main] and [End of Your Turn]', turn: 6 },
  { id: 'instructor7', title: "Opponent's Turn - Two Counters", turn: 7 },
  { id: 'you8', title: 'Your Turn - [Rush] and the Win', turn: 8 },
];

const BEATS: readonly TutorialBeat[] = [
  {
    id: 's2.setup.intro',
    chapter: 'preparing',
    turn: 0,
    actor: 'narration',
    lines: [
      'Welcome back. You know the loop now: phases, attacks, Life, Counter.',
      'This match turns on something the first one deliberately kept off - card effects.',
    ],
  },
  {
    id: 's2.setup.keywords',
    chapter: 'preparing',
    turn: 0,
    actor: 'narration',
    lines: [
      'Anything in square brackets is a keyword, and it tells you WHEN an ability happens.',
      '[On Play] fires as the card hits the field. [When Attacking] fires as it declares an attack. [End of Your Turn] waits for the end of your turn.',
    ],
    highlight: 'handZone',
  },
  {
    id: 's2.setup.goingFirst',
    chapter: 'preparing',
    turn: 0,
    actor: 'instructor',
    lines: ['I won the throw again, and I will go first again. You take the extra card.'],
    action: { kind: 'chooseGoingFirst', goingFirst: true },
  },
  {
    id: 's2.setup.mulliganInstructor',
    chapter: 'preparing',
    turn: 0,
    actor: 'instructor',
    lines: ['I keep my five.'],
    action: { kind: 'mulligan', redraw: false },
  },
  {
    id: 's2.setup.mulliganPlayer',
    chapter: 'preparing',
    turn: 0,
    actor: 'player',
    lines: ['Your five are the ones this lesson needs. Keep them.'],
    highlight: 'handZone',
    objective: 'Keep your hand.',
    action: { kind: 'mulligan', redraw: false },
  },
  {
    id: 's2.setup.life',
    chapter: 'preparing',
    turn: 0,
    actor: 'narration',
    lines: ['Five Life each, same as before. Now the abilities start mattering.'],
    highlight: 'lifeZone',
  },
  {
    id: 's2.t1.play',
    chapter: 'instructor1',
    turn: 1,
    actor: 'instructor',
    lines: [
      'One DON!! on the first turn, so something small: Charlotte Anana.',
      'She prints no ability at all. Plenty of cards do not - a plain body is still a card.',
    ],
    action: { kind: 'playCharacter', cardNumber: 'ST07-002' },
  },
  { id: 's2.t1.end', chapter: 'instructor1', turn: 1, actor: 'instructor', lines: ['Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's2.t2.upkeep',
    chapter: 'you2',
    turn: 2,
    actor: 'narration',
    lines: ['Refresh, draw, two DON!!. Chopa-Emon costs 2 - exactly what you have.'],
    highlight: 'donZone',
  },
  {
    id: 's2.t2.play',
    chapter: 'you2',
    turn: 2,
    actor: 'player',
    lines: [
      'Chopa-Emon prints [On Play], but read the rest of the line: "If you have 8 or more DON!! cards on your field".',
      'You have two. The condition fails, so nothing happens - an ability whose condition is not met simply does not fire.',
    ],
    highlight: 'handZone',
    objective: 'Play Chopa-Emon (cost 2) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'OP05-068' },
  },
  {
    id: 's2.t2.end',
    chapter: 'you2',
    turn: 2,
    actor: 'player',
    lines: ['Nothing else you can afford. End your turn.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },
  {
    id: 's2.t3.play',
    chapter: 'instructor3',
    turn: 3,
    actor: 'instructor',
    lines: ['Three DON!!, so Pekoms joins. Another plain body - I am saving my ability for later.'],
    action: { kind: 'playCharacter', cardNumber: 'ST07-014' },
  },
  {
    id: 's2.t3.attack',
    chapter: 'instructor3',
    turn: 3,
    actor: 'instructor',
    lines: ['And my Leader swings at yours. Nothing clever yet.'],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 's2.t3.pass',
    chapter: 'instructor3',
    turn: 3,
    actor: 'player',
    lines: ['5000 into 5000 succeeds. Take it - you want your Counter cards for later.'],
    objective: 'Pass to let the attack resolve.',
    action: { kind: 'passStep' },
  },
  { id: 's2.t3.end', chapter: 'instructor3', turn: 3, actor: 'instructor', lines: ['You are on 4 Life. Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's2.t4.upkeep',
    chapter: 'you4',
    turn: 4,
    actor: 'narration',
    lines: ['Refresh, draw, four DON!!. Time for your first real ability.'],
    highlight: 'donZone',
  },
  {
    id: 's2.t4.play',
    chapter: 'you4',
    turn: 4,
    actor: 'player',
    lines: [
      'Trafalgar Law costs 4 and prints [On Play] Add up to 1 DON!! card from your DON!! deck and set it as active.',
      '[On Play] resolves the moment the card arrives. You do not wait for it and you do not pay anything extra.',
    ],
    highlight: 'handZone',
    objective: 'Play Trafalgar Law (cost 4) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'OP16-068' },
  },
  {
    id: 's2.t4.donBack',
    chapter: 'you4',
    turn: 4,
    actor: 'narration',
    lines: [
      'Watch the cost area: you spent four DON!! and immediately got one back, active.',
      'That is a DON!! ahead of schedule. Effects are how you get more than the two per turn everybody gets.',
    ],
    highlight: 'donZone',
  },
  {
    id: 's2.t4.attack',
    chapter: 'you4',
    turn: 4,
    actor: 'player',
    lines: ['Your Leader is still active. Swing.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 's2.t4.pass', chapter: 'you4', turn: 4, actor: 'instructor', lines: ['Through. I am on 4.'], action: { kind: 'passStep' } },
  {
    id: 's2.t4.end',
    chapter: 'you4',
    turn: 4,
    actor: 'player',
    lines: ['End your turn.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },
  {
    id: 's2.t5.play',
    chapter: 'instructor5',
    turn: 5,
    actor: 'instructor',
    lines: ['Baron Tamago first - 6000 power, no text.'],
    action: { kind: 'playCharacter', cardNumber: 'ST07-012' },
  },
  {
    id: 's2.t5.giveDon',
    chapter: 'instructor5',
    turn: 5,
    actor: 'instructor',
    lines: [
      'Now watch this. My Leader prints [DON!! x1] [When Attacking].',
      '[DON!! x1] means the ability is switched OFF until at least one DON!! card has been GIVEN to this card. So I give it one.',
    ],
    highlight: 'donZone',
    action: { kind: 'giveDon', target: LEADER, count: 1 },
  },
  {
    id: 's2.t5.attack',
    chapter: 'instructor5',
    turn: 5,
    actor: 'instructor',
    lines: [
      'The DON!! is +1000 power on its own, and it also switches the ability on. I attack your Leader.',
      '[When Attacking] fires now: I look at a Life card, and my Leader gains another +1000 for this battle.',
    ],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 's2.t5.peek',
    chapter: 'instructor5',
    turn: 5,
    actor: 'instructor',
    lines: ['I will leave it where it is.'],
    action: { kind: 'resolveChoice', choose: { pick: 'none' } },
  },
  {
    id: 's2.t5.pass',
    chapter: 'instructor5',
    turn: 5,
    actor: 'player',
    lines: [
      '5000 base, +1000 from the given DON!!, +1000 from the ability: 7000 against your 5000 Leader.',
      'You could Counter, but it would cost three cards to stop one attack. Let it through and keep them.',
    ],
    objective: 'Pass to let the attack resolve.',
    action: { kind: 'passStep' },
  },
  { id: 's2.t5.end', chapter: 'instructor5', turn: 5, actor: 'instructor', lines: ['You are on 3. Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's2.t6.leaderText',
    chapter: 'you6',
    turn: 6,
    actor: 'narration',
    lines: [
      'Six DON!!. Read your own Leader for once - it has an ability too.',
      '[Activate: Main] [Once Per Turn]: you may add the top card of your Life to your hand; then, if you have 0 or 3 or more DON!!, add a DON!! and set it active.',
    ],
    highlight: 'leaderZone',
  },
  {
    id: 's2.t6.activate',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: [
      '[Activate: Main] means YOU choose to use it, on your own Main Phase.',
      'Use it. It costs no DON!! - the price is a Life card, which becomes a card in your hand.',
    ],
    highlight: 'leaderZone',
    objective: 'Use your Leader [Activate: Main] ability.',
    action: { kind: 'activateEffect', source: LEADER },
  },
  {
    id: 's2.t6.takeLife',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: [
      'The prompt offers "Do not add a Life card" or "Top Life card". Take the Life card.',
      'You are spending a Life to gain a card and a DON!! - a real trade, not a freebie.',
    ],
    highlight: 'lifeZone',
    objective: 'Choose "Top Life card" to take it into your hand.',
    // Option 0 is the decline branch (lifePositionOptions puts it first when
    // the ability is optional); option 1 is the top Life card.
    action: { kind: 'resolveChoice', choose: { pick: 'option', index: 1 } },
  },
  {
    id: 's2.t6.oncePerTurn',
    chapter: 'you6',
    turn: 6,
    actor: 'narration',
    lines: [
      'You had 3 or more DON!!, so the second half fired as well: one more DON!!, active, for free.',
      '[Once Per Turn] is the limit on it - the board will refuse a second use until your next turn.',
    ],
    highlight: 'donZone',
  },
  {
    id: 's2.t6.play',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: [
      'Tony Tony.Chopper costs 5 and prints [End of Your Turn] - an ability that waits for the end of this turn.',
      'He cannot attack the turn he arrives, so his job starts after you pass.',
    ],
    highlight: 'handZone',
    objective: 'Play Tony Tony.Chopper (cost 5) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'OP09-068' },
  },
  {
    id: 's2.t6.attack',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: ['Before you pass, swing with your Leader again.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 's2.t6.pass', chapter: 'you6', turn: 6, actor: 'instructor', lines: ['Through again. I am on 3.'], action: { kind: 'passStep' } },
  {
    id: 's2.t6.end',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: ['Now end the turn, and watch Chopper.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },
  {
    id: 's2.t6.chopper',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: [
      '[End of Your Turn] fired: you may return DON!! from your field to your DON!! deck to set Chopper active and give him [Blocker].',
      'Return one. A DON!! is a fair price for a Blocker standing in front of your Leader.',
    ],
    highlight: 'donZone',
    objective: 'Return 1 DON!! to pay for Chopper ability.',
    action: { kind: 'resolveChoice', choose: { pick: 'firstCandidates', count: 1 } },
  },
  {
    id: 's2.t7.giveDon',
    chapter: 'instructor7',
    turn: 7,
    actor: 'instructor',
    lines: ['Same trick as before: one DON!! to my Leader to switch the ability back on.'],
    highlight: 'donZone',
    action: { kind: 'giveDon', target: LEADER, count: 1 },
  },
  {
    id: 's2.t7.attack',
    chapter: 'instructor7',
    turn: 7,
    actor: 'instructor',
    lines: ['7000 at your Leader again. You are down to 2 Life - this one you should stop.'],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 's2.t7.peek',
    chapter: 'instructor7',
    turn: 7,
    actor: 'instructor',
    lines: ['Leaving it on top again.'],
    action: { kind: 'resolveChoice', choose: { pick: 'none' } },
  },
  {
    id: 's2.t7.declineBlock',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: [
      'Something new happened first: because Chopper has [Blocker], the game asks YOU before anything else.',
      'Blocking would put him in front of the attack and rest him. You want him swinging next turn, so decline.',
    ],
    highlight: 'characterAreaZone',
    objective: 'Decline the block.',
    action: { kind: 'passStep' },
  },
  {
    id: 's2.t7.counter1',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: [
      'Careful with the arithmetic: an attack succeeds when the attacker is equal to OR greater than the defender.',
      'So matching 7000 is not enough - you have to get ABOVE it. Start with O-Robi, +1000.',
    ],
    highlight: 'handZone',
    objective: 'Counter with O-Robi (+1000).',
    action: { kind: 'counterCharacter', cardNumber: 'OP05-063', boostTarget: LEADER },
  },
  {
    id: 's2.t7.counter2',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: ['Now O-Nami. That is 7000 against 7000 - still a successful attack, so you are not safe yet.'],
    highlight: 'handZone',
    objective: 'Counter again with O-Nami (+1000).',
    action: { kind: 'counterCharacter', cardNumber: 'ST18-002', boostTarget: LEADER },
  },
  {
    id: 's2.t7.counter3',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: [
      'One more. Your second O-Nami takes the Leader to 8000, and 7000 cannot beat 8000.',
      'There is no cap on how many Counter cards you may play in one battle - only on how many you can afford to lose.',
    ],
    highlight: 'handZone',
    objective: 'Counter a third time with your other O-Nami (+1000).',
    action: { kind: 'counterCharacter', cardNumber: 'OP05-062', boostTarget: LEADER },
  },
  {
    id: 's2.t7.pass',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: ['Now it holds. Pass to resolve it - every Counter card you used goes to the trash either way.'],
    objective: 'Pass to resolve the battle.',
    action: { kind: 'passStep' },
  },
  { id: 's2.t7.end', chapter: 'instructor7', turn: 7, actor: 'instructor', lines: ['Held. You are still on 2 - and I am on 3. Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's2.t8.upkeep',
    chapter: 'you8',
    turn: 8,
    actor: 'narration',
    lines: [
      'Everything refreshes, you draw, and your DON!! comes back.',
      'I am on 3 Life with nothing rested to hide behind. Count the attacks.',
    ],
  },
  {
    id: 's2.t8.rush',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: [
      'Minochihuahua costs 4 and prints [Rush]: this card can attack on the turn in which it is played.',
      'Normally a Character cannot. [Rush] is the exception, and it is why he is the last piece.',
    ],
    highlight: 'handZone',
    objective: 'Play Minochihuahua (cost 4) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'EB01-036' },
  },
  {
    id: 's2.t8.rushAttack',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: ['He arrived this turn and he can still swing. 5000 into a 5000 Leader.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor Leader with Minochihuahua.',
    action: { kind: 'attack', attacker: own('EB01-036'), target: OPPOSING_LEADER },
  },
  { id: 's2.t8.pass1', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['Two Life.'], action: { kind: 'passStep' } },
  {
    id: 's2.t8.chopperAttack',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: ['Chopper is active and no longer new. 6000.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor Leader with Tony Tony.Chopper.',
    action: { kind: 'attack', attacker: own('OP09-068'), target: OPPOSING_LEADER },
  },
  { id: 's2.t8.pass2', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['One Life.'], action: { kind: 'passStep' } },
  {
    id: 's2.t8.leaderAttack',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: ['Your Leader takes the last Life card.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 's2.t8.pass3', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['That was my last one.'], action: { kind: 'passStep' } },
  {
    id: 's2.t8.giveDon',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: [
      'I am on 0 Life. One more successful attack ends it - but Chopa-Emon is only 3000.',
      'Give him DON!! - +1000 each - until he can beat a 5000 Leader.',
    ],
    highlight: 'characterAreaZone',
    objective: 'Give DON!! to Chopa-Emon so it can beat a 5000 Leader.',
    action: { kind: 'giveDon', target: own('OP05-068'), count: 2, minCount: 2 },
  },
  {
    id: 's2.t8.finish',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: ['Land it.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor Leader with Chopa-Emon.',
    action: { kind: 'attack', attacker: own('OP05-068'), target: OPPOSING_LEADER },
  },
  { id: 's2.t8.passFinal', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['Nothing to answer with.'], action: { kind: 'passStep' } },
  {
    id: 's2.t8.victory',
    chapter: 'you8',
    turn: 8,
    actor: 'narration',
    lines: [
      'That is the game - and every card that mattered did exactly what its text said it would.',
      '[On Play], [When Attacking], [Activate: Main], [Once Per Turn], [DON!! x1], [End of Your Turn], [Rush]. Read the brackets first, always.',
    ],
  },
];

export const CARD_EFFECTS_1: TutorialScenarioDef = {
  id: 'cardEffects1',
  title: 'Mastering Card Effects, Part 1',
  blurb: 'The same board, with abilities switched on — and the keywords that say when each one fires.',
  teaches: ['[On Play]', '[When Attacking]', '[Activate: Main]', '[Once Per Turn]', '[DON!! x1]', '[End of Your Turn]', '[Rush]', 'Stacking Counters'],
  effects: 'curated',
  rngSeed: 'tutorial-card-effects-1',
  decks: { player: EFFECTS_DECK_PLAYER, instructor: EFFECTS_DECK_INSTRUCTOR },
  openingHand: OPENING_HAND,
  instructorOpeningHand: INSTRUCTOR_OPENING_HAND,
  life: { player: PLAYER_LIFE, instructor: INSTRUCTOR_LIFE },
  draws: { player: DRAWS.player, instructor: DRAWS.instructor },
  chapters: CHAPTERS,
  beats: BEATS,
};
