/**
 * Engine-capability tests for activateEventFromHand / activateEventFromTrash.
 */
import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../../../engine/effects/effectIr';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  makeLeaderDef,
  putCharacterInPlay,
  putDeckCards,
  putInHand,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const SRC = makeCharacterDef({ cardDefinitionId: 'SYN-SRC', cardNumber: 'SYN-SRC', category: 'character', baseCost: 3 });
const EVENT_MATCH = makeEventDef({
  cardDefinitionId: 'SYN-EVT-MATCH',
  cardNumber: 'SYN-EVT-MATCH',
  baseCost: 2,
  types: ['Dressrosa'],
});
const EVENT_OFF = makeEventDef({
  cardDefinitionId: 'SYN-EVT-OFF',
  cardNumber: 'SYN-EVT-OFF',
  baseCost: 2,
  types: ['East Blue'],
});
const TRASH_EVENT = makeEventDef({
  cardDefinitionId: 'SYN-EVT-TRASH',
  cardNumber: 'SYN-EVT-TRASH',
  baseCost: 5,
});

function eventDrawProgram(defId: string): EffectProgram {
  return {
    cardNumber: defId,
    abilities: [{ timing: 'activateMain', ops: [{ op: 'draw', amount: 1 }] }],
  };
}

describe('family: activateEventFromHand', () => {
  const saboAssignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      gate: [{ kind: 'leaderType', type: 'Dressrosa' }],
      functions: [{ fn: 'activateEventFromHand', filter: { category: 'event', typeIncludes: 'Dressrosa' }, maxTargets: 1 }],
    },
  };

  it('moves the chosen Event to trash and resolves its [Main] effect', () => {
    const dressrosaLeader = makeLeaderDef({ cardDefinitionId: 'LD-DRESS', cardNumber: 'LD-DRESS', types: ['Dressrosa'] });
    const registry = {
      ...buildRegistryFromAssignments([saboAssignment]),
      [EVENT_MATCH.cardDefinitionId]: eventDrawProgram(EVENT_MATCH.cardDefinitionId),
    };
    let rig = buildBaseRig({ activePlayerId: 'p1', leaderOverridesP1: dressrosaLeader });
    const filler = makeCharacterDef({ cardDefinitionId: 'FILLER', cardNumber: 'FILLER' });
    rig = putDeckCards(rig, 'p1', filler, 1).rig;
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));
    const match = putInHand(rig, 'p1', EVENT_MATCH);
    rig = match.rig;
    const off = putInHand(rig, 'p1', EVENT_OFF);
    rig = off.rig;

    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(match.instanceId);
    expect(choice.constraints.candidateInstanceIds).not.toContain(off.instanceId);

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice, [match.instanceId], rig.defs, null, registry).state;
    expect(resolved.players.p1.hand.cardIds).not.toContain(match.instanceId);
    expect(resolved.players.p1.hand.cardIds).toContain(off.instanceId);
    expect(resolved.cardsById[match.instanceId].currentZone).toBe('trash');
    expect(resolved.players.p1.deck.cardIds.length).toBe(0);
  });
});

describe('family: activateEventFromTrash', () => {
  const trashAssignment: CardEffectAssignment = {
    cardNumber: 'SYN-SRC',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'activateEventFromTrash', filter: { category: 'event', maxCost: 7 }, maxTargets: 1 }],
    },
  };

  it('activates a matching Event already in trash', () => {
    const registry = {
      ...buildRegistryFromAssignments([trashAssignment]),
      [TRASH_EVENT.cardDefinitionId]: eventDrawProgram(TRASH_EVENT.cardDefinitionId),
    };
    let rig = buildBaseRig({ activePlayerId: 'p1' });
    const filler = makeCharacterDef({ cardDefinitionId: 'FILLER-2', cardNumber: 'FILLER-2' });
    rig = putDeckCards(rig, 'p1', filler, 1).rig;
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', SRC));

    const trashInstId = 'trash-event-1';
    const trashInst = {
      instanceId: trashInstId,
      cardDefinitionId: TRASH_EVENT.cardDefinitionId,
      ownerId: 'p1' as const,
      controllerId: 'p1' as const,
      currentZone: 'trash' as const,
      orientation: null,
      faceState: 'faceUp' as const,
      donAttached: [] as string[],
      appliedContinuousEffectIds: [] as string[],
      oncePerTurnUsed: [] as string[],
      summoningSick: false,
      revealedTo: 'all' as const,
    };
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: { ...rig.state.cardsById, [trashInstId]: trashInst },
        players: {
          ...rig.state.players,
          p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: [trashInstId] } },
        },
      },
      defs: { ...rig.defs, [TRASH_EVENT.cardDefinitionId]: TRASH_EVENT },
    };

    const deckBefore = rig.state.players.p1.deck.cardIds.length;
    const fired = runTimings(registry['SYN-SRC'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices.find((c) => c.kind === 'SELECT_CARDS');
    expect(choice?.constraints.candidateInstanceIds).toContain(trashInstId);

    const resolved = resumeProgram(registry['SYN-SRC'], fired.state, choice!, [trashInstId], rig.defs, null, registry).state;
    expect(resolved.cardsById[trashInstId].currentZone).toBe('trash');
    expect(resolved.players.p1.deck.cardIds.length).toBe(deckBefore - 1);
  });
});
