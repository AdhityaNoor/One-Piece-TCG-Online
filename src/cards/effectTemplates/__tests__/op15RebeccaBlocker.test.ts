import { describe, expect, it } from 'vitest';
import { buildCardView } from '../../../board/projection/cardView';
import { runTimings } from '../../../engine/effects/interpreter';
import { validateActivateBlocker } from '../../../engine/rules/battle/activateBlocker';
import { hasContinuousKeyword } from '../../../engine/rules/shared';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDon,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';

const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);

describe('OP15-053 Rebecca conditional Blocker', () => {
  it('gains [Blocker] only while it has at least 1 DON!! attached', () => {
    const rebecca = makeCharacterDef({
      cardDefinitionId: 'OP15-053',
      cardNumber: 'OP15-053',
      name: 'Rebecca',
      types: ['Dressrosa'],
      baseCost: 1,
      basePower: 0,
      hasBlocker: false,
    });
    const attacker = makeCharacterDef({ cardDefinitionId: 'OP15-053-ATTACKER', cardNumber: 'OP15-053-ATTACKER', basePower: 5000 });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 5 });
    const rebeccaPlay = putCharacterInPlay(rig, 'p1', rebecca, { summoningSick: false });
    rig = rebeccaPlay.rig;
    const attackerPlay = putCharacterInPlay(rig, 'p2', attacker, { summoningSick: false });
    rig = attackerPlay.rig;

    const registered = runTimings(registry['OP15-053'], ['onEnterPlay'], rig.state, rebeccaPlay.instanceId, rig.defs, 'test', registry).state;
    const battleState = {
      ...registered,
      currentBattle: {
        attackerInstanceId: attackerPlay.instanceId,
        targetInstanceId: registered.players.p1.leaderInstanceId,
        originalTargetInstanceId: registered.players.p1.leaderInstanceId,
        step: 'block' as const,
        blockerUsed: false,
        battlePowerBonuses: {},
      },
    };

    const blockAction = {
      type: 'ACTIVATE_BLOCKER' as const,
      actionId: 'op15-053-block',
      playerId: 'p1',
      blockerInstanceId: rebeccaPlay.instanceId,
    };

    expect(hasContinuousKeyword(rig.defs, battleState, rebeccaPlay.instanceId, 'blocker')).toBe(false);
    expect(buildCardView(rig.defs, battleState, {}, rebeccaPlay.instanceId).hasBlocker).toBe(false);
    expect(validateActivateBlocker(battleState, blockAction, rig.defs).legal).toBe(false);

    const withDon = putDon({ state: battleState, defs: rig.defs }, 'p1', 1);
    const withAttachedDon = {
      ...withDon.rig.state,
      cardsById: {
        ...withDon.rig.state.cardsById,
        [rebeccaPlay.instanceId]: {
          ...withDon.rig.state.cardsById[rebeccaPlay.instanceId],
          donAttached: [withDon.donIds[0]],
        },
      },
    };

    expect(hasContinuousKeyword(withDon.rig.defs, withAttachedDon, rebeccaPlay.instanceId, 'blocker')).toBe(true);
    expect(buildCardView(withDon.rig.defs, withAttachedDon, {}, rebeccaPlay.instanceId).hasBlocker).toBe(true);
    expect(validateActivateBlocker(withAttachedDon, blockAction, withDon.rig.defs).legal).toBe(true);
  });
});
