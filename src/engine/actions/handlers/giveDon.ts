/**
 * GIVE_DON (6-5-5-1). Main Phase, turn-player-only.
 *
 * The act of giving IS the cost — resting the DON!! and giving it are the
 * same step (6-5-5-1), not a separate cost payment. The owner's-turn +1000
 * power (6-5-5-2) is not stored anywhere here: it's derived on demand by
 * rules/shared/power.ts's computeCurrentPower from donAttached.length.
 *
 * Per card.ts's CardInstance.donRested doc comment, a given DON!! never
 * changes currentZone — it stays in costArea the whole time; only its
 * donRested flag changes and its id gets added to the target's donAttached.
 */
import type { GameState } from '../../state/game';
import type { GiveDonAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import type { ActionExecuteResult } from '../actionExecuteResult';
import type { CardDefinitionLookup } from '../../rules/shared/definitions';
import { fireDonGivenReactions, type EffectTemplateRegistry } from '../../effects';

export function validateGiveDon(state: GameState, action: GiveDonAction): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('GIVE_DON is only legal during the Main Phase (6-5-5-1).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may give DON!! (6-5-5-1).');
  }

  const donInstance = state.cardsById[action.donInstanceId];
  if (!donInstance || donInstance.currentZone !== 'costArea' || donInstance.ownerId !== action.playerId) {
    reasons.push(`'${action.donInstanceId}' is not an active DON!! in ${action.playerId}'s cost area.`);
  } else if (donInstance.donRested === true) {
    reasons.push(`'${action.donInstanceId}' is already rested.`);
  }

  const target = state.cardsById[action.targetInstanceId];
  if (!target || target.ownerId !== action.playerId || (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea')) {
    reasons.push(`'${action.targetInstanceId}' is not one of ${action.playerId}'s own Leader/Character cards.`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeGiveDon(
  state: GameState,
  action: GiveDonAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const logger = createActionLogger(state, action.actionId);
  const target = state.cardsById[action.targetInstanceId];

  const cardsById = {
    ...state.cardsById,
    [action.donInstanceId]: { ...state.cardsById[action.donInstanceId], donRested: true },
    [action.targetInstanceId]: { ...target, donAttached: [...target.donAttached, action.donInstanceId] },
  };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'DON_GIVEN',
    message: `${action.playerId} gave 1 DON!! to '${action.targetInstanceId}' (+1000 power during their turn, 6-5-5-1/6-5-5-2).`,
    data: { donInstanceId: action.donInstanceId, targetInstanceId: action.targetInstanceId },
    relatedCardInstanceIds: [action.donInstanceId, action.targetInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = { ...state, cardsById, log: [...state.log, ...logger.log] };
  const reacted = fireDonGivenReactions(nextState, action.playerId, action.targetInstanceId, 1, registry, defs, action.actionId);
  return {
    state: { ...reacted.state, log: [...nextState.log, ...reacted.log] },
    log: [...logger.log, ...reacted.log],
    pendingChoices: reacted.pendingChoices,
  };
}
