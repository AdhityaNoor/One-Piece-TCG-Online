import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { fetchBugReports, updateBugReport } from '../../net/bugReportAdminClient';
import { AdminApiError } from '../../net/shared';
import { AdminButton, AdminSelect } from '../../components/ui';
import { downloadBugReportsAsCsv, downloadBugReportsAsJson, fetchAllBugReports } from '../../lib/exportBugReports';
import type { AdminBugReportSummary, BugReportStatus, BugReportValidity } from '../../../../shared/admin';

type Tone = 'neutral' | 'good' | 'warn' | 'bad';

function validityTone(validity: BugReportValidity): Tone {
  if (validity === 'valid') return 'good';
  if (validity === 'invalid') return 'bad';
  return 'warn';
}

function statusTone(status: BugReportStatus): Tone {
  if (status === 'resolved') return 'good';
  if (status === 'open') return 'warn';
  return 'neutral';
}

/**
 * Same palette as AdminBadge's `tones` map (src/admin/components/ui.tsx) —
 * these dropdowns replaced the read-only badges but should still carry the
 * same at-a-glance color coding. Applied as inline `style` rather than
 * Tailwind classes because AdminSelect's `.op-input` base class (a
 * hand-authored CSS rule in src/app/styles/index.css, not a Tailwind
 * utility) already sets background/border/color — whichever of the two
 * single-class rules is LAST in the compiled stylesheet would otherwise win
 * regardless of className order, which is fragile. Inline style always beats
 * a class-based rule, so it's the reliable way to override op-input here.
 */
const TONE_SELECT_STYLE: Record<Tone, CSSProperties> = {
  neutral: { backgroundColor: 'rgb(var(--op-gold-rgb) / 0.12)', borderColor: 'rgb(var(--op-gold-rgb) / 0.4)', color: 'rgb(var(--op-gold-rgb))' },
  good: { backgroundColor: 'rgba(4, 120, 87, 0.25)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#a7f3d0' },
  warn: { backgroundColor: 'rgba(217, 119, 6, 0.25)', borderColor: 'rgba(251, 191, 36, 0.4)', color: '#fef3c7' },
  bad: { backgroundColor: 'rgba(185, 28, 28, 0.25)', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#fecaca' },
};

export function BugReportListPage() {
  const token = useAdminAuthStore((s) => s.token)!;
  const [reports, setReports] = useState<AdminBugReportSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BugReportStatus | ''>('');
  const [validityFilter, setValidityFilter] = useState<BugReportValidity | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleRowUpdate(id: string, patch: { status?: BugReportStatus; validity?: BugReportValidity }): Promise<void> {
    setSavingId(id);
    setError(null);
    try {
      const updated = await updateBugReport(token, id, patch);
      setReports((prev) => prev.map((report) => (report.id === id ? updated : report)));
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not update this report.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleExport(format: 'json' | 'csv'): Promise<void> {
    setExporting(format);
    setError(null);
    try {
      const all = await fetchAllBugReports(token, { status: statusFilter, validity: validityFilter });
      if (format === 'json') downloadBugReportsAsJson(all);
      else downloadBugReportsAsCsv(all);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not export bug reports.');
    } finally {
      setExporting(null);
    }
  }

  async function load(reset: boolean): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchBugReports(token, {
        cursor: reset ? null : cursor,
        status: statusFilter || undefined,
        validity: validityFilter || undefined,
      });
      setReports((prev) => (reset ? page.reports : [...prev, ...page.reports]));
      setCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load bug reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, validityFilter]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-white">Bugs & Reports Management</h1>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <AdminSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BugReportStatus | '')}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="triaged">Triaged</option>
            <option value="resolved">Resolved</option>
            <option value="wont_fix">Won't fix</option>
          </AdminSelect>
          <AdminSelect value={validityFilter} onChange={(e) => setValidityFilter(e.target.value as BugReportValidity | '')}>
            <option value="">All validity</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </AdminSelect>
        </div>
        <div className="flex gap-2">
          <AdminButton variant="secondary" onClick={() => void handleExport('json')} disabled={exporting !== null}>
            {exporting === 'json' ? 'Exporting…' : 'Download JSON'}
          </AdminButton>
          <AdminButton variant="secondary" onClick={() => void handleExport('csv')} disabled={exporting !== null}>
            {exporting === 'csv' ? 'Exporting…' : 'Download CSV'}
          </AdminButton>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-[rgb(var(--op-gold-rgb)/0.18)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgb(var(--op-gold-rgb)/0.08)] text-white/55">
            <tr>
              <th className="px-3 py-2 font-semibold">Time</th>
              <th className="px-3 py-2 font-semibold">Reporter</th>
              <th className="px-3 py-2 font-semibold">Card #</th>
              <th className="px-3 py-2 font-semibold">Card Name</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">App version</th>
              <th className="px-3 py-2 font-semibold">Validity</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const rowSaving = savingId === report.id;
              return (
                <tr key={report.id} className="border-t border-[rgb(var(--op-gold-rgb)/0.18)] hover:bg-[rgb(var(--op-gold-rgb)/0.08)]">
                  <td className="px-3 py-2 text-white/55">{new Date(report.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-white/75">{report.reporterUsername ?? report.reporterUserId}</td>
                  <td className="px-3 py-2 text-white/75">{report.selectedCardNumber ?? '—'}</td>
                  <td className="px-3 py-2 text-white/75">{report.selectedCardName ?? '—'}</td>
                  <td className="max-w-sm truncate px-3 py-2">
                    <Link to={`/admin/bugs/${report.id}`} className="text-[rgb(var(--op-gold-rgb))] hover:underline">
                      {report.description}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-white/55">{report.clientVersion ?? '—'}</td>
                  <td className="px-3 py-2">
                    <AdminSelect
                      value={report.validity}
                      disabled={rowSaving}
                      style={TONE_SELECT_STYLE[validityTone(report.validity)]}
                      onChange={(e) => void handleRowUpdate(report.id, { validity: e.target.value as BugReportValidity })}
                    >
                      <option value="unreviewed">Unreviewed</option>
                      <option value="valid">Valid</option>
                      <option value="invalid">Invalid</option>
                    </AdminSelect>
                  </td>
                  <td className="px-3 py-2">
                    <AdminSelect
                      value={report.status}
                      disabled={rowSaving}
                      style={TONE_SELECT_STYLE[statusTone(report.status)]}
                      onChange={(e) => void handleRowUpdate(report.id, { status: e.target.value as BugReportStatus })}
                    >
                      <option value="open">Open</option>
                      <option value="triaged">Triaged</option>
                      <option value="resolved">Resolved</option>
                      <option value="wont_fix">Won't fix</option>
                    </AdminSelect>
                  </td>
                </tr>
              );
            })}
            {reports.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-white/40">
                  No bug reports.
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
