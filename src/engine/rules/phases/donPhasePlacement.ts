/**
 * DON!! Phase placement routing (OP13-003):
 * If the turn player already had any DON!! on the field before placement,
 * give 1 of the newly placed DON!! cards to their Leader.
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import { createActionLogger } from '../shared/actionLogger';
import { fieldDonIds } from '../../effects/abilityCost';

export function hasDonPhasePlacementRouting(state: GameState, playerId: string): boolean {
  return state.continuousEffects.some(
    (record) =>
      record.donPhasePlacement?.appliesToControllerId === playerId &&
      record.donPhasePlacement.attachOneToLeaderIfFieldDon,
  );
}

export interface DonPhasePlacementResult {
  state: GameState;
  log: GameLogEntry[];
}

/**
 * Attach one newly placed DON!! to the Leader when routing applies.
 * `hadFieldDonBeforePlacement` must be computed from the pre-placement state.
 */
export function applyDonPhasePlacementRouting(
  state: GameState,
  playerId: string,
  newlyPlacedDonIds: string[],
  hadFieldDonBeforePlacement: boolean,
): DonPhasePlacementResult {
  if (!hadFieldDonBeforePlacement || newlyPlacedDonIds.length === 0) {
    return { state, log: [] };
  }
  if (!hasDonPhasePlacementRouting(state, playerId)) {
    return { state, log: [] };
  }

  const player = state.players[playerId];
  const leaderId = player?.leaderInstanceId;
  const donId = newlyPlacedDonIds[0];
  if (!player || !leaderId || !donId) return { state, log: [] };

  const leader = state.cardsById[leaderId];
  const don = state.cardsById[donId];
  if (!leader || !don) return { state, log: [] };
  if (leader.donAttached.includes(donId)) return { state, log: [] };
  // Newly placed DON!! must still be unattached in the cost area.
  if (!player.costArea.cardIds.includes(donId)) return { state, log: [] };

  const logger = createActionLogger(state, null);
  const cardsById = {
    ...state.cardsById,
    [leaderId]: { ...leader, donAttached: [...leader.donAttached, donId] },
  };

  logger.push({
    actorPlayerId: playerId,
    type: 'DON_GIVEN',
    message: `${playerId} gave 1 DON!! placed during the DON!! Phase to their Leader (field already had DON!!).`,
    data: {
      count: 1,
      targetInstanceId: leaderId,
      donInstanceIds: [donId],
      reason: 'donPhasePlacement',
      fieldDonBefore: fieldDonIds(state, playerId).length,
    },
    relatedCardInstanceIds: [leaderId, donId],
    visibility: 'public',
  });

  return {
    state: { ...state, cardsById, log: [...state.log, ...logger.log] },
    log: logger.log,
  };
}
