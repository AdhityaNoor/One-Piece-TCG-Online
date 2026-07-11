/**
 * Thin REST client for the backend auth surface. Types come from the shared
 * contract package so client and server can never drift. No token storage
 * here — that's the authStore's job; this module is pure request/response.
 */
import type {
  ApiErrorBody,
  AuthResponse,
  LoginRequest,
  MeResponse,
  PublicUser,
  SignupRequest,
} from '../../../shared/auth';
import { apiBaseUrl } from './backendConfig';

/** Thrown on any non-2xx response, carrying the server's machine code. */
export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code: ApiErrorBody['code'],
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = body as Partial<ApiErrorBody>;
    throw new AuthApiError(err.error ?? `Request failed (${res.status}).`, err.code ?? 'INTERNAL', res.status);
  }
  return body as T;
}

function url(path: string): string {
  return `${apiBaseUrl()}${path}`;
}

export async function signup(input: SignupRequest): Promise<AuthResponse> {
  const res = await fetch(url('/auth/signup'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseOrThrow<AuthResponse>(res);
}

export async function login(input: LoginRequest): Promise<AuthResponse> {
  const res = await fetch(url('/auth/login'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseOrThrow<AuthResponse>(res);
}

/** Validate a stored token and fetch the current user. */
export async function fetchMe(token: string): Promise<PublicUser> {
  const res = await fetch(url('/auth/me'), {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = await parseOrThrow<MeResponse>(res);
  return body.user;
}
