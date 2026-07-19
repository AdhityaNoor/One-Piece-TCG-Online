import { describe, expect, it } from 'vitest';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { validateResolvePendingChoice } from '../../../engine/actions/handlers/resolvePendingChoice';
import { runTimings } from '../../../engine/effects/interpreter';
import { resumeChoice, fireCharacterKoedReactions } from '../../../engine/effects/fireTiming';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { computeCurrentPower } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay, putDeckCards, putDon, putDonDeckCards } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { EB_ASSIGNMENTS } from '../assignments/EB';
import { OP01_ASSIGNMENTS } from '../assignments/OP01';
import { PRB_ASSIGNMENTS } from '../assignments/PRB';
import { OP06_ASSIGNMENTS } from '../assignments/OP06';
import { OP05_ASSIGNMENTS } from '../assignments/OP05';
import { OP04_ASSIGNMENTS } from '../assignments/OP04';
import { OP03_ASSIGNMENTS } from '../assignments/OP03';
import { OP10_ASSIGNMENTS } from '../assignments/OP10';
import { OP11_ASSIGNMENTS } from '../assignments/OP11';
import { OP12_ASSIGNMENTS } from '../assignments/OP12';

const registry = buildRegistryFromAssignments([
  ...OP03_ASSIGNMENTS,
  ...OP04_ASSIGNMENTS,
  ...OP05_ASSIGNMENTS,
  ...OP06_ASSIGNMENTS,
  ...OP10_ASSIGNMENTS,
  ...OP11_ASSIGNMENTS,
  ...OP12_ASSIGNMENTS,
  ...EB_ASSIGNMENTS,
  ...OP01_ASSIGNMENTS,
  ...PRB_ASSIGNMENTS,
]);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

function finishTiming(cardNumber: string, timing: Parameters<typeof runTimings>[1][number], state: ReturnType<typeof buildBaseRig>['state'], sourceId: string, defs: ReturnType<typeof buildBaseRig>['defs']) {
  let result = runTimings(registry[cardNumber], [timing], state, sourceId, defs, null, registry);
  while (result.pendingChoices.length > 0) {
    const choice = result.pendingChoices[0];
    result = resumeChoice(result.state, choice.id, [], registry, defs, null);
  }
  return result;
}

describe('combined-power K.O. (OP05-007)', () => {
  it('rejects a 2-target selection whose combined power exceeds 4000', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const saboDef = makeCharacterDef({ cardDefinitionId: 'OP05-007', cardNumber: 'OP05-007', name: 'Sabo', baseCost: 5, basePower: 5000 });
    let saboId: string;
    ({ rig, instanceId: saboId } = putCharacterInPlay(rig, 'p1', saboDef, { summoningSick: false }));
    const weak = makeCharacterDef({ cardDefinitionId: 'weak-a', cardNumber: 'W-A', name: 'Weak A', baseCost: 2, basePower: 2000 });
    const strong = makeCharacterDef({ cardDefinitionId: 'weak-b', cardNumber: 'W-B', name: 'Weak B', baseCost: 3, basePower: 3000 });
    let aId: string;
    let bId: string;
    ({ rig, instanceId: aId } = putCharacterInPlay(rig, 'p2', weak, { summoningSick: false }));
    ({ rig, instanceId: bId } = putCharacterInPlay(rig, 'p2', strong, { summoningSick: false }));

    const fired = runTimings(registry['OP05-007'], ['onPlay'], rig.state, saboId, rig.defs, null, registry);
    expect(fired.pendingChoices).toHaveLength(1);
    const choice = fired.pendingChoices[0];
    const invalid = validateResolvePendingChoice(fired.state, {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: 'resolve',
      playerId: 'p1',
      choiceId: choice.id,
      response: [aId, bId],
    }, rig.defs);
    expect(invalid.legal).toBe(false);
    expect(invalid.reasons.some((r) => r.includes('combined power'))).toBe(true);
  });
});

