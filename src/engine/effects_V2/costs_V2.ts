import type { GameLogEntry } from '../logs/logEntry';
import type { ContinuousEffectDuration, GameState } from '../state/game';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../rules/shared/zoneOps';
import { createActionLogger } from '../rules/shared/actionLogger';
import { payDonMinus } from '../effects/abilityCost';
import { createSeededRng } from '../rng';
import type { CostAction_V2, Duration_V2, ValueExpression_V2 } from '../../cards/effectCompiler_V2/types_V2';
import { resolveSelector_V2, type EffectBindings_V2, type ResolvedSelector_V2, type SelectorContext_V2 } from './selectorResolver_V2';

export interface CostPaymentSelection_V2 {
  costIndex: number;
  selectedInstanceIds: string[];
  selectedTargetInstanceIds?: string[];
  selectedOptionIndex?: number;
  optionSelections?: CostPaymentSelection_V2[];
}

export interface CostValidationResult_V2 {
  legal: boolean;
  reasons: string[];
}

export interface CostPaymentResult_V2 {
  state: GameState;
  log: GameLogEntry[];
  paidInstanceIds: string[];
  bindings?: EffectBindings_V2;
}

function appendBinding(bucket: Record<string, string[]>, key: string, ids: readonly string[]): void {
  if (ids.length === 0) return;
  bucket[key] = [...(bucket[key] ?? []), ...ids];
}

function selectedForCost(selections: readonly CostPaymentSelection_V2[], index: number): string[] {
  return selections.find((selection) => selection.costIndex === index)?.selectedInstanceIds ?? [];
}

function fixedNumber(value: ValueExpression_V2): number | null {
  return value && typeof value === 'object' && 'kind' in value && value.kind === 'NUMBER' ? value.value : null;
}

function validatePerCardCategorySelection(ctx: SelectorContext_V2, resolved: ResolvedSelector_V2, selected: readonly string[], label: string, reasons: string[]): void {
  if (!resolved.perCardCategory || resolved.perCardCategory.maximum < 0) return;
  const selectedByCategory: Record<string, number> = {};
  for (const id of selected) {
    const inst = ctx.state.cardsById[id];
    const def = inst ? ctx.defs[inst.cardDefinitionId] : undefined;
    if (!def) continue;
    selectedByCategory[def.category] = (selectedByCategory[def.category] ?? 0) + 1;
  }
  for (const [category, count] of Object.entries(selectedByCategory)) {
    if (count > resolved.perCardCategory.maximum) {
      reasons.push(`${label} allows at most ${resolved.perCardCategory.maximum} ${category} card(s), but ${count} were selected.`);
    }
  }
}

function validateSelectedIds(ctx: SelectorContext_V2, cost: Extract<CostAction_V2, { selector: unknown }>, selected: readonly string[], label: string, reasons: string[]): void {
  const resolved = resolveSelector_V2(ctx, cost.selector);
  const allowed = new Set(resolved.candidateInstanceIds);
  const unique = new Set(selected);
  if (unique.size !== selected.length) reasons.push(`${label} cost selection contains duplicate cards.`);
  if (selected.length < resolved.minimum) reasons.push(`${label} cost requires at least ${resolved.minimum} card(s), but ${selected.length} were selected.`);
  if (resolved.maximum >= 0 && selected.length > resolved.maximum) reasons.push(`${label} cost allows at most ${resolved.maximum} card(s), but ${selected.length} were selected.`);
  validatePerCardCategorySelection(ctx, resolved, selected, `${label} cost`, reasons);
  for (const id of selected) {
    if (!allowed.has(id)) reasons.push(`${label} cost selected ineligible card '${id}'.`);
  }
}

