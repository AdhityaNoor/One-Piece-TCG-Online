/**
 * Thin REST client for the backend support surface (server/src/support/routes.ts).
 * Same shape as profileClient.ts / rankedClient.ts: typed wrapper, one
 * ApiError class carrying the server's machine code, no state kept here —
 * that's bugReportStore's job.
 */
import type { SubmitBugReportRequest, SubmitBugReportResponse, SupportApiErrorBody } from '../../../shared/support';
import { apiBaseUrl } from './backendConfig';
import { readApiJson } from './apiResponse';

export class SupportApiError extends Error {
  constructor(
    message: string,
    readonly code: SupportApiErrorBody['code'],
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'SupportApiError';
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  // Status and readability are checked BEFORE the body is trusted. Parsing
  // first would surface an HTML error page as a raw SyntaxError instead of
  // the failure it actually is — see net/apiResponse.ts.
  const { body, nonJsonReason } = await readApiJson(res);
  if (!res.ok || nonJsonReason) {
    const err = body as Partial<SupportApiErrorBody>;
    throw new SupportApiError(
      err.error ?? nonJsonReason ?? `Request failed (${res.status}).`,
      err.code ?? 'INTERNAL',
      res.status, err.details,
    );
  }
  return body as T;
}

function url(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

export async function submitBugReport(token: string, body: SubmitBugReportRequest): Promise<SubmitBugReportResponse> {
  return parseOrThrow(
    await fetch(url('/support/bug-report'), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}
