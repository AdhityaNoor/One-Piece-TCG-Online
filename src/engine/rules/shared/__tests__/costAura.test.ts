import { describe, expect, it } from 'vitest';
import type { ContinuousEffectRecord, ContinuousPowerCondition, GameState, PowerAuraGroup, SourceStateCondition } from '../../../state/game';
import { computeCurrentCost } from '../power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from './testRig';

/** A continuous cost aura over a dynamic group, owned by p1 (source = `sourceInstanceId`). */
function costAura(
  group: PowerAuraGroup,
  amount: number,
  sourceInstanceId: string,
  sourceCondition?: SourceStateCondition,
  condition?: ContinuousPowerCondition,
): ContinuousEffectRecord {
  return {
    id: `cost-aura-${amount}`,
    sourceInstanceId,
    ownerId: 'p1',
    duration: 'permanent',
    description: `aura cost ${amount >= 0 ? '+' : ''}${amount}`,
    costModifier: { appliesToGroup: group, amount, ...(sourceCondition ? { sourceCondition } : {}), ...(condition ? { condition } : {}) },
  };
}

describe('continuous cost aura (addCostAura)', () => {
  it("applies a controller {Navy} +2 cost aura only to matching own Characters, gated on the source's turn", () => {
    // p2 is active -> from p1's perspective it is the opponent's turn.
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const navy = putCharacterInPlay(base, 'p1', makeCharacterDef({ baseCost: 3, types: ['Navy'] }));
    const plain = putCharacterInPlay(navy.rig, 'p1', makeCharacterDef({ baseCost: 3, types: ['Straw Hat Crew'] }));
    const opp = putCharacterInPlay(plain.rig, 'p2', makeCharacterDef({ baseCost: 4, types: ['Navy'] }));
    const rig = opp.rig;

    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Navy'] };
    const state: GameState = { ...rig.state, continuousEffects: [costAura(group, 2, navy.instanceId, { turn: 'opponent' })] };

    expect(computeCurrentCost(rig.defs, state, navy.instanceId)).toBe(5); // 3 + 2
    expect(computeCurrentCost(rig.defs, state, plain.instanceId)).toBe(3); // wrong type -> unaffected
    expect(computeCurrentCost(rig.defs, state, opp.instanceId)).toBe(4); // opponent's card -> unaffected
  });

  it("does not apply the [Opponent's Turn] aura on the controller's own turn", () => {
    const base = buildBaseRig({ activePlayerId: 'p1' }); // p1's own turn
    const navy = putCharacterInPlay(base, 'p1', makeCharacterDef({ baseCost: 3, types: ['Navy'] }));
    const rig = navy.rig;
    const group: PowerAuraGroup = { ownLeaderAndCharacters: true, charactersOnly: true, anyOfTypes: ['Navy'] };
    const state: GameState = { ...rig.state, continuousEffects: [costAura(group, 2, navy.instanceId, { turn: 'opponent' })] };
    expect(computeCurrentCost(rig.defs, state, navy.instanceId)).toBe(3);
  });

  it('applies an opponent-Characters −cost aura only to the opponent, floored at 0', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const src = putCharacterInPlay(base, 'p1', makeCharacterDef({ baseCost: 2 }));
    const oppBig = putCharacterInPlay(src.rig, 'p2', makeCharacterDef({ baseCost: 4 }));
    const oppSmall = putCharacterInPlay(oppBig.rig, 'p2', makeCharacterDef({ baseCost: 1 }));
    const rig = oppSmall.rig;

    const group: PowerAuraGroup = { opponentCharacters: true };
    const state: GameState = { ...rig.state, continuousEffects: [costAura(group, -1, src.instanceId)] };

    expect(computeCurrentCost(rig.defs, state, oppBig.instanceId)).toBe(3); // 4 - 1
    expect(computeCurrentCost(rig.defs, state, oppSmall.instanceId)).toBe(0); // 1 - 1, floored at 0
    expect(computeCurrentCost(rig.defs, state, src.instanceId)).toBe(2); // own card -> unaffected
  });

  it('board-gated aura (EB04-017): applies the opponent −1 cost aura only while the owner holds 3+ {Minks} Characters', () => {
    // Board with exactly two {Minks} Characters controlled by p1 -> gate NOT met.
    const base = buildBaseRig({ activePlayerId: 'p1' }); // p1's own turn (matches [Your Turn])
    const m1 = putCharacterInPlay(base, 'p1', makeCharacterDef({ baseCost: 3, types: ['Minks'] }));
    const m2 = putCharacterInPlay(m1.rig, 'p1', makeCharacterDef({ baseCost: 3, types: ['Minks'] }));
    const opp = putCharacterInPlay(m2.rig, 'p2', makeCharacterDef({ baseCost: 4 }));

    const group: PowerAuraGroup = { opponentCharacters: true };
    const gate: ContinuousPowerCondition = { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Minks', atLeast: 3 }] };
    const aura = costAura(group, -1, m1.instanceId, { turn: 'your' }, gate);

    const twoMinks: GameState = { ...opp.rig.state, continuousEffects: [aura] };
    expect(computeCurrentCost(opp.rig.defs, twoMinks, opp.instanceId)).toBe(4); // gate not met -> unaffected

    // Add a third {Minks} Character -> gate now holds -> aura applies.
    const m3 = putCharacterInPlay(opp.rig, 'p1', makeCharacterDef({ baseCost: 3, types: ['Minks'] }));
    const threeMinks: GameState = { ...m3.rig.state, continuousEffects: [aura] };
    expect(computeCurrentCost(m3.rig.defs, threeMinks, opp.instanceId)).toBe(3); // 4 - 1

    // Still opponent-only: p1's own Characters are never touched.
    expect(computeCurrentCost(m3.rig.defs, threeMinks, m1.instanceId)).toBe(3);
  });

  it('board-gated aura does not apply on the wrong turn even when the gate holds', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' }); // opponent's turn -> [Your Turn] inactive
    const m1 = putCharacterInPlay(base, 'p1', makeCharacterDef({ baseCost: 3, types: ['Minks'] }));
    const m2 = putCharacterInPlay(m1.rig, 'p1', makeCharacterDef({ baseCost: 3, types: ['Minks'] }));
    const m3 = putCharacterInPlay(m2.rig, 'p1', makeCharacterDef({ baseCost: 3, types: ['Minks'] }));
    const opp = putCharacterInPlay(m3.rig, 'p2', makeCharacterDef({ baseCost: 4 }));

    const group: PowerAuraGroup = { opponentCharacters: true };
    const gate: ContinuousPowerCondition = { gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Minks', atLeast: 3 }] };
    const state: GameState = { ...opp.rig.state, continuousEffects: [costAura(group, -1, m1.instanceId, { turn: 'your' }, gate)] };

    expect(computeCurrentCost(opp.rig.defs, state, opp.instanceId)).toBe(4); // gate holds but not your turn -> unaffected
  });
});
