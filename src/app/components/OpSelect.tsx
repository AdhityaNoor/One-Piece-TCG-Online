import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface OpSelectOption {
  value: string;
  label: string;
}

export interface OpSelectGroup {
  id: string;
  label: string;
  headerClassName?: string;
  options: OpSelectOption[];
}

export interface OpSelectProps {
  value: string;
  disabled?: boolean;
  title?: string;
  onChange: (value: string) => void;
  /** Options rendered above grouped sections (e.g. All Sets). */
  leadingOptions?: OpSelectOption[];
  /** Flat option list — used when `groups` is omitted. */
  options?: OpSelectOption[];
  /** Grouped sections with optional colored headers. */
  groups?: OpSelectGroup[];
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
}

function findSelectedLabel(
  value: string,
  leadingOptions: OpSelectOption[] | undefined,
  options: OpSelectOption[] | undefined,
  groups: OpSelectGroup[] | undefined,
): string {
  for (const source of [leadingOptions, options, ...(groups?.map((group) => group.options) ?? [])]) {
    if (!source) continue;
    const match = source.find((option) => option.value === value);
    if (match) return match.label;
  }
  return value;
}

export function OpSelect({
  value,
  disabled = false,
  title,
  onChange,
  leadingOptions,
  options,
  groups,
  className = '',
  buttonClassName = '',
  listClassName = '',
}: OpSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(
    () => findSelectedLabel(value, leadingOptions, options, groups),
    [value, leadingOptions, options, groups],
  );

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  function choose(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  function renderOption(option: OpSelectOption, indent = false) {
    const selected = value === option.value;
    return (
      <button
        key={option.value}
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => choose(option.value)}
        className={[
          'block w-full px-3 py-2 text-left font-heading text-sm transition hover:bg-white/8',
          indent ? 'pl-4' : '',
          selected ? 'bg-gold/12 text-gold' : 'text-slate-100/88',
        ].join(' ')}
      >
        {option.label}
      </button>
    );
  }

  return (
    <div ref={rootRef} className={['relative', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        title={title}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        className={[
          'op-input mt-1.5 flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-heading text-sm font-semibold',
          disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-gold/35',
          buttonClassName,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="truncate">{selectedLabel}</span>
        <span aria-hidden="true" className="text-[10px] text-white/45">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className={[
            'absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded border border-gold/25 bg-[rgba(2,7,17,0.96)] py-1 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm',
            listClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {leadingOptions?.map((option) => renderOption(option))}
          {groups?.map((group) => (
            <div key={group.id}>
              <p
                className={[
                  'sticky top-0 z-10 border-y border-white/8 bg-[rgba(2,7,17,0.98)] px-3 py-1.5 font-heading text-[10px] font-black uppercase tracking-[0.18em]',
                  group.headerClassName ?? 'text-gold',
                ].join(' ')}
              >
                {group.label}
              </p>
              {group.options.map((option) => renderOption(option, true))}
            </div>
          ))}
          {options?.map((option) => renderOption(option))}
        </div>
      )}
    </div>
  );
}