function validateSelectorSelection(ctx: SelectorContext_V2, selector: Extract<CostAction_V2, { type: 'GIVE_DON_COST' }>['donSelector'], selected: readonly string[], label: string, reasons: string[]): void {
  const resolved = resolveSelector_V2(ctx, selector);
  const allowed = new Set(resolved.candidateInstanceIds);
  const unique = new Set(selected);
  if (unique.size !== selected.length) reasons.push(`${label} selection contains duplicate cards.`);
  if (selected.length < resolved.minimum) reasons.push(`${label} requires at least ${resolved.minimum} card(s), but ${selected.length} were selected.`);
  if (resolved.maximum >= 0 && selected.length > resolved.maximum) reasons.push(`${label} allows at most ${resolved.maximum} card(s), but ${selected.length} were selected.`);
  validatePerCardCategorySelection(ctx, resolved, selected, label, reasons);
  for (const id of selected) {
    if (!allowed.has(id)) reasons.push(`${label} selected ineligible card '${id}'.`);
  }
}

export function validateCostPayments_V2(
  ctx: SelectorContext_V2,
  costs: readonly CostAction_V2[],
  selections: readonly CostPaymentSelection_V2[] = [],
): CostValidationResult_V2 {
  const reasons: string[] = [];
  for (const [index, cost] of costs.entries()) {
    const selected = selectedForCost(selections, index);
    switch (cost.type) {
      case 'REST_DON_COST':
      case 'DON_MINUS_COST': {
        const count = fixedNumber(cost.count);
        if (count == null) reasons.push(`${cost.type} requires a fixed numeric count for native V2 payment.`);
        else if (selected.length !== count) reasons.push(`${cost.type} requires selecting ${count} DON!! card(s), but ${selected.length} were selected.`);
        break;
      }
      case 'REST_CARD_COST':
      case 'TRASH_CARD_COST':
      case 'KO_CARD_COST':
      case 'MODIFY_POWER_COST':
      case 'PLAY_CARD_COST':
      case 'RETURN_CARD_TO_HAND_COST':
      case 'RETURN_CARD_TO_DECK_COST':
      case 'RETURN_DON_TO_DON_DECK_COST':
      case 'RETURN_DON_TO_COST_AREA_COST':
      case 'ADD_CARD_TO_LIFE_COST':
      case 'ADD_LIFE_TO_HAND_COST':
      case 'TRASH_LIFE_COST':
      case 'TURN_LIFE_FACE_UP_COST':
      case 'TURN_LIFE_FACE_DOWN_COST':
      case 'REVEAL_CARD_COST':
        validateSelectedIds(ctx, cost, selected, cost.type, reasons);
        break;
      case 'GIVE_DON_COST': {
        const targetSelected = selections.find((selection) => selection.costIndex === index)?.selectedTargetInstanceIds ?? [];
        validateSelectorSelection(ctx, cost.donSelector, selected, 'GIVE_DON_COST DON', reasons);
        validateSelectorSelection(ctx, cost.targetSelector, targetSelected, 'GIVE_DON_COST target', reasons);
        if (selected.length > 0 && targetSelected.length !== 1) reasons.push('GIVE_DON_COST requires exactly one target for selected DON!! cards.');
        break;
      }
      case 'RETURN_CARD_TO_DECK_AND_SHUFFLE_COST':
        validateSelectedIds(ctx, cost, selected, cost.type, reasons);
        break;
      case 'CHOOSE_ONE_COST': {
        const selection = selections.find((candidate) => candidate.costIndex === index);
        const optionIndex = selection?.selectedOptionIndex;
        if (optionIndex == null) {
          reasons.push('CHOOSE_ONE_COST requires selectedOptionIndex.');
          break;
        }
        const option = cost.options[optionIndex];
        if (!option) {
          reasons.push(`CHOOSE_ONE_COST selected invalid option ${optionIndex}.`);
          break;
        }
        const optionValidation = validateCostPayments_V2(ctx, option, selection?.optionSelections ?? []);
        reasons.push(...optionValidation.reasons.map((reason) => `CHOOSE_ONE_COST option ${optionIndex}: ${reason}`));
        break;
      }
      case 'RAW_COST':
        reasons.push(`RAW_COST is not natively payable yet: ${cost.rawText}`);
        break;
    }
  }
  return { legal: reasons.length === 0, reasons };
}

