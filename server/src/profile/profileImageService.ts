/**
 * Upload / removal of player-uploaded profile photos and banners.
 *
 * Ordering rule, and the reason this is a service rather than inline route
 * code: the new object is stored FIRST, the profile document is repointed
 * SECOND, and only then is the superseded object deleted. Any other order
 * has a window where a player's profile references a URL that does not
 * exist yet (store-after-persist) or no longer exists (delete-before-
 * persist) — a broken image on someone else's screen, which no retry on the
 * player's side can fix. Storing an orphan is the only failure mode left,
 * and an orphan is invisible.
 *
 * Validation is shared/profileImage.ts's validateProfileImageBytes, the same
 * function the client runs before uploading. Running it again here is not
 * redundancy for its own sake: the client's copy exists to save a round
 * trip, this one is the actual gate, and it inspects the received bytes'
 * magic numbers rather than trusting the request's Content-Type.
 */
import { profiles } from '../db/mongo';
import { ProfileServiceError } from './errors';
import { deleteProfileImage, isImageStorageConfigured, storeProfileImage } from './imageStorage';
import { validateProfileImageBytes, type ProfileImageKind } from '../../../shared/profileImage';
import { EMPTY_CUSTOM_PROFILE_IMAGES, type CustomProfileImages } from '../../../shared/profile';

/** Maps a validation rejection onto the wire error code the client branches on. */
const REJECTION_STATUS: Record<string, { status: number; code: 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA' | 'VALIDATION' }> = {
  EMPTY: { status: 400, code: 'VALIDATION' },
  TOO_LARGE: { status: 413, code: 'PAYLOAD_TOO_LARGE' },
  UNSUPPORTED_FORMAT: { status: 415, code: 'UNSUPPORTED_MEDIA' },
  DIMENSIONS_TOO_LARGE: { status: 400, code: 'VALIDATION' },
  DIMENSIONS_TOO_SMALL: { status: 400, code: 'VALIDATION' },
};

export class ProfileImageService {
  /** Whether this deployment can accept uploads at all — the client hides the affordance when false. */
  isEnabled(): boolean {
    return isImageStorageConfigured();
  }

  private requireStorage(): void {
    if (!this.isEnabled()) {
      throw new ProfileServiceError(
        503,
        'STORAGE_UNAVAILABLE',
        'Image uploads are not configured on this server.',
      );
    }
  }

  private async readCustomImages(userId: string): Promise<CustomProfileImages> {
    const doc = await profiles().findOne({ userId }, { projection: { customImages: 1 } });
    if (!doc) throw new ProfileServiceError(404, 'NOT_FOUND', 'Profile not found.');
    return { ...EMPTY_CUSTOM_PROFILE_IMAGES, ...(doc.customImages ?? {}) };
  }

  async upload(userId: string, kind: ProfileImageKind, body: Buffer): Promise<CustomProfileImages> {
    this.requireStorage();

    const validation = validateProfileImageBytes(kind, new Uint8Array(body));
    if (!validation.ok) {
      const mapped = REJECTION_STATUS[validation.reason] ?? { status: 400, code: 'VALIDATION' as const };
      throw new ProfileServiceError(mapped.status, mapped.code, validation.message);
    }

    const previous = await this.readCustomImages(userId);

    let stored;
    try {
      stored = await storeProfileImage(userId, kind, validation.header.format, body);
    } catch (cause) {
      console.error('[profile] blob upload failed:', cause);
      throw new ProfileServiceError(502, 'STORAGE_UNAVAILABLE', 'Could not store that image. Try again in a moment.');
    }

    const nowIso = new Date().toISOString();
    const next: CustomProfileImages = {
      ...previous,
      [kind]: {
        url: stored.url,
        width: validation.header.width,
        height: validation.header.height,
        updatedAt: nowIso,
      },
    };

    await profiles().updateOne(
      { userId },
      { $set: { customImages: next, updatedAt: nowIso }, $inc: { profileVersion: 1 } },
    );

    // Only now is the old object unreferenced.
    await deleteProfileImage(previous[kind]?.url ?? null);
    return next;
  }

  /**
   * Clears one slot, falling the profile back to its equipped catalog
   * cosmetic (default portrait / gradient banner). The document is updated
   * before the blob is deleted, for the same reason as above.
   */
  async remove(userId: string, kind: ProfileImageKind): Promise<CustomProfileImages> {
    const previous = await this.readCustomImages(userId);
    if (!previous[kind]) return previous;

    const nowIso = new Date().toISOString();
    const next: CustomProfileImages = { ...previous, [kind]: null };
    await profiles().updateOne(
      { userId },
      { $set: { customImages: next, updatedAt: nowIso }, $inc: { profileVersion: 1 } },
    );
    await deleteProfileImage(previous[kind]?.url ?? null);
    return next;
  }
}
