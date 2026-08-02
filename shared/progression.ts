/**
 * Player level / XP progression — the shared source of truth.
 *
 * Deliberately PURE and dependency-free so the identical curve runs on the
 * server (which awards and persists XP) and in the client (which renders the
 * level badge). Level is never stored: it is always derived from
 * `experiencePoints`, so the curve can be retuned without a data migration and
 * two clients on different builds can never disagree about stored state — only
 * about presentation, which resolves on reload.
 *
 * This is a PROFILE/COSMETIC system. It carries no game-rule meaning: level
 * must never gate deck legality, matchmaking or any rules decision (see the
 * project rule that visuals never control game rules).
 *
 * LEVEL IS NOT RANK. They are separate progressions and must never be derived
 * from one another:
 *
 *   Level (here)          | Rank (shared/ranked.ts)
 *   ----------------------|--------------------------------------------
 *   lifetime XP           | seasonal ranked points / hidden MMR
 *   earned in ANY mode    | ranked matches only
 *   monotonic — never     | can promote AND demote
 *     decreases           |
 *   never resets          | resets each season
 *   measures time played  | measures competitive standing
 *
 * So a level 40 player may sit in the lowest rank, and a Yonko may be level 5.
 * Rendering them side by side is fine; computing one from the other is not.
 */

/** Levels stop here; XP past this still accumulates but the level is capped. */
export const MAX_LEVEL = 50;

/**
 * XP needed to go FROM level n TO n+1, for n >= 1.
 *
 * A gentle quadratic: 100 at level 1 rising to ~1.5k at level 49, ~28k total
 * to cap. Chosen so early levels arrive within a session or two while the cap
 * stays a long-term goal. Integer by construction, so no rounding drift when
 * summed.
 */
export function xpToNextLevel(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  const n = Math.max(1, Math.floor(level));
  return 100 + (n - 1) * 30;
}

/** Total XP required to have REACHED `level` (level 1 = 0 XP). */
export function totalXpForLevel(level: number): number {
  const target = Math.min(Math.max(1, Math.floor(level)), MAX_LEVEL);
  let total = 0;
  for (let n = 1; n < target; n += 1) total += xpToNextLevel(n);
  return total;
}

export interface LevelProgress {
  level: number;
  /** XP earned since reaching `level`. 0 at cap. */
  xpIntoLevel: number;
  /** XP required to reach the next level. 0 at cap. */
  xpForNextLevel: number;
  /** 0..1 progress toward the next level. 1 at cap. */
  progress: number;
  isMaxLevel: boolean;
}

/**
 * Derive level and progress from lifetime XP. Negative, fractional or
 * non-finite input is clamped rather than throwing — this renders in a header
 * on every screen, so a bad value must degrade to "level 1", never crash.
 */
export function levelForXp(experiencePoints: number): LevelProgress {
  const xp = Number.isFinite(experiencePoints) ? Math.max(0, Math.floor(experiencePoints)) : 0;

  let level = 1;
  let remaining = xp;
  while (level < MAX_LEVEL) {
    const needed = xpToNextLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }

  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, xpIntoLevel: 0, xpForNextLevel: 0, progress: 1, isMaxLevel: true };
  }

  const xpForNextLevel = xpToNextLevel(level);
  return {
    level,
    xpIntoLevel: remaining,
    xpForNextLevel,
    progress: xpForNextLevel === 0 ? 1 : remaining / xpForNextLevel,
    isMaxLevel: false,
  };
}

export type MatchOutcome = 'win' | 'loss' | 'draw';
export type MatchMode = 'ranked' | 'casual';

/**
 * XP for finishing a match. Losing still pays — the intent is to reward time
 * played, not to punish losing streaks — and ranked pays a premium.
 *
 * Concessions and abandonments are handled by the caller (see awardXpForMatch):
 * a player who quits gets the loss award at most, never a win.
 */
export const XP_AWARDS: Record<MatchMode, Record<MatchOutcome, number>> = {
  ranked: { win: 120, loss: 60, draw: 80 },
  casual: { win: 70, loss: 40, draw: 50 },
};

/**
 * XP for one completed match. Unknown modes/outcomes award 0 rather than
 * guessing, so a new result type can never silently mint XP.
 */
export function xpForMatch(mode: MatchMode, outcome: MatchOutcome): number {
  return XP_AWARDS[mode]?.[outcome] ?? 0;
}
