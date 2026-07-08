import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { runTimings } from '../interpreter';
import { EffectContextImpl } from '../effectContext';
import { isAbilityNegated } from '../effectNegation';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../rules/shared/__tests__/testRig';

describe('effect negation', () => {
  it('blocks a negated card\'s onPlay ability', () => {
    const base = buildBaseRig({ activePlayerId: 'p2' });
    const targetDef = makeCharacterDef({ cardDefinitionId: 'NEG-TARGET', cardNumber: 'NEG-001', baseCost: 2 });
    const { rig, instanceId: targetId } = putCharacterInPlay(base, 'p2', targetDef);

    const program: EffectProgram = {
      cardNumber: 'NEG-001',
      abilities: [{
        timing: 'onPlay',
        ops: [{ op: 'draw', amount: 1 }],
      }],
    };

    const ctx = new EffectContextImpl(rig.state, targetId, rig.defs, 'test');
    ctx.negateEffect({ appliesToInstanceId: targetId, duration: 'duringThisTurn' });
    const withNegation = ctx.finish().state;

    expect(isAbilityNegated(withNegation, targetId, 'onPlay')).toBe(true);

    const handBefore = withNegation.players.p2.hand.cardIds.length;
    const result = runTimings(program, ['onPlay'], withNegation, targetId, rig.defs, 'test', { [targetDef.cardDefinitionId]: program });
    expect(result.state.players.p2.hand.cardIds.length).toBe(handBefore);
  });

  it('negates only the listed timings for controller-wide negation', () => {
    const base = buildBaseRig({ activePlayerId: 'p1' });
    const charDef = makeCharacterDef({ cardDefinitionId: 'NEG-CTRL', cardNumber: 'NEG-002' });
    const { rig, instanceId } = putCharacterInPlay(base, 'p1', charDef);

    const ctx = new EffectContextImpl(rig.state, instanceId, rig.defs, 'test');
    ctx.negateControllerEffects({
      appliesToControllerId: 'p1',
      duration: 'duringThisTurn',
      negatedTimings: ['onPlay'],
    });
    const withNegation = ctx.finish().state;

    expect(isAbilityNegated(withNegation, instanceId, 'onPlay')).toBe(true);
    expect(isAbilityNegated(withNegation, instanceId, 'onKO')).toBe(false);
  });
});
