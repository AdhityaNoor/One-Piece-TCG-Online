/**
 * Single-select pill for choosing which set to browse. Used by the Card
 * Library screen (Task 9) and will be reused by the Deck Builder's Browse
 * tab (Task 10) — both need "pick one set from optcgEndpoints.allSets()".
 */
export interface SetChipProps {
  setName: string;
  selected: boolean;
  onSelect: () => void;
}

export function SetChip({ setName, selected, onSelect }: SetChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={[
        'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-all',
        selected ? 'border-amber-300/30 bg-amber-400/20 text-amber-100 shadow-[0_8px_18px_rgba(217,164,65,0.14)]' : 'border-white/10 bg-white/8 text-slate-100/80 hover:bg-white/12',
      ].join(' ')}
    >
      {setName}
    </button>
  );
}
