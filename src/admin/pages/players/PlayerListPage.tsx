import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { fetchPlayers } from '../../net/playerAdminClient';
import { AdminApiError } from '../../net/shared';
import { AdminBadge, AdminButton, AdminInput } from '../../components/ui';
import type { AdminPlayerSummary } from '../../../../shared/admin';

function statusTone(status: AdminPlayerSummary['moderationStatus']): 'good' | 'warn' | 'bad' | 'neutral' {
  if (status === 'active') return 'good';
  if (status === 'warned') return 'warn';
  if (status === 'suspended' || status === 'deleted') return 'bad';
  return 'neutral';
}

export function PlayerListPage() {
  const token = useAdminAuthStore((s) => s.token)!;
  const [players, setPlayers] = useState<AdminPlayerSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(reset: boolean): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPlayers(token, { cursor: reset ? null : cursor, q: query.trim() || undefined });
      setPlayers((prev) => (reset ? page.players : [...prev, ...page.players]));
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load players.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-white">Player Data</h1>

      <div className="mb-4 flex gap-2">
        <AdminInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load(true)}
          placeholder="Search by username…"
          className="w-64"
        />
        <AdminButton variant="secondary" onClick={() => void load(true)} disabled={loading}>
          Search
        </AdminButton>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Username</th>
              <th className="px-3 py-2 font-semibold">Email</th>
              <th className="px-3 py-2 font-semibold">Joined</th>
              <th className="px-3 py-2 font-semibold">Last active</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.userId} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="px-3 py-2">
                  <Link to={`/admin/players/${player.userId}`} className="text-sky-400 hover:underline">
                    {player.username}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-300">{player.email}</td>
                <td className="px-3 py-2 text-slate-400">{new Date(player.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-slate-400">{player.lastActiveAt ? new Date(player.lastActiveAt).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2">
                  <AdminBadge tone={statusTone(player.moderationStatus)}>{player.moderationStatus}</AdminBadge>
                </td>
              </tr>
            ))}
            {players.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No players found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {cursor && (
        <div className="mt-3">
          <AdminButton variant="secondary" onClick={() => void load(false)} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </AdminButton>
        </div>
      )}
    </div>
  );
}
