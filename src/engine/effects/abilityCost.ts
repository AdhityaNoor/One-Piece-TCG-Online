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

function trashThisSourceZone(currentZone: string): 'characterArea' | 'stageArea' | null {
  return currentZone === 'characterArea' || currentZone === 'stageArea' ? currentZone : null;
}

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

function activeDonIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  const attached = new Set<string>();
  for (const inst of Object.values(state.cardsById)) {
    if (inst.controllerId !== playerId) continue;
    for (const donId of inst.donAttached) attached.add(donId);
  }
  return player.costArea.cardIds.filter((id) => !attached.has(id) && state.cardsById[id]?.donRested === false);
}

/** DON!! candidates for paying DON!! −N costs (active-only when any cost requires it). */
export function donMinusCandidateIds(state: GameState, playerId: string, costs: AbilityCost[]): string[] {
  const activeOnly = costs.some((c) => c.kind === 'donMinus' && c.activeOnly);
  return activeOnly ? activeDonIds(state, playerId) : fieldDonIds(state, playerId);
}

export function countControllerActiveUnattachedDon(state: GameState, playerId: string): number {
  return activeDonIds(state, playerId).length;
}

function activeDonCount(state: GameState, playerId: string): number {
  return activeDonIds(state, playerId).length;
}

export function requiredDonMinusCount(costs: AbilityCost[] = []): number {
  return costs
    .filter((cost): cost is Extract<AbilityCost, { kind: 'donMinus' }> => cost.kind === 'donMinus')
    .reduce((sum, cost) => sum + cost.count, 0);
}

/** Auto-pick field DON!! for nested/free activations that cannot prompt for DON!! −N selection. */
export function autoSelectDonMinusIds(state: GameState, playerId: string, costs: AbilityCost[] = []): string[] {
  const selected: string[] = [];
  const used = new Set<string>();
  for (const cost of costs) {
    if (cost.kind !== 'donMinus') continue;
    const candidates = cost.activeOnly ? activeDonIds(state, playerId) : fieldDonIds(state, playerId);
    let pickedForCost = 0;
    for (const id of candidates) {
      if (used.has(id)) continue;
      selected.push(id);
      used.add(id);
      pickedForCost += 1;
      if (pickedForCost >= cost.count) break;
    }
  }
  return selected;
}

export function canPayAbilityCost(
  state: GameState,
  sourceInstanceId: string,
  playerId: string,
  costs: AbilityCost[],
  selectedDonMinusIds: readonly string[] = [],
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
  const activeDon = new Set(activeDonIds(state, playerId));
  for (const donId of uniqueSelectedDon) {
    const donInstance = state.cardsById[donId];
    if (!donInstance || donInstance.ownerId !== playerId || !fieldDon.has(donId)) {
      reasons.push(`'${donId}' is not one of ${playerId}'s DON!! cards on the field.`);
    }
  }

  let selectedCursor = 0;
  for (const cost of costs) {
    switch (cost.kind) {
      case 'donMinus': {
        const selectedForCost = selectedDonMinusIds.slice(selectedCursor, selectedCursor + cost.count);
        selectedCursor += cost.count;
        const available = cost.activeOnly ? activeDon.size : fieldDonIds(state, playerId).length;
        if (available < cost.count) {
          reasons.push(`Cost requires returning ${cost.count}${cost.activeOnly ? ' active' : ''} DON!! but only ${available} are available.`);
        }
        if (cost.activeOnly) {
          const inactive = selectedForCost.filter((id) => !activeDon.has(id));
          if (inactive.length > 0) reasons.push('Cost requires active DON!! from the cost area.');
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
      case 'trashThis': {
        const source = state.cardsById[sourceInstanceId];
        if (!source) {
          reasons.push('Cost requires trashing the source card, but it is not in play.');
        } else if (source.currentZone === 'trash') {
          // already trashed (e.g. Event moved to trash before paying [Main] ability cost)
        } else if (trashThisSourceZone(source.currentZone) === null) {
          reasons.push('Cost requires trashing the source card, but it is not in play.');
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
      case 'restLeader': {
        const leaderId = state.players[playerId]?.leaderInstanceId;
        const leader = leaderId ? state.cardsById[leaderId] : undefined;
        if (!leader || leader.orientation !== 'active') {
          reasons.push('Cost requires resting your Leader, but it is already rested or not in play.');
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
  selectedDonMinusIds: readonly string[] = [],
): { state: GameState; log: GameLogEntry[]; restedInstanceIds: string[]; returnedDonCount: number } {
  const logger = createActionLogger(state, actionId);
  let working = state;
  let selectedCursor = 0;
  const restedInstanceIds: string[] = [];
  let returnedDonCount = 0;

  for (const cost of costs) {
    switch (cost.kind) {
      case 'donMinus': {
        const selected = selectedDonMinusIds.slice(selectedCursor, selectedCursor + cost.count);
        selectedCursor += cost.count;
        returnedDonCount += selected.length;
        working = payDonMinus(working, playerId, selected, logger);
        break;
      }
      case 'restThis': {
        const source = working.cardsById[sourceInstanceId];
        if (source?.orientation === 'active') restedInstanceIds.push(sourceInstanceId);
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
      case 'trashThis': {
        const source = working.cardsById[sourceInstanceId];
        if (!source) break;
        if (source.currentZone === 'trash') break;
        const owner = working.players[source.ownerId];
        const fromZone = source.currentZone;
        const sourceZone = trashThisSourceZone(fromZone);
        if (!owner || sourceZone === null) break;
        working = {
          ...working,
          players: {
            ...working.players,
            [source.ownerId]: {
              ...owner,
              [sourceZone]: removeFromZone(owner[sourceZone], sourceInstanceId),
              trash: addToZoneTop(owner.trash, sourceInstanceId),
            },
          },
          cardsById: {
            ...working.cardsById,
            [sourceInstanceId]: { ...source, currentZone: 'trash', donAttached: [], revealedTo: 'all' },
          },
          continuousEffects: working.continuousEffects.filter((ce) => ce.sourceInstanceId !== sourceInstanceId),
        };
        logger.push({
          actorPlayerId: playerId,
          type: 'CARD_MOVED',
          message: `${playerId} trashed '${sourceInstanceId}' as an activation cost (from ${fromZone}).`,
          data: { from: fromZone, to: 'trash', instanceId: sourceInstanceId },
          relatedCardInstanceIds: [sourceInstanceId],
          visibility: 'public',
        });
        break;
      }
      case 'restDon': {
        working = payRestDon(working, playerId, cost.count, logger);
        break;
      }
      case 'restLeader': {
        const leaderId = working.players[playerId]?.leaderInstanceId;
        const leader = leaderId ? working.cardsById[leaderId] : undefined;
        if (leaderId && leader?.orientation === 'active') {
          restedInstanceIds.push(leaderId);
          working = {
            ...working,
            cardsById: { ...working.cardsById, [leaderId]: { ...leader, orientation: 'rested' } },
          };
          logger.push({
            actorPlayerId: playerId,
            type: 'CARD_RESTED',
            message: `${playerId} rested their Leader as an activation cost.`,
            data: { sourceInstanceId: leaderId },
            relatedCardInstanceIds: [leaderId],
            visibility: 'public',
          });
        }
        break;
      }
    }
  }

  return { state: { ...working, log: [...working.log, ...logger.log] }, log: logger.log, restedInstanceIds, returnedDonCount };
}

export function payDonMinus(
  state: GameState,
  playerId: string,
  toReturn: readonly string[],
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
    relatedCardInstanceIds: [...toReturn],
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
