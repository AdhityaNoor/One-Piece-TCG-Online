import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminAuthStore } from '../../store/adminAuthStore';
import { fetchBugReportDetail, updateBugReport } from '../../net/bugReportAdminClient';
import { AdminApiError } from '../../net/shared';
import { AdminButton, AdminCard, AdminSelect } from '../../components/ui';
import type { AdminBugReportDetail, BugReportStatus, BugReportValidity } from '../../../../shared/admin';

/** The log is kept opaque (unknown[]) on the wire — see shared/admin.ts doc comment. Loosely read the GameLogEntry fields we know exist for a readable row, falling back to raw JSON for anything unexpected. */
function logEntryLine(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null) return JSON.stringify(entry);
  const e = entry as Record<string, unknown>;
  const parts = [
    typeof e.sequence === 'number' ? `#${e.sequence}` : null,
    typeof e.turnNumber === 'number' ? `Turn ${e.turnNumber}` : null,
    typeof e.phase === 'string' ? e.phase : null,
    typeof e.type === 'string' ? e.type : null,
  ].filter(Boolean);
  const header = parts.join(' · ');
  const message = typeof e.message === 'string' ? e.message : null;
  return message ? `${header} — ${message}` : header || JSON.stringify(entry);
}

export function BugReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useAdminAuthStore((s) => s.token)!;
  const [report, setReport] = useState<AdminBugReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(): Promise<void> {
    if (!id) return;
    setError(null);
    try {
      setReport(await fetchBugReportDetail(token, id));
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not load report.');
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpdate(patch: { status?: BugReportStatus; validity?: BugReportValidity }): Promise<void> {
    if (!id) return;
    setSaving(true);
    try {
      await updateBugReport(token, id, patch);
      await load();
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : 'Could not update report.');
    } finally {
      setSaving(false);
    }
  }

  if (error && !report) return <p className="text-sm text-red-400">{error}</p>;
  if (!report) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link to="/admin/bugs" className="text-sm text-sky-400 hover:underline">
          ← Back to Bugs & Reports
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">Bug report</h1>
        <p className="text-sm text-slate-400">
          Reported by {report.reporterUsername ?? report.reporterUserId} at {new Date(report.createdAt).toLocaleString()} · app version{' '}
          {report.clientVersion ?? 'unknown'}
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <AdminCard>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Description</p>
        <p className="whitespace-pre-wrap text-sm text-slate-200">{report.description}</p>
      </AdminCard>

      <AdminCard>
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Context</p>
        <dl className="grid grid-cols-2 gap-2 text-sm text-slate-200">
          <dt className="text-slate-500">Match mode</dt>
          <dd>{report.matchMode}</dd>
          <dt className="text-slate-500">Match ID</dt>
          <dd>{report.matchId ?? '—'}</dd>
          <dt className="text-slate-500">Turn / phase</dt>
          <dd>
            Turn {report.turnNumber} · {report.phase}
          </dd>
          <dt className="text-slate-500">Selected card</dt>
          <dd>
            {report.selectedCard ? `${report.selectedCard.cardName ?? 'Unknown'} (${report.selectedCard.cardNumber ?? report.selectedCard.cardDefinitionId})` : '—'}
          </dd>
        </dl>
      </AdminCard>

      <AdminCard>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Triage</p>
        <div className="flex gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Validity</label>
            <AdminSelect value={report.validity} onChange={(e) => void handleUpdate({ validity: e.target.value as BugReportValidity })} disabled={saving}>
              <option value="unreviewed">Unreviewed</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
            </AdminSelect>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">Status</label>
            <AdminSelect value={report.status} onChange={(e) => void handleUpdate({ status: e.target.value as BugReportStatus })} disabled={saving}>
              <option value="open">Open</option>
              <option value="triaged">Triaged</option>
              <option value="resolved">Resolved</option>
              <option value="wont_fix">Won't fix</option>
            </AdminSelect>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Battle log ({report.logEntryCount} entries)</p>
          <AdminButton
            variant="secondary"
            onClick={() => navigator.clipboard?.writeText(JSON.stringify(report.log, null, 2))}
          >
            Copy raw JSON
          </AdminButton>
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded border border-slate-800 bg-slate-950/60 p-3">
          <ol className="flex flex-col gap-1 font-mono text-xs text-slate-300">
            {report.log.map((entry, index) => (
              <li key={index} className="border-b border-slate-900 pb-1">
                {logEntryLine(entry)}
              </li>
            ))}
          </ol>
        </div>
      </AdminCard>
    </div>
  );
}
