/**
 * Floating choice panel — exact coloring and chrome as BacksoundControl's gear menu.
 */
import { createPortal } from 'react-dom';
import { createContext, useContext, type ReactNode } from 'react';
import {
  SETTINGS_PANEL_BODY,
  SETTINGS_PANEL_INSET,
  SETTINGS_PANEL_LABEL,
  SETTINGS_PANEL_META,
  SETTINGS_PANEL_OPTION,
  SETTINGS_PANEL_OPTION_DISABLED,
  SETTINGS_PANEL_SCRIM,
  SETTINGS_PANEL_SHELL,
  SETTINGS_PANEL_TITLE,
} from '../settingsPanelStyles';

export interface ChoicePromptShellProps {
  title: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

/**
 * Desktop-only visibility switch for every ChoicePromptShell-based popup —
 * provided by MatchScreen's floating-popup hide/show chevron (see its
 * "hovering popup" doc comment) so the player can peek at the board without
 * losing the outstanding choice underneath. PendingChoicePrompt.tsx's own
 * component instance (and all its local useState) stays mounted either way;
 * only the shell's rendered output is suppressed. Defaults to never-hidden
 * so any other/future ChoicePromptShell caller without a provider is
 * unaffected. NOT consulted by SetupTossOverlay (the 5-2-1-4 coin-toss
 * cinematic) — that one deliberately stays a permanent full-screen sequence,
 * see PendingChoicePrompt.tsx's doc comment on SetupTossOverlay.
 */
export const ChoicePromptVisibilityContext = createContext<{ hidden: boolean }>({ hidden: false });

export function ChoicePromptShell({ title, children, maxWidthClassName = 'max-w-md' }: ChoicePromptShellProps) {
  const { hidden } = useContext(ChoicePromptVisibilityContext);
  if (hidden) return null;

  return createPortal(
    <div
      className="op-choice-prompt-root fixed inset-0 z-50 flex items-start justify-center p-4 pt-[7vh] font-body text-white xl:pt-[9vh]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`op-choice-prompt-scrim absolute inset-0 ${SETTINGS_PANEL_SCRIM}`} aria-hidden="true" />
      <div
        className={[
          'op-choice-prompt-panel relative z-10 flex w-full max-h-[min(80vh,920px)] flex-col overflow-y-auto p-3',
          maxWidthClassName,
          SETTINGS_PANEL_SHELL,
        ].join(' ')}
      >
        <p className={SETTINGS_PANEL_TITLE}>{title}</p>
        <div className="mt-3 flex flex-col gap-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ChoicePromptMessage({ children }: { children: ReactNode }) {
  return <p className={SETTINGS_PANEL_BODY}>{children}</p>;
}

export function ChoicePromptMeta({ children }: { children: ReactNode }) {
  return <p className={SETTINGS_PANEL_META}>{children}</p>;
}

export function ChoicePromptInset({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className={SETTINGS_PANEL_INSET}>
      {title ? <p className={`mb-2 ${SETTINGS_PANEL_LABEL}`}>{title}</p> : null}
      {children}
    </div>
  );
}

export function ChoicePromptActionList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

export function ChoicePromptActionRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function ChoicePromptOption({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[SETTINGS_PANEL_OPTION, SETTINGS_PANEL_OPTION_DISABLED, 'min-h-[2.5rem]', className ?? ''].join(' ')}
    >
      {children}
    </button>
  );
}

export function ChoicePromptError({ messages }: { messages: string[] }) {
  return (
    <div className={SETTINGS_PANEL_INSET}>
      <p className={SETTINGS_PANEL_BODY}>{messages.join(' ')}</p>
    </div>
  );
}
