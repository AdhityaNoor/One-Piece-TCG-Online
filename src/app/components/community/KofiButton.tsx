/**
 * Ko-fi's own button, linking out to the project's Ko-fi page.
 *
 * WHY A BUTTON AND NOT KO-FI'S EMBED: Ko-fi's embeddable form is a
 * fixed-layout page ~660px tall (avatar, heading, one-time/monthly toggle,
 * amount stepper, two text fields, submit, footer) that scrolls inside its own
 * card below that height. It does not fit anywhere in this app without either
 * a scrollbar or shrinking it past readability, and Ko-fi's real page gives
 * the form the room it needs.
 *
 * The image is Ko-fi's own asset from their CDN — the same one their button
 * generator hands out — rather than a self-drawn lookalike or their
 * `Widget_2.js`, which draws the identical button but wants a page ID we do
 * not have and injects DOM outside React's control.
 *
 * Renders nothing when VITE_KOFI_USERNAME is unset.
 */
import { KOFI_USERNAME, kofiButtonImageUrl, kofiPageUrl } from '../../config/community';

export interface KofiButtonProps {
  /** Applied to the link. Callers own the sizing. */
  className?: string;
  /** Height utility for the image, so callers can scale it per surface. */
  imageClassName?: string;
}

export function KofiButton({ className, imageClassName }: KofiButtonProps) {
  if (!KOFI_USERNAME) return null;

  return (
    <a
      href={kofiPageUrl(KOFI_USERNAME)}
      target="_blank"
      rel="noreferrer noopener"
      className={[
        'inline-flex flex-shrink-0 items-center justify-center transition hover:opacity-90',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]',
        className ?? '',
      ].join(' ')}
    >
      <img
        src={kofiButtonImageUrl()}
        /* Real alt text, not an empty decorative string: this image is the
           link's only label, so a screen reader needs it — and if Ko-fi's CDN
           ever fails the browser renders this text in place of the image,
           which keeps the link usable instead of leaving a blank strip. */
        alt={`Support ${KOFI_USERNAME} on Ko-fi`}
        className={['w-auto max-w-full', imageClassName ?? 'h-9'].join(' ')}
        draggable={false}
        loading="lazy"
      />
    </a>
  );
}
