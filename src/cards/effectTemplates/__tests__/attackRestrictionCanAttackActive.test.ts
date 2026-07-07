import { describe, expect, it } from 'vitest';
import type { DeclareAttackAction } from '../../../engine/actions/action';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { validateDeclareAttack } from '../../../engine/rules/battle/declareAttack';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putDon, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP01_ASSIGNMENTS } from '../assignments/OP01';
import { OP02_ASSIGNMENTS } from '../assignments/OP02';
import { OP04_ASSIGNMENTS } from '../assignments/OP04';
import { OP06_ASSIGNMENTS } from '../assignments/OP06';
import { OP11_ASSIGNMENTS } from '../assignments/OP11';
import { EB_ASSIGNMENTS } from '../assignments/EB';

const registry = buildRegistryFromAssignments([
  ...OP01_ASSIGNMENTS,
  ...OP02_ASSIGNMENTS,
  ...OP04_ASSIGNMENTS,
  ...OP06_ASSIGNMENTS,
  ...OP11_ASSIGNMENTS,
  ...EB_ASSIGNMENTS,
]);

const ACTIVE_FOE = makeCharacterDef({ cardDefinitionId: 'SYN-ACTIVE-FOE', cardNumber: 'SYN-ACTIVE-FOE', baseCost: 4, basePower: 5000 });
const PAGE_ONE = makeCharacterDef({ cardDefinitionId: 'OP01-112', cardNumber: 'OP01-112', baseCost: 4, basePower: 5000 });
const WHITEY_BAY = makeCharacterDef({ cardDefinitionId: 'OP02-014', cardNumber: 'OP02-014', baseCost: 4, basePower: 5000 });
const GYATS = makeCharacterDef({ cardDefinitionId: 'OP04-080', cardNumber: 'OP04-080', baseCost: 2, basePower: 3000 });
const DRESSROSA_ATTACKER = makeCharacterDef({ cardDefinitionId: 'SYN-DRESSROSA', cardNumber: 'SYN-DRESSROSA', types: ['Dressrosa'], baseCost: 4, basePower: 5000 });
const CAVENDISH = makeCharacterDef({ cardDefinitionId: 'OP04-081', cardNumber: 'OP04-081', baseCost: 4, basePower: 5000 });
const LUFFY = makeCharacterDef({ cardDefinitionId: 'OP04-090', cardNumber: 'OP04-090', baseCost: 7, basePower: 7000 });
const NEKOMAMUSHI = makeCharacterDef({ cardDefinitionId: 'OP06-110', cardNumber: 'OP06-110', baseCost: 5, basePower: 6000 });
const BORSALINO = makeCharacterDef({ cardDefinitionId: 'OP11-014', cardNumber: 'OP11-014', types: ['Navy'], baseCost: 4, basePower: 5000 });
const NAVY_ATTACKER = makeCharacterDef({ cardDefinitionId: 'SYN-NAVY', cardNumber: 'SYN-NAVY', types: ['Navy'], baseCost: 4, basePower: 5000 });
const ARAMAKI = makeCharacterDef({ cardDefinitionId: 'OP11-082', cardNumber: 'OP11-082', types: ['Navy'], baseCost: 3, basePower: 4000 });
const KUZAN = makeCharacterDef({ cardDefinitionId: 'OP11-084', cardNumber: 'OP11-084', types: ['Navy'], baseCost: 4, basePower: 5000 });
const KOBY = makeCharacterDef({ cardDefinitionId: 'OP11-119', cardNumber: 'OP11-119', baseCost: 3, basePower: 4000 });
const GENERIC_ATTACKER = makeCharacterDef({ cardDefinitionId: 'SYN-GENERIC', cardNumber: 'SYN-GENERIC', baseCost: 4, basePower: 5000 });
const HIBARI = makeCharacterDef({ cardDefinitionId: 'EB03-008', cardNumber: 'EB03-008', types: ['SWORD'], baseCost: 2, basePower: 3000 });
const SWORD_ATTACKER = makeCharacterDef({ cardDefinitionId: 'SYN-SWORD', cardNumber: 'SYN-SWORD', types: ['SWORD'], baseCost: 4, basePower: 5000 });
const WHIP_EVENT = makeEventDef({ cardDefinitionId: 'EB04-050', cardNumber: 'EB04-050', types: ['SWORD'] });

function declareAttack(playerId: string, attackerInstanceId: string, targetInstanceId: string): DeclareAttackAction {
  return { type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId, attackerInstanceId, targetInstanceId };
}

function expectCannotAttackActive(state: ReturnType<typeof buildBaseRig>['state'], defs: ReturnType<typeof buildBaseRig>['defs'], attackerId: string, foeId: string): void {
  expect(validateDeclareAttack(state, declareAttack('p1', attackerId, foeId), defs).legal).toBe(false);
}

