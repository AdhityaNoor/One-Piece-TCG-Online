/**
 * Floating choice panel — exact coloring and chrome as BacksoundControl's gear menu.
 */
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
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

export function ChoicePromptShell({ title, children, maxWidthClassName = 'max-w-md' }: ChoicePromptShellProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 font-body text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`absolute inset-0 ${SETTINGS_PANEL_SCRIM}`} aria-hidden="true" />
      <div
        className={[
          'relative z-10 flex w-full max-h-[min(88vh,920px)] flex-col overflow-y-auto p-3',
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
