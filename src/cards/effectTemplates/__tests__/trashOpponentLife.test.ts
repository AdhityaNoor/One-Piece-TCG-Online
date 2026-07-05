/**
 * Engine-capability test for moving an opponent's Life card to trash.
 * Synthetic card + generic assignment.
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putLifeCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

describe('family: move opponent Life card to trash', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-LIFE',
    templateId: 'ability',
    params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] },
  };
  const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE', cardNumber: 'SYN-LIFE', category: 'character', baseCost: 1, basePower: 1000 });
  // hasTrigger: true so the test proves trashing does NOT route through the damage flow (which
  // would take the card to hand and offer to activate its [Trigger]).
  const LIFE = makeCharacterDef({ cardDefinitionId: 'SYN-LIFECARD', cardNumber: 'SYN-LIFECARD', category: 'character', baseCost: 2, basePower: 3000, hasTrigger: true });

  it('moves the top Life card of the opponent to their trash', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    let lifeIds: string[];
    ({ rig, lifeIds } = putLifeCards(rig, 'p2', [LIFE, LIFE, LIFE]));
    const topLifeId = lifeIds[0];

    const state = runTimings(registry['SYN-LIFE'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;

    expect(state.players.p2.lifeArea.cardIds).toHaveLength(2);
    expect(state.players.p2.lifeArea.cardIds).not.toContain(topLifeId);
    expect(state.players.p2.trash.cardIds).toContain(topLifeId);
    expect(state.cardsById[topLifeId].currentZone).toBe('trash');
  });

  it('trashes DIRECTLY — the card does not go to hand and no [Trigger] is prompted (unlike taking damage)', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    let lifeIds: string[];
    ({ rig, lifeIds } = putLifeCards(rig, 'p2', [LIFE, LIFE]));
    const topLifeId = lifeIds[0];

    const result = runTimings(registry['SYN-LIFE'], ['activateMain'], rig.state, srcId, rig.defs, null, registry);

    // Straight to trash: NOT added to the opponent's hand...
    expect(result.state.players.p2.hand.cardIds).not.toContain(topLifeId);
    expect(result.state.players.p2.trash.cardIds).toContain(topLifeId);
    // ...and NO "activate [Trigger]?" choice is raised, even though the Life card hasTrigger.
    expect(result.pendingChoices).toEqual([]);
  });

  it('is a no-op when the opponent has no Life cards', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', SRC));
    const state = runTimings(registry['SYN-LIFE'], ['activateMain'], rig.state, srcId, rig.defs, null, registry).state;
    expect(state.players.p2.trash.cardIds).toHaveLength(0);
  });
});
