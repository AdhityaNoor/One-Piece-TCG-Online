import type { AdminFeatureFlag, CreateFeatureFlagRequest, UpdateFeatureFlagRequest } from '../../../shared/admin';
import { adminAuthHeaders, adminUrl, parseAdminOrThrow } from './shared';

export async function fetchFeatureFlags(token: string): Promise<{ flags: AdminFeatureFlag[] }> {
  return parseAdminOrThrow(await fetch(adminUrl('/admin/flags'), { headers: adminAuthHeaders(token) }));
}

export async function createFeatureFlag(token: string, body: CreateFeatureFlagRequest): Promise<AdminFeatureFlag> {
  return parseAdminOrThrow(await fetch(adminUrl('/admin/flags'), { method: 'POST', headers: adminAuthHeaders(token), body: JSON.stringify(body) }));
}

export async function updateFeatureFlag(token: string, key: string, body: UpdateFeatureFlagRequest): Promise<AdminFeatureFlag> {
  return parseAdminOrThrow(await fetch(adminUrl(`/admin/flags/${encodeURIComponent(key)}`), { method: 'PATCH', headers: adminAuthHeaders(token), body: JSON.stringify(body) }));
}

export async function deleteFeatureFlag(token: string, key: string): Promise<void> {
  await parseAdminOrThrow(await fetch(adminUrl(`/admin/flags/${encodeURIComponent(key)}`), { method: 'DELETE', headers: adminAuthHeaders(token) }));
}
