/**
 * PLAY_STAGE (6-5-3-1, 2-7-4). Main Phase, turn-player-only.
 *
 * 3-8-5: the Stage area holds at most 1 card — playing a new Stage while
 * one is already in play immediately trashes the old one (no PendingChoice;
 * unlike the Character-area overflow, there's never a choice to make here).
 * The displaced old Stage keeps its existing instanceId when moving to
 * trash: 3-1-6's "fresh instance on zone change" matters for cards that
 * might re-enter the Character/Stage area later under a NEW play action
 * (which mints its own fresh id then) — a card already headed to trash for
 * good doesn't need a fresh id along the way.
 */
import type { GameState } from '../../state/game';
import type { CardInstance } from '../../state/card';
import type { PlayStageAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../../rules/shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../../rules/shared/definitions';
import { computeCurrentCost } from '../../rules/shared/power';
import { mintRuntimeInstanceId } from '../../rules/shared/mintInstance';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validatePlayStage(state: GameState, action: PlayStageAction, defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('PLAY_STAGE is only legal during the Main Phase (6-5-3-1).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may play a Stage (6-5-3-1).');
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
  if (def.category !== 'stage') {
    reasons.push(`'${def.name}' is a ${def.category}, not a Stage.`);
  }

  const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
  if (action.donInstanceIds.length !== cost) {
    reasons.push(`'${def.name}' costs ${cost} DON!!, but ${action.donInstanceIds.length} were supplied (2-7-4).`);
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

export function executePlayStage(state: GameState, action: PlayStageAction, defs: CardDefinitionLookup): ActionExecuteResult {
  const player = state.players[action.playerId];
  const handInstance = state.cardsById[action.handCardInstanceId];
  const def = getDefinition(defs, handInstance);
  const logger = createActionLogger(state, action.actionId);

  let cardsById = { ...state.cardsById };

  for (const donId of action.donInstanceIds) {
    cardsById[donId] = { ...cardsById[donId], donRested: true };
  }

  let trash = player.trash;
  const displacedStageId = player.stageArea.cardIds[0];
  if (displacedStageId) {
    cardsById[displacedStageId] = { ...cardsById[displacedStageId], currentZone: 'trash' };
    trash = addToZoneTop(trash, displacedStageId);
    logger.push({
      actorPlayerId: action.playerId,
      type: 'CARD_MOVED',
      message: `${action.playerId}'s previous Stage was trashed to make room for a new one (3-8-5).`,
      data: { from: 'stageArea', to: 'trash' },
      relatedCardInstanceIds: [displacedStageId],
      visibility: 'public',
    });
  }

  const minted = mintRuntimeInstanceId(state);
  const newInstanceId = minted.id;
  const newInstance: CardInstance = {
    instanceId: newInstanceId,
    cardDefinitionId: handInstance.cardDefinitionId,
    ownerId: action.playerId,
    controllerId: action.playerId,
    currentZone: 'stageArea',
    orientation: null, // TODO (blueprint Section 19): unconfirmed whether Stage cards carry Active/Rested state at all.
    faceState: 'faceUp',
    donAttached: [],
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: false, // Stage cards never attack
    revealedTo: 'all', // 3-8-2, open zone
  };

  cardsById = { ...cardsById, [newInstanceId]: newInstance };
  delete cardsById[action.handCardInstanceId];

  const newHand = removeFromZone(player.hand, action.handCardInstanceId);
  const newStageArea = addToZoneBottom({ ...player.stageArea, cardIds: [] }, newInstanceId);

  const newPlayer = { ...player, hand: newHand, stageArea: newStageArea, trash };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'CARD_PLAYED',
    message: `${action.playerId} played ${def.name} as a Stage (cost ${action.donInstanceIds.length}).`,
    data: { from: 'hand', to: 'stageArea', cost: action.donInstanceIds.length, donInstanceIds: action.donInstanceIds, oldInstanceId: action.handCardInstanceId },
    relatedCardInstanceIds: [newInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    players: { ...state.players, [action.playerId]: newPlayer },
    nextInstanceSeq: minted.state.nextInstanceSeq,
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices: [] };
}
