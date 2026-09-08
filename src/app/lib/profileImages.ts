/**
 * Client half of the profile-image feature: picking a file, encoding the
 * cropper's output, and deciding what a profile card actually paints.
 *
 * The limits and the format sniffing are NOT redefined here — they come
 * from shared/profileImage.ts, the same module the server validates with.
 * This file only adds the browser-only parts: File/Blob handling, canvas
 * encoding, and the two resolvers that answer "custom upload or equipped
 * cosmetic?" for the avatar and banner slots.
 */
import type { CustomProfileImages, PlayerProfile } from '../../../shared/profile';
import {
  MAX_SOURCE_FILE_BYTES,
  PROFILE_IMAGE_SPECS,
  formatBytes,
  type ProfileImageKind,
} from '../../../shared/profileImage';
import { avatarCatalogIdToOptionId } from './avatars';
import { resolveBannerGradient } from './banners';

/** Content types a file input may hand us. GIF is allowed in, but the cropper re-encodes to a still WebP. */
const ACCEPTED_SOURCE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export interface SourceFileRejection {
  message: string;
}

/**
 * Gate applied the moment a file is chosen, before any decode work. Cheap
 * checks only — the authoritative format check happens on the encoded
 * output, server-side.
 */
export function rejectSourceFile(file: File): SourceFileRejection | null {
  if (!ACCEPTED_SOURCE_TYPES.includes(file.type)) {
    return { message: 'Choose a PNG, JPEG, WebP or GIF image.' };
  }
  if (file.size > MAX_SOURCE_FILE_BYTES) {
    return { message: `That file is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_SOURCE_FILE_BYTES)}.` };
  }
  return null;
}

/**
 * Encodes a canvas to the smallest acceptable upload.
 *
 * WebP first, PNG as the fallback: WebP at q0.85 lands a 512x512 portrait
 * around 30-60KB where the equivalent PNG is often ten times that, and the
 * server accepts both. `toBlob` hands back null (or silently substitutes
 * PNG) on a browser that can't encode the requested type, which is why the
 * result's own `type` is checked rather than assumed.
 */
export async function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await canvasToBlob(canvas, 'image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;
  const png = await canvasToBlob(canvas, 'image/png');
  if (png) return png;
  throw new Error('This browser could not encode the cropped image.');
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Loads a File into a decoded HTMLImageElement, revoking the object URL either way. */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('That image could not be read.'));
    };
    image.src = objectUrl;
  });
}

/** Human-readable limit line for the upload UI, kept in sync with the shared spec by construction. */
export function uploadLimitHint(kind: ProfileImageKind): string {
  const spec = PROFILE_IMAGE_SPECS[kind];
  return `PNG, JPEG, WebP or GIF up to ${formatBytes(MAX_SOURCE_FILE_BYTES)}. Saved at ${spec.outputWidth}x${spec.outputHeight}.`;
}

// ---- what a profile card paints -------------------------------------------

export interface ResolvedAvatar {
  /** Uploaded photo URL, or null to fall back to the catalog portrait. */
  imageUrl: string | null;
  /** Local avatar option id for the fallback portrait. */
  optionId: string | null;
  frameId: string | null;
  isCustom: boolean;
}

/**
 * The upload wins over the equipped cosmetic whenever it exists. Equipping
 * a portrait does NOT clear an upload — the two are stored independently
 * (see shared/profile.ts's CustomProfileImages doc), so removing the upload
 * is what reveals the portrait again.
 */
export function resolveProfileAvatar(profile: Pick<PlayerProfile, 'equippedCosmetics' | 'customImages'>): ResolvedAvatar {
  const custom = profile.customImages?.avatar ?? null;
  return {
    imageUrl: custom?.url ?? null,
    optionId: avatarCatalogIdToOptionId(profile.equippedCosmetics.avatar),
    frameId: profile.equippedCosmetics.frame,
    isCustom: Boolean(custom),
  };
}

export interface ResolvedBanner {
  /** A ready-to-use CSS `background` value: either the uploaded image or the equipped gradient. */
  background: string;
  isCustom: boolean;
}

export function resolveProfileBanner(profile: Pick<PlayerProfile, 'equippedCosmetics' | 'customImages'>): ResolvedBanner {
  const custom = profile.customImages?.banner ?? null;
  if (custom) {
    // The gradient stays underneath as the load/transparency backstop, so a
    // slow CDN response shows the player's equipped colour rather than a
    // flash of empty panel.
    return {
      background: `url("${custom.url}") center / cover no-repeat, ${resolveBannerGradient(profile.equippedCosmetics.banner)}`,
      isCustom: true,
    };
  }
  return { background: resolveBannerGradient(profile.equippedCosmetics.banner), isCustom: false };
}

export const EMPTY_CUSTOM_IMAGES: CustomProfileImages = { avatar: null, banner: null };
