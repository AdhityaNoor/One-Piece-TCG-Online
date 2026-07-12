import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RANKED_SEASON_CONFIG,
  applyRankedUpdate,
  calculateRankedRatingUpdate,
  createInitialRankedProfile,
  rankPlacementFromMmr,
} from '../../../shared/ranked';

function profile(playerId: string, mmr = 1500) {
  return {
    ...createInitialRankedProfile({
      playerId,
      displayName: playerId,
      seasonId: DEFAULT_RANKED_SEASON_CONFIG.id,
      nowIso: '2026-07-12T00:00:00.000Z',
    }),
    placementMatchesCompleted: DEFAULT_RANKED_SEASON_CONFIG.placementMatches,
    hiddenMmr: mmr,
  };
}

describe('ranked rating engine', () => {
  it('moves equal-rating winner and loser symmetrically by Elo expectation', () => {
    const a = profile('a', 1500);
    const b = profile('b', 1500);
    const win = calculateRankedRatingUpdate({
      player: a,
      opponent: b,
      result: 'win',
      resultType: 'normal',
      config: DEFAULT_RANKED_SEASON_CONFIG,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    const loss = calculateRankedRatingUpdate({
      player: b,
      opponent: a,
      result: 'loss',
      resultType: 'normal',
      config: DEFAULT_RANKED_SEASON_CONFIG,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    expect(win.expectedScore).toBe(0.5);
    expect(win.hiddenMmrDelta).toBe(16);
    expect(loss.hiddenMmrDelta).toBe(-16);
  });

  it('uses a larger placement k-factor and assigns an initial visible rank after match 10', () => {
    const a = createInitialRankedProfile({
      playerId: 'a',
      displayName: 'a',
      seasonId: DEFAULT_RANKED_SEASON_CONFIG.id,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    const b = profile('b', 1500);
    const placedA = { ...a, placementMatchesCompleted: 9, hiddenMmr: 1660 };
    const update = calculateRankedRatingUpdate({
      player: placedA,
      opponent: b,
      result: 'win',
      resultType: 'normal',
      config: DEFAULT_RANKED_SEASON_CONFIG,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    expect(update.kFactor).toBe(DEFAULT_RANKED_SEASON_CONFIG.placementKFactor);
    expect(update.assignedInitialRank).toBe(true);
    expect(update.rankAfter).not.toBe('pirate_king');
  });

  it('promotes when ranked points cross the division cap', () => {
    const a = { ...profile('a'), rankedPoints: 95 };
    const b = profile('b');
    const update = calculateRankedRatingUpdate({
      player: a,
      opponent: b,
      result: 'win',
      resultType: 'normal',
      config: DEFAULT_RANKED_SEASON_CONFIG,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    expect(update.promoted).toBe(true);
    expect(update.divisionAfter).toBe('III');
  });

  it('applies major-rank demotion protection before crossing a rank boundary', () => {
    const a = {
      ...profile('a'),
      rank: 'grand_line_adventurer' as const,
      division: 'IV' as const,
      rankedPoints: 2,
      demotionProtectionRemaining: 1,
    };
    const b = profile('b');
    const update = calculateRankedRatingUpdate({
      player: a,
      opponent: b,
      result: 'loss',
      resultType: 'normal',
      config: DEFAULT_RANKED_SEASON_CONFIG,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    expect(update.demotionProtected).toBe(true);
    expect(update.rankAfter).toBe('grand_line_adventurer');
    expect(update.rankedPointsAfter).toBe(0);
  });

  it('keeps placement assignment below Pirate King even at extreme MMR', () => {
    const assigned = rankPlacementFromMmr(3000, DEFAULT_RANKED_SEASON_CONFIG);
    expect(assigned.rank).not.toBe('pirate_king');
  });

  it('does not change ratings for server-failure invalidations', () => {
    const a = profile('a', 1700);
    const b = profile('b', 1500);
    const update = calculateRankedRatingUpdate({
      player: a,
      opponent: b,
      result: 'invalidated',
      resultType: 'server_failure',
      config: DEFAULT_RANKED_SEASON_CONFIG,
      nowIso: '2026-07-12T00:00:00.000Z',
    });
    const next = applyRankedUpdate(a, update, '2026-07-12T00:00:00.000Z');
    expect(next.hiddenMmr).toBe(a.hiddenMmr);
    expect(next.totalRankedMatches).toBe(a.totalRankedMatches);
  });
});

