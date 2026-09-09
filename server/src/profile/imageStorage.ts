/**
 * Vercel Blob storage adapter for player-uploaded profile images. The ONLY
 * module in the profile system that knows a blob store exists — everything
 * above it (profileImageService) deals in "store these bytes, forget that
 * URL", so swapping the backing store later is a one-file change.
 *
 * Storage-key shape: `profile-images/<userId>/<kind>-<millis>.<ext>`.
 *
 * The timestamp in the key is load-bearing, not decoration. Reusing one
 * stable key per (user, kind) would mean every replacement fights the Blob
 * CDN's cache — the URL is identical, so viewers keep the old photo until
 * the edge entry expires. A fresh key per upload is immutable-by-URL: the
 * new photo is visible instantly, and the previous object is deleted right
 * after the profile document has been repointed (see deletePrevious).
 *
 * addRandomSuffix is off deliberately: the key already carries the userId
 * and a millisecond stamp, and a predictable key is what lets a cleanup
 * job (or an admin) find a player's objects without a database round-trip.
 * The userId path segment is a Mongo ObjectId hex string, never anything
 * player-supplied, so there is no path-traversal surface here.
 */
import { del, put } from '@vercel/blob';
import { env } from '../config/env';
import { extensionForFormat, type ProfileImageFormat, type ProfileImageKind } from '../../../shared/profileImage';
import { PROFILE_IMAGE_MIME_TYPES } from '../../../shared/profileImage';

export function isImageStorageConfigured(): boolean {
  return env.blobReadWriteToken !== null;
}

export interface StoredImage {
  url: string;
}

export async function storeProfileImage(
  userId: string,
  /** Key segment: 'avatar', 'banner', or their '-source' variants. Never player-supplied. */
  kind: ProfileImageKind | `${ProfileImageKind}-source`,
  format: ProfileImageFormat,
  body: Buffer,
): Promise<StoredImage> {
  const token = env.blobReadWriteToken;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is not configured.');

  const pathname = `profile-images/${userId}/${kind}-${Date.now()}.${extensionForFormat(format)}`;
  const { url } = await put(pathname, body, {
    access: 'public',
    token,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: PROFILE_IMAGE_MIME_TYPES[format],
    // A year, because the key is unique per upload — the object at a given
    // URL never changes, so there is nothing for a shorter TTL to protect.
    cacheControlMaxAge: 31_536_000,
  });
  return { url };
}

/**
 * Best-effort delete of a superseded object. Never throws: the profile
 * document has already been repointed by the time this runs, so a failure
 * here is a leaked blob (an ops concern) and not a failed upload (a player
 * concern). Swallowing it keeps a transient Blob API hiccup from turning a
 * successful photo change into an error toast.
 */
export async function deleteProfileImage(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const token = env.blobReadWriteToken;
  if (!token) return;
  try {
    await del(url, { token });
  } catch (cause) {
    console.warn('[profile] could not delete superseded profile image:', cause);
  }
}
