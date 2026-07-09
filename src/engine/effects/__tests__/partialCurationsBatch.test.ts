import { describe, expect, it } from 'vitest';
import { executeAction } from '../../actions';
import { executeActivateEventMain } from '../../actions/handlers/activateEventMain';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { OP03_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP03';
import { OP09_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP09';
import { OP11_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP11';
import { OP12_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP12';
import { OP16_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP16';
import { EB_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/EB';
import { OP04_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP04';
import { OP01_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP01';
import { OP14_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP14';
import { OP13_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP13';
import { OP15_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP15';
import { ST29_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/ST29';
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

describe('partial curation batch: EB expressible fixes', () => {
  it('EB01-028 compiles counter return-active and lifeTrigger deck-bottom', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB01-028')!;
    expect('templates' in entry && entry.templates).toHaveLength(2);
    const program = programFor(entry);
    expect(program.abilities.map((a) => a.timing)).toEqual(['counter', 'lifeTrigger']);
    expect(program.abilities[0].ops.some((op) => op.op === 'moveToHand' || op.op === 'returnToHand')).toBe(true);
    expect(program.abilities[1].ops.some((op) => op.op === 'moveToBottomDeck')).toBe(true);
  });

  it('EB01-033 offers hand or trash via chooseOne', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB01-033')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops.some((op) => op.op === 'chooseOption')).toBe(true);
  });

  it('EB03-034 places hand card on deck top on play', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-034')!;
    const program = programFor(entry);
    const onPlay = program.abilities.find((a) => a.timing === 'onPlay')!;
    expect(onPlay.ops.some((op) => op.op === 'moveToTopDeck')).toBe(true);
  });

  it('EB02-011 and EB03-017 compile preventRest riders', () => {
    for (const id of ['EB02-011', 'EB03-017'] as const) {
      const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      const program = programFor(entry);
      expect(program.abilities[0].ops.some((op) => op.op === 'preventRest')).toBe(true);
    }
  });

  it('EB03-042 compiles onKO hand-or-trash chooseOne branches', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-042')!;
    expect('templates' in entry && entry.templates).toHaveLength(2);
    const program = programFor(entry);
    const onKo = program.abilities.find((a) => a.timing === 'onKO')!;
    expect(onKo.ops[0]).toMatchObject({ op: 'chooseOption' });
  });

  it('OP04-043 compiles hand-or-deck-bottom return', () => {
    const entry = OP04_ASSIGNMENTS.find((a) => a.cardNumber === 'OP04-043')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops[0]).toMatchObject({ op: 'chooseOption' });
  });
});

describe('partial curation batch: rest-cost and rest-immunity', () => {
  it('OP14-033 compiles onPlay preventRest and onKO rest-then-play', () => {
    const entry = OP14_ASSIGNMENTS.find((a) => a.cardNumber === 'OP14-033')!;
    expect('templates' in entry && entry.templates).toHaveLength(2);
    const program = programFor(entry);
    expect(program.abilities.map((a) => a.timing)).toEqual(['onPlay', 'onKO']);
    expect(program.abilities[1].ops.some((op) => op.op === 'playFromHand')).toBe(true);
  });

  it('OP15-024 compiles opponent-turn preventRest on self', () => {
    const entry = OP15_ASSIGNMENTS.find((a) => a.cardNumber === 'OP15-024')!;
    const program = programFor(entry);
    const aura = program.abilities.find((a) => a.timing === 'onEnterPlay')!;
    expect(aura.ops.some((op) => op.op === 'preventRest')).toBe(true);
  });

  it('OP01-051 compiles activateMain restThis playFromHand', () => {
    const entry = OP01_ASSIGNMENTS.find((a) => a.cardNumber === 'OP01-051')!;
    const program = programFor(entry);
    const activate = program.abilities.find((a) => a.timing === 'activateMain')!;
    expect(activate?.cost).toEqual([{ kind: 'restThis' }]);
    expect(activate?.ops.some((op) => op.op === 'playFromHand')).toBe(true);
  });

  it('OP04-119 compiles onPlay optional self-rest then play', () => {
    const entry = OP04_ASSIGNMENTS.find((a) => a.cardNumber === 'OP04-119')!;
    const program = programFor(entry);
    const onPlay = program.abilities.find((a) => a.timing === 'onPlay')!;
    expect(onPlay?.ops.some((op) => op.op === 'playFromHand')).toBe(true);
  });

  it('OP11-024 compiles onKO trash-restDon-play chain', () => {
    const entry = OP11_ASSIGNMENTS.find((a) => a.cardNumber === 'OP11-024')!;
    const program = programFor(entry);
    const onKo = program.abilities.find((a) => a.timing === 'onKO')!;
    expect(onKo?.ops.some((op) => op.op === 'chooseTargets' && op.from?.sel === 'controllerActiveDon')).toBe(true);
    expect(onKo?.ops.some((op) => op.op === 'playFromHand')).toBe(true);
  });

  it('EB03-018 compiles endOfTurn restDon-trash-setActive chain', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-018')!;
    const program = programFor(entry);
    const eot = program.abilities.find((a) => a.timing === 'endOfTurn')!;
    expect(eot?.ops.some((op) => op.op === 'chooseTargets' && op.from?.sel === 'controllerActiveDon')).toBe(true);
    expect(eot?.ops.some((op) => op.op === 'setActive')).toBe(true);
  });

  it('OP09-023 compiles onOpponentsAttack restDon-then-buff', () => {
    const entry = OP09_ASSIGNMENTS.find((a) => a.cardNumber === 'OP09-023')!;
    const program = programFor(entry);
    const react = program.abilities.find((a) => a.timing === 'onOpponentsAttack')!;
    expect(react?.ops.some((op) => op.op === 'chooseTargets' && op.from?.sel === 'controllerActiveDon')).toBe(true);
    expect(react?.ops.some((op) => op.op === 'addPower')).toBe(true);
  });

  it('EB02-061 compiles whenAttacking with activeOnly donMinus cost', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB02-061')!;
    const program = programFor(entry);
    const attack = program.abilities.find((a) => a.timing === 'whenAttacking')!;
    expect(attack?.cost).toEqual([{ kind: 'donMinus', count: 2, activeOnly: true }]);
  });

  it('OP11-035 onKO fires only for opponent-effect K.O.', () => {
    const entry = OP11_ASSIGNMENTS.find((a) => a.cardNumber === 'OP11-035')!;
    const registry = buildRegistryFromAssignments([entry]);
    const tigerDef = makeCharacterDef({ cardDefinitionId: 'OP11-035', cardNumber: 'OP11-035', types: ['Fish-Man'] });
    const oppKoDef = makeCharacterDef({ cardDefinitionId: 'OPP-KO', cardNumber: 'OPP-KO', baseCost: 5, basePower: 6000 });
    let rig = buildBaseRig();
    ({ rig } = putDon(rig, 'p1', 1, { rested: false }));
    let tigerId: string;
    let oppKoId: string;
    ({ rig, instanceId: tigerId } = putCharacterInPlay(rig, 'p1', tigerDef));
    ({ rig, instanceId: oppKoId } = putCharacterInPlay(rig, 'p2', oppKoDef));
    const inst = rig.state.cardsById[tigerId]!;
    const p1 = rig.state.players.p1;
    const koState: GameState = {
      ...rig.state,
      cardsById: { ...rig.state.cardsById, [tigerId]: { ...inst, currentZone: 'trash', donAttached: [] } },
      players: {
        ...rig.state.players,
        p1: {
          ...p1,
          characterArea: { ...p1.characterArea, cardIds: p1.characterArea.cardIds.filter((id) => id !== tigerId) },
          trash: { ...p1.trash, cardIds: [tigerId, ...p1.trash.cardIds] },
        },
      },
    };

    const battleKo = fireOnKO(koState, tigerId, registry, rig.defs, 'test', { cause: 'battle', sourceInstanceId: oppKoId });
    expect(battleKo.pendingChoices).toHaveLength(0);

    const effectKo = fireOnKO(koState, tigerId, registry, rig.defs, 'test', { cause: 'effect', sourceInstanceId: oppKoId });
    expect(effectKo.pendingChoices.length).toBeGreaterThan(0);
  });
});

describe('partial curation batch: KO replacement cluster', () => {
  it('EB04-043 compiles aura trashTrashToDeckBottom + onPlay trashTopDeck', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB04-043')!;
    const program = programFor(entry);
    const aura = program.abilities.find((a) => a.timing === 'onEnterPlay')!;
    expect(aura.ops.some((op) => op.op === 'registerKoReplacement')).toBe(true);
    const reg = aura.ops.find((op) => op.op === 'registerKoReplacement');
    expect(reg).toMatchObject({
      appliesTo: 'aura',
      effectSourceController: 'opponent',
      action: { kind: 'trashTrashToDeckBottom', count: 3 },
    });
    expect(program.abilities.find((a) => a.timing === 'onPlay')?.ops.some((op) => op.op === 'trashTopDeck')).toBe(true);
  });

  it('EB02-015 compiles preventRefresh + setActiveControllerDonAtEndOfTurn', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB02-015')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops.some((op) => op.op === 'preventRefresh')).toBe(true);
    expect(program.abilities[0].ops.some((op) => op.op === 'scheduleSetActiveControllerDonAtEndOfTurn')).toBe(true);
  });

  it('ST29-008 compiles Egghead turnTopLifeFace aura + lifeTrigger', () => {
    const entry = ST29_ASSIGNMENTS.find((a) => a.cardNumber === 'ST29-008')!;
    const program = programFor(entry);
    const aura = program.abilities.find((a) => a.timing === 'onEnterPlay')!;
    expect(aura?.ops.find((op) => op.op === 'registerKoReplacement')).toMatchObject({
      action: { kind: 'turnTopLifeFace', faceUp: true },
    });
    expect(program.abilities.find((a) => a.timing === 'lifeTrigger')).toBeDefined();
  });

  it('OP13-023 compiles onKO playFromHand rested', () => {
    const entry = OP13_ASSIGNMENTS.find((a) => a.cardNumber === 'OP13-023')!;
    const program = programFor(entry);
    const onKo = program.abilities.find((a) => a.timing === 'onKO');
    expect(onKo?.ops.some((op) => op.op === 'playFromHand')).toBe(true);
    expect(onKo?.ops.find((op) => op.op === 'playFromHand')).toMatchObject({ rested: true });
  });

  it('OP12-027 registers opponent-effect restSource aura', () => {
    const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-027')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops.find((op) => op.op === 'registerKoReplacement')).toMatchObject({
      effectSourceController: 'opponent',
      action: { kind: 'restSource' },
    });
  });

  it('EB03-026 compiles onPlay + activateMain giveDonLeaderAndCharacter', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-026')!;
    const program = programFor(entry);
    const activate = program.abilities.find((a) => a.timing === 'activateMain');
    expect(activate?.ops.filter((op) => op.op === 'giveDon')).toHaveLength(2);
  });

  it('EB04-016 compiles setActiveControllerDon + preventControllerCharacterSetActiveDon', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB04-016')!;
    const program = programFor(entry);
    const activate = program.abilities.find((a) => a.timing === 'activateMain');
    expect(activate?.ops.some((op) => op.op === 'preventControllerCharacterSetActiveDon')).toBe(true);
  });

  it('OP13-028 compiles preventControllerHandPlay', () => {
    const entry = OP13_ASSIGNMENTS.find((a) => a.cardNumber === 'OP13-028')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops.some((op) => op.op === 'preventControllerHandPlay')).toBe(true);
  });

  it('OP12-024 compiles active-only opponent-effect koImmunitySelf', () => {
    const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-024')!;
    const program = programFor(entry);
    expect(program.abilities[0].ops.find((op) => op.op === 'addKoImmunity')).toMatchObject({
      effectSourceController: 'opponent',
      condition: { rested: false },
    });
  });
});

