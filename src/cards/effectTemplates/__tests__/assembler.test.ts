/**
 * Tests for the template catalog assembler.
 *
 * Key invariants:
 *   1. Raw card text NEVER appears in any assignment.
 *   2. Every EffectProgram produced is JSON-serializable.
 *   3. The typed params system prevents wrong-shape params at compile time.
 *   4. Each template produces structurally correct EffectProgram IR.
 */
import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments } from '../assembler';
import type { CardEffectAssignment } from '../assembler';
import { applyTemplate } from '../catalog/factories';

describe('buildRegistryFromAssignments', () => {
  it('produces an empty registry for an empty assignment list', () => {
    expect(buildRegistryFromAssignments([])).toEqual({});
  });

  it('maps each cardNumber to an EffectProgram with matching cardNumber', () => {
    const assignments: CardEffectAssignment[] = [
      { cardNumber: 'TEST-001', templateId: 'onPlayDraw', params: { amount: 1 } },
      { cardNumber: 'TEST-002', templateId: 'onKODraw', params: { amount: 2 } },
    ];
    const registry = buildRegistryFromAssignments(assignments);
    expect(registry['TEST-001'].cardNumber).toBe('TEST-001');
    expect(registry['TEST-002'].cardNumber).toBe('TEST-002');
  });

  it('every produced EffectProgram is JSON-serializable (no functions or class instances)', () => {
    const assignments: CardEffectAssignment[] = [
      { cardNumber: 'A', templateId: 'onPlayDraw', params: { amount: 1 } },
      { cardNumber: 'B', templateId: 'onPlayGiveDon', params: { count: 2 } },
      { cardNumber: 'C', templateId: 'onPlayReturnToHand', params: { maxCost: 5 } },
      { cardNumber: 'D', templateId: 'whenAttackingDrawAndTrash', params: { drawCount: 2, trashCount: 2, donRequired: 1 } },
      { cardNumber: 'E', templateId: 'onPlayModifyCostOpponent', params: { amount: -3 } },
      { cardNumber: 'F', templateId: 'whenAttackingModifyPowerOpponent', params: { amount: -2000, donRequired: 1 } },
    ];
    const registry = buildRegistryFromAssignments(assignments);
    const roundTripped = JSON.parse(JSON.stringify(registry));
    expect(roundTripped).toEqual(registry);
  });

  it('registry size equals unique assignment count', () => {
    const assignments: CardEffectAssignment[] = [
      { cardNumber: 'X-001', templateId: 'onPlayDraw', params: { amount: 1 } },
      { cardNumber: 'X-002', templateId: 'onPlayDraw', params: { amount: 1 } },
    ];
    expect(Object.keys(buildRegistryFromAssignments(assignments))).toHaveLength(2);
  });
});

describe('template factories — structural correctness', () => {
  it('onPlayDraw produces onPlay trigger with draw op', () => {
    const p = applyTemplate('T', 'onPlayDraw', { amount: 2 });
    expect(p.abilities).toHaveLength(1);
    expect(p.abilities[0].trigger).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'draw', amount: 2 });
  });

  it('onPlayGiveDon produces chooseTargets then giveDon', () => {
    const p = applyTemplate('T', 'onPlayGiveDon', { count: 2 });
    const [choose, give] = p.abilities[0].ops;
    expect(choose.op).toBe('chooseTargets');
    expect(give.op).toBe('giveDon');
    // @ts-expect-error — narrow to giveDon shape
    expect(give.count).toBe(2);
  });

  it('activateMainGiveDon is oncePerTurn', () => {
    const p = applyTemplate('T', 'activateMainGiveDon', { count: 1 });
    expect(p.abilities[0].trigger).toBe('activateMain');
    expect(p.abilities[0].oncePerTurn).toBe(true);
  });

  it('onPlayReturnToHand targets opponent characters filtered by maxCost', () => {
    const p = applyTemplate('T', 'onPlayReturnToHand', { maxCost: 5 });
    const choose = p.abilities[0].ops[0];
    expect(choose.op).toBe('chooseTargets');
    // @ts-expect-error — narrow to chooseTargets shape
    expect(choose.from).toMatchObject({ sel: 'opponentCharacters', maxCost: 5 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'returnToHand' });
  });

  it('whenAttackingDrawAndTrash sets donAttachedAtLeast condition when donRequired provided', () => {
    const p = applyTemplate('T', 'whenAttackingDrawAndTrash', { drawCount: 2, trashCount: 2, donRequired: 1 });
    expect(p.abilities[0].trigger).toBe('whenAttacking');
    expect(p.abilities[0].condition).toEqual({ donAttachedAtLeast: 1 });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'draw', amount: 2 });
  });

  it('whenAttackingDrawAndTrash has no condition when donRequired is omitted', () => {
    const p = applyTemplate('T', 'whenAttackingDrawAndTrash', { drawCount: 1, trashCount: 1 });
    expect(p.abilities[0].condition).toBeUndefined();
  });

  it('onPlayModifyCostOpponent produces chooseTargets then addCost duringThisTurn', () => {
    const p = applyTemplate('T', 'onPlayModifyCostOpponent', { amount: -3 });
    expect(p.abilities[0].ops[0].op).toBe('chooseTargets');
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addCost', amount: -3, duration: 'duringThisTurn' });
  });

  it('whenAttackingModifyPowerOpponent produces addPower with negative amount', () => {
    const p = applyTemplate('T', 'whenAttackingModifyPowerOpponent', { amount: -2000, donRequired: 1 });
    expect(p.abilities[0].trigger).toBe('whenAttacking');
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: -2000, duration: 'duringThisTurn' });
  });

  it('onPlaySearchTopDeck produces searchTopDeck op with correct look/pick/filter', () => {
    const p = applyTemplate('T', 'onPlaySearchTopDeck', {
      look: 5,
      pick: 1,
      filter: { typeIncludes: 'Straw Hat Crew', excludeSelfName: true },
    });
    const op = p.abilities[0].ops[0];
    expect(op.op).toBe('searchTopDeck');
    // @ts-expect-error — narrow
    expect(op.look).toBe(5);
    // @ts-expect-error
    expect(op.filter).toMatchObject({ typeIncludes: 'Straw Hat Crew', excludeSelfName: true });
  });

  it('donAttachedSelfPower has permanent duration and donAttachedAtLeast condition', () => {
    const p = applyTemplate('T', 'donAttachedSelfPower', { donAttachedAtLeast: 1, amount: 1000 });
    const op = p.abilities[0].ops[0];
    expect(op).toMatchObject({ op: 'addPower', amount: 1000, duration: 'permanent' });
    // @ts-expect-error
    expect(op.condition).toEqual({ donAttachedAtLeast: 1 });
  });
});

describe('raw card text isolation', () => {
  it('assignment params contain no raw card effect text (structural params only)', () => {
    // This test is intentionally shallow: it checks that no assignment
    // stores a long string that looks like card effect text in its params.
    // Actual card text lives in the card catalog JSON, not here.
    const { ALL_ASSIGNMENTS } = require('../assignments');
    for (const a of ALL_ASSIGNMENTS) {
      const paramsStr = JSON.stringify(a.params);
      // Heuristic: card effect text contains brackets like [On Play] or "your opponent"
      const looksLikeEffectText = /\[On Play\]|\[When Attacking\]|your opponent|\[Activate|During this turn/i.test(paramsStr);
      expect(looksLikeEffectText, `${a.cardNumber} params look like raw effect text: ${paramsStr}`).toBe(false);
    }
  });
});
