/**
 * Tests for the shared XP/level curve (shared/progression.ts).
 *
 * The curve is shared by the server (awards + persists XP) and the client
 * (renders the badge), so these lock down the contract both rely on: level is
 * always derivable from XP alone, and bad input degrades instead of throwing.
 */
import { describe, expect, it } from 'vitest';
import {
  MAX_LEVEL,
  levelForXp,
  totalXpForLevel,
  xpForMatch,
  xpToNextLevel,
} from '../progression';

describe('xpToNextLevel', () => {
  it('starts at 100 and rises linearly', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(2)).toBe(130);
    expect(xpToNextLevel(10)).toBe(370);
  });

  it('is 0 at and beyond the cap', () => {
    expect(xpToNextLevel(MAX_LEVEL)).toBe(0);
    expect(xpToNextLevel(MAX_LEVEL + 5)).toBe(0);
  });

  it('always returns whole numbers, so summed totals cannot drift', () => {
    for (let n = 1; n < MAX_LEVEL; n += 1) {
      expect(Number.isInteger(xpToNextLevel(n))).toBe(true);
    }
  });
});

describe('levelForXp', () => {
  it('starts everyone at level 1 with zero XP', () => {
    const p = levelForXp(0);
    expect(p.level).toBe(1);
    expect(p.xpIntoLevel).toBe(0);
    expect(p.progress).toBe(0);
    expect(p.isMaxLevel).toBe(false);
  });

  it('levels up exactly at the threshold, not before', () => {
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100).level).toBe(2);
    expect(levelForXp(229).level).toBe(2); // 100 + 130 - 1
    expect(levelForXp(230).level).toBe(3);
  });

  it('reports progress within the current level', () => {
    const p = levelForXp(150); // level 2, 50 into a 130-XP level
    expect(p.level).toBe(2);
    expect(p.xpIntoLevel).toBe(50);
    expect(p.xpForNextLevel).toBe(130);
    expect(p.progress).toBeCloseTo(50 / 130);
  });

  it('caps at MAX_LEVEL and keeps reporting full progress', () => {
    const atCap = levelForXp(totalXpForLevel(MAX_LEVEL));
    expect(atCap.level).toBe(MAX_LEVEL);
    expect(atCap.isMaxLevel).toBe(true);
    expect(atCap.progress).toBe(1);

    const farPast = levelForXp(totalXpForLevel(MAX_LEVEL) * 10);
    expect(farPast.level).toBe(MAX_LEVEL);
    expect(farPast.isMaxLevel).toBe(true);
  });

  it('is consistent with totalXpForLevel at every boundary', () => {
    for (let level = 1; level <= MAX_LEVEL; level += 1) {
      expect(levelForXp(totalXpForLevel(level)).level).toBe(level);
      if (level > 1) {
        expect(levelForXp(totalXpForLevel(level) - 1).level).toBe(level - 1);
      }
    }
  });

  it('never goes backwards as XP increases', () => {
    let previous = 0;
    for (let xp = 0; xp < 12000; xp += 37) {
      const { level } = levelForXp(xp);
      expect(level).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('degrades to level 1 on junk input rather than throwing', () => {
    for (const bad of [-1, -9999, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const p = levelForXp(bad as number);
      expect(p.level).toBeGreaterThanOrEqual(1);
      expect(p.level).toBeLessThanOrEqual(MAX_LEVEL);
      expect(Number.isFinite(p.progress)).toBe(true);
    }
  });

  it('floors fractional XP', () => {
    expect(levelForXp(99.9).level).toBe(1);
    expect(levelForXp(100.9).xpIntoLevel).toBe(0);
  });
});

describe('xpForMatch', () => {
  it('pays more for ranked than casual', () => {
    expect(xpForMatch('ranked', 'win')).toBeGreaterThan(xpForMatch('casual', 'win'));
  });

  it('still pays for a loss — the reward is for playing', () => {
    expect(xpForMatch('ranked', 'loss')).toBeGreaterThan(0);
    expect(xpForMatch('casual', 'loss')).toBeGreaterThan(0);
  });

  it('ranks outcomes win > draw > loss within a mode', () => {
    for (const mode of ['ranked', 'casual'] as const) {
      expect(xpForMatch(mode, 'win')).toBeGreaterThan(xpForMatch(mode, 'draw'));
      expect(xpForMatch(mode, 'draw')).toBeGreaterThan(xpForMatch(mode, 'loss'));
    }
  });

  it('awards nothing for an unknown mode or outcome instead of guessing', () => {
    // A new result type must never silently mint XP.
    expect(xpForMatch('tournament' as never, 'win')).toBe(0);
    expect(xpForMatch('ranked', 'invalidated' as never)).toBe(0);
  });
});
