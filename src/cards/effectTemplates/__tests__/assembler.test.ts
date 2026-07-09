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
      { cardNumber: 'C', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] } },
      { cardNumber: 'D', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'drawAndTrash', drawCount: 2, trashCount: 2 }] } },
      { cardNumber: 'E', templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, optional: true }] } },
      { cardNumber: 'F', templateId: 'ability', params: { timing: 'whenAttacking', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }] } },
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
          { templateId: 'ability', params: { timing: 'whenAttacking', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -4, optional: true }] } },
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

  it('can mark reviewed non-runtime card text without creating engine abilities', () => {
    const registry = buildRegistryFromAssignments([
      { cardNumber: 'NO-RUNTIME-001', templateId: 'noRuntime', params: {} },
    ]);
    expect(registry['NO-RUNTIME-001']).toEqual({ cardNumber: 'NO-RUNTIME-001', abilities: [] });
  });
});

describe('template factories - structural correctness', () => {
  it('ability produces the configured trigger with draw op', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'draw', amount: 2 }] });
    expect(p.abilities).toHaveLength(1);
    expect(p.abilities[0].timing).toBe('onPlay');
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'draw', amount: 2 });
  });

  it('drawUntilHandCount lowers to a draw-to-target op', () => {
    const p = applyTemplate('T', 'ability', { timing: 'counter', functions: [{ fn: 'drawUntilHandCount', targetCount: 2 }] });
    expect(p.abilities[0].ops[0]).toEqual({ op: 'drawUntilHandCount', targetCount: 2 });
  });

  it('giveDon function produces chooseTargets then giveDon', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'giveDon', count: 2 }] });
    const [choose, give] = p.abilities[0].ops;
    expect(p.abilities[0].gate).toEqual([{ kind: 'selfRestedDonCount', atLeast: 1 }]);
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

  it('moveCards can move opponent Characters filtered by maxCost to their owner hand', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'opponent', filter: { maxCost: 5 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] });
    const choose = p.abilities[0].ops[0];
    expect(choose.op).toBe('chooseTargets');
    // @ts-expect-error - narrow to chooseTargets shape
    expect(choose.from).toMatchObject({ sel: 'opponentCharacters', maxCost: 5 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'moveToHand' });
  });

  it('moveCards can target any Character when text says Character', () => {
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'moveCards', from: { zone: 'characters', player: 'any', filter: { maxCost: 7 } }, to: { zone: 'hand', player: 'owner' }, optional: true }] });
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

  it('moveCards can move chosen cards to trash through the generic movement path', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'controller' }, to: { zone: 'trash', player: 'owner' }, optional: true, maxTargets: 1 }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerHand' }, min: 0, max: 1 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'trashCards', target: { sel: 'var', name: 't' } });
  });

  it('searchDeck lowers to a full-deck search choice', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'searchDeck', pick: 1, reveal: true, destination: 'hand', filter: { name: 'Artificial Devil Fruit SMILE' } }],
    });

    expect(p.abilities[0].ops[0]).toMatchObject({
      op: 'searchDeck',
      pick: 1,
      reveal: true,
      destination: 'hand',
      filter: { name: 'Artificial Devil Fruit SMILE' },
    });
  });

  it('moveCards can let the opponent choose a card from their hand for deck-bottom placement', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'moveCards', from: { zone: 'hand', player: 'opponent' }, to: { zone: 'deck', player: 'owner', position: 'bottom' }, maxTargets: 1, chooser: 'opponent' }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentHand' }, min: 1, max: 1, chooser: 'opponent' });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'moveToBottomDeck', target: { sel: 'var', name: 't' } });
  });

  it('moveAllCharactersToBottomDeck moves every matching Character without a target choice', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      functions: [{ fn: 'moveAllCharactersToBottomDeck', filter: { maxCost: 3 } }],
    });
    expect(p.abilities[0].ops).toEqual([{ op: 'moveToBottomDeck', target: { sel: 'allCharacters', maxCost: 3 } }]);
  });

  it('preventRest chooses matching Characters and registers rest prevention', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'preventRest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 5 } }, duration: 'endOfOpponentsTurn', optional: true, maxTargets: 2 }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxCost: 5 }, min: 0, max: 2 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'preventRest', target: { sel: 'var', name: 't' }, duration: 'endOfOpponentsTurn' });
  });

  it('returnOpponentDon lets the opponent choose DON!! to return', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onKO',
      functions: [{ fn: 'returnOpponentDon', count: 1 }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentFieldDon' }, min: 1, max: 1, chooser: 'opponent' });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'returnDonToDonDeck', target: { sel: 'var', name: 't' } });
  });

  it('moveCards keeps top-or-bottom Life choices hidden when moving to trash', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'topOrBottom', hiddenChoice: true }, to: { zone: 'trash', player: 'owner' }, optional: true }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseLifeToTrash', position: 'topOrBottom', optional: true });
  });

  it('moveCards trashes controller top Life until a remaining count via trashLife.untilLife', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'moveCards', from: { zone: 'life', player: 'controller', position: 'top', untilLife: 1 }, to: { zone: 'trash', player: 'owner' } }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'trashLife', player: 'controller', untilLife: 1 });
  });

  it('optionalTrashFromHand can gate a follow-up on whether a card was trashed', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [
        { fn: 'optionalTrashFromHand', count: 1 },
        { fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { exactCost: 0 } }, optional: true, ifPrevious: 'previousMovedAny' },
      ],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'controllerHand' }, min: 0, max: 1 });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'trashCards' });
    expect(p.abilities[0].ops[2]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters', exactCost: 0 }, ifPrevious: 'previousMovedAny' });
    expect(p.abilities[0].ops[3]).toMatchObject({ op: 'ko', ifPrevious: 'previousMovedAny' });
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
    const p = applyTemplate('T', 'ability', { timing: 'onPlay', functions: [{ fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -3, optional: true }] });
    expect(p.abilities[0].ops[0].op).toBe('chooseTargets');
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addCost', amount: -3, duration: 'duringThisTurn' });
  });

  it('opponent target functions can choose multiple cards when configured', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      functions: [
        { fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 2, rested: true } }, optional: true, maxTargets: 2 },
        { fn: 'addCost', target: { group: 'characters', player: 'opponent' }, amount: -2, optional: true, maxTargets: 2 },
      ],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters', maxCost: 2, rested: true }, max: 2 });
    expect(p.abilities[0].ops[2]).toMatchObject({ op: 'chooseTargets', from: { sel: 'opponentCharacters' }, max: 2 });
  });

  it('modifyPowerOpponent function produces addPower with negative amount', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'whenAttacking',
      condition: { donAttachedAtLeast: 1 },
      functions: [{ fn: 'addPower', target: { group: 'characters', player: 'opponent' }, amount: -2000, duration: 'duringThisTurn', optional: true }],
    });
    expect(p.abilities[0].timing).toBe('whenAttacking');
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'addPower', amount: -2000, duration: 'duringThisTurn' });
  });

  it('power functions can target controller or opponent Leader/Character groups', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'counter',
      functions: [
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'controller' }, amount: 4000, duration: 'duringThisBattle', optional: true },
        { fn: 'addPower', target: { group: 'leader', player: 'controller' }, amount: 4000, duration: 'duringThisTurn' },
        { fn: 'addPower', target: { group: 'leaderOrCharacters', player: 'opponent' }, amount: -10000, duration: 'duringThisTurn', optional: true },
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
      functions: [{ fn: 'addPower', target: { group: 'characters', player: 'controller', filter: { color: 'red', exactCost: 1 } }, amount: 3000, duration: 'duringThisTurn', optional: true }],
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

  it('searchTopDeck can return looked cards to top or bottom without adding cards to hand', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'searchTopDeck', look: 3, pick: 0, reveal: false, destination: 'deckTopOrBottom' }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({
      op: 'searchTopDeck',
      look: 3,
      pick: 0,
      reveal: false,
      destination: 'deckTopOrBottom',
    });
    // @ts-expect-error - narrow
    expect(p.abilities[0].ops[0].filter).toBeUndefined();
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

  it('preventBlockers carries blocker max-cost and max-power filters', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'whenAttacking',
      functions: [{ fn: 'preventBlockers', duration: 'duringThisBattle', blockerMaxCost: 5, blockerPowerAtMost: 2000 }],
    });

    expect(p.abilities[0].ops[0]).toMatchObject({
      op: 'preventBlockers',
      target: { sel: 'self' },
      blockerMaxCost: 5,
      blockerPowerAtMost: 2000,
    });
  });

  it('triggerPlaySelf produces a source-card play op', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'lifeTrigger',
      functions: [{ fn: 'triggerPlaySelf' }],
    });
    expect(p.abilities[0]).toMatchObject({
      timing: 'lifeTrigger',
      ops: [{ op: 'playSelf' }],
    });
  });

  it('moveCards chooses matching trash cards and moves them to hand', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onPlay',
      functions: [
        {
          fn: 'moveCards',
          from: {
            zone: 'trash',
            player: 'controller',
            filter: {
              category: 'character',
              maxCost: 4,
              excludeSelfName: true,
              anyOf: [{ typeIncludes: 'The Seven Warlords of the Sea' }, { typeIncludes: 'Thriller Bark Pirates' }],
            },
          },
          to: { zone: 'hand', player: 'owner' },
          optional: true,
        },
      ],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({
      op: 'chooseTargets',
      from: {
        sel: 'controllerTrash',
        filter: {
          category: 'character',
          maxCost: 4,
          excludeSelfName: true,
          anyOf: [{ typeIncludes: 'The Seven Warlords of the Sea' }, { typeIncludes: 'Thriller Bark Pirates' }],
        },
      },
      min: 0,
      max: 1,
    });
    expect(p.abilities[0].ops[1]).toMatchObject({ op: 'moveToHand', target: { sel: 'var', name: 't' } });
  });

  it('playFromDeck produces a deck-play search op with a filter', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      condition: { donAttachedAtLeast: 1 },
      cost: [{ kind: 'restDon', count: 2 }],
      functions: [{ fn: 'playFromDeck', filter: { category: 'character', name: 'Pacifista', maxCost: 4 } }],
    });
    expect(p.abilities[0]).toMatchObject({
      timing: 'activateMain',
      condition: { donAttachedAtLeast: 1 },
      cost: [{ kind: 'restDon', count: 2 }],
      ops: [
        {
          op: 'playFromDeck',
          pick: 1,
          filter: { category: 'character', name: 'Pacifista', maxCost: 4 },
        },
      ],
    });
  });

  it('chooseOne branches may contain suspending ops like playFromHand', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'activateMain',
      functions: [{
        fn: 'chooseOne',
        chooser: 'controller',
        prompt: 'Choose one:',
        options: [
          {
            label: 'drawPlay',
            functions: [
              { fn: 'draw', amount: 2 },
              { fn: 'trashFromHand', count: 1 },
              { fn: 'playFromHand', filter: { category: 'character', maxCost: 4 } },
            ],
          },
          { label: 'returnStage', functions: [{ fn: 'moveCards', from: { zone: 'stages', player: 'any' }, to: { zone: 'hand', player: 'owner' }, optional: true }] },
        ],
      }],
    });
    const chooseOp = p.abilities[0].ops[0];
    expect(chooseOp).toMatchObject({ op: 'chooseOption', chooser: 'controller' });
    if (chooseOp.op !== 'chooseOption') throw new Error('expected chooseOption');
    expect(chooseOp.options[0].ops.some((op) => op.op === 'chooseTargets')).toBe(true);
    expect(chooseOp.options[0].ops.some((op) => op.op === 'playFromHand')).toBe(true);
  });

  it('addKeywordSelf produces a conditional keyword grant', () => {
    const p = applyTemplate('T', 'ability', {
      timing: 'onEnterPlay',
      functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'permanent', condition: { donAttachedAtLeast: 2 } }],
    });
    expect(p.abilities[0].ops[0]).toMatchObject({
      op: 'addKeyword',
      target: { sel: 'self' },
      keyword: 'rush',
      duration: 'permanent',
      condition: { donAttachedAtLeast: 2 },
    });
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
