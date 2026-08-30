/**
 * Fit a cheap stand-in for `projectOpponentTurn`.
 *
 *   npx tsx scripts/ai-sim/fitThreatModel.ts --games=25 --out=threat-model.json
 *
 * WHY THIS TARGET AND NOT GAME OUTCOMES
 * Stage 1 fitted weights to "did this seat win" and produced a model that
 * predicted well (72.9%) and played no better, because features that merely
 * CORRELATE with winning earn large coefficients and an agent can then preserve
 * them instead of acting on them. Here the target is not an outcome at all — it
 * is the number the expensive simulation already returns. That makes this plain
 * function approximation: there is a right answer for every input, labels are
 * unlimited, and no confounding is possible because we are copying a function
 * rather than inferring a cause.
 *
 * The quantity being copied is the UTILITY DELTA the projection applies at a
 * leaf (`evaluateState(after opponent's turn) - evaluateState(now)`), because
 * that delta is precisely and only what `applyPessimisticUtility` consumes.
 *
 * TRAIN WHERE IT WILL BE USED
 * Labels are taken from SIMULATED LEAF states — the position after a candidate
 * action has been applied — not from the game positions the match actually
 * passed through. Those are different distributions: a leaf is mid-line, often
 * with an attack already declared or DON!! already committed, and a model
 * fitted on ordinary turn-start positions is being asked about states it never
 * saw. The first version of this script sampled game positions and agreed with
 * the real projection only 90.2%% of the time, worse than the trivial baseline
 * of omitting the term entirely.
 *
 * TWO HEADS, BECAUSE THE TARGET IS BIMODAL
 * Measured over 1,028 positions, the delta is not one distribution:
 *
 *   14.7%  delta ~ -1,000,181   the opponent's turn KILLS us (terminal score)
 *   85.3%  mean 0.0, sd 45.6    ordinary attrition, range [-146, +156]
 *
 * One regression across six orders of magnitude fits only the death spikes and
 * ignores the other 85% entirely — it scores a respectable R² while being
 * useless at the thing it is asked most often. So the model is split: a
 * classifier for "does this kill me" and a regressor for the ordinary case,
 * recombined as an expectation.
 *
 * That split is also the finding: since ordinary deltas are tiny (sd 46) next
 * to typical utilities (~150-250), almost ALL of the projection's value is
 * lethal detection. Which explains Stage 2 exactly — dropping the projection
 * blinded the CPU to incoming lethal, and that costs most in the grindy control
 * matchups where games are decided at low Life.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDeckFor, buildRig, createActionId, dispatch, loadCatalog, type HarnessOptions } from './harness';
import { chooseAction } from '../../src/ai';
import { generateLegalActions } from '../../src/ai/utilities/legalActions';
import { getActingPlayerId } from '../../src/board/projection';
import { buildStrategicContext, evaluateState } from '../../src/ai/evaluation/stateEvaluator';
import { projectOpponentTurn } from '../../src/ai/planning/opponentTurnSimulator';
import { simulateAction } from '../../src/ai/planning/stateSimulator';
import {
  extractThreatFeatures,
  threatFeaturesToVector,
  THREAT_FEATURE_KEYS,
} from '../../src/ai/evaluation/threatFeatures';
import { TUNING_LEADERS } from './arena';
import type { CpuDifficulty } from '../../src/ai';

const gameCount = Number(process.argv.find((a) => a.startsWith('--games='))?.split('=')[1] ?? '25');
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'normal') as CpuDifficulty;
const outFile = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'threat-model.json';

interface Sample { game: number; x: number[]; y: number }

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const decks = TUNING_LEADERS.map((n) => {
  const leader = byNum.get(n)!;
  return { leader, deck: buildDeckFor(leader, catalog) };
});

console.log(`sampling ${gameCount} games for (features -> projection delta) pairs...`);
const samples: Sample[] = [];

for (let g = 0; g < gameCount; g++) {
  const a = decks[g % decks.length];
  const b = decks[(g + 1) % decks.length];
  const opts: HarnessOptions = { mode: 'v1', difficulty, seed: `threat-${g}`, maxActions: 1200, deadlineMs: 20_000 };
  const rig = buildRig(a.leader, a.deck, b.leader, b.deck, opts);

  let guard = 0;
  while (guard++ < 400 && !rig.state.gameOver) {
    const acting = getActingPlayerId(rig.state);
    const legal = generateLegalActions({
      state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry, createActionId,
    });

    // Label LEAF states: apply a candidate action first, exactly as the
    // lookahead does, then ask the projection about the resulting position.
    if (rig.state.currentPhase === 'main' && !rig.state.currentBattle && legal.length > 1) {
      const strategic = buildStrategicContext(rig.state, acting, rig.defs, rig.registry);
      // A spread of candidates, not just the best one — the lookahead scores
      // losing lines too, and the model has to be right about those as well.
      const stride = Math.max(1, Math.floor(legal.length / 3));
      for (let k = 0; k < legal.length; k += stride) {
        try {
          const sim = simulateAction({
            state: rig.state, action: legal[k], playerId: acting,
            defs: rig.defs, registry: rig.registry, createActionId, strategic,
          });
          if (sim.failed) continue;
          const before = evaluateState(sim.state, acting, rig.defs, rig.registry);
          const projected = projectOpponentTurn(sim.state, acting, rig.defs, rig.registry, createActionId, strategic);
          if (projected.failed) continue;
          const after = evaluateState(projected.state, acting, rig.defs, rig.registry);
          samples.push({
            game: g,
            x: threatFeaturesToVector(extractThreatFeatures(sim.state, acting, rig.defs)),
            y: after - before,
          });
        } catch {
          // a leaf whose projection throws is not a label
        }
      }
    }

    const decision = chooseAction({
      state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry,
      config: { difficulty, seed: opts.seed }, createActionId,
    });
    const action = decision?.action ?? legal[0];
    if (!action || !dispatch(rig, action).ok) break;
  }
}

console.log(`${samples.length} labelled positions`);
if (samples.length < 300) { console.error('not enough data — raise --games'); process.exit(1); }

// A delta this large can only be a terminal score (+/-1,000,000); nothing in
// ordinary play moves utility by more than a few hundred.
const TERMINAL_THRESHOLD = 100_000;

/**
 * Required sign of each lethal-classifier coefficient: +1 must increase danger,
 * -1 must decrease it, 0 unconstrained.
 *
 * These features are heavily collinear — `nextTurnLossRisk` and
 * `projectedLifeDamage` already summarise most of what the raw counts say — and
 * under collinearity an unconstrained fit is free to give a redundant feature
 * the WRONG sign while still predicting the training set well. It did exactly
 * that: the first fit made additional opponent attackers REDUCE the estimated
 * chance of dying.
 *
 * On the training distribution that is harmless bookkeeping. Inside a search it
 * is not: a lookahead leaf is an unusual position by construction, and a model
 * that rewards the opponent having more attackers will steer the CPU toward
 * danger precisely where it is asked to avoid it. Monotonicity in the obvious
 * direction is a correctness property here, not a nicety, so it is imposed
 * rather than hoped for (projected gradient — clamp after each step).
 */
