/**
 * Header-parsing / validation tests for shared/profileImage.ts. Every
 * fixture is hand-built from the container spec rather than a checked-in
 * binary, so the assertions document WHY a byte matters (the 14-bit masks,
 * the minus-one canvas sizes) instead of asserting against an opaque blob.
 */
import { describe, expect, it } from 'vitest';
import {
  PROFILE_IMAGE_SPECS,
  isProfileImageKind,
  normalizeTransform,
  profileImageAspect,
  readImageHeader,
  validateProfileImageBytes,
} from '../profileImage';

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0, 0, 0, 13], 8); // IHDR length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // 'IHDR'
  bytes.set([(width >> 24) & 255, (width >> 16) & 255, (width >> 8) & 255, width & 255], 16);
  bytes.set([(height >> 24) & 255, (height >> 16) & 255, (height >> 8) & 255, height & 255], 20);
  return bytes;
}

function jpeg(width: number, height: number, { withPrecedingSegment = true } = {}): Uint8Array {
  const parts: number[] = [0xff, 0xd8];
  if (withPrecedingSegment) {
    // A JFIF APP0 segment ahead of the SOF, so the marker walk is exercised.
    parts.push(0xff, 0xe0, 0x00, 0x10);
    for (let i = 0; i < 14; i += 1) parts.push(0);
  }
  parts.push(0xff, 0xc0, 0x00, 0x11, 0x08);
  parts.push((height >> 8) & 255, height & 255, (width >> 8) & 255, width & 255);
  for (let i = 0; i < 6; i += 1) parts.push(0);
  return new Uint8Array(parts);
}

function webpLossy(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // 'RIFF'
  bytes.set([0x57, 0x45, 0x42, 0x50], 8); // 'WEBP'
  bytes.set([0x56, 0x50, 0x38, 0x20], 12); // 'VP8 '
  bytes.set([0x9d, 0x01, 0x2a], 23);
  bytes[26] = width & 255;
  bytes[27] = (width >> 8) & 0x3f;
  bytes[28] = height & 255;
  bytes[29] = (height >> 8) & 0x3f;
  return bytes;
}

function webpLossless(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(25);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x4c], 12); // 'VP8L'
  bytes[20] = 0x2f;
  const packed = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  bytes[21] = packed & 255;
  bytes[22] = (packed >> 8) & 255;
  bytes[23] = (packed >> 16) & 255;
  bytes[24] = (packed >> 24) & 255;
  return bytes;
}

function webpExtended(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0);
  bytes.set([0x57, 0x45, 0x42, 0x50], 8);
  bytes.set([0x56, 0x50, 0x38, 0x58], 12); // 'VP8X'
  const w = width - 1;
  const h = height - 1;
  bytes.set([w & 255, (w >> 8) & 255, (w >> 16) & 255], 24);
  bytes.set([h & 255, (h >> 8) & 255, (h >> 16) & 255], 27);
  return bytes;
}

describe('readImageHeader', () => {
  it('reads PNG dimensions from IHDR', () => {
    expect(readImageHeader(png(512, 444))).toEqual({ format: 'png', width: 512, height: 444 });
  });

  it('reads JPEG dimensions from the first SOF marker, skipping earlier segments', () => {
    expect(readImageHeader(jpeg(1800, 300))).toEqual({ format: 'jpeg', width: 1800, height: 300 });
    expect(readImageHeader(jpeg(640, 480, { withPrecedingSegment: false }))).toEqual({ format: 'jpeg', width: 640, height: 480 });
  });

  it('reads all three WebP chunk layouts', () => {
    expect(readImageHeader(webpLossy(512, 444))).toEqual({ format: 'webp', width: 512, height: 444 });
    expect(readImageHeader(webpLossless(512, 384))).toEqual({ format: 'webp', width: 512, height: 384 });
    expect(readImageHeader(webpExtended(1800, 300))).toEqual({ format: 'webp', width: 1800, height: 300 });
  });

  it('rejects bytes that are not one of the three containers', () => {
    expect(readImageHeader(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]))).toBeNull(); // a zip
    expect(readImageHeader(new Uint8Array(0))).toBeNull();
    // A RIFF container that isn't WebP at all (e.g. a WAV) must not parse.
    const wav = new Uint8Array(30);
    wav.set([0x52, 0x49, 0x46, 0x46], 0);
    wav.set([0x57, 0x41, 0x56, 0x45], 8);
    expect(readImageHeader(wav)).toBeNull();
  });

  it('rejects a truncated header rather than guessing at the missing bytes', () => {
    expect(readImageHeader(png(512, 444).slice(0, 18))).toBeNull();
    expect(readImageHeader(webpLossy(512, 444).slice(0, 24))).toBeNull();
  });
});

