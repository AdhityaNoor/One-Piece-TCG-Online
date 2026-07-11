/**
 * Holds the local hotseat match setup (which saved deck each side will use)
 * between the Deck Select screen and the Match screen. Intentionally tiny —
 * this is UI-flow state, not GameState. Once the rules engine exists, the
 * Match screen's setup flow (engine/setup) will consume `deckIdA`/`deckIdB`
 * to build the actual GameState; this store never constructs GameState
 * itself (Layer 3+ never decides game outcome/legality, project rule).
 */
import { create } from 'zustand';
import type { CpuDifficulty } from '../../ai';

interface MatchSetupState {
  deckIdA: string | null;
  deckIdB: string | null;
  cpuDifficulty: CpuDifficulty;
  setDeckA(deckId: string | null): void;
  setDeckB(deckId: string | null): void;
  setCpuDifficulty(difficulty: CpuDifficulty): void;
  swapSides(): void;
  reset(): void;
}

export const useMatchSetupStore = create<MatchSetupState>((set) => ({
  deckIdA: null,
  deckIdB: null,
  cpuDifficulty: 'normal',
  setDeckA: (deckId) => set({ deckIdA: deckId }),
  setDeckB: (deckId) => set({ deckIdB: deckId }),
  setCpuDifficulty: (cpuDifficulty) => set({ cpuDifficulty }),
  swapSides: () => set((state) => ({ deckIdA: state.deckIdB, deckIdB: state.deckIdA })),
  reset: () => set({ deckIdA: null, deckIdB: null, cpuDifficulty: 'normal' }),
}));

/** True once both sides have a deck chosen — same deck on both sides (a mirror match) is allowed, no rule forbids it. */
export function useIsMatchSetupReady(): boolean {
  return useMatchSetupStore((state) => state.deckIdA !== null && state.deckIdB !== null);
}
