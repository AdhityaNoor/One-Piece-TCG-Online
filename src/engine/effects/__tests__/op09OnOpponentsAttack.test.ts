/**
 * Regression: OP09-001 [On Your Opponent's Attack] must resolve when the
 * deck snapshot keys the Leader by a definition id other than the printed
 * cardNumber (same cardNumber-fallback pattern as OP09-004 / fireOnPlay).
 */
import { describe, expect, it } from 'vitest';
import { CURATED_EFFECT_PROGRAMS } from '../../../cards/effectTemplates';
import { executeDeclareAttack } from '../../rules/battle/declareAttack';
import {
  executeActivateOnOpponentsAttack,
  hasAnyUsableOnOpponentsAttack,
  validateActivateOnOpponentsAttack,
} from '../../rules/battle/activateOnOpponentsAttack';
import { computeCurrentPower } from '../../rules/shared/power';
import {
  buildBaseRig,
  makeCharacterDef,
  nextTestId,
  putCharacterInPlay,
} from '../../rules/shared/__tests__/testRig';

describe('OP09-001 On Opp Attack cardNumber fallback', () => {
  it('keeps Block Step and activates when definition id differs from OP09-001', () => {
    const program = CURATED_EFFECT_PROGRAMS['OP09-001'];
    expect(program).toBeDefined();
    expect(program.abilities.some((a) => a.timing === 'onOpponentsAttack')).toBe(true);

    // Registry keyed only by printed cardNumber — the latent miss when
    // hasAnyUsable / validate / execute looked up cardDefinitionId alone.
    const registry = { 'OP09-001': program };

    const rig = buildBaseRig({
      phase: 'main',
      activePlayerId: 'p1',
      leaderOverridesP2: {
        cardDefinitionId: 'OP09-001_snapshot',
        cardNumber: 'OP09-001',
        name: 'Shanks',
        colors: ['red'],
        types: ['Red-Haired Pirates'],
        basePower: 5000,
        life: 5,
      },
    });
    const attackerId = rig.state.players.p1.leaderInstanceId;
    const defenderLeaderId = rig.state.players.p2.leaderInstanceId;
    const foe = putCharacterInPlay(rig, 'p1', makeCharacterDef({ basePower: 5000 }));
    const battling = executeDeclareAttack(
      foe.rig.state,
      {
        type: 'DECLARE_ATTACK',
        actionId: nextTestId('action'),
        playerId: 'p1',
        attackerInstanceId: attackerId,
        targetInstanceId: defenderLeaderId,
      },
      foe.rig.defs,
      registry,
    );

    expect(battling.state.currentBattle?.step).toBe('block');
    expect(hasAnyUsableOnOpponentsAttack(battling.state, 'p2', registry, foe.rig.defs)).toBe(true);

    const action = {
      type: 'ACTIVATE_ON_OPPONENTS_ATTACK' as const,
      actionId: nextTestId('action'),
      playerId: 'p2',
      sourceInstanceId: defenderLeaderId,
      effectId: 'onOpponentsAttack',
      donInstanceIds: [] as string[],
    };
    expect(validateActivateOnOpponentsAttack(battling.state, action, registry, foe.rig.defs).legal).toBe(true);

    const fired = executeActivateOnOpponentsAttack(battling.state, action, foe.rig.defs, registry);
    expect(fired.state.currentBattle?.onOpponentsAttackUsedInstanceIds).toContain(defenderLeaderId);
    // Optional −1000 prompts a target choice (or applies if auto-selected).
    expect(
      fired.pendingChoices.length > 0 ||
        computeCurrentPower(foe.rig.defs, fired.state, foe.instanceId) === 4000 ||
        computeCurrentPower(foe.rig.defs, fired.state, attackerId) === 4000,
    ).toBe(true);
  });
});