describe('attack-restriction extensions', () => {
  it('EB04-005 allows attack when opponent has 2+ Characters with base power ≥5000', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const lawDef = makeCharacterDef({ cardDefinitionId: 'EB04-005', cardNumber: 'EB04-005', name: 'Trafalgar Law', baseCost: 4, basePower: 5000 });
    const big = makeCharacterDef({ cardDefinitionId: 'big', cardNumber: 'BIG', name: 'Big', baseCost: 6, basePower: 6000 });
    let lawId: string;
    ({ rig, instanceId: lawId } = putCharacterInPlay(rig, 'p1', lawDef, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p2', big, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p2', { ...big, cardDefinitionId: 'big2', cardNumber: 'BIG2' }, { summoningSick: false }));
    const applied = runTimings(registry['EB04-005'], ['onEnterPlay'], rig.state, lawId, rig.defs, null, registry);
    const foeLeaderId = applied.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(applied.state, declareAttack('p1', lawId, foeLeaderId), rig.defs).legal).toBe(true);
  });

  it('EB04-005 blocks attack when the unless-gate fails', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const lawDef = makeCharacterDef({ cardDefinitionId: 'EB04-005', cardNumber: 'EB04-005', name: 'Trafalgar Law', baseCost: 4, basePower: 5000 });
    let lawId: string;
    ({ rig, instanceId: lawId } = putCharacterInPlay(rig, 'p1', lawDef, { summoningSick: false }));
    const applied = runTimings(registry['EB04-005'], ['onEnterPlay'], rig.state, lawId, rig.defs, null, registry);
    const foeLeaderId = applied.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(applied.state, declareAttack('p1', lawId, foeLeaderId), rig.defs).legal).toBe(false);
  });

  it('OP11-058 blocks attack only while controller has 5+ cards in hand', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const luffyDef = makeCharacterDef({ cardDefinitionId: 'OP11-058', cardNumber: 'OP11-058', name: 'Luffy', baseCost: 5, basePower: 6000 });
    let luffyId: string;
    ({ rig, instanceId: luffyId } = putCharacterInPlay(rig, 'p1', luffyDef, { summoningSick: false }));
    const applied = runTimings(registry['OP11-058'], ['onEnterPlay'], rig.state, luffyId, rig.defs, null, registry);
    const foeLeaderId = applied.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(applied.state, declareAttack('p1', luffyId, foeLeaderId), rig.defs).legal).toBe(true);

    const handCards = Array.from({ length: 5 }, (_, i) => `hand-${i}`);
    const withHand = {
      ...applied.state,
      players: {
        ...applied.state.players,
        p1: { ...applied.state.players.p1, hand: { ...applied.state.players.p1.hand, cardIds: handCards } },
      },
    };
    expect(validateDeclareAttack(withHand, declareAttack('p1', luffyId, foeLeaderId), rig.defs).legal).toBe(false);
  });

  it('OP01-051 forces the opponent to attack Kid when taunt conditions hold', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 3 });
    const kidDef = makeCharacterDef({ cardDefinitionId: 'OP01-051', cardNumber: 'OP01-051', name: 'Eustass"Captain"Kid', baseCost: 4, basePower: 5000 });
    let kidId: string;
    ({ rig, instanceId: kidId } = putCharacterInPlay(rig, 'p1', kidDef, { summoningSick: false, orientation: 'rested' }));
    const don = putDon(rig, 'p1', 1);
    rig = don.rig;
    rig.state = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [kidId]: { ...rig.state.cardsById[kidId], donAttached: [don.donIds[0]] },
      },
    };
    const applied = runTimings(registry['OP01-051'], ['onEnterPlay'], rig.state, kidId, rig.defs, null, registry);
    const p2LeaderId = applied.state.players.p2.leaderInstanceId;
    const p2CharDef = makeCharacterDef({ cardDefinitionId: 'p2-char', cardNumber: 'P2C', name: 'P2 Char', baseCost: 2, basePower: 2000 });
    let p2CharId: string;
    ({ rig, instanceId: p2CharId } = putCharacterInPlay({ ...rig, state: applied.state }, 'p2', p2CharDef, { summoningSick: false }));

    expect(validateDeclareAttack(rig.state, declareAttack('p2', p2LeaderId, kidId), rig.defs).legal).toBe(true);
    expect(validateDeclareAttack(rig.state, declareAttack('p2', p2LeaderId, p2CharId), rig.defs).legal).toBe(false);
  });

  it('OP06-026 bars controller Leader attacks but allows Character attacks', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const koushirouDef = makeCharacterDef({ cardDefinitionId: 'OP06-026', cardNumber: 'OP06-026', name: 'Koushirou', baseCost: 1, basePower: 1000 });
    let koushirouId: string;
    ({ rig, instanceId: koushirouId } = putCharacterInPlay(rig, 'p1', koushirouDef, { summoningSick: false }));
    const foeCharDef = makeCharacterDef({ cardDefinitionId: 'foe-char', cardNumber: 'FOE', name: 'Foe', baseCost: 2, basePower: 2000, types: ['Slash'] });
    let foeCharId: string;
    ({ rig, instanceId: foeCharId } = putCharacterInPlay(rig, 'p2', foeCharDef, { summoningSick: false, orientation: 'rested' }));
    const applied = finishTiming('OP06-026', 'onPlay', rig.state, koushirouId, rig.defs);
    const p1LeaderId = applied.state.players.p1.leaderInstanceId;
    const p2LeaderId = applied.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(applied.state, declareAttack('p1', p1LeaderId, p2LeaderId), rig.defs).legal).toBe(false);
    expect(validateDeclareAttack(applied.state, declareAttack('p1', koushirouId, foeCharId), rig.defs).legal).toBe(true);
  });

  it('OP06-026 player-wide leader attack ban applies to Characters played afterward', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const koushirouDef = makeCharacterDef({ cardDefinitionId: 'OP06-026', cardNumber: 'OP06-026', name: 'Koushirou', baseCost: 1, basePower: 1000 });
    let koushirouId: string;
    ({ rig, instanceId: koushirouId } = putCharacterInPlay(rig, 'p1', koushirouDef, { summoningSick: false }));
    const applied = finishTiming('OP06-026', 'onPlay', rig.state, koushirouId, rig.defs);
    const lateDef = makeCharacterDef({ cardDefinitionId: 'late', cardNumber: 'LATE', name: 'Late', baseCost: 2, basePower: 2000 });
    let lateId: string;
    ({ rig, instanceId: lateId } = putCharacterInPlay({ ...rig, state: applied.state }, 'p1', lateDef, { summoningSick: false }));
    const p2LeaderId = rig.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(rig.state, declareAttack('p1', lateId, p2LeaderId), rig.defs).legal).toBe(false);
  });
});

