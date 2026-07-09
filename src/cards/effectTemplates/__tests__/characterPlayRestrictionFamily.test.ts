import { describe, expect, it } from 'vitest';
import { validatePlayCharacter } from '../../../engine/actions/handlers/playCharacter';
import { validatePlayStage } from '../../../engine/actions/handlers/playStage';
import { runTimings } from '../../../engine/effects/interpreter';
import { isControllerCharacterPlayPrevented } from '../../../engine/rules/shared/characterPlayRestriction';
import { isControllerHandPlayPrevented } from '../../../engine/rules/shared/handPlayRestriction';
import { isControllerCharacterSetActiveDonPrevented } from '../../../engine/rules/shared/characterSetActiveDonRestriction';
import { isKoImmune } from '../../../engine/rules/shared/power';
import {
  buildBaseRig,
  makeCharacterDef,
  makeStageDef,
  nextTestId,
  putCharacterInPlay,
  putDon,
  putInHand,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { EB_ASSIGNMENTS } from '../assignments/EB';
import { OP12_ASSIGNMENTS } from '../assignments/OP12';
import { OP13_ASSIGNMENTS } from '../assignments/OP13';
import { OP14_ASSIGNMENTS } from '../assignments/OP14';

describe('preventControllerCharacterPlay family', () => {
  const allRestriction: CardEffectAssignment = {
    cardNumber: 'SYN-PREVENT-CHAR-ALL',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn' }],
    },
  };

  const minCost7: CardEffectAssignment = {
    cardNumber: 'SYN-PREVENT-CHAR-7',
    templateId: 'ability',
    params: {
      timing: 'onPlay',
      functions: [{ fn: 'preventControllerCharacterPlay', duration: 'duringThisTurn', minBaseCost: 7 }],
    },
  };

  it('blocks all Character plays while active', () => {
    const registry = buildRegistryFromAssignments([allRestriction]);
    const src = makeCharacterDef({ cardDefinitionId: 'SYN-PREVENT-CHAR-ALL', cardNumber: 'SYN-PREVENT-CHAR-ALL', baseCost: 2 });
    const handChar = makeCharacterDef({ cardDefinitionId: nextTestId('hand'), cardNumber: 'HAND-1', baseCost: 3 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', src));
    const hand = putInHand(rig, 'p1', handChar);
    rig = hand.rig;

    const fired = runTimings(registry['SYN-PREVENT-CHAR-ALL'], ['onPlay'], rig.state, srcId, rig.defs, null, registry);
    expect(isControllerCharacterPlayPrevented(fired.state, 'p1', rig.defs, handChar.cardDefinitionId)).toBe(true);

    const firedRig = { state: fired.state, defs: rig.defs };
    const { rig: withDon, donIds } = putDon(firedRig, 'p1', 3);
    const validation = validatePlayCharacter(
      withDon.state,
      { type: 'PLAY_CHARACTER', actionId: 'a1', playerId: 'p1', handCardInstanceId: hand.instanceId, donInstanceIds: donIds },
      withDon.defs,
    );
    expect(validation.legal).toBe(false);
  });

  it('minBaseCost 7 blocks only high-cost Characters', () => {
    const registry = buildRegistryFromAssignments([minCost7]);
    const src = makeCharacterDef({ cardDefinitionId: 'SYN-PREVENT-CHAR-7', cardNumber: 'SYN-PREVENT-CHAR-7', baseCost: 2 });
    const low = makeCharacterDef({ cardDefinitionId: nextTestId('low'), cardNumber: 'LOW-1', baseCost: 6 });
    const high = makeCharacterDef({ cardDefinitionId: nextTestId('high'), cardNumber: 'HIGH-1', baseCost: 7 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const defs = { ...rig.defs, [low.cardDefinitionId]: low, [high.cardDefinitionId]: high };
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', src));

    const fired = runTimings(registry['SYN-PREVENT-CHAR-7'], ['onPlay'], rig.state, srcId, defs, null, registry);
    expect(isControllerCharacterPlayPrevented(fired.state, 'p1', defs, low.cardDefinitionId)).toBe(false);
    expect(isControllerCharacterPlayPrevented(fired.state, 'p1', defs, high.cardDefinitionId)).toBe(true);
  });

  it('EB03-024 compiles playFromHand then preventControllerCharacterPlay', () => {
    const entry = EB_ASSIGNMENTS.find((a) => a.cardNumber === 'EB03-024')!;
    const registry = buildRegistryFromAssignments([entry]);
    const onPlay = registry['EB03-024'].abilities.find((a) => a.timing === 'onPlay');
    expect(onPlay?.ops.some((op) => op.op === 'playFromHand')).toBe(true);
    expect(onPlay?.ops.some((op) => op.op === 'preventControllerCharacterPlay')).toBe(true);
  });

  it('OP12-030 compiles setActiveControllerDon + minBaseCost 7 restriction', () => {
    const entry = OP12_ASSIGNMENTS.find((a) => a.cardNumber === 'OP12-030')!;
    const registry = buildRegistryFromAssignments([entry]);
    const onPlay = registry['OP12-030'].abilities[0];
    expect(onPlay.ops.some((op) => op.op === 'chooseTargets' && op.from.sel === 'controllerRestedDon')).toBe(true);
    const restrict = onPlay.ops.find((op) => op.op === 'preventControllerCharacterPlay');
    expect(restrict).toMatchObject({ minBaseCost: 7, duration: 'duringThisTurn' });
  });

  it('OP14-024 compiles onPlay restriction and onKO rest', () => {
    const entry = OP14_ASSIGNMENTS.find((a) => a.cardNumber === 'OP14-024')!;
    const registry = buildRegistryFromAssignments([entry]);
    const onPlay = registry['OP14-024'].abilities.find((a) => a.timing === 'onPlay');
    const onKo = registry['OP14-024'].abilities.find((a) => a.timing === 'onKO');
    expect(onPlay?.ops.some((op) => op.op === 'preventControllerCharacterPlay')).toBe(true);
    expect(onKo?.ops.some((op) => op.op === 'rest')).toBe(true);
  });

  it('preventControllerHandPlay blocks Character and Stage plays from hand', () => {
    const assignment: CardEffectAssignment = {
      cardNumber: 'SYN-PREVENT-HAND',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'preventControllerHandPlay', duration: 'duringThisTurn' }] },
    };
    const registry = buildRegistryFromAssignments([assignment]);
    const src = makeCharacterDef({ cardDefinitionId: 'SYN-PREVENT-HAND', cardNumber: 'SYN-PREVENT-HAND', baseCost: 2 });
    const handChar = makeCharacterDef({ cardDefinitionId: nextTestId('hand-char'), cardNumber: 'HAND-CHAR', baseCost: 3 });
    const handStage = makeStageDef({ cardDefinitionId: nextTestId('hand-stage'), cardNumber: 'HAND-STAGE', baseCost: 2 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let srcId: string;
    ({ rig, instanceId: srcId } = putCharacterInPlay(rig, 'p1', src));
    const charHand = putInHand(rig, 'p1', handChar);
    rig = charHand.rig;
    const stageHand = putInHand(rig, 'p1', handStage);
    rig = stageHand.rig;
    const defs = { ...rig.defs, [handChar.cardDefinitionId]: handChar, [handStage.cardDefinitionId]: handStage };

    const fired = runTimings(registry['SYN-PREVENT-HAND'], ['onPlay'], rig.state, srcId, defs, null, registry);
    expect(isControllerHandPlayPrevented(fired.state, 'p1')).toBe(true);

    const firedRig = { state: fired.state, defs };
    const { rig: withDon, donIds } = putDon(firedRig, 'p1', 3);
    expect(validatePlayCharacter(
      withDon.state,
      { type: 'PLAY_CHARACTER', actionId: 'a1', playerId: 'p1', handCardInstanceId: charHand.instanceId, donInstanceIds: donIds },
      withDon.defs,
    ).legal).toBe(false);
    expect(validatePlayStage(
      withDon.state,
      { type: 'PLAY_STAGE', actionId: 'a2', playerId: 'p1', handCardInstanceId: stageHand.instanceId, donInstanceIds: donIds.slice(0, 2) },
      withDon.defs,
    ).legal).toBe(false);
  });

  it('OP13-028 compiles setActiveControllerDon + preventControllerHandPlay', () => {
    const entry = OP13_ASSIGNMENTS.find((a) => a.cardNumber === 'OP13-028')!;
    const program = buildRegistryFromAssignments([entry])['OP13-028'];
    expect(program.abilities[0].ops.some((op) => op.op === 'preventControllerHandPlay')).toBe(true);
  });

  it('OP12-024 active-only opponent-effect KO immunity', () => {
    const def = makeCharacterDef({ cardDefinitionId: 'OP12-024', cardNumber: 'OP12-024', baseCost: 4 });
    const koSource = makeCharacterDef({ cardDefinitionId: 'KO-SRC', cardNumber: 'KO-SRC' });
    let rig = buildBaseRig();
    const { rig: r1, instanceId } = putCharacterInPlay(rig, 'p1', def, { orientation: 'active' });
    const { rig: r2, instanceId: koId } = putCharacterInPlay(r1, 'p2', koSource);
    const defs = { ...r2.defs, [def.cardDefinitionId]: def, [koSource.cardDefinitionId]: koSource };
    const activeState = {
      ...r2.state,
      continuousEffects: [{
        id: 'ce-op12-024',
        sourceInstanceId: instanceId,
        ownerId: 'p1',
        duration: 'permanent' as const,
        description: 'cannot be KOed by opponent effects while active',
        koImmunityModifier: {
          appliesToInstanceId: instanceId,
          scope: 'effect' as const,
          condition: { rested: false },
          effectSourceController: 'opponent' as const,
        },
      }],
    };
    const restedState = {
      ...activeState,
      cardsById: { ...activeState.cardsById, [instanceId]: { ...activeState.cardsById[instanceId]!, orientation: 'rested' as const } },
    };
    expect(isKoImmune(defs, activeState, instanceId, 'effect', { koSourceInstanceId: koId })).toBe(true);
    expect(isKoImmune(defs, restedState, instanceId, 'effect', { koSourceInstanceId: koId })).toBe(false);
  });
});
