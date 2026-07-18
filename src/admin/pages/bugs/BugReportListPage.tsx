import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { fetchBugReports } from '../../net/bugReportAdminClient';
import { AdminApiError } from '../../net/shared';
import { AdminBadge, AdminButton, AdminSelect } from '../../components/ui';
import type { AdminBugReportSummary, BugReportStatus, BugReportValidity } from '../../../../shared/admin';

function validityTone(validity: BugReportValidity): 'good' | 'warn' | 'bad' {
  if (validity === 'valid') return 'good';
  if (validity === 'invalid') return 'bad';
  return 'warn';
}

function statusTone(status: BugReportStatus): 'good' | 'warn' | 'neutral' {
  if (status === 'resolved') return 'good';
  if (status === 'open') return 'warn';
  return 'neutral';
}

export function BugReportListPage() {
  const token = useAdminAuthStore((s) => s.token)!;
  const [reports, setReports] = useState<AdminBugReportSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BugReportStatus | ''>('');
  const [validityFilter, setValidityFilter] = useState<BugReportValidity | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <div className="mb-4 flex gap-2">
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

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-3 py-2 font-semibold">Time</th>
              <th className="px-3 py-2 font-semibold">Reporter</th>
              <th className="px-3 py-2 font-semibold">Description</th>
              <th className="px-3 py-2 font-semibold">App version</th>
              <th className="px-3 py-2 font-semibold">Validity</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="px-3 py-2 text-slate-400">{new Date(report.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2 text-slate-300">{report.reporterUsername ?? report.reporterUserId}</td>
                <td className="max-w-sm truncate px-3 py-2">
                  <Link to={`/admin/bugs/${report.id}`} className="text-sky-400 hover:underline">
                    {report.description}
                  </Link>
                </td>
                <td className="px-3 py-2 text-slate-400">{report.clientVersion ?? '—'}</td>
                <td className="px-3 py-2">
                  <AdminBadge tone={validityTone(report.validity)}>{report.validity}</AdminBadge>
                </td>
                <td className="px-3 py-2">
                  <AdminBadge tone={statusTone(report.status)}>{report.status}</AdminBadge>
                </td>
              </tr>
            ))}
            {reports.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
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
