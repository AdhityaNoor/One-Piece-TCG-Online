/**
 * Data-driven Tutorial chapter list (project rule: "store every tutorial
 * step as configuration rather than hardcoded logic").
 *
 * Architecture note (see types.ts doc comment too): the rules engine stays
 * completely generic. Nothing here — or anywhere in src/features/tutorial —
 * teaches src/engine anything about "being in a tutorial". The engine only
 * ever sees the same GameState/GameAction shapes it always has; this module
 * is a pure CONSUMER that (a) builds an ordinary, legal GameState via the
 * engine's own public setup functions (see tutorialScenario.ts) and (b)
 * filters which GameActions reach validateAction/executeAction at all (see
 * TutorialActionValidator.ts). Adding chapter 13 tomorrow means editing this
 * array, never src/engine.
 *
 * Chapter list shape: the tutorial OPENS with three introduction chapters —
 * card introduction ('cardBasics'), board introduction
 * ('battlefieldOverview'), and basic-rules introduction ('basicRules') —
 * before any interactive gameplay chapter. The two new intro chapters are
 * pure narration over a TutorialIntroPanel (slide data in
 * tutorialIntroContent.ts, presentation in TutorialIntroPanel.tsx) with
 * `dialogueSlides` flipping the panel's slide per dialogue line, exactly
 * the way `dialogueHighlights` already moves the spotlight per line.
 *
 * Milestone status: every chapter EXCEPT Events and Triggers is fully wired
 * to the live engine — `completionCondition` is checked against real
 * GameState, `allowedActions` really gates real GameAction dispatch, and
 * tutorialScenario.ts scripts a predefined board (fixed ST01/ST04 decks,
 * scripted Characters/hands/DON!!, and mid-battle states for the defense
 * chapters). Events stays content-only because the ST01 list runs no [Main]
 * Event to teach with; Triggers because the [Trigger] flow needs the effect
 * runtime. Both keep `completionCondition: { kind: 'needsEngineHookup' }` +
 * `isEngineWired: false` — the project's own "mark as TODO / needs ruling
 * confirmation" convention applied to tutorial content instead of rules
 * content.
 *
 * Known engine-truth constraint that shaped chapters 1 & 2: there is no
 * player-dispatchable "draw a card" GameAction — the Draw Phase (6-3) is
 * fully automatic (see rules/phases/advanceAutomaticPhases.ts, run
 * unconditionally after every dispatch). So "Drawing Cards" is narrated
 * (manualAdvance) rather than gated on a live action, same as "Battlefield
 * Overview" — both are true to how the actual rules engine works rather than
 * inventing a fake action the real game doesn't have.
 */
import type { TutorialStepConfig } from './types';

const instructor = (text: string) => ({ speaker: 'instructor' as const, text });

