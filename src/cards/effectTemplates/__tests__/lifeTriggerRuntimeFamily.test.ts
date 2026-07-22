import { describe, expect, it } from 'vitest';
import { executeAction } from '../../../engine/actions';
import { resolveDamageAndEndOfBattle } from '../../../engine/rules/battle/damageStep';
import { computeCurrentPower } from '../../../engine/rules/shared';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  nextTestId,
  putCharacterInPlay,
  putDeckCards,
  putLifeCards,
  type Rig,
} from '../../../engine/rules/shared/__tests__/testRig';
import type { CardDefinition } from '../../../engine/state/card';
import type { GameState } from '../../../engine/state/game';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';

function stateAtDamageStep(rig: Rig): GameState {
  const attackerInstanceId = rig.state.players.p2.leaderInstanceId;
  const targetInstanceId = rig.state.players.p1.leaderInstanceId;
  return {
    ...rig.state,
    currentBattle: {
      attackerInstanceId,
      targetInstanceId,
      originalTargetInstanceId: targetInstanceId,
      step: 'damage',
      blockerUsed: false,
      battlePowerBonuses: {},
    },
  };
}

function damageIntoLifeTrigger(
  rig: Rig,
  triggerDef: CardDefinition,
  assignment: CardEffectAssignment,
): { rig: Rig; lifeId: string; state: GameState; registry: ReturnType<typeof buildRegistryFromAssignments> } {
  const withLife = putLifeCards(rig, 'p1', [triggerDef]);
  const lifeId = withLife.lifeIds[0]!;
  const registry = buildRegistryFromAssignments([assignment]);
  const damaged = resolveDamageAndEndOfBattle(stateAtDamageStep(withLife.rig), withLife.rig.defs, 'damage-test', registry);

  expect(damaged.pendingChoices).toHaveLength(1);
  expect(damaged.pendingChoices[0]!.sourceEffectId).toBe('rule:lifeTrigger');
  expect(damaged.pendingChoices[0]!.sourceInstanceId).toBe(lifeId);
  expect(damaged.state.players.p1.hand.cardIds).toContain(lifeId);

  return { rig: withLife.rig, lifeId, state: { ...damaged.state, pendingChoices: damaged.pendingChoices }, registry };
}

function resolveTriggerChoice(
  state: GameState,
  rig: Rig,
  registry: ReturnType<typeof buildRegistryFromAssignments>,
  response: readonly string[],
): GameState {
  const choice = state.pendingChoices[0]!;
  return executeAction(
    state,
    {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: nextTestId('resolve-trigger'),
      playerId: choice.playerId,
      choiceId: choice.id,
      response,
    },
    rig.defs,
    registry,
  ).state;
}