describe('mixed rest targets', () => {
  it('OP12-037 program unions opponent Characters + unattached DON!! for rest selection', () => {
    const program = registry['OP12-037'];
    expect(program).toBeDefined();
    const main = program.abilities.find((a) => a.timing === 'activateMain');
    const choose = main?.ops.find((op) => op.op === 'chooseTargets');
    expect(choose?.from).toMatchObject({
      sel: 'union',
      members: [{ sel: 'opponentCharacters' }, { sel: 'opponentUnattachedDon' }],
    });
  });

  it('OP06-020 carries the cost filter into the Characters member of the union', () => {
    const main = registry['OP06-020'].abilities.find((a) => a.timing === 'activateMain');
    const choose = main?.ops.find((op) => op.op === 'chooseTargets');
    expect(choose?.from).toMatchObject({
      sel: 'union',
      members: [{ sel: 'opponentCharacters', maxCost: 3 }, { sel: 'opponentUnattachedDon' }],
    });
  });

  it('EB03-061 compiles the FILM set-active end-of-turn ability and the cost-filtered union rest', () => {
    const program = registry['EB03-061'];
    const main = program.abilities.find((a) => a.timing === 'activateMain');
    const restOp = main?.ops.find((op) => op.op === 'chooseTargets' && op.from.sel === 'union');
    if (restOp?.op !== 'chooseTargets') throw new Error('expected chooseTargets');
    expect(restOp?.from).toMatchObject({
      sel: 'union',
      members: [{ sel: 'opponentCharacters', maxCost: 4 }, { sel: 'opponentUnattachedDon' }],
    });
    const eot = program.abilities.find((a) => a.timing === 'endOfTurn');
    expect(eot?.cost).toEqual([{ kind: 'restDon', count: 1 }]);
  });
});

