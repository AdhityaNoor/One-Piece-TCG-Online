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
 * script changes in a way worth re-teaching, and
 * `hasCompletedCurrentVersion` below flips back to false for players who
 * completed an older version, bringing the "NEW" badge back without
 * resetting anything else about their profile.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { browserStorage } from '../../app/lib/runtime';
import type { TutorialScenarioId } from './types';

/**
 * Bump when the tutorial content changes enough that past completions should
 * be re-offered.
 * v2: added the opening introduction block (card introduction, expanded board
 *     tour, basic rules introduction).
 * v4: the tutorial is now THREE scenarios, not one — Basic Game Flow plus the
 *     two card-effect scenarios, which run with the real curated effect
 *     registry. Completion is tracked per scenario from here on.
 * v3: rebuilt entirely. The tutorial is no longer a set of chapters over
 *     fabricated mid-game boards — it is ONE continuous scripted match
 *     (tutorialScript.ts) reproducing the official Teaching App's "Basic Game
 *     Flow" scenario on real decks. Everyone should see this one.
 */
export const TUTORIAL_CONTENT_VERSION = 4;

interface TutorialPersistenceState {
  tutorialCompleted: boolean;
  tutorialVersion: number;
  /** First-launch callout ("New to One Piece Card Game? Start here!") dismissed/seen at least once. Independent of completion — a player who exits without finishing shouldn't keep seeing the callout forever either. */
  hasSeenFirstLaunchCallout: boolean;
  /** Scenario ids finished at the CURRENT content version. */
  completedScenarioIds: TutorialScenarioId[];
  markScenarioCompleted(id: TutorialScenarioId): void;
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
      completedScenarioIds: [],
      markScenarioCompleted: (id) =>
        set((state) => ({
          completedScenarioIds: state.completedScenarioIds.includes(id) ? state.completedScenarioIds : [...state.completedScenarioIds, id],
          // Finishing any scenario retires the "NEW" badge; the picker shows
          // per-scenario progress for the rest.
          tutorialCompleted: true,
          tutorialVersion: TUTORIAL_CONTENT_VERSION,
        })),
      markTutorialCompleted: () => set({ tutorialCompleted: true, tutorialVersion: TUTORIAL_CONTENT_VERSION }),
      markFirstLaunchCalloutSeen: () => set({ hasSeenFirstLaunchCallout: true }),
      resetTutorialProgress: () => set({ tutorialCompleted: false, tutorialVersion: 0, hasSeenFirstLaunchCallout: false, completedScenarioIds: [] }),
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
