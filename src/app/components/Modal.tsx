/**
 * Generic modal shell with a more dramatic game-panel style.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidthClassName?: string;
  panelStyle?: CSSProperties;
  bodyClassName?: string;
  showCloseButton?: boolean;
  rootClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = 'max-w-lg',
  panelStyle,
  bodyClassName = 'max-h-[80vh] overflow-y-auto',
  showCloseButton = true,
  rootClassName,
}: ModalProps) {
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
    <div
      className={['op-modal-root fixed inset-0 z-[120] flex items-center justify-center p-4', rootClassName ?? ''].join(' ')}
      role="dialog"
      aria-modal="true"
    >
      <div className="op-modal-backdrop absolute inset-0 bg-slate-950/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={[
          'op-modal-panel relative z-10 w-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-navy-900 to-navy-950 text-slate-100 shadow-[0_30px_80px_rgba(0,0,0,0.55)]',
          maxWidthClassName,
        ].join(' ')}
        style={panelStyle}
      >
        {title ? (
          <div className="op-modal-header flex items-center justify-between border-b border-white/10 px-5 py-4">
            <h2 className="op-modal-title text-base font-bold uppercase tracking-[0.16em] text-white">{title}</h2>
            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="op-modal-close flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                x
              </button>
            ) : null}
          </div>
        ) : showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="op-modal-close absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/70 shadow hover:text-white"
          >
            x
          </button>
        ) : null}
        <div className={['op-modal-body', bodyClassName].join(' ')}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
