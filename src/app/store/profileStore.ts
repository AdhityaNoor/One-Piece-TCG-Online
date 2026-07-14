import { create } from 'zustand';
import type {
  AchievementView,
  BlockedPlayerSummary,
  CosmeticInventoryEntry,
  CosmeticType,
  EquippedCosmetics,
  FriendRequestSummary,
  FriendSummary,
  ProfileHeaderResponse,
  ProfileMatchHistoryPage,
  ProfilePrivacySettings,
  PrivateAccountSettings,
  ReportPlayerRequest,
  StatisticsSummary,
  UpdateProfileRequest,
} from '../../../shared/profile';
import {
  blockPlayer,
  equipCosmetic as equipCosmeticRequest,
  fetchAchievements,
  fetchCosmeticInventory,
  fetchMatchHistory,
  fetchOwnAccount,
  fetchOwnProfile,
  fetchPublicProfile,
  fetchSocial,
  fetchStatistics,
  reportPlayer,
  unblockPlayer,
  unequipCosmetic as unequipCosmeticRequest,
  updatePrivacy,
  updateProfile,
} from '../../multiplayer/net/profileClient';
import { useAuthStore } from './authStore';

export type ProfileLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ProfileSocialState {
  friends: FriendSummary[];
  incomingRequests: FriendRequestSummary[];
  outgoingRequests: FriendRequestSummary[];
  blocked: BlockedPlayerSummary[];
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
  /** Equip an owned cosmetic (avatar/banner/etc). Own-profile only — server enforces ownership regardless. */
  equip(itemId: string, slot: CosmeticType): Promise<void>;
  unequip(slot: CosmeticType): Promise<void>;
  refreshSocial(): Promise<void>;
  blockUser(username: string): Promise<void>;
  unblockUser(username: string): Promise<void>;
  reportUser(username: string, body: ReportPlayerRequest): Promise<void>;
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

  async equip(itemId, slot) {
    try {
      const { equippedCosmetics } = await equipCosmeticRequest(requireToken(), { itemId, slot });
      applyEquippedCosmetics(set, get, equippedCosmetics);
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  async unequip(slot) {
    try {
      const { equippedCosmetics } = await unequipCosmeticRequest(requireToken(), slot);
      applyEquippedCosmetics(set, get, equippedCosmetics);
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  async refreshSocial() {
    try {
      const social = await fetchSocial(requireToken());
      set({ social });
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  async blockUser(username) {
    try {
      await blockPlayer(requireToken(), username);
      await get().refreshSocial();
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  async unblockUser(username) {
    try {
      await unblockPlayer(requireToken(), username);
      await get().refreshSocial();
    } catch (cause) {
      set({ error: message(cause) });
    }
  },

  async reportUser(username, body) {
    try {
      await reportPlayer(requireToken(), username, body);
      set({ error: null });
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
type GetFn = () => ProfileState;

/**
 * Applies a fresh EquippedCosmetics from an equip/unequip response to BOTH
 * places the UI reads it from: header.profile.equippedCosmetics (what
 * ProfileHeader renders) and the cosmetics inventory list's per-item
 * `equipped` flag (what CosmeticsSection renders) — updated locally instead
 * of a full refetch, mirroring cosmeticService.listInventory's own
 * equipped-set computation server-side.
 */
function applyEquippedCosmetics(set: SetFn, get: GetFn, equippedCosmetics: EquippedCosmetics): void {
  const header = get().header;
  const equippedIds = new Set(Object.values(equippedCosmetics).filter((value): value is string => Boolean(value)));
  set({
    header: header ? { ...header, profile: { ...header.profile, equippedCosmetics } } : header,
    cosmetics: get().cosmetics.map((entry) => ({ ...entry, equipped: equippedIds.has(entry.item.id) })),
    error: null,
  });
}

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
