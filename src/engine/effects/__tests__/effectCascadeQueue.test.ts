import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments } from '../../../cards/effectTemplates/assembler';
import { executeAction } from '../../actions/dispatch';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../rules/shared/__tests__/testRig';
import { resumeProgram, runTimings } from '../index';

describe('effect cascade queue', () => {
  it('persists later rested-reaction events when an earlier rested reaction suspends on a choice', () => {
    const sourceAssignment = {
      cardNumber: 'SYN-REST-TWO',
      templateId: 'ability' as const,
      params: {
        timing: 'onPlay' as const,
        functions: [
          {
            fn: 'rest' as const,
            target: { group: 'characters' as const, player: 'controller' as const, filter: { typeIncludes: 'Cascade Target' } },
            optional: true,
            maxTargets: 2,
          },
        ],
      },
    };
    const restedAssignment = {
      cardNumber: 'SYN-RESTED-REACTOR',
      templateId: 'ability' as const,
      params: {
        timing: 'onRested' as const,
        functions: [
          { fn: 'ko' as const, target: { group: 'characters' as const, player: 'opponent' as const }, optional: true, maxTargets: 1 },
        ],
      },
    };
    const registry = buildRegistryFromAssignments([sourceAssignment, restedAssignment]);
    const sourceDef = makeCharacterDef({ cardDefinitionId: 'SYN-REST-TWO', cardNumber: 'SYN-REST-TWO', name: 'Rest Two' });
    const reactorDef = makeCharacterDef({
      cardDefinitionId: 'SYN-RESTED-REACTOR',
      cardNumber: 'SYN-RESTED-REACTOR',
      name: 'Rested Reactor',
      types: ['Cascade Target'],
    });
    const foeDef = makeCharacterDef({ cardDefinitionId: 'SYN-FOE', cardNumber: 'SYN-FOE', name: 'Foe' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let firstReactorId: string;
    let secondReactorId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', sourceDef));
    ({ rig, instanceId: firstReactorId } = putCharacterInPlay(rig, 'p1', reactorDef));
    ({ rig, instanceId: secondReactorId } = putCharacterInPlay(rig, 'p1', reactorDef));
    ({ rig } = putCharacterInPlay(rig, 'p2', foeDef));

    const fired = runTimings(registry['SYN-REST-TWO'], ['onPlay'], rig.state, sourceId, rig.defs, 'test', registry);
    const afterRestChoice = resumeProgram(
      registry['SYN-REST-TWO'],
      fired.state,
      fired.pendingChoices[0],
      [firstReactorId, secondReactorId],
      rig.defs,
      'test',
      registry,
    );

    expect(afterRestChoice.pendingChoices[0]?.sourceInstanceId).toBe(firstReactorId);
    expect(afterRestChoice.state.pendingEffectCascade).toEqual([
      { kind: 'rested', targetInstanceId: secondReactorId, cause: 'effect', sourceInstanceId: sourceId },
    ]);

    const afterFirstReaction = executeAction(afterRestChoice.state, {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: 'decline-first-rested-reaction',
      playerId: 'p1',
      choiceId: afterRestChoice.pendingChoices[0].id,
      response: [],
    }, rig.defs, registry);

    expect(afterFirstReaction.pendingChoices[0]?.sourceInstanceId).toBe(secondReactorId);
    expect(afterFirstReaction.state.pendingEffectCascade ?? []).toEqual([]);
  });
});
