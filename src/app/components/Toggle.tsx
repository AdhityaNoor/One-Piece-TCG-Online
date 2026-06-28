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
    <div className={['flex items-center justify-between gap-4 rounded-2xl bg-surface-card p-3', disabled ? 'opacity-50' : ''].join(' ')}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-navy-900">{label}</p>
        {description && <p className="text-xs text-navy-900/50">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-navy-900/20',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={['absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5'].join(' ')}
        />
      </button>
    </div>
  );
}
