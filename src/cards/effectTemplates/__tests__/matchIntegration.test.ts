import { describe, expect, it } from 'vitest';
import { executeAction, validateAction } from '../../../engine/actions';
import { makeCharacterDef, makeEventDef, buildBaseRig, putCharacterInPlay, putDeckCards, putInHand, nextTestId } from '../../../engine/rules/shared/__tests__/testRig';
import { computeCurrentCost } from '../../../engine/rules/shared';
import { buildRegistryFromAssignments } from '../assembler';
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

  it('applies reusable search filters with OR branches, color, and exact power', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-SEARCHER',
      cardNumber: 'TEST-SEARCHER',
      name: 'Searcher',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const sanji = makeCharacterDef({
      cardDefinitionId: 'TEST-SANJI',
      cardNumber: 'TEST-SANJI',
      name: 'Sanji',
      category: 'character',
      basePower: 4000,
    });
    const redEvent = makeEventDef({
      cardDefinitionId: 'TEST-RED-EVENT',
      cardNumber: 'TEST-RED-EVENT',
      name: 'Red Event',
      category: 'event',
      colors: ['red'],
    });
    const exactPowerCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-POWER-6000',
      cardNumber: 'TEST-POWER-6000',
      name: '6000 Power Character',
      category: 'character',
      basePower: 6000,
    });
    const blueEvent = makeEventDef({
      cardDefinitionId: 'TEST-BLUE-EVENT',
      cardNumber: 'TEST-BLUE-EVENT',
      name: 'Blue Event',
      category: 'event',
      colors: ['blue'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let sanjiId: string;
    let redEventId: string;
    let exactPowerId: string;
    let blueEventId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, deckIds: [sanjiId] } = putDeckCards(rig, 'p1', sanji, 1));
    ({ rig, deckIds: [redEventId] } = putDeckCards(rig, 'p1', redEvent, 1));
    ({ rig, deckIds: [exactPowerId] } = putDeckCards(rig, 'p1', exactPowerCharacter, 1));
    ({ rig, deckIds: [blueEventId] } = putDeckCards(rig, 'p1', blueEvent, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-SEARCHER',
        templateId: 'onPlaySearchTopDeck',
        params: {
          look: 4,
          pick: 1,
          filter: {
            anyOf: [
              { name: 'Sanji' },
              { category: 'event', color: 'red' },
              { category: 'character', exactPower: 6000 },
            ],
          },
        },
      },
    ]);

    const playAction = {
      type: 'PLAY_CHARACTER',
      actionId: nextTestId('action'),
      playerId: 'p1',
      handCardInstanceId: handId,
      donInstanceIds: [],
    } as const;
    const result = executeAction(rig.state, playAction, rig.defs, registry);

    expect(result.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'ir',
      constraints: {
        min: 0,
        max: 1,
        candidateInstanceIds: [sanjiId, redEventId, exactPowerId],
        visibleInstanceIds: [sanjiId, redEventId, exactPowerId, blueEventId],
      },
    });
  });

  it('can search top deck and trash the non-chosen remainder', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-TRASH-SEARCHER',
      cardNumber: 'TEST-TRASH-SEARCHER',
      name: 'Trash Searcher',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const navyOne = makeCharacterDef({
      cardDefinitionId: 'TEST-NAVY-1',
      cardNumber: 'TEST-NAVY-1',
      name: 'Navy One',
      types: ['Navy'],
    });
    const navyTwo = makeCharacterDef({
      cardDefinitionId: 'TEST-NAVY-2',
      cardNumber: 'TEST-NAVY-2',
      name: 'Navy Two',
      types: ['Navy'],
    });
    const offType = makeCharacterDef({
      cardDefinitionId: 'TEST-OFF-TYPE',
      cardNumber: 'TEST-OFF-TYPE',
      name: 'Off Type',
      types: ['Animal'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let navyOneId: string;
    let navyTwoId: string;
    let offTypeId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, deckIds: [navyOneId] } = putDeckCards(rig, 'p1', navyOne, 1));
    ({ rig, deckIds: [navyTwoId] } = putDeckCards(rig, 'p1', navyTwo, 1));
    ({ rig, deckIds: [offTypeId] } = putDeckCards(rig, 'p1', offType, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-TRASH-SEARCHER',
        templateId: 'onPlaySearchTopDeck',
        params: { look: 3, pick: 1, filter: { typeIncludes: 'Navy' }, remainder: 'trash' },
      },
    ]);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = playResult.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual([navyOneId, navyTwoId]);

    const resolveResult = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [navyOneId] },
      rig.defs,
      registry,
    );

    expect(resolveResult.state.pendingChoices).toEqual([]);
    expect(resolveResult.state.players.p1.hand.cardIds).toContain(navyOneId);
    expect(resolveResult.state.players.p1.trash.cardIds).toEqual([offTypeId, navyTwoId]);
    expect(resolveResult.state.players.p1.deck.cardIds).toEqual([]);
  });
});
