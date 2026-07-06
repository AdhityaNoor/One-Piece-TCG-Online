/**
 * Engine-capability test for the `selfDonAtMostOpponent` AbilityGate added for the OP06/07/08
 * Vinsmoke / Foxy Pirates / GERMA archetypes:
 *   "If the number of DON!! cards on your field is equal to or less than the number on your
 *    opponent's field, …"
 *
 * The gate holds when self field DON!! ≤ opponent field DON!! (i.e. equal OR fewer). It is the
 * complement-with-equality of the existing `opponentDonMoreThanSelf` gate. Synthetic card + a
 * generic assignment — the gate, not any single card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon, putDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const DECK = makeCharacterDef({ cardDefinitionId: 'SYN-DECK', cardNumber: 'SYN-DECK', category: 'character', baseCost: 1, basePower: 1000 });

const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: { timing: 'onPlay', gate: [{ kind: 'selfDonAtMostOpponent' }], functions: [{ fn: 'draw', amount: 1 }] },
};

function handSizeAfterOnPlay(selfDon: number, oppDon: number): number {
  const registry = buildRegistryFromAssignments([assignment]);
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  let srcId: string;
  ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
  ({ rig } = putDeckCards(rig, 'p1', DECK, 5));
  if (selfDon > 0) ({ rig } = putDon(rig, 'p1', selfDon));
  if (oppDon > 0) ({ rig } = putDon(rig, 'p2', oppDon));
  const before = rig.state.players.p1.hand.cardIds.length;
  const after = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry).state;
  return after.players.p1.hand.cardIds.length - before;
}

describe('gate: selfDonAtMostOpponent (self DON!! ≤ opponent DON!!)', () => {
  it('fires the ability when the controller has FEWER DON!! than the opponent', () => {
    expect(handSizeAfterOnPlay(2, 5)).toBe(1);
  });

  it('fires the ability when both players have EQUAL DON!!', () => {
    expect(handSizeAfterOnPlay(4, 4)).toBe(1);
  });

  it('does NOT fire when the controller has MORE DON!! than the opponent', () => {
    expect(handSizeAfterOnPlay(6, 3)).toBe(0);
  });
});
