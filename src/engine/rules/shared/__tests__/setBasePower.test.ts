import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord, GameState } from '../../../state/game';
import { computeCurrentCost, computeCurrentPower } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';

/**
 * Minimal continuous-effect helpers. `sourceInstanceId` must be an on-field
 * card — permanent modifiers are suppressed when their source leaves the field.
 */
function setPower(appliesToInstanceId: string, value: number): ContinuousEffectRecord {
  return {
    id: `set-power-${appliesToInstanceId}-${value}`,
    sourceInstanceId: appliesToInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `base power becomes ${value}`,
    powerModifier: { appliesToInstanceId, amount: 0, setBase: value },
  };
}

function addPower(appliesToInstanceId: string, amount: number): ContinuousEffectRecord {
  return {
    id: `add-power-${appliesToInstanceId}-${amount}`,
    sourceInstanceId: appliesToInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `power ${amount >= 0 ? '+' : ''}${amount}`,
    powerModifier: { appliesToInstanceId, amount },
  };
}

function setCost(appliesToInstanceId: string, value: number): ContinuousEffectRecord {
  return {
    id: `set-cost-${appliesToInstanceId}-${value}`,
    sourceInstanceId: appliesToInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `base cost becomes ${value}`,
    costModifier: { appliesToInstanceId, amount: 0, setBase: value },
  };
}

function addCost(appliesToInstanceId: string, amount: number): ContinuousEffectRecord {
  return {
    id: `add-cost-${appliesToInstanceId}-${amount}`,
    sourceInstanceId: appliesToInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `cost ${amount >= 0 ? '+' : ''}${amount}`,
    costModifier: { appliesToInstanceId, amount },
  };
}

describe('setBase power/cost ("becomes N")', () => {
  it('overwrites the printed base power', () => {
    const def = makeCharacterDef({ basePower: 5000 });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def);
    const state: GameState = { ...rig.state, continuousEffects: [setPower(instanceId, 7000)] };
    expect(computeCurrentPower(rig.defs, state, instanceId)).toBe(7000);
  });

  it('lets additive power modifiers stack on top of the set value', () => {
    const def = makeCharacterDef({ basePower: 5000 });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def);
    const state: GameState = { ...rig.state, continuousEffects: [setPower(instanceId, 7000), addPower(instanceId, 1000)] };
    expect(computeCurrentPower(rig.defs, state, instanceId)).toBe(8000);
  });

  it('applies the last set when multiple "becomes" records target the same card', () => {
    const def = makeCharacterDef({ basePower: 5000 });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def);
    const state: GameState = { ...rig.state, continuousEffects: [setPower(instanceId, 7000), setPower(instanceId, 4000)] };
    expect(computeCurrentPower(rig.defs, state, instanceId)).toBe(4000);
  });

  it("adds attached DON!! power on top of the set base during the card owner's turn", () => {
    const def = makeCharacterDef({ basePower: 5000 });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def, { donAttached: ['don-1', 'don-2'] });
    const state: GameState = { ...rig.state, continuousEffects: [setPower(instanceId, 3000)] };
    expect(computeCurrentPower(rig.defs, state, instanceId)).toBe(5000); // 3000 set + 2x1000 DON!!
  });

  it('only applies a conditional set when its condition holds', () => {
    const def = makeCharacterDef({ basePower: 5000 });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def);
    const conditional: ContinuousEffectRecord = {
      id: 'set-opp-turn',
      sourceInstanceId: instanceId,
      ownerId: 'p1',
      duration: 'permanent',
      description: 'base power becomes 7000 (opponent turn)',
      powerModifier: { appliesToInstanceId: instanceId, amount: 0, setBase: 7000, condition: { turn: 'opponent' } },
    };
    const onOwnTurn: GameState = { ...rig.state, activePlayerId: 'p1', continuousEffects: [conditional] };
    const onOpponentTurn: GameState = { ...rig.state, activePlayerId: 'p2', continuousEffects: [conditional] };
    expect(computeCurrentPower(rig.defs, onOwnTurn, instanceId)).toBe(5000);
    expect(computeCurrentPower(rig.defs, onOpponentTurn, instanceId)).toBe(7000);
  });

  it('overwrites the printed base cost and floors deltas at 0', () => {
    const def = makeCharacterDef({ baseCost: 5 });
    const { rig, instanceId } = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p1' }), 'p1', def);
    const setOnly: GameState = { ...rig.state, continuousEffects: [setCost(instanceId, 2)] };
    expect(computeCurrentCost(rig.defs, setOnly, instanceId)).toBe(2);

    const setPlusDelta: GameState = { ...rig.state, continuousEffects: [setCost(instanceId, 2), addCost(instanceId, -1)] };
    expect(computeCurrentCost(rig.defs, setPlusDelta, instanceId)).toBe(1);

    const flooredBelowZero: GameState = { ...rig.state, continuousEffects: [setCost(instanceId, 2), addCost(instanceId, -5)] };
    expect(computeCurrentCost(rig.defs, flooredBelowZero, instanceId)).toBe(0);
  });
});
