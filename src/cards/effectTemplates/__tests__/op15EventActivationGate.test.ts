import { describe, expect, it } from 'vitest';
import type { ActivateCardEffectAction } from '../../../engine/actions/action';
import { executeActivateEventMain } from '../../../engine/actions/handlers/activateEventMain';
import { executeActivateCardEffect, validateActivateCardEffect } from '../../../engine/actions/handlers/activateCardEffect';
import { executeResolvePendingChoice } from '../../../engine/actions/handlers/resolvePendingChoice';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  makeLeaderDef,
  nextTestId,
  putCharacterInPlay,
  putDon,
  putDeckCards,
  putInHand,
} from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { OP15_ASSIGNMENTS } from '../assignments/OP15';

const registry = buildRegistryFromAssignments(OP15_ASSIGNMENTS);

function action(sourceInstanceId: string): ActivateCardEffectAction {
  return {
    type: 'ACTIVATE_CARD_EFFECT',
    actionId: 'activate-op15-002',
    playerId: 'p1',
    sourceInstanceId,
    effectId: 'activateMain',
    donInstanceIds: [],
  };
}

describe('OP15-002 event activation gate', () => {
  it('does not allow the Main Phase draw before a base-cost-3+ Event was activated this turn', () => {
    const op15 = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: op15 });
    const sourceId = rig.state.players.p1.leaderInstanceId;

    const result = validateActivateCardEffect(rig.state, action(sourceId), registry, rig.defs);

    expect(result.legal).toBe(false);
    expect(result.reasons.join('\n')).toContain("condition isn't met");
  });

  it('allows the draw after the controller activated a base-cost-3+ Event this turn', () => {
    const op15 = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const filler = makeCharacterDef({ cardDefinitionId: 'OP15-GATE-FILLER', cardNumber: 'OP15-GATE-FILLER' });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: op15 });
    const sourceId = rig.state.players.p1.leaderInstanceId;
    rig = putDeckCards(rig, 'p1', filler, 1).rig;
    const state = {
      ...rig.state,
      eventActivationHistory: [{
        playerId: 'p1',
        cardDefinitionId: 'EVENT-3',
        cardNumber: 'EVENT-3',
        baseCost: 3,
        turnNumber: 5,
      }],
    };

    expect(validateActivateCardEffect(state, action(sourceId), registry, rig.defs).legal).toBe(true);
    const resolved = executeActivateCardEffect(state, action(sourceId), rig.defs, registry).state;

    expect(resolved.players.p1.hand.cardIds.length).toBe(1);
    expect(resolved.players.p1.deck.cardIds.length).toBe(0);
  });

  it('records normal Event activations for the base-cost gate', () => {
    const op15 = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const event = makeEventDef({ cardDefinitionId: 'EVENT-3', cardNumber: 'EVENT-3', baseCost: 3 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: op15 });
    const sourceId = rig.state.players.p1.leaderInstanceId;
    const withDon = putDon(rig, 'p1', 3);
    const withEvent = putInHand(withDon.rig, 'p1', event);
    const eventRegistry = {
      ...registry,
      [event.cardDefinitionId]: { cardNumber: event.cardNumber, abilities: [{ timing: 'activateMain' as const, ops: [] }] },
    };

    const afterEvent = executeActivateEventMain(
      withEvent.rig.state,
      {
        type: 'ACTIVATE_EVENT_MAIN',
        actionId: 'activate-event-3',
        playerId: 'p1',
        handCardInstanceId: withEvent.instanceId,
        donInstanceIds: withDon.donIds,
      },
      withEvent.rig.defs,
      eventRegistry,
    ).state;

    expect(afterEvent.eventActivationHistory).toContainEqual(expect.objectContaining({ playerId: 'p1', baseCost: 3, turnNumber: 5 }));
    expect(validateActivateCardEffect(afterEvent, action(sourceId), eventRegistry, withEvent.rig.defs).legal).toBe(true);
  });

  it('records a base-cost-3 Event before its effect suspends on a pending choice', () => {
    const op15 = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const event = makeEventDef({ cardDefinitionId: 'EVENT-3-PENDING', cardNumber: 'EVENT-3-PENDING', baseCost: 3 });
    const target = makeCharacterDef({ cardDefinitionId: 'TARGET', cardNumber: 'TARGET', baseCost: 1 });
    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: op15 });
    const sourceId = rig.state.players.p1.leaderInstanceId;
    const withTarget = putCharacterInPlay(rig, 'p2', target);
    const withDon = putDon(withTarget.rig, 'p1', 3);
    const withEvent = putInHand(withDon.rig, 'p1', event);
    const eventRegistry = buildRegistryFromAssignments([
      ...OP15_ASSIGNMENTS,
      {
        cardNumber: event.cardNumber,
        templateId: 'ability',
        params: {
          timing: 'activateMain',
          functions: [{ fn: 'rest', target: { group: 'characters', player: 'opponent', filter: { maxCost: 3 } }, optional: true }],
        },
      },
    ]);

    const afterEvent = executeActivateEventMain(
      withEvent.rig.state,
      {
        type: 'ACTIVATE_EVENT_MAIN',
        actionId: 'activate-event-3-pending',
        playerId: 'p1',
        handCardInstanceId: withEvent.instanceId,
        donInstanceIds: withDon.donIds,
      },
      withEvent.rig.defs,
      eventRegistry,
    );

    expect(afterEvent.pendingChoices).toHaveLength(1);
    expect(afterEvent.state.eventActivationHistory).toContainEqual(expect.objectContaining({ playerId: 'p1', baseCost: 3, turnNumber: 5 }));

    const resolved = executeResolvePendingChoice(
      afterEvent.state,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: nextTestId('resolve'),
        playerId: 'p1',
        choiceId: afterEvent.pendingChoices[0].id,
        response: [withTarget.instanceId],
      },
      withEvent.rig.defs,
      eventRegistry,
    );

    expect(validateActivateCardEffect(resolved.state, action(sourceId), eventRegistry, withEvent.rig.defs).legal).toBe(true);
  });

  it('ignores cheaper Events and previous-turn Events', () => {
    const op15 = makeLeaderDef({ cardDefinitionId: 'OP15-002', cardNumber: 'OP15-002' });
    const rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5, leaderOverridesP1: op15 });
    const sourceId = rig.state.players.p1.leaderInstanceId;
    const state = {
      ...rig.state,
      eventActivationHistory: [
        { playerId: 'p1', cardDefinitionId: 'EVENT-2', cardNumber: 'EVENT-2', baseCost: 2, turnNumber: 5 },
        { playerId: 'p1', cardDefinitionId: 'OLD-EVENT-4', cardNumber: 'OLD-EVENT-4', baseCost: 4, turnNumber: 4 },
      ],
    };

    expect(validateActivateCardEffect(state, action(sourceId), registry, rig.defs).legal).toBe(false);
  });
});
