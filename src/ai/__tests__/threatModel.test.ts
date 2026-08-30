/**
 * The threat model stands in for a full opponent-turn simulation at lookahead
 * leaves. These tests pin the properties that make it safe to substitute —
 * not its accuracy, which is a measurement (see fitThreatModel.ts), but its
 * SHAPE: it must be off by default, and it must move in the right direction.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import { estimateOpponentThreat, DEFAULT_THREAT_MODEL } from '../evaluation/threatModel';
import { THREAT_FEATURE_KEYS, extractThreatFeatures } from '../evaluation/threatFeatures';
import { DEFAULT_EVALUATOR_WEIGHTS } from '../evaluation/weights';
import type { GameState } from '../../engine/state/game';

const lifeCard = makeCharacterDef({ cardNumber: 'LIFE', baseCost: 0, basePower: 1000 });

function board(ownLife: number, opponentAttackers: number) {
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
  if (ownLife > 0) rig = putLifeCards(rig, 'p1', Array.from({ length: ownLife }, () => lifeCard)).rig;
  rig = putLifeCards(rig, 'p2', [lifeCard, lifeCard, lifeCard, lifeCard]).rig;
  for (let i = 0; i < opponentAttackers; i++) {
    rig = putCharacterInPlay(rig, 'p2', makeCharacterDef({
      cardNumber: `THREAT-${i}`, baseCost: 5, basePower: 8000,
    }), { summoningSick: false }).rig;
  }
  const state: GameState = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
  return { state, defs: rig.defs };
}

describe('threat model', () => {
  it('is not used unless a weight set turns it on', () => {
    // The shipped default must keep simulating. Silently swapping an
    // approximation in for the real projection would invalidate every arena
    // comparison made against "baseline".
    expect(DEFAULT_EVALUATOR_WEIGHTS.useThreatModel).toBeUndefined();
  });

  it('was fitted on the feature list it is being fed', () => {
    // A model whose coefficients came from a different feature order would
    // produce confident nonsense rather than an obvious error.
    expect(DEFAULT_THREAT_MODEL.featureKeys).toEqual(THREAT_FEATURE_KEYS);
    expect(DEFAULT_THREAT_MODEL.lethalWeights).toHaveLength(THREAT_FEATURE_KEYS.length);
    expect(DEFAULT_THREAT_MODEL.ordinaryWeights).toHaveLength(THREAT_FEATURE_KEYS.length);
    expect(DEFAULT_THREAT_MODEL.mean).toHaveLength(THREAT_FEATURE_KEYS.length);
    expect(DEFAULT_THREAT_MODEL.sd).toHaveLength(THREAT_FEATURE_KEYS.length);
  });

  it('treats a lethal delta as the terminal loss it is', () => {
    // The classifier's positive class stands for "the opponent's turn ends the
    // game", so its magnitude has to be a terminal score, not a large-ish number.
    expect(DEFAULT_THREAT_MODEL.lethalMagnitude).toBeLessThan(-100_000);
  });

  it('reads more danger at one Life than at five, on the same board', () => {
    const safe = board(5, 2);
    const desperate = board(1, 2);
    const safeEstimate = estimateOpponentThreat(safe.state, 'p1', safe.defs);
    const desperateEstimate = estimateOpponentThreat(desperate.state, 'p1', desperate.defs);

    expect(desperateEstimate.lethalProbability).toBeGreaterThan(safeEstimate.lethalProbability);
    expect(desperateEstimate.delta).toBeLessThan(safeEstimate.delta);
  });

  it('reads more danger as the opponent adds attackers', () => {
    const few = board(2, 1);
    const many = board(2, 4);
    expect(estimateOpponentThreat(many.state, 'p1', many.defs).lethalProbability)
      .toBeGreaterThan(estimateOpponentThreat(few.state, 'p1', few.defs).lethalProbability);
  });

  it('returns a finite, bounded estimate on an empty board', () => {
    const empty = board(5, 0);
    const estimate = estimateOpponentThreat(empty.state, 'p1', empty.defs);
    expect(Number.isFinite(estimate.delta)).toBe(true);
    expect(estimate.lethalProbability).toBeGreaterThanOrEqual(0);
    expect(estimate.lethalProbability).toBeLessThanOrEqual(1);
  });

  it('extracts every declared feature as a finite number', () => {
    const { state, defs } = board(3, 2);
    const features = extractThreatFeatures(state, 'p1', defs);
    for (const key of THREAT_FEATURE_KEYS) {
      expect(Number.isFinite(features[key])).toBe(true);
    }
  });
});
