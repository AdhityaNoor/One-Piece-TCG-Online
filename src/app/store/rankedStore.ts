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

interface RankedState {
  status: RankedLoadStatus;
  enabled: boolean;
  ranks: RankedRankDefinition[];
  labels: Record<string, string>;
  season: RankedSeasonConfig | null;
  profile: PublicRankedProfile | null;
  queue: RankedQueueStatus | null;
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

export const useRankedStore = create<RankedState>((set) => ({
  status: 'idle',
  enabled: false,
  ranks: [],
  labels: {},
  season: null,
  profile: null,
  queue: null,
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
    set({ error: null });
    try {
      const queue = await joinRankedQueue(requireToken(), deck);
      set({ queue });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not join ranked queue.' });
    }
  },

  async leaveQueue() {
    set({ error: null });
    try {
      const queue = await leaveRankedQueue(requireToken());
      set({ queue });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : 'Could not leave ranked queue.' });
    }
  },
}));

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('You must be signed in to use ranked mode.');
  return token;
}

