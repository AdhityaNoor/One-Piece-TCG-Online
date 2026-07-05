/**
 * Engine-capability tests for the ST08 deferred families (each reuses an existing abstraction):
 *   - K.O. immunity filtered by attacker category (ST08-002: "cannot be K.O.'d in battle by Leaders").
 *   - `battleOpponent` selector + K.O. exchange (ST08-013 Mr.2).
 *   - reactive `onCharacterKoed` timing (ST08-001: give DON!! to the Leader on any Character K.O.).
 *
 * Synthetic cards + generic assignments — the capability, not a card number.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram, fireOnBattle, fireCharacterKoedReactions } from '../../../engine/effects';
import { isKoImmune } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putDon } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import type { BattleState, GameState } from '../../../engine/state/game';

describe('family: battle K.O. immunity filtered by attacker category (ST08-002 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-UTA',
    templateId: 'ability',
    params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', attackerCategory: 'leader' }] },
  };
  const UTA = makeCharacterDef({ cardDefinitionId: 'SYN-UTA', cardNumber: 'SYN-UTA', category: 'character', baseCost: 3, basePower: 4000 });
  const ATTACKER_CHAR = makeCharacterDef({ cardDefinitionId: 'SYN-ATT', cardNumber: 'SYN-ATT', category: 'character', baseCost: 4, basePower: 6000 });

  function withImmunityAndAttacker(attackerIsLeader: boolean) {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 4 });
    let utaId: string;
    ({ rig, instanceId: utaId } = putCharacterInPlay(rig, 'p1', UTA));
    let attackerId: string;
    if (attackerIsLeader) {
      attackerId = rig.state.players.p2.leaderInstanceId;
    } else {
      ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p2', ATTACKER_CHAR));
    }
    let state = runTimings(registry['SYN-UTA'], ['onEnterPlay'], rig.state, utaId, rig.defs, null, registry).state;
    const battle: BattleState = { attackerInstanceId: attackerId, targetInstanceId: utaId, originalTargetInstanceId: utaId, step: 'damage', blockerUsed: false, battlePowerBonuses: {} };
    state = { ...state, currentBattle: battle };
    return { state, defs: rig.defs, utaId };
  }

  it('is immune to a Leader attacker but NOT to a Character attacker', () => {
    const vsLeader = withImmunityAndAttacker(true);
    expect(isKoImmune(vsLeader.defs, vsLeader.state, vsLeader.utaId, 'battle')).toBe(true);

    const vsChar = withImmunityAndAttacker(false);
    expect(isKoImmune(vsChar.defs, vsChar.state, vsChar.utaId, 'battle')).toBe(false);
  });
});

describe('family: battleOpponent K.O. exchange (ST08-013 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-MR2',
    templateId: 'ability',
    params: { timing: 'onBattle', condition: { donAttachedAtLeast: 1 }, functions: [{ fn: 'koBattleOpponent' }, { fn: 'koSelf', ifPrevious: 'previousMovedAny' }] },
  };
  const MR2 = makeCharacterDef({ cardDefinitionId: 'SYN-MR2', cardNumber: 'SYN-MR2', category: 'character', baseCost: 4, basePower: 5000 });
  const FOE = makeCharacterDef({ cardDefinitionId: 'SYN-FOE', cardNumber: 'SYN-FOE', category: 'character', baseCost: 4, basePower: 5000 });

  function setup() {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let mr2Id: string;
    let foeId: string;
    ({ rig, instanceId: mr2Id } = putCharacterInPlay(rig, 'p1', MR2, { orientation: 'rested', donAttached: ['d1'] }));
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', FOE));
    const battle: BattleState = { attackerInstanceId: mr2Id, targetInstanceId: foeId, originalTargetInstanceId: foeId, step: 'damage', blockerUsed: false, battlePowerBonuses: {} };
    const state: GameState = { ...rig.state, currentBattle: battle };
    const fired = fireOnBattle(state, mr2Id, registry, rig.defs, null);
    return { registry, defs: rig.defs, fired, mr2Id, foeId };
  }

  it('K.O.s the battled Character AND then this Character when the player accepts', () => {
    const { registry, defs, fired, mr2Id, foeId } = setup();
    const choice = fired.state.pendingChoices[0];
    expect(choice.constraints.candidateInstanceIds).toEqual([foeId]);
    const resolved = resumeProgram(registry['SYN-MR2'], fired.state, choice, [foeId], defs, null, registry);
    expect(resolved.state.cardsById[foeId].currentZone).toBe('trash');
    expect(resolved.state.cardsById[mr2Id].currentZone).toBe('trash');
  });

  it('declining K.O.s neither (the "if you do" self-K.O. does not fire)', () => {
    const { registry, defs, fired, mr2Id, foeId } = setup();
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['SYN-MR2'], fired.state, choice, [], defs, null, registry);
    expect(resolved.state.cardsById[foeId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[mr2Id].currentZone).toBe('characterArea');
  });
});

describe('family: reactive onCharacterKoed (ST08-001 shape)', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-KO-LEADER',
    templateId: 'ability',
    params: { timing: 'onCharacterKoed', condition: { turn: 'your' }, functions: [{ fn: 'giveDonControllerLeader', count: 1 }] },
  };
  const VICTIM = makeCharacterDef({ cardDefinitionId: 'SYN-VICTIM', cardNumber: 'SYN-VICTIM', category: 'character', baseCost: 2, basePower: 2000 });

  it('gives a rested DON!! to the Leader when a Character is K.O.d during the owner turn', () => {
    const registry = buildRegistryFromAssignments([assignment]);
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, leaderOverridesP1: { cardDefinitionId: 'SYN-KO-LEADER' } });
    let victimId: string;
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', VICTIM));
    rig = putDon(rig, 'p1', 1, { rested: true }).rig;
    const leaderId = rig.state.players.p1.leaderInstanceId;

    const before = rig.state;
    // Simulate the victim being K.O.'d this action (moved to trash).
    const after: GameState = {
      ...before,
      players: { ...before.players, p2: { ...before.players.p2, characterArea: { ...before.players.p2.characterArea, cardIds: [] }, trash: { ...before.players.p2.trash, cardIds: [victimId] } } },
      cardsById: { ...before.cardsById, [victimId]: { ...before.cardsById[victimId], currentZone: 'trash' } },
    };

    const result = fireCharacterKoedReactions(before, after, registry, rig.defs, null);
    expect(result.state.cardsById[leaderId].donAttached).toHaveLength(1);
  });
});
