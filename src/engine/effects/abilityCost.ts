/**
 * Ability cost payment for structured AbilityCost values (effectIr.ts).
 *
 * This lives in /effects because both explicit action handlers and automatic
 * triggered effect resolution need the same cost semantics.
 */
import type { GameState } from '../state/game';
import type { AbilityCost } from './effectIr';
import type { GameLogEntry } from '../logs/logEntry';
import { createActionLogger } from '../rules/shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';

export function fieldDonIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  const ids = new Set(player.costArea.cardIds);
  for (const inst of Object.values(state.cardsById)) {
    if (inst.controllerId !== playerId) continue;
    for (const donId of inst.donAttached) {
      const don = state.cardsById[donId];
      if (don?.ownerId === playerId) ids.add(donId);
    }
  }
  return [...ids];
}

function activeDonCount(state: GameState, playerId: string): number {
  const player = state.players[playerId];
  if (!player) return 0;
  return player.costArea.cardIds.filter((id) => state.cardsById[id]?.donRested === false).length;
}

export function requiredDonMinusCount(costs: AbilityCost[] = []): number {
  return costs
    .filter((cost): cost is Extract<AbilityCost, { kind: 'donMinus' }> => cost.kind === 'donMinus')
    .reduce((sum, cost) => sum + cost.count, 0);
}

export function canPayAbilityCost(
  state: GameState,
  sourceInstanceId: string,
  playerId: string,
  costs: AbilityCost[],
  selectedDonMinusIds: string[] = [],
): string[] {
  const reasons: string[] = [];
  const requiredDonMinus = requiredDonMinusCount(costs);
  if (selectedDonMinusIds.length !== requiredDonMinus) {
    reasons.push(`Cost requires selecting ${requiredDonMinus} DON!! to return, but ${selectedDonMinusIds.length} were supplied.`);
  }
  const uniqueSelectedDon = new Set(selectedDonMinusIds);
  if (uniqueSelectedDon.size !== selectedDonMinusIds.length) {
    reasons.push('Selected DON!! for DON!! -N costs must not contain duplicates.');
  }
  const fieldDon = new Set(fieldDonIds(state, playerId));
  for (const donId of uniqueSelectedDon) {
    const donInstance = state.cardsById[donId];
    if (!donInstance || donInstance.ownerId !== playerId || !fieldDon.has(donId)) {
      reasons.push(`'${donId}' is not one of ${playerId}'s DON!! cards on the field.`);
    }
  }

  for (const cost of costs) {
    switch (cost.kind) {
      case 'donMinus': {
        const available = fieldDonIds(state, playerId).length;
        if (available < cost.count) {
          reasons.push(`Cost requires returning ${cost.count} DON!! but only ${available} are on the field.`);
        }
        break;
      }
      case 'restThis': {
        const source = state.cardsById[sourceInstanceId];
        if (!source || source.orientation !== 'active') {
          reasons.push('Cost requires resting the source card, but it is already rested or not in play.');
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

export function payAbilityCost(
  state: GameState,
  sourceInstanceId: string,
  playerId: string,
  costs: AbilityCost[],
  actionId: string | null,
  selectedDonMinusIds: string[] = [],
): { state: GameState; log: GameLogEntry[] } {
  const logger = createActionLogger(state, actionId);
  let working = state;
  let selectedCursor = 0;

  for (const cost of costs) {
    switch (cost.kind) {
      case 'donMinus': {
        const selected = selectedDonMinusIds.slice(selectedCursor, selectedCursor + cost.count);
        selectedCursor += cost.count;
        working = payDonMinus(working, playerId, selected, logger);
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

function payDonMinus(
  state: GameState,
  playerId: string,
  toReturn: string[],
  logger: ReturnType<typeof createActionLogger>,
): GameState {
  const player = state.players[playerId];
  let cardsById = { ...state.cardsById };
  let costArea = player.costArea;
  let donDeck = player.donDeck;

  for (const donId of toReturn) {
    costArea = removeFromZone(costArea, donId);
    donDeck = addToZoneTop(donDeck, donId);
    cardsById = {
      ...cardsById,
      [donId]: { ...cardsById[donId], currentZone: 'donDeck', donRested: false },
    };
    for (const [id, inst] of Object.entries(cardsById)) {
      if (inst.donAttached.includes(donId)) {
        cardsById = { ...cardsById, [id]: { ...inst, donAttached: inst.donAttached.filter((d) => d !== donId) } };
      }
    }
  }

  logger.push({
    actorPlayerId: playerId,
    type: 'DON_RETURNED',
    message: `${playerId} returned ${toReturn.length} DON!! to the DON!! deck as an activation cost.`,
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
