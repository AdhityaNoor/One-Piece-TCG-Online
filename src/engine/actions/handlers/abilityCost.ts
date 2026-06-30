/**
 * Ability cost payment — validation and execution for structured AbilityCost
 * values (effectIr.ts). Called by activateCardEffect.ts before the effect
 * resolves (8-3-1-5).
 *
 * Supported cost kinds (effectIr.ts: AbilityCost):
 *   donMinus  — return N DON!! from the field (costArea) to the DON!! deck.
 *   restThis  — rest the source card.
 *   restDon   — rest N active DON!! cards in the cost area.
 *
 * All functions are pure (no mutation); payAbilityCost returns a new state.
 */
import type { GameState } from '../../state/game';
import type { AbilityCost } from '../../effects/effectIr';
import type { GameLogEntry } from '../../logs/logEntry';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../../rules/shared/zoneOps';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** DON!! ids in the player's cost area that are NOT currently given (attached) to a card. */
function freeDonIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  const attachedSet = new Set<string>(
    Object.values(state.cardsById).flatMap((c) => c.donAttached),
  );
  return player.costArea.cardIds.filter((id) => !attachedSet.has(id));
}

/** Count of active (non-rested) DON!! in the cost area. */
function activeDonCount(state: GameState, playerId: string): number {
  const player = state.players[playerId];
  if (!player) return 0;
  return player.costArea.cardIds.filter((id) => state.cardsById[id]?.donRested === false).length;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Returns an array of human-readable failure reasons (empty = can pay).
 * Called from validateActivateCardEffect so errors surface before dispatch.
 */
export function canPayAbilityCost(
  state: GameState,
  sourceInstanceId: string,
  playerId: string,
  costs: AbilityCost[],
): string[] {
  const reasons: string[] = [];
  for (const cost of costs) {
    switch (cost.kind) {
      case 'donMinus': {
        // Prefer returning free DON!!; fall back to all costArea if needed.
        const available = Math.max(freeDonIds(state, playerId).length, state.players[playerId]?.costArea.cardIds.length ?? 0);
        if (available < cost.count) {
          reasons.push(`Cost requires returning ${cost.count} DON!! but only ${available} are available in the cost area.`);
        }
        break;
      }
      case 'restThis': {
        const source = state.cardsById[sourceInstanceId];
        if (!source || source.orientation !== 'active') {
          reasons.push(`Cost requires resting the source card, but it is already rested or not in play.`);
        }
        break;
      }
      case 'restDon': {
        const active = activeDonCount(state, playerId);
        if (active < cost.count) {
          reasons.push(`Cost requires resting ${cost.count} active DON!! but only ${active} are available.`);
        }
        break;
      }
    }
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export function payAbilityCost(
  state: GameState,
  sourceInstanceId: string,
  playerId: string,
  costs: AbilityCost[],
  actionId: string,
): { state: GameState; log: GameLogEntry[] } {
  const logger = createActionLogger(state, actionId);
  let working = state;

  for (const cost of costs) {
    switch (cost.kind) {
      case 'donMinus': {
        working = payDonMinus(working, playerId, cost.count, logger);
        break;
      }
      case 'restThis': {
        const source = working.cardsById[sourceInstanceId];
        working = {
          ...working,
          cardsById: { ...working.cardsById, [sourceInstanceId]: { ...source, orientation: 'rested' } },
        };
        logger.push({
          actorPlayerId: playerId,
          type: 'CARD_RESTED',
          message: `${playerId} rested '${sourceInstanceId}' as an activation cost.`,
          data: { sourceInstanceId },
          relatedCardInstanceIds: [sourceInstanceId],
          visibility: 'public',
        });
        break;
      }
      case 'restDon': {
        working = payRestDon(working, playerId, cost.count, logger);
        break;
      }
    }
  }

  return { state: { ...working, log: [...working.log, ...logger.log] }, log: logger.log };
}

// ---------------------------------------------------------------------------
// donMinus helper
// ---------------------------------------------------------------------------

function payDonMinus(
  state: GameState,
  playerId: string,
  count: number,
  logger: ReturnType<typeof createActionLogger>,
): GameState {
  const player = state.players[playerId];
  // Prefer free (unattached) DON!! first; if not enough, take any from costArea.
  const free = freeDonIds(state, playerId);
  const toReturn: string[] = free.length >= count
    ? free.slice(0, count)
    : player.costArea.cardIds.slice(0, count);

  let cardsById = { ...state.cardsById };
  let costArea = player.costArea;
  let donDeck = player.donDeck;

  for (const donId of toReturn) {
    costArea = removeFromZone(costArea, donId);
    donDeck = addToZoneTop(donDeck, donId);
    // Clear any donRested/donAttached traces and update zone.
    cardsById = {
      ...cardsById,
      [donId]: { ...cardsById[donId], currentZone: 'donDeck', donRested: false },
    };
    // Remove from any character's donAttached list.
    for (const [id, inst] of Object.entries(cardsById)) {
      if (inst.donAttached.includes(donId)) {
        cardsById = { ...cardsById, [id]: { ...inst, donAttached: inst.donAttached.filter((d) => d !== donId) } };
      }
    }
  }

  logger.push({
    actorPlayerId: playerId,
    type: 'DON_RETURNED',
    message: `${playerId} returned ${count} DON!! to the DON!! deck as an activation cost.`,
    data: { donInstanceIds: toReturn },
    relatedCardInstanceIds: toReturn,
    visibility: 'public',
  });

  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [playerId]: { ...player, costArea, donDeck },
    },
  };
}

// ---------------------------------------------------------------------------
// restDon helper
// ---------------------------------------------------------------------------

function payRestDon(
  state: GameState,
  playerId: string,
  count: number,
  logger: ReturnType<typeof createActionLogger>,
): GameState {
  const player = state.players[playerId];
  const activeDonInstanceIds = player.costArea.cardIds
    .filter((id) => state.cardsById[id]?.donRested === false)
    .slice(0, count);

  let cardsById = { ...state.cardsById };
  for (const donId of activeDonInstanceIds) {
    cardsById = { ...cardsById, [donId]: { ...cardsById[donId], donRested: true } };
  }

  logger.push({
    actorPlayerId: playerId,
    type: 'DON_RESTED',
    message: `${playerId} rested ${count} DON!! as an activation cost.`,
    data: { donInstanceIds: activeDonInstanceIds },
    relatedCardInstanceIds: activeDonInstanceIds,
    visibility: 'public',
  });

  return { ...state, cardsById };
}
