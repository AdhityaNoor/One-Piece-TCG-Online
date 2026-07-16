import { describe, expect, it } from 'vitest';
import { applyTemplate } from '../catalog/factories';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, makeEventDef, makeStageDef, putCharacterInPlay, putInHand, putLifeCards, putStageInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { findKoReplacementRecord } from '../../../engine/rules/shared/koAttempt';
import type { EffectTemplateRegistry } from '../../../engine/effects/effectTemplate';

function registryFor(_program: ReturnType<typeof applyTemplate>): EffectTemplateRegistry {
  return { 'def-1': _program };
}

describe('K.O. replacement runtime', () => {
  it('registers a trash-from-hand replacement on enter play', () => {
    const program = applyTemplate('OP15-014', 'ability', {
      timing: 'onEnterPlay',
      functions: [{ fn: 'registerKoReplacementSelf', trashFromHand: { count: 1, filter: { category: 'event' } }, duration: 'permanent' }],
    });
    const charDef = makeCharacterDef({ cardNumber: 'OP15-014' });
    const base = buildBaseRig();
    const { rig, instanceId } = putCharacterInPlay(base, 'p1', charDef);
    const reg = { [charDef.cardDefinitionId]: program };
    rig.defs[charDef.cardDefinitionId] = charDef;

    const fired = runTimings(program, ['onEnterPlay', 'onPlay'], rig.state, instanceId, rig.defs, null, reg);
    expect(fired.state.continuousEffects.some((ce) => ce.koReplacementModifier?.appliesToInstanceId === instanceId)).toBe(true);

    const eventDef = makeEventDef({ cardNumber: 'EVT-1' });
    const withHand = putInHand({ state: fired.state, defs: { ...rig.defs, [eventDef.cardDefinitionId]: eventDef } }, 'p1', eventDef);
    expect(findKoReplacementRecord(withHand.rig.state, instanceId, 'effect', withHand.rig.defs)).not.toBeNull();
  });

  it('OP15-014 onPlay offers to activate a Dressrosa Event from hand', () => {
    const program = applyTemplate('OP15-014', 'ability', {
      timing: 'onPlay',
      functions: [{
        fn: 'activateEventFromHand',
        filter: { category: 'event', typeIncludes: 'Dressrosa', maxCost: 3 },
        maxTargets: 1,
      }],
    });
    const charDef = makeCharacterDef({ cardNumber: 'OP15-014' });
    const eventDef = makeEventDef({ cardNumber: 'EVT-DRESS', types: ['Dressrosa'], baseCost: 3 });
    let rig = buildBaseRig();
    const { rig: withHand } = putInHand({ state: rig.state, defs: { ...rig.defs, [eventDef.cardDefinitionId]: eventDef } }, 'p1', eventDef);
    rig = withHand;
    const { rig: withChar, instanceId } = putCharacterInPlay(rig, 'p1', charDef);
    rig = withChar;
    rig.defs[charDef.cardDefinitionId] = charDef;

    const fired = runTimings(program, ['onPlay'], rig.state, instanceId, rig.defs, null, { [charDef.cardDefinitionId]: program });
    expect(fired.pendingChoices).toHaveLength(1);
    expect(fired.pendingChoices[0]?.prompt).toContain('Event');
  });

  it('offers replacement instead of effect K.O. when eligible hand card exists', () => {
    const targetDef = makeCharacterDef({ cardNumber: 'OP15-014', name: 'Bartolomeo' });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const replacementProgram = applyTemplate('OP15-014', 'ability', {
      timing: 'onEnterPlay',
      functions: [{ fn: 'registerKoReplacementSelf', trashFromHand: { count: 1, filter: { category: 'event' } }, duration: 'permanent' }],
    });
    const eventDef = makeEventDef({ cardNumber: 'EVT-1', name: 'Event Card', baseCost: 1 });

    let rig = buildBaseRig();
    const { rig: withTarget, instanceId: targetId } = putCharacterInPlay(rig, 'p1', targetDef);
    rig = withTarget;
    rig.defs[targetDef.cardDefinitionId] = targetDef;
    rig.defs[eventDef.cardDefinitionId] = eventDef;

    const registered = runTimings(replacementProgram, ['onEnterPlay'], rig.state, targetId, rig.defs, null, { [targetDef.cardDefinitionId]: replacementProgram });
    rig = { ...rig, state: registered.state };

    const hand = putInHand(rig, 'p1', eventDef);
    rig = hand.rig;

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const { rig: withKo, instanceId: koSourceId } = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = withKo;
    rig.defs[koSourceDef.cardDefinitionId] = koSourceDef;

    const reg: EffectTemplateRegistry = {
      [targetDef.cardDefinitionId]: replacementProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSourceId, rig.defs, null, reg);
    expect(koFired.pendingChoices).toHaveLength(1);
    expect(koFired.pendingChoices[0].sourceEffectId).toBe('ir');

    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [targetId], rig.defs, null, reg);
    expect(afterTarget.pendingChoices).toHaveLength(1);
    expect(afterTarget.pendingChoices[0].sourceEffectId).toBe('ir');
    expect(afterTarget.state.cardsById[targetId].currentZone).toBe('characterArea');

    const payChoice = resumeProgram(koProgram, afterTarget.state, afterTarget.pendingChoices[0], true, rig.defs, null, reg);
    expect(payChoice.pendingChoices).toHaveLength(1);
    expect(payChoice.pendingChoices[0].kind).toBe('SELECT_CARDS');

    const resolved = resumeProgram(koProgram, payChoice.state, payChoice.pendingChoices[0], [hand.instanceId], rig.defs, null, reg);
    expect(resolved.state.cardsById[targetId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[hand.instanceId].currentZone).toBe('trash');
  });

  it('offers aura replacement and trashes source instead of ally', () => {
    const auraDef = makeCharacterDef({ cardNumber: 'OP13-008', name: 'Emporio.Ivankov' });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', name: 'Sabo', types: ['Revolutionary Army'] });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const auraProgram = applyTemplate('OP13-008', 'ability', {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Revolutionary Army'],
        trashSource: true,
        duration: 'permanent',
      }],
    });

    let rig = buildBaseRig();
    const aura = putCharacterInPlay(rig, 'p1', auraDef);
    rig = { ...aura.rig, defs: { ...aura.rig.defs, [auraDef.cardDefinitionId]: auraDef, [allyDef.cardDefinitionId]: allyDef } };
    const registered = runTimings(auraProgram, ['onEnterPlay'], rig.state, aura.instanceId, rig.defs, null, { [auraDef.cardDefinitionId]: auraProgram });
    rig = { ...rig, state: registered.state };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const koSource = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = { ...koSource.rig, defs: { ...koSource.rig.defs, [koSourceDef.cardDefinitionId]: koSourceDef } };
    const reg: EffectTemplateRegistry = {
      [auraDef.cardDefinitionId]: auraProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSource.instanceId, rig.defs, null, reg);
    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [ally.instanceId], rig.defs, null, reg);
    expect(afterTarget.pendingChoices[0]?.sourceEffectId).toBe('ir');

    const resolved = resumeProgram(koProgram, afterTarget.state, afterTarget.pendingChoices[0], true, rig.defs, null, reg);
    expect(resolved.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[aura.instanceId].currentZone).toBe('trash');
  });

  it('offers aura restCharacter replacement and rests chosen character', () => {
    const luffyDef = makeCharacterDef({ cardNumber: 'OP14-034', types: ['Straw Hat Crew'] });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-1', types: ['Straw Hat Crew'] });
    const payerDef = makeCharacterDef({ cardNumber: 'PAY-1' });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const auraProgram = applyTemplate('OP14-034', 'ability', {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        oncePerTurn: true,
        anyOfTypes: ['Straw Hat Crew'],
        restCharacter: true,
        duration: 'permanent',
      }],
    });

    let rig = buildBaseRig();
    const luffy = putCharacterInPlay(rig, 'p1', luffyDef);
    rig = { ...luffy.rig, defs: { ...luffy.rig.defs, [luffyDef.cardDefinitionId]: luffyDef, [allyDef.cardDefinitionId]: allyDef, [payerDef.cardDefinitionId]: payerDef } };
    const registered = runTimings(auraProgram, ['onEnterPlay'], rig.state, luffy.instanceId, rig.defs, null, { [luffyDef.cardDefinitionId]: auraProgram });
    rig = { ...rig, state: registered.state };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const payer = putCharacterInPlay(rig, 'p1', payerDef);
    rig = payer.rig;

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const koSource = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = { ...koSource.rig, defs: { ...koSource.rig.defs, [koSourceDef.cardDefinitionId]: koSourceDef } };
    const reg: EffectTemplateRegistry = {
      [luffyDef.cardDefinitionId]: auraProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSource.instanceId, rig.defs, null, reg);
    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [ally.instanceId], rig.defs, null, reg);
    const accepted = resumeProgram(koProgram, afterTarget.state, afterTarget.pendingChoices[0], true, rig.defs, null, reg);
    expect(accepted.pendingChoices[0]?.kind).toBe('SELECT_CARDS');

    const resolved = resumeProgram(koProgram, accepted.state, accepted.pendingChoices[0], [payer.instanceId], rig.defs, null, reg);
    expect(resolved.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[payer.instanceId].orientation).toBe('rested');
  });

  it('turnTopLifeFace replacement flips top Life face-up and avoids K.O.', () => {
    const auraDef = makeCharacterDef({ cardNumber: 'ST29-008', types: ['Egghead'] });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-EGG', types: ['Egghead'], baseCost: 3 });
    const lifeDef = makeCharacterDef({ cardNumber: 'LIFE-1', baseCost: 0 });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const auraProgram = applyTemplate('ST29-008', 'ability', {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        effectSourceController: 'opponent',
        anyOfTypes: ['Egghead'],
        turnTopLifeFace: { faceUp: true },
        duration: 'permanent',
      }],
    });

    let rig = buildBaseRig();
    rig.defs[auraDef.cardDefinitionId] = auraDef;
    rig.defs[allyDef.cardDefinitionId] = allyDef;
    rig.defs[lifeDef.cardDefinitionId] = lifeDef;
    const aura = putCharacterInPlay(rig, 'p1', auraDef);
    rig = aura.rig;
    const registered = runTimings(auraProgram, ['onEnterPlay'], rig.state, aura.instanceId, rig.defs, null, { [auraDef.cardDefinitionId]: auraProgram });
    rig = { ...rig, state: registered.state };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const withLife = putLifeCards(rig, 'p1', [lifeDef]);
    rig = withLife.rig;
    const topLifeId = withLife.lifeIds[0]!;
    expect(rig.state.cardsById[topLifeId].faceState).toBe('faceDown');

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const koSource = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = { ...koSource.rig, defs: { ...koSource.rig.defs, [koSourceDef.cardDefinitionId]: koSourceDef } };
    const reg: EffectTemplateRegistry = {
      [auraDef.cardDefinitionId]: auraProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSource.instanceId, rig.defs, null, reg);
    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [ally.instanceId], rig.defs, null, reg);
    const resolved = resumeProgram(koProgram, afterTarget.state, afterTarget.pendingChoices[0], true, rig.defs, null, reg);
    expect(resolved.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[topLifeId].faceState).toBe('faceUp');
  });

  it('restLeaderOrNamed (OP04-082 pattern) offers a choice between the Leader and a named Stage, and rests the chosen one', () => {
    const kyrosDef = makeCharacterDef({ cardNumber: 'OP04-082', name: 'Kyros' });
    const coliseumDef = makeStageDef({ cardNumber: 'OP04-096', name: 'Corrida Coliseum' });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const replacementProgram = applyTemplate('OP04-082', 'ability', {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        restLeaderOrNamed: { cardName: 'Corrida Coliseum' },
        duration: 'permanent',
      }],
    });

    let rig = buildBaseRig();
    const kyros = putCharacterInPlay(rig, 'p1', kyrosDef);
    rig = { ...kyros.rig, defs: { ...kyros.rig.defs, [kyrosDef.cardDefinitionId]: kyrosDef, [coliseumDef.cardDefinitionId]: coliseumDef } };
    const registered = runTimings(replacementProgram, ['onEnterPlay'], rig.state, kyros.instanceId, rig.defs, null, { [kyrosDef.cardDefinitionId]: replacementProgram });
    rig = { ...rig, state: registered.state };
    const coliseum = putStageInPlay(rig, 'p1', coliseumDef);
    rig = coliseum.rig;

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const koSource = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = { ...koSource.rig, defs: { ...koSource.rig.defs, [koSourceDef.cardDefinitionId]: koSourceDef } };
    const reg: EffectTemplateRegistry = {
      [kyrosDef.cardDefinitionId]: replacementProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSource.instanceId, rig.defs, null, reg);
    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [kyros.instanceId], rig.defs, null, reg);
    const accepted = resumeProgram(koProgram, afterTarget.state, afterTarget.pendingChoices[0], true, rig.defs, null, reg);
    expect(accepted.pendingChoices[0]?.kind).toBe('SELECT_CARDS');
    const leaderId = rig.state.players.p1.leaderInstanceId;
    expect(accepted.pendingChoices[0]?.constraints.candidateInstanceIds).toEqual(
      expect.arrayContaining([leaderId, coliseum.instanceId]),
    );

    const resolved = resumeProgram(koProgram, accepted.state, accepted.pendingChoices[0], [coliseum.instanceId], rig.defs, null, reg);
    expect(resolved.state.cardsById[kyros.instanceId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[coliseum.instanceId].orientation).toBe('rested');
    expect(resolved.state.cardsById[leaderId].orientation).toBe('active');
  });

  it('restLeaderOrNamed (OP11-110 pattern) declines the replacement when the Leader name does not match and the named card is absent', () => {
    const fukaboshiDef = makeCharacterDef({ cardNumber: 'OP11-110', name: 'Fukaboshi' });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const replacementProgram = applyTemplate('OP11-110', 'ability', {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementSelf',
        restLeaderOrNamed: { leaderName: 'Shirahoshi', cardName: 'Fish-Man Island' },
        duration: 'permanent',
      }],
    });

    // Leader is NOT named Shirahoshi (default rig leader), and no [Fish-Man Island] Stage is in play.
    let rig = buildBaseRig();
    const fukaboshi = putCharacterInPlay(rig, 'p1', fukaboshiDef);
    rig = { ...fukaboshi.rig, defs: { ...fukaboshi.rig.defs, [fukaboshiDef.cardDefinitionId]: fukaboshiDef } };
    const registered = runTimings(replacementProgram, ['onEnterPlay'], rig.state, fukaboshi.instanceId, rig.defs, null, { [fukaboshiDef.cardDefinitionId]: replacementProgram });
    rig = { ...rig, state: registered.state };

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const koSource = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = { ...koSource.rig, defs: { ...koSource.rig.defs, [koSourceDef.cardDefinitionId]: koSourceDef } };
    const reg: EffectTemplateRegistry = {
      [fukaboshiDef.cardDefinitionId]: replacementProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSource.instanceId, rig.defs, null, reg);
    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [fukaboshi.instanceId], rig.defs, null, reg);
    // No replacement was eligible, so the K.O. resolves directly with no further pending choice.
    expect(afterTarget.pendingChoices).toHaveLength(0);
    expect(afterTarget.state.cardsById[fukaboshi.instanceId].currentZone).toBe('trash');
  });

  it('restTargetAndTrashFromHand (OP12-048 pattern) rests the endangered ally (not the aura source) and trashes 1 hand card', () => {
    const rosinanteDef = makeCharacterDef({ cardNumber: 'OP12-048', name: 'Donquixote Rosinante', types: ['Navy'], colors: ['blue'] });
    const allyDef = makeCharacterDef({ cardNumber: 'ALLY-NAVY', name: 'Navy Ally', types: ['Navy'], colors: ['blue'] });
    const handDef = makeEventDef({ cardNumber: 'EVT-1', name: 'Some Event' });
    const koProgram = applyTemplate('KO-001', 'ability', {
      timing: 'onPlay',
      functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }],
    });
    const auraProgram = applyTemplate('OP12-048', 'ability', {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'registerKoReplacementAura',
        scope: 'effect',
        anyOfTypes: ['Navy'],
        anyOfColors: ['blue'],
        restTargetAndTrashFromHand: {},
        duration: 'permanent',
      }],
    });

    let rig = buildBaseRig();
    const rosinante = putCharacterInPlay(rig, 'p1', rosinanteDef);
    rig = { ...rosinante.rig, defs: { ...rosinante.rig.defs, [rosinanteDef.cardDefinitionId]: rosinanteDef, [allyDef.cardDefinitionId]: allyDef, [handDef.cardDefinitionId]: handDef } };
    const registered = runTimings(auraProgram, ['onEnterPlay'], rig.state, rosinante.instanceId, rig.defs, null, { [rosinanteDef.cardDefinitionId]: auraProgram });
    rig = { ...rig, state: registered.state };
    const ally = putCharacterInPlay(rig, 'p1', allyDef);
    rig = ally.rig;
    const hand = putInHand(rig, 'p1', handDef);
    rig = hand.rig;

    const koSourceDef = makeCharacterDef({ cardNumber: 'KO-001' });
    const koSource = putCharacterInPlay(rig, 'p2', koSourceDef);
    rig = { ...koSource.rig, defs: { ...koSource.rig.defs, [koSourceDef.cardDefinitionId]: koSourceDef } };
    const reg: EffectTemplateRegistry = {
      [rosinanteDef.cardDefinitionId]: auraProgram,
      [koSourceDef.cardDefinitionId]: koProgram,
    };

    const koFired = runTimings(koProgram, ['onPlay'], rig.state, koSource.instanceId, rig.defs, null, reg);
    const afterTarget = resumeProgram(koProgram, koFired.state, koFired.pendingChoices[0], [ally.instanceId], rig.defs, null, reg);
    const accepted = resumeProgram(koProgram, afterTarget.state, afterTarget.pendingChoices[0], true, rig.defs, null, reg);
    expect(accepted.pendingChoices[0]?.kind).toBe('SELECT_CARDS');

    const resolved = resumeProgram(koProgram, accepted.state, accepted.pendingChoices[0], [hand.instanceId], rig.defs, null, reg);
    // The ally itself (the K.O. target) is rested and stays on the field — NOT the aura source.
    expect(resolved.state.cardsById[ally.instanceId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[ally.instanceId].orientation).toBe('rested');
    expect(resolved.state.cardsById[rosinante.instanceId].orientation).toBe('active');
    expect(resolved.state.cardsById[hand.instanceId].currentZone).toBe('trash');
  });
});
