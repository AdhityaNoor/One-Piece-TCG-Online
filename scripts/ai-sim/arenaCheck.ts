/** Calibration: identical weights must come out ~50%, and a deliberately broken set must lose. */
import { buildMatchups, formatArena, runArena, TUNING_LEADERS } from './arena';
import { DEFAULT_EVALUATOR_WEIGHTS, withWeights } from '../../src/ai/evaluation/weights';

const matchups = buildMatchups(TUNING_LEADERS);
const pairs = Number(process.argv.find((a) => a.startsWith('--pairs='))?.split('=')[1] ?? '20');

console.log(formatArena(
  'baseline vs itself      ',
  runArena({ matchups, weightsA: DEFAULT_EVALUATOR_WEIGHTS, difficulty: 'normal', pairsPerMatchup: pairs, seedPrefix: 'null' }),
));

// The exact bug that made the CPU pass its turns: potential worth more than
// realized damage. If the arena cannot detect this, it cannot detect anything.
console.log(formatArena(
  'regressed vs baseline   ',
  runArena({
    matchups,
    weightsA: withWeights({ lifeTaken: 10, availableDamage: 8, boardDamage: 0 }),
    difficulty: 'normal',
    pairsPerMatchup: pairs,
    seedPrefix: 'regress',
  }),
));

console.log(formatArena(
  'no-position vs baseline ',
  runArena({
    matchups,
    weightsA: withWeights({ positionValue: 0, boardDifference: 0 }),
    difficulty: 'normal',
    pairsPerMatchup: pairs,
    seedPrefix: 'nopos',
  }),
));
