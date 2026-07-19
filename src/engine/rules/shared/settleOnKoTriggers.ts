/**
 * Fires deferred [On K.O.] abilities (10-2-17) that were postponed because the
 * effect which K.O.'d the Character suspended on a later player choice.
 *
 * Why: interpreter finishWithCascade keeps K.O.'d instance ids on an in-memory
 * EffectContextImpl queue. When that resolution emits a PendingChoice after the
 * K.O. (e.g. OP14-079's optional −cost / mill after paying a K.O. cost, or a
 * Leader that K.O.s an ally then asks for another target), the queue is lost
 * across the client round-trip and the ally's [On K.O.] never fires.
 *
 * Mirrors pendingEntryTriggers / settleEntryTriggers: events are persisted on
 * GameState.pendingOnKoTriggers, and this function — called from dispatch after
 * every action once no choice is outstanding — fires them one at a time.
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import type { PendingChoice } from '../../events/pendingChoice';
import type { CardDefinitionLookup } from './definitions';
import { fireOnKO, type EffectTemplateRegistry } from '../../effects';

export interface SettleOnKoTriggersResult {
  state: GameState;
  log: GameLogEntry[];
  pendingChoices: PendingChoice[];
}

export function settleOnKoTriggers(
  state: GameState,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): SettleOnKoTriggersResult {
  const queue = state.pendingOnKoTriggers;
  if (!queue || queue.length === 0) return { state, log: [], pendingChoices: [] };
  if (state.pendingChoices.length > 0) return { state, log: [], pendingChoices: [] };

  let working: GameState = { ...state, pendingOnKoTriggers: [] };
  let log: GameLogEntry[] = [];
  const remaining = [...queue];
  let guard = 0;

  while (remaining.length > 0 && guard++ < 200) {
    const event = remaining.shift()!;
    const inst = working.cardsById[event.targetInstanceId];
    // Card must still be in trash (true K.O.); if it left somehow, drop it.
    if (!inst || inst.currentZone !== 'trash') continue;

    const fired = fireOnKO(working, event.targetInstanceId, registry, defs, actionId, {
      cause: event.cause,
      sourceInstanceId: event.sourceInstanceId,
    });
    working = fired.state;
    log = [...log, ...fired.log];

    if (fired.pendingChoices.length > 0) {
      const persisted: GameState = {
        ...working,
        pendingOnKoTriggers: [...remaining, ...(working.pendingOnKoTriggers ?? [])],
      };
      return { state: persisted, log, pendingChoices: fired.pendingChoices };
    }
  }

  return { state: working, log, pendingChoices: [] };
}
