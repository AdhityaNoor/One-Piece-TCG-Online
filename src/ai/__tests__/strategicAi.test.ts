import { describe, expect, it } from 'vitest';
import { buildCardStrategicProfile } from '../analysis/cardStrategicProfile';
import { analyzeLeaderStrategy } from '../strategy/leaderStrategyAnalyzer';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { evaluateMatchObjective, terminalStateScore } from '../evaluation/matchObjective';
import { selectStrategicMode } from '../strategy/strategicModeSelector';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { OP09_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/OP09';

describe('strategic AI layers', () => {
  it('terminal state dominates evaluation', () => {
    const leader = makeCharacterDef({ cardNumber: 'L-1' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    rig = putCharacterInPlay(rig, 'p1', { ...leader, category: 'leader' }).rig;
    const state = {
      ...rig.state,
      gameOver: { winnerId: 'p1', reason: 'lifeDamageAtZero' as const },
    };
    expect(terminalStateScore(state, 'p1')).toBeGreaterThan(0);
    expect(terminalStateScore(state, 'p2')).toBeLessThan(0);
    const objective = evaluateMatchObjective(state, 'p1', rig.defs, {});
    expect(objective.utility).toBeGreaterThan(100_000);
  });

  it('builds strategic profile from curated effect IR', () => {
    const registry = buildRegistryFromAssignments(OP09_ASSIGNMENTS);
    const koCard = Object.keys(registry).find((id) => id.includes('OP09-009'));
    expect(koCard).toBeTruthy();
    if (!koCard) return;

    const profile = buildCardStrategicProfile(koCard, registry);
    expect(profile.removalValue).toBeGreaterThan(0);
    expect(profile.immediateValue + profile.removalValue).toBeGreaterThan(5);
  });

  it('selects lethal_search when lethal pressure is high', () => {
    const leader = makeCharacterDef({ cardNumber: 'L-1', basePower: 12000 });
    const vanilla = makeCharacterDef({ cardNumber: 'C-1', baseCost: 1, basePower: 8000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    rig = putCharacterInPlay(rig, 'p1', { ...leader, category: 'leader' }).rig;
    rig = putCharacterInPlay(rig, 'p1', vanilla).rig;
  rig.state.players.p2.lifeArea.cardIds = ['life-1'];

    const leaderProfile = analyzeLeaderStrategy(rig.state, 'p1', rig.defs, {});
    const mode = selectStrategicMode(rig.state, 'p1', rig.defs, {}, leaderProfile);
    expect(['lethal_search', 'pressure']).toContain(mode);
  });

  it('buildStrategicContext wires leader, mode, and objective', () => {
    const leader = makeCharacterDef({ cardNumber: 'L-1', basePower: 5000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    rig = putCharacterInPlay(rig, 'p1', { ...leader, category: 'leader' }).rig;
    const ctx = buildStrategicContext(rig.state, 'p1', rig.defs, {});
    expect(ctx.leader.leaderCardDefinitionId).toBeTruthy();
    expect(ctx.mode).toBeTruthy();
    expect(typeof ctx.objective.utility).toBe('number');
    expect(ctx.modeWeights.lethal).toBeGreaterThan(0);
    expect(['early', 'mid', 'late']).toContain(ctx.gamePhase);
  });
});
