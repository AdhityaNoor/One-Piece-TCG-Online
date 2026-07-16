import { describe, expect, it } from 'vitest';
import { validateDeclareAttack, executeDeclareAttack } from '../declareAttack';
import type { DeclareAttackAction } from '../../../actions/action';
import type { BattleState } from '../../../state/game';
import { buildBaseRig, putCharacterInPlay, makeCharacterDef, nextTestId } from '../../shared/__tests__/testRig';

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId, attackerInstanceId, targetInstanceId };
}

function fakeBattle(overrides: Partial<BattleState> = {}): BattleState {
  return {
    attackerInstanceId: 'whatever',
    targetInstanceId: 'whatever-2',
    originalTargetInstanceId: 'whatever-2',
    step: 'block',
    blockerUsed: false,
    battlePowerBonuses: {},
    ...overrides,
  };
}

describe('validateDeclareAttack', () => {
  it('rejects outside the Main Phase', () => {
    const { state, defs } = buildBaseRig({ phase: 'don', activePlayerId: 'p1' });
    const leaderId = state.players.p1.leaderInstanceId;
    const opponentLeaderId = state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(state, declareAttack('p1', leaderId, opponentLeaderId), defs).legal).toBe(false);
  });

  it('rejects a non-turn-player', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const leaderId = state.players.p2.leaderInstanceId;
    const opponentLeaderId = state.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(state, declareAttack('p2', leaderId, opponentLeaderId), defs).legal).toBe(false);
  });

  it('rejects when a Battle is already in progress', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const leaderId = state.players.p1.leaderInstanceId;
    const opponentLeaderId = state.players.p2.leaderInstanceId;
    const battling = { ...state, currentBattle: fakeBattle() };
    expect(validateDeclareAttack(battling, declareAttack('p1', leaderId, opponentLeaderId), defs).legal).toBe(false);
  });

  it('rejects on turn 1 or 2 (neither player may battle on their first turn)', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 2 });
    const leaderId = state.players.p1.leaderInstanceId;
    const opponentLeaderId = state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(state, declareAttack('p1', leaderId, opponentLeaderId), defs).legal).toBe(false);
  });

  it('rejects a rested attacker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef(), { orientation: 'rested' });
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(rig.state, declareAttack('p1', charId, opponentLeaderId), rig.defs).legal).toBe(false);
  });

  it('rejects a summoning-sick attacker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef(), { summoningSick: true });
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(rig.state, declareAttack('p1', charId, opponentLeaderId), rig.defs).legal).toBe(false);
  });

  it('rejects an attacker under a card-effect attack restriction (e.g. ST19-001 Smoker)', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef());
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    const state = {
      ...rig.state,
      continuousEffects: [
        { id: 'ce-restrict', sourceInstanceId: 'src', ownerId: 'p2', duration: 'endOfOpponentsTurn' as const, description: 'cannot attack', attackRestriction: { appliesToInstanceId: charId } },
      ],
    };
    expect(validateDeclareAttack(state, declareAttack('p1', charId, opponentLeaderId), rig.defs).legal).toBe(false);
  });

  it('accepts a summoning-sick attacker with a conditional continuous Rush grant when the condition is met', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef(), { summoningSick: true, donAttached: ['don-a', 'don-b'] });
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;
    const state = {
      ...rig.state,
      continuousEffects: [
        {
          id: 'ce-rush',
          sourceInstanceId: charId,
          ownerId: 'p1',
          duration: 'permanent' as const,
          description: 'gains rush',
          keywordModifier: {
            appliesToInstanceId: charId,
            keyword: 'rush' as const,
            condition: { donAttachedAtLeast: 2 },
          },
        },
      ],
    };

    expect(validateDeclareAttack(state, declareAttack('p1', charId, opponentLeaderId), rig.defs).legal).toBe(true);
  });

  it('rejects targeting a card that does not belong to the opponent', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const leaderId = state.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(state, declareAttack('p1', leaderId, leaderId), defs).legal).toBe(false);
  });

  it('rejects targeting an ACTIVE opposing Character', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: opposingCharId } = putCharacterInPlay(base, 'p2', makeCharacterDef(), { orientation: 'active' });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(rig.state, declareAttack('p1', leaderId, opposingCharId), rig.defs).legal).toBe(false);
  });

  it('accepts targeting an ACTIVE opposing Character when the attacker has a "canAttackActive" keyword grant (e.g. OP01-021 Franky)', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig: withAttacker, instanceId: attackerId } = putCharacterInPlay(base, 'p1', makeCharacterDef());
    const { rig, instanceId: opposingCharId } = putCharacterInPlay(withAttacker, 'p2', makeCharacterDef(), { orientation: 'active' });
    const state = {
      ...rig.state,
      continuousEffects: [
        { id: 'ce-can-attack-active', sourceInstanceId: attackerId, ownerId: 'p1', duration: 'duringThisTurn' as const, description: 'can also attack active Characters', keywordModifier: { appliesToInstanceId: attackerId, keyword: 'canAttackActive' as const } },
      ],
    };
    expect(validateDeclareAttack(state, declareAttack('p1', attackerId, opposingCharId), rig.defs).legal).toBe(true);
    // The grant is scoped to the specific attacker instance — a different Character without it still can't.
    const { rig: withSecondAttacker, instanceId: otherAttackerId } = putCharacterInPlay({ state, defs: rig.defs }, 'p1', makeCharacterDef());
    expect(validateDeclareAttack(withSecondAttacker.state, declareAttack('p1', otherAttackerId, opposingCharId), withSecondAttacker.defs).legal).toBe(false);
  });

  it('accepts attacking the opposing Leader', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const leaderId = state.players.p1.leaderInstanceId;
    const opponentLeaderId = state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(state, declareAttack('p1', leaderId, opponentLeaderId), defs).legal).toBe(true);
  });

  it('accepts attacking a RESTED opposing Character', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: opposingCharId } = putCharacterInPlay(base, 'p2', makeCharacterDef(), { orientation: 'rested' });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    expect(validateDeclareAttack(rig.state, declareAttack('p1', leaderId, opposingCharId), rig.defs).legal).toBe(true);
  });
});