const LETHAL_SIGN: Record<string, number> = {
  ownLife: -1,              // more Life, less likely to die
  projectedLifeDamage: +1,
  incomingAttacks: +1,
  activeBlockers: -1,
  handCounterPower: -1,
  immediateLossRisk: +1,
  nextTurnLossRisk: +1,
  maxThreatPower: +1,
  totalThreatPower: +1,
  ownLeaderPower: -1,       // a bigger Leader survives more attacks
  opponentLife: 0,
  opponentActiveDon: +1,    // DON!! to pump with
  ownCharacters: -1,        // bodies to block or trade with
  isOwnTurn: 0,
};

// Split by GAME: positions inside one game are heavily correlated.
const games = [...new Set(samples.map((s) => s.game))];
const testGames = new Set(games.filter((_, i) => i % 5 === 0));
const train = samples.filter((s) => !testGames.has(s.game));
const test = samples.filter((s) => testGames.has(s.game));

const dim = THREAT_FEATURE_KEYS.length;
const mean = new Array(dim).fill(0);
const sd = new Array(dim).fill(0);
for (const s of train) for (let i = 0; i < dim; i++) mean[i] += s.x[i] / train.length;
for (const s of train) for (let i = 0; i < dim; i++) sd[i] += (s.x[i] - mean[i]) ** 2 / train.length;
for (let i = 0; i < dim; i++) sd[i] = Math.sqrt(sd[i]) || 1;
const standardise = (x: number[]) => x.map((v, i) => (v - mean[i]) / sd[i]);

const isLethal = (s: Sample) => (s.y < -TERMINAL_THRESHOLD ? 1 : 0);
const lethalRate = train.filter((s) => isLethal(s) === 1).length / train.length;
/** Average magnitude of a lethal delta — what the classifier's 1 is worth. */
const lethalMagnitude =
  train.filter(isLethal).reduce((sum, s) => sum + s.y, 0) / Math.max(1, train.filter(isLethal).length);
console.log(`\nlethal positions: ${(lethalRate * 100).toFixed(1)}% of train, mean delta ${lethalMagnitude.toFixed(0)}`);

// --- head 1: does the opponent's turn kill us? -----------------------------
const clsW = new Array(dim).fill(0);
let clsBias = 0;
const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
for (let epoch = 0; epoch < 500; epoch++) {
  const gw = new Array(dim).fill(0);
  let gb = 0;
  for (const s of train) {
    const xs = standardise(s.x);
    let z = clsBias;
    for (let i = 0; i < dim; i++) z += clsW[i] * xs[i];
    const err = sigmoid(z) - isLethal(s);
    for (let i = 0; i < dim; i++) gw[i] += (err * xs[i]) / train.length;
    gb += err / train.length;
  }
  for (let i = 0; i < dim; i++) {
    clsW[i] -= 0.3 * (gw[i] + 1e-3 * clsW[i]);
    // Projected gradient: clamp back into the admissible half-space.
    const sign = LETHAL_SIGN[THREAT_FEATURE_KEYS[i]] ?? 0;
    if (sign > 0 && clsW[i] < 0) clsW[i] = 0;
    if (sign < 0 && clsW[i] > 0) clsW[i] = 0;
  }
  clsBias -= 0.3 * gb;
}
const pLethal = (x: number[]) => {
  const xs = standardise(x);
  let z = clsBias;
  for (let i = 0; i < dim; i++) z += clsW[i] * xs[i];
  return sigmoid(z);
};

