/**
 * SCENARIO 3 — "Mastering Card Effects, Part 2", after the official Teaching
 * App's `basic_battle3`.
 *
 * This is the keyword scenario: Stage cards, [Trigger], [Blocker], [Banish],
 * [Double Attack] and [Counter] Events. Unlike Part 1 — where every lesson
 * was an ability written in a curated program — most of these are handled
 * NATIVELY by the rules engine off the printing itself (hasTrigger,
 * hasBlocker, hasBanish, hasDoubleAttack), which is why they can be taught
 * on cards whose written abilities stay silent all match.
 *
 * THE LIFE STACKS ARE STACKED ON PURPOSE. Two of the lessons here are about
 * what happens when a Life card is revealed: a [Trigger] going off in your
 * favour, and [Banish] denying the opponent the same thing. Neither is
 * teachable if the Life cards are whatever the shuffle produced, so both
 * stacks pin exactly which cards sit where (see `life` below) and the e2e
 * test asserts the lesson actually fires.
 */
import { LEADER, OPPOSING_LEADER, own, opposing } from './refs';
import { EFFECTS2_DECK_PLAYER, EFFECTS_DECK_INSTRUCTOR } from '../tutorialDecks';
import type { DeckStackSlot, TutorialBeat, TutorialChapter, TutorialScenarioDef } from '../types';

const OPENING_HAND = ['OP09-080', 'OP02-087', 'OP03-068', 'OP03-072', 'OP05-068'] as const;

const DRAWS = {
  player: ['OP05-063', 'ST18-002', 'OP05-062', 'OP05-061'],
  instructor: ['ST07-006', 'ST20-001', 'OP03-103'],
} as const;

const INSTRUCTOR_OPENING_HAND: readonly DeckStackSlot[] = ['ST07-002', 'ST07-014', 'ST20-001', 'OP03-103', null];

/**
 * The player's Life. Damage takes from the TOP of the stack, which is the
 * LAST slot the deal fills — so the Gum-Gum Jet Gatling goes last, and it is
 * the card turn 3 reveals. The rest print no [Trigger] so nothing else
 * interrupts. (The e2e test asserts the Trigger really fires, which is what
 * pins this ordering down rather than leaving it to a comment.)
 */
const PLAYER_LIFE: readonly DeckStackSlot[] = ['OP05-062', 'OP05-061', 'ST18-001', 'ST18-003', 'OP03-072'];

/**
 * The Instructor's Life. The card [Banish] destroys on turn 8 has to be one
 * with a [Trigger] on it, or "trashed WITHOUT activating its Trigger" is an
 * empty claim. Charlotte Oven sits in that slot; everything else is
 * Trigger-free.
 */
const INSTRUCTOR_LIFE: readonly DeckStackSlot[] = ['ST07-012', 'OP03-106', 'OP03-105', 'ST07-004', 'OP03-112'];

const CHAPTERS: readonly TutorialChapter[] = [
  { id: 'preparing', title: 'Preparing for Battle', turn: 0 },
  { id: 'instructor1', title: "Opponent's Turn - Opening", turn: 1 },
  { id: 'you2', title: 'Your Turn - Stage Cards', turn: 2 },
  { id: 'instructor3', title: "Opponent's Turn - [Trigger]", turn: 3 },
  { id: 'you4', title: 'Your Turn - Building the Beasts', turn: 4 },
  { id: 'instructor5', title: "Opponent's Turn - A [Blocker] Arrives", turn: 5 },
  { id: 'you6', title: 'Your Turn - Beating a [Blocker]', turn: 6 },
  { id: 'instructor7', title: "Opponent's Turn - Counter Events", turn: 7 },
  { id: 'you8', title: 'Your Turn - [Banish] and [Double Attack]', turn: 8 },
];

