/**
 * Public, unauthenticated read of the cosmetic-accessory catalog (card
 * sleeves + DON!! arts) — MongoDB master data with Vercel Blob images, served
 * by server/src/accessories/publicRoutes.ts. Consumed by the player-facing
 * Accessories screen via app/store/accessoryCatalogStore.ts.
 *
 * Returns [] when no backend is configured (VITE_API_BASE_URL unset) or on
 * any error, so the app cleanly falls back to its bundled static catalog and
 * offline hotseat builds keep working (requirement #10).
 */
import type { PublicAccessory } from '../../../shared/accessories';
import { apiBaseUrl, isBackendConfigured } from './backendConfig';

export async function fetchAccessoryCatalog(): Promise<PublicAccessory[]> {
  if (!isBackendConfigured()) return [];
  try {
    const res = await fetch(`${apiBaseUrl()}/accessories`);
    if (!res.ok) return [];
    const body = (await res.json()) as { accessories?: PublicAccessory[] };
    return body.accessories ?? [];
  } catch {
    return [];
  }
}
