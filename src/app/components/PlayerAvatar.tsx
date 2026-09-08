/**
 * The single way a player's photo is drawn anywhere in the app — profile
 * card, friend rows, search results, request rows.
 *
 * It carries the one rule that must not be re-decided per call site: an
 * UPLOADED photo is hex-masked and framed, a DEFAULT catalog portrait is
 * not. The shipped portraits under /public/avatars/ are transparent-
 * background webps drawn to read as a free-floating silhouette (see
 * lib/avatars.ts); masking one to a hexagon would slice the character's
 * hair and shoulders off for no gain. An arbitrary uploaded photo has the
 * opposite problem — it is a rectangle with a hard edge, and the hexagon is
 * what makes it belong on the same screen. Both cases share this component
 * so the sizing, ring and hover treatment stay identical.
 *
 * Sizing is a single `size` in px driving inline width/height rather than
 * Tailwind classes, because the SVG frame's stroke width has to scale with
 * it and a class name can't be read back at runtime.
 */
import { avatarCatalogIdToOptionId, resolveAvatarUrl } from '../lib/avatars';
import { HEX_CLIP_PATH, hexPath, resolveAvatarFrame } from '../lib/avatarFrames';

export interface PlayerAvatarProps {
  /** Uploaded photo URL. When set, this wins over `catalogAvatarId` — never render both. */
  imageUrl?: string | null;
  /** Local avatar option id ('luffy'), already bridged from the catalog id by the caller. */
  catalogAvatarId?: string | null;
  /** Equipped frame cosmetic id; only consulted for uploaded photos. */
  frameId?: string | null;
  size: number;
  /** Rendered above everything (a hover scrim, an online dot). */
  children?: React.ReactNode;
  className?: string;
  alt?: string;
}

export function PlayerAvatar({
  imageUrl,
  catalogAvatarId,
  frameId,
  size,
  children,
  className,
  alt = '',
}: PlayerAvatarProps) {
  const custom = Boolean(imageUrl);
  const frame = resolveAvatarFrame(frameId);
  // Thin rings vanish at 28px and look heavy at 128px, so the stroke tracks
  // the size instead of being a constant, with a floor so it never
  // sub-pixels away entirely.
  const strokeWidth = Math.max(2, Math.round(size * 0.045));

  if (!custom) {
    return (
      <span
        className={['relative inline-flex shrink-0 items-center justify-center', className ?? ''].join(' ')}
        style={{ width: size, height: size }}
      >
        <img
          src={resolveAvatarUrl(catalogAvatarId)}
          alt={alt}
          draggable={false}
          className="h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
        />
        {children}
      </span>
    );
  }

  return (
    <span
      className={['relative inline-flex shrink-0', className ?? ''].join(' ')}
      style={{
        width: size,
        height: size,
        filter: frame.glowColor ? `drop-shadow(0 0 ${Math.round(size * 0.08)}px ${frame.glowColor})` : undefined,
      }}
    >
      {/* The photo, masked. `object-cover` is required, not cosmetic: the
          stored upload is always square (avatar) but a browser that failed
          to honour the cropper's output size would letterbox inside the
          hexagon and expose the backdrop through the mask. */}
      <span
        className="absolute inset-0 overflow-hidden bg-[#0a1226]"
        style={{ clipPath: HEX_CLIP_PATH }}
      >
        <img src={imageUrl!} alt={alt} draggable={false} className="h-full w-full object-cover" />
      </span>

      {/* Frame layer. Art when a frame provides it, otherwise the generated
          ring — see lib/avatarFrames.ts on why `artPath` exists. */}
      {frame.artPath ? (
        <img
          src={frame.artPath}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
        >
          {/* Inset by half the stroke so the ring sits inside the box and
              isn't shaved by the viewBox edge at the six vertices. */}
          <path
            d={hexPath(100, strokeWidth / 2)}
            fill="none"
            stroke={frame.ringColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {children}
    </span>
  );
}

/**
 * Convenience wrapper for list rows, which all resolve the same three
 * fields off a FriendSummary / PlayerSearchResult and would otherwise
 * repeat the catalog-id bridge at every call site.
 */
export function PlayerAvatarThumb({
  avatarImageUrl,
  avatarCatalogId,
  avatarFrameId,
  size = 34,
  className,
}: {
  avatarImageUrl: string | null | undefined;
  avatarCatalogId: string | null | undefined;
  avatarFrameId?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <PlayerAvatar
      imageUrl={avatarImageUrl}
      catalogAvatarId={avatarCatalogIdToOptionId(avatarCatalogId)}
      frameId={avatarFrameId}
      size={size}
      className={className}
    />
  );
}
