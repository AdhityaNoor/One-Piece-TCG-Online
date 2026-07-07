/**
 * Layer 5 presentation queue for flying-card animations. Separate from
 * GameState — toggled by settingsStore.animationsEnabled at playback time.
 */
import { create } from 'zustand';
import type { CardMovementSpec } from '../../animations/cardMovement/types';

interface CardAnimationStore {
  /** Incremented on enqueue so the overlay can consume without a pending-length feedback loop. */
  batchSeq: number;
  pending: CardMovementSpec[];
  /** Instance ids hidden on the live board while their flight clone is in the air. */
  hiddenDuringFlight: Record<string, true>;
  enqueue: (specs: CardMovementSpec[]) => void;
  /** Returns and clears the pending batch (consumed by CardMovementOverlay). */
  takeBatch: () => CardMovementSpec[];
  beginFlights: (instanceIds: string[]) => void;
  endFlight: (instanceId: string) => void;
  clear: () => void;
}

export const useCardAnimationStore = create<CardAnimationStore>((set, get) => ({
  batchSeq: 0,
  pending: [],
  hiddenDuringFlight: {},
  enqueue: (specs) => {
    if (specs.length === 0) return;
    set((state) => ({
      pending: [...state.pending, ...specs],
      batchSeq: state.batchSeq + 1,
    }));
  },
  takeBatch: () => {
    const batch = get().pending;
    if (batch.length === 0) return [];
    set({ pending: [] });
    return batch;
  },
  beginFlights: (instanceIds) => {
    if (instanceIds.length === 0) return;
    set((state) => {
      const next = { ...state.hiddenDuringFlight };
      for (const id of instanceIds) next[id] = true;
      return { hiddenDuringFlight: next };
    });
  },
  endFlight: (instanceId) => {
    set((state) => {
      if (!state.hiddenDuringFlight[instanceId]) return state;
      const next = { ...state.hiddenDuringFlight };
      delete next[instanceId];
      return { hiddenDuringFlight: next };
    });
  },
  clear: () => set({ pending: [], batchSeq: 0, hiddenDuringFlight: {} }),
}));
