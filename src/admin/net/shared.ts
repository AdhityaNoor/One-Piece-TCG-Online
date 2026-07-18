/**
 * Shared REST plumbing for every /admin/* API client — one AdminApiError
 * class + one response parser, reused by all of src/admin/net/*.ts so each
 * resource client stays a short list of typed fetch wrappers, same spirit as
 * src/multiplayer/net/profileClient.ts but factored once since every admin
 * client here is new.
 */
import type { AdminApiErrorBody } from '../../../shared/admin';
import { apiBaseUrl } from '../../multiplayer/net/backendConfig';

export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly code: AdminApiErrorBody['code'],
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

export async function parseAdminOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = body as Partial<AdminApiErrorBody>;
    throw new AdminApiError(err.error ?? `Request failed (${res.status}).`, err.code ?? 'INTERNAL', res.status, err.details);
  }
  return body as T;
}

export function adminUrl(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

export function adminAuthHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}
