import { describe, expect, it } from 'vitest';
import { resolveDamageAndEndOfBattle } from '../damageStep';
import type { BattleState } from '../../../state/game';
import {
  buildBaseRig,
  putCharacterInPlay,
  putLifeCards,
  makeCharacterDef,
  makeLeaderDef,
  nextTestId,
} from '../../shared/__tests__/testRig';

function battleAt(attackerInstanceId: string, targetInstanceId: string, overrides: Partial<BattleState> = {}): BattleState {
  return {
    attackerInstanceId,
    targetInstanceId,
    originalTargetInstanceId: targetInstanceId,
    step: 'damage',
    blockerUsed: false,
    battlePowerBonuses: {},
    ...overrides,
  };
}

describe('resolveDamageAndEndOfBattle', () => {
  it('throws when there is no in-progress Battle', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    expect(() => resolveDamageAndEndOfBattle(state, defs, null)).toThrow();
  });

  it('a successful Leader attack deals 1 Life hit, reveals the card to hand, and ends the Battle', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, lifeIds } = putLifeCards(base, 'p2', [makeCharacterDef()]);
    const attackerId = rig.state.players.p1.leaderInstanceId;
    const targetId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt(attackerId, targetId) };

    const result = resolveDamageAndEndOfBattle(battling, rig.defs, 'action-x');

    expect(result.state.players.p2.lifeArea.cardIds).toHaveLength(0);
    expect(result.state.players.p2.hand.cardIds).toContain(lifeIds[0]);
    expect(result.state.cardsById[lifeIds[0]].currentZone).toBe('hand');
    expect(result.state.cardsById[lifeIds[0]].faceState).toBe('faceUp');
    expect(result.state.currentBattle).toBeNull();
    expect(result.state.gameOver).toBeNull();
    expect(result.log.some((e) => e.type === 'DAMAGE_DEALT')).toBe(true);
    expect(result.log.some((e) => e.type === 'PHASE_CHANGED')).toBe(true);
  });

  it('logs TRIGGER_REVEALED (without executing it) when the revealed Life card has [Trigger]', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig } = putLifeCards(base, 'p2', [makeCharacterDef({ hasTrigger: true })]);
    const attackerId = rig.state.players.p1.leaderInstanceId;
    const targetId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt(attackerId, targetId) };

    const result = resolveDamageAndEndOfBattle(battling, rig.defs, 'action-x');

    const triggerLog = result.log.find((e) => e.type === 'TRIGGER_REVEALED');
    expect(triggerLog).toBeDefined();
    expect(triggerLog?.data).toMatchObject({ effectStubbed: true });
  });

  it('[Double Attack] deals 2 Life hits against a Leader target', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1', leaderOverridesP1: { hasDoubleAttack: true } });
    const { rig, lifeIds } = putLifeCards(base, 'p2', [makeCharacterDef(), makeCharacterDef()]);
    const attackerId = rig.state.players.p1.leaderInstanceId;
    const targetId = rig.state.players.p2.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt(attackerId, targetId) };

    const result = resolveDamageAndEndOfBattle(battling, rig.defs, 'action-x');

    expect(result.state.players.p2.lifeArea.cardIds).toHaveLength(0);
    expect(result.state.players.p2.hand.cardIds).toEqual(expect.arrayContaining(lifeIds));
    expect(result.state.gameOver).toBeNull();
  });

  it('a hit against an already-empty Life area ends the game immediately ("decked out on Life")', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const attackerId = base.state.players.p1.leaderInstanceId;
    const targetId = base.state.players.p2.leaderInstanceId;
    const battling = { ...base.state, currentBattle: battleAt(attackerId, targetId) };

    const result = resolveDamageAndEndOfBattle(battling, base.defs, 'action-x');

    expect(result.state.gameOver).toEqual({ winnerId: 'p1', reason: 'lifeDamageAtZero' });
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((e) => e.type === 'GAME_OVER')).toBe(true);
    // No "End of Battle" log once the game has already ended.
    expect(result.log.some((e) => e.type === 'PHASE_CHANGED')).toBe(false);
  });

  it('a successful Character attack K.O.s the target and moves it to trash', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: targetCharId } = putCharacterInPlay(base, 'p2', makeCharacterDef(), { orientation: 'rested', donAttached: ['fake-don-1'] });
    const attackerId = rig.state.players.p1.leaderInstanceId;
    const battling = { ...rig.state, currentBattle: battleAt(attackerId, targetCharId) };

    const result = resolveDamageAndEndOfBattle(battling, rig.defs, 'action-x');

    expect(result.state.cardsById[targetCharId].currentZone).toBe('trash');
    expect(result.state.cardsById[targetCharId].donAttached).toEqual([]);
    expect(result.state.players.p2.characterArea.cardIds).not.toContain(targetCharId);
    expect(result.state.players.p2.trash.cardIds).toContain(targetCharId);
    expect(result.log.some((e) => e.type === 'CHARACTER_KO')).toBe(true);
    expect(result.state.currentBattle).toBeNull();
  });

  it('a failed attack (attacker power < target power) changes nothing but still ends the Battle', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1', leaderOverridesP2: { basePower: 9999 } });
    const attackerId = base.state.players.p1.leaderInstanceId;
    const targetId = base.state.players.p2.leaderInstanceId;
    const lifeBefore = base.state.players.p2.lifeArea.cardIds.length;
    const battling = { ...base.state, currentBattle: battleAt(attackerId, targetId) };

    const result = resolveDamageAndEndOfBattle(battling, base.defs, 'action-x');

    expect(result.state.players.p2.lifeArea.cardIds).toHaveLength(lifeBefore);
    expect(result.state.gameOver).toBeNull();
    expect(result.state.currentBattle).toBeNull();
    expect(result.log.some((e) => e.type === 'DAMAGE_DEALT' && e.data && (e.data as Record<string, unknown>).succeeded === false)).toBe(true);
  });
});
