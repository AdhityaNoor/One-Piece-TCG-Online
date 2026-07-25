/**
 * Data-driven Tutorial module types (project rule: "store every tutorial
 * step as configuration rather than hardcoded logic" — see tutorialSteps.ts).
 *
 * This file, and everything else under src/features/tutorial, is a
 * completely separate feature module from the standard game flow
 * (MatchScreen/matchStore) it drives. Per the architecture note in
 * tutorialSteps.ts: the rules engine (src/engine) is never imported for
 * anything except its already-public surface (GameState, GameAction,
 * validateAction/executeAction, createPreGameState) — the tutorial NEVER
 * teaches the engine anything about itself. It only observes GameState and
 * constrains which GameActions may be dispatched.
 */
import type { GameActionType } from '../../engine/actions';
import type { GameState } from '../../engine/state/game';

/**
 * Stable ids for the chapters, in teaching order. The original fixed
 * 12-chapter gameplay list is preceded by two pure-introduction chapters
 * ('cardBasics' before the board tour, 'basicRules' right after it) so the
 * tutorial opens with: card introduction → board introduction → basic rules
 * introduction, before any interactive gameplay teaching begins.
 */
export type TutorialChapterId =
  | 'cardBasics'
  | 'battlefieldOverview'
  | 'basicRules'
  | 'drawingCards'
  | 'donCards'
  | 'leaderAttacks'
  | 'lifeCards'
  | 'playingCharacters'
  | 'characterAttacks'
  | 'counterStep'
  | 'blockers'
  | 'events'
  | 'triggers'
  | 'winningTheGame';

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
  | 'trashZone'
  | 'deckZone'
  | 'none';

/**
 * What must become true in the live GameState for a chapter to be considered
 * complete. Kept as plain data (evaluated by TutorialStateMachine.ts) rather
 * than a callback, so step configs stay JSON-serializable/inspectable like
 * every other piece of state in this project.
 */
export type TutorialCompletionCondition =
  /** No live objective — the chapter is narration; "Next" is the only way forward. */
  | { kind: 'manualAdvance' }
  /** True once the studying player's Leader has at least this many DON!! attached. */
  | { kind: 'leaderDonAttachedAtLeast'; count: number }
  /** True once the OPPONENT has at most this many Life cards — a successful Leader hit landed (7-1-4). */
  | { kind: 'opponentLifeAtMost'; count: number }
  /** True once the studying player has at least this many Characters in their Character area. */
  | { kind: 'playerCharactersAtLeast'; count: number }
  /** True once the opponent has at most this many Characters left — an attack K.O.'d one (7-1-4-1-2). */
  | { kind: 'opponentCharactersAtMost'; count: number }
  /**
   * Defense chapters (Counter Step / Blockers): the scripted scenario STARTS
   * mid-battle with the Instructor attacking, so this reads complete only
   * once that battle has fully resolved (currentBattle back to null) AND the
   * studying player still has at least `count` Life cards — i.e. the attack
   * was successfully repelled rather than passed through.
   */
  | { kind: 'attackRepelledKeepingLife'; count: number }
  /** True once the game is over with the studying player as the winner (1-2-1-1 / 9-2-1). */
  | { kind: 'gameWon' }
  /**
   * Not yet wired to a live GameState check — chapters 4-12 this milestone.
   * Kept as its own explicit variant (rather than silently reusing
   * 'manualAdvance') so it's grep-able and renders its own "needs engine
   * hookup" affordance in TutorialControls instead of pretending to be a
   * finished interactive step. See docs note in tutorialSteps.ts.
   */
  | { kind: 'needsEngineHookup' };

/**
 * Which intro-panel content set a pure-introduction chapter shows — resolved
 * to actual slide data by tutorialIntroContent.ts. Kept as a string tag (not
 * embedded slide objects) so TutorialStepConfig stays a small, readable
 * config row and the two content sets remain independently testable data.
 */
export type TutorialIntroPanelKind = 'cardAnatomy' | 'basicRules';

/** One instructor line. Kept short per project spec ("no more than three short sentences"). */
export interface TutorialDialogueLine {
  speaker: 'instructor';
  text: string;
}

