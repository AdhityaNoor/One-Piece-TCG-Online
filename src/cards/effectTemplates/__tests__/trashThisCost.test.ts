/**
 * Engine-capability test for the `trashThis` AbilityCost added for the many
 * `[Activate: Main] You may trash this Character: <effect>` cards (OP07-003, OP08-059, OP10-075, …).
 *
 * `trashThis` is a COST (ability wrapper), paid in abilityCost.ts before the ops run — not a
 * `moveCards` effect. Paying it moves the source Character to its owner's trash; it is NOT a K.O.
 * (so it does not fire [On K.O.]). This test proves the payment moves the card and the effect
 * still resolves. Synthetic card + a generic assignment.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const DECK = makeCharacterDef({ cardDefinitionId: 'SYN-DECK', cardNumber: 'SYN-DECK', category: 'character', baseCost: 1, basePower: 1000 });

describe('cost: trashThis (trash the source Character to pay an ability)', () => {
  it('moves the source from the character area to its owner trash, then runs the effect', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'activateMain', cost: [{ kind: 'trashThis' }], functions: [{ fn: 'draw', amount: 1 }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    ({ rig } = putDeckCards(rig, 'p1', DECK, 5));
    const handBefore = rig.state.players.p1.hand.cardIds.length;

    const state = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;

    // Cost paid: source Character is now in its owner's trash, gone from the character area.
    expect(state.cardsById[srcId].currentZone).toBe('trash');
    expect(state.players.p1.characterArea.cardIds).not.toContain(srcId);
    expect(state.players.p1.trash.cardIds).toContain(srcId);
    // Effect still resolved.
    expect(state.players.p1.hand.cardIds.length - handBefore).toBe(1);
  });
});
