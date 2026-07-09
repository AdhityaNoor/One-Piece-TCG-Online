import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments } from '../../../cards/effectTemplates/assembler';
import type { CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { OP03_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP03';
import { OP11_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP11';
import { OP12_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP12';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';
import { battleAttackerIsCharacterWithAttribute, fireOpponentCharacterPlayedFromHandReactions } from '../fireTiming';
import { evaluateGates } from '../gates';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  nextTestId,
  putCharacterInPlay,
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
});
