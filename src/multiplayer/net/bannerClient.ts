/**
 * Public, unauthenticated read of home-screen banners (server/src/banners/publicRoutes.ts).
 * Written by the Admin CMS's Banner & News Management section; consumed by
 * the player-facing home tab (see app/screens/HubScreen home widget).
 */
import type { PublicHomeBanner } from '../../../shared/admin';
import { apiBaseUrl } from './backendConfig';

export async function fetchActiveBanners(): Promise<PublicHomeBanner[]> {
  const res = await fetch(`${apiBaseUrl()}/banners`);
  if (!res.ok) return [];
  const body = (await res.json()) as { banners?: PublicHomeBanner[] };
  return body.banners ?? [];
}
