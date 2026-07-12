/**
 * Completes the "trash instead of keeping in hand" half of a Life [Trigger]
 * activation (10-1-5-2) once every PendingChoice belonging to that card's own
 * ability chain has resolved.
 *
 * Why this can't happen synchronously right where the player answers "yes,
 * activate": the triggered ability itself can suspend on further player
 * choices (any optional targeted clause — addPower, ko, rest, chooseOne,
 * playFromHand, etc. — whenever at least one eligible target exists). Those
 * follow-up choices resolve through the generic interpreter suspend/resume
 * path (resumeChoice in effects/fireTiming.ts), which has no notion of "this
 * chain started from a Life Trigger, remember to trash the source after."
 *
 * Fix shape: `GameState.pendingLifeTriggerTrash` records the card's instance
 * id the moment the player activates its Trigger. This function is called
 * from dispatch.ts's executeAction after EVERY action (the same
 * "single choke point" pattern fireCharacterKoedReactions uses for K.O.
 * reactions) and, for each pending id, checks whether any PendingChoice still
 * references that instance as its source. If none do, the chain is fully
 * resolved: move the card hand -> trash if it's still sitting in hand (an
 * ability that played/moved the card itself, e.g. [Trigger] triggerPlaySelf,
 * will have already moved it elsewhere, so this is a no-op for those).
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import { createActionLogger } from './actionLogger';
import { addToZoneTop, removeFromZone } from './zoneOps';

export interface SettleLifeTriggerTrashResult {
  state: GameState;
  log: GameLogEntry[];
}

export function settleLifeTriggerTrash(state: GameState, actionId: string | null): SettleLifeTriggerTrashResult {
  const pending = state.pendingLifeTriggerTrash;
  if (!pending || pending.length === 0) return { state, log: [] };

  const stillWaiting = new Set(
    state.pendingChoices.map((c) => c.sourceInstanceId).filter((id): id is string => id !== null),
  );

  const logger = createActionLogger(state, actionId);
  let working = state;
  const remaining: string[] = [];

  for (const cardId of pending) {
    if (stillWaiting.has(cardId)) {
      remaining.push(cardId);
      continue;
    }
    const inst = working.cardsById[cardId];
    if (inst && inst.currentZone === 'hand') {
      const owner = working.players[inst.ownerId];
      working = {
        ...working,
        players: {
          ...working.players,
          [inst.ownerId]: {
            ...owner,
            hand: removeFromZone(owner.hand, cardId),
            trash: addToZoneTop(owner.trash, cardId),
          },
        },
        cardsById: { ...working.cardsById, [cardId]: { ...inst, currentZone: 'trash', revealedTo: 'all' } },
      };
      logger.push({
        actorPlayerId: inst.ownerId,
        type: 'CARD_MOVED',
        message: `'${cardId}' was trashed after its Life [Trigger] resolved (10-1-5-2).`,
        data: { instanceId: cardId, from: 'hand', to: 'trash' },
        relatedCardInstanceIds: [cardId],
        visibility: 'public',
      });
    }
    // Not in hand anymore (e.g. the ability played it via triggerPlaySelf) — nothing to do, just stop tracking it.
  }

  if (remaining.length === pending.length && logger.log.length === 0) {
    // Nothing resolved this pass — avoid a needless state churn.
    return { state, log: [] };
  }

  return {
    state: { ...working, pendingLifeTriggerTrash: remaining, log: [...working.log, ...logger.log] },
    log: logger.log,
  };
}
