/**
 * 3-7-6-1: playing a Character while the Character Area is already full is LEGAL — the extra card
 * enters play and one Character is then trashed to bring the area back to its limit. That trash is
 * a rule action, not a K.O.: no [On K.O.] fires, and the card is simply moved to the trash with
 * its given DON!! released (giving DON!! never moved it out of the cost area — see card.ts's
 * CardInstance.donRested doc comment — so there is nothing to reconcile there).
 *
 * Two paths reach it and must behave identically, which is why the move lives here rather than
 * inline in either of them:
 *  - the player named the replacement up front (PLAY_CHARACTER's `replaceInstanceId`), or
 *  - the engine raised the 'rule:characterAreaOverflow' PendingChoice and the player answered it.
 */
import type { GameState } from '../../state/game';
import type { ActionLogger } from './actionLogger';
import { addToZoneTop, removeFromZone } from './zoneOps';

/**
 * Move `instanceId` from `playerId`'s Character Area to their trash to satisfy the 5-card limit,
 * pushing the CARD_MOVED entry onto `logger`.
 *
 * A no-op if the card is no longer in that area — an [On Play] effect resolving from the same
 * play can K.O. or bounce it first. Deliberately does NOT re-check the limit before moving: the
 * PendingChoice path never has, so the pre-chosen path must not either, or the two would drift.
 */
export function trashForCharacterAreaLimit(
  state: GameState,
  playerId: string,
  instanceId: string,
  logger: ActionLogger,
): GameState {
  const player = state.players[playerId];
  const instance = state.cardsById[instanceId];
  if (!player || !instance || !player.characterArea.cardIds.includes(instanceId)) return state;

  logger.push({
    actorPlayerId: playerId,
    type: 'CARD_MOVED',
    message: `${playerId} trashed '${instanceId}' to satisfy the Character Area limit (3-7-6-1).`,
    data: { from: 'characterArea', to: 'trash' },
    relatedCardInstanceIds: [instanceId],
    visibility: 'public',
  });

  return {
    ...state,
    cardsById: { ...state.cardsById, [instanceId]: { ...instance, currentZone: 'trash', donAttached: [] } },
    players: {
      ...state.players,
      [playerId]: {
        ...player,
        characterArea: removeFromZone(player.characterArea, instanceId),
        trash: addToZoneTop(player.trash, instanceId),
      },
    },
  };
}
