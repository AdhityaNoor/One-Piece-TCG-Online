import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord, ContinuousPowerCondition, GameState, PowerAuraGroup, SourceStateCondition } from '../../../state/game';
import { computeCurrentPower, hasContinuousKeyword } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';

function keywordAura(
  group: PowerAuraGroup,
  keyword: 'unblockable' | 'doubleAttack',
  sourceInstanceId: string,
  sourceCondition?: SourceStateCondition,
  condition?: ContinuousPowerCondition,
): ContinuousEffectRecord {
  return {
    id: `keyword-aura-${keyword}`,
    sourceInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `aura gains ${keyword}`,
    keywordModifier: {
      appliesToGroup: group,
      keyword,
      ...(sourceCondition ? { sourceCondition } : {}),
      ...(condition ? { condition } : {}),
    },
  };
}

function setBasePowerAura(
  group: PowerAuraGroup,
  value: number,
  sourceInstanceId: string,
  sourceCondition?: SourceStateCondition,
): ContinuousEffectRecord {
  return {
    id: `set-base-aura-${value}`,
    sourceInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `aura base power becomes ${value}`,
    powerModifier: { appliesToGroup: group, amount: 0, setBase: value, ...(sourceCondition ? { sourceCondition } : {}) },
  };
}

describe('continuous keyword aura (addKeywordAura)', () => {
  it('named keyword aura (OP15-070): grants [Unblockable] to matching Leader/Characters by printed name', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ name: 'Fuza', basePower: 2000 }));
    const shura = putCharacterInPlay(src.rig, 'p1', makeCharacterDef({ name: 'Shura', basePower: 3000 }));
    const other = putCharacterInPlay(shura.rig, 'p1', makeCharacterDef({ name: 'Gan Fall', basePower: 4000 }));

    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, anyOfNames: ['Shura'] };
    const aura = keywordAura(group, 'unblockable', src.instanceId);
    const state: GameState = { ...other.rig.state, continuousEffects: [aura] };

    expect(hasContinuousKeyword(other.rig.defs, state, shura.instanceId, 'unblockable')).toBe(true);
    expect(hasContinuousKeyword(other.rig.defs, state, other.instanceId, 'unblockable')).toBe(false);
  });

  it('named keyword aura (OP15-071): grants [Double Attack] to matching cards', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ name: 'Holly', basePower: 2000 }));
    const ohm = putCharacterInPlay(src.rig, 'p1', makeCharacterDef({ name: 'Ohm', basePower: 3000 }));

    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, anyOfNames: ['Ohm'] };
    const aura = keywordAura(group, 'doubleAttack', src.instanceId);
    const state: GameState = { ...ohm.rig.state, continuousEffects: [aura] };

    expect(hasContinuousKeyword(ohm.rig.defs, state, ohm.instanceId, 'doubleAttack')).toBe(true);
    expect(hasContinuousKeyword(ohm.rig.defs, state, src.instanceId, 'doubleAttack')).toBe(false);
  });
});

describe('continuous setBasePower aura (setBasePowerAura)', () => {
  it('named setBasePower aura (OP15-070): sets base power to 6000 on opponent turn only', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ name: 'Fuza', basePower: 2000 }));
    const shura = putCharacterInPlay(src.rig, 'p1', makeCharacterDef({ name: 'Shura', basePower: 3000 }));
    const other = putCharacterInPlay(shura.rig, 'p1', makeCharacterDef({ name: 'Gan Fall', basePower: 4000 }));

    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, anyOfNames: ['Shura'] };
    const aura = setBasePowerAura(group, 6000, src.instanceId, { turn: 'opponent' });
    const state: GameState = { ...other.rig.state, continuousEffects: [aura] };

    expect(computeCurrentPower(other.rig.defs, state, shura.instanceId)).toBe(6000);
    expect(computeCurrentPower(other.rig.defs, state, other.instanceId)).toBe(4000);

    const yourTurn: GameState = { ...state, activePlayerId: 'p1' };
    expect(computeCurrentPower(other.rig.defs, yourTurn, shura.instanceId)).toBe(3000);
  });
});
