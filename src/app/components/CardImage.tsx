/**
 * Renders one card's art, or a graceful placeholder when there isn't any.
 * `src === null` is a real, expected case (see cards/library/cardPrintingSummary.ts
 * CardPrintingRef.imageUrl doc) — e.g. promos/decks rows that never carried
 * art, or art not yet resolved — so this is not an error state, just a
 * fallback. A failed network load (broken URL) degrades to the same
 * placeholder via onError, rather than showing a broken-image icon.
 *
 * Fixed aspect ratio matches a physical OPTCG card (63mm x 88mm ≈ 0.716)
 * so grids never jump around as images load in.
 */
import { useState } from 'react';

export interface CardImageProps {
  src: string | null;
  alt: string;
  className?: string;
  /** Skip native lazy-loading for the one image that's already in view (e.g. inside CardDetailModal). */
  eager?: boolean;
}

export function CardImage({ src, alt, className, eager }: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = src === null || failed;

  return (
    <div
      className={[
        'relative aspect-[63/88] w-full overflow-hidden rounded-xl bg-surface-card',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-navy-900/30">
          <span className="text-2xl" aria-hidden="true">
            🂠
          </span>
          <span className="px-2 text-center text-[10px] font-medium leading-tight">No image available</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
