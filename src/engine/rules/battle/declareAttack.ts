/**
 * DECLARE_ATTACK (7-1-1-1, 7-1-1-2). Main Phase ("Battle" is a Main Phase
 * action per 6-5-6, not a separate turn phase — see game.ts BattleStep doc
 * comment), turn-player-only.
 *
 * 6-5-6-1: neither player may battle on either player's first turn —
 * turnNumber <= 2 covers exactly turn 1 (P1's first turn) and turn 2 (P2's
 * first turn); from turn 3 onward both players have had one.
 *
 * 7-1-2: the Block Step is skipped entirely for [Unblockable] attackers —
 * currentBattle.step starts at 'counter' rather than 'block' in that case.
 */
import type { GameState } from '../../state/game';
import type { DeclareAttackAction, ValidationResult } from '../../actions/action';
import type { ActionExecuteResult } from '../../actions/actionExecuteResult';
import { createActionLogger } from '../shared/actionLogger';
import { getDefinition, type CardDefinitionLookup } from '../shared/definitions';
import { getOpponentId } from '../shared/players';
import { hasContinuousKeyword, cannotAttack, isAttackTargetForbidden } from '../shared/power';
import { fireWhenAttacking, fireRestTransitions, type EffectTemplateRegistry } from '../../effects';

export function validateDeclareAttack(state: GameState, action: DeclareAttackAction, defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('DECLARE_ATTACK is only legal during the Main Phase (6-5-6).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may declare an attack (7-1-1-1).');
  }
  if (state.currentBattle !== null) {
    reasons.push('A Battle is already in progress.');
  }
  if (state.turnNumber <= 2) {
    reasons.push('Neither player may battle on their first turn (6-5-6-1).');
  }

  const attacker = state.cardsById[action.attackerInstanceId];
  if (!attacker || attacker.ownerId !== action.playerId || (attacker.currentZone !== 'leaderArea' && attacker.currentZone !== 'characterArea')) {
    reasons.push(`'${action.attackerInstanceId}' is not one of ${action.playerId}'s own Leader/Character cards.`);
  } else if (attacker.orientation !== 'active') {
    reasons.push(`'${action.attackerInstanceId}' must be active to attack (7-1-1-1).`);
  } else if (attacker.summoningSick && !hasContinuousKeyword(defs, state, action.attackerInstanceId, 'rush')) {
    reasons.push(`'${action.attackerInstanceId}' cannot attack the turn it was played (3-7-4) — it has no [Rush].`);
  } else if (cannotAttack(state, action.attackerInstanceId)) {
    reasons.push(`'${action.attackerInstanceId}' cannot attack — a card effect is preventing it from attacking.`);
  } else if (isAttackTargetForbidden(state, action.attackerInstanceId, action.targetInstanceId)) {
    reasons.push(`'${action.attackerInstanceId}' cannot attack '${action.targetInstanceId}' — a card effect is restricting that target.`);
  }

  let opponentId: string | null = null;
  try {
    opponentId = getOpponentId(state, action.playerId);
  } catch {
    reasons.push('Could not resolve opponent.');
  }

  if (opponentId) {
    const target = state.cardsById[action.targetInstanceId];
    if (!target || target.ownerId !== opponentId) {
      reasons.push(`'${action.targetInstanceId}' does not belong to the opponent.`);
    } else if (target.currentZone === 'leaderArea') {
      // always a legal target
    } else if (target.currentZone === 'characterArea') {
      if (target.orientation !== 'rested' && !hasContinuousKeyword(defs, state, action.attackerInstanceId, 'canAttackActive')) {
        reasons.push(`'${action.targetInstanceId}' is active — only the opponent's Leader or a RESTED Character may be attacked (7-1-1-2), unless the attacker has a "can also attack active Characters" grant.`);
      }
    } else {
      reasons.push(`'${action.targetInstanceId}' is not a Leader or Character card.`);
    }
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeDeclareAttack(
  state: GameState,
  action: DeclareAttackAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const attacker = state.cardsById[action.attackerInstanceId];
  const attackerDef = getDefinition(defs, attacker);
  const logger = createActionLogger(state, action.actionId);

  const cardsById = {
    ...state.cardsById,
    [action.attackerInstanceId]: { ...attacker, orientation: 'rested' as const },
  };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'ATTACK_DECLARED',
    message: `${action.playerId} declared an attack: '${action.attackerInstanceId}' -> '${action.targetInstanceId}' (7-1-1-1).`,
    data: { attackerInstanceId: action.attackerInstanceId, targetInstanceId: action.targetInstanceId },
    relatedCardInstanceIds: [action.attackerInstanceId, action.targetInstanceId],
    visibility: 'public',
  });

  if (attackerDef.isUnblockable) {
    logger.push({
      actorPlayerId: action.playerId,
      type: 'PHASE_CHANGED',
      message: `'${attackerDef.name}' is [Unblockable] — the Block Step is skipped (7-1-2).`,
      data: { step: 'counter' },
      relatedCardInstanceIds: [action.attackerInstanceId],
      visibility: 'public',
    });
  }

  const nextState: GameState = {
    ...state,
    cardsById,
    currentBattle: {
      attackerInstanceId: action.attackerInstanceId,
      targetInstanceId: action.targetInstanceId,
      originalTargetInstanceId: action.targetInstanceId,
      step: attackerDef.isUnblockable ? 'counter' : 'block',
      blockerUsed: false,
      battlePowerBonuses: {},
    },
    log: [...state.log, ...logger.log],
  };

  // [When Attacking] (8-1-3) fires now that the Battle is set up, with the
  // attacker as source. No-op when the card has no curated whenAttacking
  // ability; any targeting it needs surfaces as a PendingChoice (resolved
  // before the Block/Counter Step proceeds, via the dispatch pending-choice gate).
  const fired = fireWhenAttacking(nextState, action.attackerInstanceId, registry, defs, action.actionId);
  if (fired.pendingChoices.length > 0) {
    return { state: fired.state, log: [...logger.log, ...fired.log], pendingChoices: fired.pendingChoices };
  }
  const rested = fireRestTransitions(fired.state, [action.attackerInstanceId], registry, defs, action.actionId);
  return {
    state: rested.state,
    log: [...logger.log, ...fired.log, ...rested.log],
    pendingChoices: rested.pendingChoices,
  };
}
