import { describe, expect, it } from 'vitest';
import { applyTemplate } from '../catalog/factories';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
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
});
