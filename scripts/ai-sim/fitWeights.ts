/**
 * Fit evaluator weights to self-play outcomes by logistic regression.
 *
 *   npx tsx scripts/ai-sim/fitWeights.ts --games=150 --out=fitted-weights.json
 *
 * Utility is already linear in EvaluatorWeights (see positionFeatures.ts), so
 * "learn better weights" is a logistic regression, not a neural network:
 * P(this seat wins | position) = sigmoid(w . x). The coefficients that fall
 * out ARE the weights.
 *
 * Three things this does that a naive fit would get wrong:
 *
 *  - STANDARDISES the features. They arrive on wildly different scales (a Life
 *    count of 0-5 next to a position value in the hundreds). Un-standardised,
 *    gradient descent is dominated by whichever feature happens to be biggest
 *    and the small ones never move.
 *  - DEDUPLICATES BY GAME, not by position. Positions inside one game share an
 *    outcome and are heavily correlated; treating 10,000 correlated rows as
 *    10,000 independent samples produces confident nonsense. Games are the
 *    sampling unit, so train/test is split by GAME.
 *  - RESCALES the answer to the baseline's units. Only the RATIOS between
 *    weights affect an argmax, so the fitted vector is anchored so that
 *    lifeTaken keeps its baseline value. Without that the weights drift to
 *    whatever magnitude the regulariser likes and become unreadable.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDeckFor, buildRig, createActionId, dispatch, loadCatalog, type HarnessOptions } from './harness';
import { chooseAction } from '../../src/ai';
import { generateLegalActions } from '../../src/ai/utilities/legalActions';
import { getActingPlayerId } from '../../src/board/projection';
import {
  extractPositionFeatures,
  featuresToVector,
  POSITION_FEATURE_KEYS,
} from '../../src/ai/evaluation/positionFeatures';
import { DEFAULT_EVALUATOR_WEIGHTS, type EvaluatorWeights } from '../../src/ai/evaluation/weights';
import { TUNING_LEADERS } from './arena';
import type { CpuDifficulty } from '../../src/ai';

const gameCount = Number(process.argv.find((a) => a.startsWith('--games='))?.split('=')[1] ?? '120');
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'normal') as CpuDifficulty;
const outFile = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'fitted-weights.json';

interface Sample {
  game: number;
  x: number[];
  y: number; // 1 = the seat to move went on to win
}

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const decks = TUNING_LEADERS.map((n) => {
  const leader = byNum.get(n)!;
  return { leader, deck: buildDeckFor(leader, catalog) };
});

console.log(`generating ${gameCount} self-play games (${difficulty})...`);
const samples: Sample[] = [];
let finished = 0;

for (let g = 0; g < gameCount; g++) {
  const a = decks[g % decks.length];
  const b = decks[(g + 1) % decks.length];
  const opts: HarnessOptions = { mode: 'v1', difficulty, seed: `fit-${g}`, maxActions: 2000 };
  const rig = buildRig(a.leader, a.deck, b.leader, b.deck, opts);

  const pending: { seat: string; x: number[] }[] = [];
  let guard = 0;
  while (guard++ < 600 && !rig.state.gameOver) {
    const acting = getActingPlayerId(rig.state);
    const legal = generateLegalActions({
      state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry, createActionId,
    });
    // Only positions where the seat had a genuine choice carry preference
    // signal; a forced move says nothing about what the seat values.
    if (legal.length > 1 && rig.state.currentPhase === 'main') {
      pending.push({
        seat: acting,
        x: featuresToVector(extractPositionFeatures(rig.state, acting, rig.defs, rig.registry)),
      });
    }
    const decision = chooseAction({
      state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry,
      config: { difficulty, seed: opts.seed }, createActionId,
    });
    const action = decision?.action ?? legal[0];
    if (!action || !dispatch(rig, action).ok) break;
  }

  const winner = rig.state.gameOver?.winnerId ?? null;
  if (!winner) continue; // an unfinished game has no label
  finished += 1;
  for (const p of pending) samples.push({ game: g, x: p.x, y: p.seat === winner ? 1 : 0 });
}

console.log(`${finished}/${gameCount} games finished, ${samples.length} labelled positions`);
if (samples.length < 200) {
  console.error('not enough data to fit — raise --games');
  process.exit(1);
}

// --- split by GAME so correlated positions cannot straddle the split --------
const games = [...new Set(samples.map((s) => s.game))];
const testGames = new Set(games.filter((_, i) => i % 5 === 0));
const train = samples.filter((s) => !testGames.has(s.game));
const test = samples.filter((s) => testGames.has(s.game));

const dim = POSITION_FEATURE_KEYS.length;
const mean = new Array(dim).fill(0);
const sd = new Array(dim).fill(0);
for (const s of train) for (let i = 0; i < dim; i++) mean[i] += s.x[i] / train.length;
for (const s of train) for (let i = 0; i < dim; i++) sd[i] += (s.x[i] - mean[i]) ** 2 / train.length;
for (let i = 0; i < dim; i++) sd[i] = Math.sqrt(sd[i]) || 1;

const standardise = (x: number[]) => x.map((v, i) => (v - mean[i]) / sd[i]);

// --- logistic regression, L2-regularised, plain gradient descent ------------
const w = new Array(dim).fill(0);
let bias = 0;
const lr = 0.25;
const l2 = 1e-3;
const epochs = 400;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));

for (let epoch = 0; epoch < epochs; epoch++) {
  const gw = new Array(dim).fill(0);
  let gb = 0;
  for (const s of train) {
    const xs = standardise(s.x);
    let z = bias;
    for (let i = 0; i < dim; i++) z += w[i] * xs[i];
    const err = sigmoid(z) - s.y;
    for (let i = 0; i < dim; i++) gw[i] += (err * xs[i]) / train.length;
    gb += err / train.length;
  }
  for (let i = 0; i < dim; i++) w[i] -= lr * (gw[i] + l2 * w[i]);
  bias -= lr * gb;
}

function metrics(rows: Sample[]) {
  let correct = 0;
  let logLoss = 0;
  for (const s of rows) {
    const xs = standardise(s.x);
    let z = bias;
    for (let i = 0; i < dim; i++) z += w[i] * xs[i];
    const p = sigmoid(z);
    if ((p >= 0.5 ? 1 : 0) === s.y) correct += 1;
    logLoss -= (s.y * Math.log(Math.max(1e-9, p)) + (1 - s.y) * Math.log(Math.max(1e-9, 1 - p))) / rows.length;
  }
  return { accuracy: correct / rows.length, logLoss };
}

const trainMetrics = metrics(train);
const testMetrics = metrics(test);
console.log(`\ntrain: acc ${(trainMetrics.accuracy * 100).toFixed(1)}%  logloss ${trainMetrics.logLoss.toFixed(4)}  (${train.length} rows)`);
console.log(`test : acc ${(testMetrics.accuracy * 100).toFixed(1)}%  logloss ${testMetrics.logLoss.toFixed(4)}  (${test.length} rows, ${testGames.size} held-out games)`);

// --- back out weights in the ORIGINAL feature units -------------------------
// Standardised coefficient / sd puts each one back on its own scale.
const raw = w.map((coef, i) => coef / sd[i]);

// Only ratios matter to an argmax, so anchor on lifeTaken's baseline value to
// keep the numbers comparable with the shipped set.
const anchorIndex = POSITION_FEATURE_KEYS.indexOf('lifeTaken');
const anchor = raw[anchorIndex];
if (Math.abs(anchor) < 1e-9) {
  console.error('fit gave the anchor feature no weight — cannot rescale');
  process.exit(1);
}
const scale = DEFAULT_EVALUATOR_WEIGHTS.lifeTaken / anchor;

const fitted: EvaluatorWeights = { ...DEFAULT_EVALUATOR_WEIGHTS };
console.log('\nfeature                baseline      fitted   standardised');
for (const [i, key] of POSITION_FEATURE_KEYS.entries()) {
  const value = raw[i] * scale;
  fitted[key] = Number(value.toFixed(4));
  console.log(
    `${key.padEnd(20)} ${String(DEFAULT_EVALUATOR_WEIGHTS[key]).padStart(9)} ${value.toFixed(3).padStart(11)} ${w[i].toFixed(3).padStart(14)}`,
  );
}

const negatives = POSITION_FEATURE_KEYS.filter((k) => fitted[k] < 0);
if (negatives.length > 0) {
  console.log(`\nNOTE: negative coefficients on ${negatives.join(', ')} — the data disagrees with the hand-written formula's sign there.`);
}
if (fitted.availableDamage >= fitted.lifeTaken) {
  console.log('\nWARNING: fitted availableDamage >= lifeTaken. That is the shape of the "hold the threat, never attack" pathology; expect the arena to reject this.');
}

writeFileSync(resolve(outFile), JSON.stringify(fitted, null, 2));
console.log(`\nwritten to ${resolve(outFile)} — now validate it with arenaFitted.ts before believing any of it.`);
