/**
 * ACTIVATE_COUNTER_CHARACTER (7-1-3-2-1). Counter Step, defending-player-
 * only. Trashing a hand Character with a printed Counter value (2-10) to
 * grant +(that value) power, during this battle only, to 1 of the
 * defending player's own Leader/Character cards (not necessarily the card
 * under attack — see game.ts BattleState.battlePowerBonuses doc comment).
 * Any number of these may be activated in succession before PASS_STEP ends
 * the Counter Step (7-1-3-2-1 places no explicit cap).
 */
import type { GameState } from '../../state/game';
import type { ActivateCounterCharacterAction, ValidationResult } from '../../actions/action';
import type { ActionExecuteResult } from '../../actions/actionExecuteResult';
import { createActionLogger } from '../shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../shared/definitions';
import { getOpponentId } from '../shared/players';
import { computeEffectiveCounter } from '../shared/power';

export function validateActivateCounterCharacter(state: GameState, action: ActivateCounterCharacterAction, defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  const battle = state.currentBattle;
  if (!battle) {
    reasons.push('ACTIVATE_COUNTER_CHARACTER requires an in-progress Battle.');
    return { legal: false, reasons };
  }
  if (battle.step !== 'counter') {
    reasons.push(`ACTIVATE_COUNTER_CHARACTER is only legal during the Counter Step (currently '${battle.step}').`);
  }

  const defendingPlayerId = getOpponentId(state, state.activePlayerId);
  if (action.playerId !== defendingPlayerId) {
    reasons.push('Only the defending player may activate a Counter Character (7-1-3-2-1).');
  }

  const handInstance = state.cardsById[action.handCardInstanceId];
  if (!handInstance || handInstance.currentZone !== 'hand' || handInstance.ownerId !== defendingPlayerId) {
    reasons.push(`'${action.handCardInstanceId}' is not in ${defendingPlayerId}'s hand.`);
  } else {
    const def = defs[handInstance.cardDefinitionId];
    if (!def || def.category !== 'character') {
      reasons.push(`'${action.handCardInstanceId}' is not a Character card.`);
    } else if (computeEffectiveCounter(defs, state, action.handCardInstanceId) <= 0) {
      reasons.push(`'${def.name}' has no usable Counter value (2-10) and cannot be used at Counter timing.`);
    }
  }

  const boostTarget = state.cardsById[action.boostTargetInstanceId];
  if (!boostTarget || boostTarget.ownerId !== defendingPlayerId || (boostTarget.currentZone !== 'leaderArea' && boostTarget.currentZone !== 'characterArea')) {
    reasons.push(`'${action.boostTargetInstanceId}' is not one of ${defendingPlayerId}'s own Leader/Character cards (7-1-3-2-1).`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeActivateCounterCharacter(state: GameState, action: ActivateCounterCharacterAction, defs: CardDefinitionLookup): ActionExecuteResult {
  const battle = state.currentBattle!;
  const player = state.players[action.playerId];
  const handInstance = state.cardsById[action.handCardInstanceId];
  const def = getDefinition(defs, handInstance);
  const counterValue = computeEffectiveCounter(defs, state, action.handCardInstanceId);
  const logger = createActionLogger(state, action.actionId);

  const cardsById = {
    ...state.cardsById,
    [action.handCardInstanceId]: { ...handInstance, currentZone: 'trash' as const },
  };

  const newHand = removeFromZone(player.hand, action.handCardInstanceId);
  const newTrash = addToZoneTop(player.trash, action.handCardInstanceId);
  const newPlayer = { ...player, hand: newHand, trash: newTrash };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'COUNTER_ACTIVATED',
    message: `${action.playerId} trashed '${def.name}' for its Counter value (+${counterValue} power to '${action.boostTargetInstanceId}', during this battle — 7-1-3-2-1).`,
    data: { handCardInstanceId: action.handCardInstanceId, boostTargetInstanceId: action.boostTargetInstanceId, counterValue },
    relatedCardInstanceIds: [action.handCardInstanceId, action.boostTargetInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    players: { ...state.players, [action.playerId]: newPlayer },
    currentBattle: {
      ...battle,
      battlePowerBonuses: {
        ...battle.battlePowerBonuses,
        [action.boostTargetInstanceId]: (battle.battlePowerBonuses[action.boostTargetInstanceId] ?? 0) + counterValue,
      },
    },
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices: [] };
}
