import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { isKoImmune } from '../../../engine/rules/shared';
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

  it('prevents battle K.O. only from attackers with the configured attribute', () => {
    const buggyCard: CardEffectAssignment = {
      cardNumber: 'SYN-BUGGY',
      templateId: 'ability',
      params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'battle', duration: 'permanent', attackerAttribute: 'slash' }] },
    };
    const registry = buildRegistryFromAssignments([buggyCard]);
    const buggyDef = makeCharacterDef({ cardDefinitionId: 'SYN-BUGGY', cardNumber: 'SYN-BUGGY', basePower: 1000 });
    const slashDef = makeCharacterDef({ cardDefinitionId: 'SYN-SLASH', cardNumber: 'SYN-SLASH', basePower: 5000, attributes: ['slash'] });
    const strikeDef = makeCharacterDef({ cardDefinitionId: 'SYN-STRIKE', cardNumber: 'SYN-STRIKE', basePower: 5000, attributes: ['strike'] });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let buggyId: string;
    let slashId: string;
    let strikeId: string;
    ({ rig, instanceId: buggyId } = putCharacterInPlay(rig, 'p2', buggyDef));
    ({ rig, instanceId: slashId } = putCharacterInPlay(rig, 'p1', slashDef));
    ({ rig, instanceId: strikeId } = putCharacterInPlay(rig, 'p1', strikeDef));
    const entered = runTimings(registry['SYN-BUGGY'], ['onEnterPlay'], rig.state, buggyId, rig.defs, null, registry).state;

    const slashBattle = { ...entered, currentBattle: { attackerInstanceId: slashId, targetInstanceId: buggyId, originalTargetInstanceId: buggyId, step: 'damage' as const, blockerUsed: false, battlePowerBonuses: {} } };
    expect(isKoImmune(rig.defs, slashBattle, buggyId, 'battle')).toBe(true);

    const strikeBattle = { ...entered, currentBattle: { ...slashBattle.currentBattle, attackerInstanceId: strikeId } };
    expect(isKoImmune(rig.defs, strikeBattle, buggyId, 'battle')).toBe(false);
  });

  it('prevents K.O. from Character effects without the named attribute only', () => {
    const smokerCard: CardEffectAssignment = {
      cardNumber: 'SYN-SMOKER',
      templateId: 'ability',
      params: {
        timing: 'onEnterPlay',
        functions: [{
          fn: 'koImmunitySelf',
          scope: 'effect',
          duration: 'permanent',
          condition: { donAttachedAtLeast: 1 },
          effectSourceCategory: 'character',
          effectSourceWithoutAttribute: 'special',
        }],
      },
    };
    const registry = buildRegistryFromAssignments([smokerCard, koCard]);
    const smokerDef = makeCharacterDef({ cardDefinitionId: 'SYN-SMOKER', cardNumber: 'SYN-SMOKER', baseCost: 4 });
    const strikeDef = makeCharacterDef({ cardDefinitionId: 'SYN-STRIKE', cardNumber: 'SYN-STRIKE', baseCost: 5, attributes: ['strike'] });
    const specialDef = makeCharacterDef({ cardDefinitionId: 'SYN-SPECIAL', cardNumber: 'SYN-SPECIAL', baseCost: 5, attributes: ['special'] });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let smokerId: string;
    let strikeId: string;
    let specialId: string;
    ({ rig, instanceId: smokerId } = putCharacterInPlay(rig, 'p2', smokerDef, { donAttached: ['don-attached'] }));
    const entered = runTimings(registry['SYN-SMOKER'], ['onEnterPlay'], rig.state, smokerId, rig.defs, null, registry).state;

    ({ rig, instanceId: strikeId } = putCharacterInPlay({ state: entered, defs: rig.defs }, 'p1', strikeDef));
    const strikeKo = runTimings(registry['SYN-KO'], ['onPlay'], rig.state, strikeId, rig.defs, null, registry);
    const strikeResolved = resumeProgram(registry['SYN-KO'], strikeKo.state, strikeKo.state.pendingChoices[0], [smokerId], rig.defs, null, registry);
    expect(strikeResolved.state.players.p2.characterArea.cardIds).toContain(smokerId);

    ({ rig, instanceId: specialId } = putCharacterInPlay({ state: strikeResolved.state, defs: rig.defs }, 'p1', specialDef));
    const specialKo = runTimings(registry['SYN-KO'], ['onPlay'], rig.state, specialId, rig.defs, null, registry);
    const specialResolved = resumeProgram(registry['SYN-KO'], specialKo.state, specialKo.state.pendingChoices[0], [smokerId], rig.defs, null, registry);
    expect(specialResolved.state.players.p2.characterArea.cardIds).not.toContain(smokerId);
    expect(specialResolved.state.cardsById[smokerId].currentZone).toBe('trash');
  });
});
