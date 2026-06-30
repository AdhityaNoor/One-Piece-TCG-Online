/**
 * App-wide UI/presentation settings - never game state (project rule: UI
 * state and game state must never mix). Persisted via zustand's built-in
 * `persist` middleware, pointed at the same injected `StorageLike` the pure
 * /src/cards layer uses (see app/lib/runtime.ts) rather than calling
 * `localStorage` directly, so there is exactly one place that knows about
 * the real browser storage API.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { browserStorage } from '../lib/runtime';

export interface SettingsState {
  /**
   * Local hotseat debug aid: shows both players' hands at once instead of
   * hiding the off-turn player's hand. Project rule: card visibility must
   * be modeled properly even in this mode - this only affects what the UI
   * reveals, never what GameState marks as known/hidden.
   */
  debugShowBothHands: boolean;
  /** Project rule: the game must stay fully playable with this off. Animation state lives outside GameState regardless of this flag's value. */
  animationsEnabled: boolean;
  /** Optional 3D polish layer toggle - defaults off since no 3D renderer exists yet. */
  threeDEnabled: boolean;
  /** Main-menu background music preference. UI-only audio state, never game state. */
  backsoundEnabled: boolean;
  /** Main-menu background music volume, normalized 0..1. */
  backsoundVolume: number;
  setDebugShowBothHands(value: boolean): void;
  setAnimationsEnabled(value: boolean): void;
  setThreeDEnabled(value: boolean): void;
  setBacksoundEnabled(value: boolean): void;
  setBacksoundVolume(value: number): void;
  resetToDefaults(): void;
}

const DEFAULTS = {
  debugShowBothHands: true,
  animationsEnabled: true,
  threeDEnabled: false,
  backsoundEnabled: true,
  backsoundVolume: 0.45,
} satisfies Pick<SettingsState, 'debugShowBothHands' | 'animationsEnabled' | 'threeDEnabled' | 'backsoundEnabled' | 'backsoundVolume'>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setDebugShowBothHands: (value) => set({ debugShowBothHands: value }),
      setAnimationsEnabled: (value) => set({ animationsEnabled: value }),
      setThreeDEnabled: (value) => set({ threeDEnabled: value }),
      setBacksoundEnabled: (value) => set({ backsoundEnabled: value }),
      setBacksoundVolume: (value) => set({ backsoundVolume: Math.max(0, Math.min(1, value)) }),
      resetToDefaults: () => set(DEFAULTS),
    }),
    {
      name: 'optcg.settings',
      storage: createJSONStorage(() => browserStorage),
    },
  ),
);