describe('validateProfileImageBytes', () => {
  it('accepts a cropper-sized avatar and banner', () => {
    const avatar = validateProfileImageBytes('avatar', webpLossy(512, 444));
    expect(avatar.ok).toBe(true);
    const banner = validateProfileImageBytes('banner', webpLossy(1800, 300));
    expect(banner.ok).toBe(true);
  });

  it('rejects an empty body', () => {
    const result = validateProfileImageBytes('avatar', new Uint8Array(0));
    expect(result).toMatchObject({ ok: false, reason: 'EMPTY' });
  });

  it('rejects a body over the per-kind byte limit before parsing it', () => {
    const oversized = new Uint8Array(PROFILE_IMAGE_SPECS.avatar.maxUploadBytes + 1);
    const result = validateProfileImageBytes('avatar', oversized);
    expect(result).toMatchObject({ ok: false, reason: 'TOO_LARGE' });
  });

  it('rejects a non-image whose Content-Type claimed otherwise', () => {
    const result = validateProfileImageBytes('avatar', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(result).toMatchObject({ ok: false, reason: 'UNSUPPORTED_FORMAT' });
  });

  it('rejects dimensions outside the per-kind bounds', () => {
    expect(validateProfileImageBytes('avatar', webpLossy(2048, 2048))).toMatchObject({ ok: false, reason: 'DIMENSIONS_TOO_LARGE' });
    expect(validateProfileImageBytes('avatar', webpLossy(32, 32))).toMatchObject({ ok: false, reason: 'DIMENSIONS_TOO_SMALL' });
    // A banner-shaped image in the avatar slot fails on WIDTH, not height —
    // which is what this asserts.
    expect(validateProfileImageBytes('avatar', webpLossy(1800, 300))).toMatchObject({ ok: false, reason: 'DIMENSIONS_TOO_LARGE' });
  });
});

describe('kind helpers', () => {
  it('narrows only the two real kinds', () => {
    expect(isProfileImageKind('avatar')).toBe(true);
    expect(isProfileImageKind('banner')).toBe(true);
    expect(isProfileImageKind('frame')).toBe(false);
    expect(isProfileImageKind(undefined)).toBe(false);
  });

  it('derives the cropper aspect from the output size', () => {
    // Avatar is the bounding box of a regular flat-top hexagon (2 : sqrt(3)),
    // NOT a square — the render-time mask would otherwise discard height the
    // player had deliberately framed.
    expect(profileImageAspect('avatar')).toBeCloseTo(2 / Math.sqrt(3), 2);
    expect(profileImageAspect('banner')).toBe(6);
  });
});

describe('normalizeTransform', () => {
  it('passes a legal transform through unchanged', () => {
    expect(normalizeTransform({ offsetX: 0.25, offsetY: -0.4, scale: 2.5 })).toEqual({ offsetX: 0.25, offsetY: -0.4, scale: 2.5 });
  });

  it('accepts the string form the query parameters arrive as', () => {
    expect(normalizeTransform({ offsetX: '0.5', offsetY: '-0.5', scale: '1.75' })).toEqual({ offsetX: 0.5, offsetY: -0.5, scale: 1.75 });
  });

  it('clamps rather than rejects, so a bad value degrades to a sane crop', () => {
    expect(normalizeTransform({ offsetX: 99, offsetY: -99, scale: 1000 })).toEqual({ offsetX: 1, offsetY: -1, scale: 4 });
    // Below cover would expose empty space inside the frame.
    expect(normalizeTransform({ scale: 0.1 }).scale).toBe(1);
  });

  it('falls back to a centred, unzoomed crop for junk input', () => {
    const identity = { offsetX: 0, offsetY: 0, scale: 1 };
    expect(normalizeTransform(undefined)).toEqual(identity);
    expect(normalizeTransform(null)).toEqual(identity);
    expect(normalizeTransform({ offsetX: 'abc', scale: NaN })).toEqual(identity);
  });
});
