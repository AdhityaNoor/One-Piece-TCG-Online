/**
 * Engine-capability tests for swapBasePower, redirectAttackTarget, and onTriggerActivated.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { fireTriggerActivatedReactions } from '../../../engine/effects/fireTiming';
import { computeCurrentPower } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay, putDeckCards, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { EffectProgram } from '../../../engine/effects/effectIr';
import type { GameState } from '../../../engine/state/game';

describe('swapBasePower', () => {
  const charA = makeCharacterDef({ cardDefinitionId: 'SWAP-A', cardNumber: 'SWAP-A', baseCost: 3, basePower: 4000, types: ['Supernovas'] });
  const charB = makeCharacterDef({ cardDefinitionId: 'SWAP-B', cardNumber: 'SWAP-B', baseCost: 4, basePower: 6000, types: ['Heart Pirates'] });

  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-SWAP',
    templateId: 'ability',
    params: {
      timing: 'activateMain',
      functions: [{
        fn: 'swapBasePower',
        target: { group: 'characters', player: 'controller', filter: { anyOfTypes: ['Supernovas', 'Heart Pirates'] } },
        duration: 'duringThisTurn',
        minTargets: 2,
        maxTargets: 2,
      }],
    },
  };

  it('crosswise overwrites printed base power on two chosen Characters', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    const source = makeCharacterDef({ cardDefinitionId: 'SRC', cardNumber: 'SRC', baseCost: 1 });
    const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const withSource = putCharacterInPlay(base, 'p1', source);
    const withA = putCharacterInPlay(withSource.rig, 'p1', charA);
    const withB = putCharacterInPlay(withA.rig, 'p1', charB);
    const program = registry[assignment.cardNumber]!;

    const suspended = runTimings(program, ['activateMain'], withB.rig.state, withSource.instanceId, withB.rig.defs, 'test', registry);
    expect(suspended.pendingChoices).toHaveLength(1);
    const choice = suspended.pendingChoices[0]!;

    const resumed = resumeProgram(program, suspended.state, choice, [withA.instanceId, withB.instanceId], withB.rig.defs, 'test', registry);
    expect(resumed.pendingChoices).toHaveLength(0);
    expect(computeCurrentPower(withB.rig.defs, resumed.state, withA.instanceId)).toBe(6000);
    expect(computeCurrentPower(withB.rig.defs, resumed.state, withB.instanceId)).toBe(4000);
  });
});

describe('redirectAttackTarget', () => {
  it('changes currentBattle.targetInstanceId during onOpponentsAttack', () => {
    const redirector = makeCharacterDef({ cardDefinitionId: 'REDIR', cardNumber: 'REDIR', baseCost: 5, types: ['Donquixote Pirates'] });
    const attacker = makeCharacterDef({ cardDefinitionId: 'ATK', cardNumber: 'ATK', baseCost: 4, basePower: 5000 });
    const originalTarget = makeLeaderDef({ cardDefinitionId: 'DEF-L', cardNumber: 'DEF-L', basePower: 5000 });
    const altTarget = makeCharacterDef({ cardDefinitionId: 'ALT', cardNumber: 'ALT', baseCost: 3, basePower: 3000, types: ['Donquixote Pirates'] });

    const program = {
      cardNumber: 'REDIR',
      abilities: [{
        timing: 'onOpponentsAttack',
        ops: [
          { op: 'chooseTargets', var: 't', from: { sel: 'controllerLeaderOrCharacters', typeIncludes: 'Donquixote Pirates', typeFilterCharactersOnly: true }, min: 1, max: 1, prompt: 'Choose redirect target.' },
          { op: 'redirectAttackTarget', target: { sel: 'var', name: 't' } },
        ],
      }],
    } satisfies EffectProgram;

    const base = buildBaseRig({ activePlayerId: 'p2', leaderOverridesP2: originalTarget });
    const withAlt = putCharacterInPlay(base, 'p2', altTarget);
    const withRedir = putCharacterInPlay(withAlt.rig, 'p2', redirector);
    const withAtk = putCharacterInPlay(withRedir.rig, 'p1', attacker, { summoningSick: false });

    const leaderId = withAtk.rig.state.players.p2.leaderInstanceId;
    const battling: GameState = {
      ...withAtk.rig.state,
      currentBattle: {
        attackerInstanceId: withAtk.instanceId,
        targetInstanceId: leaderId,
        originalTargetInstanceId: leaderId,
        step: 'block',
        blockerUsed: false,
        battlePowerBonuses: {},
      },
    };

    const fired = runTimings(program, ['onOpponentsAttack'], battling, withRedir.instanceId, withAtk.rig.defs, 'test', { [redirector.cardDefinitionId]: program });
    expect(fired.pendingChoices).toHaveLength(1);
    const resumed = resumeProgram(program, fired.state, fired.pendingChoices[0]!, [withAlt.instanceId], withAtk.rig.defs, 'test', { [redirector.cardDefinitionId]: program });
    expect(resumed.state.currentBattle?.targetInstanceId).toBe(withAlt.instanceId);
  });
});

describe('onTriggerActivated', () => {
  it('fires Pagaya draw+trash when a Life [Trigger] resolves', () => {
    const pagaya = makeCharacterDef({ cardDefinitionId: 'PAGAYA', cardNumber: 'OP05-109', baseCost: 1 });
    const triggerLife = makeCharacterDef({ cardDefinitionId: 'TRIG', cardNumber: 'TRIG', baseCost: 2, hasTrigger: true, text: '[Trigger] Draw 1 card.' });
    const filler = makeCharacterDef({ cardDefinitionId: 'FILL', cardNumber: 'FILL', baseCost: 1 });

    const pagayaProgram = buildRegistryFromAssignments([{
      cardNumber: 'OP05-109',
      templateId: 'ability',
      params: { timing: 'onTriggerActivated', oncePerTurn: true, functions: [{ fn: 'draw', amount: 2 }, { fn: 'trashFromHand', count: 2 }] },
    }])['OP05-109']!;

    const triggerProgram = {
      cardNumber: 'TRIG',
      abilities: [{ timing: 'lifeTrigger', ops: [{ op: 'draw', amount: 1 }] }],
    } satisfies EffectProgram;

    const base = buildBaseRig({ activePlayerId: 'p1' });
    const withDeck = putDeckCards(base, 'p1', filler, 5);
    const withPagaya = putCharacterInPlay(withDeck.rig, 'p1', pagaya);
    const withHand = putInHand(withPagaya.rig, 'p1', filler);
    const withHand2 = putInHand(withHand.rig, 'p1', filler);
    const withHand3 = putInHand(withHand2.rig, 'p1', filler);

    const handBefore = withHand3.rig.state.players.p1.hand.cardIds.length;
    const result = fireTriggerActivatedReactions(withHand3.rig.state, 'p2', { [pagaya.cardDefinitionId]: pagayaProgram, [triggerLife.cardDefinitionId]: triggerProgram }, withHand3.rig.defs, 'test');
    expect(result.state.players.p1.hand.cardIds.length).toBe(handBefore + 2);
    expect(result.pendingChoices).toHaveLength(1);
  });
});
