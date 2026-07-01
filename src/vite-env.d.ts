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
}