function durationToContinuousDuration(duration: Duration_V2): ContinuousEffectDuration {
  switch (duration.kind) {
    case 'THIS_BATTLE':
      return 'duringThisBattle';
    case 'THIS_TURN':
      return 'duringThisTurn';
    case 'UNTIL_END_OF_CURRENT_TURN':
      return 'endOfTurn';
    case 'UNTIL_END_OF_NEXT_TURN':
      return duration.player === 'OPPONENT' ? 'endOfOpponentsTurn' : 'endOfTurn';
    case 'UNTIL_NEXT_REFRESH_PHASE':
      return 'untilStartOfNextTurn';
    case 'WHILE_SOURCE_VALID':
    case 'WHILE_SOURCE_IN_ZONE':
    case 'WHILE_CONDITION':
      return 'permanent';
    case 'PERMANENT':
      return 'permanent';
    case 'INSTANT':
      return 'duringThisTurn';
  }
}

function applyPowerCostModifier(
  state: GameState,
  sourceInstanceId: string,
  ownerId: string,
  instanceId: string,
  amount: number,
  duration: Duration_V2,
): GameState {
  const record = {
    id: `v2-cost-${sourceInstanceId}-${state.continuousEffects.length}`,
    sourceInstanceId,
    ownerId,
    duration: durationToContinuousDuration(duration),
    description: `V2 cost power ${amount >= 0 ? '+' : ''}${amount}`,
    powerModifier: {
      appliesToInstanceId: instanceId,
      amount,
    },
  } satisfies GameState['continuousEffects'][number];
  return { ...state, continuousEffects: [...state.continuousEffects, record] };
}

function detachDonFromAnyHost(cardsById: GameState['cardsById'], donInstanceId: string): GameState['cardsById'] {
  let next = cardsById;
  for (const [id, card] of Object.entries(next)) {
    if (!card.donAttached.includes(donInstanceId)) continue;
    next = {
      ...next,
      [id]: { ...card, donAttached: card.donAttached.filter((attachedId) => attachedId !== donInstanceId) },
    };
  }
  return next;
}

function attachDonCost(state: GameState, donInstanceId: string, targetInstanceId: string): GameState {
  const don = state.cardsById[donInstanceId];
  const target = state.cardsById[targetInstanceId];
  if (!don || !target) return state;
  const donOwner = state.players[don.ownerId];
  if (!donOwner) return state;
  let cardsById = detachDonFromAnyHost(state.cardsById, donInstanceId);
  cardsById = {
    ...cardsById,
    [donInstanceId]: { ...cardsById[donInstanceId], currentZone: target.currentZone, donRested: true, revealedTo: 'all' },
    [targetInstanceId]: { ...cardsById[targetInstanceId], donAttached: [...cardsById[targetInstanceId].donAttached, donInstanceId] },
  };
  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [don.ownerId]: {
        ...donOwner,
        costArea: removeFromZone(donOwner.costArea, donInstanceId),
      },
    },
  };
}

function removeFromAllOwnerZones(state: GameState, instanceId: string): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  const owner = state.players[inst.ownerId];
  if (!owner) return state;
  return {
    ...state,
    players: {
      ...state.players,
      [inst.ownerId]: {
        ...owner,
        hand: removeFromZone(owner.hand, instanceId),
        deck: removeFromZone(owner.deck, instanceId),
        trash: removeFromZone(owner.trash, instanceId),
        characterArea: removeFromZone(owner.characterArea, instanceId),
        stageArea: removeFromZone(owner.stageArea, instanceId),
        costArea: removeFromZone(owner.costArea, instanceId),
        lifeArea: removeFromZone(owner.lifeArea, instanceId),
        donDeck: removeFromZone(owner.donDeck, instanceId),
      },
    },
  };
}

