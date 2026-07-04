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
import { ALL_ASSIGNMENTS } from '../assignments';

describe('buildRegistryFromAssignments', () => {
  it('produces an empty registry for an empty assignment list', () => {
    expect(buildRegistryFromAssignments([])).toEqual({});
  });

  it('maps each cardNumber to an EffectProgram with matching cardNumber', () => {
    const assignments: CardEffectAssignment[] = [
      { cardNumber: 'TEST-001', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { cardNumber: 'TEST-002', templateId: 'ability', params: { timing: 'onKO', functions: [{ fn: 'draw', amount: 2 }] } },
    ];
    const registry = buildRegistryFromAssignments(assignments);
    expect(registry['TEST-001'].cardNumber).toBe('TEST-001');
    expect(registry['TEST-002'].cardNumber).toBe('TEST-002');
  });

  it('every produced EffectProgram is JSON-serializable (no functions or class instances)', () => {
    const assignments: CardEffectAssignment[] = [
      { cardNumber: 'A', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { cardNumber: 'B', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] } },
      { cardNumber: 'C', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 5, target: 'opponent' }] } },
      { cardNumber: 'D', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { cardNumber: 'E', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -3 }] } },
      { cardNumber: 'F', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'modifyPowerOpponent', amount: -2000 }] } },
    ];
    const registry = buildRegistryFromAssignments(assignments);
    const roundTripped = JSON.parse(JSON.stringify(registry));
    expect(roundTripped).toEqual(registry);
  });

  it('registry size equals unique assignment count', () => {
    const assignments: CardEffectAssignment[] = [
      { cardNumber: 'X-001', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
      { cardNumber: 'X-002', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
    ];
    expect(Object.keys(buildRegistryFromAssignments(assignments))).toHaveLength(2);
  });

  it('composes multiple atomic templates into one card EffectProgram', () => {
    const registry = buildRegistryFromAssignments([
      {
        cardNumber: 'COMBO-001',
        templates: [
          { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'draw', amount: 1 }] } },
          { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'modifyCostOpponent', amount: -4 }] } },
        ],
      },
    ]);
    expect(registry['COMBO-001']).toMatchObject({
      cardNumber: 'COMBO-001',
      abilities: [
        { timing: 'onPlay', ops: [{ op: 'draw', amount: 1 }] },
        { timing: 'whenAttacking' },
      ],
    });
    expect(registry['COMBO-001'].abilities[1].ops[1]).toMatchObject({ op: 'addCost', amount: -4 });
  });
});

