import { useEffect, useState } from 'react';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { createBanner, deleteBanner, fetchAdminBanners, updateBanner } from '../../net/bannerAdminClient';
import { AdminApiError } from '../../net/shared';
import { AdminBadge, AdminButton, AdminInput, AdminTextarea } from '../../components/ui';
import type { AdminHomeBanner, SaveHomeBannerRequest } from '../../../../shared/admin';

const EMPTY_FORM: SaveHomeBannerRequest = { title: '', caption: '', imageUrl: '', linkUrl: '', active: true, sortOrder: 0 };

export function BannerListPage() {
  const token = useAdminAuthStore((s) => s.token)!;
  const [banners, setBanners] = useState<AdminHomeBanner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SaveHomeBannerRequest>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  async function load(): Promise<void> {
    try {
      const { banners: list } = await fetchAdminBanners(token);
      setBanners(list);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load banners.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startEdit(banner: AdminHomeBanner): void {
    setEditingId(banner.id);
    setForm({ title: banner.title, caption: banner.caption, imageUrl: banner.imageUrl ?? '', linkUrl: banner.linkUrl ?? '', active: banner.active, sortOrder: banner.sortOrder });
  }

  function startNew(): void {
    setEditingId('new');
    setForm(EMPTY_FORM);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (editingId && editingId !== 'new') {
        await updateBanner(token, editingId, form);
      } else {
        await createBanner(token, form);
      }
      cancelEdit();
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not save banner.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteBanner(token, id);
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not delete banner.');
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Banner & News Management</h1>
        <AdminButton onClick={startNew}>New banner</AdminButton>
      </div>
      <p className="mb-4 text-sm text-white/55">Active banners appear on the player home screen, ordered by sort order (lower first).</p>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      {editingId && (
        <div className="mb-5 rounded-lg border border-[rgb(var(--op-gold-rgb)/0.18)] bg-[rgb(var(--op-gold-rgb)/0.06)] p-4">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/55">{editingId === 'new' ? 'New banner' : 'Edit banner'}</p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Title</label>
              <AdminInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Caption</label>
              <AdminTextarea value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} rows={2} className="w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Image URL</label>
                <AdminInput value={form.imageUrl ?? ''} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" className="w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Link URL</label>
                <AdminInput value={form.linkUrl ?? ''} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://…" className="w-full" />
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/55">Sort order</label>
                <AdminInput type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} className="w-24" />
              </div>
              <label className="flex items-center gap-2 pb-2 text-sm text-white/75">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <AdminButton onClick={() => void handleSave()} disabled={busy || !form.title.trim() || !form.caption.trim()}>
                Save
              </AdminButton>
              <AdminButton variant="secondary" onClick={cancelEdit} disabled={busy}>
                Cancel
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[rgb(var(--op-gold-rgb)/0.18)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgb(var(--op-gold-rgb)/0.08)] text-white/55">
            <tr>
              <th className="px-3 py-2 font-semibold">Title</th>
              <th className="px-3 py-2 font-semibold">Caption</th>
              <th className="px-3 py-2 font-semibold">Sort</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {banners.map((banner) => (
              <tr key={banner.id} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)]">
                <td className="px-3 py-2 text-white/90">{banner.title}</td>
                <td className="max-w-xs truncate px-3 py-2 text-white/55">{banner.caption}</td>
                <td className="px-3 py-2 text-white/55">{banner.sortOrder}</td>
                <td className="px-3 py-2">
                  <AdminBadge tone={banner.active ? 'good' : 'neutral'}>{banner.active ? 'Active' : 'Inactive'}</AdminBadge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => startEdit(banner)} className="mr-3 text-xs text-[rgb(var(--op-gold-rgb))] hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => void handleDelete(banner.id)} className="text-xs text-red-400 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-white/40">
                  No banners yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
