import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { resolveDamageAndEndOfBattle } from '../../../engine/rules/battle/damageStep';
import { hasContinuousKeyword, isKoImmune } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putDeckCards, putDon, putInHand, putLifeCards } from '../../../engine/rules/shared/__tests__/testRig';
import type { BattleState, GameState } from '../../../engine/state/game';
import { buildCuratedEffectRegistry } from '../curatedPrograms';

describe('ST06 remaining capability coverage', () => {
  it('wires ST06-004 as effect-only K.O. immunity plus conditional Double Attack', () => {
    const smoker = makeCharacterDef({
      cardDefinitionId: 'ST06-004',
      cardNumber: 'ST06-004',
      name: 'Smoker',
      category: 'character',
      baseCost: 5,
      basePower: 7000,
      hasDoubleAttack: true,
    });
    const costZero = makeCharacterDef({
      cardDefinitionId: 'TEST-COST-ZERO',
      cardNumber: 'TEST-COST-ZERO',
      name: 'Cost Zero',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let smokerId: string;
    ({ rig, instanceId: smokerId } = putCharacterInPlay(rig, 'p1', smoker, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p2', costZero));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    rig = {
      ...withDon,
      state: {
        ...withDon.state,
        cardsById: {
          ...withDon.state.cardsById,
          [smokerId]: { ...withDon.state.cardsById[smokerId], donAttached: donIds },
        },
      },
    };

    const registry = buildCuratedEffectRegistry(rig.defs);
    const state = runTimings(registry['ST06-004'], ['onEnterPlay'], rig.state, smokerId, rig.defs, null, registry).state;

    expect(isKoImmune(rig.defs, state, smokerId, 'effect')).toBe(true);
    expect(isKoImmune(rig.defs, state, smokerId, 'battle')).toBe(false);
    expect(hasContinuousKeyword(rig.defs, state, smokerId, 'doubleAttack')).toBe(true);
  });

  it('does not treat conditional Double Attack as static when the curated condition is off', () => {
    const smoker = makeCharacterDef({
      cardDefinitionId: 'ST06-004',
      cardNumber: 'ST06-004',
      name: 'Smoker',
      category: 'character',
      baseCost: 5,
      basePower: 7000,
      hasDoubleAttack: true,
    });
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'TEST-LIFE', cardNumber: 'TEST-LIFE', name: 'Life Card' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let smokerId: string;
    ({ rig, instanceId: smokerId } = putCharacterInPlay(rig, 'p1', smoker, { summoningSick: false, orientation: 'rested' }));
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard, lifeCard, lifeCard, lifeCard, lifeCard]));
    const battle: BattleState = {
      attackerInstanceId: smokerId,
      targetInstanceId: rig.state.players.p2.leaderInstanceId,
      originalTargetInstanceId: rig.state.players.p2.leaderInstanceId,
      step: 'counter',
      blockerUsed: false,
      battlePowerBonuses: {},
    };
    const withBattle: GameState = { ...rig.state, currentBattle: battle };

    const result = resolveDamageAndEndOfBattle(withBattle, rig.defs, null, buildCuratedEffectRegistry(rig.defs));

    expect(result.state.players.p2.lifeArea.cardIds).toHaveLength(4);
  });

  it('lets the opponent choose the card trashed by ST06-015 Trigger', () => {
    const iceAge = makeEventDef({ cardDefinitionId: 'ST06-015', cardNumber: 'ST06-015', name: 'Great Eruption', category: 'event' });
    const spare = makeCharacterDef({ cardDefinitionId: 'TEST-OPP-HAND', cardNumber: 'TEST-OPP-HAND', name: 'Opponent Hand Card' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let handId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', iceAge));
    ({ rig, instanceId: handId } = putInHand(rig, 'p2', spare));

    const registry = buildCuratedEffectRegistry(rig.defs);
    const fired = runTimings(registry['ST06-015'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];

    expect(choice).toMatchObject({
      playerId: 'p2',
      constraints: { min: 1, max: 1, candidateInstanceIds: [handId] },
    });

    const resolved = resumeProgram(registry['ST06-015'], fired.state, choice, [handId], rig.defs, null, registry);

    expect(resolved.state.players.p2.hand.cardIds).not.toContain(handId);
    expect(resolved.state.players.p2.trash.cardIds).toContain(handId);
  });

  it('wires ST06-016 Trigger draw plus this-turn K.O. immunity for own Characters', () => {
    const whiteOut = makeEventDef({ cardDefinitionId: 'ST06-016', cardNumber: 'ST06-016', name: 'White Out', category: 'event' });
    const ally = makeCharacterDef({ cardDefinitionId: 'TEST-ALLY', cardNumber: 'TEST-ALLY', name: 'Ally', category: 'character' });
    const drawCard = makeCharacterDef({ cardDefinitionId: 'TEST-DRAW', cardNumber: 'TEST-DRAW', name: 'Draw Card' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let allyId: string;
    let drawId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', whiteOut));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', ally));
    ({ rig, deckIds: [drawId] } = putDeckCards(rig, 'p1', drawCard, 1));

    const registry = buildCuratedEffectRegistry(rig.defs);
    const state = runTimings(registry['ST06-016'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry).state;

    expect(state.players.p1.hand.cardIds).toContain(drawId);
    expect(isKoImmune(rig.defs, state, allyId, 'effect')).toBe(true);
    expect(isKoImmune(rig.defs, state, allyId, 'battle')).toBe(true);
  });
});
