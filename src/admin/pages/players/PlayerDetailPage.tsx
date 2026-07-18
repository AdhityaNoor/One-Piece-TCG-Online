import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { banPlayer, fetchPlayerDecks, fetchPlayerDetail, fetchPlayerMatchHistory, unbanPlayer } from '../../net/playerAdminClient';
import { AdminApiError } from '../../net/shared';
import { AdminBadge, AdminButton, AdminCard, AdminTextarea } from '../../components/ui';
import type { AdminPlayerDeckSummary, AdminPlayerDetail } from '../../../../shared/admin';
import type { ProfileMatchHistoryEntry } from '../../../../shared/profile';

export function PlayerDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const token = useAdminAuthStore((s) => s.token)!;

  const [detail, setDetail] = useState<AdminPlayerDetail | null>(null);
  const [decks, setDecks] = useState<AdminPlayerDeckSummary[]>([]);
  const [matches, setMatches] = useState<ProfileMatchHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banBusy, setBanBusy] = useState(false);

  async function loadAll(): Promise<void> {
    if (!userId) return;
    setError(null);
    try {
      const [detailRes, decksRes, historyRes] = await Promise.all([
        fetchPlayerDetail(token, userId),
        fetchPlayerDecks(token, userId),
        fetchPlayerMatchHistory(token, userId),
      ]);
      setDetail(detailRes);
      setDecks(decksRes.decks);
      setMatches(historyRes.entries);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load player.');
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleBan(): Promise<void> {
    if (!userId) return;
    setBanBusy(true);
    try {
      await banPlayer(token, userId, { reason: banReason.trim() || 'Banned by admin.' });
      setBanReason('');
      await loadAll();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not ban player.');
    } finally {
      setBanBusy(false);
    }
  }

  async function handleUnban(): Promise<void> {
    if (!userId) return;
    setBanBusy(true);
    try {
      await unbanPlayer(token, userId);
      await loadAll();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not unban player.');
    } finally {
      setBanBusy(false);
    }
  }

  if (error && !detail) return <p className="text-sm text-red-400">{error}</p>;
  if (!detail) return <p className="text-white/55">Loading…</p>;

  const isSuspended = detail.moderationStatus === 'suspended';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link to="/admin/players" className="text-sm text-[rgb(var(--op-gold-rgb))] hover:underline">
          ← Back to Player Data
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{detail.username}</h1>
          <p className="text-sm text-white/55">{detail.email}</p>
        </div>
        <AdminBadge tone={isSuspended ? 'bad' : 'good'}>{detail.moderationStatus}</AdminBadge>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <AdminCard>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/55">Info</p>
        <dl className="grid grid-cols-2 gap-2 text-sm text-white/90">
          <dt className="text-white/40">Display name</dt>
          <dd>{detail.displayName || '—'}</dd>
          <dt className="text-white/40">Region</dt>
          <dd>{detail.region || '—'}</dd>
          <dt className="text-white/40">Favorite leader</dt>
          <dd>{detail.favoriteLeaderCardNumber || '—'}</dd>
          <dt className="text-white/40">Joined</dt>
          <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
          <dt className="text-white/40">Last active</dt>
          <dd>{detail.lastActiveAt ? new Date(detail.lastActiveAt).toLocaleString() : '—'}</dd>
        </dl>

        <div className="mt-4 border-t border-[rgb(var(--op-gold-rgb)/0.18)] pt-4">
          {isSuspended ? (
            <AdminButton variant="secondary" onClick={() => void handleUnban()} disabled={banBusy}>
              {banBusy ? 'Unbanning…' : 'Unban player'}
            </AdminButton>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Ban reason</label>
                <AdminTextarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={2} className="w-full" placeholder="Reason shown in the moderation audit log…" />
              </div>
              <AdminButton variant="danger" onClick={() => void handleBan()} disabled={banBusy}>
                {banBusy ? 'Banning…' : 'Ban player'}
              </AdminButton>
            </div>
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/55">Decks ({decks.length})</p>
        {decks.length === 0 ? (
          <p className="text-sm text-white/40">
            No decks visible to admin. Casual / local-hotseat / VS-CPU decks never reach the server — only featured-profile decks and ranked-match
            snapshots are visible here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {decks.map((deck) => (
              <li key={`${deck.source}-${deck.deckId}`} className="flex items-center justify-between rounded border border-[rgb(var(--op-gold-rgb)/0.18)] px-3 py-2 text-sm">
                <span className="text-white/90">
                  {deck.name} {deck.leaderName && <span className="text-white/40">— {deck.leaderName}</span>}
                </span>
                <span className="text-xs text-white/40">
                  {deck.source === 'featured' ? 'Featured on profile' : 'Ranked match snapshot'} · {new Date(deck.capturedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      <AdminCard>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/55">Match History ({matches.length})</p>
        {matches.length === 0 ? (
          <p className="text-sm text-white/40">No matches recorded.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-white/40">
              <tr>
                <th className="py-1 pr-3 font-semibold">Type</th>
                <th className="py-1 pr-3 font-semibold">Result</th>
                <th className="py-1 pr-3 font-semibold">Opponent</th>
                <th className="py-1 pr-3 font-semibold">Ended</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.matchId} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)]">
                  <td className="py-1.5 pr-3 text-white/75">{match.matchType}</td>
                  <td className="py-1.5 pr-3">
                    <AdminBadge tone={match.result === 'win' ? 'good' : match.result === 'loss' ? 'bad' : 'neutral'}>{match.result}</AdminBadge>
                  </td>
                  <td className="py-1.5 pr-3 text-white/75">{match.opponentName ?? '—'}</td>
                  <td className="py-1.5 pr-3 text-white/55">{match.endedAt ? new Date(match.endedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </div>
  );
}
