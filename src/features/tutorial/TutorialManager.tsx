/**
 * Top-level Tutorial orchestrator — this IS the 'tutorial' NavigationTarget's
 * screen component (see App.tsx).
 *
 * ONE MATCH, MANY BEATS. It builds the scripted match ONCE
 * (tutorialScenario.ts), hands it to matchStore exactly the way
 * startMatch()/hydrateOnlineMatch() already do, and then walks
 * tutorialScript.ts's beat list against that single, continuous GameState:
 *
 *   narration  -> show the lines, wait for Next
 *   instructor -> dispatch the beat's actions after a beat of reading time
 *   player     -> show the objective, gate dispatch to the scripted action,
 *                 and advance once the board says it was done
 *
 * It never mutates GameState directly; every board change comes from the
 * real engine executing a real GameAction. See TutorialOverlay.tsx for how
 * "everything except the current objective is disabled" is achieved without
 * touching a single line of board-component code.
 *
 * EFFECTS ARE OFF. The store is seeded with an EMPTY effect registry, so no
 * [On Play]/[Trigger] ability fires during the tutorial. That mirrors the
 * official scenario, which prints the same caveat on screen, and it is what
 * makes the match deterministic enough to script. See tutorialScript.ts.
 *
 * Known limitation (see project doc "Document every known limitation"):
 * MatchScreen's own header chrome (settings/quit/bug-report/chat) is still
 * present underneath the tutorial overlay, since this deliberately renders
 * the real, untouched MatchScreen rather than a fork of it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MatchScreen } from '../../app/screens';
import { useMatchStore, createActionId, PLAYER_A_ID, PLAYER_B_ID, type MatchDispatchResult } from '../../app/store/matchStore';
import { executeAction, validateAction, type GameAction } from '../../engine/actions';
import type { CardDefinition } from '../../engine/state/card';
import { isActionAllowed } from './TutorialActionValidator';
import { firstBeatIndexOfChapter, getTutorialScenario } from './scenarios';
import type { TutorialScenarioId } from './types';
import { actingPlayerId, beatSatisfied, resolveBeatActions } from './tutorialScriptRunner';
import { buildTutorialScenario } from './tutorialScenario';
import { useTutorialPersistenceStore } from './TutorialPersistence';

import { TutorialLoadingScreen } from './TutorialLoadingScreen';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialSidebar, TUTORIAL_SIDEBAR_WIDTH, TUTORIAL_SIDEBAR_COLLAPSED_WIDTH } from './TutorialSidebar';

import { EMPTY_BEAT_PROGRESS, noteProgress as writeProgress, progressFor as readProgress, type BeatProgress } from './tutorialBeatProgress';
import { playTutorialCue } from './sound';

/** What the board actually looks like right now — appended to every failure so a stuck step is diagnosable from the screenshot alone. */
function describeBoard(state: { turnNumber: number; activePlayerId: string; players: Record<string, { costArea: { cardIds: string[] } }>; cardsById: Record<string, { donRested?: boolean }> } | null): string {
  if (!state) return 'board: not built yet';
  const activeDon = (playerId: string) =>
    (state.players[playerId]?.costArea.cardIds ?? []).filter((id) => state.cardsById[id]?.donRested === false).length;
  const whose = state.activePlayerId === PLAYER_A_ID ? 'your' : "the Instructor's";
  return `board: turn ${state.turnNumber}, ${whose} turn; active DON!! you ${activeDon(PLAYER_A_ID)}, Instructor ${activeDon(PLAYER_B_ID)}`;
}

/** Plain-English name for a beat's scripted action, for error copy. */
function describeAction(beat: { action?: { kind: string } | undefined }): string {
  switch (beat.action?.kind) {
    case 'attack':
      return 'declare that attack';
    case 'playCharacter':
      return 'play that Character';
    case 'giveDon':
      return 'give those DON!!';
    case 'counterCharacter':
      return 'play that Counter';
    case 'passStep':
      return 'pass';
    case 'endMainPhase':
      return 'end the turn';
    default:
      return 'take that step';
  }
}

/** How long the Instructor's line stays on screen before their action fires. */
const INSTRUCTOR_BEAT_MS = 1100;
/** Pause after the player completes an objective, before moving on. */
const PLAYER_ADVANCE_MS = 700;

