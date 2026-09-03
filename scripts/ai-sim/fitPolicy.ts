/**
 * Fit an ACTION POLICY from recorded play: given the legal set someone faced,
 * which action did they take?
 *
 *   npx tsx scripts/ai-sim/fitPolicy.ts --in=rows.jsonl --out=src/ai/evaluation/policyWeights.json
 *
 * THE MODEL
 * A conditional logit. Every candidate action gets the same weight vector w
 * applied to its feature vector x, and the choice is softmax over the set:
 *
 *     P(action i | legal set S) = exp(w.x_i) / sum_{k in S} exp(w.x_k)
 *
 * This is deliberately the simplest thing that can express "prefer A over B in
 * THIS position". It is linear, has one coefficient per feature, trains in a
 * second, and — the part that matters for shipping — every coefficient is
 * readable as "how much this property attracts a player", so a nonsense sign is
 * visible instead of buried in a network's weights.
 *
 * WHAT HIGH ACCURACY DOES AND DOES NOT MEAN
 * Read this before believing any number this script prints.
 *
 * On SELF-PLAY data the choices were made by the CPU itself, so a good fit
 * means "we can predict our own evaluator" — worth nothing as an improvement,
 * though a genuine end-to-end check that the pipeline works. The script
 * refuses to stay quiet about it and prints a warning whenever human rows are
 * not the bulk of the data.
 *
 * Only rows from matches between PEOPLE carry information the CPU does not
 * already have. And even then, accuracy is not the ship criterion: predicting
 * a human is not the same as beating one. The fitted vector ships only if it
 * wins games in the arena, exactly like the position weights before it.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { ACTION_FEATURE_KEYS } from '../../src/ai/evaluation/actionFeatures';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const inFile = arg('in') ?? 'training-rows.jsonl';
const outFile = arg('out') ?? 'src/ai/evaluation/policyWeights.json';
const l2 = Number(arg('l2') ?? 1);
const iterations = Number(arg('iters') ?? 400);
const learningRate = Number(arg('lr') ?? 0.5);
/** Fraction of MATCHES (never rows) held out. */
const testFraction = Number(arg('test') ?? 0.25);

interface Row {
  matchId: string;
  source: string;
  actionType: string;
  featureKeys?: string[];
  chosenIndex: number;
  candidates: { type: string; features: number[] }[];
}

