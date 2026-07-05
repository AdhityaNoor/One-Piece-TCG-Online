import { describe, expect, it } from 'vitest';
import { executeAction, validateAction } from '../../../engine/actions';
import { makeCharacterDef, makeEventDef, buildBaseRig, putCharacterInPlay, putDeckCards, putDon, putInHand, putLifeCards, nextTestId } from '../../../engine/rules/shared/__tests__/testRig';
import { computeCurrentCost } from '../../../engine/rules/shared';
import { buildRegistryFromAssignments } from '../assembler';
import { buildCuratedEffectRegistry } from '../curatedPrograms';

describe('curated effect template integration with match engine dispatch', () => {
  it('pauses automatic DON!! -N triggered abilities for selected DON, pays it, then resolves ops', () => {
    const attacker = makeCharacterDef({
      cardDefinitionId: 'TEST-WHEN-ATTACKING-DON-MINUS',
      cardNumber: 'TEST-WHEN-ATTACKING-DON-MINUS',
      name: 'Costed Attacker',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
    });
    const drawCard = makeCharacterDef({
      cardDefinitionId: 'TEST-COST-DRAW',
      cardNumber: 'TEST-COST-DRAW',
      name: 'Cost Draw',
      category: 'character',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let attackerId: string;
    let drawId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', attacker, { summoningSick: false }));
    ({ rig, deckIds: [drawId] } = putDeckCards(rig, 'p1', drawCard, 1));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1, { rested: true });
    rig = withDon;

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: attacker.cardDefinitionId,
        templateId: 'ability',
        params: { timing: 'whenAttacking', cost: [{ kind: 'donMinus', count: 1 }], functions: [{ fn: 'draw', amount: 1 }] },
      },
    ]);

    const attackResult = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );
    const costChoice = attackResult.state.pendingChoices[0];
    expect(costChoice).toMatchObject({
      sourceEffectId: 'ir',
      sourceInstanceId: attackerId,
      constraints: { min: 1, max: 1, candidateInstanceIds: [donIds[0]] },
    });

    const resolved = executeAction(
      attackResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: costChoice.id, response: [donIds[0]] },
      rig.defs,
      registry,
    );

    expect(resolved.state.pendingChoices).toEqual([]);
    expect(resolved.state.players.p1.costArea.cardIds).not.toContain(donIds[0]);
    expect(resolved.state.players.p1.donDeck.cardIds).toContain(donIds[0]);
    expect(resolved.state.players.p1.hand.cardIds).toContain(drawId);
  });

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
        templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 4,
          pick: 1,
          reveal: true, destination: 'hand', filter: {
            anyOf: [
              { name: 'Sanji' },
              { category: 'event', color: 'red' },
              { category: 'character', exactPower: 6000 },
            ],
          } }] },
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

  it('wires ST03-004 trash recovery with OR type branches and self-name exclusion', () => {
    const geckoMoria = makeCharacterDef({
      cardDefinitionId: 'ST03-004',
      cardNumber: 'ST03-004',
      name: 'Gecko Moria',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
    });
    const warlordsCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-WARLORDS-TRASH',
      cardNumber: 'TEST-WARLORDS-TRASH',
      name: 'Warlords Character',
      category: 'character',
      baseCost: 4,
      types: ['The Seven Warlords of the Sea'],
    });
    const thrillerBarkCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-THRILLER-TRASH',
      cardNumber: 'TEST-THRILLER-TRASH',
      name: 'Thriller Bark Character',
      category: 'character',
      baseCost: 4,
      types: ['Thriller Bark Pirates'],
    });
    const sameNameCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-SAME-NAME-TRASH',
      cardNumber: 'TEST-SAME-NAME-TRASH',
      name: 'Gecko Moria',
      category: 'character',
      baseCost: 4,
      types: ['The Seven Warlords of the Sea'],
    });
    const overCostCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-OVER-COST-TRASH',
      cardNumber: 'TEST-OVER-COST-TRASH',
      name: 'Over Cost',
      category: 'character',
      baseCost: 5,
      types: ['Thriller Bark Pirates'],
    });
    const matchingEvent = makeEventDef({
      cardDefinitionId: 'TEST-WARLORDS-EVENT-TRASH',
      cardNumber: 'TEST-WARLORDS-EVENT-TRASH',
      name: 'Warlords Event',
      category: 'event',
      baseCost: 4,
      types: ['The Seven Warlords of the Sea'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', geckoMoria));

    const trashDefs = [warlordsCharacter, thrillerBarkCharacter, sameNameCharacter, overCostCharacter, matchingEvent];
    const trashIds = trashDefs.map((def) => nextTestId('trash-card'));
    rig = {
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          ...Object.fromEntries(
            trashDefs.map((def, index) => [
              trashIds[index],
              {
                instanceId: trashIds[index],
                cardDefinitionId: def.cardDefinitionId,
                ownerId: 'p1',
                controllerId: 'p1',
                currentZone: 'trash',
                orientation: null,
                faceState: 'faceUp',
                donAttached: [],
                appliedContinuousEffectIds: [],
                oncePerTurnUsed: [],
                summoningSick: false,
                revealedTo: 'all',
              },
            ]),
          ),
        },
        players: {
          ...rig.state.players,
          p1: { ...rig.state.players.p1, trash: { ...rig.state.players.p1.trash, cardIds: trashIds } },
        },
      },
      defs: { ...rig.defs, ...Object.fromEntries(trashDefs.map((def) => [def.cardDefinitionId, def])) },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );

    const choice = playResult.state.pendingChoices[0];
    expect(choice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: { min: 0, max: 1, candidateInstanceIds: [trashIds[0], trashIds[1]] },
    });

    const resolveResult = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [trashIds[1]] },
      rig.defs,
      registry,
    );

    expect(resolveResult.state.pendingChoices).toEqual([]);
    expect(resolveResult.state.players.p1.hand.cardIds).toContain(trashIds[1]);
    expect(resolveResult.state.players.p1.trash.cardIds).toEqual([trashIds[0], trashIds[2], trashIds[3], trashIds[4]]);
  });

  it('wires ST03-007 to rest DON, play Pacifista from deck, then shuffle', () => {
    const sentomaru = makeCharacterDef({
      cardDefinitionId: 'ST03-007',
      cardNumber: 'ST03-007',
      name: 'Sentomaru',
      category: 'character',
      baseCost: 3,
      basePower: 4000,
    });
    const pacifista = makeCharacterDef({
      cardDefinitionId: 'TEST-PACIFISTA',
      cardNumber: 'TEST-PACIFISTA',
      name: 'Pacifista',
      category: 'character',
      baseCost: 4,
      basePower: 6000,
    });
    const offTarget = makeCharacterDef({
      cardDefinitionId: 'TEST-NOT-PACIFISTA',
      cardNumber: 'TEST-NOT-PACIFISTA',
      name: 'Not Pacifista',
      category: 'character',
      baseCost: 4,
      basePower: 5000,
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceId: string;
    let pacifistaDeckId: string;
    let offDeckId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', sentomaru, { summoningSick: false }));
    ({ rig, deckIds: [pacifistaDeckId] } = putDeckCards(rig, 'p1', pacifista, 1));
    ({ rig, deckIds: [offDeckId] } = putDeckCards(rig, 'p1', offTarget, 1));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 3, { rested: false });
    rig = {
      ...withDon,
      state: {
        ...withDon.state,
        cardsById: {
          ...withDon.state.cardsById,
          [sourceId]: { ...withDon.state.cardsById[sourceId], donAttached: [donIds[0]] },
          [donIds[0]]: { ...withDon.state.cardsById[donIds[0]], donRested: true },
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const action = { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceId, effectId: 'activateMain', donInstanceIds: [] } as const;
    expect(validateAction(rig.state, action, rig.defs, registry)).toEqual({ legal: true, reasons: [] });

    const activateResult = executeAction(rig.state, action, rig.defs, registry);
    expect(activateResult.state.cardsById[donIds[1]].donRested).toBe(true);
    expect(activateResult.state.cardsById[donIds[2]].donRested).toBe(true);
    expect(activateResult.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'ir',
      constraints: {
        min: 0,
        max: 1,
        candidateInstanceIds: [pacifistaDeckId],
        visibleInstanceIds: [pacifistaDeckId, offDeckId],
      },
    });

    const choice = activateResult.state.pendingChoices[0];
    const resolveResult = executeAction(
      activateResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [pacifistaDeckId] },
      rig.defs,
      registry,
    );

    const playedPacifistaId = resolveResult.state.players.p1.characterArea.cardIds.find((id) => resolveResult.state.cardsById[id]?.cardDefinitionId === 'TEST-PACIFISTA');
    expect(playedPacifistaId).toBeDefined();
    expect(resolveResult.state.cardsById[pacifistaDeckId]).toBeUndefined();
    expect(resolveResult.state.players.p1.deck.cardIds).toEqual([offDeckId]);
    expect(resolveResult.state.pendingChoices).toEqual([]);
  });

  it('wires ST03-003 onBlock to bottom-deck a cost 2 or less Character', () => {
    const crocodileBlocker = makeCharacterDef({
      cardDefinitionId: 'ST03-003',
      cardNumber: 'ST03-003',
      name: 'Crocodile',
      category: 'character',
      baseCost: 4,
      basePower: 5000,
      hasBlocker: true,
    });
    const lowCostTarget = makeCharacterDef({
      cardDefinitionId: 'TEST-LOW-COST-BOTTOM',
      cardNumber: 'TEST-LOW-COST-BOTTOM',
      name: 'Low Cost Target',
      category: 'character',
      baseCost: 2,
      basePower: 3000,
    });
    const existingDeckCard = makeCharacterDef({
      cardDefinitionId: 'TEST-ST03-003-DECK-CARD',
      cardNumber: 'TEST-ST03-003-DECK-CARD',
      name: 'Existing Deck Card',
      category: 'character',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let blockerId: string;
    let targetId: string;
    let existingDeckId: string;
    ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p2', crocodileBlocker));
    ({ rig, instanceId: targetId } = putCharacterInPlay(rig, 'p1', lowCostTarget));
    ({ rig, deckIds: [existingDeckId] } = putDeckCards(rig, 'p1', existingDeckCard, 1));
    const { rig: withDon, donIds } = putDon(rig, 'p2', 1, { rested: true });
    rig = {
      ...withDon,
      state: {
        ...withDon.state,
        currentBattle: {
          attackerInstanceId: withDon.state.players.p1.leaderInstanceId,
          targetInstanceId: withDon.state.players.p2.leaderInstanceId,
          originalTargetInstanceId: withDon.state.players.p2.leaderInstanceId,
          step: 'block',
          blockerUsed: false,
          battlePowerBonuses: {},
        },
        cardsById: {
          ...withDon.state.cardsById,
          [blockerId]: { ...withDon.state.cardsById[blockerId], donAttached: [donIds[0]] },
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const blockResult = executeAction(
      rig.state,
      { type: 'ACTIVATE_BLOCKER', actionId: nextTestId('action'), playerId: 'p2', blockerInstanceId: blockerId },
      rig.defs,
      registry,
    );

    expect(blockResult.state.cardsById[blockerId].orientation).toBe('rested');
    expect(blockResult.state.currentBattle).toMatchObject({ targetInstanceId: blockerId, blockerUsed: true, step: 'counter' });
    const choice = blockResult.state.pendingChoices[0];
    expect(choice).toMatchObject({
      sourceEffectId: 'ir',
      sourceInstanceId: blockerId,
      constraints: { min: 0, max: 1, candidateInstanceIds: [targetId] },
    });

    const resolveResult = executeAction(
      blockResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p2', choiceId: choice.id, response: [targetId] },
      rig.defs,
      registry,
    );

    expect(resolveResult.state.pendingChoices).toEqual([]);
    expect(resolveResult.state.players.p1.characterArea.cardIds).not.toContain(targetId);
    expect(resolveResult.state.players.p1.deck.cardIds).toEqual([existingDeckId, targetId]);
  });

  it('wires ST03-010 to look top 3 and return cards to top or bottom in chosen order', () => {
    const kuma = makeCharacterDef({
      cardDefinitionId: 'ST03-010',
      cardNumber: 'ST03-010',
      name: 'Bartholomew Kuma',
      category: 'character',
      baseCost: 0,
      basePower: 6000,
      hasTrigger: true,
    });
    const first = makeCharacterDef({ cardDefinitionId: 'TEST-REORDER-FIRST', cardNumber: 'TEST-REORDER-FIRST', name: 'First' });
    const second = makeCharacterDef({ cardDefinitionId: 'TEST-REORDER-SECOND', cardNumber: 'TEST-REORDER-SECOND', name: 'Second' });
    const third = makeCharacterDef({ cardDefinitionId: 'TEST-REORDER-THIRD', cardNumber: 'TEST-REORDER-THIRD', name: 'Third' });
    const fourth = makeCharacterDef({ cardDefinitionId: 'TEST-REORDER-FOURTH', cardNumber: 'TEST-REORDER-FOURTH', name: 'Fourth' });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let firstId: string;
    let secondId: string;
    let thirdId: string;
    let fourthId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', kuma));
    ({ rig, deckIds: [firstId] } = putDeckCards(rig, 'p1', first, 1));
    ({ rig, deckIds: [secondId] } = putDeckCards(rig, 'p1', second, 1));
    ({ rig, deckIds: [thirdId] } = putDeckCards(rig, 'p1', third, 1));
    ({ rig, deckIds: [fourthId] } = putDeckCards(rig, 'p1', fourth, 1));

    const registry = buildCuratedEffectRegistry(rig.defs);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const topChoice = playResult.state.pendingChoices[0];
    expect(topChoice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: {
        min: 0,
        max: 3,
        candidateInstanceIds: [firstId, secondId, thirdId],
        visibleInstanceIds: [firstId, secondId, thirdId],
      },
    });

    const afterTopChoice = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: topChoice.id, response: [secondId] },
      rig.defs,
      registry,
    );
    const bottomChoice = afterTopChoice.state.pendingChoices[0];
    expect(bottomChoice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: { min: 2, max: 2, candidateInstanceIds: [firstId, thirdId] },
    });

    const afterBottomChoice = executeAction(
      afterTopChoice.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: bottomChoice.id, response: [thirdId, firstId] },
      rig.defs,
      registry,
    );

    expect(afterBottomChoice.state.pendingChoices).toEqual([]);
    expect(afterBottomChoice.state.players.p1.deck.cardIds).toEqual([secondId, fourthId, thirdId, firstId]);
    expect(afterBottomChoice.state.players.p1.hand.cardIds).not.toContain(firstId);
    expect(afterBottomChoice.state.players.p1.hand.cardIds).not.toContain(secondId);
    expect(afterBottomChoice.state.players.p1.hand.cardIds).not.toContain(thirdId);
  });

  it('wires ST06-002 optional trash from hand into exact-cost K.O.', () => {
    const koby = makeCharacterDef({
      cardDefinitionId: 'ST06-002',
      cardNumber: 'ST06-002',
      name: 'Koby',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const spareHandCard = makeCharacterDef({
      cardDefinitionId: 'TEST-ST06-SPARE',
      cardNumber: 'TEST-ST06-SPARE',
      name: 'Spare',
      category: 'character',
    });
    const costZeroTarget = makeCharacterDef({
      cardDefinitionId: 'TEST-ST06-COST-ZERO',
      cardNumber: 'TEST-ST06-COST-ZERO',
      name: 'Cost Zero',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const costOneTarget = makeCharacterDef({
      cardDefinitionId: 'TEST-ST06-COST-ONE',
      cardNumber: 'TEST-ST06-COST-ONE',
      name: 'Cost One',
      category: 'character',
      baseCost: 1,
      basePower: 1000,
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let spareId: string;
    let costZeroId: string;
    let costOneId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', koby));
    ({ rig, instanceId: spareId } = putInHand(rig, 'p1', spareHandCard));
    ({ rig, instanceId: costZeroId } = putCharacterInPlay(rig, 'p2', costZeroTarget));
    ({ rig, instanceId: costOneId } = putCharacterInPlay(rig, 'p2', costOneTarget));

    const registry = buildCuratedEffectRegistry(rig.defs);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const trashChoice = playResult.state.pendingChoices[0];
    expect(trashChoice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: { min: 0, max: 1, candidateInstanceIds: [spareId] },
    });

    const afterTrash = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: trashChoice.id, response: [spareId] },
      rig.defs,
      registry,
    );
    expect(afterTrash.state.players.p1.trash.cardIds).toContain(spareId);
    const koChoice = afterTrash.state.pendingChoices[0];
    expect(koChoice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: { min: 0, max: 1, candidateInstanceIds: [costZeroId] },
    });
    expect(koChoice.constraints.candidateInstanceIds).not.toContain(costOneId);

    const afterKo = executeAction(
      afterTrash.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: koChoice.id, response: [costZeroId] },
      rig.defs,
      registry,
    );

    expect(afterKo.state.pendingChoices).toEqual([]);
    expect(afterKo.state.players.p2.characterArea.cardIds).not.toContain(costZeroId);
    expect(afterKo.state.players.p2.trash.cardIds).toContain(costZeroId);
    expect(afterKo.state.players.p2.characterArea.cardIds).toContain(costOneId);
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
        templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 3, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Navy' }, remainder: 'trash' }] },
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
    expect(resolveResult.state.cardsById[navyOneId].revealedTo).toBe('all');
    expect(resolveResult.state.players.p1.trash.cardIds).toEqual([offTypeId, navyTwoId]);
    expect(resolveResult.state.players.p1.deck.cardIds).toEqual([]);
    expect(resolveResult.log.at(-1)).toMatchObject({
      visibility: 'public',
      data: { reveal: true, addedInstanceIds: [navyOneId] },
    });
  });

  it('keeps searched cards secret when the reviewed text does not say reveal', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-SECRET-SEARCHER',
      cardNumber: 'TEST-SECRET-SEARCHER',
      name: 'Secret Searcher',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const foundCard = makeCharacterDef({
      cardDefinitionId: 'TEST-SECRET-FOUND',
      cardNumber: 'TEST-SECRET-FOUND',
      name: 'Secret Found',
      types: ['Secret Type'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let foundId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, deckIds: [foundId] } = putDeckCards(rig, 'p1', foundCard, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-SECRET-SEARCHER',
        templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 1, pick: 1, reveal: false, destination: 'hand', filter: { typeIncludes: 'Secret Type' } }] },
      },
    ]);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = playResult.state.pendingChoices[0];
    const resolveResult = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [foundId] },
      rig.defs,
      registry,
    );

    expect(resolveResult.state.players.p1.hand.cardIds).toContain(foundId);
    expect(resolveResult.state.cardsById[foundId].revealedTo).toEqual(['p1']);
    expect(resolveResult.log.at(-1)).toMatchObject({
      visibility: { visibleTo: ['p1'] },
      data: { reveal: false, destination: 'hand', addedInstanceIds: [], privateAddedInstanceIds: [foundId] },
    });
  });

  it('can put a non-revealed searched card on top of Life instead of into hand', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-LIFE-SEARCHER',
      cardNumber: 'TEST-LIFE-SEARCHER',
      name: 'Life Searcher',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const foundCard = makeCharacterDef({
      cardDefinitionId: 'TEST-LIFE-FOUND',
      cardNumber: 'TEST-LIFE-FOUND',
      name: 'Life Found',
      types: ['Life Type'],
    });
    const offType = makeCharacterDef({
      cardDefinitionId: 'TEST-LIFE-OFF',
      cardNumber: 'TEST-LIFE-OFF',
      name: 'Life Off Type',
      types: ['Other'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let foundId: string;
    let offTypeId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, deckIds: [foundId] } = putDeckCards(rig, 'p1', foundCard, 1));
    ({ rig, deckIds: [offTypeId] } = putDeckCards(rig, 'p1', offType, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-LIFE-SEARCHER',
        templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 2, pick: 1, reveal: false, destination: 'lifeTop', filter: { typeIncludes: 'Life Type' } }] },
      },
    ]);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = playResult.state.pendingChoices[0];
    const resolveResult = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [foundId] },
      rig.defs,
      registry,
    );

    expect(resolveResult.state.players.p1.hand.cardIds).not.toContain(foundId);
    expect(resolveResult.state.players.p1.lifeArea.cardIds[0]).toBe(foundId);
    expect(resolveResult.state.cardsById[foundId]).toMatchObject({ currentZone: 'lifeArea', revealedTo: ['p1'] });
    expect(resolveResult.state.players.p1.deck.cardIds).toEqual([offTypeId]);
    expect(resolveResult.log.at(-1)).toMatchObject({
      visibility: { visibleTo: ['p1'] },
      data: { reveal: false, destination: 'lifeTop', privateAddedInstanceIds: [foundId] },
    });
  });

  it('skips an if-you-do follow-up when an up-to search chooses nothing', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-IF-DO-DECLINE',
      cardNumber: 'TEST-IF-DO-DECLINE',
      name: 'If Do Decline',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const foundCard = makeCharacterDef({
      cardDefinitionId: 'TEST-IF-DO-FOUND',
      cardNumber: 'TEST-IF-DO-FOUND',
      name: 'If Do Found',
      types: ['If Do'],
    });
    const spareHandCard = makeCharacterDef({
      cardDefinitionId: 'TEST-IF-DO-SPARE',
      cardNumber: 'TEST-IF-DO-SPARE',
      name: 'If Do Spare',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let foundId: string;
    let spareHandId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, instanceId: spareHandId } = putInHand(rig, 'p1', spareHandCard));
    ({ rig, deckIds: [foundId] } = putDeckCards(rig, 'p1', foundCard, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-IF-DO-DECLINE',
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'searchTopDeck', look: 1, pick: 1, reveal: false, destination: 'hand', filter: { typeIncludes: 'If Do' } },
            { fn: 'trashFromHand', count: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ]);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const searchChoice = playResult.state.pendingChoices[0];
    const afterDecline = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: searchChoice.id, response: [] },
      rig.defs,
      registry,
    );

    expect(afterDecline.state.pendingChoices).toEqual([]);
    expect(afterDecline.state.players.p1.hand.cardIds).toContain(spareHandId);
    expect(afterDecline.state.players.p1.deck.cardIds).toEqual([foundId]);
  });

  it('runs an if-you-do follow-up when an up-to search moves a card', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-IF-DO-PICK',
      cardNumber: 'TEST-IF-DO-PICK',
      name: 'If Do Pick',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const foundCard = makeCharacterDef({
      cardDefinitionId: 'TEST-IF-DO-PICK-FOUND',
      cardNumber: 'TEST-IF-DO-PICK-FOUND',
      name: 'If Do Pick Found',
      types: ['If Do'],
    });
    const spareHandCard = makeCharacterDef({
      cardDefinitionId: 'TEST-IF-DO-PICK-SPARE',
      cardNumber: 'TEST-IF-DO-PICK-SPARE',
      name: 'If Do Pick Spare',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let foundId: string;
    let spareHandId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, instanceId: spareHandId } = putInHand(rig, 'p1', spareHandCard));
    ({ rig, deckIds: [foundId] } = putDeckCards(rig, 'p1', foundCard, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-IF-DO-PICK',
        templateId: 'ability',
        params: {
          timing: 'onPlay',
          functions: [
            { fn: 'searchTopDeck', look: 1, pick: 1, reveal: false, destination: 'hand', filter: { typeIncludes: 'If Do' } },
            { fn: 'trashFromHand', count: 1, ifPrevious: 'previousMovedAny' },
          ],
        },
      },
    ]);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const searchChoice = playResult.state.pendingChoices[0];
    const afterSearch = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: searchChoice.id, response: [foundId] },
      rig.defs,
      registry,
    );

    const trashChoice = afterSearch.state.pendingChoices[0];
    expect(trashChoice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: { min: 1, max: 1, candidateInstanceIds: [spareHandId, foundId] },
    });
  });

  it('continues composed onPlay templates after a search choice resolves', () => {
    const searcher = makeCharacterDef({
      cardDefinitionId: 'TEST-CONTINUE-SEARCH',
      cardNumber: 'TEST-CONTINUE-SEARCH',
      name: 'Continue Searcher',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });
    const foundCard = makeCharacterDef({
      cardDefinitionId: 'TEST-CELESTIAL',
      cardNumber: 'TEST-CELESTIAL',
      name: 'Celestial Card',
      types: ['Celestial Dragons'],
    });
    const offType = makeCharacterDef({
      cardDefinitionId: 'TEST-NOT-CELESTIAL',
      cardNumber: 'TEST-NOT-CELESTIAL',
      name: 'Off Type',
      types: ['Navy'],
    });
    const spareHandCard = makeCharacterDef({
      cardDefinitionId: 'TEST-SPARE-HAND',
      cardNumber: 'TEST-SPARE-HAND',
      name: 'Spare Hand Card',
      types: ['Straw Hat Crew'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let spareHandId: string;
    let foundId: string;
    let offTypeId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', searcher));
    ({ rig, instanceId: spareHandId } = putInHand(rig, 'p1', spareHandCard));
    ({ rig, deckIds: [foundId] } = putDeckCards(rig, 'p1', foundCard, 1));
    ({ rig, deckIds: [offTypeId] } = putDeckCards(rig, 'p1', offType, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-CONTINUE-SEARCH',
        templates: [
          { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'searchTopDeck', look: 2, pick: 1, reveal: true, destination: 'hand', filter: { typeIncludes: 'Celestial Dragons' }, remainder: 'trash' }] } },
          { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] } },
        ],
      },
    ]);

    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const searchChoice = playResult.state.pendingChoices[0];
    expect(searchChoice.constraints.candidateInstanceIds).toEqual([foundId]);

    const afterSearch = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: searchChoice.id, response: [foundId] },
      rig.defs,
      registry,
    );
    const trashChoice = afterSearch.state.pendingChoices[0];
    expect(trashChoice).toMatchObject({
      playerId: 'p1',
      kind: 'SELECT_CARDS',
      sourceEffectId: 'ir',
      constraints: { min: 1, max: 1, candidateInstanceIds: [spareHandId, foundId] },
    });
    expect(afterSearch.state.players.p1.trash.cardIds).toEqual([offTypeId]);

    const afterTrash = executeAction(
      afterSearch.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: trashChoice.id, response: [spareHandId] },
      rig.defs,
      registry,
    );

    expect(afterTrash.state.pendingChoices).toEqual([]);
    expect(afterTrash.state.players.p1.hand.cardIds).toEqual([foundId]);
    expect(afterTrash.state.players.p1.trash.cardIds).toEqual([spareHandId, offTypeId]);
    expect(afterTrash.state.players.p1.deck.cardIds).toEqual([]);
  });

  it('can move a chosen Character to the bottom of its owner deck', () => {
    const bottomDeckEvent = makeEventDef({
      cardDefinitionId: 'TEST-BOTTOM-DECK-EVENT',
      cardNumber: 'TEST-BOTTOM-DECK-EVENT',
      name: 'Bottom Deck Event',
      category: 'event',
      baseCost: 0,
    });
    const opponentCharacter = makeCharacterDef({
      cardDefinitionId: 'TEST-BOTTOM-DECK-TARGET',
      cardNumber: 'TEST-BOTTOM-DECK-TARGET',
      name: 'Bottom Deck Target',
      category: 'character',
      baseCost: 3,
      basePower: 5000,
    });
    const existingDeckCard = makeCharacterDef({
      cardDefinitionId: 'TEST-EXISTING-DECK-CARD',
      cardNumber: 'TEST-EXISTING-DECK-CARD',
      name: 'Existing Deck Card',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    let targetId: string;
    let existingDeckId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', bottomDeckEvent));
    ({ rig, instanceId: targetId } = putCharacterInPlay(rig, 'p2', opponentCharacter));
    ({ rig, deckIds: [existingDeckId] } = putDeckCards(rig, 'p2', existingDeckCard, 1));

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'TEST-BOTTOM-DECK-EVENT',
        templateId: 'ability',
        params: { timing: 'activateMain', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 3 } }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, optional: true }] },
      },
    ]);

    const playResult = executeAction(
      rig.state,
      { type: 'ACTIVATE_EVENT_MAIN', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = playResult.state.pendingChoices[0];
    expect(choice).toMatchObject({
      sourceEffectId: 'ir',
      constraints: { min: 0, max: 1, candidateInstanceIds: [targetId] },
    });

    const resolveResult = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [targetId] },
      rig.defs,
      registry,
    );

    expect(resolveResult.state.pendingChoices).toEqual([]);
    expect(resolveResult.state.players.p2.characterArea.cardIds).not.toContain(targetId);
    expect(resolveResult.state.players.p2.deck.cardIds).toEqual([existingDeckId, targetId]);
    expect(resolveResult.state.cardsById[targetId]).toMatchObject({
      currentZone: 'deck',
      revealedTo: [],
      donAttached: [],
    });
  });

  it('filters controller Leader/Character power targets by type and can exclude the source', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'TEST-FILTERED-BOOSTER',
      cardNumber: 'TEST-FILTERED-BOOSTER',
      name: 'Filtered Booster',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
      types: ['Straw Hat Crew'],
    });
    const strawHatAlly = makeCharacterDef({
      cardDefinitionId: 'TEST-STRAW-HAT-ALLY',
      cardNumber: 'TEST-STRAW-HAT-ALLY',
      name: 'Straw Hat Ally',
      category: 'character',
      types: ['Straw Hat Crew'],
    });
    const offTypeAlly = makeCharacterDef({
      cardDefinitionId: 'TEST-OFF-TYPE-ALLY',
      cardNumber: 'TEST-OFF-TYPE-ALLY',
      name: 'Off Type Ally',
      category: 'character',
      types: ['Animal'],
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3, leaderOverridesP1: { types: ['Straw Hat Crew'] } });
    let sourceId: string;
    let strawHatAllyId: string;
    let offTypeAllyId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false }));
    ({ rig, instanceId: strawHatAllyId } = putCharacterInPlay(rig, 'p1', strawHatAlly));
    ({ rig, instanceId: offTypeAllyId } = putCharacterInPlay(rig, 'p1', offTypeAlly));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    rig = {
      ...withDon,
      state: {
        ...withDon.state,
        cardsById: {
          ...withDon.state.cardsById,
          [sourceId]: { ...withDon.state.cardsById[sourceId], donAttached: [donIds[0]] },
        },
      },
    };

    const registry = buildRegistryFromAssignments([
      {
        cardNumber: source.cardDefinitionId,
        templateId: 'ability',
        params: {
          timing: 'whenAttacking',
          condition: { donAttachedAtLeast: 1 },
          functions: [{ fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller', filter: { typeIncludes: 'Straw Hat Crew', excludeSelf: true } }, amount: 1000, duration: 'duringThisTurn', optional: true }],
        },
      },
    ]);

    const attackResult = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: sourceId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );

    expect(attackResult.state.pendingChoices[0]).toMatchObject({
      sourceEffectId: 'ir',
      constraints: {
        candidateInstanceIds: [rig.state.players.p1.leaderInstanceId, strawHatAllyId],
      },
    });
    expect(attackResult.state.pendingChoices[0].constraints.candidateInstanceIds).not.toContain(sourceId);
    expect(attackResult.state.pendingChoices[0].constraints.candidateInstanceIds).not.toContain(offTypeAllyId);
  });

  it('wires ST01-012 blocker suppression into battle validation', () => {
    const luffy = makeCharacterDef({
      cardDefinitionId: 'ST01-012',
      cardNumber: 'ST01-012',
      name: 'Monkey.D.Luffy',
      category: 'character',
      baseCost: 5,
      basePower: 6000,
      hasRush: true,
    });
    const blocker = makeCharacterDef({
      cardDefinitionId: 'TEST-BLOCKER',
      cardNumber: 'TEST-BLOCKER',
      name: 'Blocker',
      category: 'character',
      baseCost: 1,
      basePower: 1000,
      hasBlocker: true,
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let attackerId: string;
    let blockerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', luffy, { summoningSick: false }));
    ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p2', blocker));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 2);
    rig = {
      ...withDon,
      state: {
        ...withDon.state,
        cardsById: {
          ...withDon.state.cardsById,
          [attackerId]: { ...withDon.state.cardsById[attackerId], donAttached: donIds },
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const attackResult = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: attackerId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );

    expect(attackResult.state.continuousEffects.some((effect) => effect.blockerRestriction?.appliesToAttackerInstanceId === attackerId)).toBe(true);
    const blockAction = { type: 'ACTIVATE_BLOCKER', actionId: nextTestId('action'), playerId: 'p2', blockerInstanceId: blockerId } as const;
    expect(validateAction(attackResult.state, blockAction, rig.defs, registry).legal).toBe(false);
  });

  it('wires ST01-002 life trigger to play itself from Life damage', () => {
    const attacker = makeCharacterDef({
      cardDefinitionId: 'TEST-LIFE-HIT-ATTACKER',
      cardNumber: 'TEST-LIFE-HIT-ATTACKER',
      name: 'Life Hit Attacker',
      category: 'character',
      baseCost: 0,
      basePower: 9000,
    });
    const guardPoint = makeCharacterDef({
      cardDefinitionId: 'ST01-002',
      cardNumber: 'ST01-002',
      name: 'Usopp',
      category: 'character',
      baseCost: 2,
      basePower: 3000,
      hasTrigger: true,
      text: '[DON!! x2] [When Attacking] Your opponent cannot activate a [Blocker] Character that has 5000 or more power during this battle. [Trigger] Play this card.',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let attackerId: string;
    let lifeId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', attacker, { summoningSick: false }));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p2', [guardPoint]));
    rig = {
      ...rig,
      state: {
        ...rig.state,
        currentBattle: {
          attackerInstanceId: attackerId,
          targetInstanceId: rig.state.players.p2.leaderInstanceId,
          originalTargetInstanceId: rig.state.players.p2.leaderInstanceId,
          step: 'counter',
          blockerUsed: false,
          battlePowerBonuses: {},
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const damageResult = executeAction(
      rig.state,
      { type: 'PASS_STEP', actionId: nextTestId('action'), playerId: 'p2' },
      rig.defs,
      registry,
    );
    const triggerChoice = damageResult.state.pendingChoices[0];
    expect(triggerChoice).toMatchObject({ sourceEffectId: 'rule:lifeTrigger', sourceInstanceId: lifeId });
    expect(damageResult.state.players.p2.hand.cardIds).toContain(lifeId);

    const triggerResult = executeAction(
      damageResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p2', choiceId: triggerChoice.id, response: [lifeId] },
      rig.defs,
      registry,
    );

    const playedId = triggerResult.state.players.p2.characterArea.cardIds.find((id) => triggerResult.state.cardsById[id]?.cardDefinitionId === 'ST01-002');
    expect(playedId).toBeDefined();
    expect(triggerResult.state.players.p2.hand.cardIds).not.toContain(lifeId);
    expect(triggerResult.state.players.p2.trash.cardIds).not.toContain(lifeId);
    expect(triggerResult.state.pendingChoices).toEqual([]);
  });

  it('wires ST01-004 conditional Rush into attack validation', () => {
    const sanji = makeCharacterDef({
      cardDefinitionId: 'ST01-004',
      cardNumber: 'ST01-004',
      name: 'Sanji',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
      hasRush: false,
      text: '[DON!! x2] This Character gains [Rush].',
    });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let handId: string;
    ({ rig, instanceId: handId } = putInHand(rig, 'p1', sanji));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 2);
    rig = withDon;

    const registry = buildCuratedEffectRegistry(rig.defs);
    const playResult = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const playedId = playResult.state.players.p1.characterArea.cardIds[0];
    const attackAction = { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: playedId, targetInstanceId: playResult.state.players.p2.leaderInstanceId } as const;
    expect(validateAction(playResult.state, attackAction, rig.defs, registry).legal).toBe(false);

    const withAttachedDon = {
      ...playResult.state,
      cardsById: {
        ...playResult.state.cardsById,
        [playedId]: { ...playResult.state.cardsById[playedId], donAttached: donIds },
      },
    };
    expect(validateAction(withAttachedDon, attackAction, rig.defs, registry).legal).toBe(true);
  });

  it('wires ST01-001 to require and attach only rested DON!!', () => {
    let rig = buildBaseRig({
      phase: 'main',
      activePlayerId: 'p1',
      turnNumber: 3,
      leaderOverridesP1: {
        cardDefinitionId: 'ST01-001',
        cardNumber: 'ST01-001',
        name: 'Monkey.D.Luffy',
        category: 'leader',
        types: ['Straw Hat Crew'],
        text: '[Activate: Main] [Once Per Turn] Give up to 1 rested DON!! card to your Leader or 1 of your Characters.',
      },
    });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    ({ rig } = putDon(rig, 'p1', 2, { rested: false }));
    const [activeDonId, restedDonId] = rig.state.players.p1.costArea.cardIds;
    rig = {
      ...rig,
      state: {
        ...rig.state,
        cardsById: {
          ...rig.state.cardsById,
          [activeDonId]: { ...rig.state.cardsById[activeDonId], donRested: false },
          [restedDonId]: { ...rig.state.cardsById[restedDonId], donRested: true },
        },
      },
    };
    const registry = buildCuratedEffectRegistry(rig.defs);
    const action = { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: leaderId, effectId: 'activateMain', donInstanceIds: [] } as const;

    const activeOnlyState = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [restedDonId]: { ...rig.state.cardsById[restedDonId], donRested: false },
      },
    };
    expect(validateAction(activeOnlyState, action, rig.defs, registry).legal).toBe(false);
    expect(validateAction(rig.state, action, rig.defs, registry).legal).toBe(true);

    const activated = executeAction(rig.state, action, rig.defs, registry);
    const choice = activated.state.pendingChoices[0];
    const resolved = executeAction(
      activated.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [leaderId] },
      rig.defs,
      registry,
    );

    expect(resolved.state.cardsById[leaderId].donAttached).toEqual([restedDonId]);
    expect(resolved.state.cardsById[activeDonId].donRested).toBe(false);
    expect(resolved.state.cardsById[restedDonId].donRested).toBe(true);
  });
});
