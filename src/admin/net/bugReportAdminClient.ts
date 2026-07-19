import type { AdminBugReportDetail, AdminBugReportListPage, AdminBugReportSummary, BugReportStatus, BugReportValidity, UpdateBugReportRequest } from '../../../shared/admin';
import { adminAuthHeaders, adminUrl, parseAdminOrThrow } from './shared';

export async function fetchBugReports(
  token: string,
  options: { cursor?: string | null; limit?: number; status?: BugReportStatus; validity?: BugReportValidity } = {},
): Promise<AdminBugReportListPage> {
  const params = new URLSearchParams();
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.status) params.set('status', options.status);
  if (options.validity) params.set('validity', options.validity);
  const query = params.toString();
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/bug-reports${query ? `?${query}` : ''}`), { headers: adminAuthHeaders(token) }));
}

export async function fetchBugReportDetail(token: string, id: string): Promise<AdminBugReportDetail> {
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/bug-reports/${encodeURIComponent(id)}`), { headers: adminAuthHeaders(token) }));
}

/** Returns the server's updated row (BugReportAdminService.update already returns the fresh AdminBugReportSummary) so callers can apply it directly instead of re-fetching or trusting the locally-sent patch. */
export async function updateBugReport(token: string, id: string, body: UpdateBugReportRequest): Promise<AdminBugReportSummary> {
  return parseAdminOrThrow(
    await fetch(adminUrl(`/admin/bug-reports/${encodeURIComponent(id)}`), { method: 'PATCH', headers: adminAuthHeaders(token), body: JSON.stringify(body) }),
  );
}
