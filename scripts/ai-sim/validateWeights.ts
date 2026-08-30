/**
 * Judge a candidate weight set by the only measure that matters: does it win?
 *
 *   npx tsx scripts/ai-sim/validateWeights.ts --weights=fitted-weights.json --pairs=30
 *
 * Runs against the leaders the fit was TUNED on and, separately, against a
 * held-out pool it has never seen. A candidate that only improves on tuned
 * matchups has memorised those matchups, not learned to play — reporting the
 * two numbers side by side is what makes that visible instead of flattering.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildMatchups,
  formatArena,
  runArena,
  TUNING_LEADERS,
  VALIDATION_LEADERS,
} from './arena';
import { DEFAULT_EVALUATOR_WEIGHTS, type EvaluatorWeights } from '../../src/ai/evaluation/weights';
import type { CpuDifficulty } from '../../src/ai';

const weightsPath = process.argv.find((a) => a.startsWith('--weights='))?.split('=')[1];
const pairs = Number(process.argv.find((a) => a.startsWith('--pairs='))?.split('=')[1] ?? '25');
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'normal') as CpuDifficulty;
const pool = process.argv.find((a) => a.startsWith('--pool='))?.split('=')[1] ?? 'both';

const candidate: EvaluatorWeights = weightsPath
  ? { ...DEFAULT_EVALUATOR_WEIGHTS, ...(JSON.parse(readFileSync(resolve(weightsPath), 'utf8')) as Partial<EvaluatorWeights>) }
  : DEFAULT_EVALUATOR_WEIGHTS;

console.log(`candidate: ${weightsPath ?? '(baseline — null test)'}  difficulty=${difficulty}  pairs=${pairs}`);

if (pool === 'tuned' || pool === 'both') {
  console.log(formatArena(
    'tuned matchups   ',
    runArena({
      matchups: buildMatchups(TUNING_LEADERS),
      weightsA: candidate,
      difficulty,
      pairsPerMatchup: pairs,
      seedPrefix: `val-tuned-${difficulty}`,
    }),
  ));
}

if (pool === 'held-out' || pool === 'both') {
  console.log(formatArena(
    'held-out matchups',
    runArena({
      matchups: buildMatchups(VALIDATION_LEADERS),
      weightsA: candidate,
      difficulty,
      pairsPerMatchup: pairs,
      seedPrefix: `val-held-${difficulty}`,
    }),
  ));
}
