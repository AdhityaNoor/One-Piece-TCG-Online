import type { AdminAuthResponse, AdminLoginRequest, PublicAdmin } from '../../../shared/admin';
import { adminAuthHeaders, adminUrl, parseAdminOrThrow } from './shared';

export async function adminLogin(body: AdminLoginRequest): Promise<AdminAuthResponse> {
  return parseAdminOrThrow(
    await fetch(adminUrl('/admin/auth/login'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  );
}

export async function fetchAdminMe(token: string): Promise<{ admin: PublicAdmin }> {
  return parseAdminOrThrow(await fetch(adminUrl('/admin/auth/me'), { headers: adminAuthHeaders(token) }));
}
