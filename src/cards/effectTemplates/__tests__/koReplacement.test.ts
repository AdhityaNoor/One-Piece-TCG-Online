import { describe, expect, it } from 'vitest';
import { applyTemplate } from '../catalog/factories';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { resumeKoReplacementChoice } from '../../../engine/effects/resumeKoReplacement';
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
    expect(afterTarget.pendingChoices[0].sourceEffectId).toBe('koReplacement');
    expect(afterTarget.state.cardsById[targetId].currentZone).toBe('characterArea');

    const payChoice = resumeKoReplacementChoice(
      afterTarget.state,
      afterTarget.pendingChoices[0],
      true,
      rig.defs,
      null,
      reg,
    );
    expect(payChoice.pendingChoices).toHaveLength(1);
    expect(payChoice.pendingChoices[0].kind).toBe('SELECT_CARDS');

    const resolved = resumeKoReplacementChoice(
      payChoice.state,
      payChoice.pendingChoices[0],
      [hand.instanceId],
      rig.defs,
      null,
      reg,
    );
    expect(resolved.state.cardsById[targetId].currentZone).toBe('characterArea');
    expect(resolved.state.cardsById[hand.instanceId].currentZone).toBe('trash');
  });
});
