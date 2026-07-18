import type { AdminHomeBanner, SaveHomeBannerRequest } from '../../../shared/admin';
import { adminAuthHeaders, adminUrl, parseAdminOrThrow } from './shared';

export async function fetchAdminBanners(token: string): Promise<{ banners: AdminHomeBanner[] }> {
  return parseAdminOrThrow(await fetch(adminUrl('/admin/banners'), { headers: adminAuthHeaders(token) }));
}

export async function createBanner(token: string, body: SaveHomeBannerRequest): Promise<AdminHomeBanner> {
  return parseAdminOrThrow(await fetch(adminUrl('/admin/banners'), { method: 'POST', headers: adminAuthHeaders(token), body: JSON.stringify(body) }));
}

export async function updateBanner(token: string, id: string, body: SaveHomeBannerRequest): Promise<AdminHomeBanner> {
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/banners/${encodeURIComponent(id)}`), { method: 'PATCH', headers: adminAuthHeaders(token), body: JSON.stringify(body) }));
}

export async function deleteBanner(token: string, id: string): Promise<void> {
  await parseAdminOrThrow(await fetch(adminUrl(`/admin/banners/${encodeURIComponent(id)}`), { method: 'DELETE', headers: adminAuthHeaders(token) }));
}
