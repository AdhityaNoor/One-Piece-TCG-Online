/// <reference types="vite/client" />

/**
 * Build-time env vars read by the app layer (see src/app/lib/assetUrl.ts).
 * Augments Vite's own ImportMetaEnv rather than replacing it, so BASE_URL,
 * MODE, etc. stay typed too.
 */
/** Stamped at build time from package.json version field (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /**
   * Absolute origin (no trailing slash) that root-relative asset paths get
   * rewritten against — e.g. "https://<store>.public.blob.vercel-storage.com".
   * Unset in local dev: paths resolve against /public unchanged.
   */
  readonly VITE_ASSET_BASE_URL?: string;
  /**
   * Origin of the backend REST API, e.g. "http://localhost:8080" or a Cloud
   * Run HTTPS URL. Unset means online multiplayer is disabled.
   */
  readonly VITE_API_BASE_URL?: string;
  /**
   * WebSocket origin for Colyseus. Falls back to VITE_API_BASE_URL with
   * http(s) replaced by ws(s) when unset.
   */
  readonly VITE_COLYSEUS_URL?: string;
  readonly VITE_EFFECT_SYSTEM?: 'v1' | 'v2';
  /**
   * Numeric Discord server ("guild") ID for the Home tab's community rail.
   * Unset hides the Discord widget. The server must also have
   * Server Settings -> Widget -> "Enable Server Widget" turned on, which no
   * amount of frontend config can substitute for.
   */
  readonly VITE_DISCORD_SERVER_ID?: string;
  /**
   * Public Discord invite URL, e.g. https://discord.gg/xxxx. Unset hides every
   * "Join the Discord" button (the embedded widget is unaffected — it carries
   * Discord's own join link).
   */
  readonly VITE_DISCORD_INVITE_URL?: string;
  /**
   * Ko-fi page handle (the path segment after ko-fi.com/) for the support
   * button. Unset hides the button.
   */
  readonly VITE_KOFI_USERNAME?: string;
  /**
   * Which of Ko-fi's official button images to use, 1-6 (colour variants).
   * Optional; defaults to 3. Out-of-range values fall back to the default.
   */
  readonly VITE_KOFI_BUTTON_VARIANT?: string;
}
