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
import { OP06_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP06';
import { OP01_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP01';
import { OP14_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP14';
import { OP13_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP13';
import { OP08_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP08';
import { OP15_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP15';
import { OP10_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP10';
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
  it('restControllerCards lowers to active Leader/Characters/Stage/DON selector union', () => {
    const program = applyTemplate('TEST-REST-CARDS', 'ability', {
      timing: 'activateMain',
      functions: [
        { fn: 'restControllerCards', count: 2, optional: true },
        { fn: 'draw', amount: 1, ifPrevious: 'previousSelectedAny' },
      ],
    });
    const [choose, rest, draw] = program.abilities[0].ops;
    expect(choose).toMatchObject({
      op: 'chooseTargets',
      min: 0,
      max: 2,
      from: {
        sel: 'union',
        members: [
          { sel: 'controllerActiveLeader' },
          { sel: 'controllerCharacters', rested: false },
          { sel: 'controllerActiveStages' },
          { sel: 'controllerActiveDon' },
        ],
      },
    });
    expect(rest).toMatchObject({ op: 'rest', target: { sel: 'var', name: 't' } });
    expect(draw).toMatchObject({ op: 'draw', amount: 1, ifPrevious: 'previousSelectedAny' });
  });

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

  it('OP16 batch compiles newly closed partial mappings', () => {
    const ids = ['OP16-001', 'OP16-007', 'OP16-008', 'OP16-048', 'OP16-063', 'OP16-076', 'OP16-087', 'OP16-101', 'OP16-106', 'OP16-113', 'OP16-115', 'OP16-117'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP16_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP16-001'].abilities[0].ops[0]).toMatchObject({ op: 'chooseOption' });
    expect(programs['OP16-007'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'controllerHand', filter: { category: 'character', exactPower: 8000 } } }),
        expect.objectContaining({ op: 'revealCards', ifPrevious: 'previousSelectedAny' }),
        expect.objectContaining({ op: 'addPower', amount: -1000, ifPrevious: 'previousSelectedAny' }),
      ]),
    );
    expect(programs['OP16-008'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'controllerCharacters', exactBasePower: 10000 } }),
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxPower: 8000 }, ifPrevious: 'previousMovedAny' }),
        expect.objectContaining({ op: 'ko', target: { sel: 'var', name: 't' }, ifPrevious: 'previousMovedAny' }),
      ]),
    );
    expect(programs['OP16-048'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'onOpponentsAttack']);
    expect(programs['OP16-048'].abilities[1].ops.some((op) => op.op === 'addKeyword' && op.keyword === 'blocker')).toBe(true);
    expect(programs['OP16-063'].abilities.find((a) => a.timing === 'activateMain')).toMatchObject({ oncePerTurn: true, cost: [{ kind: 'donMinus', count: 1 }] });
    expect(programs['OP16-063'].abilities.find((a) => a.timing === 'activateMain')?.ops.some((op) => op.op === 'suppressBlockerActivation')).toBe(true);
    expect(programs['OP16-076'].abilities.find((a) => a.timing === 'counter')).toMatchObject({ gate: [{ kind: 'selfTypedCharacterCount', typeIncludes: 'Admiral', atLeast: 1 }] });
    expect(programs['OP16-087'].abilities[0].ops[0]).toMatchObject({ op: 'chooseOption' });
    expect(programs['OP16-101'].abilities[0].ops.some((op) => op.op === 'ko' && op.ifGate?.[0]?.kind === 'selfTrashCount')).toBe(true);
    expect(programs['OP16-106'].abilities.every((ability) => ability.ops.some((op) => op.op === 'setBasePower' && op.value === 7000))).toBe(true);
    expect(programs['OP16-113'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops.some((op) => op.op === 'addKeyword' && op.keyword === 'blocker')).toBe(true);
    expect(programs['OP16-115'].abilities[0].ops[0]).toMatchObject({ from: { sel: 'controllerTrash', filter: { hasTrigger: true, excludeSelfName: true } } });
    expect(programs['OP16-117'].abilities[0].ops[0]).toMatchObject({ from: { sel: 'controllerHand', filter: { hasTrigger: true } } });
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

  it('OP08 follow-up batch compiles existing-capability partial closures', () => {
    const programs = Object.fromEntries(['OP08-005', 'OP08-060', 'OP08-075'].map((id) => {
      const entry = OP08_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP08-005'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addPower', amount: -2000 }),
        expect.objectContaining({ op: 'playFromHand', ifGate: [{ kind: 'selfDoesNotControlNamed', name: 'Kuromarimo' }] }),
      ]),
    );
    expect(programs['OP08-060'].abilities[0].gate).toEqual([{ kind: 'opponentDonFieldCount', atLeast: 5 }]);
    expect(programs['OP08-060'].abilities[0].ops[0]).toMatchObject({ op: 'addKeyword', keyword: 'rush' });
    expect(programs['OP08-075'].abilities.find((a) => a.timing === 'activateMain')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'rest' }),
        expect.objectContaining({ op: 'turnAllLifeFace', faceUp: false }),
      ]),
    );
  });
});

