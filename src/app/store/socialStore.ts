/**
 * Friend list + player search state for the Social tab. Thin wrapper over
 * profileClient's social endpoints (server/src/profile/routes.ts) — same
 * "one store per domain" pattern as profileStore.ts, kept separate because
 * the Social tab needs to search independently of loading any one profile.
 *
 * Block/unblock/report were a KNOWN LIMITATION here (wired in profileClient
 * but not surfaced) — now added alongside friends since SocialTab needs its
 * own blocked-list UI distinct from ProfileScreen's per-profile Block button.
 */
import { create } from 'zustand';
import type { BlockedPlayerSummary, FriendRequestSummary, FriendSummary, PlayerSearchResult, ReportPlayerRequest } from '../../../shared/profile';
import { isBackendConfigured } from '../../multiplayer/net/backendConfig';
import {
  acceptFriendRequest,
  blockPlayer,
  declineFriendRequest,
  fetchSocial,
  removeFriend,
  reportPlayer,
  searchPlayers,
  sendFriendRequest,
  unblockPlayer,
} from '../../multiplayer/net/profileClient';
import { useAuthStore } from './authStore';

export type SocialLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type SearchStatus = 'idle' | 'searching' | 'ready' | 'error';

type SearchResult = PlayerSearchResult;

interface SocialState {
  status: SocialLoadStatus;
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  blocked: BlockedPlayerSummary[];
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
  blockUser(username: string): Promise<void>;
  unblockUser(username: string): Promise<void>;
  reportUser(username: string, body: ReportPlayerRequest): Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  status: 'idle',
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  blocked: [],
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
        blocked: social.blocked,
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
      set((state) => {
        const avatarCatalogId = state.searchResults.find((entry) => entry.username === username)?.avatarCatalogId ?? null;
        return {
          outgoingRequests: [...state.outgoingRequests, { userId: username, username, requestedAt: new Date().toISOString(), avatarCatalogId }],
          searchResults: state.searchResults.filter((entry) => entry.username !== username),
        };
      });
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

  async blockUser(username) {
    await withPendingAction(set, get, username, async (token) => {
      await blockPlayer(token, username);
      // Server removes any existing friendship both ways on block (see
      // socialService.blockUser) — a full reload is simplest and keeps the
      // friends/requests/blocked lists mutually consistent.
      await get().load();
      set((state) => ({ searchResults: state.searchResults.filter((entry) => entry.username !== username) }));
    });
  },

  async unblockUser(username) {
    await withPendingAction(set, get, username, async (token) => {
      await unblockPlayer(token, username);
      set((state) => ({ blocked: state.blocked.filter((entry) => entry.username !== username), blockedCount: Math.max(0, state.blockedCount - 1) }));
    });
  },

  async reportUser(username, body) {
    await withPendingAction(set, get, username, async (token) => {
      await reportPlayer(token, username, body);
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
