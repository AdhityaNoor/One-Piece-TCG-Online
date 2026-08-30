/**
 * A Life [Trigger] prompt must never leave a seat with zero legal actions.
 *
 * damageStep.ts / dealLifeDamage.ts publish the choice as kind 'YES_NO', but
 * validateResolvePendingChoice's 'rule:lifeTrigger' branch accepts ONLY an
 * array — [] to decline, [sourceInstanceId] to activate. Enumerating booleans
 * produced two candidates that both failed validation, and because a pending
 * choice suppresses every other branch of generateLegalActions, BOTH players
 * were left with nothing to do: the match could not advance by any input.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putDeckCards,
  putInHand,
} from '../../engine/rules/shared/__tests__/testRig';
import { generateLegalActions } from '../utilities/legalActions';
import { validateAction } from '../../engine/actions';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import type { GameState } from '../../engine/state/game';

const filler = makeCharacterDef({ cardNumber: 'FILL', baseCost: 1, basePower: 2000 });

function stateWithLifeTrigger(): { state: GameState; defs: Record<string, unknown>; cardId: string } {
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 5 });
  rig = putDeckCards(rig, 'p1', filler, 5).rig;
  rig = putDeckCards(rig, 'p2', filler, 5).rig;
  const placed = putInHand(rig, 'p2', { ...filler, cardNumber: 'TRIG', cardDefinitionId: 'TRIG', hasTrigger: true });
  rig = placed.rig;

  const choice: PendingChoice = {
    id: 'p2__life-trigger-1',
    playerId: 'p2',
    kind: 'YES_NO',
    prompt: 'A revealed Life card has a [Trigger] — activate it?',
    constraints: { min: 0, max: 1 },
    sourceInstanceId: placed.instanceId,
    sourceEffectId: 'rule:lifeTrigger',
  };

  return {
    state: { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [choice] },
    defs: rig.defs,
    cardId: placed.instanceId,
  };
}

describe('Life [Trigger] pending choice', () => {
  it('offers array-shaped responses the resolver actually accepts', () => {
    const { state, defs, cardId } = stateWithLifeTrigger();
    const actions = generateLegalActions({
      state,
      playerId: 'p2',
      defs: defs as never,
      registry: {},
      createActionId: () => 'act-1',
    });

    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(action.type).toBe('RESOLVE_PENDING_CHOICE');
      if (action.type !== 'RESOLVE_PENDING_CHOICE') continue;
      expect(Array.isArray(action.response)).toBe(true);
    }

    const shapes = actions.map((a) => JSON.stringify((a as { response: unknown }).response));
    expect(shapes).toContain('[]');
    expect(shapes).toContain(JSON.stringify([cardId]));
  });

  it('every offered response passes engine validation', () => {
    const { state, defs } = stateWithLifeTrigger();
    const actions = generateLegalActions({
      state,
      playerId: 'p2',
      defs: defs as never,
      registry: {},
      createActionId: () => 'act-2',
    });

    for (const action of actions) {
      expect(validateAction(state, action, defs as never, {}).legal).toBe(true);
    }
  });

  it('a boolean response is rejected — the bug that froze the match', () => {
    const { state, defs } = stateWithLifeTrigger();
    const legal = validateAction(
      state,
      {
        type: 'RESOLVE_PENDING_CHOICE',
        actionId: 'act-3',
        playerId: 'p2',
        choiceId: 'p2__life-trigger-1',
        response: true,
      },
      defs as never,
      {},
    ).legal;
    expect(legal).toBe(false);
  });

  it('falls back to a valid response shape for an unrecognised choice kind', () => {
    // Defence in depth: if some future rule choice declares a kind its resolver
    // disagrees with, the seat must still have SOMETHING legal rather than
    // deadlocking the game for both players.
    const { state, defs } = stateWithLifeTrigger();
    const mislabelled: GameState = {
      ...state,
      pendingChoices: [{ ...state.pendingChoices[0], kind: 'SELECT_NUMBER', constraints: { min: 0, max: 1, numberMin: 0, numberMax: 1 } }],
    };
    const actions = generateLegalActions({
      state: mislabelled,
      playerId: 'p2',
      defs: defs as never,
      registry: {},
      createActionId: () => 'act-4',
    });
    expect(actions.length).toBeGreaterThan(0);
  });
});
