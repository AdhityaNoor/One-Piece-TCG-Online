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
        'flex-shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
        selected ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-900/15 bg-white text-navy-900/80 hover:bg-surface-panel',
      ].join(' ')}
    >
      {setName}
    </button>
  );
}