describe('Life Trigger runtime family', () => {
  it('declining a revealed curated trigger keeps the card in hand', () => {
    const triggerDef = makeEventDef({
      cardDefinitionId: 'SYN-LT-DECLINE',
      cardNumber: 'SYN-LT-DECLINE',
      hasTrigger: true,
      text: '[Trigger] Draw 1 card.',
    });
    const assignment: CardEffectAssignment = {
      cardNumber: triggerDef.cardNumber,
      templateId: 'ability',
      params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] },
    };
    const base = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    const { rig, lifeId, state, registry } = damageIntoLifeTrigger(base, triggerDef, assignment);

    const declined = resolveTriggerChoice(state, rig, registry, []);

    expect(declined.players.p1.hand.cardIds).toContain(lifeId);
    expect(declined.players.p1.trash.cardIds).not.toContain(lifeId);
    expect(declined.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
    expect(declined.pendingChoices).toHaveLength(0);
  });

  it('activating an immediate draw trigger resolves the effect then trashes the trigger source', () => {
    const triggerDef = makeEventDef({
      cardDefinitionId: 'SYN-LT-DRAW',
      cardNumber: 'SYN-LT-DRAW',
      hasTrigger: true,
      text: '[Trigger] Draw 1 card.',
    });
    const filler = makeCharacterDef({ cardDefinitionId: 'SYN-LT-FILLER', cardNumber: 'SYN-LT-FILLER' });
    const assignment: CardEffectAssignment = {
      cardNumber: triggerDef.cardNumber,
      templateId: 'ability',
      params: { timing: 'lifeTrigger', functions: [{ fn: 'draw', amount: 1 }] },
    };
    const withDeck = putDeckCards(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), 'p1', filler, 1);
    const deckCardId = withDeck.deckIds[0]!;
    const { rig, lifeId, state, registry } = damageIntoLifeTrigger(withDeck.rig, triggerDef, assignment);

    const resolved = resolveTriggerChoice(state, rig, registry, [lifeId]);

    expect(resolved.players.p1.hand.cardIds).toContain(deckCardId);
    expect(resolved.players.p1.hand.cardIds).not.toContain(lifeId);
    expect(resolved.players.p1.trash.cardIds).toContain(lifeId);
    expect(resolved.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
    expect(resolved.pendingChoices).toHaveLength(0);
  });

  it('triggerPlaySelf plays the trigger source instead of trashing it', () => {
    const triggerDef = makeCharacterDef({
      cardDefinitionId: 'SYN-LT-PLAY-SELF',
      cardNumber: 'SYN-LT-PLAY-SELF',
      baseCost: 2,
      basePower: 3000,
      hasTrigger: true,
      text: '[Trigger] Play this card.',
    });
    const assignment: CardEffectAssignment = {
      cardNumber: triggerDef.cardNumber,
      templateId: 'ability',
      params: { timing: 'lifeTrigger', functions: [{ fn: 'triggerPlaySelf' }] },
    };
    const base = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    const { rig, lifeId, state, registry } = damageIntoLifeTrigger(base, triggerDef, assignment);

    const resolved = resolveTriggerChoice(state, rig, registry, [lifeId]);
    const played = resolved.players.p1.characterArea.cardIds
      .map((id) => resolved.cardsById[id])
      .find((card) => card?.cardDefinitionId === triggerDef.cardDefinitionId);

    expect(played).toBeDefined();
    expect(resolved.players.p1.hand.cardIds).not.toContain(lifeId);
    expect(resolved.players.p1.trash.cardIds).not.toContain(lifeId);
    expect(resolved.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
    expect(resolved.pendingChoices).toHaveLength(0);
  });

  it('keeps the trigger source pending in hand while a target choice is unresolved, then trashes it after resume', () => {
    const triggerDef = makeEventDef({
      cardDefinitionId: 'SYN-LT-PENDING-BUFF',
      cardNumber: 'SYN-LT-PENDING-BUFF',
      hasTrigger: true,
      text: '[Trigger] Up to 1 of your Leader or Character cards gains +1000 power during this turn.',
    });
    const assignment: CardEffectAssignment = {
      cardNumber: triggerDef.cardNumber,
      templateId: 'ability',
      params: {
        timing: 'lifeTrigger',
        functions: [{
          fn: 'addPower',
          target: { group: 'leaderOrCharacters', player: 'controller' },
          amount: 1000,
          duration: 'duringThisTurn',
          optional: true,
          maxTargets: 1,
        }],
      },
    };
    const base = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    const { rig, lifeId, state, registry } = damageIntoLifeTrigger(base, triggerDef, assignment);

    const awaitingTarget = resolveTriggerChoice(state, rig, registry, [lifeId]);

    expect(awaitingTarget.pendingChoices).toHaveLength(1);
    expect(awaitingTarget.pendingLifeTriggerTrash ?? []).toContain(lifeId);
    expect(awaitingTarget.players.p1.hand.cardIds).toContain(lifeId);
    expect(awaitingTarget.players.p1.trash.cardIds).not.toContain(lifeId);

    const targetChoice = awaitingTarget.pendingChoices[0]!;
    const leaderId = awaitingTarget.players.p1.leaderInstanceId;
    const resumed = executeAction(
      awaitingTarget,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: nextTestId('resolve-target'),
        playerId: targetChoice.playerId,
        choiceId: targetChoice.id,
        response: [leaderId],
      },
      rig.defs,
      registry,
    ).state;

    expect(computeCurrentPower(rig.defs, resumed, leaderId)).toBe(6000);
    expect(resumed.players.p1.hand.cardIds).not.toContain(lifeId);
    expect(resumed.players.p1.trash.cardIds).toContain(lifeId);
    expect(resumed.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
    expect(resumed.pendingChoices).toHaveLength(0);
  });

  it('resolves target-driven KO triggers and only trashes the trigger source after the KO choice', () => {
    const triggerDef = makeEventDef({
      cardDefinitionId: 'SYN-LT-KO',
      cardNumber: 'SYN-LT-KO',
      hasTrigger: true,
      text: "[Trigger] K.O. up to 1 of your opponent's Characters with a cost of 4 or less.",
    });
    const victimDef = makeCharacterDef({
      cardDefinitionId: 'SYN-LT-KO-VICTIM',
      cardNumber: 'SYN-LT-KO-VICTIM',
      baseCost: 4,
      basePower: 5000,
    });
    const assignment: CardEffectAssignment = {
      cardNumber: triggerDef.cardNumber,
      templateId: 'ability',
      params: {
        timing: 'lifeTrigger',
        functions: [{
          fn: 'ko',
          target: { group: 'characters', player: 'opponent', filter: { maxCost: 4 } },
          optional: true,
          maxTargets: 1,
        }],
      },
    };
    const withVictim = putCharacterInPlay(buildBaseRig({ activePlayerId: 'p2', phase: 'main' }), 'p2', victimDef);
    const { rig, lifeId, state, registry } = damageIntoLifeTrigger(withVictim.rig, triggerDef, assignment);
    const awaitingTarget = resolveTriggerChoice(state, rig, registry, [lifeId]);

    expect(awaitingTarget.pendingChoices).toHaveLength(1);
    expect(awaitingTarget.pendingLifeTriggerTrash ?? []).toContain(lifeId);
    expect(awaitingTarget.players.p2.characterArea.cardIds).toContain(withVictim.instanceId);

    const koChoice = awaitingTarget.pendingChoices[0]!;
    const resumed = executeAction(
      awaitingTarget,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: nextTestId('resolve-ko'),
        playerId: koChoice.playerId,
        choiceId: koChoice.id,
        response: [withVictim.instanceId],
      },
      rig.defs,
      registry,
    ).state;

    expect(resumed.players.p2.characterArea.cardIds).not.toContain(withVictim.instanceId);
    expect(resumed.players.p2.trash.cardIds).toContain(withVictim.instanceId);
    expect(resumed.players.p1.trash.cardIds).toContain(lifeId);
    expect(resumed.players.p1.hand.cardIds).not.toContain(lifeId);
    expect(resumed.pendingLifeTriggerTrash ?? []).not.toContain(lifeId);
    expect(resumed.pendingChoices).toHaveLength(0);
  });
});
