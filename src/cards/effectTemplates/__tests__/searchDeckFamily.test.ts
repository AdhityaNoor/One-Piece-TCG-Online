/**
 * Engine-capability test for full-deck search to hand, then shuffle.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import type { CardDefinition, CardInstance } from '../../../engine/state/card';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-FULL-DECK-SRC', cardNumber: 'SYN-FULL-DECK-SRC', category: 'character', baseCost: 3 });
const MATCH = makeCharacterDef({ cardDefinitionId: 'SYN-SMILE', cardNumber: 'SYN-SMILE', category: 'event', name: 'Artificial Devil Fruit SMILE' });
const OFF = makeCharacterDef({ cardDefinitionId: 'SYN-OFF', cardNumber: 'SYN-OFF', category: 'character', baseCost: 2 });

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

describe('family: searchDeck to hand', () => {
  it('reveals a matching deck card to hand and shuffles the rest', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-FULL-DECK-SRC',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'searchDeck', pick: 1, reveal: true, destination: 'hand', filter: { name: 'Artificial Devil Fruit SMILE' } }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const seeded = withDeck(rig, [OFF, MATCH, OFF]);
    rig = seeded.rig;

    const fired = runTimings(registry['SYN-FULL-DECK-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];

    expect(choice.constraints.candidateInstanceIds).toEqual([seeded.deckIds[1]]);
    expect(choice.constraints.visibleInstanceIds).toEqual(seeded.deckIds);

    const resolved = resumeProgram(registry['SYN-FULL-DECK-SRC'], fired.state, choice, [seeded.deckIds[1]], rig.defs, null, registry).state;

    expect(resolved.players.p1.hand.cardIds).toContain(seeded.deckIds[1]);
    expect(resolved.cardsById[seeded.deckIds[1]].revealedTo).toBe('all');
    expect(resolved.players.p1.deck.cardIds).toHaveLength(2);
    expect(new Set(resolved.players.p1.deck.cardIds)).toEqual(new Set([seeded.deckIds[0], seeded.deckIds[2]]));
  });
});
