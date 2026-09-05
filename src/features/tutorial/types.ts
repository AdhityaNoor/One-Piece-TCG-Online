/**
 * Types for the scripted-match Tutorial module.
 *
 * ARCHITECTURE (v2 — the scripted match). The tutorial plays ONE continuous
 * game from Section 5 setup to game over, following the official Teaching
 * App's "Basic Game Flow" scenario beat for beat (see tutorialScript.ts).
 * The previous design built a fresh, fabricated mid-game board per chapter;
 * nothing carried forward and the narration drifted away from the board. A
 * chapter is now just a NAME FOR A TURN — there is one match underneath all
 * of them.
 *
 * This file, and everything else under src/features/tutorial, is a
 * completely separate feature module from the standard game flow
 * (MatchScreen/matchStore) it drives. The rules engine (src/engine) is never
 * imported for anything except its already-public surface (GameState,
 * GameAction, validateAction/executeAction, createPreGameState) — the
 * tutorial NEVER teaches the engine anything about itself. It only observes
 * GameState and constrains which GameActions may be dispatched.
 */
import type { GameActionType } from '../../engine/actions';
import type { TutorialDeckList } from './tutorialDecks';

/**
 * Which of the official Teaching App's scenarios a run is playing.
 * `basicGameFlow` mirrors `basic_battle1`; the two effect scenarios mirror
 * `basic_battle2` / `basic_battle3`.
 */
export type TutorialScenarioId = 'basicGameFlow' | 'cardEffects1' | 'cardEffects2';

/**
 * A chapter id. Chapters are SCENARIO-LOCAL (each scenario names its own
 * turns), so this is a plain string rather than a global union — the
 * "every beat's chapter exists in its scenario" invariant is asserted in
 * tutorialScript.e2e.test.ts instead of by the type system, because a union
 * spanning three scenarios would say a beat from one could live in another.
 */
export type TutorialChapterId = string;

/** One chapter: a name for a turn (or for pre-game setup). */
export interface TutorialChapter {
  id: TutorialChapterId;
  title: string;
  /** Engine turnNumber this chapter covers. 0 = pre-game setup (Section 5). */
  turn: number;
}

/**
 * Anchor ids the spotlight/highlight system can point at. Resolved to a real
 * DOM rect by tutorialAnchors.ts, which queries the board's EXISTING
 * `data-board-zone`/`data-board-player` attributes (already present on
 * PlayerBoardPanel/DockHand/DonStack/TrashPile for other purposes) rather
 * than inventing a parallel tagging system. 'leaderZone' is the one anchor
 * that attribute didn't already exist for — see PlayerBoardPanel.tsx's
 * `leaderGroup` for the one-line addition that added it, matching the
 * existing convention exactly.
 */
export type TutorialAnchorId =
  | 'leaderZone'
  | 'donZone'
  | 'donDeckZone'
  | 'handZone'
  | 'lifeZone'
  | 'characterAreaZone'
  | 'stageZone'
  | 'trashZone'
  | 'deckZone'
  | 'none';

/**
 * Runtime position in the script. `beatIndex` indexes TUTORIAL_SCRIPT;
 * `lineIndex` indexes the current beat's `lines`.
 */
export interface TutorialProgressSnapshot {
  beatIndex: number;
  beatCount: number;
  chapterIndex: number; // 0-based, into TUTORIAL_CHAPTERS
  chapterCount: number;
  chapterTitle: string;
  /** True once the last beat of the script has been passed. */
  isFinished: boolean;
}

/**
 * Which GameActionTypes a beat opens up. Derived from the beat's scripted
 * action by tutorialScriptRunner.ts rather than hand-listed per chapter —
 * the old design listed them by hand and they drifted out of sync with what
 * the chapter actually asked for.
 */
export type TutorialAllowedActions = readonly GameActionType[];

/** Points at a card on the board without needing an instanceId — resolved against live state by tutorialScriptRunner.ts. */
export type TutorialCardRef =
  /** The ACTING player's own Leader. */
  | { kind: 'leader' }
  /** The acting player's OPPONENT's Leader — an attack target, never a Counter target. */
  | { kind: 'opposingLeader' }
  /** The ACTING player's own Character with this printed card number. */
  | { kind: 'ownCharacter'; cardNumber: string }
  /** The acting player's OPPONENT's Character with this printed card number. */
  | { kind: 'opposingCharacter'; cardNumber: string };

/**
 * How a scripted beat answers a PendingChoice (Section 11). Card picks are
 * expressed by PRINTED CARD NUMBER and resolved against the choice's own
 * candidate list, for the same reason every other ref is: instance ids are
 * minted by the engine and cannot be written down in advance.
 */