describe('opp-deck reveal reuse', () => {
  it('OP11-062 compiles peek + battle power on whenAttacking and onOpponentsAttack', () => {
    const program = registry['OP11-062'];
    expect(program.abilities).toHaveLength(2);
    for (const ability of program.abilities) {
      expect(ability.cost).toEqual([{ kind: 'donMinus', count: 1 }]);
      expect(ability.ops.map((op) => op.op)).toEqual(['revealOpponentDeckTop', 'addPower']);
    }
  });

  it('OP11-070 activate compiles donMinus + restThis + revealOpponentDeckTop', () => {
    const program = registry['OP11-070'];
    expect(program.abilities).toHaveLength(2);
    const activate = program.abilities.find((a) => a.timing === 'activateMain');
    expect(activate?.cost).toEqual([{ kind: 'donMinus', count: 1 }, { kind: 'restThis' }]);
    expect(activate?.ops.map((op) => op.op)).toEqual(['revealOpponentDeckTop']);
  });

  it('EB04-051 allows attack when any Character has base power ≥12000', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const emetDef = makeCharacterDef({ cardDefinitionId: 'EB04-051', cardNumber: 'EB04-051', name: 'Emet', baseCost: 8, basePower: 10000 });
    const titan = makeCharacterDef({ cardDefinitionId: 'titan', cardNumber: 'TITAN', name: 'Titan', baseCost: 10, basePower: 12000 });
    let emetId: string;
    ({ rig, instanceId: emetId } = putCharacterInPlay(rig, 'p1', emetDef, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p2', titan, { summoningSick: false }));
    const applied = runTimings(registry['EB04-051'], ['onEnterPlay'], rig.state, emetId, rig.defs, null, registry);
    const foeLeaderId = applied.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(applied.state, declareAttack('p1', emetId, foeLeaderId), rig.defs).legal).toBe(true);
  });
});

describe('OP10-022 composed ability', () => {
  it('requires total Character cost ≥5 and nests life reveal/play under chooseOne', () => {
    const program = registry['OP10-022'];
    const main = program.abilities[0];
    expect(main.gate).toEqual([{ kind: 'selfCharactersTotalCostAtLeast', atLeast: 5 }]);
    expect(main.condition).toEqual({ donAttachedAtLeast: 1 });
    expect(main.ops).toHaveLength(1);
    const choose = main.ops[0];
    // Template fn `chooseOne` compiles to IR `chooseOption`.
    expect(choose.op).toBe('chooseOption');
    if (choose.op !== 'chooseOption') throw new Error('expected chooseOption');
    expect(choose.options.map((o) => o.label)).toEqual(['doNotReturn', 'return']);
    expect(choose.options[0].ops).toEqual([]);
    // return branch: return Character to hand, then revealTopLifePlay (reveal + optional playFromLife).
    expect(choose.options[1].ops.map((op) => op.op)).toEqual(['chooseTargets', 'moveToHand', 'revealTopLife', 'chooseOption']);
    const reveal = choose.options[1].ops.find((op) => op.op === 'revealTopLife');
    expect(reveal).toMatchObject({
      op: 'revealTopLife',
      filter: { category: 'character', typeIncludes: 'Supernovas', maxCost: 5 },
    });
    const playChoice = choose.options[1].ops.find((op) => op.op === 'chooseOption' && op.ifPrevious === 'previousRevealMatched');
    expect(playChoice?.op).toBe('chooseOption');
    if (playChoice?.op !== 'chooseOption') throw new Error('expected nested play chooseOption');
    expect(playChoice.options.map((o) => o.label)).toEqual(['doNotPlay', 'play']);
    expect(playChoice.options[1].ops.some((op) => op.op === 'playFromLife')).toBe(true);
  });
});

