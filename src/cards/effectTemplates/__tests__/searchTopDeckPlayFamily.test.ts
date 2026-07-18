/**
 * Engine-capability test for searchTopDeck destination: 'play'.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import type { CardDefinition, CardInstance } from '../../../engine/state/card';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3, basePower: 4000 });
const MATCH = makeCharacterDef({ cardDefinitionId: 'SYN-MATCH', cardNumber: 'SYN-MATCH', category: 'character', baseCost: 2, basePower: 3000 });
const OFF = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', category: 'character', baseCost: 5, basePower: 6000 });

function withDeck(rig: ReturnType<typeof buildBaseRig>, defs: CardDefinition[]) {
  const deckIds = defs.map((_, i) => `deck-${i}`);
  return {
    rig: {
      defs: Object.fromEntries([...Object.entries(rig.defs), ...defs.map((def) => [def.cardDefinitionId, def])]),
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          ...Object.fromEntries(defs.map((def, i) => [deckIds[i], {
            instanceId: deckIds[i],
            cardDefinitionId: def.cardDefinitionId,
            ownerId: 'p1',
            controllerId: 'p1',
            currentZone: 'deck',
            orientation: null,
            faceState: 'faceDown',
            donAttached: [],
            appliedContinuousEffectIds: [],
            oncePerTurnUsed: [],
            summoningSick: false,
            revealedTo: [],
          } satisfies CardInstance])),
        },
        players: { ...rig.state.players, p1: { ...rig.state.players.p1, deck: { ...rig.state.players.p1.deck, cardIds: deckIds } } },
      },
    },
    deckIds,
  };
}

describe('family: searchTopDeck play destination', () => {
  it('plays a matching looked card rested and bottoms the rest', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'activateMain', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: false, destination: 'play', filter: { category: 'character', maxCost: 2 }, remainder: 'bottom', rested: true }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const seeded = withDeck(rig, [OFF, MATCH, OFF]);
    rig = seeded.rig;

    const fired = runTimings(registry['SYN-SRC'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const pickChoice = fired.state.pendingChoices[0];
    expect(pickChoice.constraints.candidateInstanceIds).toEqual([seeded.deckIds[1]]);
    const picked = resumeProgram(registry['SYN-SRC'], fired.state, pickChoice, [seeded.deckIds[1]], rig.defs, null, registry);
    const orderChoice = picked.state.pendingChoices[0];
    const resolved = resumeProgram(registry['SYN-SRC'], picked.state, orderChoice, [seeded.deckIds[2], seeded.deckIds[0]], rig.defs, null, registry).state;

    const played = resolved.players.p1.characterArea.cardIds
      .map((id) => resolved.cardsById[id])
      .find((card) => card.cardDefinitionId === MATCH.cardDefinitionId);
    expect(played?.orientation).toBe('rested');
    expect(resolved.players.p1.deck.cardIds).toEqual([seeded.deckIds[2], seeded.deckIds[0]]);
  });

  it("trashes up to N looked cards (destination: 'trash', OP03-083) and bottoms the rest", () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-SRC',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 2, reveal: true, destination: 'trash', remainder: 'bottom' }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const seeded = withDeck(rig, [MATCH, OFF, MATCH]);
    rig = seeded.rig;

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const pickChoice = fired.state.pendingChoices[0];
    expect(pickChoice.constraints.max).toBe(2); // "trash up to 2"
    // Trash the first two looked cards; the third goes to the bottom.
    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, pickChoice, [seeded.deckIds[0], seeded.deckIds[1]], rig.defs, null, registry).state;

    expect(resolved.players.p1.trash.cardIds).toEqual(expect.arrayContaining([seeded.deckIds[0], seeded.deckIds[1]]));
    expect(resolved.cardsById[seeded.deckIds[0]].currentZone).toBe('trash');
    expect(resolved.players.p1.deck.cardIds).toContain(seeded.deckIds[2]); // remainder bottomed, stays in deck
    expect(resolved.players.p1.trash.cardIds).not.toContain(seeded.deckIds[2]);
  });
});
