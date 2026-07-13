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
import { DEFAULT_AVATAR_ID } from '../lib/avatars';
import { browserStorage } from '../lib/runtime';
import { useCardAnimationStore } from './cardAnimationStore';

/** Max length for a display username. Purely a UI/presentation cap. */
export const USERNAME_MAX_LENGTH = 20;
/** Shown when the user has never set a name — also the online-lobby default handle. */
export const DEFAULT_USERNAME = 'Player';

/** Trim + clamp a raw username input to something safe to display; empties fall back to the default. */
export function sanitizeUsername(raw: string): string {
  const trimmed = raw.replace(/\s+/g, ' ').trim().slice(0, USERNAME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : DEFAULT_USERNAME;
}

export interface SettingsState {
  /**
   * The local player's display name. UI/presentation only — the engine keeps
   * fixed player ids (p1/p2); this is just how those ids are labelled on
   * screen and, later, the handle this client presents to the online lobby.
   * Never read by the rules engine.
   */
  username: string;
  /**
   * Predefined avatar id (see lib/avatars.ts — AVATAR_OPTIONS) shown next to
   * the username in the header profile preview and on the Pirate Profile
   * screen. UI/presentation only, same as `username`. Local to this device,
   * same persistence mechanism as everything else in this store — there is
   * no per-account/server-synced avatar yet.
   */
  avatarId: string;
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
  /** UI click sound preference. UI-only audio state, never game state. */
  sfxEnabled: boolean;
  /** UI sound effect volume, normalized 0..1. */
  sfxVolume: number;
  /** Match screen navy backdrop preference. UI-only visual polish, never game state. */
  matchNavyBackgroundEnabled: boolean;
  setUsername(value: string): void;
  setAvatarId(value: string): void;
  setDebugShowBothHands(value: boolean): void;
  setAnimationsEnabled(value: boolean): void;
  setThreeDEnabled(value: boolean): void;
  setBacksoundEnabled(value: boolean): void;
  setBacksoundVolume(value: number): void;
  setSfxEnabled(value: boolean): void;
  setSfxVolume(value: number): void;
  setMatchNavyBackgroundEnabled(value: boolean): void;
  resetToDefaults(): void;
}

const DEFAULTS = {
  username: DEFAULT_USERNAME,
  avatarId: DEFAULT_AVATAR_ID,
  debugShowBothHands: true,
  animationsEnabled: true,
  threeDEnabled: false,
  backsoundEnabled: true,
  backsoundVolume: 0.45,
  sfxEnabled: true,
  sfxVolume: 0.65,
  matchNavyBackgroundEnabled: false,
} satisfies Pick<
  SettingsState,
  | 'username'
  | 'avatarId'
  | 'debugShowBothHands'
  | 'animationsEnabled'
  | 'threeDEnabled'
  | 'backsoundEnabled'
  | 'backsoundVolume'
  | 'sfxEnabled'
  | 'sfxVolume'
  | 'matchNavyBackgroundEnabled'
>;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setUsername: (value) => set({ username: sanitizeUsername(value) }),
      setAvatarId: (value) => set({ avatarId: value }),
      setDebugShowBothHands: (value) => set({ debugShowBothHands: value }),
      setAnimationsEnabled: (value) => {
        set({ animationsEnabled: value });
        if (!value) useCardAnimationStore.getState().clear();
      },
      setThreeDEnabled: (value) => set({ threeDEnabled: value }),
      setBacksoundEnabled: (value) => set({ backsoundEnabled: value }),
      setBacksoundVolume: (value) => set({ backsoundVolume: Math.max(0, Math.min(1, value)) }),
      setSfxEnabled: (value) => set({ sfxEnabled: value }),
      setSfxVolume: (value) => set({ sfxVolume: Math.max(0, Math.min(1, value)) }),
      setMatchNavyBackgroundEnabled: (value) => set({ matchNavyBackgroundEnabled: value }),
      resetToDefaults: () => {
        useCardAnimationStore.getState().clear();
        set(DEFAULTS);
      },
    }),
    {
      name: 'optcg.settings',
      storage: createJSONStorage(() => browserStorage),
    },
  ),
);