describe('filtered attack targets (OP12-020)', () => {
  it('bars attacks into opponent Characters with base cost ≤7 after activate', () => {
    const zoroDef = makeLeaderDef({ cardDefinitionId: 'OP12-020', cardNumber: 'OP12-020', name: 'Zoro', basePower: 6000, attributes: ['slash'] });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: zoroDef });
    const leaderId = rig.state.players.p1.leaderInstanceId;
    rig.defs[zoroDef.cardDefinitionId] = zoroDef;
    const don = putDon(rig, 'p1', 3);
    rig = don.rig;
    rig.state = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [leaderId]: { ...rig.state.cardsById[leaderId], donAttached: don.donIds, battledOpponentCharacterTurn: 3 },
      },
    };
    const cheap = makeCharacterDef({ cardDefinitionId: 'cheap', cardNumber: 'CH', name: 'Cheap', baseCost: 5, basePower: 5000 });
    const pricey = makeCharacterDef({ cardDefinitionId: 'pricey', cardNumber: 'PX', name: 'Pricey', baseCost: 8, basePower: 8000 });
    let cheapId: string;
    let priceyId: string;
    ({ rig, instanceId: cheapId } = putCharacterInPlay(rig, 'p2', cheap, { summoningSick: false, orientation: 'rested' }));
    ({ rig, instanceId: priceyId } = putCharacterInPlay(rig, 'p2', pricey, { summoningSick: false, orientation: 'rested' }));
    rig.defs[cheap.cardDefinitionId] = cheap;
    rig.defs[pricey.cardDefinitionId] = pricey;

    const applied = runTimings(registry['OP12-020'], ['activateMain'], rig.state, leaderId, rig.defs, null, registry);
    const p2LeaderId = applied.state.players.p2.leaderInstanceId;
    expect(validateDeclareAttack(applied.state, declareAttack('p1', leaderId, cheapId), rig.defs).legal).toBe(false);
    expect(validateDeclareAttack(applied.state, declareAttack('p1', leaderId, priceyId), rig.defs).legal).toBe(true);
    expect(validateDeclareAttack(applied.state, declareAttack('p1', leaderId, p2LeaderId), rig.defs).legal).toBe(true);
  });

  it('EB04-012/013 compile setActiveControllerLeader', () => {
    expect(registry['EB04-012'].abilities[0].ops).toEqual([{ op: 'setActive', target: { sel: 'controllerLeader' } }]);
    const onPlay = registry['EB04-013'].abilities[0];
    expect(onPlay.ops.at(-1)).toEqual({ op: 'setActive', target: { sel: 'controllerLeader' } });
  });
});

