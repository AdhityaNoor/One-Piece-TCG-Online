/**
 * Counter auras (EB01-001 Oden / OP16-118 Ace): continuous Counter modifiers
 * consumed by ACTIVATE_COUNTER_CHARACTER via computeEffectiveCounter.
 */
import { describe, expect, it } from 'vitest';
import { CURATED_EFFECT_PROGRAMS } from '../../../cards/effectTemplates';
import { runTimings } from '../interpreter';
import { computeEffectiveCounter } from '../../rules/shared/power';
import { evaluateGates } from '../gates';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putInHand,
  nextTestId,
} from '../../rules/shared/__tests__/testRig';
import { validateActivateCounterCharacter, executeActivateCounterCharacter } from '../../rules/battle/activateCounterCharacter';
import type { ActivateCounterCharacterAction } from '../../actions/action';
import type { BattleState } from '../../state/game';

function counterAction(playerId: string, handCardInstanceId: string, boostTargetInstanceId: string): ActivateCounterCharacterAction {
  return { type: 'ACTIVATE_COUNTER_CHARACTER', actionId: nextTestId('action'), playerId, handCardInstanceId, boostTargetInstanceId };
}

function battleAt(step: BattleState['step']): BattleState {
  return {
    attackerInstanceId: 'attacker-x',
    targetInstanceId: 'target-x',
    originalTargetInstanceId: 'target-x',
    step,
    blockerUsed: false,
    battlePowerBonuses: {},
  };
}

describe('counter aura family (EB01-001 / OP16-118)', () => {
  it('EB01-001 grants +1000 Counter to Land of Wano hand Characters without printed Counter', () => {
    const program = CURATED_EFFECT_PROGRAMS['EB01-001'];
    expect(program).toBeDefined();
    const registry = { 'EB01-001': program };

    let rig = buildBaseRig({ leaderOverridesP1: { cardDefinitionId: 'EB01-001', cardNumber: 'EB01-001', name: 'Kouzuki Oden' } });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const registered = runTimings(program, ['startOfGame'], rig.state, leaderId, rig.defs, null, registry);
    rig = { ...rig, state: registered.state };

    const noCounter = makeCharacterDef({
      cardDefinitionId: 'WANO-NO-CTR',
      types: ['Land of Wano'],
      counter: undefined,
      basePower: 4000,
    });
    const withCounter = makeCharacterDef({
      cardDefinitionId: 'WANO-HAS-CTR',
      types: ['Land of Wano'],
      counter: 1000,
      basePower: 4000,
    });
    const otherType = makeCharacterDef({
      cardDefinitionId: 'OTHER-NO-CTR',
      types: ['Straw Hat Crew'],
      counter: undefined,
      basePower: 4000,
    });

    let handId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', noCounter));
    expect(computeEffectiveCounter(rig.defs, rig.state, handId)).toBe(1000);

    let blockedId: string;
    ({ rig, instanceId: blockedId } = putInHand(rig, 'p1', withCounter));
    expect(computeEffectiveCounter(rig.defs, rig.state, blockedId)).toBe(1000);

    let otherId: string;
    ({ rig, instanceId: otherId } = putInHand(rig, 'p1', otherType));
    expect(computeEffectiveCounter(rig.defs, rig.state, otherId)).toBe(0);

    const battling = { ...rig.state, currentBattle: battleAt('counter'), activePlayerId: 'p2' };
    expect(validateActivateCounterCharacter(battling, counterAction('p1', handId, leaderId), rig.defs).legal).toBe(true);
    const result = executeActivateCounterCharacter(battling, counterAction('p1', handId, leaderId), rig.defs);
    expect(result.state.currentBattle?.battlePowerBonuses[leaderId]).toBe(1000);
  });

  it('EB01-001 when-attacking gate requires a Land of Wano Character with cost ≥ 5', () => {
    let rig = buildBaseRig();
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Land of Wano'], baseCost: 3 })));
    expect(evaluateGates([{ kind: 'selfTypedCharacterCount', typeIncludes: 'Land of Wano', minCost: 5, atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(false);

    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ types: ['Land of Wano'], baseCost: 5 })));
    expect(evaluateGates([{ kind: 'selfTypedCharacterCount', typeIncludes: 'Land of Wano', minCost: 5, atLeast: 1 }], rig.state, rig.defs, 'p1')).toBe(true);
  });

  it('OP16-118 sets Counter of 8000-power hand Characters to 2000', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP16-118'];
    expect(program).toBeDefined();
    const registry = { 'OP16-118': program };

    let rig = buildBaseRig();
    const ace = makeCharacterDef({
      cardDefinitionId: 'OP16-118',
      cardNumber: 'OP16-118',
      name: 'Portgas.D.Ace',
      basePower: 10000,
    });
    let aceId: string;
    ({ rig, instanceId: aceId } = putCharacterInPlay(rig, 'p1', ace));
    const registered = runTimings(program, ['onEnterPlay'], rig.state, aceId, rig.defs, null, registry);
    rig = { ...rig, state: registered.state };

    const match = makeCharacterDef({
      cardDefinitionId: 'HAND-8K',
      basePower: 8000,
      counter: 1000,
    });
    const mismatch = makeCharacterDef({
      cardDefinitionId: 'HAND-6K',
      basePower: 6000,
      counter: 1000,
    });

    let matchId: string;
    ({ rig, instanceId: matchId } = putInHand(rig, 'p1', match));
    expect(computeEffectiveCounter(rig.defs, rig.state, matchId)).toBe(2000);

    let mismatchId: string;
    ({ rig, instanceId: mismatchId } = putInHand(rig, 'p1', mismatch));
    expect(computeEffectiveCounter(rig.defs, rig.state, mismatchId)).toBe(1000);
  });
});
