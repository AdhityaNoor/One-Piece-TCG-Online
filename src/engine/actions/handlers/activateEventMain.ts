/**
 * ACTIVATE_EVENT_MAIN (2-7-3, 10-2-3). Main Phase, turn-player-only.
 *
 * Event text is never interpreted directly. This handler only activates Events
 * with a reviewed curated EffectProgram containing timing 'activateMain'. It
 * pays the Event play cost, moves the Event hand -> trash (8-1), then resolves
 * the structured [Main] ability through the generic interpreter.
 *
 * No fresh-instance minting here: 3-1-6 only requires it for cards entering or
 * leaving the Character or Stage area. An Event never enters either area.
 */
import type { GameState } from '../../state/game';
import type { ActivateEventMainAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../../rules/shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../../rules/shared/definitions';
import { computeCurrentCost } from '../../rules/shared/power';
import type { ActionExecuteResult } from '../actionExecuteResult';
import { evaluateGates, fireActivate, canAffordAbilityCost, canPayAbilityCost, countControllerActiveUnattachedDon, payAbilityCost, afterAbilityCostPaid, fireEventActivatedReactions, requiredDonMinusCount, resolveEffectProgram, type EffectTemplateRegistry } from '../../effects';
import { isControllerHandPlayPrevented } from '../../rules/shared/handPlayRestriction';
import { recordEventActivation } from '../../effects/eventActivationHistory';
import { effectLogDataForSource } from '../../logs/effectLogData';

export function validateActivateEventMain(
  state: GameState,
  action: ActivateEventMainAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ValidationResult {
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

  if (isControllerHandPlayPrevented(state, action.playerId)) {
    reasons.push('You cannot play cards from your hand during this turn.');
  }

  const program = resolveEffectProgram(registry, defs, handInstance.cardDefinitionId);
  const ability = program?.abilities.find((a) => a.timing === 'activateMain');
  if (!ability) {
    reasons.push(`'${def.name}' has no curated [Main] effect to activate.`);
  }
  if (ability?.gate && !evaluateGates(ability.gate, state, defs, action.playerId)) {
    reasons.push(`'${def.name}' can't be activated right now - its "If ..." condition isn't met.`);
  }
  if (ability?.cost?.length) {
    const preselected = action.abilityCostDonInstanceIds ?? [];
    const requiredDon = requiredDonMinusCount(ability.cost);
    // Prefer deferring DON!! −N selection until after play-cost rest (see execute).
    // Preselected IDs remain legal for callers that still supply them.
    if (requiredDon > 0 && preselected.length === 0) {
      reasons.push(...canAffordAbilityCost(state, action.handCardInstanceId, action.playerId, ability.cost));
      // activeOnly returns cannot use DON!! that will be rested for the play cost.
      const activeOnlyCount = ability.cost
        .filter((c): c is Extract<typeof c, { kind: 'donMinus' }> => c.kind === 'donMinus' && c.activeOnly === true)
        .reduce((sum, c) => sum + c.count, 0);
      if (activeOnlyCount > 0 && countControllerActiveUnattachedDon(state, action.playerId) - action.donInstanceIds.length < activeOnlyCount) {
        reasons.push(`Cost requires returning ${activeOnlyCount} active DON!! after paying the Event play cost, but not enough remain.`);
      }
    } else {
      reasons.push(...canPayAbilityCost(state, action.handCardInstanceId, action.playerId, ability.cost, preselected));
    }
  } else if ((action.abilityCostDonInstanceIds?.length ?? 0) > 0) {
    reasons.push('This Event has no DON!! -N ability cost, so abilityCostDonInstanceIds must be empty.');
  }

  const cost = computeCurrentCost(defs, state, action.handCardInstanceId, registry);
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

export function executeActivateEventMain(
  state: GameState,
  action: ActivateEventMainAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const player = state.players[action.playerId];
  const handInstance = state.cardsById[action.handCardInstanceId];
  const def = getDefinition(defs, handInstance);
  const ability = resolveEffectProgram(registry, defs, handInstance.cardDefinitionId)?.abilities.find((a) => a.timing === 'activateMain');
  const logger = createActionLogger(state, action.actionId);

  const cardsById = { ...state.cardsById };
  for (const donId of action.donInstanceIds) {
    cardsById[donId] = { ...cardsById[donId], donRested: true };
  }
  cardsById[action.handCardInstanceId] = { ...cardsById[action.handCardInstanceId], currentZone: 'trash' };

  const newPlayer = {
    ...player,
    hand: removeFromZone(player.hand, action.handCardInstanceId),
    trash: addToZoneTop(player.trash, action.handCardInstanceId),
  };

  logger.push({
    actorPlayerId: action.playerId,
    type: 'EFFECT_ACTIVATED',
    message: `${action.playerId} activated [Main] Event ${def.name} (cost ${action.donInstanceIds.length}).`,
    data: {
      ...effectLogDataForSource(state, defs, action.handCardInstanceId),
      from: 'hand',
      to: 'trash',
      cost: action.donInstanceIds.length,
      donInstanceIds: action.donInstanceIds,
    },
    relatedCardInstanceIds: [action.handCardInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    players: { ...state.players, [action.playerId]: newPlayer },
    log: [...state.log, ...logger.log],
  };

  // Play cost is already rested above. DON!! −N must be chosen on that board so
  // rested play-cost DON!! are legal returns (Comprehensive Rules cost order).
  const preselected = action.abilityCostDonInstanceIds ?? [];
  const requiredDon = requiredDonMinusCount(ability?.cost ?? []);
  const deferDonMinusChoice = !!(ability?.cost?.length && requiredDon > 0 && preselected.length === 0);

  let working = nextState;
  let paidLog: ActionExecuteResult['log'] = [];
  if (ability?.cost?.length && !deferDonMinusChoice) {
    const paid = payAbilityCost(nextState, action.handCardInstanceId, action.playerId, ability.cost, action.actionId, preselected);
    working = paid.state;
    paidLog = [...paid.log];
    if (paid.restedInstanceIds.length > 0 || paid.returnedDonCount > 0) {
      const cascaded = afterAbilityCostPaid(working, action.playerId, paid, registry, defs, action.actionId);
      working = cascaded.state;
      paidLog = [...paidLog, ...cascaded.log];
      if (cascaded.pendingChoices.length > 0) {
        return { state: working, log: [...logger.log, ...paidLog], pendingChoices: cascaded.pendingChoices };
      }
    }
  }

  working = recordEventActivation(working, action.playerId, action.handCardInstanceId, defs);

  const fired = fireActivate(working, action.handCardInstanceId, registry, defs, action.actionId, deferDonMinusChoice);

  let resultState = fired.state;
  let resultLog = [...logger.log, ...paidLog, ...fired.log];
  if (fired.pendingChoices.length === 0) {
    const reactive = fireEventActivatedReactions(resultState, action.playerId, registry, defs, action.actionId);
    resultState = reactive.state;
    resultLog = [...resultLog, ...reactive.log];
    if (reactive.pendingChoices.length > 0) {
      return { state: resultState, log: resultLog, pendingChoices: reactive.pendingChoices };
    }
  }

  return { state: resultState, log: resultLog, pendingChoices: fired.pendingChoices };
}