describe('draw/trash scaling and union attack-restriction targets', () => {
  it('EB04-011 draws and trashes per Neptunian Character count', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const neptunian = makeCharacterDef({ cardDefinitionId: 'nep', cardNumber: 'NEP', name: 'Neptunian', baseCost: 3, basePower: 4000, types: ['Neptunian'] });
    const scaledDef = makeCharacterDef({ cardDefinitionId: 'EB04-011', cardNumber: 'EB04-011', name: 'Scaled', baseCost: 4, basePower: 5000 });
    ({ rig } = putCharacterInPlay(rig, 'p1', neptunian, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p1', { ...neptunian, cardDefinitionId: 'nep2', cardNumber: 'NEP2' }, { summoningSick: false }));
    let scaledId: string;
    ({ rig, instanceId: scaledId } = putCharacterInPlay(rig, 'p1', scaledDef, { summoningSick: false }));
    const deckFiller = makeCharacterDef({ cardDefinitionId: 'filler', cardNumber: 'FILL', name: 'Filler', baseCost: 1, basePower: 1000 });
    ({ rig } = putDeckCards(rig, 'p1', deckFiller, 5));
    const handBefore = rig.state.players.p1.hand.cardIds.length;
    const deckBefore = rig.state.players.p1.deck.cardIds.length;

    const fired = runTimings(registry['EB04-011'], ['onPlay'], rig.state, scaledId, rig.defs, null, registry);
    expect(fired.state.players.p1.hand.cardIds.length).toBe(handBefore + 2);
    expect(fired.state.players.p1.deck.cardIds.length).toBe(deckBefore - 2);
    expect(fired.pendingChoices).toHaveLength(1);
    expect(fired.pendingChoices[0].constraints).toMatchObject({ min: 2, max: 2 });
  });

  it('PRB02-017 compiles rested-leader-or-non-Luffy preventAttack selector', () => {
    const onPlay = registry['PRB02-017'].abilities.find((a) => a.timing === 'onPlay');
    const prevent = onPlay?.ops.find((op) => op.op === 'chooseTargets' && op.from.sel === 'opponentLeaderOrCharacters');
    if (prevent?.op !== 'chooseTargets') throw new Error('expected chooseTargets');
    expect(prevent?.from).toMatchObject({ sel: 'opponentLeaderOrCharacters', restedLeader: true, excludeName: 'Monkey.D.Luffy' });
  });

  it('EB02-019 grants canAttackActive only when opponent has 2+ Characters on its play turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    const cardDef = makeCharacterDef({ cardDefinitionId: 'EB02-019', cardNumber: 'EB02-019', name: 'Test', baseCost: 4, basePower: 5000 });
    const foe = makeCharacterDef({ cardDefinitionId: 'foe', cardNumber: 'FOE', name: 'Foe', baseCost: 3, basePower: 3000 });
    ({ rig } = putCharacterInPlay(rig, 'p2', foe, { summoningSick: false, orientation: 'active' }));
    ({ rig } = putCharacterInPlay(rig, 'p2', { ...foe, cardDefinitionId: 'foe2', cardNumber: 'FOE2' }, { summoningSick: false, orientation: 'active' }));
    let selfId: string;
    ({ rig, instanceId: selfId } = putCharacterInPlay(rig, 'p1', cardDef, { summoningSick: false, enteredPlayTurn: 5 }));
    const applied = runTimings(registry['EB02-019'], ['onEnterPlay'], rig.state, selfId, rig.defs, null, registry);
    const activeTarget = applied.state.players.p2.characterArea.cardIds[0];
    expect(validateDeclareAttack(applied.state, declareAttack('p1', selfId, activeTarget), rig.defs).legal).toBe(true);

    const nextTurn = {
      ...applied.state,
      turnNumber: 6,
      cardsById: {
        ...applied.state.cardsById,
        [selfId]: { ...applied.state.cardsById[selfId], enteredPlayTurn: 5 },
      },
    };
    expect(validateDeclareAttack(nextTurn, declareAttack('p1', selfId, activeTarget), rig.defs).legal).toBe(false);
  });
});

