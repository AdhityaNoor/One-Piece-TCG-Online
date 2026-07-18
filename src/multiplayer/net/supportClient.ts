/**
 * Thin REST client for the backend support surface (server/src/support/routes.ts).
 * Same shape as profileClient.ts / rankedClient.ts: typed wrapper, one
 * ApiError class carrying the server's machine code, no state kept here —
 * that's bugReportStore's job.
 */
import type { SubmitBugReportRequest, SubmitBugReportResponse, SupportApiErrorBody } from '../../../shared/support';
import { apiBaseUrl } from './backendConfig';

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
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = body as Partial<SupportApiErrorBody>;
    throw new SupportApiError(err.error ?? `Request failed (${res.status}).`, err.code ?? 'INTERNAL', res.status, err.details);
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
