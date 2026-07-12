/**
 * Pure profile-field validation/sanitization. Deliberately dependency-free
 * (no Mongo, no Express) so it is unit-testable in isolation — see
 * __tests__/validation.test.ts — following the same "manual escapeHtml,
 * no library" approach already established in
 * src/app/lib/cardEffectTextHtml.ts, since the repo has no sanitization
 * library dependency yet.
 *
 * Async concerns (username uniqueness, rate limiting) are NOT here — those
 * need the database and live in profileService. This module only validates
 * shape/content of a single field in isolation.
 */

export const DISPLAY_NAME_MAX_LENGTH = 32;
export const DISPLAY_NAME_MIN_LENGTH = 1;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const BIO_MAX_LENGTH = 280;
export const STATUS_MESSAGE_MAX_LENGTH = 80;
export const USERNAME_CHANGE_COOLDOWN_DAYS = 30;

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = new RegExp('[\\u0000-\\u001F\\u007F]', 'g');

/** Reserved handles that can never be claimed as a username — impersonation/branding protection. */
export const RESERVED_USERNAMES = new Set(
  [
    'admin',
    'administrator',
    'moderator',
    'mod',
    'support',
    'staff',
    'system',
    'root',
    'optcg',
    'onepiece',
    'official',
    'help',
    'null',
    'undefined',
    'anonymous',
    'deleted',
    'me',
    'profile',
    'settings',
    'api',
  ].map((name) => name.toLowerCase()),
);

export interface FieldValidationResult {
  ok: boolean;
  reason?: string;
  /** Sanitized value to actually persist, when ok is true. */
  value?: string;
}

/**
 * Unicode NFC normalization + control-character stripping shared by every
 * free-text field below. Does not touch legitimate whitespace beyond
 * trimming edges and collapsing internal runs, matching settingsStore's
 * sanitizeUsername precedent (src/app/store/settingsStore.ts).
 */
function baseNormalize(raw: string): string {
  return raw
    .normalize('NFC')
    .replace(CONTROL_CHAR_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Manual HTML-escape, mirroring src/app/lib/cardEffectTextHtml.ts's escapeHtml — never trust user text as markup, even display-only. */
export function escapeUserText(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
}

export function validateUsernameFormat(rawUsername: string): FieldValidationResult {
  const username = normalizeUsername(rawUsername);
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, reason: `Username must be between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.` };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, reason: 'Username may only contain letters, numbers, and underscores.' };
  }
  if (isReservedUsername(username)) {
    return { ok: false, reason: 'That username is reserved.' };
  }
  return { ok: true, value: username };
}

export function validateDisplayName(raw: string): FieldValidationResult {
  const value = baseNormalize(raw);
  if (value.length < DISPLAY_NAME_MIN_LENGTH || value.length > DISPLAY_NAME_MAX_LENGTH) {
    return { ok: false, reason: `Display name must be between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters.` };
  }
  return { ok: true, value };
}

export function validateBio(raw: string): FieldValidationResult {
  const value = baseNormalize(raw);
  if (value.length > BIO_MAX_LENGTH) {
    return { ok: false, reason: `Biography must be ${BIO_MAX_LENGTH} characters or fewer.` };
  }
  return { ok: true, value };
}

export function validateStatusMessage(raw: string): FieldValidationResult {
  const value = baseNormalize(raw);
  if (value.length > STATUS_MESSAGE_MAX_LENGTH) {
    return { ok: false, reason: `Status message must be ${STATUS_MESSAGE_MAX_LENGTH} characters or fewer.` };
  }
  return { ok: true, value };
}

/** URL sanitization for avatar/banner image references — only http(s) absolute URLs are accepted; anything else (javascript:, data:, relative paths into someone else's origin) is rejected outright rather than "cleaned". */
export function validateImageUrl(raw: string): FieldValidationResult {
  const value = raw.trim();
  if (value.length === 0) return { ok: true, value: '' };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { ok: false, reason: 'Image URL must use http or https.' };
    }
    return { ok: true, value: parsed.toString() };
  } catch {
    return { ok: false, reason: 'Image URL is not a valid URL.' };
  }
}

export function isUsernameChangeAllowed(lastChangedAt: string | null, nowIso: string): boolean {
  if (!lastChangedAt) return true;
  const last = Date.parse(lastChangedAt);
  const now = Date.parse(nowIso);
  if (!Number.isFinite(last) || !Number.isFinite(now)) return true;
  const days = (now - last) / (1000 * 60 * 60 * 24);
  return days >= USERNAME_CHANGE_COOLDOWN_DAYS;
}
