/**
 * Fires the deferred [On Play] / entry abilities of Characters that entered
 * play together via a single effect (e.g. OP13-082 "play up to 5 {Five Elders}
 * … from your trash") but whose triggers were postponed because an earlier
 * card's On Play suspended on a player choice.
 *
 * Why this is needed: when several Characters enter play at once, the turn
 * player resolves each card's [On Play] in order (8-1-3). interpreter.ts's
 * finishWithCascade fires them from an in-memory queue, but the moment one On
 * Play emits a PendingChoice it must hand control back to the client — and that
 * ephemeral queue does not survive the round-trip, so the remaining cards'
 * triggers were being silently dropped. The fix mirrors pendingLifeTriggerTrash:
 * the not-yet-fired instance ids are persisted on
 * `GameState.pendingEntryTriggers`, and this function — called from dispatch.ts's
 * executeAction after every action, once no PendingChoice is outstanding — fires
 * them one at a time, in order, each pausing for its own input.
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import type { PendingChoice } from '../../events/pendingChoice';
import type { CardDefinitionLookup } from './definitions';
import { runTimings, type EffectTemplateRegistry } from '../../effects';

export interface SettleEntryTriggersResult {
  state: GameState;
  log: GameLogEntry[];
  /** Delta of newly-emitted PendingChoices (already merged into state), for the caller to surface. */
  pendingChoices: PendingChoice[];
}

export function settleEntryTriggers(
  state: GameState,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): SettleEntryTriggersResult {
  const queue = state.pendingEntryTriggers;
  if (!queue || queue.length === 0) return { state, log: [], pendingChoices: [] };
  // Something else is still mid-resolution (an outstanding choice). Wait for it
  // to clear before firing the next queued On Play — we fire strictly one chain
  // at a time so the turn player never juggles two triggers at once.
  if (state.pendingChoices.length > 0) return { state, log: [], pendingChoices: [] };

  let working: GameState = { ...state, pendingEntryTriggers: [] };
  let log: GameLogEntry[] = [];
  const remaining = [...queue];
  let guard = 0;

  while (remaining.length > 0 && guard++ < 200) {
    const instanceId = remaining.shift()!;
    const inst = working.cardsById[instanceId];
    const program = inst ? registry[inst.cardDefinitionId] : undefined;
    // Card left the field (K.O.'d by a prior sibling's On Play, bounced, etc.)
    // or has no entry ability — nothing to fire, just stop tracking it.
    if (!program?.abilities.some((a) => a.timing === 'onEnterPlay' || a.timing === 'onPlay')) continue;

    const fired = runTimings(program, ['onEnterPlay', 'onPlay'], working, instanceId, defs, actionId, registry);
    working = fired.state;
    log = [...log, ...fired.log];

    if (fired.pendingChoices.length > 0) {
      // This card's On Play suspended again — persist the still-unfired siblings
      // (ahead of any that this resolution itself deferred) and hand the choice
      // back. This function runs again on the next action, once it resolves.
      const persisted: GameState = {
        ...working,
        pendingEntryTriggers: [...remaining, ...(working.pendingEntryTriggers ?? [])],
      };
      return { state: persisted, log, pendingChoices: fired.pendingChoices };
    }
  }

  return { state: working, log, pendingChoices: [] };
}
