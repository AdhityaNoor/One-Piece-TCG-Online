import { describe, expect, it } from 'vitest';
import { executeActivateOnOpponentsAttack, validateActivateOnOpponentsAttack } from '../../../engine/rules/battle/activateOnOpponentsAttack';
import { computeCurrentPower } from '../../../engine/rules/shared/power';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  makeLeaderDef,
  makeStageDef,
  putCharacterInPlay,
  putInHand,
  putStageInPlay,
} from '../../../engine/rules/shared/__tests__/testRig';
import { resumeProgram, runTimings } from '../../../engine/effects/interpreter';
import { buildRegistryFromAssignments } from '../assembler';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';

const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);

describe('OP15-002 Lucy battle effects', () => {
  it('lets the Leader activate [On Your Opponent\'s Attack] during the block window', () => {
    const lucy = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const attacker = makeCharacterDef({ cardDefinitionId: 'OP15-LUCY-ATTACKER', cardNumber: 'OP15-LUCY-ATTACKER' });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 6, leaderOverridesP1: lucy });
    const attackerPlay = putCharacterInPlay(rig, 'p2', attacker);
    rig = attackerPlay.rig;
    const lucyId = rig.state.players.p1.leaderInstanceId;
    const state = {
      ...rig.state,
      currentBattle: {
        attackerInstanceId: attackerPlay.instanceId,
        targetInstanceId: lucyId,
        originalTargetInstanceId: lucyId,
        step: 'block' as const,
        blockerUsed: false,
        battlePowerBonuses: {},
      },
    };

    const result = validateActivateOnOpponentsAttack(
      state,
      {
        type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
        actionId: 'lucy-on-opp-attack',
        playerId: 'p1',
        sourceInstanceId: lucyId,
        effectId: 'onOpponentsAttack',
        donInstanceIds: [],
      },
      registry,
      rig.defs,
    );

    expect(result.legal).toBe(true);
  });

  it('gains +1000 for each Event or Stage trashed from hand', () => {
    const lucy = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const eventA = makeEventDef({ cardDefinitionId: 'OP15-LUCY-EVENT-A', cardNumber: 'OP15-LUCY-EVENT-A' });
    const eventB = makeEventDef({ cardDefinitionId: 'OP15-LUCY-EVENT-B', cardNumber: 'OP15-LUCY-EVENT-B' });
    const stage = makeStageDef({ cardDefinitionId: 'OP15-LUCY-STAGE', cardNumber: 'OP15-LUCY-STAGE' });
    const character = makeCharacterDef({ cardDefinitionId: 'OP15-LUCY-CHAR', cardNumber: 'OP15-LUCY-CHAR' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: lucy });
    const lucyId = rig.state.players.p1.leaderInstanceId;
    const eventAHand = putInHand(rig, 'p1', eventA);
    rig = eventAHand.rig;
    const eventBHand = putInHand(rig, 'p1', eventB);
    rig = eventBHand.rig;
    const stageHand = putInHand(rig, 'p1', stage);
    rig = stageHand.rig;
    const characterHand = putInHand(rig, 'p1', character);
    rig = characterHand.rig;

    const fired = runTimings(registry['OP15-002'], ['whenAttacking'], rig.state, lucyId, rig.defs, 'test', registry);
    const choice = fired.state.pendingChoices[0];
    expect(choice?.constraints.candidateInstanceIds).toEqual(expect.arrayContaining([eventAHand.instanceId, eventBHand.instanceId, stageHand.instanceId]));
    expect(choice?.constraints.candidateInstanceIds).not.toContain(characterHand.instanceId);

    const resolved = resumeProgram(
      registry['OP15-002'],
      fired.state,
      choice!,
      [eventAHand.instanceId, eventBHand.instanceId, stageHand.instanceId],
      rig.defs,
      'test',
      registry,
    ).state;

    expect(computeCurrentPower(rig.defs, resolved, lucyId)).toBe(8000);
  });

  it('lets OP15-057 activate from Stage timing and grant +2000 after trashing an Event or Stage', () => {
    const lucy = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002', types: ['Dressrosa'] });
    const stageDef = makeStageDef({ cardDefinitionId: 'OP15-057', cardNumber: 'OP15-057', types: ['Dressrosa'] });
    const eventDef = makeEventDef({ cardDefinitionId: 'OP15-STAGE-COST-EVENT', cardNumber: 'OP15-STAGE-COST-EVENT' });
    const attacker = makeCharacterDef({ cardDefinitionId: 'OP15-STAGE-ATTACKER', cardNumber: 'OP15-STAGE-ATTACKER', basePower: 5000 });

    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 6, leaderOverridesP1: lucy });
    const stagePlay = putStageInPlay(rig, 'p1', stageDef);
    rig = stagePlay.rig;
    const handEvent = putInHand(rig, 'p1', eventDef);
    rig = handEvent.rig;
    const attackerPlay = putCharacterInPlay(rig, 'p2', attacker);
    rig = attackerPlay.rig;
    const lucyId = rig.state.players.p1.leaderInstanceId;
    const state = {
      ...rig.state,
      currentBattle: {
        attackerInstanceId: attackerPlay.instanceId,
        targetInstanceId: lucyId,
        originalTargetInstanceId: lucyId,
        step: 'block' as const,
        blockerUsed: false,
        battlePowerBonuses: {},
      },
    };

    const action = {
      type: 'ACTIVATE_ON_OPPONENTS_ATTACK' as const,
      actionId: 'op15-057-on-opp-attack',
      playerId: 'p1',
      sourceInstanceId: stagePlay.instanceId,
      effectId: 'onOpponentsAttack',
      donInstanceIds: [],
    };

    expect(validateActivateOnOpponentsAttack(state, action, registry, rig.defs).legal).toBe(true);

    const activated = executeActivateOnOpponentsAttack(state, action, rig.defs, registry);
    expect(activated.state.cardsById[stagePlay.instanceId]?.orientation).toBe('rested');
    const trashChoice = activated.state.pendingChoices[0];
    expect(trashChoice?.constraints.candidateInstanceIds).toContain(handEvent.instanceId);

    const afterTrash = resumeProgram(registry['OP15-057'], activated.state, trashChoice!, [handEvent.instanceId], rig.defs, 'test', registry);
    const targetChoice = afterTrash.state.pendingChoices[0];
    expect(targetChoice?.constraints.candidateInstanceIds).toContain(lucyId);

    const resolved = resumeProgram(registry['OP15-057'], afterTrash.state, targetChoice!, [lucyId], rig.defs, 'test', registry).state;
    expect(computeCurrentPower(rig.defs, resolved, lucyId)).toBe(7000);
  });
});
