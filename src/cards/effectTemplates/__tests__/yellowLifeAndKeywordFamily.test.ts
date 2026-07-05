import { describe, expect, it } from 'vitest';
import { executeAction } from '../../../engine/actions';
import { computeCurrentPower, hasContinuousKeyword } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeStageDef, putCharacterInPlay, putDeckCards, putDon, putInHand, putLifeCards, putStageInPlay, nextTestId } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

describe('semantic family: optional Life payment into battle modifiers', () => {
  it('can pay top/bottom Life, then conditionally grant Banish and power for this battle', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-LIFE-BATTLE',
      cardNumber: 'SYN-LIFE-BATTLE',
      category: 'character',
      baseCost: 5,
      basePower: 6000,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-CARD', cardNumber: 'SYN-LIFE-CARD', name: 'Life' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-BATTLE',
      templateId: 'ability',
      params: {
        timing: 'whenAttacking',
        condition: { donAttachedAtLeast: 1 },
        functions: [
          { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
          { fn: 'addPowerSelf', amount: 1000, duration: 'duringThisBattle', ifPrevious: 'previousMovedAny' },
          { fn: 'addKeywordSelf', keyword: 'banish', duration: 'duringThisBattle', ifPrevious: 'previousSelectedAny' },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceId: string;
    let lifeId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false }));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [life]));
    const withDon = putDon(rig, 'p1', 1);
    rig = {
      ...withDon.rig,
      state: {
        ...withDon.rig.state,
        cardsById: {
          ...withDon.rig.state.cardsById,
          [sourceId]: { ...withDon.rig.state.cardsById[sourceId], donAttached: withDon.donIds },
        },
      },
    };

    const registry = buildRegistryFromAssignments([assignment]);
    const attack = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: sourceId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );
    const choice = attack.state.pendingChoices[0];
    expect(choice).toMatchObject({
      kind: 'SELECT_OPTION',
      constraints: { options: [{ label: 'Do not add a Life card.' }, { label: 'Top Life card' }] },
    });
    expect(choice.constraints.candidateInstanceIds).toBeUndefined();

    const paid = executeAction(
      attack.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: 1 },
      rig.defs,
      registry,
    );

    expect(paid.state.players.p1.hand.cardIds).toContain(lifeId);
    expect(computeCurrentPower(rig.defs, paid.state, sourceId)).toBe(8000);
    expect(hasContinuousKeyword(rig.defs, paid.state, sourceId, 'banish')).toBe(true);
  });
});

describe('semantic family: optional Life payment into optional deck-top-to-Life', () => {
  it('can pay top/bottom Life, then optionally add deck top to Life', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-LIFE-REPLACE',
      cardNumber: 'SYN-LIFE-REPLACE',
      category: 'character',
      baseCost: 4,
      basePower: 5000,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-CARD-2', cardNumber: 'SYN-LIFE-CARD-2', name: 'Life' });
    const deckTop = makeCharacterDef({ cardDefinitionId: 'SYN-DECK-TOP', cardNumber: 'SYN-DECK-TOP', name: 'Deck Top' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-REPLACE',
      templateId: 'ability',
      params: {
        timing: 'whenAttacking',
        condition: { donAttachedAtLeast: 1 },
        functions: [
          { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
          { fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' }, optional: true, ifPrevious: 'previousMovedAny' },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceId: string;
    let lifeId: string;
    let deckTopId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false }));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [life]));
    ({ rig, deckIds: [deckTopId] } = putDeckCards(rig, 'p1', deckTop, 1));
    const withDon = putDon(rig, 'p1', 1);
    rig = {
      ...withDon.rig,
      state: {
        ...withDon.rig.state,
        cardsById: {
          ...withDon.rig.state.cardsById,
          [sourceId]: { ...withDon.rig.state.cardsById[sourceId], donAttached: withDon.donIds },
        },
      },
    };

    const registry = buildRegistryFromAssignments([assignment]);
    const attack = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: sourceId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );
    const lifeChoice = attack.state.pendingChoices[0];
    const paid = executeAction(
      attack.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: lifeChoice.id, response: 1 },
      rig.defs,
      registry,
    );
    const deckChoice = paid.state.pendingChoices[0];
    expect(deckChoice).toMatchObject({ constraints: { min: 0, max: 1, candidateInstanceIds: [deckTopId] } });

    const added = executeAction(
      paid.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: deckChoice.id, response: [deckTopId] },
      rig.defs,
      registry,
    );

    expect(added.state.players.p1.lifeArea.cardIds[0]).toBe(deckTopId);
    expect(added.state.players.p1.deck.cardIds).not.toContain(deckTopId);
    expect(added.state.players.p1.hand.cardIds).toContain(lifeId);
  });
});

