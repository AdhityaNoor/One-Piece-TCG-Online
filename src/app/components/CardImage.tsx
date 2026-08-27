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
  /**
   * Copy for the empty state. Defaults to "No image available", which is right when a
   * card EXISTS but its art is missing — and wrong when the slot is empty on purpose
   * (the deck builder's leader well, where it reads as a broken image rather than an
   * invitation). Pass what the empty slot actually means there.
   */
  placeholderLabel?: string;
}

// NOTE: every prop above must ALSO appear in the destructure below. A prop added to the
// type but not destructured is `undefined` at runtime with no type error — that class of
// omission blanked the screen once already (see DockHandCard).
export function CardImage({ src, alt, className, eager, placeholderLabel }: CardImageProps) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = src === null || failed;

  return (
    <div
      className={[
        'relative aspect-[63/88] w-full overflow-hidden border border-[rgb(var(--op-gold-rgb)/0.2)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.14),_rgba(255,255,255,0.05))] shadow-[0_12px_26px_rgba(0,0,0,0.24)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-100/35">
          <span className="h-8 w-5 border-2 border-current shadow-[3px_3px_0_rgba(255,255,255,0.08)]" aria-hidden="true" />
          <span className="px-2 text-center font-heading text-[10px] font-bold uppercase leading-tight tracking-[0.14em]">{placeholderLabel ?? 'No image available'}</span>
        </div>
      ) : (
        // draggable={false}: without it, pressing a card image starts the
        // browser's NATIVE image drag, which fires pointercancel and kills any
        // custom pointer gesture on an ancestor — that's what stopped hand
        // cards from being draggable except by their Play button.
        <img src={resolveAssetUrl(src) ?? undefined} alt={alt} draggable={false} loading={eager ? 'eager' : 'lazy'} onError={() => setFailed(true)} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
