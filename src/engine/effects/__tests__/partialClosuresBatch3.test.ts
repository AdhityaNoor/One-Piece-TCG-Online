import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../../../cards/effectTemplates/assembler';
import { resumeProgram, runTimings } from '../interpreter';
import { computeCurrentPower } from '../../rules/shared/power';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  putCharacterInPlay,
  putInHand,
  putDon,
  putLifeCards,
} from '../../rules/shared/__tests__/testRig';
import { fireOpponentEventActivatedReactions, fireOpponentBlockerActivatedReactions } from '../fireTiming';

describe('OP12-036 cannotBePlayedByEffects', () => {
  it('blocks effect play-from-hand while allowing the static flag on the program', () => {
    const zoro: CardEffectAssignment = {
      cardNumber: 'SYN-ZORO',
      templates: [
        { templateId: 'staticFlags', params: { cannotBePlayedByEffects: true } },
        { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'addPowerSelf', amount: 1000, duration: 'permanent' }] } },
      ],
    };
    const tutor: CardEffectAssignment = {
      cardNumber: 'SYN-TUTOR',
      templateId: 'ability',
      params: { timing: 'onPlay', functions: [{ fn: 'playFromHand', filter: { category: 'character', name: 'Roronoa Zoro' } }] },
    };
    const registry = buildRegistryFromAssignments([zoro, tutor]);
    expect(registry['SYN-ZORO'].cannotBePlayedByEffects).toBe(true);

    const zoroDef = makeCharacterDef({ cardDefinitionId: 'SYN-ZORO', cardNumber: 'SYN-ZORO', name: 'Roronoa Zoro', baseCost: 4 });
    const tutorDef = makeCharacterDef({ cardDefinitionId: 'SYN-TUTOR', cardNumber: 'SYN-TUTOR', baseCost: 2 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let tutorId: string;
    ({ rig, instanceId: tutorId } = putCharacterInPlay(rig, 'p1', tutorDef));
    const hand = putInHand(rig, 'p1', zoroDef);
    const defs = { ...hand.rig.defs, [zoroDef.cardDefinitionId]: zoroDef, [tutorDef.cardDefinitionId]: tutorDef };

    const fired = runTimings(registry['SYN-TUTOR'], ['onPlay'], hand.rig.state, tutorId, defs, null, registry);
    expect(fired.pendingChoices.length).toBeGreaterThan(0);
    const resolved = resumeProgram(registry['SYN-TUTOR'], fired.state, fired.pendingChoices[0], [hand.instanceId], defs, null, registry);
    expect(resolved.state.cardsById[hand.instanceId]?.currentZone).toBe('hand');
    expect(resolved.state.players.p1.characterArea.cardIds.every((id) => resolved.state.cardsById[id]?.cardDefinitionId !== 'SYN-ZORO')).toBe(true);
  });
});

