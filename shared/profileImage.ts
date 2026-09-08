/**
 * Custom profile-image (avatar / banner upload) contract, shared by the
 * Vercel frontend and the Cloud Run backend — same "types plus pure
 * functions, no runtime dependencies, no build step" rule as
 * shared/profile.ts and shared/progression.ts.
 *
 * Why the sniffing lives HERE and not in the server only: the client needs
 * the exact same limits to reject a file before spending a crop + upload
 * round-trip on it, and a limit that is written down twice drifts. The
 * server still re-validates every byte it receives (project rule: never
 * trust the client) — this module is the single definition both sides run.
 *
 * The uploaded bytes are always the CROPPER'S OUTPUT, never the file the
 * player picked: src/app/components/ImageCropModal.tsx re-encodes the
 * selected region to a fixed-size WebP, so the accepted-dimension ceilings
 * below are a sanity bound on a well-behaved client, and the magic-byte
 * check is the real gate against a hand-rolled request.
 *
 * Deliberately NOT an image decoder. Reading a container's header is enough
 * to answer "is this really a PNG/JPEG/WebP, and how big is it" without
 * pulling a native dependency into a Cloud Run container; anything that
 * fails to parse is rejected rather than guessed at.
 */

export type ProfileImageKind = 'avatar' | 'banner';

export type ProfileImageFormat = 'webp' | 'png' | 'jpeg';

/** MIME types the upload route accepts. Order is preference order for the client encoder. */
export const PROFILE_IMAGE_MIME_TYPES: Record<ProfileImageFormat, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpeg: 'image/jpeg',
};

/** What a file input may offer the player — wider than the upload formats because the cropper re-encodes. */
export const PROFILE_IMAGE_ACCEPT_ATTRIBUTE = 'image/png,image/jpeg,image/webp,image/gif';

/** Hard ceiling on the file a player may SELECT, before cropping. Rejected in the picker, never uploaded. */
export const MAX_SOURCE_FILE_BYTES = 8 * 1024 * 1024;

export interface ProfileImageSpec {
  /** Pixel size the cropper renders to, and the exact size the server expects back. */
  outputWidth: number;
  outputHeight: number;
  /** Upper bound on the encoded upload. Generous vs. the cropper's real output so a low-compression client still fits. */
  maxUploadBytes: number;
  /** Tolerance around outputWidth/outputHeight, so a device-pixel-ratio rounding difference isn't a 400. */
  maxWidth: number;
  maxHeight: number;
  minWidth: number;
  minHeight: number;
}

/**
 * Avatar is square because the hexagon is a *display mask* applied at render
 * time (see src/app/lib/avatarFrames.ts), not baked into the stored pixels —
 * that way a future frame with a different silhouette can re-mask the same
 * upload instead of forcing every player to re-crop.
 */
export const PROFILE_IMAGE_SPECS: Record<ProfileImageKind, ProfileImageSpec> = {
  avatar: {
    outputWidth: 512,
    outputHeight: 512,
    maxUploadBytes: 1024 * 1024,
    maxWidth: 1024,
    maxHeight: 1024,
    minWidth: 96,
    minHeight: 96,
  },
  banner: {
    outputWidth: 1600,
    outputHeight: 400,
    maxUploadBytes: 3 * 1024 * 1024,
    maxWidth: 2400,
    maxHeight: 900,
    minWidth: 480,
    minHeight: 120,
  },
};

/** Aspect ratio (width / height) the cropper constrains the selection to. */
export function profileImageAspect(kind: ProfileImageKind): number {
  const spec = PROFILE_IMAGE_SPECS[kind];
  return spec.outputWidth / spec.outputHeight;
}

export function isProfileImageKind(value: unknown): value is ProfileImageKind {
  return value === 'avatar' || value === 'banner';
}

// ---- header parsing --------------------------------------------------------

export interface ImageHeader {
  format: ProfileImageFormat;
  width: number;
  height: number;
}

function u16be(bytes: Uint8Array, at: number): number {
  return (bytes[at] << 8) | bytes[at + 1];
}

