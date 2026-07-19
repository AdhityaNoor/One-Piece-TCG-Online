/**
 * Regression: OP16-045 Crocodile — return own cost-2+ Character, then play
 * {Impel Down} cost≤2 from hand.
 *
 * FAQ: returning this Character itself is legal (printed cost 4 ≥ 2). The return
 * filter is minCost 2 ("2 or more"), not maxCost 2 ("2 or less" — that applies
 * only to the play-from-hand step).
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putInHand,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP16_ASSIGNMENTS } from '../assignments/OP16';

const registry = buildRegistryFromAssignments(
  OP16_ASSIGNMENTS.filter((a) => a.cardNumber === 'OP16-045'),
);

describe('OP16-045 Crocodile [On Play]', () => {
  it('allows returning this Character itself (FAQ) when cost ≥ 2', () => {
    const crocodile = makeCharacterDef({
      cardDefinitionId: 'OP16-045',
      cardNumber: 'OP16-045',
      name: 'Crocodile',
      baseCost: 4,
      basePower: 6000,
      types: ['Impel Down', 'Former Baroque Works'],
      hasBlocker: true,
    });
    const cheap = makeCharacterDef({
      cardDefinitionId: 'OWN-COST1',
      cardNumber: 'OWN-COST1',
      name: 'Cheap',
      baseCost: 1,
      basePower: 1000,
      types: ['Impel Down'],
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let crocoId: string;
    let cheapId: string;
    ({ rig, instanceId: crocoId } = putCharacterInPlay(rig, 'p1', crocodile));
    ({ rig, instanceId: cheapId } = putCharacterInPlay(rig, 'p1', cheap));

    const fired = runTimings(registry['OP16-045'], ['onPlay'], rig.state, crocoId, rig.defs, null, registry);
    const returnChoice = fired.state.pendingChoices[0];
    expect(returnChoice.constraints.candidateInstanceIds).toContain(crocoId);
    expect(returnChoice.constraints.candidateInstanceIds).not.toContain(cheapId);
  });

  it('returns a controller Character cost≥2 to hand, then plays Impel Down cost≤2 from hand', () => {
    const crocodile = makeCharacterDef({
      cardDefinitionId: 'OP16-045',
      cardNumber: 'OP16-045',
      name: 'Crocodile',
      baseCost: 4,
      basePower: 6000,
      types: ['Impel Down', 'Former Baroque Works'],
      hasBlocker: true,
    });
    const bounceTarget = makeCharacterDef({
      cardDefinitionId: 'OWN-COST3',
      cardNumber: 'OWN-COST3',
      name: 'Own Cost 3',
      baseCost: 3,
      basePower: 4000,
      types: ['Impel Down'],
    });
    const playTarget = makeCharacterDef({
      cardDefinitionId: 'IMPEL-2',
      cardNumber: 'IMPEL-2',
      name: 'Prisoner of Impel Down',
      baseCost: 2,
      basePower: 3000,
      types: ['Impel Down'],
    });
    const tooExpensive = makeCharacterDef({
      cardDefinitionId: 'IMPEL-5',
      cardNumber: 'IMPEL-5',
      name: 'Expensive Impel',
      baseCost: 5,
      basePower: 6000,
      types: ['Impel Down'],
    });
    const oppChar = makeCharacterDef({
      cardDefinitionId: 'OPP-1',
      cardNumber: 'OPP-1',
      name: 'Opp',
      baseCost: 1,
      basePower: 2000,
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let crocoId: string;
    let bounceId: string;
    ({ rig, instanceId: crocoId } = putCharacterInPlay(rig, 'p1', crocodile));
    ({ rig, instanceId: bounceId } = putCharacterInPlay(rig, 'p1', bounceTarget));
    ({ rig } = putCharacterInPlay(rig, 'p2', oppChar));
    const handOk = putInHand(rig, 'p1', playTarget);
    rig = handOk.rig;
    const handBad = putInHand(rig, 'p1', tooExpensive);
    rig = handBad.rig;

    const fired = runTimings(registry['OP16-045'], ['onPlay'], rig.state, crocoId, rig.defs, null, registry);
    const returnChoice = fired.state.pendingChoices[0];
    expect(returnChoice.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([crocoId, bounceId]));
    const oppId = Object.keys(rig.state.cardsById).find((id) => rig.state.cardsById[id].cardDefinitionId === 'OPP-1');
    expect(returnChoice.constraints.candidateInstanceIds).not.toContain(oppId);

    const afterReturn = resumeProgram(
      registry['OP16-045'],
      fired.state,
      returnChoice,
      [bounceId],
      rig.defs,
      null,
      registry,
    );
    expect(afterReturn.state.players.p1.hand.cardIds).toContain(bounceId);
    expect(afterReturn.state.players.p1.characterArea.cardIds).not.toContain(bounceId);

    const playChoice = afterReturn.state.pendingChoices[0];
    expect(playChoice.constraints.candidateInstanceIds).toContain(handOk.instanceId);
    expect(playChoice.constraints.candidateInstanceIds).not.toContain(handBad.instanceId);

    const afterPlay = resumeProgram(
      registry['OP16-045'],
      afterReturn.state,
      playChoice,
      [handOk.instanceId],
      rig.defs,
      null,
      registry,
    ).state;
    expect(afterPlay.players.p1.characterArea.cardIds.some((id) => afterPlay.cardsById[id].cardDefinitionId === 'IMPEL-2')).toBe(true);
    expect(afterPlay.players.p1.hand.cardIds).not.toContain(handOk.instanceId);
  });
});
