/**
 * "This Character cannot be rested" is a lock on the card BECOMING rested, not only on
 * effects that rest it.
 *
 * Resting is how a card pays for three different things:
 *   - declaring an attack        (7-1-1-1, the attacker rests)
 *   - activating [Blocker]       (7-1-2-1, the blocker rests)
 *   - a "rest this Character:" activation cost
 * so a rest-locked card can do none of them. Reported against OP16-032 (Boa Hancock),
 * whose [On Play] locks one of the opponent's Characters other than [Monkey.D.Luffy]:
 * the locked Character could still block, and still pay rest costs.
 *
 * Source-scoped locks ("cannot be rested by your opponent's effects") are deliberately NOT
 * covered by this: they only restrict a rest coming FROM an effect, so the card may still
 * attack and block. That case is asserted at the bottom.
 */
import { describe, expect, it } from 'vitest';
import { validateDeclareAttack } from '../declareAttack';
import { validateActivateBlocker, hasAnyLegalBlocker } from '../activateBlocker';
import { canPayAbilityCost } from '../../../effects/abilityCost';
import type { GameState, ContinuousEffectRecord } from '../../../state/game';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, nextTestId } from '../../shared/__tests__/testRig';

const BLOCKER_DEF = makeCharacterDef({ cardDefinitionId: 'BLK', cardNumber: 'BLK-001', name: 'Blocky', baseCost: 3, basePower: 4000, hasBlocker: true });
const PLAIN_DEF = makeCharacterDef({ cardDefinitionId: 'PLAIN', cardNumber: 'PL-001', name: 'Plain', baseCost: 3, basePower: 5000 });

/** The record OP16-032's preventRest writes: no effectSourceController, so it locks every rest. */
function restLock(instanceId: string, sourceInstanceId: string): ContinuousEffectRecord {
  return {
    id: `ce-lock-${instanceId}`,
    sourceInstanceId,
    ownerId: 'p1',
    duration: 'endOfOpponentsTurn',
    description: 'cannot be rested',
    restRestriction: { appliesToInstanceId: instanceId },
  };
}

function withEffects(state: GameState, records: ContinuousEffectRecord[]): GameState {
  return { ...state, continuousEffects: [...state.continuousEffects, ...records] };
}

describe('cannot be rested — attacking', () => {
  it('refuses DECLARE_ATTACK from a rest-locked Character', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 5 });
    let attackerId: string;
    let lockSourceId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p2', PLAIN_DEF, { summoningSick: false }));
    ({ rig, instanceId: lockSourceId } = putCharacterInPlay(rig, 'p1', PLAIN_DEF));
    const p1Leader = rig.state.players.p1.leaderInstanceId;

    const action = { type: 'DECLARE_ATTACK' as const, actionId: nextTestId('a'), playerId: 'p2', attackerInstanceId: attackerId, targetInstanceId: p1Leader };
    expect(validateDeclareAttack(rig.state, action, rig.defs).legal).toBe(true);

    const locked = withEffects(rig.state, [restLock(attackerId, lockSourceId)]);
    const result = validateDeclareAttack(locked, action, rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('being rested');
  });
});

describe('cannot be rested — [Blocker]', () => {
  const buildBattle = () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    let blockerId: string;
    let attackerId: string;
    ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p2', BLOCKER_DEF));
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', PLAIN_DEF, { summoningSick: false }));
    const p2Leader = rig.state.players.p2.leaderInstanceId;
    const state: GameState = {
      ...rig.state,
      currentBattle: {
        attackerInstanceId: attackerId,
        targetInstanceId: p2Leader,
        originalTargetInstanceId: p2Leader,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
        counterPowerBonuses: {},
      } as GameState['currentBattle'],
    };
    return { rig, state, blockerId, attackerId };
  };

  it('refuses ACTIVATE_BLOCKER from a rest-locked Character', () => {
    const { rig, state, blockerId, attackerId } = buildBattle();
    const action = { type: 'ACTIVATE_BLOCKER' as const, actionId: nextTestId('a'), playerId: 'p2', blockerInstanceId: blockerId };
    expect(validateActivateBlocker(state, action, rig.defs).legal).toBe(true);

    const locked = withEffects(state, [restLock(blockerId, attackerId)]);
    const result = validateActivateBlocker(locked, action, rig.defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toContain('being rested');
  });

  it('does not count a rest-locked Character as a legal blocker (the Block Step is skipped)', () => {
    const { rig, state, blockerId, attackerId } = buildBattle();
    expect(hasAnyLegalBlocker(state, 'p2', rig.defs)).toBe(true);

    const locked = withEffects(state, [restLock(blockerId, attackerId)]);
    expect(hasAnyLegalBlocker(locked, 'p2', rig.defs)).toBe(false);
  });
});

describe('cannot be rested — "rest this card:" activation cost', () => {
  it('refuses a restThis cost from a rest-locked Character', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 5 });
    let sourceId: string;
    let lockSourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p2', PLAIN_DEF, { summoningSick: false }));
    ({ rig, instanceId: lockSourceId } = putCharacterInPlay(rig, 'p1', PLAIN_DEF));

    expect(canPayAbilityCost(rig.state, sourceId, 'p2', [{ kind: 'restThis' }])).toEqual([]);

    const locked = withEffects(rig.state, [restLock(sourceId, lockSourceId)]);
    const reasons = canPayAbilityCost(locked, sourceId, 'p2', [{ kind: 'restThis' }]);
    expect(reasons.join(' ')).toContain('preventing it from being rested');
  });
});

describe('a lock scoped to the OPPONENT\'s effects leaves attacking and blocking alone', () => {
  it('still allows the attack', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 5 });
    let attackerId: string;
    let lockSourceId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p2', PLAIN_DEF, { summoningSick: false }));
    ({ rig, instanceId: lockSourceId } = putCharacterInPlay(rig, 'p1', PLAIN_DEF));
    const p1Leader = rig.state.players.p1.leaderInstanceId;

    const scoped: ContinuousEffectRecord = {
      ...restLock(attackerId, lockSourceId),
      restRestriction: { appliesToInstanceId: attackerId, effectSourceController: 'opponent' },
    };
    const state = withEffects(rig.state, [scoped]);
    const action = { type: 'DECLARE_ATTACK' as const, actionId: nextTestId('a'), playerId: 'p2', attackerInstanceId: attackerId, targetInstanceId: p1Leader };
    expect(validateDeclareAttack(state, action, rig.defs).legal).toBe(true);
  });
});
