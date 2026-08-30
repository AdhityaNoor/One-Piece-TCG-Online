/**
 * A resumable arena run, for verdicts that take longer than one sitting.
 *
 *   npx tsx scripts/ai-sim/longArena.ts \
 *     --weights=scripts/ai-sim/candidates/fast-wide-search.json \
 *     --diff=hard --target=240 --budget=100
 *
 * `validateWeights.ts` answers a question in one go, which is fine at normal
 * difficulty (~40ms/game). At hard a game costs ~6-12 SECONDS, so a sample big
 * enough to mean anything is 20+ minutes of wall clock — longer than most
 * shells, sessions and patience.
 *
 * So this runs in slices: play until `--budget` seconds are up, write every
 * game played to a checkpoint, exit. Re-run to continue. The accumulated
 * result is reported each time, so a verdict can arrive early if the interval
 * separates from 50% before the target is reached.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDeckFor, buildRig, loadCatalog, runMatch, type HarnessOptions } from './harness';
import { TUNING_LEADERS, VALIDATION_LEADERS, wilsonInterval } from './arena';
import { DEFAULT_EVALUATOR_WEIGHTS, type EvaluatorWeights } from '../../src/ai/evaluation/weights';
import { adjudicate } from './adjudicate';
import type { CpuDifficulty } from '../../src/ai';

const weightsPath = process.argv.find((a) => a.startsWith('--weights='))?.split('=')[1];
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'hard') as CpuDifficulty;
const target = Number(process.argv.find((a) => a.startsWith('--target='))?.split('=')[1] ?? '240');
const budgetSeconds = Number(process.argv.find((a) => a.startsWith('--budget='))?.split('=')[1] ?? '100');
const checkpointPath = resolve(
  process.argv.find((a) => a.startsWith('--checkpoint='))?.split('=')[1] ?? 'long-arena-checkpoint.json',
);

interface Slice {
  label: string;
  winsA: number;
  winsB: number;
  draws: number;
  played: number;
  /** Games abandoned on the per-game deadline. Reported, never hidden. */
  timedOut: number;
}
interface Checkpoint {
  weightsPath: string | null;
  difficulty: string;
  target: number;
  /** Next game index — the whole schedule is a deterministic function of this. */
  cursor: number;
  pools: Record<string, Slice>;
}

const candidate: EvaluatorWeights = weightsPath
  ? { ...DEFAULT_EVALUATOR_WEIGHTS, ...(JSON.parse(readFileSync(resolve(weightsPath), 'utf8')) as Partial<EvaluatorWeights>) }
  : DEFAULT_EVALUATOR_WEIGHTS;

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const deckCache = new Map<string, ReturnType<typeof buildDeckFor>>();
function deckFor(cardNumber: string) {
  if (!deckCache.has(cardNumber)) deckCache.set(cardNumber, buildDeckFor(byNum.get(cardNumber)!, catalog));
  return deckCache.get(cardNumber)!;
}

const POOLS = { tuned: TUNING_LEADERS, 'held-out': VALIDATION_LEADERS };

function loadCheckpoint(): Checkpoint {
  if (existsSync(checkpointPath)) {
    const saved = JSON.parse(readFileSync(checkpointPath, 'utf8')) as Checkpoint;
    // Refuse to blend results from a different question into one number.
    if (saved.weightsPath === (weightsPath ?? null) && saved.difficulty === difficulty) return saved;
    console.log('checkpoint is for a different candidate/difficulty — starting fresh');
  }
  return {
    weightsPath: weightsPath ?? null,
    difficulty,
    target,
    cursor: 0,
    pools: Object.fromEntries(
      Object.keys(POOLS).map((k) => [k, { label: k, winsA: 0, winsB: 0, draws: 0, played: 0, timedOut: 0 }]),
    ),
  };
}

const checkpoint = loadCheckpoint();
const startedAt = Date.now();