export const TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    id: 'cardBasics',
    order: 1,
    title: 'Card Introduction',
    objective: 'Learn how to read a card.',
    dialogue: [
      instructor("Welcome aboard! Before we set sail, let's learn to read a card — every card shares the same printed layout."),
      instructor("There are five kinds of cards. Your Leader anchors your crew; everything else supports it."),
      instructor("Don't worry about memorizing — every card explains itself. Tap Next when you're ready."),
    ],
    successLine: '✓ Great! You can read any card that comes your way.',
    // Pure-introduction chapter: the subject is a card, not a board zone,
    // so the spotlight stays 'none' (plain dim) and a TutorialIntroPanel
    // (slide data: tutorialIntroContent.ts) does the teaching instead.
    highlight: 'none',
    introPanel: 'cardAnatomy',
    // Line 0 narrates the anatomy slide, lines 1-2 the categories slide.
    dialogueSlides: [0, 1, 1],
    allowedActions: [],
    completionCondition: { kind: 'manualAdvance' },
    isEngineWired: true,
  },
  {
    id: 'battlefieldOverview',
    order: 2,
    title: 'Battlefield Overview',
    objective: 'Take a look around your battlefield.',
    dialogue: [
      instructor("This is your battlefield — everything you need for a match is laid out right here."),
      instructor('Your Leader sits front and center. It leads every fight and holds your Life total.'),
      instructor('The Character area in front of your Leader is where the crew you play will stand.'),
      instructor('Your hand is the row of cards docked at the bottom of the screen.'),
      instructor('Your cost area holds the DON!! you pay costs with — it refills every turn from the DON!! deck.'),
      instructor('These face-down cards are your Life — they shield your Leader from defeat.'),
      instructor('Your deck sits beside the board, with the trash next to it for used cards.'),
      instructor("Tap Next whenever you're ready to continue."),
    ],
    successLine: '✓ Great! You know your way around the board.',
    highlight: 'leaderZone',
    // Tour: the spotlight moves with each dialogue line instead of pinning
    // one zone for the whole chapter — see types.ts's doc comment. The last
    // line ("Tap Next whenever...") has no particular zone, so it falls back
    // to 'none' (a plain dim, no cutout) rather than lingering on the deck.
    dialogueHighlights: ['none', 'leaderZone', 'characterAreaZone', 'handZone', 'donZone', 'lifeZone', 'deckZone', 'none'],
    allowedActions: [],
    completionCondition: { kind: 'manualAdvance' },
    isEngineWired: true,
  },
  {
    id: 'basicRules',
    order: 3,
    title: 'Basic Rules',
    objective: 'Learn how a game is won.',
    dialogue: [
      instructor('Now for the rules of the sea. You win by breaking through your opponent’s Life — and you lose if yours runs out first.'),
      instructor('Every turn runs through the same five phases. Only the Main Phase asks you to make decisions.'),
      instructor('Battles decide everything. Here’s the shape of an attack — we’ll practice each step in the coming chapters.'),
    ],
    successLine: '✓ Perfect! You know the rules — time to put them into practice.',
    // Same pure-introduction treatment as cardBasics: no board zone to
    // spotlight; the TutorialIntroPanel carries the content, one slide per
    // dialogue line (win/lose → turn phases → battle outline).
    highlight: 'none',
    introPanel: 'basicRules',
    dialogueSlides: [0, 1, 2],
    allowedActions: [],
    completionCondition: { kind: 'manualAdvance' },
    isEngineWired: true,
  },
  {
    id: 'drawingCards',
    order: 4,
    title: 'Drawing Cards',
    objective: 'Watch your Draw Phase add a card to your hand.',
    dialogue: [
      instructor('Every turn opens with a Refresh Phase, then a Draw Phase — you draw 1 card automatically.'),
      instructor("You don't need to do anything here; the engine handles the draw for you."),
      instructor('Your hand is the row of cards docked at the bottom of the screen.'),
    ],
    successLine: '✓ Nicely spotted — your hand just grew by one.',
    highlight: 'handZone',
    allowedActions: [],
    completionCondition: { kind: 'manualAdvance' },
    isEngineWired: true,
  },
  {
    id: 'donCards',
    order: 5,
    title: 'DON!! Cards',
    objective: 'Attach one DON!! to your Leader.',
    dialogue: [
      instructor('DON!! cards are your resource for playing Characters and boosting power.'),
      instructor('Give an active DON!! to your Leader to grant it +1000 power for the turn.'),
      instructor('Tap (or hover, on desktop) your Leader — a Give DON!! control will appear on the card. Use it to attach one.'),
    ],
    successLine: '✓ Great! Your Leader is now stronger for this turn.',
    // NOT 'donZone': the actual Give-DON control is a hover/tap affordance
    // that appears ON the Leader card itself (BoardCardTile's giveDonControls
    // stepper, wired in PlayerBoardPanel.tsx) — it auto-picks an available
    // active DON!! from the cost area, so the player never taps the DON!!
    // pile directly. Spotlighting 'donZone' here left the one clickable
    // control (the Leader) OUTSIDE the cutout, making the objective
    // impossible to complete. See dialogue below, which was updated to match.
    highlight: 'leaderZone',
    allowedActions: ['GIVE_DON'],
    completionCondition: { kind: 'leaderDonAttachedAtLeast', count: 1 },
    isEngineWired: true,
  },
  {
    id: 'leaderAttacks',
    order: 6,
    title: 'Leader Attacks',
    objective: "Attack the Instructor's Leader with your Leader.",
    dialogue: [
      instructor('From turn 3 onward, your Leader can attack — declaring an attack rests it for the turn.'),
      instructor("Select your Leader, then choose the Instructor's Leader as the target."),
      instructor('A successful hit knocks one of their Life cards away. Go for it!'),
    ],
    successLine: "✓ Excellent! Your attack connected — the Instructor lost a Life card.",
    highlight: 'leaderZone',
    freeInteraction: true, // attack flow spans your Leader AND the opponent's target — see types.ts
    allowedActions: ['DECLARE_ATTACK'],
    completionCondition: { kind: 'opponentLifeAtMost', count: 4 },
    isEngineWired: true,
  },
  {
    id: 'lifeCards',
    order: 7,
    title: 'Life Cards',
    objective: 'See how Life cards protect your Leader.',
    dialogue: [
      instructor("Your Leader's Life total starts as a face-down stack of Life cards — these are yours."),
      instructor('Each hit sends the top Life card to its owner\'s hand — damage actually grows your options.'),
      instructor('Lose them all, though, and the very next hit ends the game. Guard them well.'),
    ],
    successLine: '✓ Good — you understand how Life protects your Leader.',
    highlight: 'lifeZone',
    allowedActions: [],
    completionCondition: { kind: 'manualAdvance' },
    isEngineWired: true,
  },
  {
    id: 'playingCharacters',
    order: 8,
    title: 'Playing Characters',
    objective: 'Play a Character card from your hand.',
    dialogue: [
      instructor('Characters are played from your hand during your Main Phase by resting DON!! equal to their cost.'),
      instructor('Your hand holds Sanji (cost 2) and Zoro (cost 3) — you have 4 active DON!!, so either works.'),
      instructor('Pick one from your hand and play it to your Character area.'),
    ],
    successLine: '✓ Nicely done — your first Character is on the field.',
    highlight: 'handZone',
    freeInteraction: true, // playing spans hand + cost area + character area
    allowedActions: ['PLAY_CHARACTER'],
    completionCondition: { kind: 'playerCharactersAtLeast', count: 1 },
    isEngineWired: true,
  },
  {
    id: 'characterAttacks',
    order: 9,
    title: 'Character Attacks',
    objective: "K.O. the Instructor's rested Black Maria with your Zoro.",
    dialogue: [
      instructor('Characters can attack too, from the turn after they were played.'),
      instructor("They may target the opponent's Leader or any of their RESTED Characters — like that Black Maria."),
      instructor('Your Zoro has 5000 power to her 2000. If your power matches or beats a Character, it\'s K.O.\'d — attack!'),
    ],
    successLine: '✓ Great strike! Black Maria is K.O.\'d and off to the trash.',
    highlight: 'characterAreaZone',
    freeInteraction: true, // attack flow spans your Character AND the opponent's rested target
    allowedActions: ['DECLARE_ATTACK'],
    completionCondition: { kind: 'opponentCharactersAtMost', count: 0 },
    isEngineWired: true,
  },
  {
    id: 'counterStep',
    order: 10,
    title: 'Counter Step',
    objective: "Repel Kaido's attack with a Counter, then end the Counter Step.",
    dialogue: [
      instructor("Incoming! Kaido (5000) is attacking your Leader (5000) — a tie still lands, so do something!"),
      instructor('During the Counter Step, discard a card with a Counter value from your hand to boost your Leader.'),
      instructor('Nami gives +1000 — that\'s enough. Counter, then pass to resolve the battle.'),
    ],
    successLine: "✓ Well defended! Kaido's attack broke against your Counter.",
    highlight: 'handZone',
    freeInteraction: true, // countering spans hand + the boosted Leader + the pass control
    allowedActions: ['ACTIVATE_COUNTER_CHARACTER', 'ACTIVATE_COUNTER_EVENT', 'PASS_STEP'],
    completionCondition: { kind: 'attackRepelledKeepingLife', count: 5 },
    isEngineWired: true,
  },
  {
    id: 'blockers',
    order: 11,
    title: 'Blockers',
    objective: "Block Kaido's attack with Chopper, then resolve the battle.",
    dialogue: [
      instructor('Kaido is attacking your Leader again — but this time Chopper has [Blocker]!'),
      instructor('Activate a Blocker during the Block Step to make it the new target of the attack.'),
      instructor('Chopper may not survive Kaido\'s 5000, but your Life stays safe. Block, then pass through the Counter Step.'),
    ],
    successLine: '✓ Nice block! Chopper took the hit so your Life didn\'t have to.',
    highlight: 'characterAreaZone',
    freeInteraction: true, // blocking spans your Blocker + the battle controls
    allowedActions: ['ACTIVATE_BLOCKER', 'ACTIVATE_COUNTER_CHARACTER', 'ACTIVATE_COUNTER_EVENT', 'PASS_STEP'],
    completionCondition: { kind: 'attackRepelledKeepingLife', count: 5 },
    isEngineWired: true,
  },
  {
    id: 'events',
    order: 12,
    title: 'Events',
    objective: 'Play an Event card from your hand.',
    dialogue: [
      instructor('Event cards create a one-time effect, then go straight to the trash.'),
      instructor('Some Events can only be played as a Counter — watch for the [Counter] tag.'),
      instructor("This chapter's live scenario is still being wired up — check back soon!"),
    ],
    successLine: '✓ Effect resolved!',
    highlight: 'handZone',
    allowedActions: ['ACTIVATE_EVENT_MAIN'],
    completionCondition: { kind: 'needsEngineHookup' },
    isEngineWired: false,
  },
  {
    id: 'triggers',
    order: 13,
    title: 'Triggers',
    objective: 'Reveal a Life card and resolve its [Trigger].',
    dialogue: [
      instructor('Some Life cards carry a [Trigger] ability you may activate the instant they\'re revealed.'),
      instructor("It's entirely optional — you can also just add the card to your hand."),
      instructor("This chapter's live scenario is still being wired up — check back soon!"),
    ],
    successLine: '✓ Trigger resolved!',
    highlight: 'lifeZone',
    allowedActions: ['RESOLVE_PENDING_CHOICE'],
    completionCondition: { kind: 'needsEngineHookup' },
    isEngineWired: false,
  },
  {
    id: 'winningTheGame',
    order: 14,
    title: 'Winning the Game',
    objective: "Deal the final blow to the Instructor's Leader.",
    dialogue: [
      instructor('A player loses the moment they take damage with no Life cards left.'),
      instructor('Look — the Instructor is out of Life. One clean hit on their Leader ends it.'),
      instructor("That's the whole loop: attack, defend, and manage your resources better than your opponent. Finish it!"),
    ],
    successLine: '✓ Victory! You\'ve completed the tutorial.',
    highlight: 'leaderZone',
    freeInteraction: true, // final attack spans both Leaders
    allowedActions: ['DECLARE_ATTACK'],
    completionCondition: { kind: 'gameWon' },
    isEngineWired: true,
  },
];

export function getTutorialStep(id: string): TutorialStepConfig | undefined {
  return TUTORIAL_STEPS.find((step) => step.id === id);
}

export function getTutorialStepByIndex(index: number): TutorialStepConfig | undefined {
  return TUTORIAL_STEPS[index];
}