function expectCanAttackActive(state: ReturnType<typeof buildBaseRig>['state'], defs: ReturnType<typeof buildBaseRig>['defs'], attackerId: string, foeId: string): void {
  expect(validateDeclareAttack(state, declareAttack('p1', attackerId, foeId), defs).legal).toBe(true);
}

describe('canAttackActive curated assignments', () => {
  it('OP01-112 grants Page One canAttackActive during this turn', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let donIds: string[];
    ({ rig, donIds } = putDon(rig, 'p1', 1));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', PAGE_ONE));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    expectCannotAttackActive(rig.state, rig.defs, attackerId, foeId);
    // The DON!! −1 cost suspends on a "choose which DON!! to return" choice; resume it to pay.
    const fired = runTimings(registry['OP01-112'], ['activateMain'], rig.state, attackerId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['OP01-112'], fired.state, fired.state.pendingChoices[0], [donIds[0]], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('OP02-014 grants Whitey Bay canAttackActive while a DON!! is attached', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', WHITEY_BAY, { donAttached: ['don-1'] }));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const applied = runTimings(registry['OP02-014'], ['onEnterPlay'], rig.state, attackerId, rig.defs, null, registry);
    expectCanAttackActive(applied.state, rig.defs, attackerId, foeId);
  });

  it('OP04-080 grants a chosen Dressrosa Character canAttackActive on play', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', GYATS));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', DRESSROSA_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const fired = runTimings(registry['OP04-080'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['OP04-080'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('OP04-081 grants Cavendish canAttackActive while a DON!! is attached', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', CAVENDISH, { donAttached: ['don-1'] }));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const applied = runTimings(registry['OP04-081'], ['onEnterPlay'], rig.state, attackerId, rig.defs, null, registry);
    expectCanAttackActive(applied.state, rig.defs, attackerId, foeId);
  });

  it('OP04-090 always grants Monkey.D.Luffy canAttackActive', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', LUFFY));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const applied = runTimings(registry['OP04-090'], ['onEnterPlay'], rig.state, attackerId, rig.defs, null, registry);
    expectCanAttackActive(applied.state, rig.defs, attackerId, foeId);
  });

  it('OP06-110 grants Nekomamushi canAttackActive while two DON!! are attached', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', NEKOMAMUSHI, { donAttached: ['don-1', 'don-2'] }));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const applied = runTimings(registry['OP06-110'], ['onEnterPlay'], rig.state, attackerId, rig.defs, null, registry);
    expectCanAttackActive(applied.state, rig.defs, attackerId, foeId);
  });

  it('OP11-014 grants a chosen Navy attacker canAttackActive', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', BORSALINO));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', NAVY_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const fired = runTimings(registry['OP11-014'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['OP11-014'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('OP11-082 grants a chosen Navy Character canAttackActive', () => {
    // Aramaki gates on "If your Leader has the {Navy} type", so p1's Leader must be Navy.
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', leaderOverridesP1: { types: ['Navy'] } });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', ARAMAKI));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', NAVY_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const fired = runTimings(registry['OP11-082'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['OP11-082'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('OP11-084 grants a chosen Navy attacker canAttackActive when Kuzan attacks', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', KUZAN));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', NAVY_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const fired = runTimings(registry['OP11-084'], ['whenAttacking'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['OP11-084'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('OP11-119 grants a chosen Character canAttackActive on play', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', KOBY));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', GENERIC_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const fired = runTimings(registry['OP11-119'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['OP11-119'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('EB03-008 grants a chosen SWORD attacker canAttackActive on play', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', HIBARI));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', SWORD_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    const fired = runTimings(registry['EB03-008'], ['onPlay'], rig.state, sourceId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['EB03-008'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });

  it('EB04-050 grants a chosen SWORD attacker canAttackActive from the main effect', () => {
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main' });
    let eventId: string;
    ({ rig, instanceId: eventId } = putInHand(rig, 'p1', WHIP_EVENT));
    let attackerId: string;
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', SWORD_ATTACKER));
    let foeId: string;
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', ACTIVE_FOE, { orientation: 'active' }));

    expectCannotAttackActive(rig.state, rig.defs, attackerId, foeId);
    const fired = runTimings(registry['EB04-050'], ['activateMain'], rig.state, eventId, rig.defs, null, registry);
    const resolved = resumeProgram(registry['EB04-050'], fired.state, fired.state.pendingChoices[0], [attackerId], rig.defs, null, registry);
    expectCanAttackActive(resolved.state, rig.defs, attackerId, foeId);
  });
});
