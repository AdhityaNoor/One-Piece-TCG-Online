/**
 * Labeled on/off switch row — Settings screen (debugShowBothHands,
 * animationsEnabled, threeDEnabled) and any future per-screen toggle. A
 * native checkbox would be simpler but harder to theme consistently with the
 * rest of the pill/rounded visual language, so this is a button with
 * role="switch" instead (same a11y contract as a checkbox: aria-checked,
 * keyboard-activatable, just not the native widget).
 *
 * Track/knob sizing matches BacksoundControl's SettingSwitch (w-9, h-5, p-0.5,
 * 16px knob, translate-x-4) so the knob stays inset and is not clipped by the
 * track's rounded-full overflow.
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
    <div
      className={[
        'flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-3',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-white">{label}</p>
        {description && <p className="mt-0.5 text-xs text-white/50">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onChange(!checked);
          }
        }}
        className={[
          'inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200',
          checked ? 'border-gold/40 bg-gold/85' : 'border-white/15 bg-white/12',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'block h-4 w-4 flex-shrink-0 rounded-full bg-white shadow transition-transform duration-200 ease-out',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
