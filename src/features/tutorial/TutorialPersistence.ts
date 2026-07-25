/**
 * Tutorial completion/replay state. UI/presentation state only — never game
 * state (same rule settingsStore.ts follows) — persisted with the same
 * zustand `persist` + injected `browserStorage` mechanism as every other
 * local-only preference in this app, so there is still exactly one place
 * that knows about the real browser storage API.
 *
 * `tutorialVersion` is what makes replay-on-update possible (project spec:
 * "If the tutorial is updated in future releases, support replay by
 * comparing tutorialVersion"): bump TUTORIAL_CONTENT_VERSION whenever the
 * chapter list changes in a way worth re-teaching, and
 * `hasCompletedCurrentVersion` below flips back to false for players who
 * completed an older version, bringing the "NEW" badge back without
 * resetting anything else about their profile.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { browserStorage } from '../../app/lib/runtime';

/**
 * Bump when tutorialSteps.ts changes enough that past completions should be
 * re-offered. v2: added the opening introduction block (card introduction,
 * expanded board tour, basic rules introduction) — worth re-teaching.
 */
export const TUTORIAL_CONTENT_VERSION = 2;

interface TutorialPersistenceState {
  tutorialCompleted: boolean;
  tutorialVersion: number;
  /** First-launch callout ("New to One Piece Card Game? Start here!") dismissed/seen at least once. Independent of completion — a player who exits without finishing shouldn't keep seeing the callout forever either. */
  hasSeenFirstLaunchCallout: boolean;
  markTutorialCompleted(): void;
  markFirstLaunchCalloutSeen(): void;
  /** Debug/replay affordance — resets completion so QA can re-trigger the NEW badge + callout without clearing all local storage. */
  resetTutorialProgress(): void;
}

export const useTutorialPersistenceStore = create<TutorialPersistenceState>()(
  persist(
    (set) => ({
      tutorialCompleted: false,
      tutorialVersion: 0,
      hasSeenFirstLaunchCallout: false,
      markTutorialCompleted: () => set({ tutorialCompleted: true, tutorialVersion: TUTORIAL_CONTENT_VERSION }),
      markFirstLaunchCalloutSeen: () => set({ hasSeenFirstLaunchCallout: true }),
      resetTutorialProgress: () => set({ tutorialCompleted: false, tutorialVersion: 0, hasSeenFirstLaunchCallout: false }),
    }),
    {
      name: 'optcg.tutorial',
      storage: createJSONStorage(() => browserStorage),
    },
  ),
);

/** True when the player has never completed the CURRENT tutorial content version — drives the PlayMenuScreen "NEW" badge. */
export function hasCompletedCurrentTutorialVersion(state: Pick<TutorialPersistenceState, 'tutorialCompleted' | 'tutorialVersion'>): boolean {
  return state.tutorialCompleted && state.tutorialVersion >= TUTORIAL_CONTENT_VERSION;
}
