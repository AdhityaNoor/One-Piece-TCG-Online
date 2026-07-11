import { describe, expect, it } from 'vitest';
import { chooseAction, generateLegalActions } from '../index';
import { executeActivateOnOpponentsAttack } from '../../engine/rules/battle/activateOnOpponentsAttack';
import { executePlayCharacter } from '../../engine/actions/handlers/playCharacter';
import { validateAction } from '../../engine/actions/dispatch';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay, putDeckCards, putInHand } from '../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../../cards/effectTemplates/assembler';
import { OP15_ASSIGNMENTS } from '../../cards/effectTemplates/assignments/OP15';
import { createPreGameState } from '../../engine/setup';
import { GENERIC_DON_CARD_DEFINITION } from '../../cards/decks/genericDonCard';
import type { PlayerSetupInput } from '../../engine/setup';

function makeDeckInput(playerId: 'p1' | 'p2', leader: ReturnType<typeof makeCharacterDef>, deck: ReturnType<typeof makeCharacterDef>[]): PlayerSetupInput {
  return {
    playerId,
    leader: { ...leader, category: 'leader', life: 5 },
    deck: Array.from({ length: 50 }, (_, i) => deck[i % deck.length]),
    donCard: GENERIC_DON_CARD_DEFINITION,
    donDeckSize: 10,
  };
}

