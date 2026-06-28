import { describe, expect, it } from 'vitest';
import { validateActivateCounterCharacter, executeActivateCounterCharacter } from '../activateCounterCharacter';
import type { ActivateCounterCharacterAction } from '../../../actions/action';
import type { BattleState } from '../../../state/game';
import { buildBaseRig, putInHand, putCharacterInPlay, makeCharacterDef, nextTestId } from '../../shared/__tests__/testRig';

function activateCounterCharacter(playerId: string, handCardInstanceId: string, boostTargetInstanceId: string): ActivateCounterCharacterAction {
  return { type: 'ACTIVATE_COUNTER_CHARACTER', actionId: nextTestId('action'), playerId, handCardInstanceId, boostTargetInstanceId };
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

describe('validateActivateCounterCharacter', () => {
  it('rejects when there is no Battle in progress', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p2', makeCharacterDef({ counter: 1000 }));
    const leaderId = rig.state.players.p2.leaderInstanceId;
    expect(validateActivateCounterCharacter(rig.state, activateCounterCharacter('p2', handId, leaderId), rig.defs).legal).toBe(false);
  });

  it('rejects outside the Counter Step', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p2', makeCharacterDef({ counter: 1000 }));
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('block') };
    expect(validateActivateCounterCharacter(battling, activateCounterCharacter('p2', handId, leaderId), rig.defs).legal).toBe(false);
  });

  it('rejects the attacking player', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p1', makeCharacterDef({ counter: 1000 }));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('counter') };
    expect(validateActivateCounterCharacter(battling, activateCounterCharacter('p1', handId, leaderId), rig.defs).legal).toBe(false);
  });

  it('rejects a hand card with no printed Counter value', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p2', makeCharacterDef({ counter: undefined }));
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('counter') };
    expect(validateActivateCounterCharacter(battling, activateCounterCharacter('p2', handId, leaderId), rig.defs).legal).toBe(false);
  });

  it('rejects a boost target that is not the defending player\'s own card', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p2', makeCharacterDef({ counter: 1000 }));
    const attackerLeaderId = rig.state.players.p1.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('counter') };
    expect(validateActivateCounterCharacter(battling, activateCounterCharacter('p2', handId, attackerLeaderId), rig.defs).legal).toBe(false);
  });

  it('accepts a well-formed Counter Character activation', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p2', makeCharacterDef({ counter: 1000 }));
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('counter') };
    expect(validateActivateCounterCharacter(battling, activateCounterCharacter('p2', handId, leaderId), rig.defs).legal).toBe(true);
  });
});

describe('executeActivateCounterCharacter', () => {
  it('trashes the hand card and adds its Counter value to battlePowerBonuses for the boost target', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: handId } = putInHand(base, 'p2', makeCharacterDef({ counter: 1000 }));
    const leaderId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt('counter') };

    const result = executeActivateCounterCharacter(battling, activateCounterCharacter('p2', handId, leaderId), rig.defs);

    expect(result.state.cardsById[handId].currentZone).toBe('trash');
    expect(result.state.players.p2.hand.cardIds).not.toContain(handId);
    expect(result.state.players.p2.trash.cardIds).toContain(handId);
    expect(result.state.currentBattle?.battlePowerBonuses[leaderId]).toBe(1000);
    expect(result.log.some((e) => e.type === 'COUNTER_ACTIVATED')).toBe(true);
  });

  it('stacks additively across repeated activations', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig: rigA, instanceId: handIdA } = putInHand(base, 'p2', makeCharacterDef({ counter: 1000 }));
    const { rig: rigB, instanceId: handIdB } = putInHand(rigA, 'p2', makeCharacterDef({ counter: 2000 }));
    const leaderId = rigB.state.players.p2.leaderInstanceId;
    const battling = { ...rigB.state, currentBattle: battleAt('counter') };

    const afterFirst = executeActivateCounterCharacter(battling, activateCounterCharacter('p2', handIdA, leaderId), rigB.defs);
    const afterSecond = executeActivateCounterCharacter(afterFirst.state, activateCounterCharacter('p2', handIdB, leaderId), rigB.defs);

    expect(afterSecond.state.currentBattle?.battlePowerBonuses[leaderId]).toBe(3000);
  });
});
