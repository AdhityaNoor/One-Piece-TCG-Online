/**
 * Test for the `selfHasCharacterCostAtLeast` gate ("If you have a Character with a cost of N or more"),
 * the backbone of the ST14 cost-matters deck. Uses CURRENT cost (via the shared cost-gate helper).
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

describe('gate: selfHasCharacterCostAtLeast (ST14 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', gate: [{ kind: 'selfHasCharacterCostAtLeast', atLeast: 8 }], functions: [{ fn: 'draw', amount: 1 }] },
  };
  const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 1, basePower: 1000 });
  const BIG = makeCharacterDef({ cardDefinitionId: 'SYN-BIG', cardNumber: 'SYN-BIG', category: 'character', baseCost: 8, basePower: 8000 });
  const SMALL = makeCharacterDef({ cardDefinitionId: 'SYN-SMALL', cardNumber: 'SYN-SMALL', category: 'character', baseCost: 5, basePower: 6000 });

  function run(extra?: typeof BIG) {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    if (extra) ({ rig } = putCharacterInPlay(rig, 'p1', extra));
    rig = putDeckCards(rig, 'p1', SRC, 3).rig;
    const before = rig.state.players.p1.hand.cardIds.length;
    const state = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;
    return state.players.p1.hand.cardIds.length - before;
  }

  it('fires when a controlled Character has cost >= the threshold', () => {
    expect(run(BIG)).toBe(1);
  });

  it('does not fire when no controlled Character meets the threshold', () => {
    expect(run(SMALL)).toBe(0); // only cost-5 and cost-1 in play
    expect(run()).toBe(0);
  });
});
