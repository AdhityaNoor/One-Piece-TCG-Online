import type { AdminPlayerDeckSummary, AdminPlayerDetail, AdminPlayerListPage, BanPlayerRequest } from '../../../shared/admin';
import type { ProfileMatchHistoryPage } from '../../../shared/profile';
import { adminAuthHeaders, adminUrl, parseAdminOrThrow } from './shared';

export async function fetchPlayers(token: string, options: { cursor?: string | null; limit?: number; q?: string } = {}): Promise<AdminPlayerListPage> {
  const params = new URLSearchParams();
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.q) params.set('q', options.q);
  const query = params.toString();
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/players${query ? `?${query}` : ''}`), { headers: adminAuthHeaders(token) }));
}

export async function fetchPlayerDetail(token: string, userId: string): Promise<AdminPlayerDetail> {
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/players/${encodeURIComponent(userId)}`), { headers: adminAuthHeaders(token) }));
}

export async function fetchPlayerDecks(token: string, userId: string): Promise<{ decks: AdminPlayerDeckSummary[] }> {
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/players/${encodeURIComponent(userId)}/decks`), { headers: adminAuthHeaders(token) }));
}

export async function fetchPlayerMatchHistory(token: string, userId: string, cursor: string | null = null): Promise<ProfileMatchHistoryPage> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/players/${encodeURIComponent(userId)}/match-history${query}`), { headers: adminAuthHeaders(token) }));
}

export async function banPlayer(token: string, userId: string, body: BanPlayerRequest): Promise<void> {
  await parseAdminOrThrow(
    await fetch(adminUrl(`/admin/players/${encodeURIComponent(userId)}/ban`), { method: 'POST', headers: adminAuthHeaders(token), body: JSON.stringify(body) }),
  );
}

export async function unbanPlayer(token: string, userId: string): Promise<void> {
  await parseAdminOrThrow(await fetch(adminUrl(`/admin/players/${encodeURIComponent(userId)}/unban`), { method: 'POST', headers: adminAuthHeaders(token) }));
}