const rows: Row[] = [];
const sourceCounts: Record<string, number> = {};
for (const line of readFileSync(resolve(inFile), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const row = JSON.parse(line) as Row;
  if (!row.candidates || row.chosenIndex < 0 || row.candidates.length < 2) continue;
  // The fitted vector is positional. A row exported under a different feature
  // list would silently train the wrong coefficients onto the wrong features.
  if (row.featureKeys && row.featureKeys.join(',') !== ACTION_FEATURE_KEYS.join(',')) {
    throw new Error(
      'Feature-key mismatch: these rows were exported with a different ACTION_FEATURE_KEYS ' +
        'than the current build. Re-run exportTraining.ts.',
    );
  }
  rows.push(row);
  sourceCounts[row.source] = (sourceCounts[row.source] ?? 0) + 1;
}

if (rows.length === 0) throw new Error(`No usable rows in ${inFile}.`);

const D = ACTION_FEATURE_KEYS.length;

// --- Split BY MATCH ---------------------------------------------------------
// Splitting by row would put decisions from the same game on both sides, and
// consecutive decisions in one game are near-duplicates. That leaks, and it
// inflates held-out accuracy into meaninglessness.
const matchIds = [...new Set(rows.map((r) => r.matchId))].sort();
const hashed = matchIds.map((id) => {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return { id, h };
});
hashed.sort((a, b) => a.h - b.h);
const testCount = Math.max(1, Math.round(hashed.length * testFraction));
const testMatches = new Set(hashed.slice(0, testCount).map((m) => m.id));
const train = rows.filter((r) => !testMatches.has(r.matchId));
const test = rows.filter((r) => testMatches.has(r.matchId));

// --- Scaling ----------------------------------------------------------------
// Only the SCALE matters here: adding a constant to a feature shifts every
// candidate in a set by the same amount and cancels inside the softmax. Scaling
// still matters, because features on wildly different magnitudes make one
// learning rate wrong for all of them.
const scale = new Array<number>(D).fill(1);
for (let j = 0; j < D; j++) {
  let sum = 0;
  let n = 0;
  for (const row of train) {
    for (const c of row.candidates) { sum += c.features[j] * c.features[j]; n++; }
  }
  const rms = Math.sqrt(sum / Math.max(1, n));
  scale[j] = rms > 1e-9 ? rms : 1;
}

function logLikelihoodAndGradient(data: Row[], w: number[]): { ll: number; grad: number[] } {
  const grad = new Array<number>(D).fill(0);
  let ll = 0;
  for (const row of data) {
    const utilities = row.candidates.map((c) => {
      let u = 0;
      for (let j = 0; j < D; j++) u += w[j] * (c.features[j] / scale[j]);
      return u;
    });
    const max = Math.max(...utilities);
    let denom = 0;
    for (const u of utilities) denom += Math.exp(u - max);
    ll += utilities[row.chosenIndex] - max - Math.log(denom);

    for (let k = 0; k < row.candidates.length; k++) {
      const p = Math.exp(utilities[k] - max) / denom;
      const indicator = k === row.chosenIndex ? 1 : 0;
      for (let j = 0; j < D; j++) {
        grad[j] += (indicator - p) * (row.candidates[k].features[j] / scale[j]);
      }
    }
  }
  for (let j = 0; j < D; j++) {
    ll -= (l2 / 2) * w[j] * w[j];
    grad[j] -= l2 * w[j];
  }
  return { ll, grad };
}

// --- Optimise (Adam) --------------------------------------------------------
const w = new Array<number>(D).fill(0);
const m = new Array<number>(D).fill(0);
const v = new Array<number>(D).fill(0);
const beta1 = 0.9, beta2 = 0.999, eps = 1e-8;
let lastLl = -Infinity;
for (let t = 1; t <= iterations; t++) {
  const { ll, grad } = logLikelihoodAndGradient(train, w);
  for (let j = 0; j < D; j++) {
    m[j] = beta1 * m[j] + (1 - beta1) * grad[j];
    v[j] = beta2 * v[j] + (1 - beta2) * grad[j] * grad[j];
    const mHat = m[j] / (1 - Math.pow(beta1, t));
    const vHat = v[j] / (1 - Math.pow(beta2, t));
    w[j] += learningRate * mHat / (Math.sqrt(vHat) + eps);
  }
  if (t % 100 === 0) console.log(`  iter ${t}: log-likelihood ${ll.toFixed(1)}`);
  lastLl = ll;
}

// --- Evaluate ---------------------------------------------------------------
function accuracy(data: Row[], weights: number[]): { top1: number; top3: number; chance: number } {
  let top1 = 0, top3 = 0, chance = 0;
  for (const row of data) {
    const scored = row.candidates.map((c, k) => {
      let u = 0;
      for (let j = 0; j < D; j++) u += weights[j] * (c.features[j] / scale[j]);
      return { k, u };
    });
    scored.sort((a, b) => b.u - a.u);
    const rank = scored.findIndex((s) => s.k === row.chosenIndex);
    if (rank === 0) top1++;
    if (rank < 3) top3++;
    chance += 1 / row.candidates.length;
  }
  const n = Math.max(1, data.length);
  return { top1: top1 / n, top3: top3 / n, chance: chance / n };
}

// --- Dead-feature diagnostic ------------------------------------------------
// A feature that never VARIES inside a decision's legal set cancels exactly out
// of the softmax, so it can never be fitted and its coefficient will sit at
// whatever L2 pulls it to. That is not a bug in the optimiser — it is the
// conditional-logit contract — but it is invisible in the coefficient table
// (the value is simply small), so it gets reported explicitly. A feature listed
// here is either mis-specified (a board property that should be interacted with
// the action) or absent from this data set entirely.
const variesInSomeSet = new Array<number>(D).fill(0);
const nonZeroSomewhere = new Array<number>(D).fill(0);
for (const row of rows) {
  for (let j = 0; j < D; j++) {
    let min = Infinity, max = -Infinity, seen = false;
    for (const c of row.candidates) {
      const x = c.features[j];
      if (x < min) min = x;
      if (x > max) max = x;
      if (Math.abs(x) > 1e-12) seen = true;
    }
    if (max - min > 1e-12) variesInSomeSet[j] += 1;
    if (seen) nonZeroSomewhere[j] += 1;
  }
}

const trainAcc = accuracy(train, w);
const testAcc = accuracy(test, w);

// Unscale so the shipped vector applies to RAW features — the runtime must not
// have to carry the training set's scaling around with it.
const shipped = w.map((wj, j) => wj / scale[j]);

console.log('');
console.log(`rows: ${rows.length} (${train.length} train / ${test.length} test, split by match)`);
console.log(`matches: ${matchIds.length} (${testMatches.size} held out)`);
console.log(`sources: ${JSON.stringify(sourceCounts)}`);
console.log(`final penalised log-likelihood: ${lastLl.toFixed(1)}`);
console.log('');
console.log('                    train     test');
console.log(`top-1 accuracy   ${(trainAcc.top1 * 100).toFixed(1).padStart(7)}% ${(testAcc.top1 * 100).toFixed(1).padStart(7)}%`);
console.log(`top-3 accuracy   ${(trainAcc.top3 * 100).toFixed(1).padStart(7)}% ${(testAcc.top3 * 100).toFixed(1).padStart(7)}%`);
console.log(`random baseline  ${(trainAcc.chance * 100).toFixed(1).padStart(7)}% ${(testAcc.chance * 100).toFixed(1).padStart(7)}%`);
console.log('');
console.log('coefficient (positive = attracts the player toward this action)');
const ordered = ACTION_FEATURE_KEYS
  .map((key, j) => ({ key, value: shipped[j], standardised: w[j] }))
  .sort((a, b) => Math.abs(b.standardised) - Math.abs(a.standardised));
for (const { key, value, standardised } of ordered) {
  console.log(`  ${key.padEnd(26)} ${value.toFixed(4).padStart(11)}   (standardised ${standardised.toFixed(3)})`);
}

const dead = ACTION_FEATURE_KEYS
  .map((key, j) => ({ key, varies: variesInSomeSet[j], present: nonZeroSomewhere[j] }))
  .filter((d) => d.varies === 0);
if (dead.length > 0) {
  console.log('');
  console.log('UNFITTABLE FEATURES (never varied within any decision set):');
  for (const d of dead) {
    console.log(
      `  ${d.key.padEnd(26)} ${d.present === 0
        ? 'never non-zero in this data — the feature did not occur'
        : `non-zero in ${d.present} rows but identical across every candidate — interact it with the action`}`,
    );
  }
}

const humanRows = sourceCounts['online'] ?? 0;
if (humanRows < rows.length / 2) {
  console.log('');
  console.log('*** WARNING: this fit is mostly NOT human play. ***');
  console.log(`    online (human vs human) rows: ${humanRows} of ${rows.length}.`);
  console.log('    Self-play rows teach the model to predict the CPU, which it already is.');
  console.log('    Treat the numbers above as a pipeline check, NOT as evidence of improvement.');
}

mkdirSync(dirname(resolve(outFile)) || '.', { recursive: true });
writeFileSync(
  resolve(outFile),
  JSON.stringify(
    {
      // Recorded so the loader can refuse a vector fitted against a different
      // feature list rather than silently misapplying it.
      featureKeys: ACTION_FEATURE_KEYS,
      weights: shipped,
      fittedAt: new Date().toISOString(),
      rows: rows.length,
      matches: matchIds.length,
      sources: sourceCounts,
      heldOutTop1: testAcc.top1,
      heldOutTop3: testAcc.top3,
      heldOutChance: testAcc.chance,
    },
    null,
    2,
  ) + '\n',
  'utf8',
);
console.log('');
console.log(`written: ${resolve(outFile)}`);