const BEATS: readonly TutorialBeat[] = [
  {
    id: 's3.setup.intro',
    chapter: 'preparing',
    turn: 0,
    actor: 'narration',
    lines: [
      'Last one. Part 1 was about WHEN an ability fires. This one is about keywords that change the rules of a battle.',
      'Stage cards, [Trigger], [Blocker], [Banish] and [Double Attack] - and the Events you hold for your opponent’s turn.',
    ],
  },
  {
    id: 's3.setup.goingFirst',
    chapter: 'preparing',
    turn: 0,
    actor: 'instructor',
    lines: ['I go first once more.'],
    action: { kind: 'chooseGoingFirst', goingFirst: true },
  },
  {
    id: 's3.setup.mulliganInstructor',
    chapter: 'preparing',
    turn: 0,
    actor: 'instructor',
    lines: ['Keeping my five.'],
    action: { kind: 'mulligan', redraw: false },
  },
  {
    id: 's3.setup.mulliganPlayer',
    chapter: 'preparing',
    turn: 0,
    actor: 'player',
    lines: ['Keep yours - a Stage, two beasts, an Event and a body.'],
    highlight: 'handZone',
    objective: 'Keep your hand.',
    action: { kind: 'mulligan', redraw: false },
  },
  {
    id: 's3.t1.play',
    chapter: 'instructor1',
    turn: 1,
    actor: 'instructor',
    lines: ['One DON!!, one small body. Charlotte Anana.'],
    action: { kind: 'playCharacter', cardNumber: 'ST07-002' },
  },
  { id: 's3.t1.end', chapter: 'instructor1', turn: 1, actor: 'instructor', lines: ['Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's3.t2.stageIntro',
    chapter: 'you2',
    turn: 2,
    actor: 'narration',
    lines: [
      'Your deck holds a third card type you have not played yet: a Stage card.',
      'Stages do not fight. They sit in their own zone and their ability just keeps working - and you may only control one at a time.',
    ],
    highlight: 'stageZone',
  },
  {
    id: 's3.t2.play',
    chapter: 'you2',
    turn: 2,
    actor: 'player',
    lines: ['Thousand Sunny costs 1. Put her out - she goes to the Stage zone, not the Character area.'],
    highlight: 'handZone',
    objective: 'Play Thousand Sunny (cost 1) as your Stage.',
    action: { kind: 'playStage', cardNumber: 'OP09-080' },
  },
  {
    id: 's3.t2.body',
    chapter: 'you2',
    turn: 2,
    actor: 'player',
    lines: ['One DON!! left, and Chopa-Emon costs 2 - so nothing more this turn. Wait: you have exactly one. Play nothing and end.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },
  {
    id: 's3.t3.play',
    chapter: 'instructor3',
    turn: 3,
    actor: 'instructor',
    lines: ['Pekoms for me.'],
    action: { kind: 'playCharacter', cardNumber: 'ST07-014' },
  },
  {
    id: 's3.t3.attack',
    chapter: 'instructor3',
    turn: 3,
    actor: 'instructor',
    lines: ['And my Leader at yours. 5000 into 5000 - that succeeds, so you lose a Life card.'],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 's3.t3.pass',
    chapter: 'instructor3',
    turn: 3,
    actor: 'player',
    lines: ['Let it through - you want to see what is underneath.'],
    objective: 'Pass to let the attack resolve.',
    action: { kind: 'passStep' },
  },
  {
    id: 's3.t3.trigger',
    chapter: 'instructor3',
    turn: 3,
    actor: 'player',
    lines: [
      'Losing a Life card is not purely bad. The card is revealed on its way to your hand, and if it prints [Trigger] you may use that ability for free.',
      'Gum-Gum Jet Gatling has one: add a DON!! card and set it active. Using it trashes the card instead of keeping it, so it is a real choice.',
    ],
    highlight: 'lifeZone',
    objective: 'Activate the [Trigger].',
    // A Life [Trigger] choice takes [] to decline or the revealed card's own id to use it.
    action: { kind: 'resolveChoice', choose: { pick: 'source' } },
  },
  {
    id: 's3.t3.triggerAfter',
    chapter: 'instructor3',
    turn: 3,
    actor: 'narration',
    lines: [
      'A free DON!! - paid for by giving up the card, which goes to the trash rather than your hand.',
      'That is why racing an opponent to zero Life is not always safe: every Life card you knock off them might be handing them a [Trigger].',
    ],
    highlight: 'donZone',
  },
  { id: 's3.t3.end', chapter: 'instructor3', turn: 3, actor: 'instructor', lines: ['Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's3.t4.play',
    chapter: 'you4',
    turn: 4,
    actor: 'player',
    lines: [
      'Four DON!! from the phase, plus the one your [Trigger] found: five.',
      'Minotaur costs 4 and prints [Double Attack] - "this card deals 2 damage". Two Life cards from one successful attack.',
    ],
    highlight: 'handZone',
    objective: 'Play Minotaur (cost 4) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'OP02-087' },
  },
  {
    id: 's3.t4.attack',
    chapter: 'you4',
    turn: 4,
    actor: 'player',
    lines: ['He cannot attack yet - no [Rush] here. Your Leader can.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 's3.t4.pass', chapter: 'you4', turn: 4, actor: 'instructor', lines: ['Four Life.'], action: { kind: 'passStep' } },
  {
    id: 's3.t4.end',
    chapter: 'you4',
    turn: 4,
    actor: 'player',
    lines: ['End your turn.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },
  {
    id: 's3.t5.play',
    chapter: 'instructor5',
    turn: 5,
    actor: 'instructor',
    lines: [
      'Five DON!!, and this one matters: Charlotte Katakuri, 6000, with [Blocker].',
      'After you declare an attack, I may rest him to make him the new target instead. He is a wall in front of my Leader.',
    ],
    highlight: 'characterAreaZone',
    action: { kind: 'playCharacter', cardNumber: 'ST20-001' },
  },
  {
    id: 's3.t5.attack',
    chapter: 'instructor5',
    turn: 5,
    actor: 'instructor',
    lines: ['Pekoms swings while I am here.'],
    action: { kind: 'attack', attacker: own('ST07-014'), target: OPPOSING_LEADER },
  },
  {
    id: 's3.t5.pass',
    chapter: 'instructor5',
    turn: 5,
    actor: 'player',
    lines: ['Nothing worth spending on a 5000 attack. Let it through.'],
    objective: 'Pass to let the attack resolve.',
    action: { kind: 'passStep' },
  },
  { id: 's3.t5.end', chapter: 'instructor5', turn: 5, actor: 'instructor', lines: ['You are on 3. Your turn.'], action: { kind: 'endMainPhase' } },
  {
    id: 's3.t6.play',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: [
      'Minozebra costs 4 and prints [Banish] - keep him for later, but get him down now.',
      '"When this card deals damage, the target card is trashed without activating its Trigger."',
    ],
    highlight: 'handZone',
    objective: 'Play Minozebra (cost 4) from your hand.',
    action: { kind: 'playCharacter', cardNumber: 'OP03-068' },
  },
  {
    id: 's3.t6.giveDon',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: [
      'Katakuri is 6000 and Minotaur is 5000, so an attack into that wall loses.',
      'Give Minotaur a DON!! first: +1000 makes it 6000, and an attacker wins on equal power.',
    ],
    highlight: 'characterAreaZone',
    objective: 'Give 1 DON!! to Minotaur.',
    action: { kind: 'giveDon', target: own('OP02-087'), count: 1, minCount: 1 },
  },
  {
    id: 's3.t6.attack',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: ['Now attack my Leader with Minotaur, and watch what I do about it.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor Leader with Minotaur.',
    action: { kind: 'attack', attacker: own('OP02-087'), target: OPPOSING_LEADER },
  },
  {
    id: 's3.t6.block',
    chapter: 'you6',
    turn: 6,
    actor: 'instructor',
    lines: [
      'I rest Katakuri and make HIM the target. That is [Blocker]: it does not stop the attack, it redirects it.',
      'My Leader is safe - but Katakuri is now in a 6000 against 6000 battle he does not win.',
    ],
    highlight: 'characterAreaZone',
    action: { kind: 'activateBlocker', cardNumber: 'ST20-001' },
  },
  {
    id: 's3.t6.pass',
    chapter: 'you6',
    turn: 6,
    actor: 'instructor',
    // The DEFENDER passes out of the Block/Counter timing (7-1-2, 7-1-3), and
    // on your own attack the defender is me.
    lines: ['I have no Counter for this. Resolving.'],
    action: { kind: 'passStep' },
  },
  {
    id: 's3.t6.blockAfter',
    chapter: 'you6',
    turn: 6,
    actor: 'narration',
    lines: [
      'Katakuri is K.O.d and my Leader took nothing. That is the trade a [Blocker] offers: a card instead of a Life card.',
      'Note what it cost me - a 5-cost Character - and what it cost you: one DON!! for the turn.',
    ],
    highlight: 'trashZone',
  },
  {
    id: 's3.t6.leaderAttack',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: ['The wall is gone. Your Leader swings.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 's3.t6.pass2', chapter: 'you6', turn: 6, actor: 'instructor', lines: ['Three Life.'], action: { kind: 'passStep' } },
  {
    id: 's3.t6.end',
    chapter: 'you6',
    turn: 6,
    actor: 'player',
    lines: ['End your turn.'],
    objective: 'End your turn.',
    action: { kind: 'endMainPhase' },
  },
  {
    id: 's3.t7.giveDon',
    chapter: 'instructor7',
    turn: 7,
    actor: 'instructor',
    lines: ['One DON!! to my Leader, same as you have seen before.'],
    highlight: 'donZone',
    action: { kind: 'giveDon', target: LEADER, count: 1 },
  },
  {
    id: 's3.t7.attack',
    chapter: 'instructor7',
    turn: 7,
    actor: 'instructor',
    lines: ['7000 at your Leader. You are on 3 Life.'],
    highlight: 'leaderZone',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  {
    id: 's3.t7.peek',
    chapter: 'instructor7',
    turn: 7,
    actor: 'instructor',
    lines: ['Leaving your Life card where it is.'],
    action: { kind: 'resolveChoice', choose: { pick: 'none' } },
  },
  {
    id: 's3.t7.counterEvent',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: [
      'You have the Gum-Gum Jet Gatling the [Trigger] gave you, and it is an EVENT with [Counter].',
      'Counter Events are played from your hand during your opponent’s attack, exactly like a Counter card - but they do far more than +1000.',
    ],
    highlight: 'handZone',
    objective: 'Play Gum-Gum Jet Gatling as a Counter.',
    action: { kind: 'counterEvent', cardNumber: 'OP03-072' },
  },
  {
    id: 's3.t7.counterCost',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: ['Its ability asks for a card from your hand as the price. Give it the spare O-Nami.'],
    highlight: 'handZone',
    objective: 'Trash O-Nami to pay for the Event.',
    action: { kind: 'resolveChoice', choose: { pick: 'cards', cardNumbers: ['ST18-002'] } },
  },
  {
    id: 's3.t7.counterTarget',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: ['Now point the +3000 at your Leader: 5000 becomes 8000, comfortably above 7000.'],
    highlight: 'leaderZone',
    objective: 'Give the +3000 to your Leader.',
    action: { kind: 'resolveChoice', choose: { pick: 'cards', cardNumbers: ['OP05-060'] } },
  },
  {
    id: 's3.t7.pass',
    chapter: 'instructor7',
    turn: 7,
    actor: 'player',
    lines: ['That is more than enough. Pass to resolve it.'],
    objective: 'Pass to resolve the battle.',
    action: { kind: 'passStep' },
  },
  { id: 's3.t7.end', chapter: 'instructor7', turn: 7, actor: 'instructor', lines: ['Turned away. Your turn - and I am on 3 Life.'], action: { kind: 'endMainPhase' } },
  {
    id: 's3.t8.upkeep',
    chapter: 'you8',
    turn: 8,
    actor: 'narration',
    lines: [
      'Everything refreshes. I am on 3 Life, with no [Blocker] left on the field.',
      'You have two keyword beasts and a Leader. That is enough - if you use them in the right order.',
    ],
  },
  {
    id: 's3.t8.banish',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: [
      'Minozebra first, because of [Banish]: the Life card he takes is TRASHED instead of going to my hand.',
      'No card for me, and no [Trigger] either. Against a deck full of Triggers that is the difference between winning and losing.',
    ],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor Leader with Minozebra.',
    action: { kind: 'attack', attacker: own('OP03-068'), target: OPPOSING_LEADER },
  },
  { id: 's3.t8.pass1', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['No answer.'], action: { kind: 'passStep' } },
  {
    id: 's3.t8.banishAfter',
    chapter: 'you8',
    turn: 8,
    actor: 'narration',
    lines: [
      'Look in my trash: that Life card had a [Trigger] on it, and it never got to fire.',
      'Two Life left, and I gained nothing from losing one.',
    ],
    highlight: 'trashZone',
  },
  {
    id: 's3.t8.doubleAttack',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: ['Now Minotaur, and [Double Attack] means this one successful attack takes TWO Life cards.'],
    highlight: 'characterAreaZone',
    objective: 'Attack the Instructor Leader with Minotaur.',
    action: { kind: 'attack', attacker: own('OP02-087'), target: OPPOSING_LEADER },
  },
  { id: 's3.t8.pass2', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['Both of them. I am on zero.'], action: { kind: 'passStep' } },
  {
    id: 's3.t8.finish',
    chapter: 'you8',
    turn: 8,
    actor: 'player',
    lines: ['Zero Life is not a loss on its own. One more successful attack is. Your Leader.'],
    highlight: 'leaderZone',
    objective: 'Attack the Instructor Leader with your Leader.',
    action: { kind: 'attack', attacker: LEADER, target: OPPOSING_LEADER },
  },
  { id: 's3.t8.pass3', chapter: 'you8', turn: 8, actor: 'instructor', lines: ['And that is that.'], action: { kind: 'passStep' } },
  {
    id: 's3.t8.victory',
    chapter: 'you8',
    turn: 8,
    actor: 'narration',
    lines: [
      'Stage cards, [Trigger], [Blocker], [Banish], [Double Attack] and Counter Events - all of it on a real board, all of it decided by the rules.',
      'You now know everything the official beginner scenarios teach. The rest is practice, and deckbuilding. Good sailing.',
    ],
  },
];

export const CARD_EFFECTS_2: TutorialScenarioDef = {
  id: 'cardEffects2',
  title: 'Mastering Card Effects, Part 2',
  blurb: 'The keywords that change how battles and Life cards work — and how to play around them.',
  teaches: ['Stage cards', '[Trigger]', '[Blocker]', '[Banish]', '[Double Attack]', '[Counter] Events'],
  effects: 'curated',
  rngSeed: 'tutorial-card-effects-2',
  decks: { player: EFFECTS2_DECK_PLAYER, instructor: EFFECTS_DECK_INSTRUCTOR },
  openingHand: OPENING_HAND,
  instructorOpeningHand: INSTRUCTOR_OPENING_HAND,
  life: { player: PLAYER_LIFE, instructor: INSTRUCTOR_LIFE },
  draws: { player: DRAWS.player, instructor: DRAWS.instructor },
  chapters: CHAPTERS,
  beats: BEATS,
};
