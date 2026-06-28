/**
 * ACTIVATE_EVENT_MAIN (2-7-3, 10-2-3). Main Phase, turn-player-only.
 *
 * KNOWN LIMITATION (project decision: "stub everything" for card effects):
 * this handler pays the Event's cost and moves it hand -> trash (8-1,
 * Events resolve then trash), but the Event's actual effect TEXT never
 * executes — there is no effect-template system yet. Playing an Event this
 * milestone is mechanically a no-op beyond cost payment + the card leaving
 * the hand. Revisit once /src/cards/effectTemplates exists.
 *
 * No fresh-instance minting here: 3-1-6 only requires it for cards
 * entering/leaving the Character or Stage area: an Event never enters
 * either, going straight from hand to trash.
 */
import type { GameState } from '../../state/game';
import type { ActivateEventMainAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../../rules/shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../../rules/shared/definitions';
import { computeCurrentCost } from '../../rules/shared/power';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validateActivateEventMain(state: GameState, action: ActivateEventMainAction, defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('ACTIVATE_EVENT_MAIN is only legal during the Main Phase (2-7-3).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may activate a [Main] Event (2-7-3).');
  }
  const player = state.players[action.playerId];
  if (!player) {
    reasons.push(`Unknown playerId '${action.playerId}'.`);
    return { legal: false, reasons };
  }

  const handInstance = state.cardsById[action.handCardInstanceId];
  if (!handInstance || handInstance.currentZone !== 'hand' || handInstance.ownerId !== action.playerId) {
    reasons.push(`'${action.handCardInstanceId}' is not in ${action.playerId}'s hand.`);
    return { legal: false, reasons };
  }

  const def = defs[handInstance.cardDefinitionId];
  if (!def) {
    reasons.push(`No CardDefinition found for '${handInstance.cardDefinitionId}'.`);
    return { legal: false, reasons };
  }
  if (def.category !== 'event') {
    reasons.push(`'${def.name}' is a ${def.category}, not an Event.`);
  }

  const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
  if (action.donInstanceIds.length !== cost) {
    reasons.push(`'${def.name}' costs ${cost} DON!!, but ${action.donInstanceIds.length} were supplied (2-7-3).`);
  }

  const uniqueDonIds = new Set(action.donInstanceIds);
  if (uniqueDonIds.size !== action.donInstanceIds.length) {
    reasons.push('donInstanceIds must not contain duplicates.');
  }
  for (const donId of uniqueDonIds) {
    const donInstance = state.cardsById[donId];
    if (!donInstance || donInstance.currentZone !== 'costArea' || donInstance.ownerId !== action.playerId) {
      reasons.push(`'${donId}' is not an active DON!! in ${action.playerId}'s cost area.`);
    } else if (donInstance.donRested === true) {
      reasons.push(`'${donId}' is already rested and cannot pay a cost.`);
    }
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeActivateEventMain(state: GameState, action: ActivateEventMainAction, defs: CardDefinitionLookup): ActionExecuteResult {
  const player = state.players[action.playerId];
  const handInstance = state.cardsById[action.handCardInstanceId];
  const def = getDefinition(defs, handInstance);
  const logger = createActionLogger(state, action.actionId);

  const cardsById = { ...state.cardsById };
  for (const donId of action.donInstanceIds) {
    cardsById[donId] = { ...cardsById[donId], donRested: true };
  }
  cardsById[action.handCardInstanceId] = { ...cardsById[action.handCardInstanceId], currentZone: 'trash' };

  const newHand = removeFromZone(player.hand, action.handCardInstanceId);
  const newTrash = addToZoneTop(player.trash, action.handCardInstanceId);
  const newPlayer = { ...player, hand: newHand, trash: newTrash };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'EFFECT_ACTIVATED',
    message: `${action.playerId} activated ${def.name} (cost ${action.donInstanceIds.length}) — effect text not executed (stubbed this milestone).`,
    data: { from: 'hand', to: 'trash', cost: action.donInstanceIds.length, donInstanceIds: action.donInstanceIds, effectStubbed: true },
    relatedCardInstanceIds: [action.handCardInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    players: { ...state.players, [action.playerId]: newPlayer },
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices: [] };
}
