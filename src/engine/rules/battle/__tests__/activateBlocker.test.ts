import { describe, expect, it } from 'vitest';
import { validateActivateBlocker, executeActivateBlocker } from '../activateBlocker';
import type { ActivateBlockerAction } from '../../../actions/action';
import type { BattleState } from '../../../state/game';
import { buildBaseRig, putCharacterInPlay, makeCharacterDef, nextTestId } from '../../shared/__tests__/testRig';

function activateBlocker(playerId: string, blockerInstanceId: string): ActivateBlockerAction {
  return { type: 'ACTIVATE_BLOCKER', actionId: nextTestId('action'), playerId, blockerInstanceId };
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

describe('validateActivateBlocker', () => {
  it('rejects when there is no Battle in progress', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    expect(validateActivateBlocker(rig.state, activateBlocker('p2', blockerId), rig.defs).legal).toBe(false);
  });

  it('rejects outside the Block Step', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    const battling = { ...rig.state, currentBattle: battleAt('counter') };
    expect(validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs).legal).toBe(false);
  });

  it('rejects a second Blocker activation in the same battle', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    const battling = { ...rig.state, currentBattle: battleAt('block', { blockerUsed: true }) };
    expect(validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs).legal).toBe(false);
  });

  it('rejects the attacking player attempting to activate a Blocker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p1', makeCharacterDef({ hasBlocker: true }));
    const battling = { ...rig.state, currentBattle: battleAt('block') };
    expect(validateActivateBlocker(battling, activateBlocker('p1', blockerId), rig.defs).legal).toBe(false);
  });

  it('rejects a Character without [Blocker]', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: false }));
    const battling = { ...rig.state, currentBattle: battleAt('block') };
    expect(validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs).legal).toBe(false);
  });

  it('rejects a rested Blocker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }), { orientation: 'rested' });
    const battling = { ...rig.state, currentBattle: battleAt('block') };
    expect(validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs).legal).toBe(false);
  });

  it('accepts a valid Blocker activation', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    const battling = { ...rig.state, currentBattle: battleAt('block') };
    expect(validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs).legal).toBe(true);
  });

  it('rejects blockers when a continuous restriction applies to the attacker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    const battling = {
      ...rig.state,
      currentBattle: battleAt('block'),
      continuousEffects: [
        {
          id: 'ce-blockers-off',
          sourceInstanceId: 'source-x',
          ownerId: 'p1',
          duration: 'duringThisBattle' as const,
          description: 'cannot activate Blocker',
          blockerRestriction: { appliesToAttackerInstanceId: 'attacker-x' },
        },
      ],
    };

    const result = validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs);

    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('blocker restriction');
  });

  it('only rejects blockers matching a blocker-power restriction', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    let rig = base;
    let smallBlockerId: string;
    let largeBlockerId: string;
    ({ rig, instanceId: smallBlockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, basePower: 4000 })));
    ({ rig, instanceId: largeBlockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, basePower: 5000 })));
    const battling = {
      ...rig.state,
      currentBattle: battleAt('block'),
      continuousEffects: [
        {
          id: 'ce-large-blockers-off',
          sourceInstanceId: 'source-x',
          ownerId: 'p1',
          duration: 'duringThisBattle' as const,
          description: 'large blockers cannot activate',
          blockerRestriction: { appliesToAttackerInstanceId: 'attacker-x', blockerPowerAtLeast: 5000 },
        },
      ],
    };

    expect(validateActivateBlocker(battling, activateBlocker('p2', smallBlockerId), rig.defs).legal).toBe(true);
    expect(validateActivateBlocker(battling, activateBlocker('p2', largeBlockerId), rig.defs).legal).toBe(false);
  });

  it('only rejects blockers at or below a maximum power restriction', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    let rig = base;
    let smallBlockerId: string;
    let largeBlockerId: string;
    ({ rig, instanceId: smallBlockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, basePower: 2000 })));
    ({ rig, instanceId: largeBlockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, basePower: 3000 })));
    const battling = {
      ...rig.state,
      currentBattle: battleAt('block'),
      continuousEffects: [
        {
          id: 'ce-small-blockers-off',
          sourceInstanceId: 'source-x',
          ownerId: 'p1',
          duration: 'duringThisBattle' as const,
          description: 'small blockers cannot activate',
          blockerRestriction: { appliesToAttackerInstanceId: 'attacker-x', blockerPowerAtMost: 2000 },
        },
      ],
    };

    expect(validateActivateBlocker(battling, activateBlocker('p2', smallBlockerId), rig.defs).legal).toBe(false);
    expect(validateActivateBlocker(battling, activateBlocker('p2', largeBlockerId), rig.defs).legal).toBe(true);
  });

  it('only rejects blockers at or below a maximum cost restriction', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    let rig = base;
    let cheapBlockerId: string;
    let expensiveBlockerId: string;
    ({ rig, instanceId: cheapBlockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, baseCost: 5 })));
    ({ rig, instanceId: expensiveBlockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, baseCost: 6 })));
    const battling = {
      ...rig.state,
      currentBattle: battleAt('block'),
      continuousEffects: [
        {
          id: 'ce-cheap-blockers-off',
          sourceInstanceId: 'source-x',
          ownerId: 'p1',
          duration: 'duringThisBattle' as const,
          description: 'cheap blockers cannot activate',
          blockerRestriction: { appliesToAttackerInstanceId: 'attacker-x', blockerMaxCost: 5 },
        },
      ],
    };

    expect(validateActivateBlocker(battling, activateBlocker('p2', cheapBlockerId), rig.defs).legal).toBe(false);
    expect(validateActivateBlocker(battling, activateBlocker('p2', expensiveBlockerId), rig.defs).legal).toBe(true);
  });

  it('rejects [Blocker] activation on a Character with a direct suppression record', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    let rig = base;
    let blockerId: string;
    ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ hasBlocker: true, basePower: 3000 })));
    const battling = {
      ...rig.state,
      currentBattle: battleAt('block'),
      continuousEffects: [
        {
          id: 'ce-suppress-blocker',
          sourceInstanceId: 'source-x',
          ownerId: 'p1',
          duration: 'duringThisTurn' as const,
          description: 'cannot activate Blocker',
          blockerRestriction: { appliesToBlockerInstanceId: blockerId },
        },
      ],
    };

    const result = validateActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('blocker restriction');
  });
});

describe('executeActivateBlocker', () => {
  it('rests the blocker and re-targets the Battle onto it, advancing to the Counter Step', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: blockerId } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    const battle = battleAt('block', { targetInstanceId: opponentLeaderId, originalTargetInstanceId: opponentLeaderId });
    const battling = { ...rig.state, currentBattle: battle };

    const result = executeActivateBlocker(battling, activateBlocker('p2', blockerId), rig.defs);

    expect(result.state.cardsById[blockerId].orientation).toBe('rested');
    expect(result.state.currentBattle).toMatchObject({
      targetInstanceId: blockerId,
      blockerUsed: true,
      step: 'counter',
      originalTargetInstanceId: opponentLeaderId,
    });
    expect(result.log.some((e) => e.type === 'BLOCKER_ACTIVATED')).toBe(true);
  });
});
