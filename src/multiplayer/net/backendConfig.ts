/**
 * The one place the frontend reads its backend endpoints. Mirrors
 * app/lib/runtime.ts's philosophy — real environment access lives in a single
 * module so the rest of the code stays testable and swappable.
 *
 * Online multiplayer is OPTIONAL: if VITE_API_BASE_URL is unset (e.g. a
 * frontend-only preview), `isBackendConfigured()` is false and the UI keeps
 * local hotseat + casual mock fully working while explaining that online is
 * unavailable.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

/** Derive the ws(s) URL from an explicit override, else from the API origin. */
function deriveColyseusUrl(): string {
  const explicit = import.meta.env.VITE_COLYSEUS_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  if (!API_BASE) return '';
  return API_BASE.replace(/^http/, 'ws');
}

export function isBackendConfigured(): boolean {
  return API_BASE.length > 0;
}

export function apiBaseUrl(): string {
  return API_BASE;
}

export function colyseusUrl(): string {
  return deriveColyseusUrl();
}
