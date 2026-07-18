import { useEffect, useState } from 'react';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { createFeatureFlag, deleteFeatureFlag, fetchFeatureFlags, updateFeatureFlag } from '../../net/featureFlagClient';
import { AdminApiError } from '../../net/shared';
import { AdminBadge, AdminButton, AdminInput, AdminTextarea } from '../../components/ui';
import type { AdminFeatureFlag } from '../../../../shared/admin';

export function FeatureFlagsPage() {
  const token = useAdminAuthStore((s) => s.token)!;
  const [flags, setFlags] = useState<AdminFeatureFlag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(): Promise<void> {
    try {
      const { flags: list } = await fetchFeatureFlags(token);
      setFlags(list);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load flags.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(flag: AdminFeatureFlag): Promise<void> {
    try {
      await updateFeatureFlag(token, flag.key, { enabled: !flag.enabled });
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not update flag.');
    }
  }

  async function handleDelete(key: string): Promise<void> {
    try {
      await deleteFeatureFlag(token, key);
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not delete flag.');
    }
  }

  async function handleCreate(): Promise<void> {
    if (!newKey.trim() || !newLabel.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createFeatureFlag(token, { key: newKey.trim(), label: newLabel.trim(), description: newDescription.trim(), enabled: false });
      setNewKey('');
      setNewLabel('');
      setNewDescription('');
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not create flag.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-white">Game Management</h1>
      <p className="mb-4 text-sm text-white/55">
        Runtime feature switches, stored in Mongo and editable without a redeploy. Toggling a flag here does not yet change gameplay behavior on its
        own — wiring an individual flag into the client/server is a separate follow-up per flag (see known limitations).
      </p>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="mb-5 overflow-hidden rounded-lg border border-[rgb(var(--op-gold-rgb)/0.18)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgb(var(--op-gold-rgb)/0.08)] text-white/55">
            <tr>
              <th className="px-3 py-2 font-semibold">Key</th>
              <th className="px-3 py-2 font-semibold">Label</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {flags.map((flag) => (
              <tr key={flag.key} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)]">
                <td className="px-3 py-2 font-mono text-white/90">{flag.key}</td>
                <td className="px-3 py-2 text-white/90">{flag.label}</td>
                <td className="px-3 py-2 text-white/55">{flag.description}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => void handleToggle(flag)}>
                    <AdminBadge tone={flag.enabled ? 'good' : 'neutral'}>{flag.enabled ? 'Enabled' : 'Disabled'}</AdminBadge>
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => void handleDelete(flag.key)} className="text-xs text-red-400 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {flags.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/40">
                  No flags yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-[rgb(var(--op-gold-rgb)/0.18)] bg-[rgb(var(--op-gold-rgb)/0.06)] p-4">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/55">New flag</p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Key</label>
            <AdminInput value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="ranked_queue_enabled" className="w-56" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Label</label>
            <AdminInput value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ranked Queue" className="w-56" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Description</label>
            <AdminTextarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={1} className="w-full" />
          </div>
          <AdminButton onClick={() => void handleCreate()} disabled={busy || !newKey.trim() || !newLabel.trim()}>
            Add flag
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
