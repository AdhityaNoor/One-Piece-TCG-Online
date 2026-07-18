/**
 * Closing batch for assigned PARTIALs:
 * - OP03-040 replaceEmptyDeckDefeatWithWin
 * - OP05-119 grantExtraTurn + bottom-deck allies
 * - OP09-118 winGame on opponent Blocker at 0 Life
 * - OP13-003 registerDonPhasePlacement
 */
import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { executeEndMainPhase } from '../../actions/handlers/endMainPhase';
import { fireOpponentBlockerActivatedReactions, resumeProgram, runTimings } from '../index';
import { runDonPhase } from '../../rules/phases/runDonPhase';
import { runEndPhaseAndHandoff } from '../../rules/phases/runEndPhaseAndHandoff';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putDonDeckCards,
  putLifeCards,
} from '../../rules/shared/__tests__/testRig';

const NAMI: CardEffectAssignment = {
  cardNumber: 'OP03-040',
  templates: [
    { templateId: 'ability', params: { timing: 'startOfGame', functions: [{ fn: 'replaceEmptyDeckDefeatWithWin' }] } },
    {
      templateId: 'ability',
      params: {
        timing: 'onLifeDamageDealt',
        condition: { donAttachedAtLeast: 1 },
        functions: [{ fn: 'trashTopDeck', count: 1, optional: true }],
      },
    },
  ],
};

const GEAR5: CardEffectAssignment = {
  cardNumber: 'OP05-119',
  templates: [
    {
      templateId: 'ability',
      params: {
        timing: 'onPlay',
        cost: [{ kind: 'donMinus', count: 10 }],
        functions: [
          { fn: 'moveAllCharactersToBottomDeck', filter: { player: 'controller', excludeSelf: true } },
          { fn: 'grantExtraTurn' },
        ],
      },
    },
    {
      templateId: 'ability',
      params: {
        timing: 'activateMain',
        oncePerTurn: true,
        cost: [{ kind: 'restDon', count: 1 }],
        functions: [{ fn: 'addDonFromDeck', count: 1, rested: false }],
      },
    },
  ],
};

const ROGER_CHAR: CardEffectAssignment = {
  cardNumber: 'OP09-118',
  templates: [
    {
      templateId: 'ability',
      params: {
        timing: 'onEnterPlay',
        functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent' }],
      },
    },
    {
      templateId: 'ability',
      params: {
        timing: 'onOpponentBlockerActivated',
        gate: [{ kind: 'anyOf', gates: [{ kind: 'selfLife', atMost: 0 }, { kind: 'opponentLife', atMost: 0 }] }],
        functions: [{ fn: 'winGame' }],
      },
    },
  ],
};

const ROGER_LEADER: CardEffectAssignment = {
  cardNumber: 'OP13-003',
  templates: [
    { templateId: 'ability', params: { timing: 'startOfGame', functions: [{ fn: 'registerDonPhasePlacement' }] } },
    {
      templateId: 'ability',
      params: {
        timing: 'onEnterPlay',
        functions: [
          {
            fn: 'addPowerSelf',
            amount: -2000,
            duration: 'permanent',
            condition: { gate: [{ kind: 'selfDonFieldCount', atMost: 9 }] },
          },
        ],
      },
    },
  ],
};

describe('OP03-040 Nami empty-deck win replacement', () => {
  it('wins at end of Main when deck is 0 instead of losing', () => {
    const registry = buildRegistryFromAssignments([NAMI]);
    const fodder = makeCharacterDef({ cardDefinitionId: 'DECK-FODDER', cardNumber: 'DECK-001' });
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP03-040', cardNumber: 'OP03-040', name: 'Nami' }),
    });
    // Opponent must still have a deck so only Nami's empty-deck win fires.
    ({ rig } = putDeckCards(rig, 'p2', fodder, 3));
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    const after = runTimings(registry['OP03-040'], ['startOfGame'], rig.state, leaderId, rig.defs, null, registry);
    rig = { ...rig, state: after.state };
    expect(rig.state.players.p1.deck.cardIds).toHaveLength(0);

    const ended = executeEndMainPhase(rig.state, {
      type: 'END_MAIN_PHASE',
      actionId: nextTestId('end-main'),
      playerId: 'p1',
    });
    expect(ended.state.gameOver).toEqual({ winnerId: 'p1', reason: 'cardEffect' });
  });
});

