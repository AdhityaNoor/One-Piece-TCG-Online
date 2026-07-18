/**
 * OP15-022 Brook: empty-deck defeat deferral + Activate Main Then with deck at 0.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { executeEndMainPhase } from '../../../engine/actions/handlers/endMainPhase';
import { runEndPhaseAndHandoff } from '../../../engine/rules/phases';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

const BROOK: CardEffectAssignment = {
  cardNumber: 'OP15-022',
  templates: [
    {
      templateId: 'ability',
      params: {
        timing: 'startOfGame',
        functions: [{ fn: 'deferEmptyDeckDefeatToEndOfTurn' }],
      },
    },
    {
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        oncePerTurn: true,
        functions: [
          { fn: 'trashTopDeck', count: 4 },
          {
            fn: 'setActiveControllerCharacter',
            maxTargets: 1,
            filter: { rested: true },
            ifGate: [{ kind: 'selfDeckCount', atMost: 0 }],
          },
        ],
      },
    },
  ],
};

const CHAR = makeCharacterDef({
  cardDefinitionId: 'OP15-CHAR',
  cardNumber: 'OP15-CHAR',
  category: 'character',
  baseCost: 3,
  basePower: 4000,
});

describe('OP15-022 Brook empty-deck rules', () => {
  it('Activate Main Then still offers set-active when the deck is already 0', () => {
    const registry = buildRegistryFromAssignments([BROOK]);
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: { cardDefinitionId: 'OP15-022', cardNumber: 'OP15-022' },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const defs = { ...rig.defs, [CHAR.cardDefinitionId]: CHAR };

    const afterDefer = runTimings(registry['OP15-022'], ['startOfGame'], rig.state, leaderId, defs, null, registry);
    rig = { ...rig, state: afterDefer.state, defs };

    let restedId: string;
    ({ rig, instanceId: restedId } = putCharacterInPlay(rig, 'p1', CHAR, { orientation: 'rested' }));
    expect(rig.state.players.p1.deck.cardIds).toHaveLength(0);

    const fired = runTimings(registry['OP15-022'], ['activateMain'], rig.state, leaderId, rig.defs, null, registry);
    expect(fired.state.gameOver).toBeNull();
    const choice = fired.state.pendingChoices[0];
    expect(choice).toBeDefined();
    expect(choice.constraints.candidateInstanceIds).toContain(restedId);

    const resolved = resumeProgram(registry['OP15-022'], fired.state, choice, [restedId], rig.defs, null, registry);
    expect(resolved.state.cardsById[restedId].orientation).toBe('active');
    expect(resolved.state.gameOver).toBeNull();
  });

  it('mills to 0, Then set-active works, then loses at end of turn (not next Refresh/Draw)', () => {
    const registry = buildRegistryFromAssignments([BROOK]);
    const deckDef = makeCharacterDef({ cardDefinitionId: 'MILL-FODDER', cardNumber: 'MILL-001' });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: { cardDefinitionId: 'OP15-022', cardNumber: 'OP15-022' },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    const defs = { ...rig.defs, [CHAR.cardDefinitionId]: CHAR, [deckDef.cardDefinitionId]: deckDef };

    const deferred = runTimings(registry['OP15-022'], ['startOfGame'], rig.state, leaderId, defs, null, registry);
    rig = { ...rig, state: deferred.state, defs };

    let restedId: string;
    ({ rig, instanceId: restedId } = putCharacterInPlay(rig, 'p1', CHAR, { orientation: 'rested' }));
    ({ rig } = putDeckCards(rig, 'p1', deckDef, 4));
    ({ rig } = putDeckCards(rig, 'p2', deckDef, 3));

    const fired = runTimings(registry['OP15-022'], ['activateMain'], rig.state, leaderId, rig.defs, null, registry);
    expect(fired.state.players.p1.deck.cardIds).toHaveLength(0);
    expect(fired.state.players.p1.deckBecameZeroThisTurn).toBe(true);
    expect(fired.state.gameOver).toBeNull();

    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toContain(restedId);
    const afterThen = resumeProgram(registry['OP15-022'], fired.state, choice, [restedId], rig.defs, null, registry);
    expect(afterThen.state.cardsById[restedId].orientation).toBe('active');
    expect(afterThen.state.gameOver).toBeNull();

    // Ending Main with deferral must NOT lose yet (cardEffect loss is end-of-turn).
    const afterMain = executeEndMainPhase(afterThen.state, {
      type: 'END_MAIN_PHASE',
      actionId: nextTestId('end-main'),
      playerId: 'p1',
    });
    expect(afterMain.state.gameOver).toBeNull();
    expect(afterMain.state.currentPhase).toBe('end');

    const ended = runEndPhaseAndHandoff(afterMain.state, rig.defs, registry);
    expect(ended.state.gameOver).toEqual({ winnerId: 'p2', reason: 'cardEffect' });
  });

  it('without Brook deferral, ending Main with empty deck loses immediately (9-2-1-2)', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const deckDef = makeCharacterDef({ cardDefinitionId: 'DECK-P2', cardNumber: 'DECK-P2' });
    ({ rig } = putDeckCards(rig, 'p2', deckDef, 2));
    // p1 deck empty
    const ended = executeEndMainPhase(rig.state, {
      type: 'END_MAIN_PHASE',
      actionId: nextTestId('end-main'),
      playerId: 'p1',
    });
    expect(ended.state.gameOver).toEqual({ winnerId: 'p2', reason: 'deckedOut' });
  });
});
