/**
 * ACTIVATE_ON_OPPONENTS_ATTACK. [On Your Opponent's Attack] (10-2) activated
 * ability, usable by the DEFENDING player during the Block-Step window right
 * after the opponent declares an attack (before Blocker/Counter resolution).
 *
 * Pays the ability's structured cost (DON!! -N / rest DON!! / rest this) then
 * resolves the curated onOpponentsAttack ability through the generic
 * interpreter. [Once Per Turn] (10-2-13) is tracked on the source CardInstance's
 * oncePerTurnUsed, mirroring ACTIVATE_CARD_EFFECT.
 */
import type { GameState } from '../../state/game';
import type { ActivateOnOpponentsAttackAction, ValidationResult } from '../../actions/action';
import type { ActionExecuteResult } from '../../actions/actionExecuteResult';
import type { CardDefinitionLookup } from '../shared/definitions';
import { getOpponentId } from '../shared/players';
import { fireOnOpponentsAttack, evaluateGates, canPayAbilityCost, payAbilityCost, afterAbilityCostPaid, battleAttackerIsCharacterWithAttribute, type EffectTemplateRegistry } from '../../effects';
import type { Ability } from '../../effects/effectIr';
import type { CardInstance } from '../../state/card';

function abilityConditionMet(ability: Ability, source: CardInstance, state: GameState, defs: CardDefinitionLookup): boolean {
  const c = ability.condition;
  if (!c) return true;
  if (c.donAttachedAtLeast !== undefined && source.donAttached.length < c.donAttachedAtLeast) return false;
  if (c.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === source.ownerId;
    if (c.turn === 'your' && !isOwnersTurn) return false;
    if (c.turn === 'opponent' && isOwnersTurn) return false;
  }
  if (c.gate && !evaluateGates(c.gate, state, defs, source.controllerId)) return false;
  return true;
}

export function validateActivateOnOpponentsAttack(
  state: GameState,
  action: ActivateOnOpponentsAttackAction,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup = {},
): ValidationResult {
  const reasons: string[] = [];
  const battle = state.currentBattle;
  if (!battle) {
    reasons.push('ACTIVATE_ON_OPPONENTS_ATTACK requires an in-progress Battle.');
    return { legal: false, reasons };
  }
  if (battle.step !== 'block') {
    reasons.push(`[On Your Opponent's Attack] is only usable during the Block-Step window (currently '${battle.step}').`);
  }

  let defendingPlayerId: string | null = null;
  try {
    defendingPlayerId = getOpponentId(state, state.activePlayerId);
  } catch {
    reasons.push('Could not resolve defending player.');
  }
  if (defendingPlayerId && action.playerId !== defendingPlayerId) {
    reasons.push("Only the defending player may activate an [On Your Opponent's Attack] ability.");
  }

  const source = state.cardsById[action.sourceInstanceId];
  if (!source || source.controllerId !== action.playerId || (source.currentZone !== 'leaderArea' && source.currentZone !== 'characterArea' && source.currentZone !== 'stageArea')) {
    reasons.push(`'${action.sourceInstanceId}' is not one of ${action.playerId}'s Leader/Character/Stage cards in play.`);
    return { legal: reasons.length === 0, reasons };
  }

  const program = registry[source.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.timing === 'onOpponentsAttack');
  if (!ability) {
    reasons.push(`'${source.cardDefinitionId}' has no [On Your Opponent's Attack] ability.`);
  }
  if (ability?.gate && !evaluateGates(ability.gate, state, defs, action.playerId)) {
    reasons.push(`'${source.cardDefinitionId}' can't be activated — its "If …" condition isn't met.`);
  }
  if (ability?.battlingOpponentAttribute && !battleAttackerIsCharacterWithAttribute(state, defs, ability.battlingOpponentAttribute)) {
    reasons.push(`'${source.cardDefinitionId}' can't be activated — the attacking Character does not have the required attribute.`);
  }
  if (ability && !abilityConditionMet(ability, source, state, defs)) {
    reasons.push(`'${source.cardDefinitionId}' can't be activated — its activation condition isn't met.`);
  }
  if (ability?.cost?.length) {
    reasons.push(...canPayAbilityCost(state, action.sourceInstanceId, action.playerId, ability.cost, action.donInstanceIds));
  } else if (action.donInstanceIds.length > 0) {
    reasons.push('This ability has no DON!! -N cost, so donInstanceIds must be empty.');
  }
  if (ability?.oncePerTurn && source.oncePerTurnUsed.includes(action.effectId)) {
    reasons.push(`This [Once Per Turn] ability of '${source.cardDefinitionId}' was already used this turn (10-2-13).`);
  }
  const usedOnOppAttack = battle.onOpponentsAttackUsedInstanceIds ?? [];
  if (usedOnOppAttack.includes(action.sourceInstanceId)) {
    reasons.push(`'${source.cardDefinitionId}' already activated [On Your Opponent's Attack] during this battle.`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeActivateOnOpponentsAttack(
  state: GameState,
  action: ActivateOnOpponentsAttackAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  const source = state.cardsById[action.sourceInstanceId];
  const program = registry[source.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.timing === 'onOpponentsAttack');

  // Pay the activation cost first (8-3-1-5), then resolve on the paid state.
  const paid = ability?.cost?.length
    ? payAbilityCost(state, action.sourceInstanceId, action.playerId, ability.cost, action.actionId, action.donInstanceIds)
    : { state, log: [] as ActionExecuteResult['log'], restedInstanceIds: [] as string[], returnedDonCount: 0 };

  let working = paid.state;
  let log = [...paid.log];
  if (paid.restedInstanceIds.length > 0 || paid.returnedDonCount > 0) {
    const cascaded = afterAbilityCostPaid(working, action.playerId, paid, registry, defs, action.actionId);
    working = cascaded.state;
    log = [...log, ...cascaded.log];
    if (cascaded.pendingChoices.length > 0) {
      return { state: working, log, pendingChoices: cascaded.pendingChoices };
    }
  }

  const fired = fireOnOpponentsAttack(working, action.sourceInstanceId, registry, defs, action.actionId);

  let nextState = fired.state;
  const battle = nextState.currentBattle;
  if (battle) {
    nextState = {
      ...nextState,
      currentBattle: {
        ...battle,
        onOpponentsAttackUsedInstanceIds: [...(battle.onOpponentsAttackUsedInstanceIds ?? []), action.sourceInstanceId],
      },
    };
  }
  if (ability?.oncePerTurn) {
    const s = nextState.cardsById[action.sourceInstanceId];
    nextState = {
      ...nextState,
      cardsById: { ...nextState.cardsById, [action.sourceInstanceId]: { ...s, oncePerTurnUsed: [...s.oncePerTurnUsed, action.effectId] } },
    };
  }

  return { state: nextState, log: [...log, ...fired.log], pendingChoices: fired.pendingChoices };
}
