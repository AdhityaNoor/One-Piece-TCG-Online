import { describe, expect, it } from 'vitest';
import { executeAction } from '../../actions';
import { executeActivateEventMain } from '../../actions/handlers/activateEventMain';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { OP03_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP03';
import { OP11_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP11';
import { OP12_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP12';
import { OP16_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP16';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';
import { battleAttackerIsCharacterWithAttribute, fireOnKO, fireOnPlay, fireOpponentCharacterPlayedFromHandReactions } from '../fireTiming';
import { evaluateGates } from '../gates';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putInHand,
  putLifeCards,
} from '../../rules/shared/__tests__/testRig';
import type { GameState } from '../../state/game';

function programFor(assignment: CardEffectAssignment) {
  const bindings = 'templates' in assignment ? assignment.templates : [assignment];
  return {
    cardNumber: assignment.cardNumber,
    abilities: bindings.flatMap((b) => applyTemplate(assignment.cardNumber, b.templateId, b.params).abilities),
  };
}

describe('partial curation batch: OP03-001 / OP11-088 / OP12-081', () => {
  it('OP03-001 compiles attack-or-defended trash-any scaling program', () => {
    const entry = OP03_ASSIGNMENTS.find((a) => a.cardNumber === 'OP03-001')!;
    expect('templates' in entry && entry.templates).toHaveLength(2);
    const program = programFor(entry);
    expect(program.abilities.map((a) => a.timing)).toEqual(['whenAttacking', 'onOpponentsAttack']);
    const trashOp = program.abilities[0].ops[0];
    expect(trashOp).toMatchObject({ op: 'chooseTargets', max: -1, min: 0 });
    expect(program.abilities[0].ops[1]).toMatchObject({ op: 'trashCards', target: { sel: 'var', name: 't' } });
    expect(program.abilities[0].ops[2]).toMatchObject({
      op: 'addPower',
      amountPerVar: 't',
      amountPer: 1000,
      ifPrevious: 'previousMovedAny',
    });
  });

  it('OP11-088 requires Slash attacker attribute', () => {
    const entry = OP11_ASSIGNMENTS.find((a) => a.cardNumber === 'OP11-088')!;
    const program = programFor(entry);
    expect(program.abilities[0].battlingOpponentAttribute).toBe('slash');

    const slashDef = makeCharacterDef({
      cardDefinitionId: nextTestId('slash'),
      cardNumber: 'TEST-SLASH',
      name: 'Slash Attacker',
      attributes: ['slash'],
    });
    const nonSlashDef = makeCharacterDef({
      cardDefinitionId: nextTestId('strike'),
      cardNumber: 'TEST-STRIKE',
      name: 'Strike Attacker',
      attributes: ['strike'],
    });
    let rig = buildBaseRig();
    const { rig: r1, instanceId: slashId } = putCharacterInPlay(rig, 'p2', slashDef, { summoningSick: false });
    rig = r1;
    const battleSlash: GameState = {
      ...rig.state,
      currentBattle: {
        attackerInstanceId: slashId,
        targetInstanceId: rig.state.players.p1.leaderInstanceId,
        originalTargetInstanceId: rig.state.players.p1.leaderInstanceId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
    };
    expect(battleAttackerIsCharacterWithAttribute(battleSlash, rig.defs, 'slash')).toBe(true);

    const { rig: r2, instanceId: strikeId } = putCharacterInPlay(rig, 'p2', nonSlashDef, { summoningSick: false });
    const battleStrike: GameState = {
      ...r2.state,
      currentBattle: {
        attackerInstanceId: strikeId,
        targetInstanceId: r2.state.players.p1.leaderInstanceId,
        originalTargetInstanceId: r2.state.players.p1.leaderInstanceId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
    };
    expect(battleAttackerIsCharacterWithAttribute(battleStrike, r2.defs, 'slash')).toBe(false);
  });

  it('OP12-081 compiles leader-attack draw and opponent-play life trigger', () => {
    const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-081')!;
    const program = programFor(entry);
    expect(program.abilities[0]).toMatchObject({
      timing: 'whenAttacking',
      battleTargetIsOpponentLeader: true,
      gate: [{ kind: 'selfCharacterCostCount', minCost: 8, atLeast: 2 }],
    });
    expect(program.abilities[1]).toMatchObject({
      timing: 'onOpponentCharacterPlayedFromHand',
      oncePerTurn: true,
    });
  });

  it('selfCharacterCostCount gate counts cost-8+ Characters', () => {
    let rig = buildBaseRig();
    const cheap = makeCharacterDef({ cardDefinitionId: nextTestId('cheap'), cardNumber: 'TEST-CHEAP', baseCost: 3 });
    const expensive = makeCharacterDef({ cardDefinitionId: nextTestId('exp'), cardNumber: 'TEST-EXP', baseCost: 8 });
    ({ rig } = putCharacterInPlay(rig, 'p1', cheap, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p1', expensive, { summoningSick: false }));
    const ok = evaluateGates([{ kind: 'selfCharacterCostCount', minCost: 8, atLeast: 2 }], rig.state, rig.defs, 'p1');
    expect(ok).toBe(false);
    const expensive2 = makeCharacterDef({ cardDefinitionId: nextTestId('exp2'), cardNumber: 'TEST-EXP2', baseCost: 8 });
    ({ rig } = putCharacterInPlay(rig, 'p1', expensive2, { summoningSick: false }));
    const ok2 = evaluateGates([{ kind: 'selfCharacterCostCount', minCost: 8, atLeast: 2 }], rig.state, rig.defs, 'p1');
    expect(ok2).toBe(true);
  });

  it('fireOpponentCharacterPlayedFromHandReactions fires Koala life-to-hand on cost-8+ play', () => {
    const playedDef = makeCharacterDef({ cardDefinitionId: nextTestId('played'), cardNumber: 'TEST-PLAYED', baseCost: 8 });
    let rig = buildBaseRig({ leaderOverridesP1: { cardDefinitionId: 'OP12-081', cardNumber: 'OP12-081', name: 'Koala' } });
    ({ rig } = putLifeCards(rig, 'p2', [makeEventDef({ cardDefinitionId: nextTestId('life'), cardNumber: 'TEST-LIFE' })]));
    const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-081')!;
    const program = programFor(entry);
    const registry = buildRegistryFromAssignments([entry]);
    const { rig: withPlayed, instanceId: playedId } = putCharacterInPlay(rig, 'p2', playedDef, { summoningSick: false });
    const lifeBefore = withPlayed.state.players.p2.lifeArea.cardIds.length;
    const fired = fireOpponentCharacterPlayedFromHandReactions(
      withPlayed.state,
      'p2',
      playedId,
      false,
      registry,
      withPlayed.defs,
      'test',
    );
    expect(fired.state.players.p2.lifeArea.cardIds.length).toBe(lifeBefore - 1);
    expect(fired.state.players.p2.hand.cardIds.length).toBeGreaterThan(0);
  });

  it('OP16-107 onKO offers optional opponent top Life to card owner hand', () => {
    const burgessDef = makeCharacterDef({
      cardDefinitionId: 'OP16-107',
      cardNumber: 'OP16-107',
      name: 'Jesus Burgess',
    });
    let rig = buildBaseRig();
    ({ rig } = putLifeCards(rig, 'p2', [makeEventDef({ cardDefinitionId: nextTestId('life'), cardNumber: 'TEST-LIFE' })]));
    const { rig: withBurgess, instanceId: burgessId } = putCharacterInPlay(rig, 'p1', burgessDef, { summoningSick: false });
    const inst = withBurgess.state.cardsById[burgessId]!;
    const p1 = withBurgess.state.players.p1;
    const koState: GameState = {
      ...withBurgess.state,
      cardsById: { ...withBurgess.state.cardsById, [burgessId]: { ...inst, currentZone: 'trash', donAttached: [] } },
      players: {
        ...withBurgess.state.players,
        p1: {
          ...p1,
          characterArea: { ...p1.characterArea, cardIds: p1.characterArea.cardIds.filter((id) => id !== burgessId) },
          trash: { ...p1.trash, cardIds: [burgessId, ...p1.trash.cardIds] },
        },
      },
    };
    const entry = OP16_ASSIGNMENTS.find((a) => a.cardNumber === 'OP16-107')!;
    const registry = buildRegistryFromAssignments([entry]);
    const fired = fireOnKO(koState, burgessId, registry, withBurgess.defs, 'test');
    expect(fired.pendingChoices).toHaveLength(1);
    expect(fired.pendingChoices[0]).toMatchObject({
      kind: 'SELECT_OPTION',
      playerId: 'p1',
      prompt: expect.stringContaining("owner's hand"),
    });
  });

  it('OP16-119 onPlay searches top 3 and can add one to Life top', () => {
    const entry = OP16_ASSIGNMENTS.find((a) => a.cardNumber === 'OP16-119')!;
    expect('templates' in entry && entry.templates).toHaveLength(2);
    const program = programFor(entry);
    expect(program.abilities.map((a) => a.timing)).toEqual(['onPlay', 'lifeTrigger']);
    expect(program.abilities[0].ops[0]).toMatchObject({
      op: 'searchTopDeck',
      look: 3,
      pick: 1,
      destination: 'lifeTop',
      remainder: 'bottom',
    });

    const searcher = makeCharacterDef({
      cardDefinitionId: 'OP16-119',
      cardNumber: 'OP16-119',
      name: 'OP16-119',
      category: 'character',
      baseCost: 5,
    });
    const deckA = makeEventDef({ cardDefinitionId: nextTestId('deck-a'), cardNumber: 'TEST-DECK-A' });
    const deckB = makeEventDef({ cardDefinitionId: nextTestId('deck-b'), cardNumber: 'TEST-DECK-B' });
    const deckC = makeEventDef({ cardDefinitionId: nextTestId('deck-c'), cardNumber: 'TEST-DECK-C' });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let topId: string;
    let midId: string;
    let bottomId: string;
    ({ rig, deckIds: [topId] } = putDeckCards(rig, 'p1', deckA, 1));
    ({ rig, deckIds: [midId] } = putDeckCards(rig, 'p1', deckB, 1));
    ({ rig, deckIds: [bottomId] } = putDeckCards(rig, 'p1', deckC, 1));
    const { rig: withSearcher, instanceId: searcherId } = putCharacterInPlay(rig, 'p1', searcher, { summoningSick: false });

    const registry = buildRegistryFromAssignments([entry]);
    const playResult = fireOnPlay(withSearcher.state, searcherId, registry, withSearcher.defs, 'test');
    expect(playResult.pendingChoices).toHaveLength(1);
    const pickChoice = playResult.pendingChoices[0];
    const picked = executeAction(
      playResult.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: pickChoice.id, response: [topId] },
      withSearcher.defs,
      registry,
    );
    let finalState = picked.state;
    if (picked.state.pendingChoices.length > 0) {
      const orderChoice = picked.state.pendingChoices[0];
      finalState = executeAction(
        picked.state,
        { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('action'), playerId: 'p1', choiceId: orderChoice.id, response: [midId, bottomId] },
        withSearcher.defs,
        registry,
      ).state;
    }

    expect(finalState.players.p1.lifeArea.cardIds[0]).toBe(topId);
    expect(finalState.players.p1.deck.cardIds).toEqual([midId, bottomId]);
    expect(finalState.cardsById[topId]).toMatchObject({ currentZone: 'lifeArea' });
  });

  it('OP16-116 [Main] then adds optional opponent top Life to owner hand without 10 DON gate', () => {
    const entry = OP16_ASSIGNMENTS.find((a) => a.cardNumber === 'OP16-116')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseLifeToHand', player: 'opponent', optional: true, position: 'top' }),
      ]),
    );
    expect(program.abilities[0].gate).toBeUndefined();

    const eventDef = makeEventDef({
      cardDefinitionId: 'OP16-116',
      cardNumber: 'OP16-116',
      name: 'Zehahahahaha!',
      baseCost: 8,
    });
    const lifeDef = makeEventDef({ cardDefinitionId: nextTestId('opp-life'), cardNumber: 'TEST-OPP-LIFE' });

    let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });
    let eventHandId: string;
    ({ rig, instanceId: eventHandId } = putInHand(rig, 'p1', eventDef));
    ({ rig } = putLifeCards(rig, 'p2', [lifeDef]));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 8);

    const registry = buildRegistryFromAssignments([entry]);
    const activated = executeActivateEventMain(
      withDon.state,
      { type: 'ACTIVATE_EVENT_MAIN', actionId: nextTestId('action'), playerId: 'p1', handCardInstanceId: eventHandId, donInstanceIds: donIds },
      withDon.defs,
      registry,
    );
    expect(activated.pendingChoices).toHaveLength(1);
    expect(activated.pendingChoices[0]).toMatchObject({
      kind: 'SELECT_OPTION',
      playerId: 'p1',
      prompt: expect.stringContaining("opponent's Life"),
    });

    const lifeId = activated.state.players.p2.lifeArea.cardIds[0];
    const resolved = executeAction(
      activated.state,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: nextTestId('action'),
        playerId: 'p1',
        choiceId: activated.pendingChoices[0].id,
        response: 1,
      },
      withDon.defs,
      registry,
    );
    expect(resolved.state.players.p2.hand.cardIds).toContain(lifeId);
    expect(resolved.state.players.p2.lifeArea.cardIds).not.toContain(lifeId);
    expect(resolved.state.cardsById[lifeId]).toMatchObject({ currentZone: 'hand', ownerId: 'p2' });
  });
});
