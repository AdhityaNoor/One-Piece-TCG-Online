/**
 * Generic modal shell — backdrop + centered panel, Esc-to-close, click
 * outside to close. Used directly for confirmation dialogs and as the base
 * for CardDetailModal. Rendered via a portal into `document.body` so it
 * never gets clipped by a scrolling board/grid container underneath it.
 *
 * Pure UI plumbing: a Modal never knows what's inside it, so it can never
 * become a place game-rule logic accidentally leaks into (project rule:
 * the UI must never decide legality/outcome).
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

export function Modal({ open, onClose, title, children, maxWidthClassName = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} aria-hidden="true" />
      <div className={['relative z-10 w-full overflow-hidden rounded-2xl bg-white shadow-2xl', maxWidthClassName].join(' ')}>
        {title ? (
          <div className="flex items-center justify-between border-b border-navy-900/10 px-5 py-4">
            <h2 className="text-base font-bold text-navy-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-navy-900/50 hover:bg-surface-panel hover:text-navy-900"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy-900/60 shadow hover:text-navy-900"
          >
            ✕
          </button>
        )}
        <div className="max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
