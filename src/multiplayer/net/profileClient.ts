/**
 * Thin REST client for the backend profile surface (server/src/profile/routes.ts).
 * Same shape as rankedClient.ts / authClient.ts: typed wrappers, one
 * ProfileApiError class carrying the server's machine code, no state kept
 * here — that's profileStore's job.
 */
import type {
  AchievementView,
  BlockedPlayerSummary,
  ChangeUsernameRequest,
  CosmeticInventoryEntry,
  EquipCosmeticRequest,
  EquippedCosmetics,
  FeaturedDeckSummary,
  FriendRequestSummary,
  FriendSummary,
  PlayerSearchResult,
  ProfileApiErrorBody,
  ProfileHeaderResponse,
  ProfileMatchHistoryPage,
  ProfilePrivacySettings,
  PrivateAccountSettings,
  ReportPlayerRequest,
  StatisticsSummary,
  UpdateFeaturedAchievementsRequest,
  UpdateFeaturedDecksRequest,
  UpdatePrivacyRequest,
  UpdateProfileRequest,
} from '../../../shared/profile';
import { apiBaseUrl } from './backendConfig';

export class ProfileApiError extends Error {
  constructor(
    message: string,
    readonly code: ProfileApiErrorBody['code'],
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ProfileApiError';
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = body as Partial<ProfileApiErrorBody>;
    throw new ProfileApiError(err.error ?? `Request failed (${res.status}).`, err.code ?? 'INTERNAL', res.status, err.details);
  }
  return body as T;
}

function url(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

export async function fetchOwnProfile(token: string): Promise<ProfileHeaderResponse> {
  return parseOrThrow(await fetch(url('/profile/me'), { headers: authHeaders(token) }));
}

export async function fetchPublicProfile(token: string, username: string): Promise<ProfileHeaderResponse> {
  return parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}`), { headers: authHeaders(token) }));
}

export async function updateProfile(token: string, patch: UpdateProfileRequest): Promise<ProfileHeaderResponse> {
  return parseOrThrow(await fetch(url('/profile/me'), { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(patch) }));
}

export async function changeUsername(token: string, body: ChangeUsernameRequest): Promise<ProfileHeaderResponse> {
  return parseOrThrow(await fetch(url('/profile/me/username'), { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }));
}

export async function updatePrivacy(token: string, body: UpdatePrivacyRequest): Promise<{ privacy: ProfilePrivacySettings }> {
  return parseOrThrow(await fetch(url('/profile/me/privacy'), { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) }));
}

export async function updateFeaturedDecks(token: string, body: UpdateFeaturedDecksRequest): Promise<{ featuredDecks: FeaturedDeckSummary[] }> {
  return parseOrThrow(await fetch(url('/profile/me/featured-decks'), { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(body) }));
}

export async function updateFeaturedAchievements(token: string, body: UpdateFeaturedAchievementsRequest): Promise<{ featuredAchievementIds: string[] }> {
  return parseOrThrow(await fetch(url('/profile/me/featured-achievements'), { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(body) }));
}

export async function fetchOwnAccount(token: string): Promise<{ account: PrivateAccountSettings }> {
  return parseOrThrow(await fetch(url('/profile/me/account'), { headers: authHeaders(token) }));
}

export async function fetchStatistics(token: string, username?: string): Promise<{ statistics: StatisticsSummary | null; visible?: boolean }> {
  const path = username ? `/profile/${encodeURIComponent(username)}/statistics` : '/profile/me/statistics';
  return parseOrThrow(await fetch(url(path), { headers: authHeaders(token) }));
}

export async function fetchAchievements(token: string, username?: string, localDeckCount?: number): Promise<{ achievements: AchievementView[]; visible?: boolean }> {
  const query = username ? '' : localDeckCount !== undefined ? `?localDeckCount=${localDeckCount}` : '';
  const path = username ? `/profile/${encodeURIComponent(username)}/achievements` : `/profile/me/achievements${query}`;
  return parseOrThrow(await fetch(url(path), { headers: authHeaders(token) }));
}

export async function fetchCosmeticInventory(token: string): Promise<{ inventory: CosmeticInventoryEntry[] }> {
  return parseOrThrow(await fetch(url('/profile/me/cosmetics'), { headers: authHeaders(token) }));
}

export async function equipCosmetic(token: string, body: EquipCosmeticRequest): Promise<{ equippedCosmetics: EquippedCosmetics }> {
  return parseOrThrow(await fetch(url('/profile/me/cosmetics/equip'), { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }));
}

export async function unequipCosmetic(token: string, slot: EquipCosmeticRequest['slot']): Promise<{ equippedCosmetics: EquippedCosmetics }> {
  return parseOrThrow(await fetch(url('/profile/me/cosmetics/unequip'), { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ slot }) }));
}

export async function fetchMatchHistory(
  token: string,
  options: { username?: string; cursor?: string | null; limit?: number; matchType?: string; result?: string } = {},
): Promise<ProfileMatchHistoryPage> {
  const params = new URLSearchParams();
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.matchType) params.set('matchType', options.matchType);
  if (options.result) params.set('result', options.result);
  const query = params.toString();
  const path = options.username ? `/profile/${encodeURIComponent(options.username)}/match-history` : '/profile/me/match-history';
  return parseOrThrow(await fetch(url(`${path}${query ? `?${query}` : ''}`), { headers: authHeaders(token) }));
}

export async function fetchSocial(
  token: string,
): Promise<{ friends: FriendSummary[]; incomingRequests: FriendRequestSummary[]; outgoingRequests: FriendRequestSummary[]; blocked: BlockedPlayerSummary[]; blockedCount: number }> {
  return parseOrThrow(await fetch(url('/profile/me/social'), { headers: authHeaders(token) }));
}

export async function searchPlayers(token: string, query: string): Promise<{ results: PlayerSearchResult[] }> {
  return parseOrThrow(await fetch(url(`/profile/search?q=${encodeURIComponent(query)}`), { headers: authHeaders(token) }));
}

export async function sendFriendRequest(token: string, username: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/friend-request`), { method: 'POST', headers: authHeaders(token) }));
}

export async function acceptFriendRequest(token: string, username: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/friend-accept`), { method: 'POST', headers: authHeaders(token) }));
}

export async function declineFriendRequest(token: string, username: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/friend-decline`), { method: 'POST', headers: authHeaders(token) }));
}

export async function removeFriend(token: string, username: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/friend`), { method: 'DELETE', headers: authHeaders(token) }));
}

export async function blockPlayer(token: string, username: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/block`), { method: 'POST', headers: authHeaders(token) }));
}

export async function unblockPlayer(token: string, username: string): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/block`), { method: 'DELETE', headers: authHeaders(token) }));
}

export async function reportPlayer(token: string, username: string, body: ReportPlayerRequest): Promise<void> {
  await parseOrThrow(await fetch(url(`/profile/${encodeURIComponent(username)}/report`), { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) }));
}