function u32le(bytes: Uint8Array, at: number): number {
  return (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
}

function u32be(bytes: Uint8Array, at: number): number {
  return ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;
}

function matches(bytes: Uint8Array, at: number, signature: number[]): boolean {
  if (bytes.length < at + signature.length) return false;
  return signature.every((byte, index) => bytes[at + index] === byte);
}

function ascii(bytes: Uint8Array, at: number, length: number): string {
  let out = '';
  for (let i = 0; i < length && at + i < bytes.length; i += 1) out += String.fromCharCode(bytes[at + i]);
  return out;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** PNG: IHDR is always the first chunk, width/height are big-endian u32 at byte 16. */
function parsePng(bytes: Uint8Array): ImageHeader | null {
  if (!matches(bytes, 0, PNG_SIGNATURE)) return null;
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== 'IHDR') return null;
  return { format: 'png', width: u32be(bytes, 16), height: u32be(bytes, 20) };
}

/**
 * JPEG: walk the marker segments to the first Start-Of-Frame (SOFn, excluding
 * the DHT/JPG/DAC markers that share the 0xC_ range) and read its dimensions.
 * Entropy-coded scan data is never reached because SOF always precedes SOS.
 */
function parseJpeg(bytes: Uint8Array): ImageHeader | null {
  if (!matches(bytes, 0, [0xff, 0xd8])) return null;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end of image / start of scan, no SOF found
    const length = u16be(bytes, offset + 2);
    if (length < 2) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 >= bytes.length) return null;
      return { format: 'jpeg', height: u16be(bytes, offset + 5), width: u16be(bytes, offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/**
 * WebP: a RIFF container whose first chunk identifies the codec —
 * 'VP8 ' (lossy), 'VP8L' (lossless) or 'VP8X' (extended, e.g. alpha or
 * animation). Each stores its canvas size differently, so all three are
 * handled rather than assuming the lossy layout a canvas.toBlob happens to
 * produce today.
 */
function parseWebp(bytes: Uint8Array): ImageHeader | null {
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return null;
  const chunk = ascii(bytes, 12, 4);

  if (chunk === 'VP8 ') {
    // Lossy: 3-byte frame tag, then the 0x9d012a start code, then 14-bit w/h.
    if (bytes.length < 30) return null;
    if (!matches(bytes, 23, [0x9d, 0x01, 0x2a])) return null;
    return {
      format: 'webp',
      width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
      height: (bytes[28] | (bytes[29] << 8)) & 0x3fff,
    };
  }

  if (chunk === 'VP8L') {
    // Lossless: signature byte 0x2f, then 14 bits width and 14 bits height, minus one.
    if (bytes.length < 25 || bytes[20] !== 0x2f) return null;
    const bits = u32le(bytes, 21);
    return {
      format: 'webp',
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  if (chunk === 'VP8X') {
    // Extended: canvas size as two 24-bit little-endian values, minus one.
    if (bytes.length < 30) return null;
    const width = (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)) + 1;
    const height = (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)) + 1;
    return { format: 'webp', width, height };
  }

  return null;
}

/**
 * Identifies the image from its own bytes. Returns null for anything that
 * isn't one of the three accepted containers — a declared Content-Type is
 * never consulted, so renaming a .zip to .webp fails here.
 */
export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  return parsePng(bytes) ?? parseJpeg(bytes) ?? parseWebp(bytes) ?? null;
}

// ---- validation ------------------------------------------------------------

export type ProfileImageRejectionReason =
  | 'EMPTY'
  | 'TOO_LARGE'
  | 'UNSUPPORTED_FORMAT'
  | 'DIMENSIONS_TOO_LARGE'
  | 'DIMENSIONS_TOO_SMALL';

export type ProfileImageValidation =
  | { ok: true; header: ImageHeader }
  | { ok: false; reason: ProfileImageRejectionReason; message: string };

export function validateProfileImageBytes(kind: ProfileImageKind, bytes: Uint8Array): ProfileImageValidation {
  const spec = PROFILE_IMAGE_SPECS[kind];

  if (bytes.length === 0) {
    return { ok: false, reason: 'EMPTY', message: 'The uploaded image was empty.' };
  }
  if (bytes.length > spec.maxUploadBytes) {
    return {
      ok: false,
      reason: 'TOO_LARGE',
      message: `That ${kind} is ${formatBytes(bytes.length)}; the limit is ${formatBytes(spec.maxUploadBytes)}.`,
    };
  }

  const header = readImageHeader(bytes);
  if (!header) {
    return { ok: false, reason: 'UNSUPPORTED_FORMAT', message: 'Only PNG, JPEG and WebP images are accepted.' };
  }
  if (header.width > spec.maxWidth || header.height > spec.maxHeight) {
    return {
      ok: false,
      reason: 'DIMENSIONS_TOO_LARGE',
      message: `That ${kind} is ${header.width}x${header.height}; the limit is ${spec.maxWidth}x${spec.maxHeight}.`,
    };
  }
  if (header.width < spec.minWidth || header.height < spec.minHeight) {
    return {
      ok: false,
      reason: 'DIMENSIONS_TOO_SMALL',
      message: `That ${kind} is ${header.width}x${header.height}; at least ${spec.minWidth}x${spec.minHeight} is required.`,
    };
  }
  return { ok: true, header };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** File extension for a Blob pathname, so the CDN serves a sane Content-Type. */
export function extensionForFormat(format: ProfileImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}
