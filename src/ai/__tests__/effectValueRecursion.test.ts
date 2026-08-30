/**
 * Scoring a "play a card" effect must terminate.
 *
 * The free-play ops used to recurse into `ctx.sourceCardDefinitionId`'s own
 * [On Play] timings — the card DOING the playing, not the card being played.
 * For any card whose [On Play] plays another card, that is a direct
 * self-recursion, and the CPU died with "Maximum call stack size exceeded"
 * mid-match. Several real leaders hit it.
 */
import { describe, expect, it } from 'vitest';
import { buildBaseRig, makeCharacterDef, putInHand } from '../../engine/rules/shared/__tests__/testRig';
import { scoreAbility } from '../heuristics/effectValue';
import type { Ability, EffectProgram } from '../../engine/effects/effectIr';
import type { EffectScoreContext } from '../heuristics/effectValue';

/** [On Play] play a Character from your deck — i.e. an ability that plays cards. */
const selfReferentialOnPlay: Ability = {
  timing: 'onPlay',
  ops: [{ op: 'playFromDeck', pick: 1, filter: {}, prompt: 'Play a Character.' } as never],
};

describe('free-play effect scoring', () => {
  it('terminates for an [On Play] that plays another card', () => {
    const def = makeCharacterDef({ cardNumber: 'RECURSE-1', baseCost: 4, basePower: 5000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const placed = putInHand(rig, 'p1', def);
    rig = placed.rig;

    // The registry maps this card to a program whose [On Play] plays a card.
    // With the old code this recursed into itself without bound.
    const program: EffectProgram = { cardNumber: def.cardNumber, abilities: [selfReferentialOnPlay] };
    const ctx: EffectScoreContext = {
      state: { ...rig.state, setupState: null, pendingChoices: [] },
      playerId: 'p1',
      defs: rig.defs,
      registry: { [def.cardNumber]: program, [def.cardDefinitionId]: program },
      sourceInstanceId: placed.instanceId,
      sourceCardDefinitionId: def.cardDefinitionId,
    };

    expect(() => scoreAbility(ctx, selfReferentialOnPlay)).not.toThrow();
    expect(Number.isFinite(scoreAbility(ctx, selfReferentialOnPlay))).toBe(true);
  });

  it('values playing more bodies above playing fewer', () => {
    const def = makeCharacterDef({ cardNumber: 'RECURSE-2', baseCost: 4 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const placed = putInHand(rig, 'p1', def);
    rig = placed.rig;
    const ctx: EffectScoreContext = {
      state: { ...rig.state, setupState: null, pendingChoices: [] },
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      sourceInstanceId: placed.instanceId,
      sourceCardDefinitionId: def.cardDefinitionId,
    };

    const one: Ability = { timing: 'onPlay', ops: [{ op: 'playFromDeck', pick: 1, filter: {}, prompt: '' } as never] };
    const two: Ability = { timing: 'onPlay', ops: [{ op: 'playFromDeck', pick: 2, filter: {}, prompt: '' } as never] };
    expect(scoreAbility(ctx, two)).toBeGreaterThan(scoreAbility(ctx, one));
  });
});
