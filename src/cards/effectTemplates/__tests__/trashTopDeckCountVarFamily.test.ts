/**
 * trashTopDeck.countVar mills by the length of a prior hand-trash selection (OP09-059).
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import type { CardDefinition, CardInstance } from '../../../engine/state/card';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', baseCost: 3 });
const HAND = makeCharacterDef({ cardDefinitionId: 'SYN-HAND', cardNumber: 'SYN-HAND', baseCost: 1 });
const DECK = makeCharacterDef({ cardDefinitionId: 'SYN-DECK', cardNumber: 'SYN-DECK', baseCost: 2 });

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

describe('family: trashTopDeck countVar after hand trash', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: {
      timing: 'counter',
      functions: [
        { fn: 'optionalTrashFromHand', count: 2 },
        { fn: 'trashTopDeck', countVar: 't', ifPrevious: 'previousMovedAny' },
      ],
    },
  };

  it('mills the same number of deck cards as were trashed from hand', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'counter', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    let handA: string;
    let handB: string;
    ({ rig, instanceId: handA } = putInHand(rig, 'p1', HAND));
    ({ rig, instanceId: handB } = putInHand(rig, 'p1', HAND));
    const seeded = withDeck(rig, [DECK, DECK, DECK]);
    rig = seeded.rig;

    const fired = runTimings(registry['SYN-SRC'], ['counter'], rig.state, sourceId, rig.defs, null, registry);
    const handChoice = fired.state.pendingChoices[0];
    expect(handChoice.constraints.max).toBe(2);

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, handChoice, [handA, handB], rig.defs, null, registry).state;
    expect(resolved.players.p1.hand.cardIds).not.toContain(handA);
    expect(resolved.players.p1.hand.cardIds).not.toContain(handB);
    expect(resolved.players.p1.trash.cardIds).toEqual(expect.arrayContaining([handA, handB, seeded.deckIds[0], seeded.deckIds[1]]));
    expect(resolved.players.p1.deck.cardIds).toEqual([seeded.deckIds[2]]);
  });
});
