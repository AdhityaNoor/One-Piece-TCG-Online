/**
 * Shared ranked-mode contract and pure rating/rank utilities.
 *
 * The server owns authoritative profile updates. The frontend imports these
 * types/config labels for display only; it never receives hidden MMR through
 * public player-facing responses.
 */

export type RankedDivision = 'IV' | 'III' | 'II' | 'I';

export type RankedRankId =
  | 'east_blue_rookie'
  | 'grand_line_adventurer'
  | 'supernova'
  | 'warlord'
  | 'emperor_commander'
  | 'yonko'
  | 'pirate_king';

export type RankedSeasonStatus = 'upcoming' | 'active' | 'processing' | 'completed';
export type RankedMatchResult = 'win' | 'loss' | 'draw' | 'invalidated';
export type RankedResultType = 'normal' | 'concession' | 'timeout' | 'disconnect' | 'abandonment' | 'admin' | 'server_failure';
export type RankedQueueState = 'idle' | 'queued' | 'matched' | 'blocked';

export interface RankedRankDefinition {
  id: RankedRankId;
  name: string;
  order: number;
  divisions: RankedDivision[];
  color: string;
  icon: string;
  minHiddenMmr: number;
  rewards: string[];
}

export interface RankedSeasonConfig {
  id: string;
  name: string;
  status: RankedSeasonStatus;
  startsAt: string;
  endsAt: string;
  formatId: string;
  placementMatches: number;
  baselineMmr: number;
  initialUncertainty: number;
  minUncertainty: number;
  kFactor: number;
  placementKFactor: number;
  inactivityUncertaintyPerDay: number;
  rankedPointsPerDivision: number;
  minRankedPointDelta: number;
  maxRankedPointDelta: number;
  demotionProtectionMatches: number;
  pirateKingMinMmr: number;
  pirateKingMinSeasonMatches: number;
  pirateKingSlots: number;
  queue: {
    initialMmrRange: number;
    expansionSteps: { afterSeconds: number; mmrRange: number }[];
    maxMmrRange: number;
    maxWaitSeconds: number;
    recentOpponentCooldownMatches: number;
  };
  reset: {
    baselineMmr: number;
    compression: number;
  };
}

