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
import { computeCurrentCost, computeCurrentPower, hasContinuousKeyword } from '../shared/power';
import { fireOnBlock, fireRestTransitions, fireOpponentBlockerActivatedReactions, type EffectTemplateRegistry } from '../../effects';

function isBlockedByRestriction(state: GameState, blockerInstanceId: string, defs: CardDefinitionLookup): boolean {
  const battle = state.currentBattle;
  for (const record of state.continuousEffects) {
    const restriction = record.blockerRestriction;
    if (!restriction) continue;
    if (restriction.appliesToBlockerInstanceId !== undefined) {
      if (restriction.appliesToBlockerInstanceId === blockerInstanceId) return true;
      continue;
    }
    if (!battle || restriction.appliesToAttackerInstanceId !== battle.attackerInstanceId) continue;
    if (restriction.blockerPowerAtLeast === undefined && restriction.blockerPowerAtMost === undefined && restriction.blockerMaxCost === undefined) return true;
    const power = computeCurrentPower(defs, state, blockerInstanceId);
    const cost = computeCurrentCost(defs, state, blockerInstanceId);
    if (restriction.blockerPowerAtLeast !== undefined && power < restriction.blockerPowerAtLeast) continue;
    if (restriction.blockerPowerAtMost !== undefined && power > restriction.blockerPowerAtMost) continue;
    if (restriction.blockerMaxCost !== undefined && cost > restriction.blockerMaxCost) continue;
    return true;
  }
  return false;
}

/**
 * True if `defendingPlayerId` has at least one Character on the field that
 * could legally ACTIVATE_BLOCKER right now (active, has [Blocker] — printed
 * or continuous-keyword-granted — and not shut down by a blocker
 * restriction). Used by declareAttack.ts to auto-skip an empty Block Step
 * (mirrors the existing [Unblockable] skip, generalized to "no legal
 * blocker exists" so the defending player is never stuck staring at an
 * Activate Blocker / Pass choice with nothing to activate). `state` must
 * already have `currentBattle` populated — isBlockedByRestriction reads
 * battle.attackerInstanceId for attacker-scoped restrictions.
 */
export function hasAnyLegalBlocker(state: GameState, defendingPlayerId: string, defs: CardDefinitionLookup): boolean {
  const characterIds = state.players[defendingPlayerId]?.characterArea.cardIds ?? [];
  for (const id of characterIds) {
    const inst = state.cardsById[id];
    if (!inst || inst.orientation !== 'active') continue;
    const def = defs[inst.cardDefinitionId];
    if (!def || (!def.hasBlocker && !hasContinuousKeyword(defs, state, id, 'blocker'))) continue;
    if (isBlockedByRestriction(state, id, defs)) continue;
    return true;
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
    if (!def || (!def.hasBlocker && !hasContinuousKeyword(defs, state, action.blockerInstanceId, 'blocker'))) {
      reasons.push(`'${action.blockerInstanceId}' does not have [Blocker].`);
    } else if (isBlockedByRestriction(state, action.blockerInstanceId, defs)) {
      reasons.push(`'${action.blockerInstanceId}' cannot activate [Blocker] due to an active blocker restriction.`);
    }
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeActivateBlocker(
  state: GameState,
  action: ActivateBlockerAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
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

  const fired = fireOnBlock(nextState, action.blockerInstanceId, registry, defs, action.actionId);
  if (fired.pendingChoices.length > 0) {
    return { state: fired.state, log: [...logger.log, ...fired.log], pendingChoices: fired.pendingChoices };
  }
  const rested = fireRestTransitions(fired.state, [action.blockerInstanceId], registry, defs, action.actionId);
  if (rested.pendingChoices.length > 0) {
    return { state: rested.state, log: [...logger.log, ...fired.log, ...rested.log], pendingChoices: rested.pendingChoices };
  }
  const attackerPlayerId = state.activePlayerId;
  const reactive = fireOpponentBlockerActivatedReactions(rested.state, attackerPlayerId, registry, defs, action.actionId);
  return { state: reactive.state, log: [...logger.log, ...fired.log, ...rested.log, ...reactive.log], pendingChoices: reactive.pendingChoices };
}