describe('OP05-119 Gear 5 extra turn', () => {
  it('On Play DON!!−10 bottoms other Characters and grants an extra turn', () => {
    const registry = buildRegistryFromAssignments([GEAR5]);
    const gearDef = makeCharacterDef({
      cardDefinitionId: 'OP05-119',
      cardNumber: 'OP05-119',
      name: 'Monkey.D.Luffy',
      baseCost: 10,
      basePower: 12000,
    });
    const allyDef = makeCharacterDef({
      cardDefinitionId: 'ALLY',
      cardNumber: 'ALLY-001',
      baseCost: 3,
      basePower: 4000,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    // Keep opponent's deck non-empty so end-of-Main empty-deck judgment does not end the game.
    ({ rig } = putDeckCards(rig, 'p2', allyDef, 3));
    let donIds: string[];
    ({ rig, donIds } = putDon(rig, 'p1', 10, { rested: true }));
    let allyId: string;
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', allyDef));
    let gearId: string;
    ({ rig, instanceId: gearId } = putCharacterInPlay(rig, 'p1', gearDef));
    const defs = { ...rig.defs, [gearDef.cardDefinitionId]: gearDef, [allyDef.cardDefinitionId]: allyDef };

    const costPending = runTimings(registry['OP05-119'], ['onPlay'], rig.state, gearId, defs, null, registry);
    const choice = costPending.state.pendingChoices[0];
    expect(choice).toBeDefined();
    expect(choice.constraints.min).toBe(10);

    const fired = resumeProgram(registry['OP05-119'], costPending.state, choice, donIds, defs, null, registry);
    expect(fired.state.cardsById[allyId]?.currentZone).toBe('deck');
    expect(fired.state.players.p1.deck.cardIds).toContain(allyId);
    expect(fired.state.cardsById[gearId]?.currentZone).toBe('characterArea');
    expect(fired.state.pendingExtraTurnPlayerId).toBe('p1');

    const afterMain = executeEndMainPhase(fired.state, {
      type: 'END_MAIN_PHASE',
      actionId: nextTestId('end-main'),
      playerId: 'p1',
    });
    const ended = runEndPhaseAndHandoff(afterMain.state, defs, registry);
    expect(ended.state.activePlayerId).toBe('p1');
    expect(ended.state.pendingExtraTurnPlayerId).toBeUndefined();
    expect(ended.state.turnNumber).toBe(6);
  });
});

describe('OP09-118 win on Blocker at 0 Life', () => {
  it('wins when opponent activates Blocker and either player has 0 Life', () => {
    const registry = buildRegistryFromAssignments([ROGER_CHAR]);
    const rogerDef = makeCharacterDef({
      cardDefinitionId: 'OP09-118',
      cardNumber: 'OP09-118',
      name: 'Gol.D.Roger',
      baseCost: 10,
      basePower: 12000,
      hasRush: true,
    });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let rogerId: string;
    ({ rig, instanceId: rogerId } = putCharacterInPlay(rig, 'p1', rogerDef));
    const defs = { ...rig.defs, [rogerDef.cardDefinitionId]: rogerDef };

    // Empty Life for p2 (opponent).
    rig = {
      ...rig,
      state: {
        ...rig.state,
        players: {
          ...rig.state.players,
          p2: { ...rig.state.players.p2, lifeArea: { ...rig.state.players.p2.lifeArea, cardIds: [] } },
        },
      },
    };

    const reacted = fireOpponentBlockerActivatedReactions(rig.state, 'p1', registry, defs, 'blk');
    expect(reacted.state.gameOver).toEqual({ winnerId: 'p1', reason: 'cardEffect' });
    expect(rogerId).toBeTruthy();
  });

  it('does not win when both players still have Life', () => {
    const registry = buildRegistryFromAssignments([ROGER_CHAR]);
    const rogerDef = makeCharacterDef({
      cardDefinitionId: 'OP09-118',
      cardNumber: 'OP09-118',
      name: 'Gol.D.Roger',
      baseCost: 10,
      basePower: 12000,
    });
    const lifeDef = makeCharacterDef({ cardDefinitionId: 'LIFE-FODDER', cardNumber: 'LIFE-001' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    ({ rig } = putLifeCards(rig, 'p1', [lifeDef]));
    ({ rig } = putLifeCards(rig, 'p2', [lifeDef]));
    let rogerId: string;
    ({ rig, instanceId: rogerId } = putCharacterInPlay(rig, 'p1', rogerDef));
    expect(rig.state.players.p1.lifeArea.cardIds.length).toBeGreaterThan(0);
    expect(rig.state.players.p2.lifeArea.cardIds.length).toBeGreaterThan(0);

    const reacted = fireOpponentBlockerActivatedReactions(
      rig.state,
      'p1',
      registry,
      { ...rig.defs, [rogerDef.cardDefinitionId]: rogerDef },
      'blk',
    );
    expect(reacted.state.gameOver).toBeNull();
    expect(rogerId).toBeTruthy();
  });
});

describe('OP13-003 DON!! Phase placement to Leader', () => {
  it('gives 1 newly placed DON!! to Leader when field already had DON!!', () => {
    const registry = buildRegistryFromAssignments([ROGER_LEADER]);
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'don',
      turnNumber: 3,
      isFirstTurnOfGame: false,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP13-003', cardNumber: 'OP13-003', name: 'Gol.D.Roger' }),
    });
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    const afterReg = runTimings(registry['OP13-003'], ['startOfGame'], rig.state, leaderId, rig.defs, null, registry);
    rig = { ...rig, state: afterReg.state };

    ({ rig } = putDon(rig, 'p1', 1, { rested: false }));
    ({ rig } = putDonDeckCards(rig, 'p1', 10));
    const beforeCost = rig.state.players.p1.costArea.cardIds.length;
    expect(beforeCost).toBe(1);

    const result = runDonPhase(rig.state);
    expect(result.state.players.p1.costArea.cardIds.length).toBe(beforeCost + 2);
    expect(result.state.cardsById[leaderId].donAttached).toHaveLength(1);
    const attached = result.state.cardsById[leaderId].donAttached[0]!;
    expect(result.state.players.p1.costArea.cardIds).toContain(attached);
  });

  it('does not attach when field had no DON!! before placement', () => {
    const registry = buildRegistryFromAssignments([ROGER_LEADER]);
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'don',
      turnNumber: 3,
      isFirstTurnOfGame: false,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP13-003', cardNumber: 'OP13-003', name: 'Gol.D.Roger' }),
    });
    const leaderId = rig.state.players.p1.leaderInstanceId!;
    const afterReg = runTimings(registry['OP13-003'], ['startOfGame'], rig.state, leaderId, rig.defs, null, registry);
    rig = { ...rig, state: afterReg.state };
    expect(rig.state.players.p1.costArea.cardIds).toHaveLength(0);

    ({ rig } = putDonDeckCards(rig, 'p1', 10));
    const result = runDonPhase(rig.state);
    expect(result.state.cardsById[leaderId].donAttached).toHaveLength(0);
    expect(result.state.players.p1.costArea.cardIds).toHaveLength(2);
  });
});
