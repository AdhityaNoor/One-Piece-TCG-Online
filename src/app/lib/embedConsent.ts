/**
 * Per-provider consent for third-party embeds.
 *
 * WHY THIS EXISTS: docs/legal + src/app/legal/content/PRIVACY.md promise that
 * the app runs "no analytics, advertising, fingerprinting, or third-party
 * tracking scripts of any kind", and that the absence of any non-essential
 * third-party request is precisely why players are never shown a consent
 * banner. A Discord or Ko-fi iframe is a third-party request: the moment the
 * frame mounts, the player's IP, User-Agent and referrer reach that host and
 * that host may set its own cookies in its own context.
 *
 * So the embeds are OPT-IN, per provider, and nothing is requested until the
 * player clicks. That keeps the promise literally true — no third-party
 * request is made for a feature the player did not ask for — and it is also
 * the GDPR-safe shape (consent before the request, not after), without
 * needing a site-wide banner for a feature most players will never touch.
 *
 * Consent is stored per provider, not as a single flag: agreeing to see the
 * Discord member list is not agreeing to load Ko-fi.
 *
 * This module is deliberately free of React and of any import that touches
 * the DOM at module scope, so it runs under the project's `node` Vitest
 * environment with a stubbed `localStorage`.
 */

export type EmbedProvider = 'discord' | 'kofi';

export const EMBED_CONSENT_KEY_PREFIX = 'optcg.embedConsent.';

export function embedConsentKey(provider: EmbedProvider): string {
  return `${EMBED_CONSENT_KEY_PREFIX}${provider}`;
}

/**
 * Reads consent without ever throwing.
 *
 * A browser that refuses storage (private mode, blocked site data) reads as
 * "not consented", which is the safe direction: the player is asked again
 * rather than having a third-party frame loaded on an assumption.
 */
export function hasEmbedConsent(provider: EmbedProvider): boolean {
  try {
    return window.localStorage.getItem(embedConsentKey(provider)) === '1';
  } catch {
    return false;
  }
}

/** Records consent. Storage failures are non-fatal — the frame still loads for this session. */
export function grantEmbedConsent(provider: EmbedProvider): void {
  try {
    window.localStorage.setItem(embedConsentKey(provider), '1');
  } catch {
    // Ignored on purpose: see hasEmbedConsent. The player consented for this
    // page view either way; a browser that will not remember it simply asks
    // again next visit, which is the conservative failure.
  }
}

/**
 * Withdraws consent. Consent that cannot be withdrawn is not consent, so this
 * is part of the contract even though only the panel's own control calls it.
 */
export function revokeEmbedConsent(provider: EmbedProvider): void {
  try {
    window.localStorage.removeItem(embedConsentKey(provider));
  } catch {
    // Ignored: same reasoning as grantEmbedConsent.
  }
}