// --- head 2: the ordinary delta, fitted on non-lethal positions only -------
const ordinary = train.filter((s) => isLethal(s) === 0);
const yMean = ordinary.reduce((sum, s) => sum + s.y, 0) / Math.max(1, ordinary.length);
const ySd = Math.sqrt(ordinary.reduce((sum, s) => sum + (s.y - yMean) ** 2, 0) / Math.max(1, ordinary.length)) || 1;
const regW = new Array(dim).fill(0);
let regBias = 0;
for (let epoch = 0; epoch < 600; epoch++) {
  const gw = new Array(dim).fill(0);
  let gb = 0;
  for (const s of ordinary) {
    const xs = standardise(s.x);
    let pred = regBias;
    for (let i = 0; i < dim; i++) pred += regW[i] * xs[i];
    const err = pred - (s.y - yMean) / ySd;
    for (let i = 0; i < dim; i++) gw[i] += (err * xs[i]) / ordinary.length;
    gb += err / ordinary.length;
  }
  for (let i = 0; i < dim; i++) regW[i] -= 0.2 * (gw[i] + 1e-3 * regW[i]);
  regBias -= 0.2 * gb;
}
const ordinaryDelta = (x: number[]) => {
  const xs = standardise(x);
  let z = regBias;
  for (let i = 0; i < dim; i++) z += regW[i] * xs[i];
  return z * ySd + yMean;
};

/** Expectation over the two heads — what the leaf will actually use. */
const predict = (x: number[]) => {
  const p = pLethal(x);
  return p * lethalMagnitude + (1 - p) * ordinaryDelta(x);
};

function reportClassifier(label: string, rows: Sample[]) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const r of rows) {
    const pred = pLethal(r.x) >= 0.5 ? 1 : 0;
    const actual = isLethal(r);
    if (pred === 1 && actual === 1) tp++;
    else if (pred === 1) fp++;
    else if (actual === 1) fn++;
    else tn++;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  console.log(
    `${label} lethal-detection: precision ${(precision * 100).toFixed(1)}%  recall ${(recall * 100).toFixed(1)}%  ` +
    `(${tp} caught, ${fn} MISSED, ${fp} false alarms of ${rows.length})`,
  );
  return recall;
}

function reportRegressor(label: string, rows: Sample[]) {
  const nonLethal = rows.filter((r) => isLethal(r) === 0);
  if (nonLethal.length === 0) return 0;
  const mu = nonLethal.reduce((s, r) => s + r.y, 0) / nonLethal.length;
  let ssRes = 0, ssTot = 0, absErr = 0;
  for (const r of nonLethal) {
    const p = ordinaryDelta(r.x);
    ssRes += (r.y - p) ** 2;
    ssTot += (r.y - mu) ** 2;
    absErr += Math.abs(r.y - p);
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  console.log(`${label} ordinary delta:   R² ${r2.toFixed(3)}  MAE ${(absErr / nonLethal.length).toFixed(1)}  (sd ${Math.sqrt(ssTot / nonLethal.length).toFixed(1)}, ${nonLethal.length} rows)`);
  return r2;
}

console.log('');
reportClassifier('train', train);
reportRegressor('train', train);
console.log('');
const testRecall = reportClassifier('test ', test);
const testR2 = reportRegressor('test ', test);

console.log('\nfeature                 lethal-classifier   ordinary-delta   required sign');
for (const [i, key] of THREAT_FEATURE_KEYS.entries()) {
  const sign = LETHAL_SIGN[key] ?? 0;
  console.log(
    `  ${key.padEnd(22)} ${clsW[i].toFixed(3).padStart(10)} ${regW[i].toFixed(3).padStart(16)}` +
    `   ${sign > 0 ? 'danger+' : sign < 0 ? 'safety-' : '  -    '}`,
  );
}

writeFileSync(resolve(outFile), JSON.stringify({
  featureKeys: THREAT_FEATURE_KEYS,
  mean, sd,
  lethalWeights: clsW, lethalBias: clsBias, lethalMagnitude,
  ordinaryWeights: regW, ordinaryBias: regBias, yMean, ySd,
  testRecall, testR2, trainRows: train.length, testRows: test.length,
}, null, 2));
console.log(`\nwritten to ${resolve(outFile)}`);

// The gate is RECALL, not R². A missed lethal is the CPU walking into a loss it
// could have seen; a mispriced ordinary delta costs a few utility points.
if (testRecall < 0.8) {
  console.log(`\nrecall ${(testRecall * 100).toFixed(1)}% is too low to wire in — every miss is a game the CPU walks into losing. Add features or keep the projection.`);
} else {
  console.log(`\nrecall ${(testRecall * 100).toFixed(1)}% — worth validating in the arena. Agreement and held-out win rate still decide.`);
}