export type TutorialChoiceResponse =
  | { pick: 'yes' }
  | { pick: 'no' }
  /** Decline an "up to N" choice (only legal when the choice's min is 0). */
  | { pick: 'none' }
  | { pick: 'cards'; cardNumbers: readonly string[] }
  /** Take the first N of whatever the choice offers — for picks between interchangeable cards (DON!!). */
  | { pick: 'firstCandidates'; count: number }
  /**
   * Select the card the choice came FROM. A Life [Trigger] prompt is shaped
   * this way: it lists no candidates and accepts only [] (decline) or the
   * revealed Life card's own id (activate).
   */
  | { pick: 'source' }
  | { pick: 'option'; index: number }
  | { pick: 'number'; value: number };

export type TutorialScriptedAction =
  /** 5-2-1-4. */
  | { kind: 'chooseGoingFirst'; goingFirst: boolean }
  /** 5-2-1-6. */
  | { kind: 'mulligan'; redraw: boolean }
  /** 6-5-3-1. Cost is paid from the actor's active DON!!. */
  | { kind: 'playCharacter'; cardNumber: string }
  /** 6-5-4-1. One Stage per player; playing a second replaces the first. */
  | { kind: 'playStage'; cardNumber: string }
  /** 7-1-1. */
  | { kind: 'attack'; attacker: TutorialCardRef; target: TutorialCardRef }
  /** 7-1-3-2-1. Discards a Counter card from hand onto `boostTarget`. */
  | { kind: 'counterCharacter'; cardNumber: string; boostTarget: TutorialCardRef }
  /** 7-1-3-2-2. Plays a [Counter] Event from hand during the Counter Step. */
  | { kind: 'counterEvent'; cardNumber: string }
  /** 7-1-2-1. Rests a [Blocker] Character to become the target of the attack. */
  | { kind: 'activateBlocker'; cardNumber: string }
  /** 6-5-3-3 / 11-2-1. An [Activate: Main] ability on a Leader, Character or Stage. */
  | { kind: 'activateEffect'; source: TutorialCardRef }
  /**
   * 6-5-5-1. Gives `count` active DON!! to one Leader/Character, one
   * GIVE_DON dispatch each. `minCount` is how many the PLAYER has to give
   * before the beat counts as done — the script hands over all `count` when
   * it auto-plays, but a player should not be made to tap a stepper eight
   * times when two already clear the objective.
   */
  | { kind: 'giveDon'; target: TutorialCardRef; count: number; minCount?: number }
  /** 7-1-2 / 7-1-3 decline. */
  | { kind: 'passStep' }
  /** 6-5-2-1. */
  | { kind: 'endMainPhase' }
  /** Section 11. Answers the choice the previous beat's effect raised. */
  | { kind: 'resolveChoice'; choose: TutorialChoiceResponse };

export interface TutorialBeat {
  id: string;
  chapter: TutorialChapterId;
  /** Engine turnNumber this beat belongs to. 0 = pre-game setup (Section 5). */
  turn: number;
  actor: 'narration' | 'player' | 'instructor';
  /** Instructor dialogue for this beat — at most three short sentences. */
  lines: string[];
  /** Where the spotlight points while this beat is on screen. */
  highlight?: TutorialAnchorId;
  /** Shown in the objective banner. Required whenever actor is 'player' and an action is set. */
  objective?: string;
  action?: TutorialScriptedAction;
}

/**
 * One slot in a deck-stacking plan. A card number pins that depth to that
 * card; `null` means "leave whatever the shuffle put next here".
 */
export type DeckStackSlot = string | null;

/**
 * Everything that makes one scenario: the two decks, what the engine must
 * deal, and the beats that play it out. This is the seam that let the
 * tutorial grow from the official app's first scenario to all three without
 * the orchestration in TutorialManager knowing anything about content.
 */
export interface TutorialScenarioDef {
  id: TutorialScenarioId;
  /** Shown on the picker card and in the sidebar header. */
  title: string;
  /** One line on the picker card: what this scenario teaches. */
  blurb: string;
  /** The mechanics it introduces, listed on the picker card. */
  teaches: readonly string[];
  /**
   * 'off' seeds an EMPTY effect registry, so no ability fires — what the
   * official `basic_battle1` does, and what makes it perfectly
   * deterministic. 'curated' seeds the real curated registry, which is the
   * entire point of the two effect scenarios.
   */
  effects: 'off' | 'curated';
  /** Distinct per scenario so each one shuffles its own way. */
  rngSeed: string;
  decks: { player: TutorialDeckList; instructor: TutorialDeckList };
  /** Deck depths [0..4]: the studying player's opening five, in deal order. */
  openingHand: readonly string[];
  /** Deck depths [0..4] for the Instructor; `null` leaves a slot to the shuffle. */
  instructorOpeningHand: readonly DeckStackSlot[];
  /** Deck depths [5..9]: the Life cards. Pinned only when a lesson needs a known [Trigger] there. */
  life: { player: readonly DeckStackSlot[]; instructor: readonly DeckStackSlot[] };
  /** Deck depths [10..]: one card per Draw Phase, in turn order. */
  draws: { player: readonly DeckStackSlot[]; instructor: readonly DeckStackSlot[] };
  chapters: readonly TutorialChapter[];
  beats: readonly TutorialBeat[];
}
