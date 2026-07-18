/**
 * Minimal, deliberately plain UI primitives for the Admin CMS. NOT the
 * game's Button/Modal/Pill (src/app/components) — those carry the game's
 * skewed-parallelogram brand styling, which would look out of place (and
 * pull in game-specific CSS variables) in an internal ops tool. Kept tiny on
 * purpose: this is "shallow scaffolding across all 5 sections," not a
 * second design system.
 */
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function AdminButton({
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants: Record<string, string> = {
    primary: 'bg-sky-600 hover:bg-sky-500 text-white border-sky-600',
    secondary: 'bg-transparent hover:bg-slate-800 text-slate-200 border-slate-600',
    danger: 'bg-red-700 hover:bg-red-600 text-white border-red-700',
  };
  return (
    <button
      className={`rounded border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    />
  );
}

export function AdminInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function AdminTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function AdminSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none ${props.className ?? ''}`}
    />
  );
}

export function AdminCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-800 bg-slate-900/60 p-4 ${className}`}>{children}</div>;
}

export function AdminBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-700 text-slate-100',
    good: 'bg-emerald-700/70 text-emerald-100',
    warn: 'bg-amber-700/70 text-amber-100',
    bad: 'bg-red-700/70 text-red-100',
  };
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}
