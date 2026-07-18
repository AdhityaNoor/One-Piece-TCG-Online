import { describe, expect, it } from 'vitest';
import { OP12_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP12';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';
import type { CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { isControllerEffectDrawPrevented } from '../../rules/shared/lifeToHandRestriction';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putLifeCards,
} from '../../rules/shared/__tests__/testRig';
import { runTimings } from '../interpreter';
import type { EffectProgram } from '../effectIr';
import { runDrawPhase } from '../../rules/phases/runDrawPhase';
import { runEndPhaseAndHandoff } from '../../rules/phases/runEndPhaseAndHandoff';

function programFor(assignment: CardEffectAssignment): EffectProgram {
  const bindings = 'templates' in assignment ? assignment.templates : [assignment];
  return {
    cardNumber: assignment.cardNumber,
    abilities: bindings.flatMap((b) => applyTemplate(assignment.cardNumber, b.templateId, b.params).abilities),
  };
}

describe('onLifeRemoved + preventEffectDraw (OP12-099)', () => {
  it('compiles onLifeRemoved → draw then preventEffectDraw', () => {
    const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-099')!;
    const program = programFor(entry);
    expect(program.abilities[0]).toMatchObject({
      timing: 'onLifeRemoved',
      condition: { turn: 'your' },
    });
    expect(program.abilities[0].ops).toEqual([
      { op: 'draw', amount: 1 },
      { op: 'preventEffectDraw', player: 'controller', duration: 'duringThisTurn' },
    ]);
  });

  it('effect Life trash draws 1 then blocks further effect draws; Draw Phase still draws', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const kalgara = makeCharacterDef({
      cardDefinitionId: 'OP12-099',
      cardNumber: 'OP12-099',
      name: 'Kalgara',
    });
    let kalgaraId: string;
    ({ rig, instanceId: kalgaraId } = putCharacterInPlay(rig, 'p1', kalgara));

    const lifeDef = makeCharacterDef({ cardNumber: 'LIFE-1', name: 'Life Card' });
    ({ rig } = putLifeCards(rig, 'p2', [lifeDef, { ...lifeDef, cardDefinitionId: 'LIFE-2', cardNumber: 'LIFE-2' }]));
    ({ rig } = putDeckCards(rig, 'p1', makeCharacterDef({ cardNumber: 'DECK-FILL', name: 'Fill' }), 5));

    const trasher = makeCharacterDef({ cardDefinitionId: 'TRASH-SRC', cardNumber: 'TRASH-SRC' });
    let trasherId: string;
    ({ rig, instanceId: trasherId } = putCharacterInPlay(rig, 'p1', trasher));

    const kalgaraProgram = programFor(OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-099')!);
    const trashProgram: EffectProgram = {
      cardNumber: 'TRASH-SRC',
      abilities: [{
        timing: 'activateMain',
        ops: [{ op: 'trashLife', player: 'opponent', count: 1 }],
      }],
    };
    const registry = {
      [kalgara.cardDefinitionId]: kalgaraProgram,
      [trasher.cardDefinitionId]: trashProgram,
    };

    const handBefore = rig.state.players.p1.hand.cardIds.length;
    const afterTrash = runTimings(trashProgram, ['activateMain'], rig.state, trasherId, rig.defs, null, registry);

    expect(afterTrash.state.players.p2.lifeArea.cardIds).toHaveLength(1);
    expect(afterTrash.state.players.p1.hand.cardIds.length).toBe(handBefore + 1);
    expect(isControllerEffectDrawPrevented(afterTrash.state, 'p1')).toBe(true);

    const drawSrc = makeCharacterDef({ cardDefinitionId: 'DRAW-SRC', cardNumber: 'DRAW-SRC' });
    let drawId: string;
    let drawRig = { state: afterTrash.state, defs: { ...rig.defs } };
    ({ rig: drawRig, instanceId: drawId } = putCharacterInPlay(drawRig, 'p1', drawSrc));
    const drawProgram: EffectProgram = {
      cardNumber: 'DRAW-SRC',
      abilities: [{ timing: 'activateMain', ops: [{ op: 'draw', amount: 1 }] }],
    };
    const handAfterLock = drawRig.state.players.p1.hand.cardIds.length;
    const afterBlocked = runTimings(drawProgram, ['activateMain'], drawRig.state, drawId, drawRig.defs, null, {
      ...registry,
      [drawSrc.cardDefinitionId]: drawProgram,
    });
    expect(afterBlocked.state.players.p1.hand.cardIds.length).toBe(handAfterLock);
    expect(afterBlocked.log.some((e) => String(e.message).includes('cannot draw cards using their own effects'))).toBe(true);

    const drawPhase = runDrawPhase({ ...afterBlocked.state, currentPhase: 'draw', activePlayerId: 'p1' });
    expect(drawPhase.state.players.p1.hand.cardIds.length).toBe(handAfterLock + 1);

    const ended = runEndPhaseAndHandoff({ ...drawPhase.state, currentPhase: 'end', activePlayerId: 'p1' });
    expect(isControllerEffectDrawPrevented(ended.state, 'p1')).toBe(false);

    // Keep kalgaraId referenced so the watcher stays on the board through trash.
    expect(afterTrash.state.cardsById[kalgaraId]?.currentZone).toBe('characterArea');
  });
});
