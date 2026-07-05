import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects';
import { resolveDamageAndEndOfBattle } from '../../../engine/rules/battle/damageStep';
import { hasContinuousKeyword, isKoImmune } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeEventDef, putCharacterInPlay, putDeckCards, putDon, putInHand, putLifeCards } from '../../../engine/rules/shared/__tests__/testRig';
import type { BattleState, GameState } from '../../../engine/state/game';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

describe('semantic family: effect K.O. immunity with conditional keyword grant', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-EFFECT-IMMUNE-KEYWORD',
    templates: [
      { templateId: 'ability', params: { timing: 'onEnterPlay', functions: [{ fn: 'koImmunitySelf', scope: 'effect', duration: 'permanent' }] } },
      {
        templateId: 'ability',
        params: {
          timing: 'onEnterPlay',
          functions: [
            {
              fn: 'addKeywordSelf',
              keyword: 'doubleAttack',
              duration: 'permanent',
              condition: { donAttachedAtLeast: 1, gate: [{ kind: 'anyCharacterExactCost', exactCost: 0 }] },
            },
          ],
        },
      },
    ],
  };

  it('registers effect-only K.O. immunity plus a conditionally live keyword', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-EFFECT-IMMUNE-KEYWORD',
      cardNumber: 'SYN-EFFECT-IMMUNE-KEYWORD',
      category: 'character',
      baseCost: 5,
      basePower: 7000,
      hasDoubleAttack: true,
    });
    const costZero = makeCharacterDef({
      cardDefinitionId: 'SYN-COST-ZERO',
      cardNumber: 'SYN-COST-ZERO',
      category: 'character',
      baseCost: 0,
      basePower: 1000,
    });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false }));
    ({ rig } = putCharacterInPlay(rig, 'p2', costZero));
    const { rig: withDon, donIds } = putDon(rig, 'p1', 1);
    rig = {
      ...withDon,
      state: {
        ...withDon.state,
        cardsById: {
          ...withDon.state.cardsById,
          [sourceId]: { ...withDon.state.cardsById[sourceId], donAttached: donIds },
        },
      },
    };

    const registry = buildRegistryFromAssignments([assignment]);
    const state = runTimings(registry['SYN-EFFECT-IMMUNE-KEYWORD'], ['onEnterPlay'], rig.state, sourceId, rig.defs, null, registry).state;

    expect(isKoImmune(rig.defs, state, sourceId, 'effect')).toBe(true);
    expect(isKoImmune(rig.defs, state, sourceId, 'battle')).toBe(false);
    expect(hasContinuousKeyword(rig.defs, state, sourceId, 'doubleAttack')).toBe(true);
  });

  it('does not treat a conditional keyword grant as static when the curated condition is off', () => {
    const source = makeCharacterDef({
      cardDefinitionId: 'SYN-EFFECT-IMMUNE-KEYWORD',
      cardNumber: 'SYN-EFFECT-IMMUNE-KEYWORD',
      category: 'character',
      baseCost: 5,
      basePower: 7000,
      hasDoubleAttack: true,
    });
    const lifeCard = makeCharacterDef({ cardDefinitionId: 'SYN-LIFE', cardNumber: 'SYN-LIFE', name: 'Life Card' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false, orientation: 'rested' }));
    ({ rig } = putLifeCards(rig, 'p2', [lifeCard, lifeCard, lifeCard, lifeCard, lifeCard]));
    const battle: BattleState = {
      attackerInstanceId: sourceId,
      targetInstanceId: rig.state.players.p2.leaderInstanceId,
      originalTargetInstanceId: rig.state.players.p2.leaderInstanceId,
      step: 'counter',
      blockerUsed: false,
      battlePowerBonuses: {},
    };
    const withBattle: GameState = { ...rig.state, currentBattle: battle };

    const result = resolveDamageAndEndOfBattle(withBattle, rig.defs, null, buildRegistryFromAssignments([assignment]));

    expect(result.state.players.p2.lifeArea.cardIds).toHaveLength(4);
  });
});

describe('semantic family: opponent chooses a card from hand to trash', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-OPPONENT-CHOOSES-HAND-TRASH',
    templateId: 'ability',
    params: { timing: 'lifeTrigger', functions: [{ fn: 'trashFromOpponentHandChosenByOpponent', count: 1 }] },
  };

  it('makes the opponent choose the card from their own hand', () => {
    const source = makeEventDef({ cardDefinitionId: 'SYN-OPPONENT-CHOOSES-HAND-TRASH', cardNumber: 'SYN-OPPONENT-CHOOSES-HAND-TRASH', category: 'event' });
    const spare = makeCharacterDef({ cardDefinitionId: 'SYN-OPP-HAND', cardNumber: 'SYN-OPP-HAND', name: 'Opponent Hand Card' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let handId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', source));
    ({ rig, instanceId: handId } = putInHand(rig, 'p2', spare));

    const registry = buildRegistryFromAssignments([assignment]);
    const fired = runTimings(registry['SYN-OPPONENT-CHOOSES-HAND-TRASH'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry);
    const choice = fired.state.pendingChoices[0];

    expect(choice).toMatchObject({
      playerId: 'p2',
      constraints: { min: 1, max: 1, candidateInstanceIds: [handId] },
    });

    const resolved = resumeProgram(registry['SYN-OPPONENT-CHOOSES-HAND-TRASH'], fired.state, choice, [handId], rig.defs, null, registry);

    expect(resolved.state.players.p2.hand.cardIds).not.toContain(handId);
    expect(resolved.state.players.p2.trash.cardIds).toContain(handId);
  });
});

describe('semantic family: trigger draw plus temporary K.O. immunity for own Characters', () => {
  const assignment: CardEffectAssignment = {
    cardNumber: 'SYN-DRAW-IMMUNITY-TRIGGER',
    templateId: 'ability',
    params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }, { fn: 'koImmunityControllerCharactersAll', scope: 'any', duration: 'duringThisTurn' }] },
  };

  it('draws first, then protects current own Characters from battle and effect K.O.', () => {
    const source = makeEventDef({ cardDefinitionId: 'SYN-DRAW-IMMUNITY-TRIGGER', cardNumber: 'SYN-DRAW-IMMUNITY-TRIGGER', category: 'event' });
    const ally = makeCharacterDef({ cardDefinitionId: 'SYN-ALLY', cardNumber: 'SYN-ALLY', name: 'Ally', category: 'character' });
    const drawCard = makeCharacterDef({ cardDefinitionId: 'SYN-DRAW', cardNumber: 'SYN-DRAW', name: 'Draw Card' });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let allyId: string;
    let drawId: string;
    ({ rig, instanceId: sourceId } = putInHand(rig, 'p1', source));
    ({ rig, instanceId: allyId } = putCharacterInPlay(rig, 'p1', ally));
    ({ rig, deckIds: [drawId] } = putDeckCards(rig, 'p1', drawCard, 1));

    const registry = buildRegistryFromAssignments([assignment]);
    const state = runTimings(registry['SYN-DRAW-IMMUNITY-TRIGGER'], ['lifeTrigger'], rig.state, sourceId, rig.defs, null, registry).state;

    expect(state.players.p1.hand.cardIds).toContain(drawId);
    expect(isKoImmune(rig.defs, state, allyId, 'effect')).toBe(true);
    expect(isKoImmune(rig.defs, state, allyId, 'battle')).toBe(true);
  });
});