function moveCostCard(state: GameState, instanceId: string, destination: 'rest' | 'trash' | 'hand' | 'deckTop' | 'deckBottom' | 'donDeck' | 'lifeToHand' | 'lifeToTrash' | 'reveal'): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  if (destination === 'rest') {
    return {
      ...state,
      cardsById: {
        ...state.cardsById,
        [instanceId]: { ...inst, orientation: inst.orientation ? 'rested' : inst.orientation, donRested: inst.donRested === undefined ? inst.donRested : true },
      },
    };
  }
  if (destination === 'reveal') {
    return {
      ...state,
      cardsById: { ...state.cardsById, [instanceId]: { ...inst, revealedTo: 'all' } },
    };
  }
  if (destination === 'lifeToHand' || destination === 'lifeToTrash') {
    // handled below as zone moves
  }

  let working = removeFromAllOwnerZones(state, instanceId);
  const nextInst = working.cardsById[instanceId];
  const owner = working.players[nextInst.ownerId];
  if (!owner) return working;

  if (destination === 'trash' || destination === 'lifeToTrash') {
    return {
      ...working,
      players: { ...working.players, [nextInst.ownerId]: { ...owner, trash: addToZoneTop(owner.trash, instanceId) } },
      cardsById: { ...working.cardsById, [instanceId]: { ...nextInst, currentZone: 'trash', donAttached: [], revealedTo: 'all' } },
      continuousEffects: working.continuousEffects.filter((effect) => effect.sourceInstanceId !== instanceId),
    };
  }
  if (destination === 'hand' || destination === 'lifeToHand') {
    return {
      ...working,
      players: { ...working.players, [nextInst.ownerId]: { ...owner, hand: addToZoneBottom(owner.hand, instanceId) } },
      cardsById: { ...working.cardsById, [instanceId]: { ...nextInst, currentZone: 'hand', donAttached: [], revealedTo: [nextInst.ownerId] } },
      continuousEffects: working.continuousEffects.filter((effect) => effect.sourceInstanceId !== instanceId),
    };
  }
  if (destination === 'deckTop' || destination === 'deckBottom') {
    return {
      ...working,
      players: {
        ...working.players,
        [nextInst.ownerId]: {
          ...owner,
          deck: destination === 'deckTop' ? addToZoneTop(owner.deck, instanceId) : addToZoneBottom(owner.deck, instanceId),
        },
      },
      cardsById: { ...working.cardsById, [instanceId]: { ...nextInst, currentZone: 'deck', donAttached: [], revealedTo: [] } },
      continuousEffects: working.continuousEffects.filter((effect) => effect.sourceInstanceId !== instanceId),
    };
  }
  return {
    ...working,
    players: { ...working.players, [nextInst.ownerId]: { ...owner, donDeck: addToZoneTop(owner.donDeck, instanceId) } },
    cardsById: { ...working.cardsById, [instanceId]: { ...nextInst, currentZone: 'donDeck', donRested: false, revealedTo: 'all' } },
  };
}

function playCostCard(state: GameState, instanceId: string, playedState: 'ACTIVE' | 'RESTED' = 'ACTIVE'): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  let working = removeFromAllOwnerZones(state, instanceId);
  const nextInst = working.cardsById[instanceId];
  const owner = working.players[nextInst.ownerId];
  if (!owner) return working;
  return {
    ...working,
    players: {
      ...working.players,
      [nextInst.ownerId]: {
        ...owner,
        characterArea: addToZoneBottom(owner.characterArea, instanceId),
      },
    },
    cardsById: {
      ...working.cardsById,
      [instanceId]: {
        ...nextInst,
        currentZone: 'characterArea',
        orientation: playedState === 'RESTED' ? 'rested' : 'active',
        faceState: 'faceUp',
        revealedTo: 'all',
        summoningSick: true,
      },
    },
  };
}

function addCardToLifeCost(state: GameState, instanceId: string, position: 'TOP' | 'BOTTOM', face: 'FACE_UP' | 'FACE_DOWN'): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  let working = removeFromAllOwnerZones(state, instanceId);
  const nextInst = working.cardsById[instanceId];
  const owner = working.players[nextInst.ownerId];
  if (!owner) return working;
  return {
    ...working,
    players: {
      ...working.players,
      [nextInst.ownerId]: {
        ...owner,
        lifeArea: position === 'TOP' ? addToZoneTop(owner.lifeArea, instanceId) : addToZoneBottom(owner.lifeArea, instanceId),
      },
    },
    cardsById: {
      ...working.cardsById,
      [instanceId]: {
        ...nextInst,
        currentZone: 'lifeArea',
        orientation: null,
        faceState: face === 'FACE_UP' ? 'faceUp' : 'faceDown',
        donAttached: [],
        revealedTo: face === 'FACE_UP' ? 'all' : [],
      },
    },
    continuousEffects: working.continuousEffects.filter((effect) => effect.sourceInstanceId !== instanceId),
  };
}

