import { describe, expect, it } from 'vitest';
import { validatePassStep, executePassStep } from '../passStep';
import type { PassStepAction } from '../../../actions/action';
import type { BattleState } from '../../../state/game';
import { buildBaseRig, putLifeCards, makeCharacterDef, nextTestId } from '../../shared/__tests__/testRig';

function passStep(playerId: string): PassStepAction {
  return { type: 'PASS_STEP', actionId: nextTestId('action'), playerId };
}

function battleAt(step: BattleState['step'], overrides: Partial<BattleState> = {}): BattleState {
  return {
    attackerInstanceId: 'attacker-x',
    targetInstanceId: 'target-x',
    originalTargetInstanceId: 'target-x',
    step,
    blockerUsed: false,
    battlePowerBonuses: {},
    ...overrides,
  };
}

describe('validatePassStep', () => {
  it('rejects when there is no Battle in progress', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    expect(validatePassStep(state, passStep('p2'), defs).legal).toBe(false);
  });

  it('rejects during the damage/endOfBattle steps', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const battling = { ...state, currentBattle: battleAt('damage') };
    expect(validatePassStep(battling, passStep('p2'), defs).legal).toBe(false);
  });

  it('rejects the attacking player', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const battling = { ...state, currentBattle: battleAt('block') };
    expect(validatePassStep(battling, passStep('p1'), defs).legal).toBe(false);
  });

  it('accepts the defending player during the Block Step', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const battling = { ...state, currentBattle: battleAt('block') };
    expect(validatePassStep(battling, passStep('p2'), defs).legal).toBe(true);
  });

  it('accepts the defending player during the Counter Step', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const battling = { ...state, currentBattle: battleAt('counter') };
    expect(validatePassStep(battling, passStep('p2'), defs).legal).toBe(true);
  });
});

describe('executePassStep', () => {
  it('advances Block -> Counter with no other state change', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const battling = { ...state, currentBattle: battleAt('block') };

    const result = executePassStep(battling, passStep('p2'), defs);

    expect(result.state.currentBattle).toMatchObject({ ...battleAt('counter') });
    expect(result.log).toHaveLength(1);
    expect(result.log[0].type).toBe('PHASE_CHANGED');
    expect(result.pendingChoices).toHaveLength(0);
  });

  it('passing the Counter Step synchronously resolves Damage + End of Battle', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig } = putLifeCards(base, 'p2', [makeCharacterDef()]);
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('counter', { attackerInstanceId: leaderId, targetInstanceId: opponentLeaderId, originalTargetInstanceId: opponentLeaderId }) };

    const result = executePassStep(battling, passStep('p2'), rig.defs);

    // Battle has been fully resolved and cleared.
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((e) => e.type === 'PHASE_CHANGED')).toBe(true);
    expect(result.log.some((e) => e.type === 'DAMAGE_DEALT')).toBe(true);
    expect(result.pendingChoices).toHaveLength(0);
  });
});