describe('template factories - structural correctness', () => {
  it('ability produces the configured trigger with draw op', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }] });
    expect(p.abilities).toHaveLength(1);
    expect(p.abilities[0].timing).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'draw', amount: 2 });
  });

  it('giveDon function produces chooseTargets then giveDon', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] });
    const [choose, give] = p.abilities[0].ops;
    expect(choose.op).toBe('chooseTargets');
    expect(give.op).toBe('giveDon');
    // @ts-expect-error - narrow to giveDon shape
    expect(give.count).toBe(2);
  });

  it('ability carries oncePerTurn independently from its function', () => {
    const p = applyTemplate('T', 'ability', { timing: 'activateMain', oncePerTurn: true, functions: [{ fn: 'giveDon', count: 1 }] });
    expect(p.abilities[0].timing).toBe('activateMain');
    expect(p.abilities[0].oncePerTurn).toBe(true);
  });

  it('returnToHand function targets opponent characters filtered by maxCost', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 5, target: 'opponent' }] });
    const choose = p.abilities[0].ops[0];
    expect(choose.op).toBe('chooseTargets');
    // @ts-expect-error - narrow to chooseTargets shape
    expect(choose.from).toMatchObject({ sel: 'opponentCharacters', maxCost: 5 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'returnToHand' });
  });

  it('returnToHand function can target any Character when text says Character', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'returnToHand', maxCost: 7, target: 'any' }] });
    const choose = p.abilities[0].ops[0];
    expect(choose.op).toBe('chooseTargets');
    // @ts-expect-error - narrow to chooseTargets shape
    expect(choose.from).toMatchObject({ sel: 'allCharacters', maxCost: 7 });
  });

  it('ability condition carries DON!! attachment requirements', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }],
    });
    expect(p.abilities[0].timing).toBe('whenAttacking');
    expect(p.abilities[0].condition).toEqual({ donAttachedAtLeast: 1 });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'draw', amount: 2 });
  });

  it('drawAndTrash function draws then requires trashing from hand', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 1 }] });
    expect(p.abilities[0].timing).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'draw', amount: 2 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerHand' }, min: 1, max: 1 });
    expect(p.abilities[0].ops[2]).toMatchObject({ op: 'trashCards' });
  });

  it('trashFromHand function requires trashing from hand at the configured timing', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'trashFromHand', count: 1 }] });
    expect(p.abilities[0].timing).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerHand' }, min: 1, max: 1 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'trashCards' });
  });

  it('trashTopDeck function mills from the controller deck without a choice', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'trashTopDeck', count: 3 }] });
    expect(p.abilities[0].timing).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toEqual({ op: 'trashTopDeck', count: 3 });
  });

  it('ability has no condition when condition is omitted', () => {
    const p = applyTemplate('T', 'ability', { timing: 'whenAttacking', functions: [{ fn: 'drawAndTrash', drawCount: 1, trashCount: 1 }] });
    expect(p.abilities[0].condition).toBeUndefined();
  });

  it('modifyCostOpponent function produces chooseTargets then addCost duringThisTurn', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'modifyCostOpponent', amount: -3 }] });
    expect(p.abilities[0].ops[0].op).toBe('chooseTargets');
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addCost', amount: -3, duration: 'duringThisTurn' });
  });

  it('opponent target functions can choose multiple cards when configured', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      functions: [
        { fn: 'restOpponentCharacter', filter: { maxCost: 2, rested: true }, maxTargets: 2 },
        { fn: 'modifyCostOpponent', amount: -2, maxTargets: 2 },
      ],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxCost: 2, rested: true }, max: 2 });
    expect(p.abilities[0].ops[2]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters' }, max: 2 });
  });

  it('modifyPowerOpponent function produces addPower with negative amount', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [{ fn: 'modifyPowerOpponent', amount: -2000 }],
    });
    expect(p.abilities[0].timing).toBe('whenAttacking');
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: -2000, duration: 'duringThisTurn' });
  });

  it('power functions can target controller or opponent Leader/Character groups', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'counter',
      functions: [
        { fn: 'addPowerController', amount: 4000, duration: 'duringThisBattle' },
        { fn: 'addPowerControllerLeader', amount: 4000, duration: 'duringThisTurn' },
        { fn: 'modifyPowerOpponentLeaderOrCharacter', amount: -10000, duration: 'duringThisTurn' },
      ],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerLeaderOrCharacters' }, max: 1 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: 4000, duration: 'duringThisBattle' });
    expect(p.abilities[0].ops[2]).toMatchObject({ op: 'addPower', target: { sel: 'controllerLeader' }, amount: 4000, duration: 'duringThisTurn' });
    expect(p.abilities[0].ops[3]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentLeaderOrCharacters' }, max: 1 });
    expect(p.abilities[0].ops[4]).toMatchObject({ op: 'addPower', amount: -10000, duration: 'duringThisTurn' });
  });

  it('addPowerControllerCharacter can filter own Characters by color and exact cost', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'addPowerControllerCharacter', amount: 3000, duration: 'duringThisTurn', filter: { color: 'red', exactCost: 1 } }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({
      op: 'chooseTargets',
      from: { sel: 'controllerCharacters', color: 'red', exactCost: 1 },
      min: 0,
      max: 1,
    });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: 3000, duration: 'duringThisTurn' });
  });

  it('searchTopDeck function produces a search op at the configured timing', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'whenAttacking',
      functions: [{ fn: 'searchTopDeck', look: 5, pick: 1, reveal: true, destination: 'hand', filter: { anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { name: 'Sanji' }], excludeSelfName: true } }],
    });
    expect(p.abilities[0].timing).toBe('whenAttacking');
    const op = p.abilities[0].ops[0];
    expect(op.op).toBe('searchTopDeck');
    // @ts-expect-error - narrow
    expect(op.look).toBe(5);
    // @ts-expect-error
    expect(op.reveal).toBe(true);
    // @ts-expect-error
    expect(op.destination).toBe('hand');
    // @ts-expect-error
    expect(op.filter).toMatchObject({ anyOf: [{ typeIncludes: 'Straw Hat Crew' }, { name: 'Sanji' }], excludeSelfName: true });
  });

  it('can gate a follow-up function on the previous function result', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [
        { fn: 'searchTopDeck', look: 1, pick: 1, reveal: false, destination: 'hand', filter: { typeIncludes: 'Test' } },
        { fn: 'trashFromHand', count: 1, ifPrevious: 'previousMovedAny' },
      ],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'searchTopDeck' });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'chooseTargets', ifPrevious: 'previousMovedAny' });
    expect(p.abilities[0].ops[2]).toMatchObject({ op: 'trashCards', ifPrevious: 'previousMovedAny' });
  });

  it('addPowerSelf function has permanent duration and donAttachedAtLeast condition', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent', condition: { donAttachedAtLeast: 1 } }],
    });
    const op = p.abilities[0].ops[0];
    expect(op).toMatchObject({ op: 'addPower', amount: 1000, duration: 'permanent' });
    // @ts-expect-error
    expect(op.condition).toEqual({ donAttachedAtLeast: 1 });
  });

  it('preventBlockers can apply to self or a chosen controller card', () => {
    const self = applyTemplate('T', 'ability', {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 2 },
      functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle', blockerPowerAtLeast: 5000 }],
    });
    expect(self.abilities[0].ops[0]).toMatchObject({
      op: 'preventBlockers',
      target: { sel: 'self' },
      duration: 'duringThisBattle',
      blockerPowerAtLeast: 5000,
    });

    const chosen = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      functions: [{ fn: 'preventBlockers', duration: 'duringThisTurn', target: 'chosenControllerLeaderOrCharacter', filter: { typeIncludes: 'Straw Hat Crew' } }],
    });
    expect(chosen.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerLeaderOrCharacters', typeIncludes: 'Straw Hat Crew' } });
    expect(chosen.abilities[0].ops[1]).toMatchObject({ op: 'preventBlockers', target: { sel: 'var', name: 't' }, duration: 'duringThisTurn' });
  });
});

describe('raw card text isolation', () => {
  it('assignment params contain no raw card effect text (structural params only)', () => {
    // This test is intentionally shallow: it checks that no assignment
    // stores a long string that looks like card effect text in its params.
    // Actual card text lives in the card catalog JSON, not here.
    for (const a of ALL_ASSIGNMENTS) {
      const paramsStr = JSON.stringify(a);
      // Heuristic: card effect text contains brackets like [On Play] or "your opponent"
      const looksLikeEffectText = /\[On Play\]|\[When Attacking\]|your opponent|\[Activate|During this turn/i.test(paramsStr);
      expect(looksLikeEffectText, `${a.cardNumber} params look like raw effect text: ${paramsStr}`).toBe(false);
    }
  });
});
