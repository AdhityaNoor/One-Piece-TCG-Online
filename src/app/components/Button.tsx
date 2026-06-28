/**
 * Pill-shaped action button with a more arcade-like visual treatment.
 * The behavior is unchanged; only the framing and motion have been pushed
 * toward a game UI rather than a generic app.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leading?: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border border-gold/35 bg-[linear-gradient(180deg,_#ff3026_0%,_#b91d22_100%)] text-white shadow-[0_8px_0_rgba(63,8,12,0.9),_0_16px_24px_rgba(185,29,34,0.26)] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_4px_0_rgba(63,8,12,0.9),_0_10px_18px_rgba(185,29,34,0.24)] disabled:from-brand/50 disabled:to-brand/50',
  secondary:
    'border border-gold/20 bg-[linear-gradient(180deg,_rgba(255,255,255,0.12),_rgba(3,10,24,0.72))] text-white shadow-[0_6px_0_rgba(0,0,0,0.36)] hover:border-gold/50 hover:bg-white/12 active:translate-y-[2px] disabled:text-white/40',
  ghost: 'border border-transparent bg-transparent text-white/80 hover:border-gold/30 hover:bg-white/8 active:translate-y-[1px] disabled:text-white/40',
  danger:
    'border border-gold/25 bg-[linear-gradient(180deg,_#ff4b3f_0%,_#9f1218_100%)] text-white shadow-[0_8px_0_rgba(63,8,12,0.9),_0_16px_24px_rgba(239,68,68,0.25)] hover:brightness-110 active:translate-y-[2px] disabled:from-red-500/50 disabled:to-red-500/50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-13 px-6 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', fullWidth, leading, className, children, ...rest }: ButtonProps) {
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-heading font-black uppercase tracking-[0.08em] transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
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
