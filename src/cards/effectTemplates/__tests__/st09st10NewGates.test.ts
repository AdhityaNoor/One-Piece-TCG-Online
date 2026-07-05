/**
 * Tests for the two small reusable additions ST09/ST10 needed:
 *   - `opponentHand` board gate (ST10-010).
 *   - `maxPower` filter on moveToBottomDeck (ST10-001).
 * Synthetic cards + generic assignments.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand, putDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 1, basePower: 1000 });
const HAND = makeCharacterDef({ cardDefinitionId: 'SYN-HAND', cardNumber: 'SYN-HAND', category: 'character', baseCost: 1, basePower: 1000 });

describe('gate: opponentHand (ST10-010 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', gate: [{ kind: 'opponentHand', atLeast: 7 }], functions: [{ fn: 'draw', amount: 1 }] },
  };

  function run(opponentHandSize: number) {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    rig = putDeckCards(rig, 'p1', HAND, 3).rig; // something to draw
    for (let i = 0; i < opponentHandSize; i += 1) rig = putInHand(rig, 'p2', HAND).rig;
    const before = rig.state.players.p1.hand.cardIds.length;
    const state = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;
    return state.players.p1.hand.cardIds.length - before;
  }

  it('fires when the opponent has >= the threshold hand, not below', () => {
    expect(run(7)).toBe(1);
    expect(run(6)).toBe(0);
  });
});

describe('template: moveToBottomDeck by maxPower (ST10-001 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'moveToBottomDeck', maxPower: 3000, target: 'opponent' }] },
  };
  const LOW = makeCharacterDef({ cardDefinitionId: 'SYN-LOW', cardNumber: 'SYN-LOW', category: 'character', baseCost: 2, basePower: 2000 });
  const HIGH = makeCharacterDef({ cardDefinitionId: 'SYN-HIGH', cardNumber: 'SYN-HIGH', category: 'character', baseCost: 4, basePower: 5000 });

  it('offers only opponent Characters at/under the power threshold', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    let lowId: string;
    let highId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig, instanceId: lowId } = putCharacterInPlay(rig, 'p2', LOW));
    ({ rig, instanceId: highId } = putCharacterInPlay(rig, 'p2', HIGH));

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(lowId);
    expect(choice.constraints.candidateInstanceIds).not.toContain(highId);
  });
});
