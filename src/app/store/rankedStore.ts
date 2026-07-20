import { create } from 'zustand';
import type {
  PublicRankedProfile,
  RankedLeaderboardEntry,
  RankedMatchHistoryEntry,
  RankedQueueStatus,
  RankedRankDefinition,
  RankedSeasonConfig,
} from '../../../shared/ranked';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import {
  fetchRankedConfig,
  fetchRankedHistory,
  fetchRankedLeaderboard,
  fetchRankedProfile,
  fetchRankedQueueStatus,
  joinRankedQueue,
  leaveRankedQueue,
} from '../../multiplayer/net/rankedClient';
import { useAuthStore } from './authStore';

export type RankedLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
// Tracks an in-flight join/leave request so the UI can disable the trigger button
// and show a "Searching..." / "Leaving..." state instead of allowing repeat clicks.
export type RankedQueueAction = 'idle' | 'joining' | 'leaving';

interface RankedState {
  status: RankedLoadStatus;
  enabled: boolean;
  ranks: RankedRankDefinition[];
  labels: Record<string, string>;
  season: RankedSeasonConfig | null;
  profile: PublicRankedProfile | null;
  queue: RankedQueueStatus | null;
  queueAction: RankedQueueAction;
  leaderboard: RankedLeaderboardEntry[];
  history: RankedMatchHistoryEntry[];
  selectedDeckId: string | null;
  error: string | null;

  selectDeck(deckId: string | null): void;
  refresh(): Promise<void>;
  refreshQueue(): Promise<void>;
  joinQueue(deck: SavedDeck): Promise<void>;
  leaveQueue(): Promise<void>;
}

export const useRankedStore = create<RankedState>((set, get) => ({
  status: 'idle',
  enabled: false,
  ranks: [],
  labels: {},
  season: null,
  profile: null,
  queue: null,
  queueAction: 'idle',
  leaderboard: [],
  history: [],
  selectedDeckId: null,
  error: null,

  selectDeck(deckId) {
    set({ selectedDeckId: deckId });
  },

  async refresh() {
    set({ status: 'loading', error: null });
    try {
      const token = requireToken();
      const [config, profile, leaderboard, history] = await Promise.all([
        fetchRankedConfig(token),
        fetchRankedProfile(token),
        fetchRankedLeaderboard(token),
        fetchRankedHistory(token),
      ]);
      let queue: RankedQueueStatus | null = null;
      try {
        queue = await fetchRankedQueueStatus(token);
      } catch {
        queue = null;
      }
      set({
        status: 'ready',
        enabled: config.enabled,
        ranks: config.ranks,
        labels: config.labels,
        season: profile.season,
        profile: profile.profile,
        leaderboard,
        history,
        queue,
        error: null,
      });
    } catch (cause) {
      set({ status: 'error', error: cause instanceof Error ? cause.message : 'Could not load ranked mode.' });
    }
  },

  async refreshQueue() {
    try {
      const queue = await fetchRankedQueueStatus(requireToken());
      set({ queue, error: null });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not refresh queue status.' });
    }
  },

  async joinQueue(deck) {
    // Guard against spam-clicking "Set Sail": ignore re-entrant calls while a
    // join is already in flight instead of firing duplicate requests that the
    // server would just reject with a queue conflict.
    if (get().queueAction !== 'idle') return;
    set({ error: null, queueAction: 'joining' });
    try {
      const queue = await joinRankedQueue(requireToken(), deck);
      set({ queue, queueAction: 'idle' });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not join ranked queue.', queueAction: 'idle' });
    }
  },

  async leaveQueue() {
    if (get().queueAction !== 'idle') return;
    set({ error: null, queueAction: 'leaving' });
    try {
      const queue = await leaveRankedQueue(requireToken());
      set({ queue, queueAction: 'idle' });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not leave ranked queue.', queueAction: 'idle' });
    }
  },
}));

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('You must be signed in to use ranked mode.');
  return token;
}