describe("opponent's-Character-K.O.'d reactive trigger (koedCharacterController)", () => {
  const enemyDef = makeCharacterDef({ cardDefinitionId: 'ENEMY-DEF', cardNumber: 'ENEMY-1', name: 'Enemy', baseCost: 2, basePower: 2000 });

  function koTo(state: ReturnType<typeof buildBaseRig>['state'], ids: string[]) {
    const cardsById = { ...state.cardsById };
    for (const id of ids) cardsById[id] = { ...cardsById[id], currentZone: 'trash' };
    return { ...state, cardsById };
  }

  it('EB04-044 (Koby) draws when the opponent’s Character is K.O.’d on your turn, but only once per turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    rig = putDeckCards(rig, 'p1', enemyDef, 5).rig;
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'EB04-044', cardNumber: 'EB04-044', name: 'Koby', baseCost: 3 })));
    let foeA: string;
    let foeB: string;
    ({ rig, instanceId: foeA } = putCharacterInPlay(rig, 'p2', enemyDef));
    ({ rig, instanceId: foeB } = putCharacterInPlay(rig, 'p2', { ...enemyDef, cardDefinitionId: 'ENEMY-DEF-2', cardNumber: 'ENEMY-2' }));

    const before = rig.state;
    const handBefore = before.players.p1.hand.cardIds.length;
    // Two opponent Characters K.O.'d in the same action → [Once Per Turn] fires the draw exactly once.
    const fired = fireCharacterKoedReactions(before, koTo(before, [foeA, foeB]), registry, rig.defs, 'test');
    expect(fired.state.players.p1.hand.cardIds.length).toBe(handBefore + 1);
  });

  it('EB04-044 (Koby) does NOT draw when your OWN Character is K.O.’d', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    rig = putDeckCards(rig, 'p1', enemyDef, 5).rig;
    ({ rig } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'EB04-044', cardNumber: 'EB04-044', name: 'Koby', baseCost: 3 })));
    let mine: string;
    ({ rig, instanceId: mine } = putCharacterInPlay(rig, 'p1', enemyDef));

    const before = rig.state;
    const handBefore = before.players.p1.hand.cardIds.length;
    const fired = fireCharacterKoedReactions(before, koTo(before, [mine]), registry, rig.defs, 'test');
    expect(fired.state.players.p1.hand.cardIds.length).toBe(handBefore);
  });

  it('OP01-061 (Kaido) adds an active DON!! when the opponent’s Character is K.O.’d (DON!! x1, Your Turn)', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP01-061', cardNumber: 'OP01-061', name: 'Kaido' }),
    });
    rig = putDonDeckCards(rig, 'p1', 3).rig;
    const kaidoId = rig.state.players.p1.leaderInstanceId!;
    const donRes = putDon(rig, 'p1', 1);
    rig = donRes.rig;
    // Satisfy the [DON!! x1] condition by attaching a DON!! to the Leader.
    rig = { ...rig, state: { ...rig.state, cardsById: { ...rig.state.cardsById, [kaidoId]: { ...rig.state.cardsById[kaidoId], donAttached: [donRes.donIds[0]] } } } };
    let foe: string;
    ({ rig, instanceId: foe } = putCharacterInPlay(rig, 'p2', enemyDef));

    const before = rig.state;
    const costBefore = before.players.p1.costArea.cardIds.length;
    const fired = fireCharacterKoedReactions(before, koTo(before, [foe]), registry, rig.defs, 'test');
    const costArea = fired.state.players.p1.costArea.cardIds;
    expect(costArea.length).toBe(costBefore + 1);
    const addedDon = costArea.map((id) => fired.state.cardsById[id]).find((c) => c.currentZone === 'costArea' && c.donRested === false && !before.players.p1.costArea.cardIds.includes(c.instanceId));
    expect(addedDon).toBeDefined();
  });

  it('OP01-061 (Kaido) does nothing without the [DON!! x1] condition met', () => {
    let rig = buildBaseRig({
      activePlayerId: 'p1',
      phase: 'main',
      turnNumber: 3,
      leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP01-061', cardNumber: 'OP01-061', name: 'Kaido' }),
    });
    rig = putDonDeckCards(rig, 'p1', 3).rig;
    let foe: string;
    ({ rig, instanceId: foe } = putCharacterInPlay(rig, 'p2', enemyDef));

    const before = rig.state;
    const costBefore = before.players.p1.costArea.cardIds.length;
    const fired = fireCharacterKoedReactions(before, koTo(before, [foe]), registry, rig.defs, 'test');
    expect(fired.state.players.p1.costArea.cardIds.length).toBe(costBefore);
  });
});

