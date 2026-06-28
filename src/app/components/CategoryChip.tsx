/**
 * Interactive filter toggle for CardCategory, mirroring ColorChip's pattern
 * for colors. 'don' is included in the label map for completeness (DON!!
 * cards do carry category 'don' on CardDefinition) even though no current
 * screen filters by it yet — cardLibraryStore never loads DON!! rows (a
 * separate API family, see cards/api/types.ts DonCardDto), so callers should
 * only offer the categories their data can actually contain.
 */
import type { CardCategory } from '../../engine/state/card';

export const CATEGORY_LABELS: Record<CardCategory, string> = {
  leader: 'Leader',
  character: 'Character',
  event: 'Event',
  stage: 'Stage',
  don: 'DON!!',
};

export interface CategoryChipProps {
  category: CardCategory;
  selected: boolean;
  onToggle: (category: CardCategory) => void;
}

export function CategoryChip({ category, selected, onToggle }: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(category)}
      className={[
        'rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] transition-all',
        selected ? 'border-amber-300/30 bg-amber-400/20 text-amber-100' : 'border-white/10 bg-white/8 text-slate-100/80 hover:bg-white/12',
      ].join(' ')}
    >
      {CATEGORY_LABELS[category]}
    </button>
  );
}
