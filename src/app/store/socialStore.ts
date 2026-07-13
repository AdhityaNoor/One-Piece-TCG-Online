/**
 * Friend list + player search state for the Social tab. Thin wrapper over
 * profileClient's social endpoints (server/src/profile/routes.ts) — same
 * "one store per domain" pattern as profileStore.ts, kept separate because
 * the Social tab needs to search independently of loading any one profile.
 *
 * KNOWN LIMITATION: block/unblock/report are wired in profileClient but not
 * surfaced here yet — this pass only covers friend list + search per the
 * project brief. Add them here (not a new store) when that UI is needed.
 */
import { create } from 'zustand';
import type { FriendRequestSummary, FriendSummary } from '../../../shared/profile';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchSocial,
  removeFriend,
  searchPlayers,
  sendFriendRequest,
} from '../../multiplayer/net/profileClient';
import { useAuthStore } from './authStore';

export type SocialLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error';

interface SearchResult {
  userId: string;
  username: string;
}

interface SocialState {
  status: SocialLoadStatus;
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  blockedCount: number;
  error: string | null;

  searchQuery: string;
  searchStatus: SearchStatus;
  searchResults: SearchResult[];
  searchError: string | null;

  /** username -> in-flight action, so a row can show a spinner without a global lock. */
  pendingActions: Record<string, boolean>;

  load(): Promise<void>;
  search(query: string): Promise<void>;
  clearSearch(): void;
  addFriend(username: string): Promise<void>;
  accept(username: string): Promise<void>;
  decline(username: string): Promise<void>;
  remove(username: string): Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  status: 'idle',
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  blockedCount: 0,
  error: null,

  searchQuery: '',
  searchStatus: 'idle',
  searchResults: [],
  searchError: null,

  pendingActions: {},

  async load() {
    if (!isBackendConfigured()) {
      set({ status: 'error', error: 'Set VITE_API_BASE_URL to use social features.' });
      return;
    }
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ status: 'error', error: 'Sign in to see your friends.' });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const social = await fetchSocial(token);
      set({
        status: 'ready',
        friends: social.friends,
        incomingRequests: social.incomingRequests,
        outgoingRequests: social.outgoingRequests,
        blockedCount: social.blockedCount,
      });
    } catch (cause) {
      set({ status: 'error', error: message(cause) });
    }
  },

  async search(query) {
    set({ searchQuery: query });
    const trimmed = query.trim();
    if (!trimmed) {
      set({ searchStatus: 'idle', searchResults: [], searchError: null });
      return;
    }
    const token = useAuthStore.getState().token;
    if (!token) {
      set({ searchStatus: 'error', searchError: 'Sign in to search for players.' });
      return;
    }
    set({ searchStatus: 'searching', searchError: null });
    try {
      const response = await searchPlayers(token, trimmed);
      // Stale-response guard: only apply if this is still the latest query.
      if (get().searchQuery.trim() !== trimmed) return;
      set({ searchStatus: 'ready', searchResults: response.results });
    } catch (cause) {
      if (get().searchQuery.trim() !== trimmed) return;
      set({ searchStatus: 'error', searchError: message(cause) });
    }
  },

  clearSearch() {
    set({ searchQuery: '', searchStatus: 'idle', searchResults: [], searchError: null });
  },

  async addFriend(username) {
    await withPendingAction(set, get, username, async (token) => {
      await sendFriendRequest(token, username);
      set((state) => ({
        outgoingRequests: [...state.outgoingRequests, { userId: username, username, requestedAt: new Date().toISOString() }],
        searchResults: state.searchResults.filter((entry) => entry.username !== username),
      }));
    });
  },

  async accept(username) {
    await withPendingAction(set, get, username, async (token) => {
      await acceptFriendRequest(token, username);
      await get().load();
    });
  },

  async decline(username) {
    await withPendingAction(set, get, username, async (token) => {
      await declineFriendRequest(token, username);
      set((state) => ({ incomingRequests: state.incomingRequests.filter((entry) => entry.username !== username) }));
    });
  },

  async remove(username) {
    await withPendingAction(set, get, username, async (token) => {
      await removeFriend(token, username);
      set((state) => ({ friends: state.friends.filter((entry) => entry.username !== username) }));
    });
  },
}));

async function withPendingAction(
  set: (partial: Partial<SocialState> | ((state: SocialState) => Partial<SocialState>)) => void,
  get: () => SocialState,
  username: string,
  task: (token: string) => Promise<void>,
): Promise<void> {
  const token = useAuthStore.getState().token;
  if (!token) {
    set({ error: 'Sign in to manage friends.' });
    return;
  }
  set((state) => ({ pendingActions: { ...state.pendingActions, [username]: true } }));
  try {
    await task(token);
    set({ error: null });
  } catch (cause) {
    set({ error: message(cause) });
  } finally {
    set((state) => {
      const next = { ...state.pendingActions };
      delete next[username];
      return { pendingActions: next };
    });
  }
  void get;
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Social request failed.';
}