describe('reactive triggers reusing already-wired firing points (custom-trigger)', () => {
  it('OP11-012 (Franky) buffs all of YOUR Characters +2000 when the opponent activates an Event on your turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let frankyId: string;
    let allyId: string;
    let foeId: string;
    ({ rig, instanceId: frankyId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'OP11-012', cardNumber: 'OP11-012', name: 'Franky', baseCost: 4, basePower: 5000 })));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'ally', cardNumber: 'ALLY', baseCost: 2, basePower: 2000 })));
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'foe', cardNumber: 'FOE', baseCost: 2, basePower: 3000 })));

    const state = runTimings(registry['OP11-012'], ['onOpponentEventActivated'], rig.state, frankyId, rig.defs, null, registry).state;
    expect(computeCurrentPower(rig.defs, state, frankyId)).toBe(7000);
    expect(computeCurrentPower(rig.defs, state, allyId)).toBe(4000);
    expect(computeCurrentPower(rig.defs, state, foeId)).toBe(3000); // opponent's Character untouched
  });

  it('OP03-040 (Nami) trashes the top card of your deck when Life damage is dealt ([DON!! x1])', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP03-040', cardNumber: 'OP03-040', name: 'Nami' }) });
    const namiId = rig.state.players.p1.leaderInstanceId!;
    rig = putDeckCards(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'dk', cardNumber: 'DK', baseCost: 1 }), 5).rig;
    const donRes = putDon(rig, 'p1', 1);
    rig = donRes.rig;
    rig = { ...rig, state: { ...rig.state, cardsById: { ...rig.state.cardsById, [namiId]: { ...rig.state.cardsById[namiId], donAttached: [donRes.donIds[0]] } } } };

    const deckBefore = rig.state.players.p1.deck.cardIds.length;
    // Printed: "you may trash 1 card from the top of your deck" → optional chooseOption (skip | trash).
    const fired = runTimings(registry['OP03-040'], ['onLifeDamageDealt'], rig.state, namiId, rig.defs, null, registry);
    expect(fired.pendingChoices).toHaveLength(1);
    expect(fired.pendingChoices[0]).toMatchObject({ kind: 'SELECT_OPTION' });
    const resolved = resumeChoice(fired.state, fired.pendingChoices[0].id, 1, registry, rig.defs, null);
    expect(resolved.pendingChoices).toHaveLength(0);
    expect(resolved.state.players.p1.deck.cardIds.length).toBe(deckBefore - 1);
  });

  it('OP03-040 (Nami) does nothing without the [DON!! x1] condition met', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: makeLeaderDef({ cardDefinitionId: 'OP03-040', cardNumber: 'OP03-040', name: 'Nami' }) });
    const namiId = rig.state.players.p1.leaderInstanceId!;
    rig = putDeckCards(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'dk', cardNumber: 'DK', baseCost: 1 }), 5).rig;

    const deckBefore = rig.state.players.p1.deck.cardIds.length;
    const fired = runTimings(registry['OP03-040'], ['onLifeDamageDealt'], rig.state, namiId, rig.defs, null, registry);
    expect(fired.state.players.p1.deck.cardIds.length).toBe(deckBefore);
  });

  it('OP04-024 (Sugar) [On Play] rests a chosen opponent Character with cost <= 4', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sugarId: string;
    let cheapFoe: string;
    let bigFoe: string;
    ({ rig, instanceId: sugarId } = putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardDefinitionId: 'OP04-024', cardNumber: 'OP04-024', name: 'Sugar', baseCost: 2 })));
    ({ rig, instanceId: cheapFoe } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'cf', cardNumber: 'CF', baseCost: 4, basePower: 5000 }), { orientation: 'active' }));
    ({ rig, instanceId: bigFoe } = putCharacterInPlay(rig, 'p2', makeCharacterDef({ cardDefinitionId: 'bf', cardNumber: 'BF', baseCost: 7, basePower: 7000 }), { orientation: 'active' }));

    const fired = runTimings(registry['OP04-024'], ['onPlay'], rig.state, sugarId, rig.defs, null, registry);
    expect(fired.pendingChoices).toHaveLength(1);
    const resolved = resumeChoice(fired.state, fired.pendingChoices[0].id, [cheapFoe], registry, rig.defs, null);
    expect(resolved.state.cardsById[cheapFoe].orientation).toBe('rested');
    // the cost-7 Character is out of range and cannot have been chosen
    expect(resolved.state.cardsById[bigFoe].orientation).toBe('active');
  });
});
