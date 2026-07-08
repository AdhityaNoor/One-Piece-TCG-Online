/**
 * ACTIVATE_COUNTER_EVENT (7-1-3-2-2). Counter Step only, defending-player-only.
 *
 * The defending player plays a Counter Event from hand by paying its DON!! cost,
 * the card moves hand -> trash (Events resolve then trash, 8-1), and its
 * [Counter] ability fires through the generic interpreter (timing 'counter').
 * The boost amount is NOT read from text here; it comes from the card's
 * curated EffectProgram in the injected registry, keeping the engine free of
 * card text (project rule #6/#7). A card with no curated [Counter] ability is
 * rejected rather than played as a no-op.
 *
 * No fresh-instance minting: an Event never enters the Character/Stage area, so
 * 3-1-6 re-minting doesn't apply (cf. activateEventMain.ts).
 */
import type { GameState } from '../../state/game';
import type { ActivateCounterEventAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../../rules/shared/zoneOps';
import { getDefinition, type CardDefinitionLookup } from '../../rules/shared/definitions';
import { computeCurrentCost } from '../../rules/shared/power';
import { getOpponentId } from '../../rules/shared/players';
import type { ActionExecuteResult } from '../actionExecuteResult';
import { fireCounter, canPayAbilityCost, payAbilityCost, afterAbilityCostPaid, type EffectTemplateRegistry } from '../../effects';

export function validateActivateCounterEvent(
  state: GameState,
  action: ActivateCounterEventAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ValidationResult {
  const reasons: string[] = [];

  const battle = state.currentBattle;
  if (!battle || battle.step !== 'counter') {
    reasons.push('ACTIVATE_COUNTER_EVENT is only legal during the Counter Step (7-1-3-2-2).');
  }

  let defendingPlayerId: string | null = null;
  try {
    defendingPlayerId = getOpponentId(state, state.activePlayerId);
  } catch {
    reasons.push('Could not resolve defending player.');
  }
  if (defendingPlayerId && action.playerId !== defendingPlayerId) {
    reasons.push('Only the defending player may activate a Counter Event (7-1-3).');
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

  const program = registry[handInstance.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.timing === 'counter');
  if (!ability) {
    reasons.push(`'${def.name}' has no [Counter] effect to activate.`);
  }
  if (ability?.cost?.length) {
    reasons.push(...canPayAbilityCost(state, action.handCardInstanceId, action.playerId, ability.cost, action.abilityCostDonInstanceIds ?? []));
  } else if ((action.abilityCostDonInstanceIds?.length ?? 0) > 0) {
    reasons.push('This Counter Event has no DON!! -N ability cost, so abilityCostDonInstanceIds must be empty.');
  }

  const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
  if (action.donInstanceIds.length !== cost) {
    reasons.push(`'${def.name}' costs ${cost} DON!!, but ${action.donInstanceIds.length} were supplied (7-1-3-2-2).`);
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

export function executeActivateCounterEvent(
  state: GameState,
  action: ActivateCounterEventAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const player = state.players[action.playerId];
  const handInstance = state.cardsById[action.handCardInstanceId];
  const def = getDefinition(defs, handInstance);
  const ability = registry[handInstance.cardDefinitionId]?.abilities.find((a) => a.timing === 'counter');
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
    message: `${action.playerId} played Counter Event ${def.name} (cost ${action.donInstanceIds.length}) during the Counter Step (7-1-3-2-2).`,
    data: { from: 'hand', to: 'trash', cost: action.donInstanceIds.length, donInstanceIds: action.donInstanceIds },
    relatedCardInstanceIds: [action.handCardInstanceId],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    players: { ...state.players, [action.playerId]: newPlayer },
    log: [...state.log, ...logger.log],
  };

  // Pay structured [Counter] ability costs (for example DON!! -N) before the
  // counter effect resolves. The Event play cost above is separate.
  const paid = ability?.cost?.length
    ? payAbilityCost(nextState, action.handCardInstanceId, action.playerId, ability.cost, action.actionId, action.abilityCostDonInstanceIds ?? [])
    : { state: nextState, log: [] as ActionExecuteResult['log'], restedInstanceIds: [] as string[], returnedDonCount: 0 };

  let working = paid.state;
  let paidLog = [...paid.log];
  if (paid.restedInstanceIds.length > 0 || paid.returnedDonCount > 0) {
    const cascaded = afterAbilityCostPaid(working, action.playerId, paid, registry, defs, action.actionId);
    working = cascaded.state;
    paidLog = [...paidLog, ...cascaded.log];
    if (cascaded.pendingChoices.length > 0) {
      return { state: working, log: [...logger.log, ...paidLog], pendingChoices: cascaded.pendingChoices };
    }
  }

  // Fire the [Counter] ability (timing 'counter'); may emit a target choice.
  const fired = fireCounter(working, action.handCardInstanceId, registry, defs, action.actionId);
  return {
    state: fired.state,
    log: [...logger.log, ...paidLog, ...fired.log],
    pendingChoices: fired.pendingChoices,
  };
}
