import type { AdminCardLegalityOverride, SetCardLegalityOverrideRequest } from '../../../shared/admin';
import { adminAuthHeaders, adminUrl, parseAdminOrThrow } from './shared';

export async function fetchCardLegalityOverrides(token: string): Promise<{ overrides: AdminCardLegalityOverride[] }> {
  return parseAdminOrThrow(await fetch(adminUrl('/admin/card-legality'), { headers: adminAuthHeaders(token) }));
}

export async function setCardLegalityOverride(token: string, cardNumber: string, body: SetCardLegalityOverrideRequest): Promise<AdminCardLegalityOverride> {
  return parseAdminOrThrow(
    await fetch(adminUrl(`/admin/card-legality/${encodeURIComponent(cardNumber)}`), { method: 'PUT', headers: adminAuthHeaders(token), body: JSON.stringify(body) }),
  );
}

export async function removeCardLegalityOverride(token: string, cardNumber: string): Promise<void> {
  await parseAdminOrThrow(await fetch(adminUrl(`/admin/card-legality/${encodeURIComponent(cardNumber)}`), { method: 'DELETE', headers: adminAuthHeaders(token) }));
}