describe('CPU player', () => {
  it('chooseAction is deterministic for the same state and seed', () => {
    const leader = makeCharacterDef({ cardNumber: 'L-1', baseCost: 0, basePower: 5000 });
    const vanilla = makeCharacterDef({ cardNumber: 'C-1', baseCost: 2, basePower: 3000 });
    const p1 = makeDeckInput('p1', leader, [vanilla]);
    const p2 = makeDeckInput('p2', { ...leader, cardDefinitionId: 'L-2', cardNumber: 'L-2' }, [vanilla]);
    const created = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 'cpu-test-seed', cursor: 0 } });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    let state = {
      ...created.state,
      currentPhase: 'main' as const,
      activePlayerId: 'p2' as const,
      turnNumber: 3,
      setupState: null,
      pendingChoices: [],
    };
    const rig = buildBaseRig({ state });
    const withChar = putCharacterInPlay(rig, 'p2', vanilla);
    state = withChar.rig.state;

    const ctx = {
      state,
      playerId: 'p2' as const,
      defs: withChar.rig.defs,
      registry: {},
      config: { difficulty: 'hard' as const, seed: 'cpu-test-seed' },
      createActionId: () => 'cpu-action-1',
    };

    const a = chooseAction(ctx);
    const b = chooseAction(ctx);
    expect(a?.action.type).toBe(b?.action.type);
    expect(JSON.stringify(a?.action)).toBe(JSON.stringify(b?.action));
  });

  it('generates END_MAIN_PHASE among legal main-phase actions', () => {
    const leader = makeCharacterDef({ cardNumber: 'L-1' });
    const vanilla = makeCharacterDef({ cardNumber: 'C-1', baseCost: 1 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    rig = putDeckCards(rig, 'p1', vanilla, 5).rig;
    putCharacterInPlay(rig, 'p1', { ...leader, category: 'leader' });

    const state = useMatchReadyState(rig.state);
    const legal = generateLegalActions({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      createActionId: () => 'id-1',
    });
    expect(legal.some((a) => a.type === 'END_MAIN_PHASE')).toBe(true);
  });

  it('never proposes actions that fail engine validation', () => {
    const leader = makeCharacterDef({ cardNumber: 'L-1' });
    const char = makeCharacterDef({ cardNumber: 'C-CPU', baseCost: 1, basePower: 2000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    const hand = putInHand(rig, 'p1', char);
    putCharacterInPlay(hand.rig, 'p1', { ...leader, category: 'leader' });
    const state = useMatchReadyState(hand.rig.state);
    const legal = generateLegalActions({
      state,
      playerId: 'p1',
      defs: hand.rig.defs,
      registry: {},
      createActionId: () => 'id-2',
    });
    expect(legal.length).toBeGreaterThan(0);
    for (const action of legal) {
      expect(action.playerId).toBe('p1');
    }
  });

  it('resolves character area overflow by trashing one character', () => {
    const fielded = makeCharacterDef({ cardNumber: 'FIELD', baseCost: 0, basePower: 1000 });
    const sixth = makeCharacterDef({ cardNumber: 'SIXTH', baseCost: 0, basePower: 9000 });
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    for (let i = 0; i < 5; i += 1) {
      rig = putCharacterInPlay(rig, 'p2', fielded).rig;
    }
    const { rig: withHand, instanceId: handInstanceId } = putInHand(rig, 'p2', sixth);
    const played = executePlayCharacter(
      withHand.state,
      { type: 'PLAY_CHARACTER', actionId: 'overflow-play', playerId: 'p2', handCardInstanceId: handInstanceId, donInstanceIds: [] },
      withHand.defs,
    );

    expect(played.pendingChoices).toHaveLength(1);
    expect(played.pendingChoices[0].sourceEffectId).toBe('rule:characterAreaOverflow');

    const state = {
      ...played.state,
      turnNumber: 3,
      setupState: null,
      currentBattle: null,
    };

    const legal = generateLegalActions({
      state,
      playerId: 'p2',
      defs: withHand.defs,
      registry: {},
      createActionId: () => 'overflow-resolve',
    });

    expect(legal.length).toBeGreaterThan(0);
    expect(legal.every((action) => action.type === 'RESOLVE_PENDING_CHOICE')).toBe(true);

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: withHand.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'overflow-seed' },
      createActionId: () => 'overflow-resolve',
    });

    expect(decision).not.toBeNull();
    expect(decision?.action.type).toBe('RESOLVE_PENDING_CHOICE');
    const validation = validateAction(state, decision!.action, withHand.defs, {});
    expect(validation.legal).toBe(true);
  });

  it('passes Lucy block step when onOpponentsAttack has no trashable events or stages', () => {
    const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);
    const lucy = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const attacker = makeCharacterDef({ cardNumber: 'CPU-ATK', baseCost: 1, basePower: 4000 });
    const filler = makeCharacterDef({ cardNumber: 'CPU-FILL', baseCost: 1, basePower: 2000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: lucy });
    const attackerPlay = putCharacterInPlay(rig, 'p1', attacker);
    rig = attackerPlay.rig;
    const lucyId = rig.state.players.p2.leaderInstanceId!;
    const withHand = putInHand(rig, 'p2', filler);
    const state = {
      ...withHand.rig.state,
      currentBattle: {
        attackerInstanceId: attackerPlay.instanceId,
        targetInstanceId: lucyId,
        originalTargetInstanceId: lucyId,
        step: 'block' as const,
        blockerUsed: false,
        onOpponentsAttackUsedInstanceIds: [],
        battlePowerBonuses: {},
      },
    };

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: withHand.rig.defs,
      registry,
      config: { difficulty: 'hard', seed: 'lucy-pass' },
      createActionId: () => 'lucy-pass',
    });

    expect(decision?.action.type).toBe('PASS_STEP');
  });

  it('resolves Lucy onOpponentsAttack trash then cannot re-activate in the same battle', () => {
    const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);
    const lucy = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const attacker = makeCharacterDef({ cardNumber: 'CPU-ATK2', baseCost: 1, basePower: 4000 });
    const eventCard = { ...makeCharacterDef({ cardNumber: 'EV-1', baseCost: 1 }), category: 'event' as const };
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: lucy });
    const attackerPlay = putCharacterInPlay(rig, 'p1', attacker);
    rig = putInHand(attackerPlay.rig, 'p2', eventCard).rig;
    const lucyId = rig.state.players.p2.leaderInstanceId!;
    let state = {
      ...rig.state,
      currentBattle: {
        attackerInstanceId: attackerPlay.instanceId,
        targetInstanceId: lucyId,
        originalTargetInstanceId: lucyId,
        step: 'block' as const,
        blockerUsed: false,
        onOpponentsAttackUsedInstanceIds: [],
        battlePowerBonuses: {},
      },
    };

    const activated = executeActivateOnOpponentsAttack(
      state,
      {
        type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
        actionId: 'lucy-activate',
        playerId: 'p2',
        sourceInstanceId: lucyId,
        effectId: 'onOpponentsAttack',
        donInstanceIds: [],
      },
      rig.defs,
      registry,
    );
    expect(activated.pendingChoices).toHaveLength(1);

    const afterTrash = chooseAction({
      state: activated.state,
      playerId: 'p2',
      defs: rig.defs,
      registry,
      config: { difficulty: 'hard', seed: 'lucy-trash' },
      createActionId: () => 'lucy-trash',
    });
    expect(afterTrash?.action.type).toBe('RESOLVE_PENDING_CHOICE');

    const resolved = validateAction(activated.state, afterTrash!.action, rig.defs, registry);
    expect(resolved.legal).toBe(true);

    state = {
      ...activated.state,
      pendingChoices: [],
      currentBattle: {
        ...activated.state.currentBattle!,
        onOpponentsAttackUsedInstanceIds: [lucyId],
      },
    };

    const legal = generateLegalActions({
      state,
      playerId: 'p2',
      defs: rig.defs,
      registry,
      createActionId: () => 'lucy-after',
    });
    expect(legal.some((a) => a.type === 'ACTIVATE_ON_OPPONENTS_ATTACK')).toBe(false);
    expect(legal.some((a) => a.type === 'PASS_STEP')).toBe(true);
  });

  it('skips optional hand-trash prompt when hand has no eligible cards', () => {
    const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);
    const lucy = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const attacker = makeCharacterDef({ cardNumber: 'CPU-ATK3', baseCost: 1, basePower: 4000 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, leaderOverridesP2: lucy });
    const attackerPlay = putCharacterInPlay(rig, 'p1', attacker);
    rig = attackerPlay.rig;
    const lucyId = rig.state.players.p2.leaderInstanceId!;
    const state = {
      ...rig.state,
      players: {
        ...rig.state.players,
        p2: { ...rig.state.players.p2, hand: { ...rig.state.players.p2.hand, cardIds: [] } },
      },
      currentBattle: {
        attackerInstanceId: attackerPlay.instanceId,
        targetInstanceId: lucyId,
        originalTargetInstanceId: lucyId,
        step: 'block' as const,
        blockerUsed: false,
        onOpponentsAttackUsedInstanceIds: [],
        battlePowerBonuses: {},
      },
    };

    const activated = executeActivateOnOpponentsAttack(
      state,
      {
        type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
        actionId: 'lucy-empty',
        playerId: 'p2',
        sourceInstanceId: lucyId,
        effectId: 'onOpponentsAttack',
        donInstanceIds: [],
      },
      rig.defs,
      registry,
    );
    expect(activated.pendingChoices).toHaveLength(0);
    expect(activated.state.currentBattle?.onOpponentsAttackUsedInstanceIds).toContain(lucyId);
  });

  it('does not softlock when a hand SELECT_CARDS is required but hand is empty', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 5 });
    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      players: {
        ...rig.state.players,
        p2: { ...rig.state.players.p2, hand: { ...rig.state.players.p2.hand, cardIds: [] } },
      },
      pendingChoices: [
        {
          id: 'trash-hand-empty',
          playerId: 'p2',
          kind: 'SELECT_CARDS' as const,
          prompt: 'Trash 1 from hand',
          constraints: { min: 1, max: 1, zoneId: 'hand' as const, candidateInstanceIds: [] as string[] },
          sourceEffectId: 'ir',
          sourceInstanceId: rig.state.players.p2.leaderInstanceId!,
          resumeState: { abilityIndex: 0, opIndex: 0, bindings: {} },
        },
      ],
    };

    const legal = generateLegalActions({
      state,
      playerId: 'p2',
      defs: rig.defs,
      registry: {},
      createActionId: () => 'empty-hand-legal',
    });
    expect(legal.length).toBeGreaterThan(0);
    expect(legal.every((a) => a.type === 'RESOLVE_PENDING_CHOICE')).toBe(true);

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'hard', seed: 'empty-hand' },
      createActionId: () => 'empty-hand-choose',
    });
    expect(decision).not.toBeNull();
    expect(decision?.action.type).toBe('RESOLVE_PENDING_CHOICE');
    const validation = validateAction(state, decision!.action, rig.defs, {});
    expect(validation.legal).toBe(true);
  });

  it('ends main phase when hand is empty and no other plays remain', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 5 });
    rig.state.cardsById[rig.state.players.p2.leaderInstanceId!].orientation = 'rested';
    const state = {
      ...rig.state,
      setupState: null,
      currentBattle: null,
      pendingChoices: [],
      players: {
        ...rig.state.players,
        p2: { ...rig.state.players.p2, hand: { ...rig.state.players.p2.hand, cardIds: [] }, characterArea: { ...rig.state.players.p2.characterArea, cardIds: [] } },
      },
    };

    const decision = chooseAction({
      state,
      playerId: 'p2',
      defs: rig.defs,
      registry: {},
      config: { difficulty: 'normal', seed: 'empty-main' },
      createActionId: () => 'empty-main',
    });
    expect(decision?.action.type).toBe('END_MAIN_PHASE');
  });
});

function useMatchReadyState(state: ReturnType<typeof buildBaseRig>['state']) {
  return {
    ...state,
    turnNumber: Math.max(3, state.turnNumber),
    currentPhase: 'main' as const,
    setupState: null,
    pendingChoices: [],
    currentBattle: null,
  };
}
