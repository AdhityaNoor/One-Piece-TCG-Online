/**
 * 5-2-1-5-1: "at the start of the game" Leader effects (e.g. Imu/OP13-079's
 * "play up to 1 {Mary Geoise} type Stage card from your deck"). Runs once
 * per player, going-first player first then going-second, draining
 * GameState.setupState.startOfGameEffectQueue one player at a time.
 *
 * Called by rules/phases/advanceAutomaticPhases.ts, which already runs
 * unconditionally after every dispatched action (actions/dispatch.ts) and is
 * documented as a no-op outside its handled phases/stages — this file adds
 * the 'awaitingStartOfGameLeaderEffect' setup stage as one more such case.
 * That reuse is what lets a suspended startOfGame ability (a PendingChoice
 * from playStageFromDeck) resume through the ordinary RESOLVE_PENDING_CHOICE
 * path: resuming re-enters dispatch.ts, which calls advanceAutomaticPhases
 * again, which calls back into this file to continue draining the queue.
 *
 * Once the queue is empty, hands off to dealOpeningHandsAndQueueMulligan
 * (5-2-1-6) to keep the existing going-first-then-going-second ordering
 * convention for what follows.
 */
import type { GameState } from '../state/game';
import type { GameLogEntry } from '../logs/logEntry';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import type { EffectTemplateRegistry } from '../effects';
import { runTimings } from '../effects';
import { dealOpeningHandsAndQueueMulligan } from './applyChooseGoingFirst';

export interface AdvanceStartOfGameEffectsResult {
  state: GameState;
  log: GameLogEntry[];
}

export function advanceStartOfGameEffects(
  state: GameState,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  actionId: string | null,
): AdvanceStartOfGameEffectsResult {
  const setupState = state.setupState;
  if (!setupState || setupState.stage !== 'awaitingStartOfGameLeaderEffect') {
    return { state, log: [] };
  }
  // A suspended startOfGame ability's own PendingChoice (e.g. which Stage to
  // play) must resolve before advancing to the next queued player.
  if (state.pendingChoices.length > 0) {
    return { state, log: [] };
  }

  let current = state;
  const log: GameLogEntry[] = [];
  let queue = setupState.startOfGameEffectQueue ?? [];

  while (queue.length > 0) {
    const playerId = queue[0];
    queue = queue.slice(1);
    const player = current.players[playerId];
    const leaderInstance = player ? current.cardsById[player.leaderInstanceId] : undefined;
    const leaderDef = leaderInstance ? defs[leaderInstance.cardDefinitionId] : undefined;
    const program = leaderDef ? registry[leaderDef.cardNumber] : undefined;

    if (program && leaderInstance) {
      const fired = runTimings(program, ['startOfGame'], current, leaderInstance.instanceId, defs, actionId, registry);
      current = fired.state;
      log.push(...fired.log);
      if (fired.pendingChoices.length > 0) {
        return {
          state: {
            ...current,
            setupState: { ...setupState, startOfGameEffectQueue: queue },
            pendingChoices: [...current.pendingChoices, ...fired.pendingChoices],
          },
          log,
        };
      }
    }
  }

  if (!setupState.goingFirstPlayerId || !setupState.goingSecondPlayerId) {
    throw new Error('advanceStartOfGameEffects: goingFirstPlayerId/goingSecondPlayerId must be set before dealing opening hands.');
  }
  const dealt = dealOpeningHandsAndQueueMulligan(current, setupState.goingFirstPlayerId, setupState.goingSecondPlayerId, actionId);
  return { state: dealt.state, log: [...log, ...dealt.log] };
}
