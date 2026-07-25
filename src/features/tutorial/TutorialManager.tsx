/**
 * Top-level Tutorial orchestrator — this IS the 'tutorial' NavigationTarget's
 * screen component (see App.tsx). It never mutates GameState directly: it
 * (1) builds a scripted scenario per chapter (tutorialScenario.ts) and hands
 * it to matchStore exactly the way startMatch()/hydrateOnlineMatch() already
 * do, (2) temporarily wraps matchStore's `dispatch` with
 * TutorialActionValidator's decision for the CURRENTLY active chapter, and
 * (3) renders the real, unmodified `<MatchScreen />` underneath its own
 * overlay/tooltip/progress/controls stack. See TutorialOverlay.tsx for how
 * "everything except the current objective is disabled" is achieved without
 * touching a single line of board-component code.
 *
 * Known limitation (see project doc "Document every known limitation"):
 * MatchScreen's own header chrome (settings/quit/bug-report/chat) is still
 * present underneath the tutorial overlay, since this deliberately renders
 * the real, untouched MatchScreen rather than a fork of it. A future pass
 * could add an optional "bare" prop to MatchScreen to hide that chrome
 * specifically for the tutorial; out of scope for this milestone.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MatchScreen } from '../../app/screens';
import { useMatchStore, createActionId, PLAYER_A_ID, PLAYER_B_ID } from '../../app/store/matchStore';
import { useNavigationStore } from '../../app/store/navigationStore';
import type { GameAction } from '../../engine/actions';
import { EFFECT_RUNTIME_MODE } from '../../app/config/effectRuntimeMode';
import { buildCuratedEffectRegistry } from '../../cards/effectTemplates';
import { isActionAllowedForStep } from './TutorialActionValidator';
import { buildProgressSnapshot, nextChapterId, previousChapterId } from './TutorialStateMachine';
import { TUTORIAL_STEPS } from './tutorialSteps';
import { buildTutorialScenario } from './tutorialScenario';
import { useTutorialPersistenceStore } from './TutorialPersistence';
import { TutorialControls } from './TutorialControls';
import { TutorialIntroPanel } from './TutorialIntroPanel';
import { TutorialLoadingScreen } from './TutorialLoadingScreen';
import { TutorialOverlay } from './TutorialOverlay';
import { TutorialProgress } from './TutorialProgress';
import { TutorialTooltip } from './TutorialTooltip';
import { playTutorialCue } from './sound';
import type { TutorialChapterId } from './types';

const FIRST_CHAPTER_ID: TutorialChapterId = TUTORIAL_STEPS[0].id;

export function TutorialManager() {
  const resetTo = useNavigationStore((state) => state.resetTo);
  const markTutorialCompleted = useTutorialPersistenceStore((state) => state.markTutorialCompleted);

  const [chapterId, setChapterId] = useState<TutorialChapterId>(FIRST_CHAPTER_ID);
  const [restartNonce, setRestartNonce] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);

  const step = useMemo(() => TUTORIAL_STEPS.find((entry) => entry.id === chapterId) ?? TUTORIAL_STEPS[0], [chapterId]);
  const chapterIndex = useMemo(() => TUTORIAL_STEPS.findIndex((entry) => entry.id === chapterId), [chapterId]);
  const gameState = useMatchStore((state) => state.state);

  // Rebuild the scripted scenario every time the active chapter (or an
  // explicit Restart Chapter) changes — see tutorialScenario.ts's doc
  // comment for why each chapter gets its own fresh scenario rather than one
  // continuously-mutated match.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setLineIndex(0);
    setShowSuccess(false);
    setBlockedReason(null);

    buildTutorialScenario(chapterId)
      .then((scenario) => {
        if (cancelled) return;
        const registry = EFFECT_RUNTIME_MODE === 'v2' ? {} : buildCuratedEffectRegistry(scenario.defs);
        useMatchStore.setState({
          state: scenario.state,
          defs: scenario.defs,
          registry,
          v2EffectRuntime: null,
          v2EffectSidecars: null,
          cardImagesByDefinitionId: scenario.images,
          startedWithDeckIds: { a: 'tutorial', b: 'tutorial', presentationKey: `tutorial-${chapterId}-${restartNonce}` },
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
  }, [chapterId, restartNonce]);

  // Installed ONCE for the tutorial scene's whole lifetime, restored on
  // unmount — reads the currently-active step through a ref so it always
  // gates against the latest chapter without needing to reinstall per
  // chapter change (which would risk a brief window with no guard at all).
  const stepRef = useRef(step);
  stepRef.current = step;
  // The unguarded dispatch, kept for the Instructor's own scripted responses
  // (below) — the guard only exists to constrain the STUDYING player's
  // choices, not the Instructor's rule-mandated ones.
  const originalDispatchRef = useRef<((action: GameAction) => { ok: boolean }) | null>(null);
  useEffect(() => {
    const originalDispatch = useMatchStore.getState().dispatch;
    originalDispatchRef.current = originalDispatch;
    const guardedDispatch = (action: GameAction) => {
      const decision = isActionAllowedForStep(stepRef.current, action);
      if (!decision.allowed) {
        setBlockedReason(decision.reason ?? null);
        window.setTimeout(() => setBlockedReason(null), 1800);
        return { ok: false as const, reasons: decision.reason ? [decision.reason] : ['Not allowed during this chapter.'] };
      }
      const result = originalDispatch(action);
      if (result.ok) playTutorialCue('confirm');
      return result;
    };
    useMatchStore.setState({ dispatch: guardedDispatch });
    return () => {
      originalDispatchRef.current = null;
      useMatchStore.setState({ dispatch: originalDispatch });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Instructor auto-defense: whenever the STUDYING player's attack reaches a
  // Block/Counter Step, the defending Instructor simply declines (PASS_STEP,
  // 7-1-2/7-1-3) after a beat — the tutorial teaches attacking, not fighting
  // an opponent who counters back. Dispatched through the UNGUARDED dispatch
  // (the guard gates the student's action types, and PASS_STEP may not be in
  // the chapter's allowedActions). Never fires while the student is the
  // defender (the defense chapters), or while a PendingChoice is open.
  useEffect(() => {
    if (!gameState || gameState.gameOver) return;
    const battle = gameState.currentBattle;
    if (!battle || (battle.step !== 'block' && battle.step !== 'counter')) return;
    if (gameState.pendingChoices.length > 0) return;
    const defenderId = gameState.activePlayerId === PLAYER_A_ID ? PLAYER_B_ID : PLAYER_A_ID;
    if (defenderId !== PLAYER_B_ID) return;
    const timer = window.setTimeout(() => {
      originalDispatchRef.current?.({ type: 'PASS_STEP', actionId: createActionId(), playerId: PLAYER_B_ID });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [gameState]);

  const progress = useMemo(
    () => buildProgressSnapshot(chapterId, gameState, PLAYER_A_ID),
    [chapterId, gameState],
  );

  useEffect(() => {
    if (step.isEngineWired && progress.isComplete && !showSuccess) {
      setShowSuccess(true);
      playTutorialCue('success');
    }
  }, [progress.isComplete, showSuccess, step.isEngineWired]);

  function advanceToChapter(id: TutorialChapterId): void {
    setChapterId(id);
  }

  function handleNext(): void {
    const next = nextChapterId(chapterId);
    if (!next) {
      markTutorialCompleted();
      resetTo({ screen: 'hub', tab: 'play' });
      return;
    }
    advanceToChapter(next);
  }

  function handlePrevious(): void {
    const prev = previousChapterId(chapterId);
    if (prev) advanceToChapter(prev);
  }

  function handleRestartChapter(): void {
    setRestartNonce((value) => value + 1);
  }

  function handleSkipTutorial(): void {
    markTutorialCompleted();
    resetTo({ screen: 'hub', tab: 'play' });
  }

  function handleExit(): void {
    resetTo({ screen: 'hub', tab: 'play' });
  }

  function handleAdvanceLine(): void {
    setLineIndex((value) => Math.min(value + 1, step.dialogue.length - 1));
  }

  if (loading || loadError) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <TutorialLoadingScreen error={loadError} />
        {loadError && (
          <button
            type="button"
            onClick={handleExit}
            className="fixed bottom-10 left-1/2 z-[10000] -translate-x-1/2 rounded-md border border-white/25 bg-black/60 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/80 hover:bg-black/80"
          >
            Back to Menu
          </button>
        )}
      </div>
    );
  }

  const dialogueFullyShown = lineIndex >= step.dialogue.length - 1;
  const canGoNext = step.isEngineWired ? progress.isComplete : true;
  // While there's still dialogue left AND this chapter defines a tour
  // sequence (see types.ts), the spotlight follows the dialogue line instead
  // of pinning the chapter's objective-phase target — see tutorialSteps.ts's
  // battlefieldOverview entry. Falls back to the static `highlight` for
  // every other chapter, and once dialogue is done / the objective is live.
  const activeAnchor =
    !dialogueFullyShown && step.dialogueHighlights
      ? step.dialogueHighlights[Math.min(lineIndex, step.dialogueHighlights.length - 1)]
      : step.highlight;

  // Pure-introduction chapters (card intro / basic rules) carry an
  // introPanel; its visible slide follows the dialogue line via
  // dialogueSlides — the same per-line resolution dialogueHighlights uses
  // for the spotlight (see types.ts). Falls back to the last mapped slide
  // once dialogue is exhausted, so the panel never blanks out.
  const introSlideIndex = step.dialogueSlides
    ? step.dialogueSlides[Math.min(lineIndex, step.dialogueSlides.length - 1)]
    : lineIndex;

  return (
    <>
      <MatchScreen />
      <TutorialOverlay
        anchorId={activeAnchor}
        mode={dialogueFullyShown && step.freeInteraction ? 'free' : 'spotlight'}
        onBlockedClick={() => {
          setBlockedReason(`Follow the highlighted objective: ${step.objective}`);
          window.setTimeout(() => setBlockedReason(null), 1800);
        }}
      />
      <TutorialProgress chapterIndex={chapterIndex} chapterCount={progress.chapterCount} title={step.title} />
      {step.introPanel && <TutorialIntroPanel kind={step.introPanel} slideIndex={introSlideIndex} />}
      <TutorialTooltip
        anchorId={activeAnchor}
        lines={step.dialogue}
        lineIndex={lineIndex}
        onAdvanceLine={handleAdvanceLine}
        objective={step.objective}
        showObjective={dialogueFullyShown && !showSuccess && step.allowedActions.length > 0}
        showSuccess={showSuccess}
        successLine={step.successLine}
      />
      {!step.isEngineWired && (
        <div style={{ position: 'fixed', top: 78, left: '50%', transform: 'translateX(-50%)', zIndex: 9996 }} className="rounded-md border border-amber-300/40 bg-amber-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">
          This chapter's live scenario needs engine hookup — content only
        </div>
      )}
      {blockedReason && (
        <div style={{ position: 'fixed', top: 108, left: '50%', transform: 'translateX(-50%)', zIndex: 9997 }} className="max-w-sm rounded-md border border-red-400/40 bg-red-950/80 px-3 py-1.5 text-center text-[11px] font-semibold text-red-200 shadow-lg">
          {blockedReason}
        </div>
      )}
      <TutorialControls
        canGoPrevious={previousChapterId(chapterId) !== null}
        canGoNext={canGoNext}
        isLastChapter={progress.isLastChapter}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onRestartChapter={handleRestartChapter}
        onSkipTutorial={handleSkipTutorial}
        onExit={handleExit}
      />
    </>
  );
}
