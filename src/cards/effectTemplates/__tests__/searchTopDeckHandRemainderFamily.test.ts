/**
 * searchTopDeck: pick to hand, then place the remainder at top or bottom.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import type { CardDefinition, CardInstance } from '../../../engine/state/card';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3 });
const WARLORD = makeCharacterDef({ cardDefinitionId: 'SYN-WL', cardNumber: 'SYN-WL', category: 'character', baseCost: 4, types: ['The Seven Warlords of the Sea'] });
const FILLER = makeCharacterDef({ cardDefinitionId: 'SYN-FILL', cardNumber: 'SYN-FILL', category: 'character', baseCost: 1 });

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

describe('family: searchTopDeck hand + deckTopOrBottom remainder', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'searchTopDeck', look: 2, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'The Seven Warlords of the Sea' }, remainder: 'deckTopOrBottom' }],
    },
  };

  it('adds the match to hand and places the rest on the bottom', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const seeded = withDeck(rig, [FILLER, WARLORD]);
    rig = seeded.rig;

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const handChoice = fired.state.pendingChoices[0];
    expect(handChoice.constraints.candidateInstanceIds).toEqual([seeded.deckIds[1]]);

    const afterHand = resumeProgram(registry['SYN-SRC'], fired.state, handChoice, [seeded.deckIds[1]], rig.defs, null, registry);
    const topChoice = afterHand.state.pendingChoices[0];
    expect(topChoice.constraints.candidateInstanceIds).toEqual([seeded.deckIds[0]]);

    const resolved = resumeProgram(registry['SYN-SRC'], afterHand.state, topChoice, [], rig.defs, null, registry).state;
    expect(resolved.players.p1.hand.cardIds).toContain(seeded.deckIds[1]);
    expect(resolved.players.p1.deck.cardIds).toEqual([seeded.deckIds[0]]);
    expect(resolved.cardsById[seeded.deckIds[0]].currentZone).toBe('deck');
  });
});
