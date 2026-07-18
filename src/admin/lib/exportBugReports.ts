/**
 * "Download" support for the Bugs & Reports Management list (BugReportListPage).
 * Exports every report matching the CURRENTLY APPLIED filters — not just the
 * page(s) already loaded on screen — by walking fetchBugReports' cursor to
 * the end, same cursor contract fetchBugReports/BugReportListPage already use.
 *
 * Exports full AdminBugReportSummary rows (every field, not just the table's
 * visible columns) — matches/detail log data is deliberately NOT fetched
 * per-row here: that would mean one extra request per report (a report's log
 * can be up to 5000 entries — see server/src/support/bugReportService.ts),
 * which does not belong in a bulk list export. Reuses the Blob + temporary
 * <a download> pattern from PlayTestScreen.downloadPlayTestLog.
 */
import type { AdminBugReportSummary, BugReportStatus, BugReportValidity } from '../../../shared/admin';
import { fetchBugReports } from '../net/bugReportAdminClient';

export interface BugReportExportFilters {
  status?: BugReportStatus | '';
  validity?: BugReportValidity | '';
}

const EXPORT_PAGE_LIMIT = 200;

/** Walks every page for the given filters and returns the full, unfiltered-by-pagination row set. */
export async function fetchAllBugReports(token: string, filters: BugReportExportFilters): Promise<AdminBugReportSummary[]> {
  const all: AdminBugReportSummary[] = [];
  let cursor: string | null = null;

  for (;;) {
    const page = await fetchBugReports(token, {
      cursor,
      limit: EXPORT_PAGE_LIMIT,
      status: filters.status || undefined,
      validity: filters.validity || undefined,
    });
    all.push(...page.reports);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return all;
}

function triggerDownload(body: string, mimeType: string, filename: string): void {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function timestampForFilename(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function downloadBugReportsAsJson(reports: AdminBugReportSummary[]): void {
  triggerDownload(JSON.stringify(reports, null, 2), 'application/json', `bug-reports-${timestampForFilename()}.json`);
}

const CSV_COLUMNS: Array<{ key: keyof AdminBugReportSummary; header: string }> = [
  { key: 'id', header: 'ID' },
  { key: 'createdAt', header: 'Created At' },
  { key: 'reporterUserId', header: 'Reporter User ID' },
  { key: 'reporterUsername', header: 'Reporter Username' },
  { key: 'description', header: 'Description' },
  { key: 'matchMode', header: 'Match Mode' },
  { key: 'clientVersion', header: 'App Version' },
  { key: 'validity', header: 'Validity' },
  { key: 'status', header: 'Status' },
  { key: 'logEntryCount', header: 'Log Entry Count' },
  { key: 'hasSelectedCard', header: 'Has Selected Card' },
];

/** RFC 4180-ish escaping: quote any field containing a comma, quote, or newline; double up embedded quotes. */
function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function downloadBugReportsAsCsv(reports: AdminBugReportSummary[]): void {
  const lines = [
    CSV_COLUMNS.map((column) => csvCell(column.header)).join(','),
    ...reports.map((report) => CSV_COLUMNS.map((column) => csvCell(report[column.key])).join(',')),
  ];
  triggerDownload(lines.join('\r\n'), 'text/csv', `bug-reports-${timestampForFilename()}.csv`);
}
