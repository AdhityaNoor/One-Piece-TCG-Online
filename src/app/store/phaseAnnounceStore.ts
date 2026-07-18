/**
 * Layer 5 presentation queue for the ENTIRE turn-start sequence: the
 * turn-change banner ("Turn N / PLAYER Turn") followed by Refresh Phase ->
 * Draw Phase -> DON!! Phase -> Main Phase. This used to be TWO separate
 * systems — TurnChangeBanner reacted to prop diffs on its own clock while
 * phase banners drained a separate queue on a different clock — and nothing
 * kept them from showing at once, or kept phase banners in sync with their
 * own card flights. Now there's exactly ONE queue and ONE "currently
 * showing" step, strictly ordered, so the turn-change banner always
 * finishes before Refresh starts, and every phase step's banner + its own
 * card flights are released together and held together.
 *
 * This is the single source of truth for the popup banner
 * (TurnAndPhaseBanner, MatchScreen.tsx) AND the PhaseIndicator glide
 * (phaseDisplayFor, MatchScreen.tsx) — they both just read `queue[0]`, so
 * they can never drift apart from each other or from what's actually
 * playing.
 *
 * Each 'phase' step owns its own card flights (step.movementSpecs — the
 * drawn card, the DON!! added, etc), released into cardAnimationStore
 * (releaseStep, below) at the exact moment that step becomes the front of
 * the queue, with the step's dwell (durationMs, computed in
 * buildTurnSequence.ts) sized to cover however long those flights take to
 * land before advancing. 'turnChange' steps and steps with no flights (or
 * when animations are disabled — buildTurnSequence.ts is what strips
 * movementSpecs out in that case) just get a bare "read the banner" dwell.
 *
 * The queue drains ITSELF on a timer owned by this store, NOT by a React
 * effect in the consuming component — draining no longer depends on any
 * particular component being mounted, subscribed in a particular way, or
 * re-rendering on a particular schedule.
 *
 * Not gated by settingsStore.animationsEnabled — like the old
 * TurnChangeBanner, showing the sequence is turn-flow feedback (what's
 * happening right now), not decorative animation/3D polish, so it stays on
 * even when the user disables card-flight animations (buildTurnSequence.ts
 * is what strips the flights themselves out in that case, not this store).
 */
import { create } from 'zustand';
import type { TurnSequenceStep } from '../../animations/phaseAnnounce/types';
import { useCardAnimationStore } from './cardAnimationStore';

interface PhaseAnnounceStore {
  queue: TurnSequenceStep[];
  enqueue: (steps: TurnSequenceStep[]) => void;
  clear: () => void;
}

// Module-scoped (not store state) — a JS handle, not something any component
// should ever read or render from.
let drainTimer: ReturnType<typeof setTimeout> | null = null;

/** Fires this step's card flights (if any) into cardAnimationStore — called exactly once, at the moment the step becomes the front of the queue. */
function releaseStep(step: TurnSequenceStep): void {
  if (step.kind === 'phase' && step.movementSpecs.length > 0) {
    useCardAnimationStore.getState().enqueue(step.movementSpecs);
  }
}

export const usePhaseAnnounceStore = create<PhaseAnnounceStore>((set, get) => {
  const scheduleDrain = (durationMs: number): void => {
    if (drainTimer !== null) return; // a drain tick is already pending — nothing to do
    drainTimer = setTimeout(() => {
      drainTimer = null;
      const remaining = get().queue.slice(1);
      set({ queue: remaining });
      const next = remaining[0];
      if (next) {
        releaseStep(next);
        scheduleDrain(next.durationMs);
      }
    }, durationMs);
  };

  return {
    queue: [],
    enqueue: (newSteps) => {
      if (newSteps.length === 0) return;
      const wasEmpty = get().queue.length === 0;
      set((state) => ({ queue: [...state.queue, ...newSteps] }));
      // Only the transition into "queue has a front item" needs to release
      // that item's flights and kick off draining — if a drain is already
      // running, the newly-appended steps just wait their turn and get
      // released/scheduled naturally when the drain loop reaches them.
      if (wasEmpty) {
        const first = newSteps[0];
        releaseStep(first);
        scheduleDrain(first.durationMs);
      }
    },
    clear: () => {
      if (drainTimer !== null) {
        clearTimeout(drainTimer);
        drainTimer = null;
      }
      set({ queue: [] });
    },
  };
});