/**
 * The schedule is a pure function of the game index, so a resumed run continues
 * the SAME sequence of matchups and seats rather than re-rolling a new one —
 * otherwise the accumulated totals would silently mix different samples.
 */
function scheduleFor(index: number) {
  const poolNames = Object.keys(POOLS);
  const pool = poolNames[index % poolNames.length];
  const leaders = POOLS[pool as keyof typeof POOLS];
  const step = Math.floor(index / poolNames.length);
  const matchup = step % leaders.length;
  const pair = Math.floor(step / leaders.length / 2);
  const aSeat = step % 2 === 0 ? 'p1' : 'p2';
  return {
    pool,
    leaderA: leaders[matchup],
    leaderB: leaders[(matchup + 1) % leaders.length],
    seed: `long-${pool}-${matchup}-${pair}`,
    aSeat: aSeat as 'p1' | 'p2',
  };
}

while (checkpoint.cursor < target * Object.keys(POOLS).length) {
  if ((Date.now() - startedAt) / 1000 > budgetSeconds) break;

  const plan = scheduleFor(checkpoint.cursor);
  const bSeat = plan.aSeat === 'p1' ? 'p2' : 'p1';
  const opts: HarnessOptions = {
    mode: 'v1',
    difficulty,
    seed: plan.seed,
    maxActions: 2500,
    // One game must never be able to stall a slice. Sized well above a normal
    // hard game (~6-15s) but below the slice budget.
    deadlineMs: 40_000,
    weightsBySeat: { [plan.aSeat]: candidate, [bSeat]: DEFAULT_EVALUATOR_WEIGHTS },
  };
  const rig = buildRig(
    byNum.get(plan.leaderA)!, deckFor(plan.leaderA),
    byNum.get(plan.leaderB)!, deckFor(plan.leaderB),
    opts,
  );
  const outcome = runMatch(rig, opts);

  const slice = checkpoint.pools[plan.pool];
  slice.timedOut = (slice.timedOut ?? 0) + (outcome.timedOut ? 1 : 0);
  // An unfinished game is adjudicated on the position rather than discarded —
  // dropping it would bias the sample toward whichever config is worse at
  // closing games out. See adjudicate.ts.
  const winner = rig.state.gameOver?.winnerId
    ?? adjudicate(rig.state, rig.defs, plan.aSeat, bSeat).winnerSeatId;
  if (winner === null) slice.draws += 1;
  else if (winner === plan.aSeat) slice.winsA += 1;
  else slice.winsB += 1;
  slice.played += 1;

  checkpoint.cursor += 1;
  writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

console.log(`candidate: ${weightsPath ?? '(baseline — null test)'}  difficulty=${difficulty}`);
let anySignificant = false;
for (const slice of Object.values(checkpoint.pools)) {
  const decided = slice.winsA + slice.winsB;
  const ci = wilsonInterval(slice.winsA, decided);
  const rate = decided > 0 ? slice.winsA / decided : 0.5;
  const significant = decided > 0 && (ci.low > 0.5 || ci.high < 0.5);
  if (significant) anySignificant = true;
  console.log(
    `  ${slice.label.padEnd(9)} ${(rate * 100).toFixed(1)}% [${(ci.low * 100).toFixed(1)}–${(ci.high * 100).toFixed(1)}] ` +
    `${slice.winsA}W-${slice.winsB}L${slice.draws ? `-${slice.draws}D` : ''} over ${slice.played}/${target} ` +
    `${slice.timedOut ? `(${slice.timedOut} timed out) ` : ''}${significant ? 'SIGNIFICANT' : ''}`,
  );
}
const done = checkpoint.cursor >= target * Object.keys(POOLS).length;
console.log(done ? '\ncomplete.' : `\nre-run to continue (${checkpoint.cursor} games played)`);
if (!done && !anySignificant) {
  console.log('so far indistinguishable from baseline — which, for this candidate, is the result we want.');
}