describe('OP15-008 targetDonAttached scale', () => {
  it('applies −1000 per DON!! on each opponent Character when activated the turn it was played', () => {
    const krieg: CardEffectAssignment = {
      cardNumber: 'SYN-KRIEG',
      templates: [
        { templateId: 'ability', params: { timing: 'onPlay', functions: [{ fn: 'addKeyword', target: { ref: 'self' }, keyword: 'rush', duration: 'duringThisTurn' }] } },
        { templateId: 'ability', params: { timing: 'activateMain', oncePerTurn: true, gate: [{ kind: 'selfPlayedThisTurn' }], functions: [{ fn: 'addPowerAuraOpponentCharacters', amount: 0, duration: 'duringThisTurn', scale: { per: 'targetDonAttached', step: 1, amountPer: -1000 } }] } },
      ],
    };
    const registry = buildRegistryFromAssignments([krieg]);
    const kriegDef = makeCharacterDef({ cardDefinitionId: 'SYN-KRIEG', cardNumber: 'SYN-KRIEG', baseCost: 5, basePower: 6000 });
    const foeDef = makeCharacterDef({ cardDefinitionId: 'FOE', cardNumber: 'FOE', baseCost: 4, basePower: 5000 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    const don = putDon(rig, 'p2', 2);
    let kriegId: string;
    let foeId: string;
    ({ rig, instanceId: kriegId } = putCharacterInPlay(don.rig, 'p1', kriegDef));
    ({ rig, instanceId: foeId } = putCharacterInPlay(rig, 'p2', foeDef, { donAttached: don.donIds }));
    // Mark Krieg as played this turn.
    const state = {
      ...rig.state,
      cardsById: {
        ...rig.state.cardsById,
        [kriegId]: { ...rig.state.cardsById[kriegId], enteredPlayTurn: rig.state.turnNumber },
      },
    };
    const defs = { ...rig.defs, [kriegDef.cardDefinitionId]: kriegDef, [foeDef.cardDefinitionId]: foeDef };

    expect(computeCurrentPower(defs, state, foeId)).toBe(5000);
    const after = runTimings(registry['SYN-KRIEG'], ['activateMain'], state, kriegId, defs, null, registry).state;
    expect(computeCurrentPower(defs, after, foeId)).toBe(3000);
  });
});

describe('OP15-119 revealTopLifeAddPowerPerCost', () => {
  it('gains +1000 × revealed Life cost when opponent activates an Event', () => {
    const luffy: CardEffectAssignment = {
      cardNumber: 'SYN-GEAR5',
      templateId: 'ability',
      params: { timing: 'onOpponentEventActivated', functions: [{ fn: 'revealTopLifeAddPowerPerCost', amountPer: 1000, duration: 'duringThisTurn' }] },
    };
    const registry = buildRegistryFromAssignments([luffy]);
    const luffyDef = makeCharacterDef({ cardDefinitionId: 'SYN-GEAR5', cardNumber: 'SYN-GEAR5', baseCost: 10, basePower: 10000 });
    const lifeDef = makeCharacterDef({ cardDefinitionId: 'LIFE-COST3', cardNumber: 'LIFE-COST3', baseCost: 3 });
    const eventDef = makeEventDef({ cardDefinitionId: 'OPP-EVENT', cardNumber: 'OPP-EVENT' });

    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 3 });
    ({ rig } = putLifeCards(rig, 'p1', [lifeDef]));
    let luffyId: string;
    ({ rig, instanceId: luffyId } = putCharacterInPlay(rig, 'p1', luffyDef));
    const defs = { ...rig.defs, [luffyDef.cardDefinitionId]: luffyDef, [lifeDef.cardDefinitionId]: lifeDef, [eventDef.cardDefinitionId]: eventDef };

    const before = computeCurrentPower(defs, rig.state, luffyId);
    const reacted = fireOpponentEventActivatedReactions(rig.state, 'p2', registry, defs, 'evt');
    expect(computeCurrentPower(defs, reacted.state, luffyId)).toBe(before + 3000);
  });

  it('also fires on opponent Blocker activation', () => {
    const luffy: CardEffectAssignment = {
      cardNumber: 'SYN-GEAR5B',
      templateId: 'ability',
      params: { timing: 'onOpponentBlockerActivated', functions: [{ fn: 'revealTopLifeAddPowerPerCost', amountPer: 1000, duration: 'duringThisTurn' }] },
    };
    const registry = buildRegistryFromAssignments([luffy]);
    const luffyDef = makeCharacterDef({ cardDefinitionId: 'SYN-GEAR5B', cardNumber: 'SYN-GEAR5B', baseCost: 10, basePower: 10000 });
    const lifeDef = makeCharacterDef({ cardDefinitionId: 'LIFE-COST2', cardNumber: 'LIFE-COST2', baseCost: 2 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    ({ rig } = putLifeCards(rig, 'p1', [lifeDef]));
    let luffyId: string;
    ({ rig, instanceId: luffyId } = putCharacterInPlay(rig, 'p1', luffyDef));
    const defs = { ...rig.defs, [luffyDef.cardDefinitionId]: luffyDef, [lifeDef.cardDefinitionId]: lifeDef };

    const before = computeCurrentPower(defs, rig.state, luffyId);
    const reacted = fireOpponentBlockerActivatedReactions(rig.state, 'p1', registry, defs, 'blk');
    expect(computeCurrentPower(defs, reacted.state, luffyId)).toBe(before + 2000);
  });
});
