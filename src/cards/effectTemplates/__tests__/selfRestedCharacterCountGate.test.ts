/**
 * Engine-capability test for the `selfRestedCharacterCount` AbilityGate added for the OP09/OP10
 * ODYSSEY archetype: "If you have N or more rested Characters, …".
 *
 * The gate counts only the controller's Characters whose orientation is 'rested' (active ones and
 * the opponent's do not count). Synthetic cards + a generic assignment — the gate, not a card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const BODY = makeCharacterDef({ cardDefinitionId: 'SYN-BODY', cardNumber: 'SYN-BODY', category: 'character', baseCost: 1, basePower: 1000 });
const DECK = makeCharacterDef({ cardDefinitionId: 'SYN-DECK', cardNumber: 'SYN-DECK', category: 'character', baseCost: 1, basePower: 1000 });

const assignment: CardEffectAssignment = {
  cardNumber: 'SYN-SRC',
  templateId: 'ability',
  params: { timing: 'onPlay', gate: [{ kind: 'selfRestedCharacterCount', atLeast: 2 }], functions: [{ fn: 'draw', amount: 1 }] },
};

// Returns how many cards were drawn (1 if the gate held, 0 otherwise) given restedCount rested
// Characters on the controller's board plus one active Character and one rested opponent Character
// (neither of which should count toward the controller's rested total).
function drewWith(restedControllerChars: number): number {
  const registry = buildRegistryFromAssignments([assignment]);
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
  let srcId: string;
  ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC)); // active source, does not count
  ({ rig } = putDeckCards(rig, 'p1', DECK, 5));
  for (let i = 0; i < restedControllerChars; i += 1) ({ rig } = putCharacterInPlay(rig, 'p1', BODY, { orientation: 'rested' }));
  putCharacterInPlay(rig, 'p1', BODY, { orientation: 'active' }); // active, excluded
  ({ rig } = putCharacterInPlay(rig, 'p2', BODY, { orientation: 'rested' })); // opponent, excluded
  const before = rig.state.players.p1.hand.cardIds.length;
  const after = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, srcId, rig.defs, null, registry).state;
  return after.players.p1.hand.cardIds.length - before;
}

describe('gate: selfRestedCharacterCount (N+ rested Characters you control)', () => {
  it('fires when the controller has at least the required number of rested Characters', () => {
    expect(drewWith(2)).toBe(1);
    expect(drewWith(3)).toBe(1);
  });

  it('does NOT fire with too few rested Characters (active/opponent ones do not count)', () => {
    expect(drewWith(1)).toBe(0);
    expect(drewWith(0)).toBe(0);
  });
});
