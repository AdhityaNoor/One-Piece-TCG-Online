/**
 * PLAY_CHARACTER (6-5-3-1, 2-7-2). Main Phase, turn-player-only.
 *
 * 3-7-6-1: playing a 6th Character is allowed, but immediately forces a
 * choice to trash 1 down to the 5-card limit — modeled as a PendingChoice
 * (sourceEffectId: 'rule:characterAreaOverflow' is the sentinel the generic
 * RESOLVE_PENDING_CHOICE handler dispatches on), not a validation rejection.
 *
 * 3-1-6: the hand card is NOT mutated in place — its old instanceId is
 * retired and a fresh one is minted for the in-play Character (see
 * rules/shared/mintInstance.ts).
 */
import type { GameState } from '../../state/game';
import type { CardInstance } from '../../state/card';
import type { PendingChoice } from '../../events/pendingChoice';
import type { PlayCharacterAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneBottom, removeFromZone } from '../../rules/shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../../rules/shared/definitions';
import { computeCurrentCost } from '../../rules/shared/power';
import { mintRuntimeInstanceId } from '../../rules/shared/mintInstance';
import type { ActionExecuteResult } from '../actionExecuteResult';

export function validatePlayCharacter(state: GameState, action: PlayCharacterAction, defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('PLAY_CHARACTER is only legal during the Main Phase (6-5-3-1).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may play a Character (6-5-3-1).');
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
  if (def.category !== 'character') {
    reasons.push(`'${def.name}' is a ${def.category}, not a Character.`);
  }

  const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
  if (action.donInstanceIds.length !== cost) {
    reasons.push(`'${def.name}' costs ${cost} DON!!, but ${action.donInstanceIds.length} were supplied (2-7-2).`);
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

export function executePlayCharacter(state: GameState, action: PlayCharacterAction, defs: CardDefinitionLookup): ActionExecuteResult {
  const player = state.players[action.playerId];
  const handInstance = state.cardsById[action.handCardInstanceId];
  const def = getDefinition(defs, handInstance);
  const logger = createActionLogger(state, action.actionId);

  let cardsById = { ...state.cardsById };

  for (const donId of action.donInstanceIds) {
    cardsById[donId] = { ...cardsById[donId], donRested: true };
  }

  const minted = mintRuntimeInstanceId(state);
  const newInstanceId = minted.id;

  const newInstance: CardInstance = {
    instanceId: newInstanceId,
    cardDefinitionId: handInstance.cardDefinitionId,
    ownerId: action.playerId,
    controllerId: action.playerId,
    currentZone: 'characterArea',
    orientation: 'active',
    faceState: 'faceUp',
    donAttached: [],
    currentPower: def.basePower,
    appliedContinuousEffectIds: [],
    oncePerTurnUsed: [],
    summoningSick: !def.hasRush, // 3-7-4, 10-1-6
    revealedTo: 'all', // 3-7-2, open zone
  };

  cardsById = { ...cardsById, [newInstanceId]: newInstance };
  delete cardsById[action.handCardInstanceId]; // 3-1-6: old instance is retired, not reused

  const newHand = removeFromZone(player.hand, action.handCardInstanceId);
  const newCharacterArea = addToZoneBottom(player.characterArea, newInstanceId);

  const newPlayer = { ...player, hand: newHand, characterArea: newCharacterArea };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'CARD_PLAYED',
    message: `${action.playerId} played ${def.name} as a Character (cost ${action.donInstanceIds.length}).`,
    data: { from: 'hand', to: 'characterArea', cost: action.donInstanceIds.length, donInstanceIds: action.donInstanceIds, oldInstanceId: action.handCardInstanceId },
    relatedCardInstanceIds: [newInstanceId],
    visibility: 'public',
  });

  const pendingChoices: PendingChoice[] = [];
  if (newCharacterArea.cardIds.length > (newCharacterArea.maxSize ?? Infinity)) {
    const choice: PendingChoice = {
      id: `${action.playerId}__character-overflow-${action.actionId}`,
      playerId: action.playerId,
      kind: 'SELECT_CARDS',
      prompt: `Choose 1 Character to trash — more than ${newCharacterArea.maxSize} in your Character Area (3-7-6-1).`,
      constraints: { min: 1, max: 1, zoneId: 'characterArea', filterDescription: 'Any Character currently in your Character Area.' },
      sourceInstanceId: null,
      sourceEffectId: 'rule:characterAreaOverflow',
    };
    pendingChoices.push(choice);
    logger.push({
      actorPlayerId: action.playerId,
      type: 'CHOICE_REQUESTED',
      message: `${action.playerId} must trash 1 Character — Character Area exceeds its limit (3-7-6-1).`,
      data: { limit: newCharacterArea.maxSize, current: newCharacterArea.cardIds.length },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  const nextState: GameState = {
    ...state,
    cardsById,
    players: { ...state.players, [action.playerId]: newPlayer },
    nextInstanceSeq: minted.state.nextInstanceSeq,
    pendingChoices: [...state.pendingChoices, ...pendingChoices],
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices };
}
