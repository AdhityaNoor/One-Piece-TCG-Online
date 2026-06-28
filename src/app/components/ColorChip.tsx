/**
 * Interactive color filter toggle (dot + label), matching the reference
 * site's "Color: Red Green Blue Purple Black Yellow" filter row. Used by the
 * Card Library / Deck Builder Browse tab (Task 9/10) to multi-select which
 * `Color`s to filter card results by — purely a filter-UI control, has no
 * relationship to a card's actual rules color beyond sharing the same label.
 */
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
import type { Color } from '../../engine/state/card';

export interface ColorChipProps {
  color: Color;
  selected: boolean;
  onToggle: (color: Color) => void;
}

export function ColorChip({ color, selected, onToggle }: ColorChipProps) {
  const token = CARD_COLOR_TOKENS[color];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(color)}
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        selected ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-900/15 bg-white text-navy-900/80 hover:bg-surface-panel',
      ].join(' ')}
    >
      <span className={['h-2.5 w-2.5 rounded-full', token.dotClassName].join(' ')} aria-hidden="true" />
      {token.label}
    </button>
  );
}
