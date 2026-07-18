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
import type { CpuDifficulty } from '../../ai';

/**
 * Presentation-only match config layered on top of the pure {deckIdA,
 * deckIdB} pairing. Absent (`undefined`) == the classic "vs Self" hotseat:
 * board follows whose turn it is and seats are labelled by their engine id
 * (p1/p2). Present == a Casual match: the board is pinned to `localPlayerId`
 * (it never flips to the opponent's side) and seats are labelled by
 * `playerNames`. None of this reaches the engine — it only changes how the
 * fixed GameState is projected and labelled (Layer 3), and stays
 * JSON-serializable so a match target round-trips like everything else.
 */
export interface CasualMatchPresentation {
  mode: 'casual';
  /** Engine player id the local client controls and views from (bottom of the board). */
  localPlayerId: string;
  /** engine playerId -> display username, for board/log/banner labels. */
  playerNames: Record<string, string>;
}

export interface CpuMatchPresentation {
  mode: 'cpu';
  localPlayerId: string;
  cpuPlayerIds: string[];
  difficulty: CpuDifficulty;
  playerNames: Record<string, string>;
  cpuDebug?: boolean;
}

export type MatchPresentation = CasualMatchPresentation | CpuMatchPresentation;

/**
 * The five tabs behind the universal header (see AppHeader.tsx). "hub" is the
 * one screen that owns a `tab` field — Home / Play / Decks / Social /
 * Settings are all rendered by the same HubScreen, switched instantly with
 * no stack push (see `setHubTab` below), matching a normal app tab bar
 * rather than back-stack navigation. Settings used to be a separate pushed
 * screen behind a gear icon; it's a tab like the others now, so sub-screens
 * pushed from it (Debug Tools, Credits) pop back to the Settings tab same as
 * Deck Builder pops back to the Decks tab.
 */
export type HubTab = 'home' | 'play' | 'decks' | 'social' | 'settings';

export type NavigationTarget =
  | { screen: 'hub'; tab: HubTab }
  /**
   * Legacy aliases for the pre-header root/tab screens. Kept only because
   * MatchScreen.tsx's post-match `resetTo` calls target `main-menu` and
   * `play-menu` directly — MatchScreen is intentionally never touched, so
   * these stay valid NavigationTargets forever rather than requiring an edit
   * there. Everywhere else, prefer `{ screen: 'hub', tab: ... }`.
   */
  | { screen: 'main-menu' }
  | { screen: 'play-menu' }
  | { screen: 'saved-decks' }
  | { screen: 'settings' }
  | { screen: 'debug-tools' }
  | { screen: 'play-test' }
  | { screen: 'card-library' }
  | { screen: 'deck-builder'; deckIdToEdit?: string }
  | { screen: 'profile'; username?: string }
  | { screen: 'ranked' }
  | { screen: 'deck-select' }
  | { screen: 'cpu-deck-select' }
  | { screen: 'casual-lobby'; regulation?: 'casualStandard' | 'casualExtra' | 'rankedStandard' }
  | { screen: 'online-match' }
  | { screen: 'credits' }
  | { screen: 'match'; deckIdA: string; deckIdB: string; presentation?: MatchPresentation };

interface NavigationState {
  /** Last entry is the current screen. Always non-empty. */
  stack: NavigationTarget[];
  navigateTo(target: NavigationTarget): void;
  goBack(): void;
  /** Replaces the whole stack with a single entry — used when "back" should never return to where we came from (e.g. leaving a finished match). */
  resetTo(target: NavigationTarget): void;
  /** Instant tab swap for the universal header — always jumps to the hub root on that tab, discarding any deeper stack (same as clicking a tab in a normal app tab bar). */
  setHubTab(tab: HubTab): void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  stack: [{ screen: 'hub', tab: 'home' }],
  navigateTo: (target) => set({ stack: [...get().stack, target] }),
  goBack: () =>
    set((state) => (state.stack.length > 1 ? { stack: state.stack.slice(0, -1) } : state)),
  resetTo: (target) => set({ stack: [target] }),
  setHubTab: (tab) => set({ stack: [{ screen: 'hub', tab }] }),
}));

/** Selector helper — current screen is always the top of the stack. */
export function selectCurrentScreen(state: NavigationState): NavigationTarget {
  return state.stack[state.stack.length - 1];
}

export const useCurrentScreen = (): NavigationTarget => useNavigationStore(selectCurrentScreen);
export const useCanGoBack = (): boolean => useNavigationStore((state) => state.stack.length > 1);

/**
 * Which header tab (if any) should read as "active" for a given screen.
 * Deep sub-flows reached from a tab (e.g. Deck Select from Play, Deck
 * Builder from Decks) keep that tab highlighted even though they're pushed
 * screens, not the hub itself — this is the "move the header selector to
 * Play or Decks" behavior.
 */
export function resolveHeaderTab(target: NavigationTarget): HubTab | null {
  switch (target.screen) {
    case 'hub':
      return target.tab;
    case 'main-menu':
      return 'home';
    case 'play-menu':
      return 'play';
    case 'saved-decks':
      return 'decks';
    case 'deck-select':
    case 'cpu-deck-select':
    case 'casual-lobby':
    case 'ranked':
      return 'play';
    case 'deck-builder':
    case 'card-library':
      return 'decks';
    case 'profile':
      return 'social';
    case 'settings':
    case 'debug-tools':
    case 'credits':
      return 'settings';
    default:
      return null;
  }
}

export const useHeaderTab = (): HubTab | null => useNavigationStore((state) => resolveHeaderTab(selectCurrentScreen(state)));
