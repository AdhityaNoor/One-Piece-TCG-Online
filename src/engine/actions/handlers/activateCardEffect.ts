/**
 * ACTIVATE_CARD_EFFECT (8-1-3-2 / 8-1-3-2-1). The turn player activates a field
 * card's [Activate: Main] ability during their Main Phase.
 *
 * The ability is a compiled EffectProgram run through the generic interpreter
 * (engine/effects). Its ops run sequentially, and a `chooseTargets` op suspends
 * via a PendingChoice that RESOLVE_PENDING_CHOICE resumes — so an activated
 * effect's later ops happen after the player's choice, in order.
 *
 * [Once Per Turn] (10-2-13) is tracked on the source CardInstance's
 * `oncePerTurnUsed` (keyed by the action's effectId) and cleared on the
 * controller's Refresh Phase (runRefreshPhase). Activation costs (DON!! −X,
 * rest-this-card, etc.) are NOT modeled yet — only no-cost abilities activate.
 */
import type { GameState } from '../../state/game';
import type { ActivateCardEffectAction, ValidationResult } from '../action';
import type { ActionExecuteResult } from '../actionExecuteResult';
import type { CardDefinitionLookup } from '../../rules/shared/definitions';
import { fireActivate, evaluateGates, type EffectTemplateRegistry } from '../../effects';
import { canPayAbilityCost, payAbilityCost } from './abilityCost';

function isInPlay(zone: string): boolean {
  return zone === 'leaderArea' || zone === 'characterArea' || zone === 'stageArea';
}

export function validateActivateCardEffect(
  state: GameState,
  action: ActivateCardEffectAction,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup = {},
): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'main') {
    reasons.push('ACTIVATE_CARD_EFFECT is only legal during the Main Phase (8-1-3-2).');
  }
  if (action.playerId !== state.activePlayerId) {
    reasons.push('Only the turn player may activate a card effect (8-1-3-2).');
  }

  const source = state.cardsById[action.sourceInstanceId];
  if (!source || source.controllerId !== action.playerId || !isInPlay(source.currentZone)) {
    reasons.push(`'${action.sourceInstanceId}' is not one of ${action.playerId}'s cards in play.`);
    return { legal: reasons.length === 0, reasons };
  }

  const program = registry[source.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.trigger === 'activateMain');
  if (!ability) {
    reasons.push(`'${source.cardDefinitionId}' has no activatable [Activate: Main] effect.`);
  }
  // The engine pays the ability's structured cost automatically (no player DON
  // selection); donInstanceIds is therefore always empty for ACTIVATE_CARD_EFFECT.
  if (action.donInstanceIds.length > 0) {
    reasons.push('ACTIVATE_CARD_EFFECT does not take donInstanceIds — its activation cost (if any) is paid automatically.');
  }
  if (ability?.gate && !evaluateGates(ability.gate, state, defs, action.playerId)) {
    reasons.push(`'${source.cardDefinitionId}' can't be activated right now — its "If …" condition isn't met.`);
  }
  if (ability?.cost?.length) {
    reasons.push(...canPayAbilityCost(state, action.sourceInstanceId, action.playerId, ability.cost));
  }
  if (ability?.oncePerTurn && source.oncePerTurnUsed.includes(action.effectId)) {
    reasons.push(`This [Once Per Turn] effect of '${source.cardDefinitionId}' was already used this turn (10-2-13).`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeActivateCardEffect(
  state: GameState,
  action: ActivateCardEffectAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  const source = state.cardsById[action.sourceInstanceId];
  const program = registry[source.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.trigger === 'activateMain');

  // Pay the activation cost first (8-3-1-5), then resolve the effect on the paid state.
  const paid = ability?.cost?.length
    ? payAbilityCost(state, action.sourceInstanceId, action.playerId, ability.cost, action.actionId)
    : { state, log: [] as ActionExecuteResult['log'] };

  const fired = fireActivate(paid.state, action.sourceInstanceId, registry, defs, action.actionId);

  // Mark [Once Per Turn] as used (on activation, even if the player declines a target).
  let nextState = fired.state;
  if (ability?.oncePerTurn) {
    const s = nextState.cardsById[action.sourceInstanceId];
    nextState = {
      ...nextState,
      cardsById: { ...nextState.cardsById, [action.sourceInstanceId]: { ...s, oncePerTurnUsed: [...s.oncePerTurnUsed, action.effectId] } },
    };
  }

  return { state: nextState, log: [...paid.log, ...fired.log], pendingChoices: fired.pendingChoices };
}
