/**
 * Asset URL resolution — the single place that knows whether card images
 * are served locally (Vite dev server from /public/card-images/) or from
 * Vercel Blob in production/preview.
 *
 * How it works:
 *   - Local dev: VITE_ASSET_BASE_URL is intentionally NOT set (see
 *     docs/04-deployment.md step 6 — "do not add this to development").
 *     Root-relative paths like "/card-images/OP01/OP01-001_EN.webp" resolve
 *     straight against Vite's dev-server root, which serves /public/ → works.
 *   - Production/preview: VITE_ASSET_BASE_URL is set to the Vercel Blob
 *     store's public origin (e.g. "https://<id>.public.blob.vercel-storage.com").
 *     Vite inlines the value at build time (import.meta.env.VITE_*), so the
 *     resulting bundle is a plain string comparison — no runtime env lookup.
 *     "/card-images/..." becomes "<blob-origin>/card-images/..." which
 *     bypasses the Vercel deployment bundle (card-images/ is in .vercelignore)
 *     and hits the Blob CDN directly.
 *
 * Callers: CardImage.tsx (every card art render goes through here).
 * Everything else in the app stores/passes imageUrl as a raw root-relative
 * path and never needs to know about this seam.
 */

const ASSET_BASE = import.meta.env.VITE_ASSET_BASE_URL ?? '';

/**
 * Resolves a root-relative asset path to the correct URL for the current
 * environment. Returns null as-is (no image available — caller shows placeholder).
 */
export function resolveAssetUrl(path: string | null): string | null {
  if (path === null) return null;
  if (!ASSET_BASE) return path; // local dev — served by Vite from /public/
  // Ensure no double-slash when joining.
  return `${ASSET_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
