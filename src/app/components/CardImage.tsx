/**
 * Renders one card's art, or a graceful placeholder when there isn't any.
 */
import { useState } from 'react';
import { resolveAssetUrl } from '../lib/assetUrl';

export interface CardImageProps {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}

export function CardImage({ src, alt, className, eager }: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = src === null || failed;

  return (
    <div
      className={[
        'relative aspect-[63/88] w-full overflow-hidden border border-gold/20 bg-[linear-gradient(180deg,_rgba(255,255,255,0.14),_rgba(255,255,255,0.05))] shadow-[0_12px_26px_rgba(0,0,0,0.24)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-100/35">
          <span className="h-8 w-5 border-2 border-current shadow-[3px_3px_0_rgba(255,255,255,0.08)]" aria-hidden="true" />
          <span className="px-2 text-center font-heading text-[10px] font-bold uppercase leading-tight tracking-[0.14em]">No image available</span>
        </div>
      ) : (
        <img src={resolveAssetUrl(src) ?? undefined} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
