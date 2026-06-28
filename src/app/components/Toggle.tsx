/**
 * Labeled on/off switch row — Settings screen (debugShowBothHands,
 * animationsEnabled, threeDEnabled) and any future per-screen toggle. A
 * native checkbox would be simpler but harder to theme consistently with the
 * rest of the pill/rounded visual language, so this is a button with
 * role="switch" instead (same a11y contract as a checkbox: aria-checked,
 * keyboard-activatable, just not the native widget).
 */
export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <div className={['flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-white/8 p-3 text-slate-100 shadow-[0_14px_30px_rgba(0,0,0,0.18)]', disabled ? 'opacity-50' : ''].join(' ')}>
      <div className="min-w-0">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white">{label}</p>
        {description && <p className="text-xs text-slate-200/65">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-6 w-11 flex-shrink-0 rounded-full border border-white/10 transition-colors',
          checked ? 'bg-brand shadow-[0_0_0_1px_rgba(255,255,255,0.1)_inset]' : 'bg-slate-500/30',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span className={['absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5'].join(' ')} />
      </button>
    </div>
  );
}
