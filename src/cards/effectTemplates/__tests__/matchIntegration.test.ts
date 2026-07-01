import { describe, expect, it } from 'vitest';
import { executeAction, validateAction } from '../../../engine/actions';
import { makeCharacterDef, buildBaseRig, putCharacterInPlay, putDeckCards, putInHand, nextTestId } from '../../../engine/rules/shared/__tests__/testRig';
import { computeCurrentCost } from '../../../engine/rules/shared';
import { buildCuratedEffectRegistry } from '../curatedPrograms';

describe('curated effect template integration with match engine dispatch', () => {
  it('injects curated composed templates into play, attack, and pending-choice resume', () => {
    const spandam = makeCharacterDef({
      cardDefinitionId: 'OP02-096',
      cardNumber: 'OP02-096',
      name: 'Spandam',
      category: 'character',
      baseCost: 0,
      basePower: 3000,
    });
    const drawCard = makeCharacterDef({
      cardDefinitionId: 'TEST-DRAW-CARD',
      cardNumber: 'TEST-DRAW-CARD',
      name: 'Deck Card',
      category: 'character',
    });
    const opponentCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-OPPONENT-CHARACTER',
      cardNumber: 'TEST-OPPONENT-CHARACTER',
      name: 'Opponent Character',
      category: 'character',
      baseCost: 5,
      basePower: 5000,
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let drawnId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', spandam));
    ({ rig, deckIds: [drawnId] } = putDeckCards(rig, 'p1', drawCard, 1));

    const registry = buildCuratedEffectRegistry(rig.defs);
    expect(Object.keys(registry)).toEqual(['OP02-096']);

    const playAction = {
      type: 'PLAY_CHARACTER',
      actionId: nextTestId('action'),
      playerId: 'p1',
      handCardInstanceId: handId,
      donInstanceIds: [],
    } as const;
    expect(validateAction(rig.state, playAction, rig.defs, registry)).toEqual({ legal: true, reasons: [] });

    let result = executeAction(rig.state, playAction, rig.defs, registry);
    let state = result.state;
    const playedId = state.players.p1.characterArea.cardIds[0];

    expect(playedId).toBeDefined();
    expect(state.cardsById[playedId].cardDefinitionId).toBe('OP02-096');
    expect(state.players.p1.hand.cardIds).toContain(drawnId);
    expect(state.players.p1.deck.cardIds).not.toContain(drawnId);
    expect(state.pendingChoices).toEqual([]);

    state = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [playedId]: { ...state.cardsById[playedId], summoningSick: false, orientation: 'active' },
      },
    };

    let opponentId: string;
    ({ rig, instanceId: opponentId } = putCharacterInPlay({ state, defs: rig.defs }, 'p2', opponentCharacter));
    state = rig.state;

    const attackAction = {
      type: 'DECLARE_ATTACK',
      actionId: nextTestId('action'),
      playerId: 'p1',
      attackerInstanceId: playedId,
      targetInstanceId: state.players.p2.leaderInstanceId,
    } as const;
    expect(validateAction(state, attackAction, rig.defs, registry)).toEqual({ legal: true, reasons: [] });

    result = executeAction(state, attackAction, rig.defs, registry);
    state = result.state;

    const choice = state.pendingChoices[0];
    expect(choice).toMatchObject({
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      sourceInstanceId: playedId,
      sourceEffectId: 'ir',
      constraints: { min: 0, max: 1, candidateInstanceIds: [opponentId] },
    });

    const resolveAction = {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: nextTestId('action'),
      playerId: 'p1',
      choiceId: choice.id,
      response: [opponentId],
    } as const;
    expect(validateAction(state, resolveAction, rig.defs, registry)).toEqual({ legal: true, reasons: [] });

    result = executeAction(state, resolveAction, rig.defs, registry);
    state = result.state;

    expect(state.pendingChoices).toEqual([]);
    expect(state.continuousEffects).toContainEqual(
      expect.objectContaining({
        sourceInstanceId: playedId,
        duration: 'duringThisTurn',
        costModifier: { appliesToInstanceId: opponentId, amount: -4 },
      }),
    );
    expect(computeCurrentCost(rig.defs, state, opponentId)).toBe(1);
  });
});
