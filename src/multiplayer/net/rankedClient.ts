import type {
  PublicRankedProfile,
  RankedLeaderboardEntry,
  RankedMatchHistoryEntry,
  RankedQueueStatus,
  RankedRankDefinition,
  RankedSeasonConfig,
} from '../../../shared/ranked';
import type { SavedDeck } from '../../cards/decks/savedDeck';
import { apiBaseUrl } from './backendConfig';

export class RankedApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'RankedApiError';
  }
}

export interface RankedConfigResponse {
  enabled: boolean;
  ranks: RankedRankDefinition[];
  labels: Record<string, string>;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = body as { error?: string; code?: string; details?: unknown };
    throw new RankedApiError(err.error ?? `Request failed (${res.status}).`, err.code ?? 'INTERNAL', res.status, err.details);
  }
  return body as T;
}

function url(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

function authHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

export async function fetchRankedConfig(token: string): Promise<RankedConfigResponse> {
  const res = await fetch(url('/ranked/config'), { headers: authHeaders(token) });
  return parseOrThrow<RankedConfigResponse>(res);
}

export async function fetchRankedProfile(token: string): Promise<{ profile: PublicRankedProfile; season: RankedSeasonConfig }> {
  const res = await fetch(url('/ranked/profile'), { headers: authHeaders(token) });
  return parseOrThrow<{ profile: PublicRankedProfile; season: RankedSeasonConfig }>(res);
}

export async function joinRankedQueue(token: string, deck: SavedDeck): Promise<RankedQueueStatus> {
  const res = await fetch(url('/ranked/queue/join'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ deck, region: 'global' }),
  });
  const body = await parseOrThrow<{ status: RankedQueueStatus }>(res);
  return body.status;
}

export async function leaveRankedQueue(token: string): Promise<RankedQueueStatus> {
  const res = await fetch(url('/ranked/queue/leave'), { method: 'POST', headers: authHeaders(token), body: '{}' });
  const body = await parseOrThrow<{ status: RankedQueueStatus }>(res);
  return body.status;
}

export async function fetchRankedQueueStatus(token: string): Promise<RankedQueueStatus> {
  const res = await fetch(url('/ranked/queue/status'), { headers: authHeaders(token) });
  const body = await parseOrThrow<{ status: RankedQueueStatus }>(res);
  return body.status;
}

export async function fetchRankedLeaderboard(token: string): Promise<RankedLeaderboardEntry[]> {
  const res = await fetch(url('/ranked/leaderboard?limit=50'), { headers: authHeaders(token) });
  const body = await parseOrThrow<{ entries: RankedLeaderboardEntry[] }>(res);
  return body.entries;
}

export async function fetchRankedHistory(token: string): Promise<RankedMatchHistoryEntry[]> {
  const res = await fetch(url('/ranked/history'), { headers: authHeaders(token) });
  const body = await parseOrThrow<{ entries: RankedMatchHistoryEntry[] }>(res);
  return body.entries;
}

