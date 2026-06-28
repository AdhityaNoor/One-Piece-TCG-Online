/**
 * Single source of truth for how a card's rules `Color` (engine/state/card.ts,
 * 2-3-3) is rendered — a Tailwind dot class + display label. Presentational
 * only: this file has zero effect on legality (a multicolor card still
 * "counts as every color it lists" per 2-3-5 regardless of how it's drawn).
 * Centralized here so ColorChip, CardTile, and DeckListSummary never each
 * pick their own shade for "red"/"green"/etc.
 */
import type { Color } from '../../engine/state/card';

export interface ColorToken {
  label: string;
  dotClassName: string;
}

export const CARD_COLOR_TOKENS: Record<Color, ColorToken> = {
  red: { label: 'Red', dotClassName: 'bg-red-600' },
  green: { label: 'Green', dotClassName: 'bg-emerald-600' },
  blue: { label: 'Blue', dotClassName: 'bg-sky-600' },
  purple: { label: 'Purple', dotClassName: 'bg-purple-600' },
  black: { label: 'Black', dotClassName: 'bg-slate-800' },
  yellow: { label: 'Yellow', dotClassName: 'bg-yellow-400' },
};

export const ALL_CARD_COLORS: Color[] = ['red', 'green', 'blue', 'purple', 'black', 'yellow'];
