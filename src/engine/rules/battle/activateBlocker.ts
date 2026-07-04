/**
 * ACTIVATE_BLOCKER (7-1-2-1). Block Step, defending-player-only. Capped at
 * one activation per battle (blockerUsed). Activating a Blocker re-targets
 * the battle onto the blocker itself (7-1-2-1-1) and advances straight into
 * the Counter Step.
 */
import type { GameState } from '../../state/game';
import type { ActivateBlockerAction, ValidationResult } from '../../actions/action';
import type { ActionExecuteResult } from '../../actions/actionExecuteResult';
import { createActionLogger } from '../shared/actionLogger';
import { getDefinition, type CardDefinitionLookup } from '../shared/definitions';
import { getOpponentId } from '../shared/players';
import { computeCurrentPower } from '../shared/power';

function isBlockedByRestriction(state: GameState, blockerInstanceId: string, defs: CardDefinitionLookup): boolean {
  const battle = state.currentBattle;
  if (!battle) return false;
  for (const record of state.continuousEffects) {
    const restriction = record.blockerRestriction;
    if (!restriction || restriction.appliesToAttackerInstanceId !== battle.attackerInstanceId) continue;
    if (restriction.blockerPowerAtLeast === undefined) return true;
    if (computeCurrentPower(defs, state, blockerInstanceId) >= restriction.blockerPowerAtLeast) return true;
  }
  return false;
}

export function validateActivateBlocker(state: GameState, action: ActivateBlockerAction, defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  const battle = state.currentBattle;
  if (!battle) {
    reasons.push('ACTIVATE_BLOCKER requires an in-progress Battle.');
    return { legal: false, reasons };
  }
  if (battle.step !== 'block') {
    reasons.push(`ACTIVATE_BLOCKER is only legal during the Block Step (currently '${battle.step}').`);
  }
  if (battle.blockerUsed) {
    reasons.push('A Blocker has already been activated this battle (7-1-2-1).');
  }

  const defendingPlayerId = getOpponentId(state, state.activePlayerId);
  if (action.playerId !== defendingPlayerId) {
    reasons.push('Only the defending player may activate a Blocker (7-1-2-1).');
  }

  const blocker = state.cardsById[action.blockerInstanceId];
  if (!blocker || blocker.ownerId !== defendingPlayerId || blocker.currentZone !== 'characterArea') {
    reasons.push(`'${action.blockerInstanceId}' is not one of ${defendingPlayerId}'s own Characters.`);
  } else if (blocker.orientation !== 'active') {
    reasons.push(`'${action.blockerInstanceId}' must be active to block (7-1-2-1).`);
  } else {
    const def = defs[blocker.cardDefinitionId];
    if (!def || !def.hasBlocker) {
      reasons.push(`'${action.blockerInstanceId}' does not have [Blocker].`);
    } else if (isBlockedByRestriction(state, action.blockerInstanceId, defs)) {
      reasons.push(`'${action.blockerInstanceId}' cannot activate [Blocker] due to an active blocker restriction.`);
    }
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeActivateBlocker(state: GameState, action: ActivateBlockerAction, defs: CardDefinitionLookup): ActionExecuteResult {
  const battle = state.currentBattle!;
  const blocker = state.cardsById[action.blockerInstanceId];
  const def = getDefinition(defs, blocker);
  const logger = createActionLogger(state, action.actionId);

  const cardsById = {
    ...state.cardsById,
    [action.blockerInstanceId]: { ...blocker, orientation: 'rested' as const },
  };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'BLOCKER_ACTIVATED',
    message: `${action.playerId} activated [Blocker] on '${def.name}' — the attack is re-targeted (7-1-2-1-1).`,
    data: { blockerInstanceId: action.blockerInstanceId, previousTargetInstanceId: battle.targetInstanceId },
    relatedCardInstanceIds: [action.blockerInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    currentBattle: { ...battle, targetInstanceId: action.blockerInstanceId, blockerUsed: true, step: 'counter' },
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log, pendingChoices: [] };
}
