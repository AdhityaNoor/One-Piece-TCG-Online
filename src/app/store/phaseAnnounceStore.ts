/**
 * Layer 5 presentation queue for phase-transition banners ("Refresh Phase",
 * "Draw Phase", "DON!! Phase"). Separate from GameState — a single dispatch
 * can enqueue several announcements at once (see parsePhaseAnnouncements.ts
 * doc comment for why), and PhaseTransitionBanner (MatchScreen.tsx) drains
 * them one at a time so they read as a sequence instead of all flashing at
 * once. Unlike cardAnimationStore, this queue is NOT gated by
 * settingsStore.animationsEnabled — like TurnChangeBanner, it's turn-flow
 * feedback (what just happened), not decorative animation/3D polish, so it
 * stays on even when the user disables card-flight animations.
 */
import { create } from 'zustand';
import type { PhaseAnnouncement } from '../../animations/phaseAnnounce/types';

interface PhaseAnnounceStore {
  queue: PhaseAnnouncement[];
  enqueue: (items: PhaseAnnouncement[]) => void;
  /** Drops the currently-displayed (front) announcement once its banner has finished. */
  dequeue: () => void;
  clear: () => void;
}

export const usePhaseAnnounceStore = create<PhaseAnnounceStore>((set) => ({
  queue: [],
  enqueue: (items) => {
    if (items.length === 0) return;
    set((state) => ({ queue: [...state.queue, ...items] }));
  },
  dequeue: () => set((state) => ({ queue: state.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));