export function TutorialManager({ scenarioId, onLeaveScenario }: { scenarioId: TutorialScenarioId; onLeaveScenario: () => void }) {
  const scenarioDef = useMemo(() => getTutorialScenario(scenarioId), [scenarioId]);
  const SCRIPT = scenarioDef.beats;
  const CHAPTERS = scenarioDef.chapters;
  const markScenarioCompleted = useTutorialPersistenceStore((state) => state.markScenarioCompleted);

  const [beatIndex, setBeatIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  /** A scripted step the engine refused. Non-fatal: the board stays up so the player can Restart the chapter. */
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  /** Bumped to force a rebuild; `jumpTarget` says which beat to fast-forward to. */
  const [rebuild, setRebuild] = useState({ nonce: 0, jumpTarget: 0 });
  useEffect(() => {
    setRebuild({ nonce: 0, jumpTarget: 0 });
    setBeatIndex(0);
  }, [scenarioId]);

  const gameState = useMatchStore((state) => state.state);
  const defs = useMatchStore((state) => state.defs);

  const beat = SCRIPT[Math.min(beatIndex, SCRIPT.length - 1)];
  const isFinished = beatIndex >= SCRIPT.length - 1 && lineIndex >= beat.lines.length - 1;

  /**
   * Progress on the CURRENT beat, tagged with which beat it belongs to.
   *
   * This used to be a bare counter reset by an effect keyed on beatIndex — and
   * effects run AFTER the render that already advanced the beat. When the beat
   * being left had a single line, `setLineIndex(0)` was a no-op, so no second
   * render happened, and the incoming beat was evaluated against the OUTGOING
   * beat's dispatch count: it read as already satisfied and auto-advanced
   * without the player doing anything. That is how "play the Stage" silently
   * ate "end your turn", leaving the board a full turn behind the script.
   *
   * Tagging the count with the beat id makes that impossible to express: a
   * count only ever applies to the beat that earned it.
   */
  const beatProgress = useRef<BeatProgress>(EMPTY_BEAT_PROGRESS);
  const progressFor = (beatId: string) => readProgress(beatProgress.current, beatId);
  const noteProgress = (beatId: string, patch: { dispatches?: number; sawPrompt?: boolean }) => {
    beatProgress.current = writeProgress(beatProgress.current, beatId, patch);
  };


  useEffect(() => {
    setLineIndex(0);
    setScriptError(null);
  }, [beatIndex]);

  // ── Build (or rebuild-and-fast-forward) the one match ────────────────────
  //
  // Jumping back a chapter replays the script from the start rather than
  // trying to undo the engine: the match is fully deterministic (fixed seed,
  // stacked decks, scripted actions), so replaying the first N beats lands on
  // exactly the board that chapter began with. That is also why Restart
  // Chapter is trivial here, where the old per-chapter builder needed a
  // bespoke fabricated board for every entry point.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setBlockedReason(null);
    setScriptError(null);

    buildTutorialScenario(scenarioDef)
      .then((scenario) => {
        if (cancelled) return;
        let state = scenario.state;
        for (let i = 0; i < rebuild.jumpTarget; i += 1) {
          const past = SCRIPT[i];
          const actor = actingPlayerId(past, scenario.studyingPlayerId, scenario.opponentPlayerId);
          if (!actor || !past.action) continue;
          for (const action of resolveBeatActions(state, scenario.defs, past, actor, { newActionId: createActionId })) {
            // Same registry as live play — replaying an effects scenario
            // without it silently rebuilds a DIFFERENT board than the one the
            // player would have reached by playing the chapter.
            state = executeAction(state, action, scenario.defs, scenario.registry).state;
          }
        }

        useMatchStore.setState({
          state,
          defs: scenario.defs,
          // 'off' scenarios get {}; the effect scenarios get the real curated
          // registry. See tutorialScenario.ts.
          registry: scenario.registry,
          v2EffectRuntime: null,
          v2EffectSidecars: null,
          cardImagesByDefinitionId: scenario.images,
          startedWithDeckIds: { a: 'tutorial', b: 'tutorial', presentationKey: `tutorial-${rebuild.nonce}` },
          startError: null,
          localPlayerId: scenario.studyingPlayerId,
          playerNames: { [scenario.studyingPlayerId]: 'You', [scenario.opponentPlayerId]: 'Instructor' },
          cpuPlayerIds: [],
          cpuDifficulty: 'normal',
          cpuDebug: false,
          playTestMode: false,
          onlineMode: false,
          onlineSendIntent: null,
        });
        beatProgress.current = EMPTY_BEAT_PROGRESS;
        setBeatIndex(rebuild.jumpTarget);
        setLineIndex(0);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : String(error));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rebuild, scenarioDef]);

  // ── Dispatch guard ───────────────────────────────────────────────────────
  // Installed ONCE for the tutorial scene's whole lifetime, restored on
  // unmount — reads the live beat through a ref so it always gates against
  // the current one without reinstalling (which would risk a brief window
  // with no guard at all).
  const gateRef = useRef({ beat, state: gameState, defs });
  gateRef.current = { beat, state: gameState, defs };
  const originalDispatchRef = useRef<((action: GameAction) => MatchDispatchResult) | null>(null);

  useEffect(() => {
    const originalDispatch = useMatchStore.getState().dispatch;
    originalDispatchRef.current = originalDispatch;
    const guardedDispatch = (action: GameAction) => {
      const { beat: liveBeat, state, defs: liveDefs } = gateRef.current;
      const decision = isActionAllowed({ beat: liveBeat, state, defs: liveDefs, studyingPlayerId: PLAYER_A_ID }, action);
      if (!decision.allowed) {
        setBlockedReason(decision.reason ?? null);
        window.setTimeout(() => setBlockedReason(null), 2200);
        return { ok: false as const, reasons: decision.reason ? [decision.reason] : ['Not part of this step.'] };
      }
      const result = originalDispatch(action);
      // Only the beat's OWN action counts as progress — see
      // TutorialActionValidator's `satisfiesBeat`.
      if (result.ok && decision.satisfiesBeat) {
        noteProgress(liveBeat.id, { dispatches: progressFor(liveBeat.id).dispatches + 1 });
        playTutorialCue('confirm');
      }
      return result;
    };
    useMatchStore.setState({ dispatch: guardedDispatch });
    return () => {
      originalDispatchRef.current = null;
      useMatchStore.setState({ dispatch: originalDispatch });
    };
  }, []);

  const advanceBeat = useCallback(() => {
    setBeatIndex((index) => Math.min(index + 1, SCRIPT.length - 1));
  }, []);

  const dialogueDone = lineIndex >= beat.lines.length - 1;

  // ── The Instructor takes their scripted turn ─────────────────────────────
  useEffect(() => {
    if (loading || !gameState || !dialogueDone) return;
    if (beat.actor !== 'instructor' || !beat.action) return;
    const timer = window.setTimeout(() => {
      const live = useMatchStore.getState().state;
      const liveDefs = useMatchStore.getState().defs;
      if (!live) return;
      let actions: GameAction[] = [];
      try {
        actions = resolveBeatActions(live, liveDefs as Record<string, CardDefinition>, beat, PLAYER_B_ID, { newActionId: createActionId });
      } catch (error) {
        // NOT setLoadError: that swaps the whole scene for the loading card,
        // which throws away the board, the Restart button and every clue about
        // what went wrong. A step that cannot run is a script problem, and it
        // belongs in the sidebar next to the board that disagrees with it.
        setScriptError(`${error instanceof Error ? error.message : String(error)} (${describeBoard(live)})`);
        return;
      }
      for (const action of actions) {
        // The Instructor's moves are rule-mandated script, not player input,
        // so they go through the UNGUARDED dispatch — the guard exists only
        // to constrain the studying player.
        const result = originalDispatchRef.current?.(action);
        // ...but "unguarded" is not "unchecked". This used to advance the
        // beat unconditionally, so a refused Instructor action left the
        // board untouched while the script marched on to the beat that
        // depends on it — which is how "Counter with O-Robi" could appear
        // with no attack on the table and no way forward. A refused step
        // now stops here and says so.
        if (result && !result.ok) {
          setScriptError(
            `The Instructor could not ${describeAction(beat)}: ${result.reasons.join('; ')} (${describeBoard(useMatchStore.getState().state)})`,
          );
          return;
        }
      }
      advanceBeat();
    }, INSTRUCTOR_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [beat, dialogueDone, loading, gameState, advanceBeat]);

  // ── The player finished their objective ──────────────────────────────────
  //
  // Answering a prompt is the one action that can legitimately land BEFORE its
  // own beat is live: the beat that plays the card advances 700ms after the
  // dispatch, and the effect's prompt is already on screen inside that window.
  // A player who answers it quickly would otherwise arrive at the
  // `resolveChoice` beat with nothing left to answer and no way forward. So a
  // choice beat is measured by the prompt being GONE, not by a click landing
  // while the beat happened to be current.
  const playerChoicePending = (gameState?.pendingChoices ?? []).some((choice) => choice.playerId === PLAYER_A_ID);
  if (playerChoicePending) noteProgress(beat.id, { sawPrompt: true });
  const progress = progressFor(beat.id);
  const choiceBeatDone =
    beat.actor === 'player' && beat.action?.kind === 'resolveChoice' && progress.sawPrompt && !playerChoicePending;

  const playerBeatDone =
    beat.actor === 'player' &&
    !!beat.action &&
    (choiceBeatDone || beatSatisfied(gameState, defs as Record<string, CardDefinition>, beat, PLAYER_A_ID, progress.dispatches));

  useEffect(() => {
    if (!playerBeatDone) return;
    playTutorialCue('success');
    // No congratulatory pause while a prompt is waiting: the beat that answers
    // it has to be on screen before the player reaches the picker.
    const delay = playerChoicePending ? 0 : PLAYER_ADVANCE_MS;
    const timer = window.setTimeout(advanceBeat, delay);
    return () => window.clearTimeout(timer);
  }, [playerBeatDone, playerChoicePending, advanceBeat]);

  // ── Is the board actually ready for what we are about to ask? ────────────
  //
  // A scripted objective is only fair if the engine would accept it RIGHT
  // NOW. Asking the player to "Counter with O-Robi" when no battle is in
  // progress is the failure this catches: it runs the beat's own action
  // through validateAction before the objective goes up, and surfaces the
  // engine's reason instead of leaving the player clicking a board that will
  // never accept them. Purely diagnostic — it never blocks the attempt.
  const preflightIssue = useMemo(() => {
    if (loading || !gameState || beat.actor !== 'player' || !beat.action || !dialogueDone) return null;
    if (beat.action.kind === 'resolveChoice' && !gameState.pendingChoices.some((choice) => choice.playerId === PLAYER_A_ID)) return null;
    try {
      const actions = resolveBeatActions(gameState, defs as Record<string, CardDefinition>, beat, PLAYER_A_ID, { newActionId: createActionId });
      if (actions.length === 0) return null;
      const verdict = validateAction(gameState, actions[0], defs as Record<string, CardDefinition>);
      if (verdict.legal) return null;
      return `${verdict.reasons.join('; ')} (${describeBoard(gameState)}; this lesson expects turn ${beat.turn})`;
    } catch (error) {
      return `${error instanceof Error ? error.message : String(error)} (${describeBoard(gameState)})`;
    }
  }, [loading, gameState, defs, beat, dialogueDone]);

  // ── Chapter bookkeeping ──────────────────────────────────────────────────
  const chapterIndex = useMemo(() => CHAPTERS.findIndex((chapter) => chapter.id === beat.chapter), [beat.chapter]);
  const chapter = CHAPTERS[Math.max(0, chapterIndex)];

  function jumpToChapter(index: number): void {
    const target = CHAPTERS[index];
    if (!target) return;
    setRebuild((prev) => ({ nonce: prev.nonce + 1, jumpTarget: firstBeatIndexOfChapter(scenarioDef, target.id) }));
  }

  function handleNext(): void {
    if (!dialogueDone) {
      setLineIndex((value) => Math.min(value + 1, beat.lines.length - 1));
      return;
    }
    if (beatIndex >= SCRIPT.length - 1) {
      markScenarioCompleted(scenarioId);
      onLeaveScenario();
      return;
    }
    advanceBeat();
  }

  function handleFinishOrExit(completed: boolean): void {
    if (completed) markScenarioCompleted(scenarioId);
    // Back to the picker rather than all the way out: finishing one scenario
    // is the moment a player is most likely to want the next one.
    onLeaveScenario();
  }

  if (loading || loadError) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <TutorialLoadingScreen error={loadError} />
        {loadError && (
          <button
            type="button"
            onClick={() => handleFinishOrExit(false)}
            className="fixed bottom-10 left-1/2 z-[10000] -translate-x-1/2 rounded-md border border-white/25 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/80 hover:bg-black/80"
          >
            Back to Menu
          </button>
        )}
      </div>
    );
  }

  const waitingOnPlayer = beat.actor === 'player' && !!beat.action && dialogueDone && !playerBeatDone;
  const instructorActing = beat.actor === 'instructor' && !!beat.action && dialogueDone && !scriptError;
  const anchor = beat.highlight ?? 'none';
  const railWidth = railCollapsed ? TUTORIAL_SIDEBAR_COLLAPSED_WIDTH : TUTORIAL_SIDEBAR_WIDTH;

  // The primary button is the ONLY reading control, so it has to say which of
  // the three waits we are in: more dialogue to read, the Instructor mid-move,
  // or the player owing the board an action.
  let primaryLabel = 'Next';
  let primaryDisabled = false;
  if (!dialogueDone) {
    primaryLabel = 'Continue';
  } else if (instructorActing) {
    primaryLabel = 'Instructor is playing…';
    primaryDisabled = true;
  }
  if (scriptError) {
    // Clicking past a step the engine refused just walks the script further
    // away from the board. Restart chapter is the only honest way out.
    primaryLabel = 'Restart the chapter to continue';
    primaryDisabled = true;
  } else if (waitingOnPlayer) {
    primaryLabel = 'Your move — play it';
    primaryDisabled = true;
  } else if (isFinished) {
    primaryLabel = 'Finish';
  }

  return (
    <>
      {/* The board is LAID OUT INSIDE the space the rail leaves, rather than
          rendered full-bleed with the tutorial floating on top of it. That is
          the whole point of the rail: MatchScreen puts the hand dock along the
          bottom edge and the action bar just above it, so any floating tutorial
          chrome sits exactly where the player has to click. */}
      <div style={{ position: 'fixed', inset: 0, right: railWidth, overflow: 'hidden', transition: 'right 160ms ease' }}>
        <MatchScreen />
      </div>
      <TutorialOverlay
        anchorId={anchor}
        // The player's objectives routinely span several zones (hand + cost
        // area + Character area to play a card; your card + the opponent's to
        // attack) and some live in MatchScreen's own centered modals, which
        // render BELOW the dim bars. A single rectangular cutout cannot cover
        // any of that, so while the player is acting the board is fully live
        // and the dispatch guard does the gating instead.
        mode={waitingOnPlayer ? 'free' : 'spotlight'}
        onBlockedClick={() => {
          setBlockedReason(beat.actor === 'player' ? beat.objective ?? null : 'Read along — use Continue to carry on.');
          window.setTimeout(() => setBlockedReason(null), 2000);
        }}
      />
      <TutorialSidebar
        scenarioTitle={scenarioDef.title}
        chapterIndex={Math.max(0, chapterIndex)}
        chapterCount={CHAPTERS.length}
        chapterTitle={chapter.title}
        speaker={beat.actor === 'narration' ? 'Tutorial' : 'Instructor'}
        lines={beat.lines}
        lineIndex={lineIndex}
        objective={beat.objective ?? ''}
        showObjective={waitingOnPlayer}
        showSuccess={playerBeatDone}
        successLine="Done — nicely played."
        blockedReason={blockedReason}
        scriptError={scriptError}
        preflightIssue={playerBeatDone ? null : preflightIssue}
        primaryLabel={primaryLabel}
        primaryDisabled={primaryDisabled}
        onPrimary={handleNext}
        canGoPrevious={chapterIndex > 0}
        onPrevious={() => jumpToChapter(chapterIndex - 1)}
        onRestartChapter={() => jumpToChapter(chapterIndex)}
        onSkipTutorial={() => handleFinishOrExit(true)}
        onExit={() => handleFinishOrExit(false)}
        collapsed={railCollapsed}
        onToggleCollapsed={() => setRailCollapsed((value) => !value)}
      />
    </>
  );
}