describe('executeDeclareAttack', () => {
  it('rests the attacker and opens a Battle at the Block Step for a normal attacker when the defender has a legal Blocker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    // p2 needs a legal Blocker in play, or the new "no legal blocker" skip
    // (below) would take this straight to the Counter Step instead.
    const { rig } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', leaderId, opponentLeaderId), rig.defs);

    expect(result.state.cardsById[leaderId].orientation).toBe('rested');
    expect(result.state.currentBattle).toMatchObject({
      attackerInstanceId: leaderId,
      targetInstanceId: opponentLeaderId,
      originalTargetInstanceId: opponentLeaderId,
      step: 'block',
      blockerUsed: false,
      battlePowerBonuses: {},
    });
    expect(result.log.some((e) => e.type === 'ATTACK_DECLARED')).toBe(true);
  });

  it('skips straight to the Counter Step for an [Unblockable] attacker', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: charId } = putCharacterInPlay(base, 'p1', makeCharacterDef({ isUnblockable: true }));
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', charId, opponentLeaderId), rig.defs);

    expect(result.state.currentBattle?.step).toBe('counter');
    expect(result.log.some((e) => e.type === 'PHASE_CHANGED')).toBe(true);
  });

  it('skips straight to the Counter Step when the defending player has no legal Blocker (e.g. Leader-only field)', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const leaderId = state.players.p1.leaderInstanceId;
    const opponentLeaderId = state.players.p2.leaderInstanceId;

    const result = executeDeclareAttack(state, declareAttack('p1', leaderId, opponentLeaderId), defs);

    expect(result.state.currentBattle?.step).toBe('counter');
    expect(result.log.some((e) => e.type === 'PHASE_CHANGED' && String(e.message).includes('no legal Blocker'))).toBe(true);
  });

  it('skips the Block Step when the defender only has a Character without [Blocker] (7-1-2: no legal Blocker)', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: false }));
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', leaderId, opponentLeaderId), rig.defs);

    expect(result.state.currentBattle?.step).toBe('counter');
  });

  it('skips the Block Step when the defender\'s only Blocker is RESTED', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig } = putCharacterInPlay(base, 'p2', makeCharacterDef({ hasBlocker: true }), { orientation: 'rested' });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const opponentLeaderId = rig.state.players.p2.leaderInstanceId;

    const result = executeDeclareAttack(rig.state, declareAttack('p1', leaderId, opponentLeaderId), rig.defs);

    expect(result.state.currentBattle?.step).toBe('counter');
  });

  // Regression coverage for the exact bug report: "the attacked leader or
  // character gets rested instead of the attacker." 7-1-1-2 rests ONLY the
  // attacking card as the cost of declaring the attack — the target (Leader
  // or already-rested Character) is never touched by DECLARE_ATTACK itself.
  // A target Character only ever becomes rested via its OWN [Blocker]
  // activation (activateBlocker.ts, covered separately), never as a side
  // effect of being attacked.
  it('never changes the target Leader\'s orientation — only the attacker rests', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const leaderId = state.players.p1.leaderInstanceId;
    const opponentLeaderId = state.players.p2.leaderInstanceId;
    expect(state.cardsById[opponentLeaderId].orientation).toBe('active');

    const result = executeDeclareAttack(state, declareAttack('p1', leaderId, opponentLeaderId), defs);

    expect(result.state.cardsById[leaderId].orientation).toBe('rested'); // attacker
    expect(result.state.cardsById[opponentLeaderId].orientation).toBe('active'); // target untouched
  });

  it('never changes the target Character\'s orientation — it stays exactly as rested as it already was, the attacker rests too', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const { rig, instanceId: attackerCharId } = putCharacterInPlay(base, 'p1', makeCharacterDef());
    const { rig: rig2, instanceId: targetCharId } = putCharacterInPlay(rig, 'p2', makeCharacterDef(), { orientation: 'rested' });

    const result = executeDeclareAttack(rig2.state, declareAttack('p1', attackerCharId, targetCharId), rig2.defs);

    expect(result.state.cardsById[attackerCharId].orientation).toBe('rested'); // attacker, newly rested
    expect(result.state.cardsById[targetCharId].orientation).toBe('rested'); // target, unchanged (was already rested — DECLARE_ATTACK didn't do this)
  });
});