function returnDonToCostAreaCost(state: GameState, instanceId: string, returnedState: 'ACTIVE' | 'RESTED'): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  const owner = state.players[inst.ownerId];
  if (!owner) return state;
  const cardsById = detachDonFromAnyHost(state.cardsById, instanceId);
  return {
    ...state,
    cardsById: {
      ...cardsById,
      [instanceId]: {
        ...cardsById[instanceId],
        currentZone: 'costArea',
        donRested: returnedState === 'RESTED',
        revealedTo: 'all',
      },
    },
    players: {
      ...state.players,
      [inst.ownerId]: {
        ...owner,
        costArea: addToZoneBottom(removeFromZone(owner.costArea, instanceId), instanceId),
        donDeck: removeFromZone(owner.donDeck, instanceId),
      },
    },
  };
}

function shuffleDecksForSelectedOwners(state: GameState, selected: readonly string[]): GameState {
  const owners = [...new Set(selected.map((id) => state.cardsById[id]?.ownerId).filter((id): id is string => Boolean(id)))];
  let working = state;
  let rngState = working.rng;
  for (const ownerId of owners) {
    const owner = working.players[ownerId];
    if (!owner) continue;
    const rng = createSeededRng(rngState.seed);
    const shuffled = rng.shuffle(rngState, owner.deck.cardIds);
    rngState = shuffled.nextState;
    working = {
      ...working,
      rng: rngState,
      players: {
        ...working.players,
        [ownerId]: {
          ...owner,
          deck: { ...owner.deck, cardIds: shuffled.result },
        },
      },
    };
  }
  return working;
}

