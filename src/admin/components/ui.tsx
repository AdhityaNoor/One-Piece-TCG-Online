/**
 * Admin CMS UI primitives. Deliberately its own small set (not the game's
 * skewed-parallelogram Button/Pill — those suit big touch-target menu
 * buttons, not dense data tables and forms), but retinted to the game's
 * actual brand tokens (navy/gold/brand-red, Poppins) instead of a generic
 * slate/sky palette, so the CMS reads as part of the same product.
 *
 * `.op-panel` and `.op-input` are hand-authored classes from
 * src/app/styles/index.css (not Tailwind-generated utilities), imported
 * globally in main.tsx — reusing them here gets the game's exact panel
 * gradient/border treatment for free, with no dependency on Tailwind's
 * content-scanning (see tailwind.config.js comment: src/admin previously
 * wasn't scanned at all, which is why admin-only Tailwind utilities were
 * being purged from the production build).
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function AdminButton({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants: Record<string, string> = {
    primary: 'border-brand bg-brand text-white hover:bg-brand-700',
    secondary: 'border-[rgb(var(--op-gold-rgb)/0.35)] bg-transparent text-white/85 hover:border-[rgb(var(--op-gold-rgb)/0.7)] hover:bg-[rgb(var(--op-gold-rgb)/0.1)]',
    danger: 'border-red-500/70 bg-red-700/80 text-white hover:bg-red-600',
  };
  return (
    <button
      className={`rounded-sm border px-3 py-1.5 font-heading text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    />
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`op-input rounded-sm px-3 py-1.5 text-sm text-white placeholder:text-white/40 ${props.className ?? ''}`} />;
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`op-input rounded-sm px-3 py-1.5 text-sm text-white placeholder:text-white/40 ${props.className ?? ''}`} />;
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`op-input rounded-sm px-3 py-1.5 text-sm text-white ${props.className ?? ''}`} />;
}

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`op-panel rounded-sm p-4 ${className}`}>{children}</div>;
}

/** Small gold-dot uppercase label, matching `.op-section-title` elsewhere in the game. */
export function AdminSectionTitle({ children }: { children: ReactNode }) {
  return <p className="op-section-title mb-3">{children}</p>;
}

export function AdminBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const tones: Record<string, string> = {
    neutral: 'border-[rgb(var(--op-gold-rgb)/0.4)] bg-[rgb(var(--op-gold-rgb)/0.12)] text-[rgb(var(--op-gold-rgb))]',
    good: 'border-emerald-500/40 bg-emerald-700/25 text-emerald-200',
    warn: 'border-amber-400/40 bg-amber-600/25 text-amber-100',
    bad: 'border-red-500/40 bg-red-700/25 text-red-200',
  };
  return <span className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}
