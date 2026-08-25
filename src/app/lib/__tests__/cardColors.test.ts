/**
 * Playmat colour wash (Layer 9, presentational only — a Leader's colours have
 * plenty of rules meaning per 2-3-5, but none of it lives here).
 *
 * Worth a test despite being "just CSS" because the two properties the design
 * depends on are invisible in a screenshot: that a multicolour mat is split
 * exactly 50:50 with the blend centred on the boundary, and that tinting the
 * mat never changes how transparent it is. Both are arithmetic on gradient
 * stops, so they can be asserted directly instead of eyeballed.
 */
import { describe, expect, it } from 'vitest';
import {
  ALL_CARD_COLORS,
  CARD_COLOR_MAT_RGB,
  MAT_SHADE_ALPHA_FROM,
  MAT_SHADE_ALPHA_TO,
  matShadeGradient,
  NEUTRAL_MAT_GRADIENT,
} from '../cardColors';
import type { Color } from '../../../engine/state/card';

/** Pulls `[rgb, alpha, positionPercent]` out of every stop of a generated gradient. */
function stopsOf(gradient: string): { rgb: string; alpha: number; at: number }[] {
  return [...gradient.matchAll(/rgba\(([^)]+?),\s*([\d.]+)\)\s*([\d.]+)%/g)].map((m) => ({
    rgb: m[1].trim(),
    alpha: Number(m[2]),
    at: Number(m[3]),
  }));
}

describe('matShadeGradient', () => {
  it('falls back to the neutral wash when a board has no Leader', () => {
    expect(matShadeGradient([])).toBe(NEUTRAL_MAT_GRADIENT);
  });

  it('keeps the mat original 135deg falloff for a single colour, recoloured', () => {
    const gradient = matShadeGradient(['red']);
    expect(gradient).toContain('135deg');
    expect(gradient).toContain(`rgba(${CARD_COLOR_MAT_RGB.red}, ${MAT_SHADE_ALPHA_FROM})`);
    expect(gradient).toContain(`rgba(${CARD_COLOR_MAT_RGB.red}, ${MAT_SHADE_ALPHA_TO})`);
  });

  it('splits two colours 50:50 across the width with the blend centred on the midpoint', () => {
    const stops = stopsOf(matShadeGradient(['red', 'green']));
    expect(stops.map((s) => s.at)).toEqual([0, 34, 66, 100]);
    // Each colour owns its solid run plus half the blend band => exactly half the mat.
    expect((34 - 0) + (66 - 34) / 2).toBe(50);
    expect(stops[0].rgb).toBe(CARD_COLOR_MAT_RGB.red);
    expect(stops[1].rgb).toBe(CARD_COLOR_MAT_RGB.red);
    expect(stops[2].rgb).toBe(CARD_COLOR_MAT_RGB.green);
    expect(stops[3].rgb).toBe(CARD_COLOR_MAT_RGB.green);
  });

  it('runs the alpha ramp linearly across the width regardless of the colour boundary', () => {
    const stops = stopsOf(matShadeGradient(['blue', 'yellow']));
    for (const stop of stops) {
      // MAT_SHADE_ALPHA_FROM at the left edge down to MAT_SHADE_ALPHA_TO at the
      // right, in a straight line.
      const expected = MAT_SHADE_ALPHA_FROM + (MAT_SHADE_ALPHA_TO - MAT_SHADE_ALPHA_FROM) * (stop.at / 100);
      expect(stop.alpha).toBeCloseTo(expected, 4);
    }
  });

  it('runs the same alpha envelope however many colours a Leader has', () => {
    for (const colors of [['red'], ['red', 'blue'], ['red', 'blue', 'yellow']] as Color[][]) {
      const stops = stopsOf(matShadeGradient(colors));
      const alphas = colors.length === 1
        // The mono form has no explicit stop positions; read its two alphas directly.
        ? [...matShadeGradient(colors).matchAll(/rgba\([^)]+?,\s*([\d.]+)\)/g)].map((m) => Number(m[1]))
        : [stops[0].alpha, stops[stops.length - 1].alpha];
      expect(alphas[0]).toBe(MAT_SHADE_ALPHA_FROM);
      expect(alphas[alphas.length - 1]).toBe(MAT_SHADE_ALPHA_TO);
    }
  });

  it('leaves a Leaderless board on the faint neutral wash rather than a grey slab', () => {
    const neutralAlphas = [...NEUTRAL_MAT_GRADIENT.matchAll(/rgba\([^)]+?,\s*([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(Math.max(...neutralAlphas)).toBeLessThan(0.2);
  });

  it('keeps every mat colour between the two bounds the board actually depends on', () => {
    const luminance = (rgb: string): number => {
      const [r, g, b] = rgb.split(',').map((n) => Number(n.trim()) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const values = ALL_CARD_COLORS.map((color) => luminance(CARD_COLOR_MAT_RGB[color]));
    // Ceiling: light-on-dark chrome (white/10 zone borders, dashed empty-slot
    // outlines, white/25 watermarks) sits on this fill at near-full opacity. Too
    // light a mat erases it — for that one Leader only, which is the version
    // nobody notices until they play that deck.
    expect(Math.max(...values)).toBeLessThanOrEqual(0.5);
    // Floor: the mat must stay distinguishable from the near-black table shell
    // it is laid on, or a dark Leader's mat loses its own edges.
    expect(Math.min(...values)).toBeGreaterThan(0.09);
  });

  it('keeps black the darkest mat by a clear margin', () => {
    // It is the one colour whose whole point is being dark; a "black" board that
    // reads as mid-grey steel is the wrong picture.
    const luminance = (rgb: string): number => {
      const [r, g, b] = rgb.split(',').map((n) => Number(n.trim()) / 255);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const others = ALL_CARD_COLORS.filter((c) => c !== 'black').map((c) => luminance(CARD_COLOR_MAT_RGB[c]));
    expect(luminance(CARD_COLOR_MAT_RGB.black)).toBeLessThan(Math.min(...others) * 0.75);
  });

  it('treats a colour listed twice as one colour, not a split against itself', () => {
    expect(matShadeGradient(['purple', 'purple'])).toBe(matShadeGradient(['purple']));
  });

  it('keeps three colours in non-overlapping bands', () => {
    const stops = stopsOf(matShadeGradient(['red', 'green', 'blue']));
    const positions = stops.map((s) => s.at);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(positions[0]).toBe(0);
    expect(positions[positions.length - 1]).toBe(100);
    // Boundaries stay centred on the thirds. 2dp because that is the precision
    // the stop positions are emitted at.
    expect((stops[1].at + stops[2].at) / 2).toBeCloseTo(100 / 3, 2);
    expect((stops[3].at + stops[4].at) / 2).toBeCloseTo(200 / 3, 2);
  });

  it('has a mat shade for every rules colour', () => {
    for (const color of ALL_CARD_COLORS) {
      expect(CARD_COLOR_MAT_RGB[color]).toMatch(/^\d+, \d+, \d+$/);
      expect(matShadeGradient([color])).toContain(CARD_COLOR_MAT_RGB[color]);
    }
  });
});