export interface TutorialStepConfig {
  id: TutorialChapterId;
  /** 1-based position in the chapter list (intro chapters first, then the fixed gameplay list). */
  order: number;
  title: string;
  /** Shown in the objective banner, e.g. "Attach one DON!! to your Leader." */
  objective: string;
  /** Instructor dialogue, played in order, before the objective becomes interactive. */
  dialogue: TutorialDialogueLine[];
  /** Line shown once completionCondition is satisfied, before advancing. */
  successLine: string;
  /**
   * Default/objective-phase spotlight target — where the OBJECTIVE lives
   * once dialogue finishes (e.g. for an interactive chapter, this is
   * wherever the actual dispatchable control is, NOT wherever looks most
   * relevant thematically — see donCards' 'leaderZone': the Give-DON control
   * is a hover affordance on the Leader card itself, not on the DON!! pile,
   * so THAT'S what must stay reachable through the spotlight).
   */
  highlight: TutorialAnchorId;
  /**
   * Optional per-dialogue-line highlight sequence for pure-narration "tour"
   * chapters (e.g. Battlefield Overview) — lets the spotlight actually move
   * as the Instructor's dialogue advances instead of pinning one zone for
   * every line while the rest of the board stays dark the whole time.
   * `dialogueHighlights[lineIndex] ?? highlight` is TutorialManager's
   * resolution order. Omitted for every other chapter (single static
   * target is correct once there's a real objective to reach).
   */
  dialogueHighlights?: TutorialAnchorId[];
  /**
   * When set, TutorialManager renders a TutorialIntroPanel (a centered
   * teaching card ABOVE the dimmed board) for this chapter instead of a
   * board spotlight — used by the pure-introduction chapters (card
   * introduction, basic rules introduction) whose subject matter isn't a
   * board zone at all. The panel's slide content lives in
   * tutorialIntroContent.ts (data, not JSX), keyed by this kind — same
   * config-not-code rule as everything else in this file.
   */
  introPanel?: TutorialIntroPanelKind;
  /**
   * Optional per-dialogue-line slide index into the intro panel's slide
   * list — the exact same pattern as dialogueHighlights above, but for
   * intro-panel chapters: as the Instructor's dialogue advances, the panel
   * flips to the slide the current line is narrating.
   * `dialogueSlides[lineIndex] ?? last slide` is the resolution order.
   * Only meaningful when introPanel is set.
   */
  dialogueSlides?: number[];
  /**
   * Every other action type is blocked by TutorialActionValidator while this
   * chapter is active — see that module's doc comment. Empty array = pure
   * observation (nothing is dispatchable; only Next/Skip/Exit are live).
   */
  allowedActions: GameActionType[];
  /**
   * When true, the click-blocking spotlight overlay stands down once the
   * chapter's dialogue is finished — the glow ring stays on `highlight` as a
   * hint, but the WHOLE board becomes clickable. Needed by every objective
   * that spans multiple zones (declare attack = your card + the opponent's
   * target; play a Character = hand + cost area + character area): a single
   * rectangular cutout physically cannot cover that flow, and clipping the
   * one control the objective needs makes the chapter impossible — the
   * lesson of donCards' highlight comment above, generalized. Safety doesn't
   * regress: `allowedActions` still gates every dispatch at the guard.
   */
  freeInteraction?: boolean;
  completionCondition: TutorialCompletionCondition;
  /**
   * True for the 3 chapters wired to the real engine this milestone
   * (Battlefield Overview, Drawing Cards, DON!! Cards). False chapters render
   * their drafted title/dialogue/objective text but do not build a live
   * scenario or gate real actions — see TutorialManager's "needs engine
   * hookup" banner. Tracked here (not derived from completionCondition
   * alone) so it's a single, obvious source of truth for what's real vs.
   * drafted content.
   */
  isEngineWired: boolean;
}

/** Pure function contract used by TutorialStateMachine.ts — kept here so both the machine and its tests import the same shape. */
export interface TutorialProgressSnapshot {
  chapterIndex: number; // 0-based
  chapterCount: number;
  step: TutorialStepConfig;
  isComplete: boolean;
  isLastChapter: boolean;
}

export type TutorialCompletionEvaluator = (state: GameState, studyingPlayerId: string, condition: TutorialCompletionCondition) => boolean;
