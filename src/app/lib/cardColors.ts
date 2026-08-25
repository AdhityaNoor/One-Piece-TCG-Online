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

/**
 * Per-colour RGB the match playmat is painted in (PlayerBoardPanel's `mat`).
 *
 * Deliberately NOT the same shades as `dotClassName` above. A dot is a small
 * swatch read on its own; the mat is a large field the whole board sits on, and
 * it is painted at MAT_SHADE_ALPHA_* — high enough that the mat reads as the
 * Leader's actual colour rather than as a tinted grey.
 *
 * Each hue is taken at its recognisable, saturated form, then held between two
 * luminance bounds — both of which exist for a concrete reason, and neither of
 * which is "make them all look alike":
 *
 * - A CEILING, because at this opacity the mat is the background for every
 *   piece of board chrome — the white/10 zone borders, the dashed empty-slot
 *   outlines, the white/25 zone watermarks — all of which are light-on-dark.
 *   Yellow at its most vivid washes every one of them out while red stays
 *   perfectly fine, so the board would silently become unreadable for some
 *   Leaders only. That is why `yellow` is a deep gold rather than true yellow.
 *
 * - A FLOOR, because the mat has to stay visibly distinct from the near-black
 *   table shell it is laid on (.op-match-table-shell), or a dark Leader's mat
 *   loses its own edges. `black` sits just above that floor: a near-black
 *   charcoal, which is what a mono-black board should look like — it is only
 *   the floor, not any wish for the colours to match each other, that stops it
 *   going all the way to true black.
 *
 * Both bounds are asserted in the tests, so retuning one colour cannot quietly
 * break another Leader's board.
 *
 * Values are bare `r, g, b` triples so callers can drop them straight into an
 * `rgba(...)` with their own alpha.
 */
export const CARD_COLOR_MAT_RGB: Record<Color, string> = {
  red: '205, 45, 50',
  green: '30, 130, 72',
  blue: '30, 100, 185',
  purple: '128, 66, 178',
  black: '26, 29, 37',
  yellow: '160, 125, 25',
};

/**
 * Alpha envelope of the playmat wash: near-opaque, with a slight falloff across
 * the mat so the surface still reads as a lit material rather than as flat
 * fill, and so the starfield behind the board glimmers faintly through.
 *
 * These two numbers are the strength dial for the whole feature — nothing else
 * needs touching to make the mat bolder or more subtle. They started at the
 * 0.08/0.02 of the neutral white wash this replaced, which turned out to read
 * as barely-tinted grey rather than as the Leader's colour.
 */
export const MAT_SHADE_ALPHA_FROM = 0.88;
export const MAT_SHADE_ALPHA_TO = 0.7;

/**
 * Used when a board has no Leader to take a colour from. Stays the faint white
 * wash the mat had before it was ever tinted — an uncoloured board should read
 * as "no colour yet", not as a near-opaque grey slab.
 */
export const NEUTRAL_MAT_GRADIENT =
  'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02))';

function matAlphaAt(position: number): number {
  const a = MAT_SHADE_ALPHA_FROM + (MAT_SHADE_ALPHA_TO - MAT_SHADE_ALPHA_FROM) * position;
  return Math.round(a * 10000) / 10000;
}

function matStop(color: Color, position: number): string {
  return `rgba(${CARD_COLOR_MAT_RGB[color]}, ${matAlphaAt(position)}) ${Math.round(position * 10000) / 100}%`;
}

/**
 * CSS `background-image` that shades the playmat in its Leader's colour(s).
 *
 * One colour keeps the mat's original 135deg diagonal falloff, recoloured —
 * nothing about the mat's look changes except its hue.
 *
 * Two or more colours have to split the mat horizontally, so those run at
 * 90deg instead: each colour owns an equal share of the WIDTH, and the hue
 * blend is centred exactly on each boundary — for the usual two-colour Leader
 * that means solid colour out to 34%, a blend from 34% to 66% centred on the
 * midpoint, then solid to the end, i.e. a true 50:50 with the gradation in the
 * middle. The alpha ramp stays linear from MAT_SHADE_ALPHA_FROM to
 * MAT_SHADE_ALPHA_TO across the whole width regardless of where the hue
 * boundaries fall, so a two-colour mat is exactly as opaque as a one-colour one
 * at every point.
 *
 * Duplicate colours are collapsed first: a card that lists the same colour
 * twice is one colour, not a two-way split of itself.
 */
export function matShadeGradient(colors: readonly Color[]): string {
  const unique = colors.filter((color, index) => colors.indexOf(color) === index);
  if (unique.length === 0) return NEUTRAL_MAT_GRADIENT;
  if (unique.length === 1) {
    const rgb = CARD_COLOR_MAT_RGB[unique[0]];
    return `linear-gradient(135deg, rgba(${rgb}, ${MAT_SHADE_ALPHA_FROM}), rgba(${rgb}, ${MAT_SHADE_ALPHA_TO}))`;
  }
  // Half-width of the blend band around each internal boundary. Scaled by the
  // colour count so a three-colour Leader's two bands can't overlap.
  const blendHalf = 0.32 / unique.length;
  const stops = [matStop(unique[0], 0)];
  for (let boundary = 1; boundary < unique.length; boundary += 1) {
    const at = boundary / unique.length;
    stops.push(matStop(unique[boundary - 1], at - blendHalf));
    stops.push(matStop(unique[boundary], at + blendHalf));
  }
  stops.push(matStop(unique[unique.length - 1], 1));
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}