describe('semantic family: named leader/character keyword grants', () => {
  it('can grant different keywords to an own named Leader/Character target', () => {
    const sourceA = makeCharacterDef({ cardDefinitionId: 'SYN-KEYWORD-A', cardNumber: 'SYN-KEYWORD-A', name: 'Keyword Source A', category: 'character', baseCost: 3, basePower: 3000 });
    const sourceB = makeCharacterDef({ cardDefinitionId: 'SYN-KEYWORD-B', cardNumber: 'SYN-KEYWORD-B', name: 'Keyword Source B', category: 'character', baseCost: 3, basePower: 3000 });
    const namedTarget = makeCharacterDef({ cardDefinitionId: 'SYN-NAMED-TARGET', cardNumber: 'SYN-NAMED-TARGET', name: 'Named Captain', category: 'character', baseCost: 7, basePower: 8000 });
    const assignments: CardEffectAssignment[] = [
      {
        cardNumber: 'SYN-KEYWORD-A',
        templateId: 'ability',
        params: { timing: 'activateMain', functions: [{ fn: 'addKeywordControllerLeaderOrCharacter', keyword: 'banish', duration: 'duringThisTurn', filter: { name: 'Named Captain' } }] },
      },
      {
        cardNumber: 'SYN-KEYWORD-B',
        templateId: 'ability',
        params: { timing: 'activateMain', functions: [{ fn: 'addKeywordControllerLeaderOrCharacter', keyword: 'doubleAttack', duration: 'duringThisTurn', filter: { name: 'Named Captain' } }] },
      },
    ];

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceAId: string;
    let sourceBId: string;
    let targetId: string;
    ({ rig, instanceId: sourceAId } = putCharacterInPlay(rig, 'p1', sourceA));
    ({ rig, instanceId: sourceBId } = putCharacterInPlay(rig, 'p1', sourceB));
    ({ rig, instanceId: targetId } = putCharacterInPlay(rig, 'p1', namedTarget));

    const registry = buildRegistryFromAssignments(assignments);
    const first = executeAction(
      rig.state,
      { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceAId, effectId: 'activateMain', donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const firstChoice = first.state.pendingChoices[0];
    expect(firstChoice.constraints.candidateInstanceIds).toEqual([targetId]);
    const banishGranted = executeAction(
      first.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: firstChoice.id, response: [targetId] },
      rig.defs,
      registry,
    );
    expect(hasContinuousKeyword(rig.defs, banishGranted.state, targetId, 'banish')).toBe(true);

    const second = executeAction(
      banishGranted.state,
      { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceBId, effectId: 'activateMain', donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const secondChoice = second.state.pendingChoices[0];
    const doubleAttackGranted = executeAction(
      second.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: secondChoice.id, response: [targetId] },
      rig.defs,
      registry,
    );
    expect(hasContinuousKeyword(rig.defs, doubleAttackGranted.state, targetId, 'doubleAttack')).toBe(true);
  });
});

describe('semantic family: look at top Life from either player and place top/bottom', () => {
  it('exposes both top Life cards privately and places the selected one at the bottom of its owner Life', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-LIFE-PEEK',
      cardNumber: 'SYN-LIFE-PEEK',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
    });
    const ownLife = makeCharacterDef({ cardDefinitionId: 'SYN-OWN-LIFE', cardNumber: 'SYN-OWN-LIFE' });
    const opponentTop = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-TOP', cardNumber: 'SYN-OPP-TOP' });
    const opponentBottom = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-BOTTOM', cardNumber: 'SYN-OPP-BOTTOM' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-PEEK',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' }] },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let ownLifeId: string;
    let opponentTopId: string;
    let opponentBottomId: string;
    ({ rig, lifeIds: [ownLifeId] } = putLifeCards(rig, 'p1', [ownLife]));
    ({ rig, lifeIds: [opponentTopId, opponentBottomId] } = putLifeCards(rig, 'p2', [opponentTop, opponentBottom]));
    const { rig: withHand, instanceId: handId } = putInHand(rig, 'p1', source);
    rig = withHand;

    const registry = buildRegistryFromAssignments([assignment]);
    const played = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = played.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual([ownLifeId, opponentTopId]);
    expect(choice.constraints.visibleInstanceIds).toEqual([ownLifeId, opponentTopId]);

    const resolved = executeAction(
      played.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [opponentTopId] },
      rig.defs,
      registry,
    );

    expect(resolved.state.players.p2.lifeArea.cardIds).toEqual([opponentBottomId, opponentTopId]);
  });

  it('supports a follow-up keyword grant gated by having less Life than the opponent', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-LIFE-GATED-RUSH',
      cardNumber: 'SYN-LIFE-GATED-RUSH',
      category: 'character',
      baseCost: 0,
      basePower: 5000,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-GATE-CARD', cardNumber: 'SYN-LIFE-GATE-CARD' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-GATED-RUSH',
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        functions: [
          { fn: 'peekLifeAndPlace', from: 'controllerOrOpponentTop', placement: 'topOrBottom' },
          { fn: 'addKeywordSelf', keyword: 'rush', duration: 'duringThisTurn', condition: { gate: [{ kind: 'selfLifeLessThanOpponent' }] } },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    ({ rig } = putLifeCards(rig, 'p1', [life]));
    ({ rig } = putLifeCards(rig, 'p2', [life, life]));
    const { rig: withHand, instanceId: handId } = putInHand(rig, 'p1', source);
    rig = withHand;

    const registry = buildRegistryFromAssignments([assignment]);
    const played = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = played.state.pendingChoices[0];
    const resolved = executeAction(
      played.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: choice.id, response: [] },
      rig.defs,
      registry,
    );
    const playedId = resolved.state.players.p1.characterArea.cardIds[0];

    expect(hasContinuousKeyword(rig.defs, resolved.state, playedId, 'rush')).toBe(true);
  });
});

