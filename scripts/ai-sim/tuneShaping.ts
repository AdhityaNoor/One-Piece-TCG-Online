/**
 * Coordinate search over per-action-type shaping, scored by arena win rate.
 *
 *   npx tsx scripts/ai-sim/tuneShaping.ts --budget=90 --pairs=15
 *
 * Checkpoints to disk after EVERY candidate, because a useful run is longer
 * than any single sitting and there is no reason to lose completed evaluations
 * to an interrupted one. Re-running resumes where it stopped.
 *
 * Each candidate is compared against the CURRENT BEST, not against the shipped
 * baseline: the question at every step is "is this better than what I have",
 * and paired seeds make that comparison far tighter than measuring both
 * against a third party.
 *
 * A candidate is adopted only when the Wilson interval clears 50%. Adopting on
 * a bare point estimate is how a hill-climb spends an afternoon walking uphill
 * on noise and ends up worse than where it started.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMatchups, runArena, TUNING_LEADERS, wilsonInterval } from './arena';
import {
  DEFAULT_EVALUATOR_WEIGHTS,
  SHAPED_ACTION_TYPES,
  type EvaluatorWeights,
  type ShapedActionType,
} from '../../src/ai/evaluation/weights';
import type { CpuDifficulty } from '../../src/ai';

const budgetSeconds = Number(process.argv.find((a) => a.startsWith('--budget='))?.split('=')[1] ?? '90');
const pairs = Number(process.argv.find((a) => a.startsWith('--pairs='))?.split('=')[1] ?? '15');
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'normal') as CpuDifficulty;
const checkpointPath = resolve(process.argv.find((a) => a.startsWith('--checkpoint='))?.split('=')[1] ?? 'shaping-checkpoint.json');

/** Steps tried per action type. Small: shaping is added to scores in the tens. */
const BIAS_STEPS = [-5, -2, 2, 5];

interface Checkpoint {
  best: EvaluatorWeights;
  /** Index into the flattened (type, step) candidate list. */
  nextCandidate: number;
  evaluated: number;
  adopted: { type: string; step: number; winRate: number }[];
  log: string[];
}

const candidates: { type: ShapedActionType; step: number }[] = [];
for (const type of SHAPED_ACTION_TYPES) {
  for (const step of BIAS_STEPS) candidates.push({ type, step });
}

function loadCheckpoint(): Checkpoint {
  if (existsSync(checkpointPath)) {
    return JSON.parse(readFileSync(checkpointPath, 'utf8')) as Checkpoint;
  }
  return { best: DEFAULT_EVALUATOR_WEIGHTS, nextCandidate: 0, evaluated: 0, adopted: [], log: [] };
}

function withBias(base: EvaluatorWeights, type: ShapedActionType, delta: number): EvaluatorWeights {
  const current = base.actionShaping?.[type]?.bias ?? 0;
  return {
    ...base,
    actionShaping: {
      ...base.actionShaping,
      [type]: { ...base.actionShaping?.[type], bias: current + delta },
    },
  };
}

const checkpoint = loadCheckpoint();
const matchups = buildMatchups(TUNING_LEADERS);
const startedAt = Date.now();

console.log(`resuming at candidate ${checkpoint.nextCandidate}/${candidates.length} (${checkpoint.evaluated} evaluated, ${checkpoint.adopted.length} adopted)`);

while (checkpoint.nextCandidate < candidates.length) {
  if ((Date.now() - startedAt) / 1000 > budgetSeconds) {
    console.log('budget reached — checkpoint saved, re-run to continue');
    break;
  }

  const { type, step } = candidates[checkpoint.nextCandidate];
  const candidate = withBias(checkpoint.best, type, step);

  const result = runArena({
    matchups,
    weightsA: candidate,
    weightsB: checkpoint.best,
    difficulty,
    pairsPerMatchup: pairs,
    seedPrefix: `tune-${checkpoint.nextCandidate}`,
  });

  const decided = result.winsA + result.winsB;
  const ci = wilsonInterval(result.winsA, decided);
  // Adopt only on evidence, not on a point estimate above 50%.
  const better = ci.low > 0.5;
  const line = `${type} ${step > 0 ? '+' : ''}${step}: ${(result.winRateA * 100).toFixed(1)}% [${(ci.low * 100).toFixed(1)}-${(ci.high * 100).toFixed(1)}] ${better ? 'ADOPTED' : ''}`;
  console.log(`  ${line}`);
  checkpoint.log.push(line);

  if (better) {
    checkpoint.best = candidate;
    checkpoint.adopted.push({ type, step, winRate: result.winRateA });
  }

  checkpoint.evaluated += 1;
  checkpoint.nextCandidate += 1;
  writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
}

console.log(`\nevaluated ${checkpoint.evaluated}/${candidates.length}, adopted ${checkpoint.adopted.length}`);
console.log('best shaping:', JSON.stringify(checkpoint.best.actionShaping ?? {}));
console.log(`checkpoint: ${checkpointPath}`);
