import { describe, expect, it } from 'vitest';
import { executeAction, validateAction } from '../../../engine/actions';
import { makeCharacterDef, makeEventDef, buildBaseRig, putCharacterInPlay, putDeckCards, putDon, putInHand, nextTestId } from '../../../engine/rules/shared/__tests__/testRig';
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
        params: { timing: 'activateMain', functions: [{ fn: 'moveToBottomDeck', maxCost: 3, target: 'opponent' }] },
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
          functions: [{ fn: 'addPowerController', amount: 1000, duration: 'duringThisTurn', filter: { typeIncludes: 'Straw Hat Crew', excludeSelf: true } }],
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
});