describe('semantic family: mandatory Life payment into follow-up board effects', () => {
  it('can pay top/bottom Life, then K.O. an opponent Character only if the payment moved a card', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-LIFE-KO',
      cardNumber: 'SYN-LIFE-KO',
      category: 'character',
      baseCost: 3,
      basePower: 4000,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-KO-COST', cardNumber: 'SYN-LIFE-KO-COST' });
    const koTarget = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-KO-TARGET', cardNumber: 'SYN-LIFE-KO-TARGET', baseCost: 3, basePower: 5000 });
    const tooLarge = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-KO-LARGE', cardNumber: 'SYN-LIFE-KO-LARGE', baseCost: 4, basePower: 6000 });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-KO',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        cost: [{ kind: 'restThis' }],
        gate: [{ kind: 'selfLife', atLeast: 1 }],
        functions: [
          { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' } },
          { fn: 'koOpponentCharacter', filter: { maxCost: 3 }, ifPrevious: 'previousMovedAny' },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceId: string;
    let lifeId: string;
    let koTargetId: string;
    let tooLargeId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [life]));
    ({ rig, instanceId: koTargetId } = putCharacterInPlay(rig, 'p2', koTarget));
    ({ rig, instanceId: tooLargeId } = putCharacterInPlay(rig, 'p2', tooLarge));

    const registry = buildRegistryFromAssignments([assignment]);
    const activated = executeAction(
      rig.state,
      { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceId, effectId: 'activateMain', donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const lifeChoice = activated.state.pendingChoices[0];
    expect(lifeChoice).toMatchObject({
      kind: 'SELECT_OPTION',
      constraints: { options: [{ label: 'Top Life card' }] },
    });
    expect(lifeChoice.constraints.candidateInstanceIds).toBeUndefined();

    const paid = executeAction(
      activated.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: lifeChoice.id, response: 0 },
      rig.defs,
      registry,
    );
    const koChoice = paid.state.pendingChoices[0];
    expect(koChoice.constraints.candidateInstanceIds).toEqual([koTargetId]);
    expect(koChoice.constraints.candidateInstanceIds).not.toContain(tooLargeId);

    const resolved = executeAction(
      paid.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: koChoice.id, response: [koTargetId] },
      rig.defs,
      registry,
    );

    expect(resolved.state.players.p1.hand.cardIds).toContain(lifeId);
    expect(resolved.state.players.p2.trash.cardIds).toContain(koTargetId);
    expect(resolved.state.cardsById[sourceId].orientation).toBe('rested');
  });

  it('can pay top/bottom Life from a Stage, then put an own cost-matching Character on Life face-up', () => {
    const source = makeStageDef({
      cardDefinitionId: 'SYN-LIFE-STAGE',
      cardNumber: 'SYN-LIFE-STAGE',
      baseCost: 2,
    });
    const life = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-STAGE-COST', cardNumber: 'SYN-LIFE-STAGE-COST' });
    const target = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-STAGE-TARGET', cardNumber: 'SYN-LIFE-STAGE-TARGET', baseCost: 3, basePower: 5000 });
    const wrongCost = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE-STAGE-WRONG', cardNumber: 'SYN-LIFE-STAGE-WRONG', baseCost: 2, basePower: 4000 });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-STAGE',
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        cost: [{ kind: 'restThis' }],
        gate: [{ kind: 'selfLife', atLeast: 1 }],
        functions: [
          { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' } },
          { fn: 'moveCards', from: { zone: 'characters', player: 'controller', filter: { exactCost: 3 } }, to: { zone: 'life', player: 'owner', position: 'top', faceUp: true }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny' },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceId: string;
    let lifeId: string;
    let targetId: string;
    let wrongCostId: string;
    ({ rig, instanceId: sourceId } = putStageInPlay(rig, 'p1', source));
    ({ rig, lifeIds: [lifeId] } = putLifeCards(rig, 'p1', [life]));
    ({ rig, instanceId: targetId } = putCharacterInPlay(rig, 'p1', target));
    ({ rig, instanceId: wrongCostId } = putCharacterInPlay(rig, 'p1', wrongCost));

    const registry = buildRegistryFromAssignments([assignment]);
    const activated = executeAction(
      rig.state,
      { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('action'), playerId: 'p1', sourceInstanceId: sourceId, effectId: 'activateMain', donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const lifeChoice = activated.state.pendingChoices[0];
    const paid = executeAction(
      activated.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: lifeChoice.id, response: 0 },
      rig.defs,
      registry,
    );
    const moveChoice = paid.state.pendingChoices[0];
    expect(moveChoice.constraints.candidateInstanceIds).toEqual([targetId]);
    expect(moveChoice.constraints.candidateInstanceIds).not.toContain(wrongCostId);

    const resolved = executeAction(
      paid.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: moveChoice.id, response: [targetId] },
      rig.defs,
      registry,
    );

    expect(resolved.state.players.p1.lifeArea.cardIds[0]).toBe(targetId);
    expect(resolved.state.cardsById[targetId].faceState).toBe('faceUp');
    expect(resolved.state.cardsById[targetId].revealedTo).toBe('all');
    expect(resolved.state.players.p1.hand.cardIds).toContain(lifeId);
    expect(resolved.state.cardsById[sourceId].orientation).toBe('rested');
  });
});

describe('semantic family: post-payment Life gate into hand-to-Life repair', () => {
  it('checks the Life-count gate after the optional Life payment resolves', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-LIFE-POST-GATE',
      cardNumber: 'SYN-LIFE-POST-GATE',
      category: 'character',
      baseCost: 5,
      basePower: 5000,
    });
    const lifeA = makeCharacterDef({ cardDefinitionId: 'SYN-POST-LIFE-A', cardNumber: 'SYN-POST-LIFE-A' });
    const lifeB = makeCharacterDef({ cardDefinitionId: 'SYN-POST-LIFE-B', cardNumber: 'SYN-POST-LIFE-B' });
    const lifeC = makeCharacterDef({ cardDefinitionId: 'SYN-POST-LIFE-C', cardNumber: 'SYN-POST-LIFE-C' });
    const handCard = makeCharacterDef({ cardDefinitionId: 'SYN-POST-HAND', cardNumber: 'SYN-POST-HAND' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-LIFE-POST-GATE',
      templateId: 'ability',
      params: {
        timing: 'whenAttacking',
        condition: { donAttachedAtLeast: 2 },
        functions: [
          { fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'hand', player: 'owner' }, optional: true },
          { fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'life', player: 'owner', position: 'top' }, optional: true, maxTargets: 1, ifPrevious: 'previousMovedAny', ifGate: [{ kind: 'selfLife', atMost: 2 }] },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let sourceId: string;
    let paidLifeId: string;
    let handCardId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false }));
    ({ rig, lifeIds: [paidLifeId] } = putLifeCards(rig, 'p1', [lifeA, lifeB, lifeC]));
    ({ rig, instanceId: handCardId } = putInHand(rig, 'p1', handCard));
    const withDon = putDon(rig, 'p1', 2);
    rig = {
      ...withDon.rig,
      state: {
        ...withDon.rig.state,
        cardsById: {
          ...withDon.rig.state.cardsById,
          [sourceId]: { ...withDon.rig.state.cardsById[sourceId], donAttached: withDon.donIds },
        },
      },
    };

    const registry = buildRegistryFromAssignments([assignment]);
    const attack = executeAction(
      rig.state,
      { type: 'DECLARE_ATTACK', actionId: nextTestId('action'), playerId: 'p1', attackerInstanceId: sourceId, targetInstanceId: rig.state.players.p2.leaderInstanceId },
      rig.defs,
      registry,
    );
    const lifeChoice = attack.state.pendingChoices[0];
    const paid = executeAction(
      attack.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: lifeChoice.id, response: 1 },
      rig.defs,
      registry,
    );
    const handChoice = paid.state.pendingChoices[0];
    expect(handChoice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([handCardId, paidLifeId]));

    const repaired = executeAction(
      paid.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: handChoice.id, response: [handCardId] },
      rig.defs,
      registry,
    );

    expect(repaired.state.players.p1.lifeArea.cardIds[0]).toBe(handCardId);
    expect(repaired.state.players.p1.hand.cardIds).toContain(paidLifeId);
    expect(repaired.state.players.p1.hand.cardIds).not.toContain(handCardId);
  });
});