describe('partial curation batch: rest-cost and rest-immunity', () => {
  it('OP15 batch compiles conditional keyword and event rider closures', () => {
    const ids = ['OP15-011', 'OP15-021', 'OP15-042', 'OP15-048', 'OP15-069', 'OP15-075', 'OP15-076', 'OP15-077', 'OP15-087', 'OP15-090', 'OP15-094', 'OP15-098', 'OP15-099', 'OP15-105', 'OP15-114', 'OP15-116'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP15_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP15-011'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addKeyword', keyword: 'blocker' }),
        expect.objectContaining({ op: 'addPower', amount: 2000 }),
      ]),
    );
    expect(programs['OP15-021'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops[0]).toMatchObject({
      op: 'addCostAura',
      amount: -3,
      group: { controllerSameDefinitionInHand: true },
    });
    expect(programs['OP15-021'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops[0].condition?.gate).toEqual([
      { kind: 'selfTrashMatching', category: 'event', atLeast: 4 },
    ]);
    expect(programs['OP15-042'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'onKO']);
    expect(programs['OP15-042'].abilities.find((a) => a.timing === 'onKO')?.ops[0]).toMatchObject({ op: 'moveToHand', target: { sel: 'self' } });
    expect(programs['OP15-048'].abilities.find((a) => a.timing === 'onKO')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'opponentHand' }, chooser: 'opponent' }),
        expect.objectContaining({ op: 'moveToBottomDeck' }),
      ]),
    );
    expect(programs['OP15-069'].abilities[0].ops[0]).toMatchObject({ op: 'registerKoReplacement', condition: { maxBasePower: 7000 } });
    expect(programs['OP15-075'].abilities.find((a) => a.timing === 'counter')?.ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerLeaderOrCharacters', name: 'Enel' } });
    expect(programs['OP15-076'].abilities.find((a) => a.timing === 'counter')?.ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerLeaderOrCharacters', name: 'Enel' } });
    expect(programs['OP15-077'].abilities[0].ops.some((op) => op.op === 'preventRefresh')).toBe(true);
    expect(programs['OP15-087'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops[0]).toMatchObject({ op: 'addKeyword', keyword: 'blocker' });
    expect(programs['OP15-090'].abilities[0].ops[0]).toMatchObject({ op: 'registerKoReplacement', condition: { maxBasePower: 7000 } });
    expect(programs['OP15-094'].abilities[0].ops[0]).toMatchObject({
      op: 'registerKoReplacement',
      group: { anyOfTypes: ['Straw Hat Crew'], excludeSource: true },
    });
    expect(programs['OP15-098'].abilities[0].ops[0]).toMatchObject({ op: 'registerKoReplacement', condition: { minBasePower: 6000 } });
    expect(programs['OP15-099'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'activateMain']);
    expect(programs['OP15-099'].abilities.find((a) => a.timing === 'activateMain')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'turnLifeFace', faceUp: false }),
        expect.objectContaining({ op: 'giveDon', ifPrevious: 'previousSelectedAny' }),
      ]),
    );
    expect(programs['OP15-105'].abilities[0].ops[0]).toMatchObject({ op: 'registerKoReplacement', condition: { maxBasePower: 7000 } });

    const op15114 = programs['OP15-114'].abilities.find((a) => a.timing === 'onPlay')!;
    expect(op15114.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'turnLifeFace', faceUp: true }),
        expect.objectContaining({ op: 'addPowerAura', amount: -2000, ifPrevious: 'previousSelectedAny' }),
        expect.objectContaining({ op: 'ko', target: { sel: 'opponentCharacters', maxPower: 0 }, ifPrevious: 'previousSelectedAny' }),
      ]),
    );
    expect(programs['OP15-116'].abilities.map((a) => a.timing)).toEqual(['activateMain', 'counter']);
    expect(programs['OP15-116'].abilities.find((a) => a.timing === 'activateMain')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'trashLife', player: 'controller' }),
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'controllerDeckTop' }, ifPrevious: 'previousMovedAny' }),
        expect.objectContaining({ op: 'moveToLifeTop', ifPrevious: 'previousMovedAny' }),
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'controllerHand' }, ifPrevious: 'previousMovedAny' }),
        expect.objectContaining({ op: 'trashCards', ifPrevious: 'previousMovedAny' }),
      ]),
    );
  });

  it('OP14 batch compiles existing-capability partial closures', () => {
    const ids = ['OP14-048', 'OP14-057', 'OP14-063', 'OP14-088', 'OP14-098', 'OP14-103', 'OP14-104', 'OP14-110', 'OP14-112', 'OP14-120'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP14_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP14-048'].abilities[0].ops.some((op) => op.op === 'trashHandDownTo')).toBe(true);
    expect(programs['OP14-057'].abilities.find((a) => a.timing === 'onPlay')?.ops[0]).toMatchObject({
      op: 'addPowerAura',
      amount: 1000,
    });
    expect(programs['OP14-063'].abilities.find((a) => a.timing === 'onKO')?.gate).toEqual([{ kind: 'opponentDonFieldCount', atLeast: 6 }]);
    expect(programs['OP14-088'].abilities[0].ops.some((op) => op.op === 'chooseTargets' && op.from?.sel === 'opponentStages')).toBe(true);
    expect(programs['OP14-098'].abilities.find((a) => a.timing === 'onPlay')?.ops[0]).toMatchObject({
      op: 'addCostAura',
      amount: 3,
    });
    expect(programs['OP14-103'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'lifeTrigger']);
    expect(programs['OP14-104'].abilities.find((a) => a.timing === 'onPlay')?.ops[0]).toMatchObject({ op: 'chooseOption' });
    expect(programs['OP14-110'].abilities.find((a) => a.timing === 'onKO')?.ops.some((op) => op.op === 'playFromTrash')).toBe(true);
    expect(programs['OP14-112'].abilities.find((a) => a.timing === 'lifeTrigger')?.ops.some((op) => op.op === 'playFromHand')).toBe(true);
    expect(programs['OP14-120'].abilities[0].ops.some((op) => op.op === 'draw' && op.ifGate?.[0]?.kind === 'anyOf')).toBe(true);
  });

  it('OP04 follow-up batch compiles existing-capability partial closures', () => {
    const ids = ['OP04-039', 'OP04-093', 'OP04-094', 'OP04-116'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP04_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP04-039'].abilities.map((a) => a.timing)).toEqual(['onEnterPlay', 'activateMain']);
    expect(programs['OP04-039'].abilities.find((a) => a.timing === 'activateMain')).toMatchObject({
      oncePerTurn: true,
      cost: [{ kind: 'restDon', count: 1 }],
      gate: [{ kind: 'selfHand', atMost: 6 }],
    });
    expect(programs['OP04-039'].abilities.find((a) => a.timing === 'activateMain')?.ops[0]).toMatchObject({
      op: 'searchTopDeck',
      look: 2,
      remainder: 'trash',
    });

    expect(programs['OP04-093'].abilities.find((a) => a.timing === 'activateMain')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addPower', amount: 6000 }),
        expect.objectContaining({ op: 'addKeyword', keyword: 'doubleAttack', ifGate: [{ kind: 'selfTrashCount', atLeast: 15 }] }),
      ]),
    );
    expect(programs['OP04-094'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxCost: 4 }, ifGate: [{ kind: 'selfTrashCount', atMost: 14 }] }),
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxCost: 6 }, ifGate: [{ kind: 'selfTrashCount', atLeast: 15 }] }),
      ]),
    );
    expect(programs['OP04-116'].abilities.find((a) => a.timing === 'counter')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addPower', amount: 6000 }),
        expect.objectContaining({ op: 'ko', ifGate: [{ kind: 'combinedLifeTotal', atMost: 4 }] }),
      ]),
    );
  });

  it('OP09 follow-up batch compiles existing-capability partial closures', () => {
    const ids = ['OP09-005', 'OP09-039', 'OP09-112'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP09_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP09-005'].abilities[0].gate).toEqual([
      { kind: 'opponentCharacterBasePowerCount', power: 5000, atLeast: 2 },
    ]);
    expect(programs['OP09-039'].abilities.map((a) => a.timing)).toEqual(['counter', 'lifeTrigger']);
    expect(programs['OP09-039'].abilities.find((a) => a.timing === 'counter')).toMatchObject({
      gate: [{ kind: 'leaderType', type: 'ODYSSEY' }, { kind: 'selfRestedCharacterCount', atLeast: 2 }],
    });
    expect(programs['OP09-039'].abilities.find((a) => a.timing === 'counter')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addPower', amount: 2000 }),
      ]),
    );
    expect(programs['OP09-112'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'lifeTrigger']);
    expect(programs['OP09-112'].abilities.find((a) => a.timing === 'lifeTrigger')).toMatchObject({
      gate: [{ kind: 'leaderType', type: 'Revolutionary Army' }, { kind: 'combinedLifeTotal', atMost: 5 }],
    });
  });

  it('OP06 follow-up batch compiles existing-capability partial closures', () => {
    const ids = ['OP06-020', 'OP06-035', 'OP06-088', 'OP06-096', 'OP06-102', 'OP06-111', 'OP06-114'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP06_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP06-020'].abilities[0].ops.some((op) => op.op === 'preventControllerLifeToHand')).toBe(true);
    expect(programs['OP06-035'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: expect.objectContaining({ sel: 'union' }), max: 2 }),
        expect.objectContaining({ op: 'chooseLifeToHand', position: 'top' }),
      ]),
    );
    expect(programs['OP06-088'].abilities[0].ops[0]).toMatchObject({
      op: 'addPower',
      amount: 2000,
      condition: { gate: [{ kind: 'leaderType', type: 'Dressrosa' }, { kind: 'leaderActive' }] },
    });
    expect(programs['OP06-096'].abilities.every((ability) => ability.ops.some((op) => op.op === 'addKoImmunityAura' && op.condition?.maxCost === 7))).toBe(true);
    for (const id of ['OP06-102', 'OP06-111', 'OP06-114'] as const) {
      expect(programs[id].abilities[0].ops[0]).toMatchObject({
        op: 'chooseTargets',
        from: { sel: 'controllerStages', exactCost: 1 },
      });
    }
  });

  it('OP11 follow-up batch compiles existing-capability partial closures', () => {
    const ids = ['OP11-046', 'OP11-049', 'OP11-058', 'OP11-097', 'OP11-114', 'OP11-119'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP11_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP11-046'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addKoImmunity', effectSourceController: 'opponent' }),
        expect.objectContaining({ op: 'preventRest', effectSourceController: 'opponent' }),
      ]),
    );
    expect(programs['OP11-049'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'onOpponentsAttack']);
    expect(programs['OP11-049'].abilities.find((a) => a.timing === 'onOpponentsAttack')?.ops[0]).toMatchObject({ op: 'chooseOption' });
    expect(programs['OP11-058'].abilities[0].ops[0]).toMatchObject({
      op: 'preventAttack',
      condition: { gate: [{ kind: 'selfHand', atLeast: 5 }] },
    });
    expect(programs['OP11-097'].abilities[0].ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addPower', amount: 1000 }),
        expect.objectContaining({ op: 'moveToHand', ifGate: [{ kind: 'selfTrashCount', atLeast: 10 }] }),
      ]),
    );
    expect(programs['OP11-114'].abilities.map((a) => a.timing)).toEqual(['activateMain', 'counter']);
    expect(programs['OP11-114'].abilities.find((a) => a.timing === 'activateMain')).toMatchObject({
      cost: [{ kind: 'restDon', count: 3 }],
      gate: [{ kind: 'combinedLifeTotal', atLeast: 5 }],
    });
    expect(programs['OP11-114'].abilities.find((a) => a.timing === 'activateMain')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxBaseCost: 5 } }),
        expect.objectContaining({ op: 'ko', target: { sel: 'var', name: 't' } }),
      ]),
    );
    expect(programs['OP11-119'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'whenAttacking']);
    expect(programs['OP11-119'].abilities.find((a) => a.timing === 'whenAttacking')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'moveToBottomDeck' }),
        expect.objectContaining({ op: 'addPower', amount: 1000, duration: 'endOfOpponentsTurn', ifPrevious: 'previousMovedAny' }),
      ]),
    );
  });

  it('OP14 follow-up batch compiles existing-capability partial closures', () => {
    const ids = ['OP14-045', 'OP14-049', 'OP14-090'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP14_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP14-045'].abilities.map((a) => a.timing)).toEqual(['onHandTrashed', 'onKO']);
    expect(programs['OP14-045'].abilities.find((a) => a.timing === 'onHandTrashed')?.ops[0]).toMatchObject({
      op: 'addKeyword',
      keyword: 'rush',
      target: { sel: 'self' },
    });
    expect(programs['OP14-049'].abilities.map((a) => a.timing)).toEqual(['onHandTrashed', 'onPlay']);
    expect(programs['OP14-049'].abilities.find((a) => a.timing === 'onPlay')).toMatchObject({
      cost: [{ kind: 'restDon', count: 2 }],
    });
    expect(programs['OP14-090'].abilities.map((a) => a.timing)).toEqual(['onEnterPlay', 'onPlay']);
    expect(programs['OP14-090'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops[0]).toMatchObject({
      op: 'addKeyword',
      keyword: 'canAttackCharactersWhileSummoningSick',
      condition: { gate: [{ kind: 'anyOf', gates: [{ kind: 'anyCharacterExactCost', exactCost: 0 }, { kind: 'anyCharacterCostAtLeast', atLeast: 8 }] }] },
    });
  });

  it('OP10/OP12 follow-up batch compiles existing-capability partial closures', () => {
    const op10Programs = Object.fromEntries(['OP10-030', 'OP10-072', 'OP10-097', 'OP10-110'].map((id) => {
      const entry = OP10_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));
    const op12Programs = Object.fromEntries(['OP12-042', 'OP12-053', 'OP12-102'].map((id) => {
      const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(op10Programs['OP10-030'].abilities[0].ops.some((op) => op.op === 'preventControllerCharacterSetActiveDon')).toBe(true);
    expect(op10Programs['OP10-072'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'endOfTurn']);
    expect(op10Programs['OP10-072'].abilities.find((a) => a.timing === 'onPlay')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', from: { sel: 'controllerHand', filter: { category: 'event' } } }),
        expect.objectContaining({ op: 'draw', amount: 2, ifPrevious: 'previousSelectedAny' }),
      ]),
    );
    expect(op10Programs['OP10-097'].abilities.find((a) => a.timing === 'activateMain')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addKeyword', keyword: 'banish', ifGate: [{ kind: 'selfTrashCount', atLeast: 10 }] }),
      ]),
    );
    expect(op10Programs['OP10-110'].abilities.map((a) => a.timing)).toEqual(['onPlay', 'lifeTrigger']);
    expect(op10Programs['OP10-110'].abilities.find((a) => a.timing === 'lifeTrigger')).toMatchObject({
      gate: [{ kind: 'selfLife', atMost: 2 }],
    });

    expect(op12Programs['OP12-042'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops[0]).toMatchObject({
      op: 'addCost',
      condition: { gate: [{ kind: 'selfCharacterCostCount', minCost: 5, atLeast: 2 }] },
    });
    expect(op12Programs['OP12-053'].abilities[0].ops.find((op) => op.op === 'registerKoReplacement')).toMatchObject({
      appliesTo: 'self',
      replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
      effectSourceController: 'opponent',
      action: { kind: 'trashFromHand', count: 1 },
    });
    expect(op12Programs['OP12-102'].abilities[0].ops.find((op) => op.op === 'registerKoReplacement')).toMatchObject({
      appliesTo: 'aura',
      replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
      effectSourceController: 'opponent',
      action: { kind: 'turnTopLifeFace', faceUp: true },
    });
  });

  it('OP13 batch compiles existing-capability partial closures', () => {
    const ids = ['OP13-046', 'OP13-062', 'OP13-075', 'OP13-076', 'OP13-089', 'OP13-091', 'OP13-106', 'OP13-108', 'OP13-109', 'OP13-114', 'OP13-117'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP13_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP13-046'].abilities.some((a) => a.ops.some((op) => op.op === 'addKeyword' && op.keyword === 'doubleAttack'))).toBe(true);
    expect(programs['OP13-046'].abilities.flatMap((a) => a.ops).find((op) => op.op === 'registerKoReplacement')).toMatchObject({
      replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
      effectSourceController: 'opponent',
      action: { kind: 'trashFromHand', filter: { typeIncludes: 'Whitebeard Pirates' } },
    });
    expect(programs['OP13-062'].abilities.find((a) => a.timing === 'onPlay')?.gate).toEqual([{ kind: 'selfGivenDonCount', atLeast: 1 }]);
    expect(programs['OP13-075'].abilities.find((a) => a.timing === 'activateMain')?.ops.some((op) => op.op === 'addDonFromDeck')).toBe(true);
    expect(programs['OP13-076'].abilities.find((a) => a.timing === 'activateMain')?.ops.some((op) => op.op === 'addPower' && op.amount === -8000)).toBe(true);
    expect(programs['OP13-089'].abilities.some((a) => a.ops.some((op) => op.op === 'addKeyword' && op.keyword === 'blocker'))).toBe(true);
    expect(programs['OP13-091'].abilities.some((a) => a.ops.some((op) => op.op === 'addKeyword' && op.keyword === 'blocker'))).toBe(true);
    expect(programs['OP13-106'].abilities.map((a) => a.timing)).toEqual(['onTriggerActivated', 'lifeTrigger']);
    expect(programs['OP13-108'].abilities.find((a) => a.timing === 'onPlay')?.ops.some((op) => op.op === 'moveLifeTopToHand' && op.player === 'opponent')).toBe(true);
    expect(programs['OP13-109'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops.find((op) => op.op === 'registerKoReplacement')).toMatchObject({
      replacementTriggers: ['ko', 'returnToHand', 'bottomDeck'],
      effectSourceController: 'opponent',
      action: { kind: 'turnTopLifeFace', faceUp: true },
    });
    expect(programs['OP13-109'].abilities.find((a) => a.timing === 'lifeTrigger')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'draw', amount: 2 }),
        expect.objectContaining({ op: 'trashCards' }),
      ]),
    );
    expect(programs['OP13-114'].abilities.find((a) => a.timing === 'whenAttacking')?.ops.some((op) => op.op === 'turnLifeFace')).toBe(true);
    expect(programs['OP13-117'].abilities.find((a) => a.timing === 'onPlay')?.ops.some((op) => op.op === 'ko')).toBe(true);
  });

  it('OP12 batch compiles existing-capability partial closures', () => {
    const ids = ['OP12-018', 'OP12-059', 'OP12-065', 'OP12-087', 'OP12-089', 'OP12-095', 'OP12-096', 'OP12-100', 'OP12-113', 'OP12-115'] as const;
    const programs = Object.fromEntries(ids.map((id) => {
      const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === id)!;
      return [id, programFor(entry)];
    }));

    expect(programs['OP12-018'].abilities[0].ops.some((op) => op.op === 'chooseTargets' && op.from?.sel === 'controllerActiveDon')).toBe(true);
    expect(programs['OP12-018'].abilities[0].ops.some((op) => op.op === 'addPowerAura' && op.amount === -1000 && op.ifPrevious === 'previousSelectedAny')).toBe(true);
    expect(programs['OP12-059'].abilities.find((a) => a.timing === 'counter')).toMatchObject({ gate: [{ kind: 'selfTrashMatching', category: 'event', atLeast: 4 }] });
    expect(programs['OP12-065'].abilities.find((a) => a.timing === 'onKO')?.ops.some((op) => op.op === 'moveToHand')).toBe(true);
    expect(programs['OP12-087'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addKeyword', keyword: 'blocker' }),
        expect.objectContaining({ op: 'addCost', amount: 3 }),
      ]),
    );
    expect(programs['OP12-089'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addKeyword', keyword: 'blocker' }),
        expect.objectContaining({ op: 'addCost', amount: 4 }),
      ]),
    );
    expect(programs['OP12-095'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops[0]).toMatchObject({ op: 'addCost', amount: 4 });
    expect(programs['OP12-096'].abilities.find((a) => a.timing === 'activateMain')?.ops[0]).toMatchObject({ op: 'chooseOption' });
    expect(programs['OP12-100'].abilities.find((a) => a.timing === 'onEnterPlay')?.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'addKeyword', keyword: 'blocker' }),
        expect.objectContaining({ op: 'addCost', amount: 3 }),
      ]),
    );
    expect(programs['OP12-113'].abilities.find((a) => a.timing === 'onKO')?.ops.some((op) => op.op === 'playFromHand' && op.rested === true)).toBe(true);
    expect(programs['OP12-115'].abilities[0].ops.some((op) => op.op === 'moveToHand' && op.ifGate?.[0]?.kind === 'selfLife')).toBe(true);
  });

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
