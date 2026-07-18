/**
 * Card legality override CRUD. See models/cardLegalityOverride.ts doc
 * comment: this is a live override layer on top of the generated static
 * legality registry; the deck builder doesn't consult it yet (known
 * limitation, documented there and in the final summary).
 */
import { useEffect, useState } from 'react';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { fetchCardLegalityOverrides, removeCardLegalityOverride, setCardLegalityOverride } from '../../net/cardLegalityClient';
import { AdminApiError } from '../../net/shared';
import { AdminBadge, AdminButton, AdminInput, AdminSelect } from '../../components/ui';
import type { AdminCardLegalityOverride, CardLegalityStatus } from '../../../../shared/admin';

function tone(status: CardLegalityStatus): 'good' | 'warn' | 'bad' {
  if (status === 'legal') return 'good';
  if (status === 'extraLegal') return 'warn';
  return 'bad';
}

export function CardLegalityTab() {
  const token = useAdminAuthStore((s) => s.token)!;
  const [overrides, setOverrides] = useState<AdminCardLegalityOverride[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [status, setStatus] = useState<CardLegalityStatus>('banned');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(): Promise<void> {
    try {
      const { overrides: list } = await fetchCardLegalityOverrides(token);
      setOverrides(list);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load overrides.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(): Promise<void> {
    if (!cardNumber.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await setCardLegalityOverride(token, cardNumber.trim(), { status, note: note.trim() || null });
      setCardNumber('');
      setNote('');
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not save override.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(target: string): Promise<void> {
    setBusy(true);
    try {
      await removeCardLegalityOverride(token, target);
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not remove override.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-white/55">
        These overrides are stored and served from the admin API, but the deck builder's own legality checks don't read them yet — see known
        limitations.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded border border-[rgb(var(--op-gold-rgb)/0.18)] bg-[rgb(var(--op-gold-rgb)/0.06)] p-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Card number</label>
          <AdminInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="OP01-001" className="w-32" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Status</label>
          <AdminSelect value={status} onChange={(e) => setStatus(e.target.value as CardLegalityStatus)}>
            <option value="legal">Legal</option>
            <option value="extraLegal">Extra Legal</option>
            <option value="banned">Banned</option>
          </AdminSelect>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Note</label>
          <AdminInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional ruling note…" className="w-full" />
        </div>
        <AdminButton onClick={() => void handleSave()} disabled={busy || !cardNumber.trim()}>
          Save
        </AdminButton>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-[rgb(var(--op-gold-rgb)/0.18)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgb(var(--op-gold-rgb)/0.08)] text-white/55">
            <tr>
              <th className="px-3 py-2 font-semibold">Card</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Note</th>
              <th className="px-3 py-2 font-semibold">Updated</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {overrides.map((override) => (
              <tr key={override.cardNumber} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)]">
                <td className="px-3 py-2 font-mono text-white/90">{override.cardNumber}</td>
                <td className="px-3 py-2">
                  <AdminBadge tone={tone(override.status)}>{override.status}</AdminBadge>
                </td>
                <td className="px-3 py-2 text-white/55">{override.note ?? '—'}</td>
                <td className="px-3 py-2 text-white/40">{new Date(override.updatedAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => void handleRemove(override.cardNumber)} className="text-xs text-red-400 hover:underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {overrides.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/40">
                  No overrides set.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
