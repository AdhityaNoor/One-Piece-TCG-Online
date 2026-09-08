/**
 * Hexagonal avatar-frame registry — how each `frame` cosmetic id from
 * server/src/profile/cosmeticCatalog.ts is DRAWN. Same split as
 * avatars.ts/banners.ts: the server owns which frame ids exist and who owns
 * them, this file owns nothing but presentation.
 *
 * Why a hexagon lives in code rather than in an image: the mask has to be
 * identical on the photo, on the ring and on the hover scrim, at every size
 * from a 28px friend row to a 128px profile card, and it has to be crisp on
 * a 3x display. One shared polygon, expressed once in normalized units and
 * reused as both a CSS clip-path and an SVG path, is the only way those
 * three layers stay registered with each other. A PNG mask would have to be
 * shipped per size and would fringe at the vertices.
 *
 * FUTURE FRAME ART is the reason `artPath` exists. Today every frame is a
 * stroked hexagon in a rarity colour, which is enough to ship. When real
 * frame art arrives (an ornate metal rim, a Haki aura, a seasonal wreath),
 * drop the asset under /public/frames/ and set `artPath` on that entry —
 * PlayerAvatar already renders it as an overlay above the photo and skips
 * the stroked fallback. No component changes, no new prop, no migration:
 * the equipped cosmetic id is already the only thing stored per player.
 *
 * Paths here are root-relative and served from /public, deliberately NOT
 * routed through resolveAssetUrl — same reasoning as avatars.ts's module
 * doc (only /public/card-images/ is Blob-hosted).
 */

/**
 * Pointy-top hexagon in a normalized 0..1 box. Pointy-top rather than
 * flat-top because a portrait's head sits in the upper middle of a square
 * crop: a flat-top hexagon's chamfered top corners cut into hair and hats,
 * while a pointy-top's widest span is at mid-height, where the face is.
 */
export const HEX_POINTS_NORMALIZED: readonly (readonly [number, number])[] = [
  [0.5, 0],
  [1, 0.25],
  [1, 0.75],
  [0.5, 1],
  [0, 0.75],
  [0, 0.25],
];

/** `clip-path` value for a hex-masked element. */
export const HEX_CLIP_PATH = `polygon(${HEX_POINTS_NORMALIZED.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')})`;

/**
 * The same hexagon as an SVG path in a viewBox of `size`, inset by
 * `inset` so a stroke of that width sits fully inside the box instead of
 * being clipped in half by the viewBox edge.
 */
export function hexPath(size = 100, inset = 0): string {
  const span = size - inset * 2;
  return (
    HEX_POINTS_NORMALIZED.map(([x, y], index) => {
      const px = inset + x * span;
      const py = inset + y * span;
      return `${index === 0 ? 'M' : 'L'}${px.toFixed(3)} ${py.toFixed(3)}`;
    }).join(' ') + ' Z'
  );
}

export interface AvatarFrameOption {
  id: string;
  label: string;
  /** Stroke colour for the generated hexagon ring. Ignored once `artPath` is set. */
  ringColor: string;
  /** Optional outer glow, for higher-rarity frames. */
  glowColor: string | null;
  /**
   * Root-relative path to frame ART that replaces the generated ring, e.g.
   * '/frames/gold.webp'. Null for every frame today — this is the extension
   * point, not dead code: PlayerAvatar branches on it already.
   */
  artPath: string | null;
}

/**
 * Ids mirror COSMETIC_CATALOG's `frame` entries 1:1. An id the server sends
 * that is missing here resolves to the default rather than rendering
 * nothing, so adding a frame server-side can never produce a frameless
 * photo on an older client.
 */
export const AVATAR_FRAMES: AvatarFrameOption[] = [
  { id: 'frame_hex_default', label: 'Standard Hex', ringColor: 'rgba(217,164,65,0.75)', glowColor: null, artPath: null },
  { id: 'frame_bronze', label: 'Bronze Frame', ringColor: '#b87333', glowColor: null, artPath: null },
  { id: 'frame_silver', label: 'Silver Frame', ringColor: '#cbd5e1', glowColor: 'rgba(203,213,225,0.35)', artPath: null },
  { id: 'frame_gold', label: 'Gold Frame', ringColor: '#d9a441', glowColor: 'rgba(217,164,65,0.45)', artPath: null },
];

export const DEFAULT_FRAME_ID = 'frame_hex_default';

/**
 * Resolves an equipped frame cosmetic id (possibly null, stale or unknown)
 * to something renderable. Null is the common case, not an error: a player
 * who has never equipped a frame still gets the standard hex, because an
 * uploaded photo is always masked and an unframed mask reads as a bug.
 */
export function resolveAvatarFrame(frameId: string | null | undefined): AvatarFrameOption {
  return (
    AVATAR_FRAMES.find((frame) => frame.id === frameId) ??
    AVATAR_FRAMES.find((frame) => frame.id === DEFAULT_FRAME_ID) ??
    AVATAR_FRAMES[0]
  );
}
