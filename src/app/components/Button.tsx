/**
 * Pill-shaped action button — the project's one button primitive. Visual
 * direction follows the reference look the user pointed at (optcgcustom.app):
 * a solid red "primary" pill for the main action, a white/outlined pill for
 * secondary actions, and a plain text "ghost" variant for low-emphasis taps.
 * Purely presentational — never decides whether an action is legal. Callers
 * (screens) are responsible for disabling/hiding a Button when the
 * corresponding action would fail validation (see engine/validation).
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Optional leading icon/element — kept generic rather than a fixed icon-prop name so any small ReactNode (emoji, lucide icon, etc.) works. */
  leading?: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-700 active:bg-brand-700 disabled:bg-brand/50',
  secondary: 'bg-white text-navy-900 border border-navy-900/15 hover:bg-surface-panel disabled:text-navy-900/40',
  ghost: 'bg-transparent text-navy-900 hover:bg-navy-900/5 disabled:text-navy-900/40',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:text-red-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', fullWidth, leading, className, children, ...rest }: ButtonProps) {
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button
      className={[
        'inline-flex items-center justify-center rounded-full font-semibold tracking-tight transition-colors',
        'disabled:cursor-not-allowed',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        widthClass,
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leading}
      {children}
    </button>
  );
}
