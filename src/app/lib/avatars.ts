/**
 * Predefined profile-avatar catalog. Source images live in
 * /public/avatars/ (shipped with the app, not fetched from the card API —
 * these are UI/presentation assets, unrelated to card data). Every file
 * there is a transparent-background webp (see AvatarPicker.tsx /
 * AppHeader.tsx — callers must never paint a solid shape behind the art,
 * only the character's own silhouette should be visible).
 *
 * Resolved through resolveAssetUrl (same seam CardImage.tsx uses) so this
 * keeps working if avatar assets ever move behind the same
 * VITE_ASSET_BASE_URL indirection card images already use.
 */
import { resolveAssetUrl } from './assetUrl';

export interface AvatarOption {
  id: string;
  label: string;
  /** Root-relative path under /public — resolved through resolveAssetUrl at render time. */
  path: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'luffy', label: 'Luffy', path: '/avatars/img_thumbnail.webp' },
  { id: 'ace', label: 'Ace', path: '/avatars/img_thumbnail_ace.webp' },
  { id: 'law', label: 'Law', path: '/avatars/img_thumbnail_law.webp' },
  { id: 'nami', label: 'Nami', path: '/avatars/img_thumbnail_nami.webp' },
  { id: 'sabo', label: 'Sabo', path: '/avatars/img_thumbnail_sabo.webp' },
  { id: 'sanji', label: 'Sanji', path: '/avatars/img_thumbnail_sani.webp' },
  { id: 'shanks', label: 'Shanks', path: '/avatars/img_thumbnail_shanks.webp' },
  { id: 'zoro', label: 'Zoro', path: '/avatars/img_thumbnail_zoro.webp' },
];

export const DEFAULT_AVATAR_ID = 'luffy';

/** Resolves a saved avatarId (possibly stale/unknown/null) to a real image URL, always falling back to the default. */
export function resolveAvatarUrl(avatarId: string | null | undefined): string {
  const option = AVATAR_OPTIONS.find((a) => a.id === avatarId) ?? AVATAR_OPTIONS.find((a) => a.id === DEFAULT_AVATAR_ID) ?? AVATAR_OPTIONS[0];
  return resolveAssetUrl(option.path) ?? option.path;
}

/**
 * Bridge to server/src/profile/cosmeticCatalog.ts's avatar entries, which
 * mirror this file's ids 1:1 with an `avatar_` prefix (avatar_luffy ->
 * luffy) so the server-synced Profile photo (equippedCosmetics.avatar,
 * a catalog id) can reuse this exact same picker/asset list — "profile
 * photo default pics are the ones in Settings" per the project ask, not a
 * second parallel avatar system.
 */
export function avatarCatalogIdToOptionId(catalogId: string | null | undefined): string | null {
  if (!catalogId) return null;
  const stripped = catalogId.startsWith('avatar_') ? catalogId.slice('avatar_'.length) : catalogId;
  return AVATAR_OPTIONS.some((option) => option.id === stripped) ? stripped : null;
}

/** Inverse of avatarCatalogIdToOptionId — local option id ('luffy') to the catalog id ('avatar_luffy') the equip API expects. */
export function avatarOptionIdToCatalogId(optionId: string): string {
  return `avatar_${optionId}`;
}