describe('partial curation batch: giveDon filters / color play / OP14-020 Leader', () => {
  it('EB03-014 compiles leaderAttribute gate + giveDonControllerLeader', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-014')!;
    const program = programFor(entry);
    expect(program.abilities[0].gate).toEqual([{ kind: 'leaderAttribute', attribute: 'slash' }]);
    expect(program.abilities[0].ops.some((op) => op.op === 'giveDon')).toBe(true);
  });

  it('EB03-015 compiles giveDon anyOfTypes Fish-Man/Merfolk', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-015')!;
    const program = programFor(entry);
    const choose = program.abilities[0].ops.find((op) => op.op === 'chooseTargets');
    expect(choose?.from).toMatchObject({ sel: 'controllerLeaderOrCharacters', anyOfTypes: ['Fish-Man', 'Merfolk'] });
  });

  it('OP01-002 compiles excludeColorsOfPreviousMove on playFromHand', () => {
    const entry = OP01_ASSIGNMENTS.find((a) => a.cardNumber === 'OP01-002')!;
    const program = programFor(entry);
    const play = program.abilities[0].ops.find((op) => op.op === 'chooseTargets' && op.from?.sel === 'controllerHand');
    expect(play?.from?.filter).toMatchObject({ excludeColorsOfPreviousMove: true });
  });

  it('OP14-020 compiles slash-conditional power + character play lockout', () => {
    const entry = OP14_ASSIGNMENTS.find((a) => a.cardNumber === 'OP14-020')!;
    const program = programFor(entry);
    const staticBuff = program.abilities.find((a) => a.timing === 'onEnterPlay');
    expect(staticBuff?.ops[0]).toMatchObject({
      op: 'addPower',
      amount: 1000,
      condition: { gate: [{ kind: 'opponentLeaderAttribute', attribute: 'slash' }] },
    });
    const activate = program.abilities.find((a) => a.timing === 'activateMain');
    expect(activate?.ops.some((op) => op.op === 'preventControllerCharacterPlay')).toBe(true);
  });
});
