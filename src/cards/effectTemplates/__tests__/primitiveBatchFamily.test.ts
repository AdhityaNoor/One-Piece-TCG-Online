import { describe, expect, it } from 'vitest';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { validateResolvePendingChoice } from '../../../engine/actions/handlers/resolvePendingChoice';
import { runTimings } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { EB_ASSIGNMENTS } from '../assignments/EB';
import { OP01_ASSIGNMENTS } from '../assignments/OP01';
import { OP05_ASSIGNMENTS } from '../assignments/OP05';
import { OP10_ASSIGNMENTS } from '../assignments/OP10';
import { OP11_ASSIGNMENTS } from '../assignments/OP11';
import { OP12_ASSIGNMENTS } from '../assignments/OP12';

const registry = buildRegistryFromAssignments([
  ...OP05_ASSIGNMENTS,
  ...OP10_ASSIGNMENTS,
  ...OP11_ASSIGNMENTS,
  ...OP12_ASSIGNMENTS,
  ...EB_ASSIGNMENTS,
  ...OP01_ASSIGNMENTS,
]);

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
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
        p1: { ...applied.state.players.p1, hand: { cardIds: handCards } },
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
});

describe('mixed rest targets', () => {
  it('OP12-037 program includes opponentCharactersOrDon rest selection', () => {
    const program = registry['OP12-037'];
    expect(program).toBeDefined();
    const main = program.abilities.find((a) => a.timing === 'activateMain');
    expect(main?.ops.some((op) => op.op === 'chooseTargets' && op.from.sel === 'opponentCharactersOrDon')).toBe(true);
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
  it('requires total Character cost ≥5 and includes life-to-hand + playFromHand', () => {
    const program = registry['OP10-022'];
    const main = program.abilities[0];
    expect(main.gate).toEqual([{ kind: 'selfCharactersTotalCostAtLeast', atLeast: 5 }]);
    expect(main.condition).toEqual({ donAttachedAtLeast: 1 });
    expect(main.ops.some((op) => op.op === 'playFromHand')).toBe(true);
  });
});
