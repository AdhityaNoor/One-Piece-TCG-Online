import { describe, expect, it } from 'vitest';
import { executeAction, validateAction } from '../../../engine/actions';
import {
  buildBaseRig,
  makeCharacterDef,
  makeLeaderDef,
  nextTestId,
  putCharacterInPlay,
  putDonDeckCards,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';

const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);

function activateEnel(state: ReturnType<typeof buildBaseRig>['state'], sourceInstanceId: string, defs: ReturnType<typeof buildBaseRig>['defs']) {
  return executeAction(
    state,
    { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('activate'), playerId: 'p1', sourceInstanceId, effectId: 'activateMain', donInstanceIds: [] },
    defs,
    registry,
  );
}

function validateEnel(state: ReturnType<typeof buildBaseRig>['state'], sourceInstanceId: string, defs: ReturnType<typeof buildBaseRig>['defs']) {
  return validateAction(
    state,
    { type: 'ACTIVATE_CARD_EFFECT', actionId: nextTestId('activate'), playerId: 'p1', sourceInstanceId, effectId: 'activateMain', donInstanceIds: [] },
    defs,
    registry,
  );
}

describe('OP15-058 Enel leader', () => {
  it('is not activatable before the controller second turn', () => {
    const enel = makeLeaderDef({ cardDefinitionId: 'OP15-058', cardNumber: 'OP15-058', name: 'Enel' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 1, leaderOverridesP1: enel });
    rig = putDonDeckCards(rig, 'p1', 5).rig;

    const result = validateEnel(rig.state, rig.state.players.p1.leaderInstanceId, rig.defs);

    expect(result.legal).toBe(false);
    expect(result.reasons.join('\n')).toContain("condition isn't met");
  });

  it('adds active/rested DON and then gives the rested DON to one Character', () => {
    const enel = makeLeaderDef({ cardDefinitionId: 'OP15-058', cardNumber: 'OP15-058', name: 'Enel' });
    const target = makeCharacterDef({ cardDefinitionId: 'SKY-TARGET', cardNumber: 'SKY-TARGET', name: 'Sky Target', types: ['Sky Island'] });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: enel });
    let targetId: string;
    ({ rig, instanceId: targetId } = putCharacterInPlay(rig, 'p1', target));
    rig = putDonDeckCards(rig, 'p1', 5).rig;

    const afterActivate = activateEnel(rig.state, rig.state.players.p1.leaderInstanceId, rig.defs);

    expect(afterActivate.state.players.p1.costArea.cardIds).toHaveLength(5);
    expect(afterActivate.state.players.p1.costArea.cardIds.filter((id) => afterActivate.state.cardsById[id]?.donRested === false)).toHaveLength(1);
    expect(afterActivate.state.players.p1.costArea.cardIds.filter((id) => afterActivate.state.cardsById[id]?.donRested === true)).toHaveLength(4);
    expect(afterActivate.state.pendingChoices).toHaveLength(1);
    expect(afterActivate.state.pendingChoices[0].constraints.candidateInstanceIds).toEqual([targetId]);

    const afterChoice = executeAction(
      afterActivate.state,
      { type: 'RESOLVE_PENDING_CHOICE', actionId: nextTestId('resolve'), playerId: 'p1', choiceId: afterActivate.state.pendingChoices[0].id, response: [targetId] },
      rig.defs,
      registry,
    );

    expect(afterChoice.state.cardsById[targetId].donAttached).toHaveLength(4);
    expect(afterChoice.state.cardsById[targetId].donAttached.every((id) => afterChoice.state.cardsById[id]?.donRested === true)).toBe(true);
    expect(afterChoice.state.players.p1.costArea.cardIds.filter((id) => afterChoice.state.cardsById[id]?.donRested === false)).toHaveLength(1);
  });
});
