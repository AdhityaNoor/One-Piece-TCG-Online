/**
 * The "this is a fan project" disclaimer, in its two forms.
 *
 * WHY IT IS PROMINENT: a disclaimer buried three screens deep is worth very
 * little as evidence of good faith — the whole value of saying "unofficial,
 * not affiliated, nothing for sale" is that a player (or a rights holder)
 * sees it without hunting. So it appears as a one-time notice on first run
 * and as a permanent line wherever the app has a resting surface.
 *
 * `FanProjectNotice` self-gates on localStorage and renders nothing once
 * acknowledged, so it is safe to mount unconditionally at the app root.
 * Storage failures (private mode, blocked site data) fall back to showing
 * the notice rather than crashing: an extra dismissal is a far better
 * failure than a white screen.
 *
 * Canonical wording lives in docs/legal/DISCLAIMER-COPY.md. Keep the two in
 * step — that file is also what the rights-holder-facing pages quote.
 */
import { useCallback, useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export const DISCLAIMER_ACK_KEY = 'optcg.disclaimerAck';

/** Reads the acknowledgement without ever throwing — see module doc. */
function hasAcknowledged(): boolean {
  try {
    return window.localStorage.getItem(DISCLAIMER_ACK_KEY) === '1';
  } catch {
    return false;
  }
}

function acknowledge(): void {
  try {
    window.localStorage.setItem(DISCLAIMER_ACK_KEY, '1');
  } catch {
    // Ignored on purpose: the player still dismissed it for this session, and
    // a browser that refuses storage will simply ask again next visit.
  }
}

export interface FanProjectNoticeProps {
  /** Opens the full legal documents. Rendered as a secondary link when given. */
  onOpenLegal?: () => void;
}

export function FanProjectNotice({ onOpenLegal }: FanProjectNoticeProps) {
  const [open, setOpen] = useState(false);

  // Deferred to an effect rather than a useState initialiser so the first
  // render never touches localStorage — that keeps this component renderable
  // under the `node` Vitest environment (see vite.config.ts test.environment).
  useEffect(() => {
    if (!hasAcknowledged()) setOpen(true);
  }, []);

  const dismiss = useCallback(() => {
    acknowledge();
    setOpen(false);
  }, []);

  return (
    <Modal open={open} onClose={dismiss} title="This is a fan-made simulator" maxWidthClassName="max-w-xl" showCloseButton={false}>
      <div className="flex flex-col gap-4 p-5 text-sm leading-6 text-slate-200/85">
        <p>
          OPTCG YoHoHo! is an <strong className="text-white">unofficial, non-commercial fan project</strong>. It is
          not affiliated with or endorsed by Bandai, Shueisha, Toei Animation, or Eiichiro Oda, and all card art, card
          text, and trademarks belong to them.
        </p>
        <p>
          Nothing is sold here. The rules engine is a fan reimplementation and it can be wrong — for anything that
          matters, the official rules and an official judge are always right.
        </p>
        <p className="text-white/60">Please support the official release.</p>

        <div className="mt-1 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
          {onOpenLegal ? (
            <button
              type="button"
              onClick={() => {
                dismiss();
                onOpenLegal();
              }}
              className="font-semibold text-[rgb(var(--op-gold-rgb))] underline underline-offset-4 transition hover:brightness-125"
            >
              Read the full terms
            </button>
          ) : (
            <span />
          )}
          <Button variant="primary" onClick={dismiss}>
            Got it
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * The permanent one-liner. Deliberately plain text with an optional link —
 * it has to read as a statement of fact, not as marketing chrome.
 */
export function FanProjectDisclaimerLine({ onOpenLegal, className }: { onOpenLegal?: () => void; className?: string }) {
  return (
    <p className={['text-center text-[10px] leading-4 text-white/35', className ?? ''].filter(Boolean).join(' ')}>
      Unofficial fan project. Not affiliated with or endorsed by Bandai, Shueisha, Toei Animation, or Eiichiro Oda. All
      card images, card text, and trademarks are the property of their respective owners. Nothing here is for sale.
      {onOpenLegal && (
        <>
          {' '}
          <button
            type="button"
            onClick={onOpenLegal}
            className="font-semibold text-white/55 underline underline-offset-2 transition hover:text-white"
          >
            Terms, Privacy & Takedowns
          </button>
        </>
      )}
    </p>
  );
}
