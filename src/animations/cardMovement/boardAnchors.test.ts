import { describe, expect, it } from 'vitest';
import { cardScaleFromAnchorRect } from './boardAnchors';

describe('cardScaleFromAnchorRect', () => {
  it('does not scale to full table width for wide hand dock containers', () => {
    const handStrip = {
      width: 1200,
      height: 156,
      top: 0,
      left: 0,
      right: 1200,
      bottom: 156,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    const scale = cardScaleFromAnchorRect(handStrip, { zone: 'hand' });
    expect(scale).toBeLessThan(1.2);
    expect(scale).toBeGreaterThan(0.5);
  });

  it('matches actual card tile size when anchored to an instance', () => {
    const tile = {
      width: 150,
      height: 210,
      top: 0,
      left: 0,
      right: 150,
      bottom: 210,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    expect(cardScaleFromAnchorRect(tile, { zone: 'characterArea', instanceId: 'c1' })).toBe(1);
  });
});
