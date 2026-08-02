/**
 * Unit tests for hand-ordering helpers (see handOrder.ts). Pure functions —
 * no React, no engine bootstrap.
 */
import { describe, expect, it } from 'vitest';
import { applyHandOrder, handDropIndex, isOverPlayDropZone, moveInOrder, playDropZoneFor } from '../handOrder';

const card = (id: string) => ({ instanceId: id });
const ids = (cards: { instanceId: string }[]) => cards.map((c) => c.instanceId);

describe('applyHandOrder', () => {
  it('returns cards untouched when there is no saved order', () => {
    const hand = [card('a'), card('b'), card('c')];
    expect(applyHandOrder(hand, [])).toBe(hand);
  });

  it('arranges cards by the saved order', () => {
    const hand = [card('a'), card('b'), card('c')];
    expect(ids(applyHandOrder(hand, ['c', 'a', 'b']))).toEqual(['c', 'a', 'b']);
  });

  it('appends newly drawn cards at the end', () => {
    const hand = [card('a'), card('b'), card('new1'), card('new2')];
    expect(ids(applyHandOrder(hand, ['b', 'a']))).toEqual(['b', 'a', 'new1', 'new2']);
  });

  it('ignores ids that have left the hand (played or discarded)', () => {
    const hand = [card('a'), card('c')];
    expect(ids(applyHandOrder(hand, ['c', 'gone', 'a']))).toEqual(['c', 'a']);
  });

  it('never drops or duplicates a card, even with a corrupt order', () => {
    const hand = [card('a'), card('b'), card('c')];
    const out = applyHandOrder(hand, ['b', 'b', 'ghost', 'b']);
    expect(ids(out).sort()).toEqual(['a', 'b', 'c']);
    expect(out).toHaveLength(3);
  });

  it('handles a fully stale order by falling back to natural order', () => {
    const hand = [card('a'), card('b')];
    expect(ids(applyHandOrder(hand, ['x', 'y', 'z']))).toEqual(['a', 'b']);
  });

  it('does not mutate its inputs', () => {
    const hand = [card('a'), card('b')];
    const order = ['b', 'a'];
    applyHandOrder(hand, order);
    expect(ids(hand)).toEqual(['a', 'b']);
    expect(order).toEqual(['b', 'a']);
  });
});

describe('moveInOrder (re-exported)', () => {
  it('reorders without losing cards', () => {
    expect(moveInOrder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
});

describe('handDropIndex', () => {
  const centers = [50, 150, 250, 350];

  it('keeps position when the pointer stays over its own slot', () => {
    expect(handDropIndex(centers, 1, 150)).toBe(1);
  });

  it('moves left past a crossed centre', () => {
    expect(handDropIndex(centers, 3, 40)).toBe(0);
  });

  it('moves right past a crossed centre', () => {
    expect(handDropIndex(centers, 0, 260)).toBe(2);
  });

  it('clamps at the ends', () => {
    expect(handDropIndex(centers, 2, -500)).toBe(0);
    expect(handDropIndex(centers, 1, 5000)).toBe(3);
  });
});

describe('isOverPlayDropZone', () => {
  // Minimal stand-in for the two DOM members the helper touches, so this runs
  // without a DOM implementation.
  function el(attrs: Record<string, string> = {}, parentElement: unknown = null): Element {
    return {
      getAttribute: (name: string) => attrs[name] ?? null,
      parentElement,
    } as unknown as Element;
  }

  it('is false for null', () => {
    expect(isOverPlayDropZone(null)).toBe(false);
  });

  it('detects the marker on the element itself', () => {
    expect(isOverPlayDropZone(el({ 'data-play-drop': 'true' }))).toBe(true);
  });

  it('detects the marker on an ancestor', () => {
    const zone = el({ 'data-play-drop': 'true' });
    const child = el({}, zone);
    const grandchild = el({}, child);
    expect(isOverPlayDropZone(grandchild)).toBe(true);
  });

  it('is false outside the zone', () => {
    expect(isOverPlayDropZone(el({}, el({ 'data-other': 'true' })))).toBe(false);
  });

  it('ignores a non-"true" marker value', () => {
    expect(isOverPlayDropZone(el({ 'data-play-drop': 'false' }))).toBe(false);
  });
});

describe('playDropZoneFor', () => {
  it('routes characters to the Character Area', () => {
    expect(playDropZoneFor('character')).toBe('characterArea');
  });

  it('routes stages to the Stage slot', () => {
    expect(playDropZoneFor('stage')).toBe('stageArea');
  });

  it('gives events no landing zone — they resolve and go to the trash', () => {
    expect(playDropZoneFor('event')).toBeNull();
  });

  it('is null for cards that never enter the field from hand', () => {
    expect(playDropZoneFor('leader')).toBeNull();
    expect(playDropZoneFor('don')).toBeNull();
    expect(playDropZoneFor(undefined)).toBeNull();
  });
});
