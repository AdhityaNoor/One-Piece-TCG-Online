import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDon,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import {
  analyzeGamePhase,
  applyPhaseToModeWeights,
  phaseWeightMultipliers,
} from '../strategy/gamePhaseAnalyzer';
import { modeWeights } from '../strategy/strategicModeSelector';

describe('game phase weighting', () => {
  function withLife(rig: ReturnType<typeof buildBaseRig>, playerId: 'p1' | 'p2', count: number) {
    const cards = Array.from({ length: count }, (_, i) =>
      makeCharacterDef({ cardNumber: `LIFE-${playerId}-${i}`, baseCost: 0 }),
    );
    return putLifeCards(rig, playerId, cards).rig;
  }

  it('infers early from high Life, low DON, small board', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 2 });
    rig = withLife(rig, 'p1', 5);
    rig = withLife(rig, 'p2', 5);
    rig = putDon(rig, 'p1', 2).rig;

    const phase = analyzeGamePhase(rig.state, 'p1', rig.defs);
    expect(phase.phase).toBe('early');
    expect(phase.lateFactor).toBeLessThan(0.4);
  });

  it('infers late from low Life and high lethal pressure', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 8 });
    rig = withLife(rig, 'p1', 2);
    rig = withLife(rig, 'p2', 2);
    rig = putDon(rig, 'p1', 8).rig;
    const beater = makeCharacterDef({ cardNumber: 'BEAT', baseCost: 0, basePower: 9000 });
    rig = putCharacterInPlay(rig, 'p1', beater).rig;
    rig = putCharacterInPlay(rig, 'p1', { ...beater, cardDefinitionId: 'BEAT-2', cardNumber: 'BEAT-2' }).rig;

    const phase = analyzeGamePhase(rig.state, 'p1', rig.defs);
    expect(phase.phase).toBe('late');
    expect(phase.lateFactor).toBeGreaterThan(0.5);
  });

  it('early weights favor development/engine over lethal', () => {
    const early = phaseWeightMultipliers('early');
    const late = phaseWeightMultipliers('late');
    expect(early.development).toBeGreaterThan(late.development);
    expect(early.engine).toBeGreaterThan(late.engine);
    expect(late.lethal).toBeGreaterThan(early.lethal);
    expect(late.survival).toBeGreaterThan(early.survival);
  });

  it('applyPhaseToModeWeights scales develop-mode toward setup in early game', () => {
    const base = modeWeights('develop');
    const early = applyPhaseToModeWeights(base, 'early');
    const late = applyPhaseToModeWeights(base, 'late');
    expect(early.development).toBeGreaterThan(late.development);
    expect(late.lethal).toBeGreaterThan(early.lethal);
  });

  it('buildStrategicContext exposes gamePhase and phase-adjusted weights', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 2 });
    rig = withLife(rig, 'p1', 5);
    rig = withLife(rig, 'p2', 5);
    const ctx = buildStrategicContext(rig.state, 'p1', rig.defs, {});
    expect(['early', 'mid', 'late']).toContain(ctx.gamePhase);
    expect(ctx.modeWeights.development).toBeGreaterThan(0);
  });
});
