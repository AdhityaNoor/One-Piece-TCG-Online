/**
 * Custom screen router (no router library — see project recommended-stack
 * note: navigation is simple enough here that a dependency isn't worth it).
 *
 * Every "click" the user takes is a `navigateTo`/`goBack` call against this
 * store, exactly like every game action will later be a `dispatchAction`
 * call against the engine — this store holds UI-navigation state ONLY,
 * never game state, per the project's Layer 3+ vs Layer 1/2 split. Game
 * state for an in-progress match (once the engine exists) lives in its own
 * store/slice, referenced here only by id (see `match.deckIdA`/`deckIdB`).
 */
import { create } from 'zustand';

export type NavigationTarget =
  | { screen: 'main-menu' }
  | { screen: 'settings' }
  | { screen: 'debug-tools' }
  | { screen: 'card-library' }
  | { screen: 'deck-builder'; deckIdToEdit?: string }
  | { screen: 'saved-decks' }
  | { screen: 'deck-select' }
  | { screen: 'credits' }
  | { screen: 'match'; deckIdA: string; deckIdB: string };

interface NavigationState {
  /** Last entry is the current screen. Always non-empty. */
  stack: NavigationTarget[];
  navigateTo(target: NavigationTarget): void;
  goBack(): void;
  /** Replaces the whole stack with a single entry — used when "back" should never return to where we came from (e.g. leaving a finished match). */
  resetTo(target: NavigationTarget): void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  stack: [{ screen: 'main-menu' }],
  navigateTo: (target) => set({ stack: [...get().stack, target] }),
  goBack: () =>
    set((state) => (state.stack.length > 1 ? { stack: state.stack.slice(0, -1) } : state)),
  resetTo: (target) => set({ stack: [target] }),
}));

/** Selector helper — current screen is always the top of the stack. */
export function selectCurrentScreen(state: NavigationState): NavigationTarget {
  return state.stack[state.stack.length - 1];
}

export const useCurrentScreen = (): NavigationTarget => useNavigationStore(selectCurrentScreen);
export const useCanGoBack = (): boolean => useNavigationStore((state) => state.stack.length > 1);
