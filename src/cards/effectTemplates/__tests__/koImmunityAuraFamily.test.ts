import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';

describe('family: koImmunityAuraControllerCharacters via template', () => {
  const auraCard: CardEffectAssignment = {
    cardNumber: 'SYN-AURA',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'koImmunityAuraControllerCharacters',
        scope: 'effect',
        duration: 'permanent',
        excludeSource: true,
        targetCondition: { maxCost: 3 },
        effectSourceController: 'opponent',
      }],
    },
  };
  const koCard: CardEffectAssignment = {
    cardNumber: 'SYN-KO',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }] },
  };

  it('registers aura on enter play and blocks opponent effect K.O. on a low-cost ally', () => {
    const registry = buildRegistryFromAssignments([auraCard, koCard]);
    const auraDef = makeCharacterDef({ cardDefinitionId: 'SYN-AURA', cardNumber: 'SYN-AURA', baseCost: 4 });
    const allyDef = makeCharacterDef({ cardDefinitionId: 'SYN-ALLY', cardNumber: 'SYN-ALLY', baseCost: 2 });
    const koDef = makeCharacterDef({ cardDefinitionId: 'SYN-KO', cardNumber: 'SYN-KO', baseCost: 1 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let auraId: string;
    let allyId: string;
    let koId: string;
    ({ rig, instanceId: auraId } = putCharacterInPlay(rig, 'p1', auraDef));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', allyDef));
    ({ rig, instanceId: koId } = putCharacterInPlay(rig, 'p2', koDef));

    const entered = runTimings(registry['SYN-AURA'], ['onEnterPlay'], rig.state, auraId, rig.defs, null, registry).state;
    expect(entered.continuousEffects.some((ce) => ce.koImmunityModifier?.appliesToGroup !== undefined)).toBe(true);

    const fired = runTimings(registry['SYN-KO'], ['onPlay'], entered, koId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];
    const resolved = resumeProgram(registry['SYN-KO'], fired.state, choice, [allyId], rig.defs, null, registry);
    expect(resolved.state.players.p1.characterArea.cardIds).toContain(allyId);
  });
});

describe('family: koImmunitySelf effect-source filter via template', () => {
  const begeCard: CardEffectAssignment = {
    cardNumber: 'SYN-BEGE',
    templateId: 'ability',
    params: {
      timing: 'onEnterPlay',
      functions: [{
        fn: 'koImmunitySelf',
        scope: 'effect',
        duration: 'permanent',
        effectSourceController: 'opponent',
        effectSourceMaxBasePower: 5000,
        effectSourceCategory: 'character',
      }],
    },
  };
  const koCard: CardEffectAssignment = {
    cardNumber: 'SYN-KO',
    templateId: 'ability',
    params: { timing: 'onPlay', functions: [{ fn: 'ko', target: { group: 'characters', player: 'opponent' }, optional: true }] },
  };

  it('prevents K.O. from a weak opponent Character but not a strong one', () => {
    const registry = buildRegistryFromAssignments([begeCard, koCard]);
    const begeDef = makeCharacterDef({ cardDefinitionId: 'SYN-BEGE', cardNumber: 'SYN-BEGE', baseCost: 4 });
    const weakDef = makeCharacterDef({ cardDefinitionId: 'SYN-WEAK', cardNumber: 'SYN-WEAK', baseCost: 5, basePower: 5000 });
    const strongDef = makeCharacterDef({ cardDefinitionId: 'SYN-STRONG', cardNumber: 'SYN-STRONG', baseCost: 7, basePower: 7000 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let begeId: string;
    let weakId: string;
    let strongId: string;
    ({ rig, instanceId: begeId } = putCharacterInPlay(rig, 'p2', begeDef));
    const entered = runTimings(registry['SYN-BEGE'], ['onEnterPlay'], rig.state, begeId, rig.defs, null, registry).state;

    ({ rig, instanceId: weakId } = putCharacterInPlay({ state: entered, defs: rig.defs }, 'p1', weakDef));
    const weakKo = runTimings(registry['SYN-KO'], ['onPlay'], rig.state, weakId, rig.defs, null, registry);
    const weakResolved = resumeProgram(registry['SYN-KO'], weakKo.state, weakKo.state.pendingChoices[0], [begeId], rig.defs, null, registry);
    expect(weakResolved.state.players.p2.characterArea.cardIds).toContain(begeId);

    ({ rig, instanceId: strongId } = putCharacterInPlay({ state: weakResolved.state, defs: rig.defs }, 'p1', strongDef));
    const strongKo = runTimings(registry['SYN-KO'], ['onPlay'], weakResolved.state, strongId, rig.defs, null, registry);
    const strongResolved = resumeProgram(registry['SYN-KO'], strongKo.state, strongKo.state.pendingChoices[0], [begeId], rig.defs, null, registry);
    expect(strongResolved.state.players.p2.characterArea.cardIds).not.toContain(begeId);
    expect(strongResolved.state.cardsById[begeId].currentZone).toBe('trash');
  });
});
