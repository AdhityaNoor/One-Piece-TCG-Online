import { create } from 'zustand';
import type {
  AchievementView,
  CosmeticInventoryEntry,
  FriendRequestSummary,
  FriendSummary,
  ProfileHeaderResponse,
  ProfileMatchHistoryPage,
  ProfilePrivacySettings,
  PrivateAccountSettings,
  StatisticsSummary,
  UpdateProfileRequest,
} from '../../../shared/profile';
import {
  fetchAchievements,
  fetchCosmeticInventory,
  fetchMatchHistory,
  fetchOwnAccount,
  fetchOwnProfile,
  fetchPublicProfile,
  fetchSocial,
  fetchStatistics,
  updatePrivacy,
  updateProfile,
} from '../../multiplayer/net/profileClient';
import { useAuthStore } from './authStore';

export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ProfileSocialState {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  blockedCount: number;
}

interface ProfileState {
  status: ProfileLoadStatus;
  header: ProfileHeaderResponse | null;
  statistics: StatisticsSummary | null;
  history: ProfileMatchHistoryPage | null;
  achievements: AchievementView[];
  cosmetics: CosmeticInventoryEntry[];
  social: ProfileSocialState | null;
  account: PrivateAccountSettings | null;
  error: string | null;
  sectionErrors: Record<string, string>;

  loadOwn(localDeckCount?: number): Promise<void>;
  loadPublic(username: string): Promise<void>;
  saveProfile(patch: UpdateProfileRequest): Promise<void>;
  savePrivacy(privacy: Partial<ProfilePrivacySettings>): Promise<void>;
  clear(): void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  status: 'idle',
  header: null,
  statistics: null,
  history: null,
  achievements: [],
  cosmetics: [],
  social: null,
  account: null,
  error: null,
  sectionErrors: {},

  async loadOwn(localDeckCount) {
    set({ status: 'loading', error: null, sectionErrors: {} });
    try {
      const token = requireToken();
      const header = await fetchOwnProfile(token);
      set({ header, status: 'ready' });
      await loadSections(set, token, undefined, header, localDeckCount);
    } catch (cause) {
      set({ status: 'error', error: message(cause) });
    }
  },

  async loadPublic(username) {
    set({ status: 'loading', error: null, sectionErrors: {} });
    try {
      const token = requireToken();
      const header = await fetchPublicProfile(token, username);
      set({ header, status: 'ready' });
      await loadSections(set, token, username, header);
    } catch (cause) {
      set({ status: 'error', error: message(cause) });
    }
  },

  async saveProfile(patch) {
    try {
      const header = await updateProfile(requireToken(), patch);
      set({ header, error: null });
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  async savePrivacy(privacy) {
    try {
      const response = await updatePrivacy(requireToken(), { privacy });
      const header = get().header;
      set({ header: header ? { ...header, privacy: response.privacy } : header, error: null });
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  clear() {
    set({
      status: 'idle',
      header: null,
      statistics: null,
      history: null,
      achievements: [],
      cosmetics: [],
      social: null,
      account: null,
      error: null,
      sectionErrors: {},
    });
  },
}));

type SetFn = (partial: Partial<ProfileState>) => void;

async function loadSections(
  set: SetFn,
  token: string,
  username: string | undefined,
  header: ProfileHeaderResponse,
  localDeckCount?: number,
): Promise<void> {
  const sectionErrors: Record<string, string> = {};

  const load = async <T>(key: string, task: Promise<T>, apply: (value: T) => void): Promise<void> => {
    try {
      apply(await task);
    } catch (cause) {
      sectionErrors[key] = message(cause);
    }
  };

  await Promise.all([
    header.visibleSections.includes('statistics')
      ? load('statistics', fetchStatistics(token, username), (value) => set({ statistics: value.statistics }))
      : Promise.resolve(set({ statistics: null })),
    header.visibleSections.includes('match_history')
      ? load('history', fetchMatchHistory(token, { username, limit: 20 }), (value) => set({ history: value }))
      : Promise.resolve(set({ history: { entries: [], nextCursor: null } })),
    header.visibleSections.includes('achievements')
      ? load('achievements', fetchAchievements(token, username, localDeckCount), (value) => set({ achievements: value.achievements }))
      : Promise.resolve(set({ achievements: [] })),
    header.isOwner
      ? load('cosmetics', fetchCosmeticInventory(token), (value) => set({ cosmetics: value.inventory }))
      : Promise.resolve(set({ cosmetics: [] })),
    header.isOwner ? load('account', fetchOwnAccount(token), (value) => set({ account: value.account })) : Promise.resolve(set({ account: null })),
    header.isOwner ? load('social', fetchSocial(token), (value) => set({ social: value })) : Promise.resolve(set({ social: null })),
  ]);

  set({ sectionErrors });
}

function requireToken(): string {
  const token = useAuthStore.getState().token;
  if (!token) throw new Error('You must be signed in to view profiles.');
  return token;
}

function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Profile request failed.';
}