describe('semantic family: opponent chooses one non-targeting modal branch', () => {
  it('lets the opponent choose the branch that trashes their own top Life', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-OPP-MODAL',
      cardNumber: 'SYN-OPP-MODAL',
      category: 'character',
      baseCost: 0,
      basePower: 7000,
    });
    const opponentLife = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-MODAL-LIFE', cardNumber: 'SYN-OPP-MODAL-LIFE' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-OPP-MODAL',
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        functions: [
          {
            fn: 'chooseOne',
            chooser: 'opponent',
            prompt: 'Choose one effect to resolve.',
            options: [
              { label: 'trashOpponentLifeTop', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] },
              { label: 'moveControllerDeckTopToLifeTop', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' } }] },
            ],
          },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let opponentLifeId: string;
    ({ rig, lifeIds: [opponentLifeId] } = putLifeCards(rig, 'p2', [opponentLife]));
    const { rig: withHand, instanceId: handId } = putInHand(rig, 'p1', source);
    rig = withHand;

    const registry = buildRegistryFromAssignments([assignment]);
    const played = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = played.state.pendingChoices[0];
    expect(choice).toMatchObject({ kind: 'SELECT_OPTION', playerId: 'p2' });

    const resolved = executeAction(
      played.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p2', choiceId: choice.id, response: 0 },
      rig.defs,
      registry,
    );

    expect(resolved.state.players.p2.trash.cardIds).toContain(opponentLifeId);
    expect(resolved.state.players.p2.lifeArea.cardIds).not.toContain(opponentLifeId);
  });

  it("lets the opponent choose the branch that adds controller's deck top to controller Life", () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-OPP-MODAL-DECK',
      cardNumber: 'SYN-OPP-MODAL-DECK',
      category: 'character',
      baseCost: 0,
      basePower: 7000,
    });
    const deckTop = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-MODAL-DECK-TOP', cardNumber: 'SYN-OPP-MODAL-DECK-TOP' });
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-OPP-MODAL-DECK',
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        functions: [
          {
            fn: 'chooseOne',
            chooser: 'opponent',
            prompt: 'Choose one effect to resolve.',
            options: [
              { label: 'trashOpponentLifeTop', functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'opponent', position: 'top', count: 1 }, to: { zone: 'trash', player: 'owner' } }] },
              { label: 'moveControllerDeckTopToLifeTop', functions: [{ fn: 'moveCards', from: { zone: 'deck', player: 'controller', position: 'top' }, to: { zone: 'life', player: 'controller', position: 'top' } }] },
            ],
          },
        ],
      },
    };

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let deckTopId: string;
    ({ rig, deckIds: [deckTopId] } = putDeckCards(rig, 'p1', deckTop, 1));
    const { rig: withHand, instanceId: handId } = putInHand(rig, 'p1', source);
    rig = withHand;

    const registry = buildRegistryFromAssignments([assignment]);
    const played = executeAction(
      rig.state,
      { type: 'PLAY_CHARACTER', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: handId, donInstanceIds: [] },
      rig.defs,
      registry,
    );
    const choice = played.state.pendingChoices[0];
    const resolved = executeAction(
      played.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p2', choiceId: choice.id, response: 1 },
      rig.defs,
      registry,
    );

    expect(resolved.state.players.p1.lifeArea.cardIds[0]).toBe(deckTopId);
    expect(resolved.state.players.p1.deck.cardIds).not.toContain(deckTopId);
  });
});
