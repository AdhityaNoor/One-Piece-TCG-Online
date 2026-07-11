import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import type { EffectProgram } from '../../engine/effects';
import { buildStrategicContext } from '../evaluation/stateEvaluator';
import { scoreActionStrategic } from '../evaluation/actionEvaluator';
import { chooseAction } from '../cpuPlayer';
import {
  analyzeAttackTrigger,
  scoreAttackTriggerSequencing,
  scoreOnBlockPayoff,
} from '../planning/attackTriggerPlanner';

describe('whenAttacking / onBlock sequencing', () => {
  const filler = makeCharacterDef({ cardNumber: 'DECK-AT', baseCost: 0, basePower: 1000 });

  function withDecks(rig: ReturnType<typeof buildBaseRig>) {
    let next = putDeckCards(rig, 'p1', filler, 8).rig;
    next = putDeckCards(next, 'p2', filler, 8).rig;
    return next;
  }

  function withLife(rig: ReturnType<typeof buildBaseRig>, playerId: 'p1' | 'p2', count: number) {
    const cards = Array.from({ length: count }, (_, i) =>
      makeCharacterDef({ cardNumber: `LIFE-AT-${playerId}-${i}`, baseCost: 0 }),
    );
    return putLifeCards(rig, playerId, cards).rig;
  }

  const restOnAttack: EffectProgram = {
    cardNumber: 'REST-ATK',
    abilities: [
      {
        timing: 'whenAttacking',
        condition: { donAttachedAtLeast: 1 },
        ops: [
          {
            op: 'chooseTargets',
            var: 't',
            from: { sel: 'opponentCharacters', maxCost: 2 },
            min: 0,
            max: 1,
            prompt: 'Rest up to 1.',
          },
          { op: 'rest', target: { sel: 'var', name: 't' } },
        ],
      },
    ],
  };

  it('prefers attacking with a rest whenAttacking piece before a vanilla beater', () => {
    const triggerDef = makeCharacterDef({
      cardDefinitionId: 'REST-ATK',
      cardNumber: 'REST-ATK',
      baseCost: 3,
      basePower: 5000,
    });
    const vanillaDef = makeCharacterDef({
      cardDefinitionId: 'VAN-ATK',
      cardNumber: 'VAN-ATK',
      baseCost: 4,
      basePower: 6000,
    });
    const small = makeCharacterDef({ cardNumber: 'SMALL', baseCost: 2, basePower: 3000 });
    const registry = { 'REST-ATK': restOnAttack };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = withDecks(rig);
    rig = withLife(rig, 'p1', 5);
    rig = withLife(rig, 'p2', 5);
    const trigger = putCharacterInPlay(rig, 'p1', triggerDef);
    rig = trigger.rig;
    rig.state.cardsById[trigger.instanceId] = {
      ...rig.state.cardsById[trigger.instanceId],
      donAttached: ['fake-don'],
    };
    const vanilla = putCharacterInPlay(rig, 'p1', vanillaDef);
    rig = vanilla.rig;
    const foe = putCharacterInPlay(rig, 'p2', small);
    rig = foe.rig;

    const state = { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
    const strategic = buildStrategicContext(state, 'p1', rig.defs, registry);
    const oppLeader = state.players.p2.leaderInstanceId!;

    const analysis = analyzeAttackTrigger(state, 'p1', rig.defs, registry, trigger.instanceId);
    expect(analysis.triggerEnabled).toBe(true);
    expect(analysis.preferAttackFirst).toBe(true);
    expect(analysis.hasLiveSetupTarget).toBe(true);

    const triggerSwing = scoreAttackTriggerSequencing(
      state,
      'p1',
      rig.defs,
      registry,
      strategic,
      trigger.instanceId,
      oppLeader,
    );
    const vanillaSwing = scoreAttackTriggerSequencing(
      state,
      'p1',
      rig.defs,
      registry,
      strategic,
      vanilla.instanceId,
      oppLeader,
    );
    expect(triggerSwing).toBeGreaterThan(vanillaSwing);

    const triggerScore = scoreActionStrategic(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'a1',
        playerId: 'p1',
        attackerInstanceId: trigger.instanceId,
        targetInstanceId: oppLeader,
      },
      'p1',
      rig.defs,
      registry,
      strategic,
    );
    const vanillaScore = scoreActionStrategic(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'a2',
        playerId: 'p1',
        attackerInstanceId: vanilla.instanceId,
        targetInstanceId: oppLeader,
      },
      'p1',
      rig.defs,
      registry,
      strategic,
    );
    expect(triggerScore).toBeGreaterThan(vanillaScore);
  });

  it('chooseAction opens with the rest whenAttacking attacker', () => {
    const triggerDef = makeCharacterDef({
      cardDefinitionId: 'REST-ATK',
      cardNumber: 'REST-ATK',
      baseCost: 3,
      basePower: 5000,
    });
    const vanillaDef = makeCharacterDef({
      cardDefinitionId: 'VAN-ATK2',
      cardNumber: 'VAN-ATK2',
      baseCost: 4,
      basePower: 6000,
    });
    const small = makeCharacterDef({ cardNumber: 'SMALL2', baseCost: 2, basePower: 2000 });
    const registry = { 'REST-ATK': restOnAttack };

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
    rig = withDecks(rig);
    rig = withLife(rig, 'p1', 5);
    rig = withLife(rig, 'p2', 5);
    const trigger = putCharacterInPlay(rig, 'p1', triggerDef);
    rig = trigger.rig;
    // Satisfy DON!! x1 via donAttached length without full attach plumbing.
    rig.state.cardsById[trigger.instanceId] = {
      ...rig.state.cardsById[trigger.instanceId],
      donAttached: ['fake-don'],
    };
    const vanilla = putCharacterInPlay(rig, 'p1', vanillaDef);
    rig = vanilla.rig;
    const foe = putCharacterInPlay(rig, 'p2', small);
    const state = { ...foe.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    let n = 0;
    const decision = chooseAction({
      state,
      playerId: 'p1',
      defs: foe.rig.defs,
      registry,
      config: { difficulty: 'hard', seed: 'rest-before-attack' },
      createActionId: () => `atk-${n++}`,
    });

    expect(decision?.action.type).toBe('DECLARE_ATTACK');
    if (decision?.action.type === 'DECLARE_ATTACK') {
      expect(decision.action.attackerInstanceId).toBe(trigger.instanceId);
    }
  });

  it('values onBlock payoffs on blockers', () => {
    const blockerDef = makeCharacterDef({
      cardDefinitionId: 'BLK-OB',
      cardNumber: 'BLK-OB',
      baseCost: 3,
      basePower: 4000,
      hasBlocker: true,
    });
    const vanillaBlocker = makeCharacterDef({
      cardDefinitionId: 'BLK-V',
      cardNumber: 'BLK-V',
      baseCost: 3,
      basePower: 4000,
      hasBlocker: true,
    });
    const registry: Record<string, EffectProgram> = {
      'BLK-OB': {
        cardNumber: 'BLK-OB',
        abilities: [
          {
            timing: 'onBlock',
            ops: [{ op: 'draw', amount: 1 }],
          },
        ],
      },
    };

    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 4 });
    const withPayoff = putCharacterInPlay(rig, 'p2', blockerDef);
    const withBoth = putCharacterInPlay(withPayoff.rig, 'p2', vanillaBlocker);
    const state = { ...withBoth.rig.state, setupState: null, currentBattle: null, pendingChoices: [] };

    const payoff = scoreOnBlockPayoff(state, 'p2', withBoth.rig.defs, registry, withPayoff.instanceId);
    const plain = scoreOnBlockPayoff(state, 'p2', withBoth.rig.defs, registry, withBoth.instanceId);
    expect(payoff).toBeGreaterThan(plain);
  });
});