export function payCosts_V2(
  ctx: SelectorContext_V2,
  costs: readonly CostAction_V2[],
  selections: readonly CostPaymentSelection_V2[] = [],
  actionId: string | null = null,
): CostPaymentResult_V2 {
  const validation = validateCostPayments_V2(ctx, costs, selections);
  if (!validation.legal) throw new Error(`payCosts_V2 failed validation: ${validation.reasons.join('; ')}`);

  const logger = createActionLogger(ctx.state, actionId);
  let working = ctx.state;
  const paidInstanceIds: string[] = [];
  const selectedObjects: Record<string, string[]> = { ...(ctx.bindings?.selectedObjects ?? {}) };
  const actionResults: Record<string, unknown> = { ...(ctx.bindings?.actionResults ?? {}) };

  for (const [index, cost] of costs.entries()) {
    const selected = selectedForCost(selections, index);
    switch (cost.type) {
      case 'DON_MINUS_COST':
        working = payDonMinus(working, ctx.controllerId, selected, logger);
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        break;
      case 'REST_DON_COST':
      case 'REST_CARD_COST':
        for (const id of selected) working = moveCostCard(working, id, 'rest');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RESTED_PREVIOUSLY', selected);
        break;
      case 'TRASH_CARD_COST':
      case 'KO_CARD_COST':
        for (const id of selected) working = moveCostCard(working, id, 'trash');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'TRASHED_PREVIOUSLY', selected);
        actionResults['trashed-card-count'] = Number(actionResults['trashed-card-count'] ?? 0) + selected.length;
        break;
      case 'MODIFY_POWER_COST': {
        const value = fixedNumber(cost.value);
        if (value == null) break;
        const amount = cost.operation === 'SUBTRACT' ? -value : value;
        for (const id of selected) {
          working = applyPowerCostModifier(working, ctx.sourceInstanceId, ctx.controllerId, id, amount, cost.duration);
        }
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        break;
      }
      case 'GIVE_DON_COST': {
        const targetId = selections.find((selection) => selection.costIndex === index)?.selectedTargetInstanceIds?.[0];
        if (!targetId) break;
        for (const id of selected) {
          working = attachDonCost(working, id, targetId);
        }
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        break;
      }
      case 'PLAY_CARD_COST':
        for (const id of selected) working = playCostCard(working, id, cost.state);
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'PLAYED_SOURCE_PREVIOUSLY', selected);
        break;
      case 'RETURN_CARD_TO_HAND_COST':
        for (const id of selected) working = moveCostCard(working, id, 'hand');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_TO_HAND_PREVIOUSLY', selected);
        break;
      case 'RETURN_CARD_TO_DECK_COST':
        for (const id of selected) working = moveCostCard(working, id, cost.position === 'TOP' ? 'deckTop' : 'deckBottom');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_TO_DECK_PREVIOUSLY', selected);
        break;
      case 'RETURN_CARD_TO_DECK_AND_SHUFFLE_COST':
        for (const id of selected) working = moveCostCard(working, id, 'deckBottom');
        working = shuffleDecksForSelectedOwners(working, selected);
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_TO_DECK_PREVIOUSLY', selected);
        break;
      case 'RETURN_DON_TO_DON_DECK_COST':
        for (const id of selected) working = moveCostCard(working, id, 'donDeck');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_PREVIOUSLY', selected);
        break;
      case 'RETURN_DON_TO_COST_AREA_COST':
        for (const id of selected) working = returnDonToCostAreaCost(working, id, cost.state);
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_PREVIOUSLY', selected);
        break;
      case 'ADD_CARD_TO_LIFE_COST':
        for (const id of selected) working = addCardToLifeCost(working, id, cost.position, cost.face);
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        break;
      case 'ADD_LIFE_TO_HAND_COST':
        for (const id of selected) working = moveCostCard(working, id, 'lifeToHand');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'RETURNED_TO_HAND_PREVIOUSLY', selected);
        break;
      case 'TRASH_LIFE_COST':
        for (const id of selected) working = moveCostCard(working, id, 'lifeToTrash');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'TRASHED_PREVIOUSLY', selected);
        break;
      case 'TURN_LIFE_FACE_UP_COST':
      case 'TURN_LIFE_FACE_DOWN_COST':
        for (const id of selected) {
          const inst = working.cardsById[id];
          if (!inst) continue;
          working = {
            ...working,
            cardsById: {
              ...working.cardsById,
              [id]: { ...inst, faceState: cost.type === 'TURN_LIFE_FACE_UP_COST' ? 'faceUp' : 'faceDown', revealedTo: cost.type === 'TURN_LIFE_FACE_UP_COST' ? 'all' : [] },
            },
          };
        }
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        break;
      case 'REVEAL_CARD_COST':
        for (const id of selected) working = moveCostCard(working, id, 'reveal');
        paidInstanceIds.push(...selected);
        appendBinding(selectedObjects, 'COST_PAID_PREVIOUSLY', selected);
        appendBinding(selectedObjects, 'REVEALED_PREVIOUSLY', selected);
        break;
      case 'CHOOSE_ONE_COST':
        {
          const selection = selections.find((candidate) => candidate.costIndex === index);
          const optionIndex = selection?.selectedOptionIndex;
          const option = optionIndex == null ? undefined : cost.options[optionIndex];
          if (!option) break;
          const result = payCosts_V2({ ...ctx, state: working }, option, selection?.optionSelections ?? [], actionId);
          working = result.state;
          paidInstanceIds.push(...result.paidInstanceIds);
          for (const [key, ids] of Object.entries(result.bindings?.selectedObjects ?? {})) {
            appendBinding(selectedObjects, key, ids);
          }
          Object.assign(actionResults, result.bindings?.actionResults ?? {});
        }
        break;
      case 'RAW_COST':
        break;
    }
  }

  if (paidInstanceIds.length > 0) {
    logger.push({
      actorPlayerId: ctx.controllerId,
      type: 'EFFECT_RESOLVED',
      message: `${ctx.controllerId} paid ${paidInstanceIds.length} V2 effect cost item${paidInstanceIds.length === 1 ? '' : 's'}.`,
      data: { paidInstanceIds },
      relatedCardInstanceIds: paidInstanceIds,
      visibility: 'public',
    });
  }

  const state = { ...working, log: [...working.log, ...logger.log] };
  return {
    state,
    log: logger.log,
    paidInstanceIds,
    bindings: {
      selectedObjects: {
        ...selectedObjects,
        ...(paidInstanceIds.length ? {
          SELECTED_PREVIOUSLY: paidInstanceIds,
          PREVIOUS_ACTION_TARGET: paidInstanceIds,
        } : {}),
      },
      actionResults,
    },
  };
}
