import { describe, expect, it } from 'vitest';
import { OP15_ASSIGNMENTS } from '../../../cards/effectTemplates/assignments/OP15';
import { applyTemplate } from '../../../cards/effectTemplates/catalog/factories';
import type { CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { getEffectiveAttributes, hasContinuousAttribute } from '../../rules/shared/power';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../rules/shared/__tests__/testRig';
import { resumeProgram, runTimings } from '../interpreter';
import type { EffectProgram } from '../effectIr';
import { runEndPhaseAndHandoff } from '../../rules/phases/runEndPhaseAndHandoff';

function programFor(assignment: CardEffectAssignment): EffectProgram {
  const bindings = 'templates' in assignment ? assignment.templates : [assignment];
  return {
    cardNumber: assignment.cardNumber,
    abilities: bindings.flatMap((b) => applyTemplate(assignment.cardNumber, b.templateId, b.params).abilities),
  };
}

describe('addAttribute (OP15-093)', () => {
  it('compiles keyword + Slash attribute on the same previous selection', () => {
    const entry = OP15_ASSIGNMENTS.find((a) => a.cardNumber === 'OP15-093')!;
    const program = programFor(entry);
    const main = program.abilities.find((a) => a.timing === 'activateMain')!;
    expect(main.cost).toEqual([{ kind: 'trashThis' }]);
    expect(main.gate).toEqual([{ kind: 'selfTrashCount', atLeast: 15 }]);
    expect(main.ops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ op: 'chooseTargets', var: 't', min: 0, max: 1 }),
        expect.objectContaining({
          op: 'addKeyword',
          keyword: 'canAttackCharactersWhileSummoningSick',
          duration: 'duringThisTurn',
          target: { sel: 'var', name: 't' },
        }),
        expect.objectContaining({
          op: 'addAttribute',
          attribute: 'slash',
          duration: 'duringThisTurn',
          target: { sel: 'var', name: 't' },
          ifPrevious: 'previousSelectedAny',
        }),
      ]),
    );
  });

  it('grants <Slash> so effective attributes see it; expires at end of turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const sourceDef = makeCharacterDef({ cardDefinitionId: 'SYN-ATTR-SRC', cardNumber: 'SYN-ATTR', name: 'Source' });
    const luffyDef = makeCharacterDef({
      cardDefinitionId: 'SYN-LUFFY',
      cardNumber: 'LUFFY',
      name: 'Monkey.D.Luffy',
      attributes: ['strike'],
    });
    let sourceId: string;
    let luffyId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', sourceDef));
    ({ rig, instanceId: luffyId } = putCharacterInPlay(rig, 'p1', luffyDef));

    const program: EffectProgram = {
      cardNumber: 'SYN-ATTR',
      abilities: [
        {
          timing: 'activateMain',
          ops: [
            {
              op: 'chooseTargets',
              var: 't',
              from: { sel: 'controllerCharacters', name: 'Monkey.D.Luffy' },
              min: 0,
              max: 1,
              prompt: 'Choose up to 1 target.',
            },
            { op: 'addAttribute', target: { sel: 'var', name: 't' }, attribute: 'slash', duration: 'duringThisTurn' },
          ],
        },
      ],
    };
    const registry = { [sourceDef.cardDefinitionId]: program };

    const prompted = runTimings(program, ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    expect(prompted.pendingChoices).toHaveLength(1);

    const resumed = resumeProgram(
      program,
      prompted.state,
      prompted.pendingChoices[0]!,
      [luffyId],
      rig.defs,
      null,
      registry,
    );

    expect(hasContinuousAttribute(rig.defs, resumed.state, luffyId, 'slash')).toBe(true);
    expect(getEffectiveAttributes(rig.defs, resumed.state, luffyId)).toEqual(
      expect.arrayContaining(['strike', 'slash']),
    );

    const ended = runEndPhaseAndHandoff({ ...resumed.state, currentPhase: 'end' });
    expect(hasContinuousAttribute(rig.defs, ended.state, luffyId, 'slash')).toBe(false);
    expect(getEffectiveAttributes(rig.defs, ended.state, luffyId)).toEqual(['strike']);
  });
});
