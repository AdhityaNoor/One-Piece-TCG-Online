/**
 * Head-to-head measurement between two weight sets. This is the ground truth
 * for "is this actually better" — everything else in the tuner is a way of
 * generating candidates for the arena to judge.
 *
 * TWO SOURCES OF NOISE THIS CONTROLS FOR
 *
 * 1. SEAT ADVANTAGE. Going first is not neutral in this game. Every seed is
 *    therefore played TWICE with the seats swapped, and both results counted.
 *    A weight set that only wins on the play is not better, and unpaired
 *    sampling would happily report that it is.
 *
 * 2. DECK/SHUFFLE VARIANCE. The same seed produces the same shuffle for both
 *    games in a pair, so the pair differs only in which side holds which
 *    weights. Reusing the seed across the two arms is deliberate variance
 *    reduction, not an accident.
 *
 * Results come back with a Wilson interval because the honest answer to "52%
 * over 50 games" is "we have learned nothing", and a bare percentage invites
 * the opposite conclusion.
 */
import { buildDeckFor, buildRig, loadCatalog, runMatch, type HarnessOptions } from './harness';
import { DEFAULT_EVALUATOR_WEIGHTS, type EvaluatorWeights } from '../../src/ai/evaluation/weights';
import type { CpuDifficulty } from '../../src/ai';
import type { CardDefinition } from '../../src/engine/state/card';

export interface ArenaMatchup {
  leaderA: CardDefinition;
  deckA: CardDefinition[];
  leaderB: CardDefinition;
  deckB: CardDefinition[];
}

export interface ArenaResult {
  games: number;
  winsA: number;
  winsB: number;
  draws: number;
  /** Share of DECIDED games won by A. */
  winRateA: number;
  /** 95% Wilson interval on winRateA. */
  ci: { low: number; high: number };
  /** True when the interval excludes 50% — i.e. the difference is real. */
  significant: boolean;
  avgTurns: number;
  stuck: number;
}

/**
 * Wilson score interval. Preferred over the normal approximation because at
 * the sample sizes a tuning loop can afford (tens to low hundreds), and at win
 * rates near 0 or 1, the normal interval is badly wrong — it happily produces
 * bounds outside [0, 1] and understates uncertainty exactly where a tuner is
 * most likely to be fooled.
 */
export function wilsonInterval(wins: number, total: number, z = 1.96): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 1 };
  const p = wins / total;
  const denom = 1 + (z * z) / total;
  const centre = p + (z * z) / (2 * total);
  const spread = z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return {
    low: Math.max(0, (centre - spread) / denom),
    high: Math.min(1, (centre + spread) / denom),
  };
}

export interface RunArenaOptions {
  matchups: ArenaMatchup[];
  weightsA: EvaluatorWeights;
  weightsB?: EvaluatorWeights;
  difficulty: CpuDifficulty;
  /** Seed pairs per matchup. Each produces TWO games (seats swapped). */
  pairsPerMatchup: number;
  seedPrefix?: string;
  /** Stop early once the interval already excludes 50% in either direction. */
  earlyStop?: boolean;
  /** Never early-stop before this many games — small samples lie. */
  minGamesBeforeStop?: number;
}

export function runArena(options: RunArenaOptions): ArenaResult {
  const weightsB = options.weightsB ?? DEFAULT_EVALUATOR_WEIGHTS;
  const prefix = options.seedPrefix ?? 'arena';
  const minBeforeStop = options.minGamesBeforeStop ?? 60;

  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let games = 0;
  let turns = 0;
  let stuck = 0;

  for (let pair = 0; pair < options.pairsPerMatchup; pair++) {
    for (const [matchIndex, matchup] of options.matchups.entries()) {
      // Arm 0: A sits in p1. Arm 1: A sits in p2, same seed and same shuffle.
      for (const aSeat of ['p1', 'p2'] as const) {
        const bSeat = aSeat === 'p1' ? 'p2' : 'p1';
        const seed = `${prefix}-${matchIndex}-${pair}`;
        const opts: HarnessOptions = {
          mode: 'v1',
          difficulty: options.difficulty,
          seed,
          maxActions: 2500,
          weightsBySeat: { [aSeat]: options.weightsA, [bSeat]: weightsB },
        };
        const rig = buildRig(matchup.leaderA, matchup.deckA, matchup.leaderB, matchup.deckB, opts);
        const result = runMatch(rig, opts);

        games += 1;
        turns += rig.state.turnNumber;
        if (result.stuck) stuck += 1;

        const winner = rig.state.gameOver?.winnerId ?? null;
        if (winner === null) draws += 1;
        else if (winner === aSeat) winsA += 1;
        else winsB += 1;
      }
    }

    if (options.earlyStop && games >= minBeforeStop) {
      const decided = winsA + winsB;
      const ci = wilsonInterval(winsA, decided);
      if (ci.low > 0.5 || ci.high < 0.5) break;
    }
  }

  const decided = winsA + winsB;
  const ci = wilsonInterval(winsA, decided);
  return {
    games,
    winsA,
    winsB,
    draws,
    winRateA: decided > 0 ? winsA / decided : 0.5,
    ci,
    significant: ci.low > 0.5 || ci.high < 0.5,
    avgTurns: games > 0 ? turns / games : 0,
    stuck,
  };
}

/** Standard opponent pool. Deliberately spread across colours and play styles. */
export const TUNING_LEADERS = ['OP01-001', 'OP01-002', 'OP01-003', 'OP02-025'];
/** Held out of tuning entirely, so improvement can be checked on unseen matchups. */
export const VALIDATION_LEADERS = ['OP03-021', 'OP04-001', 'EB01-040', 'OP02-093'];

export function buildMatchups(leaderNumbers: readonly string[]): ArenaMatchup[] {
  const catalog = loadCatalog();
  const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
  const matchups: ArenaMatchup[] = [];
  for (let i = 0; i < leaderNumbers.length; i++) {
    const a = byNum.get(leaderNumbers[i]);
    const b = byNum.get(leaderNumbers[(i + 1) % leaderNumbers.length]);
    if (!a || !b) continue;
    matchups.push({
      leaderA: a,
      deckA: buildDeckFor(a, catalog),
      leaderB: b,
      deckB: buildDeckFor(b, catalog),
    });
  }
  return matchups;
}

export function formatArena(label: string, result: ArenaResult): string {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    `${label}: ${pct(result.winRateA)} [${pct(result.ci.low)}–${pct(result.ci.high)}]`,
    `${result.winsA}W-${result.winsB}L${result.draws ? `-${result.draws}D` : ''}`,
    `over ${result.games} games`,
    result.significant ? 'SIGNIFICANT' : 'not significant',
    result.stuck ? `(${result.stuck} stuck)` : '',
  ]
    .filter(Boolean)
    .join(' | ');
}