export interface RankedProfile {
  playerId: string;
  displayName: string;
  seasonId: string;
  placementMatchesCompleted: number;
  placementResults: RankedMatchResult[];
  rank: RankedRankId;
  division: RankedDivision | null;
  rankedPoints: number;
  hiddenMmr: number;
  uncertainty: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  highestStreak: number;
  highestRank: RankedRankId;
  highestSeasonRank: RankedRankId;
  totalRankedMatches: number;
  abandonmentCount: number;
  demotionProtectionRemaining: number;
  lastRankedActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicRankedProfile {
  playerId: string;
  displayName: string;
  seasonId: string;
  placementMatchesCompleted: number;
  placementMatchesRequired: number;
  inPlacement: boolean;
  rank: RankedRankId | 'placement';
  rankName: string;
  division: RankedDivision | null;
  rankedPoints: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  currentStreak: number;
  highestStreak: number;
  highestRank: RankedRankId;
  totalRankedMatches: number;
  abandonmentCount: number;
  demotionProtectionRemaining: number;
  lastRankedActivityAt: string | null;
}

export interface InternalRankedProfile extends PublicRankedProfile {
  hiddenMmr: number;
  uncertainty: number;
}

export interface RankedQueueStatus {
  state: RankedQueueState;
  seasonId: string | null;
  queuedAt: string | null;
  estimatedMessage: string;
  roomId?: string;
  matchId?: string;
  opponentName?: string;
  reasons?: string[];
}

export interface RankedLeaderboardEntry {
  position: number;
  playerId: string;
  displayName: string;
  avatarUrl?: string | null;
  rank: RankedRankId;
  rankName: string;
  division: RankedDivision | null;
  rankedPoints: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  highestSeasonRank: RankedRankId;
  hiddenMmr?: number;
}

export interface RankedMatchHistoryEntry {
  matchId: string;
  seasonId: string;
  opponentName: string;
  result: RankedMatchResult;
  resultType: RankedResultType;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  rankBefore: RankedRankId;
  divisionBefore: RankedDivision | null;
  rankedPointsBefore: number;
  rankAfter: RankedRankId;
  divisionAfter: RankedDivision | null;
  rankedPointsAfter: number;
  rankedPointDelta: number;
}

export interface RankedRatingInput {
  player: RankedProfile;
  opponent: RankedProfile;
  result: RankedMatchResult;
  resultType: RankedResultType;
  config: RankedSeasonConfig;
  nowIso: string;
}

export interface RankedRatingUpdate {
  playerId: string;
  result: RankedMatchResult;
  resultType: RankedResultType;
  expectedScore: number;
  score: number;
  kFactor: number;
  hiddenMmrBefore: number;
  hiddenMmrAfter: number;
  hiddenMmrDelta: number;
  uncertaintyBefore: number;
  uncertaintyAfter: number;
  rankBefore: RankedRankId;
  divisionBefore: RankedDivision | null;
  rankedPointsBefore: number;
  rankAfter: RankedRankId;
  divisionAfter: RankedDivision | null;
  rankedPointsAfter: number;
  rankedPointDelta: number;
  placementBefore: number;
  placementAfter: number;
  promoted: boolean;
  demoted: boolean;
  assignedInitialRank: boolean;
  demotionProtected: boolean;
  components: {
    visibleMmrEstimate: number;
    mmrRankGap: number;
    rankedPointBaseDelta: number;
    rankedPointAdjustment: number;
    rankedPointRawDelta: number;
  };
}

const DIVISIONS: RankedDivision[] = ['IV', 'III', 'II', 'I'];

export const RANKED_RANKS: RankedRankDefinition[] = [
  {
    id: 'east_blue_rookie',
    name: 'East Blue Rookie',
    order: 0,
    divisions: DIVISIONS,
    color: '#5fb3ff',
    icon: 'anchor',
    minHiddenMmr: 0,
    rewards: ['East Blue ranked card sleeve'],
  },
  {
    id: 'grand_line_adventurer',
    name: 'Grand Line Adventurer',
    order: 1,
    divisions: DIVISIONS,
    color: '#27d3a2',
    icon: 'compass',
    minHiddenMmr: 1250,
    rewards: ['Grand Line profile title'],
  },
  {
    id: 'supernova',
    name: 'Supernova',
    order: 2,
    divisions: DIVISIONS,
    color: '#d8b24c',
    icon: 'star',
    minHiddenMmr: 1450,
    rewards: ['Supernova emblem'],
  },
  {
    id: 'warlord',
    name: 'Warlord',
    order: 3,
    divisions: DIVISIONS,
    color: '#c06bff',
    icon: 'saber',
    minHiddenMmr: 1650,
    rewards: ['Warlord banner'],
  },
  {
    id: 'emperor_commander',
    name: 'Emperor Commander',
    order: 4,
    divisions: DIVISIONS,
    color: '#ff8a52',
    icon: 'flag',
    minHiddenMmr: 1850,
    rewards: ['Commander aura'],
  },
  {
    id: 'yonko',
    name: 'Yonko',
    order: 5,
    divisions: [],
    color: '#ff4e6a',
    icon: 'crown',
    minHiddenMmr: 2100,
    rewards: ['Yonko season frame'],
  },
  {
    id: 'pirate_king',
    name: 'Pirate King',
    order: 6,
    divisions: [],
    color: '#f8e27a',
    icon: 'treasure',
    minHiddenMmr: 2400,
    rewards: ['Pirate King exclusive title'],
  },
];

export const DEFAULT_RANKED_SEASON_CONFIG: RankedSeasonConfig = {
  id: 'voyage-1',
  name: 'Voyage 1: Grand Line Trials',
  status: 'active',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T23:59:59.999Z',
  formatId: 'ranked-standard-2026',
  placementMatches: 10,
  baselineMmr: 1500,
  initialUncertainty: 350,
  minUncertainty: 60,
  kFactor: 32,
  placementKFactor: 64,
  inactivityUncertaintyPerDay: 2,
  rankedPointsPerDivision: 100,
  minRankedPointDelta: 8,
  maxRankedPointDelta: 32,
  demotionProtectionMatches: 3,
  pirateKingMinMmr: 2400,
  pirateKingMinSeasonMatches: 50,
  pirateKingSlots: 25,
  queue: {
    initialMmrRange: 80,
    expansionSteps: [
      { afterSeconds: 15, mmrRange: 120 },
      { afterSeconds: 30, mmrRange: 200 },
      { afterSeconds: 60, mmrRange: 350 },
      { afterSeconds: 120, mmrRange: 500 },
    ],
    maxMmrRange: 650,
    maxWaitSeconds: 180,
    recentOpponentCooldownMatches: 3,
  },
  reset: {
    baselineMmr: 1500,
    compression: 0.65,
  },
};

export function rankDefinition(rank: RankedRankId): RankedRankDefinition {
  const definition = RANKED_RANKS.find((entry) => entry.id === rank);
  if (!definition) throw new Error(`Unknown ranked rank: ${rank}`);
  return definition;
}

export function createInitialRankedProfile(input: {
  playerId: string;
  displayName: string;
  seasonId: string;
  nowIso: string;
  config?: RankedSeasonConfig;
}): RankedProfile {
  const config = input.config ?? DEFAULT_RANKED_SEASON_CONFIG;
  return {
    playerId: input.playerId,
    displayName: input.displayName,
    seasonId: input.seasonId,
    placementMatchesCompleted: 0,
    placementResults: [],
    rank: 'east_blue_rookie',
    division: 'IV',
    rankedPoints: 0,
    hiddenMmr: config.baselineMmr,
    uncertainty: config.initialUncertainty,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    highestStreak: 0,
    highestRank: 'east_blue_rookie',
    highestSeasonRank: 'east_blue_rookie',
    totalRankedMatches: 0,
    abandonmentCount: 0,
    demotionProtectionRemaining: 0,
    lastRankedActivityAt: null,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export function toPublicRankedProfile(profile: RankedProfile, config = DEFAULT_RANKED_SEASON_CONFIG): PublicRankedProfile {
  const inPlacement = profile.placementMatchesCompleted < config.placementMatches;
  const totalDecisive = profile.wins + profile.losses;
  const rankName = inPlacement ? 'Placement Voyage' : rankDefinition(profile.rank).name;
  return {
    playerId: profile.playerId,
    displayName: profile.displayName,
    seasonId: profile.seasonId,
    placementMatchesCompleted: profile.placementMatchesCompleted,
    placementMatchesRequired: config.placementMatches,
    inPlacement,
    rank: inPlacement ? 'placement' : profile.rank,
    rankName,
    division: inPlacement ? null : profile.division,
    rankedPoints: inPlacement ? 0 : profile.rankedPoints,
    wins: profile.wins,
    losses: profile.losses,
    draws: profile.draws,
    winRate: totalDecisive === 0 ? 0 : Math.round((profile.wins / totalDecisive) * 1000) / 10,
    currentStreak: profile.currentStreak,
    highestStreak: profile.highestStreak,
    highestRank: profile.highestRank,
    totalRankedMatches: profile.totalRankedMatches,
    abandonmentCount: profile.abandonmentCount,
    demotionProtectionRemaining: profile.demotionProtectionRemaining,
    lastRankedActivityAt: profile.lastRankedActivityAt,
  };
}

export function toInternalRankedProfile(profile: RankedProfile, config = DEFAULT_RANKED_SEASON_CONFIG): InternalRankedProfile {
  return {
    ...toPublicRankedProfile(profile, config),
    hiddenMmr: profile.hiddenMmr,
    uncertainty: profile.uncertainty,
  };
}

export function currentQueueMmrRange(waitSeconds: number, config = DEFAULT_RANKED_SEASON_CONFIG): number {
  let range = config.queue.initialMmrRange;
  for (const step of config.queue.expansionSteps) {
    if (waitSeconds >= step.afterSeconds) range = step.mmrRange;
  }
  return Math.min(range, config.queue.maxMmrRange);
}

export function calculateRankedRatingUpdate(input: RankedRatingInput): RankedRatingUpdate {
  const { player, opponent, result, resultType, config, nowIso } = input;
  const placementBefore = player.placementMatchesCompleted;
  const inPlacement = placementBefore < config.placementMatches;
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  const expectedScore = 1 / (1 + 10 ** ((opponent.hiddenMmr - player.hiddenMmr) / 400));
  const kFactor = inPlacement ? config.placementKFactor : config.kFactor;
  const hiddenMmrDelta = result === 'invalidated' ? 0 : Math.round(kFactor * (score - expectedScore));
  const hiddenMmrAfter = Math.max(0, player.hiddenMmr + hiddenMmrDelta);
  const uncertaintyAfter =
    result === 'invalidated'
      ? player.uncertainty
      : Math.max(config.minUncertainty, Math.round(player.uncertainty * (inPlacement ? 0.88 : 0.94)));
  const placementAfter =
    result === 'invalidated' ? placementBefore : Math.min(config.placementMatches, placementBefore + 1);
  const assignedInitialRank = placementBefore < config.placementMatches && placementAfter >= config.placementMatches;

  const rankBefore = player.rank;
  const divisionBefore = player.division;
  const rankedPointsBefore = player.rankedPoints;

  let rankAfter = player.rank;
  let divisionAfter = player.division;
  let rankedPointsAfter = player.rankedPoints;
  let demotionProtected = false;
  const visibleMmrEstimate = visibleMmrFor(rankBefore, divisionBefore, rankedPointsBefore, config);
  const mmrRankGap = hiddenMmrAfter - visibleMmrEstimate;
  const rankedPointBaseDelta = result === 'win' ? 18 : result === 'draw' ? 0 : -18;
  const rankedPointAdjustment =
    result === 'win'
      ? clamp(Math.round(mmrRankGap / 80), 0, 10)
      : result === 'loss'
        ? clamp(Math.round(mmrRankGap / 80), -10, 0)
        : 0;
  const rankedPointRawDelta = rankedPointBaseDelta + rankedPointAdjustment;
  const rankedPointDelta =
    result === 'invalidated' || inPlacement
      ? 0
      : clamp(
          rankedPointRawDelta,
          result === 'loss' ? -config.maxRankedPointDelta : -config.minRankedPointDelta,
          result === 'win' ? config.maxRankedPointDelta : config.minRankedPointDelta,
        );

  if (assignedInitialRank) {
    const assigned = rankPlacementFromMmr(hiddenMmrAfter, config);
    rankAfter = assigned.rank;
    divisionAfter = assigned.division;
    rankedPointsAfter = assigned.rankedPoints;
  } else if (!inPlacement && result !== 'invalidated') {
    const progressed = applyRankedPointDelta(player, rankedPointDelta, config);
    rankAfter = progressed.rank;
    divisionAfter = progressed.division;
    rankedPointsAfter = progressed.rankedPoints;
    demotionProtected = progressed.demotionProtected;
  }

  const promoted = compareRankPosition(rankAfter, divisionAfter, rankBefore, divisionBefore) > 0;
  const demoted = compareRankPosition(rankAfter, divisionAfter, rankBefore, divisionBefore) < 0;

  void resultType;
  void nowIso;
  return {
    playerId: player.playerId,
    result,
    resultType,
    expectedScore: round4(expectedScore),
    score,
    kFactor,
    hiddenMmrBefore: player.hiddenMmr,
    hiddenMmrAfter,
    hiddenMmrDelta,
    uncertaintyBefore: player.uncertainty,
    uncertaintyAfter,
    rankBefore,
    divisionBefore,
    rankedPointsBefore,
    rankAfter,
    divisionAfter,
    rankedPointsAfter,
    rankedPointDelta: rankedPointsAfter - rankedPointsBefore,
    placementBefore,
    placementAfter,
    promoted,
    demoted,
    assignedInitialRank,
    demotionProtected,
    components: {
      visibleMmrEstimate,
      mmrRankGap,
      rankedPointBaseDelta,
      rankedPointAdjustment,
      rankedPointRawDelta,
    },
  };
}

export function applyRankedUpdate(
  profile: RankedProfile,
  update: RankedRatingUpdate,
  nowIso: string,
  config = DEFAULT_RANKED_SEASON_CONFIG,
): RankedProfile {
  const wins = profile.wins + (update.result === 'win' ? 1 : 0);
  const losses = profile.losses + (update.result === 'loss' ? 1 : 0);
  const draws = profile.draws + (update.result === 'draw' ? 1 : 0);
  const currentStreak =
    update.result === 'win' ? Math.max(1, profile.currentStreak + 1) : update.result === 'loss' ? Math.min(-1, profile.currentStreak - 1) : 0;
  const highestStreak = Math.max(profile.highestStreak, currentStreak);
  const nextRankOrder = rankDefinition(update.rankAfter).order;
  const highestRank = nextRankOrder > rankDefinition(profile.highestRank).order ? update.rankAfter : profile.highestRank;
  const highestSeasonRank =
    nextRankOrder > rankDefinition(profile.highestSeasonRank).order ? update.rankAfter : profile.highestSeasonRank;

  return {
    ...profile,
    placementMatchesCompleted: update.placementAfter,
    placementResults:
      update.result === 'invalidated'
        ? profile.placementResults
        : [...profile.placementResults, update.result].slice(-config.placementMatches),
    rank: update.rankAfter,
    division: update.divisionAfter,
    rankedPoints: update.rankedPointsAfter,
    hiddenMmr: update.hiddenMmrAfter,
    uncertainty: update.uncertaintyAfter,
    wins,
    losses,
    draws,
    currentStreak,
    highestStreak,
    highestRank,
    highestSeasonRank,
    totalRankedMatches: profile.totalRankedMatches + (update.result === 'invalidated' ? 0 : 1),
    abandonmentCount: profile.abandonmentCount + (update.resultType === 'abandonment' ? 1 : 0),
    demotionProtectionRemaining: update.promoted ? config.demotionProtectionMatches : Math.max(0, profile.demotionProtectionRemaining - 1),
    lastRankedActivityAt: update.result === 'invalidated' ? profile.lastRankedActivityAt : nowIso,
    updatedAt: nowIso,
  };
}

export function compareRankPosition(
  rankA: RankedRankId,
  divisionA: RankedDivision | null,
  rankB: RankedRankId,
  divisionB: RankedDivision | null,
): number {
  return rankPositionIndex(rankA, divisionA) - rankPositionIndex(rankB, divisionB);
}

export function rankPlacementFromMmr(
  hiddenMmr: number,
  config = DEFAULT_RANKED_SEASON_CONFIG,
): { rank: RankedRankId; division: RankedDivision | null; rankedPoints: number } {
  const cappedMmr = Math.min(hiddenMmr, config.pirateKingMinMmr - 1);
  let chosen = RANKED_RANKS[0];
  for (const rank of RANKED_RANKS) {
    if (rank.id === 'pirate_king') continue;
    if (cappedMmr >= rank.minHiddenMmr) chosen = rank;
  }
  if (chosen.divisions.length === 0) {
    return { rank: chosen.id, division: null, rankedPoints: 0 };
  }
  const nextRank = RANKED_RANKS.find((rank) => rank.order === chosen.order + 1);
  const span = Math.max(1, (nextRank?.minHiddenMmr ?? chosen.minHiddenMmr + 250) - chosen.minHiddenMmr);
  const progress = clamp((cappedMmr - chosen.minHiddenMmr) / span, 0, 0.99);
  const divisionIndex = clamp(Math.floor(progress * chosen.divisions.length), 0, chosen.divisions.length - 1);
  return {
    rank: chosen.id,
    division: chosen.divisions[divisionIndex],
    rankedPoints: Math.floor((progress * chosen.divisions.length - divisionIndex) * config.rankedPointsPerDivision),
  };
}

function applyRankedPointDelta(
  profile: RankedProfile,
  delta: number,
  config: RankedSeasonConfig,
): { rank: RankedRankId; division: RankedDivision | null; rankedPoints: number; demotionProtected: boolean } {
  if (profile.rank === 'pirate_king') {
    return { rank: 'pirate_king', division: null, rankedPoints: 0, demotionProtected: false };
  }
  let index = rankPositionIndex(profile.rank, profile.division);
  let points = profile.rankedPoints + delta;
  const maxIndex = rankPositionIndex('yonko', null);
  let demotionProtected = false;

  while (points >= config.rankedPointsPerDivision && index < maxIndex) {
    points -= config.rankedPointsPerDivision;
    index += 1;
  }

  while (points < 0 && index > 0) {
    if (profile.demotionProtectionRemaining > 0 && isMajorRankBoundary(index)) {
      points = 0;
      demotionProtected = true;
      break;
    }
    index -= 1;
    points += config.rankedPointsPerDivision;
  }

  if (index === maxIndex) points = 0;
  const rank = rankAtPositionIndex(index);
  return { rank: rank.rank, division: rank.division, rankedPoints: clamp(points, 0, config.rankedPointsPerDivision - 1), demotionProtected };
}

function rankPositionIndex(rank: RankedRankId, division: RankedDivision | null): number {
  const definition = rankDefinition(rank);
  let offset = 0;
  for (const entry of RANKED_RANKS) {
    if (entry.order >= definition.order) break;
    offset += Math.max(1, entry.divisions.length);
  }
  if (definition.divisions.length === 0) return offset;
  const divisionIndex = definition.divisions.indexOf(division ?? 'IV');
  return offset + Math.max(0, divisionIndex);
}

function rankAtPositionIndex(index: number): { rank: RankedRankId; division: RankedDivision | null } {
  let cursor = 0;
  for (const rank of RANKED_RANKS) {
    const width = Math.max(1, rank.divisions.length);
    if (index < cursor + width) {
      return { rank: rank.id, division: rank.divisions.length > 0 ? rank.divisions[index - cursor] : null };
    }
    cursor += width;
  }
  return { rank: 'yonko', division: null };
}

function isMajorRankBoundary(positionIndex: number): boolean {
  const current = rankAtPositionIndex(positionIndex);
  const previous = rankAtPositionIndex(Math.max(0, positionIndex - 1));
  return current.rank !== previous.rank;
}

function visibleMmrFor(rank: RankedRankId, division: RankedDivision | null, rankedPoints: number, config: RankedSeasonConfig): number {
  const index = rankPositionIndex(rank, division);
  return 1000 + index * 75 + Math.round((rankedPoints / config.rankedPointsPerDivision) * 75);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
