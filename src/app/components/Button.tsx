/**
 * Simple transparent parallelogram button. The frame is a skewed rectangle
 * (-skew-x-12) with a transparent fill; the label is counter-skewed so the
 * text stays upright. Variants differ only in border / text colour.
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
  primary: 'border-gold/60 text-white hover:border-gold hover:bg-gold/10 disabled:text-white/40',
  secondary: 'border-white/30 text-white/85 hover:border-white/60 hover:bg-white/8 disabled:text-white/40',
  ghost: 'border-transparent text-white/75 hover:border-white/25 hover:bg-white/6 disabled:text-white/40',
  danger: 'border-white/80 bg-red-600/55 text-white hover:border-white hover:bg-red-600/70 disabled:text-white/40',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-xs',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
};

export function Button({ variant = 'primary', size = 'md', fullWidth, leading, className, children, ...rest }: ButtonProps) {
  const widthClass = fullWidth ? 'w-full' : '';
  return (
    <button
      className={[
        'inline-flex -skew-x-12 items-center justify-center border bg-transparent transition-colors duration-200',
        'font-heading font-black uppercase tracking-[0.08em]',
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
      <span className="flex skew-x-12 items-center gap-2">
        {leading}
        {children}
      </span>
    </button>
  );
}
