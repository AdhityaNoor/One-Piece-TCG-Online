import type { CardDefinition } from '../state/card';
import type { GameState } from '../state/game';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import type { EffectRuntimeBundle_V2 } from './runtime_V2';
import type { EffectRuntimeSidecars_V2 } from './dispatcher_V2';
import { computeCurrentCost, computeCurrentPower, hasContinuousKeyword } from '../rules/shared/power';
import { cardHasNoBaseEffect } from '../effects/cardHasNoBaseEffect';
import type {
  CardCategory_V2,
  Color_V2,
  KeywordEffect_V2,
  NumericPropertyFilter_V2,
  PlayerReference_V2,
  Quantity_V2,
  Selector_V2,
  ValueExpression_V2,
  Zone_V2,
} from '../../cards/effectCompiler_V2/types_V2';
import type { CardPropertyModifierRecord_V2 } from './modifiers_V2';

export interface EffectBindings_V2 {
  selectedObjects: Record<string, string[]>;
  actionResults: Record<string, unknown>;
}

export interface SelectorContext_V2 {
  state: GameState;
  defs: CardDefinitionLookup;
  sourceInstanceId: string;
  controllerId: string;
  runtime?: EffectRuntimeBundle_V2;
  sidecars?: EffectRuntimeSidecars_V2;
  currentTiming?: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
  bindings?: EffectBindings_V2;
}

export interface ResolvedSelector_V2 {
  selector: Selector_V2;
  candidateInstanceIds: string[];
  minimum: number;
  maximum: number;
  perCardCategory?: { minimum: number; maximum: number };
  isOrdered: boolean;
}

const CATEGORY_TO_V2: Record<string, CardCategory_V2> = {
  leader: 'LEADER',
  character: 'CHARACTER',
  event: 'EVENT',
  stage: 'STAGE',
  don: 'DON',
};

const COLOR_TO_V2: Record<string, Color_V2> = {
  red: 'RED',
  green: 'GREEN',
  blue: 'BLUE',
  purple: 'PURPLE',
  black: 'BLACK',
  yellow: 'YELLOW',
};

const KEYWORD_TO_LEGACY: Partial<Record<KeywordEffect_V2, Parameters<typeof hasContinuousKeyword>[3]>> = {
  RUSH: 'rush',
  RUSH_CHARACTER: 'canAttackCharactersWhileSummoningSick',
  DOUBLE_ATTACK: 'doubleAttack',
  BANISH: 'banish',
  BLOCKER: 'blocker',
  UNBLOCKABLE: 'unblockable',
  CAN_ATTACK_ACTIVE: 'canAttackActive',
};

function hasPrintedKeyword_V2(def: CardDefinition, keyword: KeywordEffect_V2): boolean {
  switch (keyword) {
    case 'RUSH':
      return def.hasRush;
    case 'RUSH_CHARACTER':
      return false;
    case 'DOUBLE_ATTACK':
      return def.hasDoubleAttack;
    case 'BANISH':
      return Boolean(def.hasBanish);
    case 'BLOCKER':
      return def.hasBlocker;
    case 'TRIGGER':
      return def.hasTrigger;
    case 'UNBLOCKABLE':
      return def.isUnblockable;
    case 'CAN_ATTACK_ACTIVE':
      return false;
  }
}

function opponentOf(state: GameState, playerId: string): string {
  return Object.keys(state.players).find((id) => id !== playerId) ?? playerId;
}

function playerForReference(ctx: SelectorContext_V2, ref: PlayerReference_V2 | undefined): string | null {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (ref) {
    case undefined:
      return null;
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return ctx.controllerId;
    case 'OPPONENT':
      return opponentOf(ctx.state, ctx.controllerId);
    case 'CARD_OWNER':
      return source?.ownerId ?? ctx.controllerId;
    case 'CARD_CONTROLLER':
      return source?.controllerId ?? ctx.controllerId;
    case 'ANY':
      return null;
  }
}

function idsInZone(state: GameState, playerId: string, zone: Zone_V2): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  switch (zone) {
    case 'LEADER_AREA':
      return [player.leaderInstanceId];
    case 'CHARACTER_AREA':
      return player.characterArea.cardIds;
    case 'STAGE_AREA':
      return player.stageArea.cardIds;
    case 'COST_AREA':
      return player.costArea.cardIds;
    case 'HAND':
      return player.hand.cardIds;
    case 'DECK':
      return player.deck.cardIds;
    case 'TRASH':
      return player.trash.cardIds;
    case 'LIFE':
      return player.lifeArea.cardIds;
    case 'DON_DECK':
      return player.donDeck.cardIds;
    case 'ATTACHED_DON':
      return Object.values(state.cardsById)
        .filter((card) => card.controllerId === playerId)
        .flatMap((card) => card.donAttached);
    case 'RESOLVING_TRIGGER':
    case 'RESOLUTION_LIMBO':
    case 'NONE':
      return [];
  }
}

function allZoneIdsForPlayer(state: GameState, playerId: string): string[] {
  return [
    ...idsInZone(state, playerId, 'LEADER_AREA'),
    ...idsInZone(state, playerId, 'CHARACTER_AREA'),
    ...idsInZone(state, playerId, 'STAGE_AREA'),
    ...idsInZone(state, playerId, 'COST_AREA'),
    ...idsInZone(state, playerId, 'HAND'),
    ...idsInZone(state, playerId, 'DECK'),
    ...idsInZone(state, playerId, 'TRASH'),
    ...idsInZone(state, playerId, 'LIFE'),
    ...idsInZone(state, playerId, 'DON_DECK'),
  ];
}

function baseCandidates(ctx: SelectorContext_V2, selector: Selector_V2): string[] {
  if (selector.instanceIds?.length) {
    return selector.instanceIds.filter((id) => Boolean(ctx.state.cardsById[id]));
  }

  if (selector.subject === 'ACTION_RESULT') {
    const fromSelection = selector.relations
      ?.map((relation) => ctx.bindings?.selectedObjects[relation] ?? [])
      .flat() ?? [];
    if (fromSelection.length > 0) return fromSelection;
    const previous = ctx.bindings?.selectedObjects.SELECTED_PREVIOUSLY ?? ctx.bindings?.selectedObjects.PREVIOUS_ACTION_TARGET;
    return previous ?? [];
  }

  const state = ctx.state;
  const ownerId = selector.owner ? playerForReference(ctx, selector.owner) : null;
  const controllerId = selector.controller ? playerForReference(ctx, selector.controller) : null;
  const playerScope = ownerId ?? controllerId ?? ctx.controllerId;
  const playerIds = playerScope ? [playerScope] : Object.keys(state.players);
  const zones = selector.zones?.length ? selector.zones : undefined;
  const ids = playerIds.flatMap((playerId) =>
    zones ? zones.flatMap((zone) => idsInZone(state, playerId, zone)) : allZoneIdsForPlayer(state, playerId),
  );

  return [...new Set(ids)].filter((id) => {
    const inst = state.cardsById[id];
    if (!inst) return false;
    if (ownerId && inst.ownerId !== ownerId) return false;
    if (controllerId && inst.controllerId !== controllerId) return false;
    if (selector.subject === 'DON') return defOf(ctx, id)?.category === 'don';
    if (selector.subject === 'CARD') return defOf(ctx, id)?.category !== 'don';
    return selector.subject === 'PLAYER' ? false : true;
  });
}

function defOf(ctx: SelectorContext_V2, instanceId: string): CardDefinition | undefined {
  const card = ctx.state.cardsById[instanceId];
  return card ? ctx.defs[card.cardDefinitionId] : undefined;
}

function numberValue(value: ValueExpression_V2 | undefined): number | undefined {
  return value?.kind === 'NUMBER' ? value.value : undefined;
}

export function quantityBounds_V2(quantity: Quantity_V2 | undefined): { minimum: number; maximum: number } {
  if (!quantity) return { minimum: 1, maximum: 1 };
  if (quantity.kind === 'ALL' || quantity.kind === 'ANY_NUMBER') return { minimum: 0, maximum: -1 };
  const value = numberValue(quantity.value) ?? 1;
  if (quantity.kind === 'UP_TO') return { minimum: 0, maximum: value };
  if (quantity.kind === 'AT_LEAST') return { minimum: value, maximum: -1 };
  return { minimum: value, maximum: value };
}

function compareNumber(actual: number | undefined, filter: NumericPropertyFilter_V2 | undefined): boolean {
  if (!filter) return true;
  if (actual === undefined) return false;
  const value = numberValue(filter.value);
  const values = filter.values?.map(numberValue).filter((entry): entry is number => entry !== undefined) ?? [];
  const minimum = numberValue(filter.minimum);
  const maximum = numberValue(filter.maximum);
  switch (filter.comparison) {
    case 'EQUAL':
      return value !== undefined && actual === value;
    case 'NOT_EQUAL':
      return value !== undefined && actual !== value;
    case 'AT_LEAST':
    case 'GREATER_THAN':
      return value !== undefined && actual >= value;
    case 'AT_MOST':
    case 'LESS_THAN':
      return value !== undefined && actual <= value;
    case 'BETWEEN':
      return (minimum === undefined || actual >= minimum) && (maximum === undefined || actual <= maximum);
    case 'IN_SET':
      return values.includes(actual);
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function propertyModifierAppliesToInstance_V2(ctx: SelectorContext_V2, record: CardPropertyModifierRecord_V2, instanceId: string): boolean {
  if (record.status !== 'ACTIVE') return false;
  const sidecarsWithoutPropertyModifiers = ctx.sidecars
    ? { ...ctx.sidecars, cardPropertyModifiers: [] }
    : undefined;
  const resolved = resolveSelector_V2({
    ...ctx,
    sourceInstanceId: record.sourceInstanceId,
    controllerId: record.controllerId,
    sidecars: sidecarsWithoutPropertyModifiers,
  }, record.selector);
  return resolved.candidateInstanceIds.includes(instanceId);
}

function cardPropertyModifiersForInstance_V2(ctx: SelectorContext_V2, instanceId: string): CardPropertyModifierRecord_V2[] {
  return (ctx.sidecars?.cardPropertyModifiers ?? []).filter((record) => propertyModifierAppliesToInstance_V2(ctx, record, instanceId));
}

function effectiveNames_V2(def: CardDefinition, modifiers: readonly CardPropertyModifierRecord_V2[]): string[] {
  let names = [def.name];
  for (const record of modifiers) {
    if (record.property !== 'NAME') continue;
    if (record.operation === 'REPLACE_NAMES') names = [...record.values];
    else names = uniqueStrings([...names, ...record.values]);
  }
  return names;
}

function effectiveColors_V2(def: CardDefinition, modifiers: readonly CardPropertyModifierRecord_V2[]): Color_V2[] {
  let colors = def.colors.map((color) => COLOR_TO_V2[color]);
  for (const record of modifiers) {
    if (record.property !== 'COLOR') continue;
    if (record.operation === 'REPLACE_COLORS') colors = [...record.values];
    else if (record.operation === 'ADD_COLOR') colors = uniqueStrings([...colors, ...record.values]) as Color_V2[];
    else colors = colors.filter((color) => !record.values.includes(color));
  }
  return colors;
}

function effectiveTypes_V2(def: CardDefinition, modifiers: readonly CardPropertyModifierRecord_V2[]): string[] {
  let types = [...def.types];
  for (const record of modifiers) {
    if (record.property !== 'TYPE') continue;
    if (record.operation === 'REPLACE_TYPES') types = [...record.values];
    else if (record.operation === 'ADD_TYPE') types = uniqueStrings([...types, ...record.values]);
    else types = types.filter((type) => !record.values.some((removed) => removed.toLowerCase() === type.toLowerCase()));
  }
  return types;
}

function effectiveAttributes_V2(def: CardDefinition, modifiers: readonly CardPropertyModifierRecord_V2[]): string[] {
  let attributes = def.attributes?.map((attr) => attr.toUpperCase()) ?? [];
  for (const record of modifiers) {
    if (record.property !== 'ATTRIBUTE') continue;
    if (record.operation === 'REPLACE_ATTRIBUTES') attributes = [...record.values];
    else if (record.operation === 'ADD_ATTRIBUTE') attributes = uniqueStrings([...attributes, ...record.values]);
    else attributes = attributes.filter((attr) => !(record.values as readonly string[]).includes(attr));
  }
  return attributes;
}

function effectiveHasNoBaseEffect_V2(def: CardDefinition, modifiers: readonly CardPropertyModifierRecord_V2[]): boolean {
  let hasNoBaseEffect = cardHasNoBaseEffect(def);
  for (const record of modifiers) {
    if (record.property !== 'BASE_EFFECT_STATUS') continue;
    hasNoBaseEffect = !record.enabled;
  }
  return hasNoBaseEffect;
}

function hasEffectiveType(types: readonly string[], required: string): boolean {
  const needle = required.toLowerCase();
  return types.some((type) => type.toLowerCase().split(/[\/,]+/).some((part) => part.trim().includes(needle)));
}

function matchesBaseEffectStatus(hasNoBaseEffect: boolean, status: Selector_V2['baseEffectStatus']): boolean {
  if (!status || status === 'ANY') return true;
  return status === 'NO_BASE_EFFECT' ? hasNoBaseEffect : !hasNoBaseEffect;
}

function matchesNameFilters(effectiveNames: readonly string[], names: Selector_V2['names']): boolean {
  if (!names?.length) return true;
  const exactNames = names.filter((name) => name.kind === 'NAME_EXACT').map((name) => name.value);
  const containsNames = names.filter((name) => name.kind === 'NAME_CONTAINS').map((name) => name.value.toLowerCase());
  const excludedNames = names.filter((name) => name.kind === 'NAME_NOT').map((name) => name.value);
  if (excludedNames.some((name) => effectiveNames.includes(name))) return false;
  if (exactNames.length > 0 && !exactNames.some((name) => effectiveNames.includes(name))) return false;
  if (containsNames.length > 0 && !containsNames.some((name) => effectiveNames.some((effective) => effective.toLowerCase().includes(name)))) return false;
  return true;
}

function boundDefsForRelation(ctx: SelectorContext_V2, relation: string): CardDefinition[] {
  const ids = ctx.bindings?.selectedObjects[relation] ?? [];
  return ids.flatMap((id) => {
    const def = defOf(ctx, id);
    return def ? [def] : [];
  });
}

function matchesRelationalFilters(ctx: SelectorContext_V2, selector: Selector_V2, def: CardDefinition): boolean {
  const relations = selector.relations ?? [];
  if (relations.includes('SAME_NAME_AS_TRASHED_PREVIOUSLY')) {
    const trashedDefs = boundDefsForRelation(ctx, 'TRASHED_PREVIOUSLY');
    if (trashedDefs.length === 0 || !trashedDefs.some((trashed) => trashed.name === def.name)) return false;
  }
  if (relations.includes('DIFFERENT_COLOR_THAN_RETURNED_PREVIOUSLY')) {
    const returnedDefs = boundDefsForRelation(ctx, 'RETURNED_PREVIOUSLY');
    const returnedColors = returnedDefs.flatMap((returned) => returned.colors.map((color) => COLOR_TO_V2[color]));
    const candidateColors = def.colors.map((color) => COLOR_TO_V2[color]);
    if (returnedColors.length === 0 || !candidateColors.some((color) => !returnedColors.includes(color))) return false;
  }
  return true;
}

function matchesSelector(ctx: SelectorContext_V2, selector: Selector_V2, instanceId: string): boolean {
  const inst = ctx.state.cardsById[instanceId];
  const def = defOf(ctx, instanceId);
  if (!inst || !def) return false;
  const propertyModifiers = cardPropertyModifiersForInstance_V2(ctx, instanceId);
  const names = effectiveNames_V2(def, propertyModifiers);
  const colors = effectiveColors_V2(def, propertyModifiers);
  const types = effectiveTypes_V2(def, propertyModifiers);
  const attributes = effectiveAttributes_V2(def, propertyModifiers);
  const hasNoBaseEffect = effectiveHasNoBaseEffect_V2(def, propertyModifiers);

  const isSourceCard = instanceId === ctx.sourceInstanceId;
  if (selector.relations?.includes('THIS_CARD') && !isSourceCard) return false;
  if (selector.relations?.includes('EXCLUDE_THIS_CARD') && isSourceCard) return false;
  const forceIncludeSource = selector.relations?.includes('INCLUDE_THIS_CARD') && isSourceCard;

  if (!forceIncludeSource && selector.cardCategories?.length && !selector.cardCategories.includes(CATEGORY_TO_V2[def.category])) return false;
  if (!forceIncludeSource && !matchesBaseEffectStatus(hasNoBaseEffect, selector.baseEffectStatus)) return false;
  if (!forceIncludeSource && !matchesNameFilters(names, selector.names)) return false;
  if (!forceIncludeSource && !matchesRelationalFilters(ctx, selector, def)) return false;

  if (selector.colors) {
    if (!forceIncludeSource && selector.colors.kind === 'HAS_COLOR' && !colors.includes(selector.colors.values[0])) return false;
    if (!forceIncludeSource && selector.colors.kind === 'HAS_ANY_COLOR' && !selector.colors.values.some((color) => colors.includes(color))) return false;
    if (!forceIncludeSource && selector.colors.kind === 'HAS_ALL_COLORS' && !selector.colors.values.every((color) => colors.includes(color))) return false;
  }

  if (selector.types) {
    if (!forceIncludeSource && selector.types.kind === 'HAS_TYPE' && !selector.types.values.every((type) => hasEffectiveType(types, type))) return false;
    if (!forceIncludeSource && selector.types.kind === 'HAS_ANY_TYPE' && !selector.types.values.some((type) => hasEffectiveType(types, type))) return false;
    if (!forceIncludeSource && selector.types.kind === 'TYPE_INCLUDES_TEXT' && !selector.types.values.some((type) => hasEffectiveType(types, type))) return false;
  }

  if (selector.attributes?.values.length) {
    if (!forceIncludeSource && !selector.attributes.values.some((attr) => attributes.includes(attr))) return false;
  }

  const currentCost = computeCurrentCost(ctx.defs, ctx.state, instanceId);
  const currentPower = computeCurrentPower(ctx.defs, ctx.state, instanceId);
  if (!forceIncludeSource && !compareNumber(selector.cost?.propertyLayer === 'CURRENT' ? currentCost : def.baseCost, selector.cost)) return false;
  if (!forceIncludeSource && !compareNumber(selector.power?.propertyLayer === 'CURRENT' ? currentPower : def.basePower, selector.power)) return false;
  if (!forceIncludeSource && !compareNumber(def.counter, selector.counter)) return false;
  if (!forceIncludeSource && !compareNumber(def.life, selector.life)) return false;

  if (!forceIncludeSource && selector.states?.includes('ACTIVE') && inst.orientation !== 'active' && inst.donRested !== false) return false;
  if (!forceIncludeSource && selector.states?.includes('RESTED') && inst.orientation !== 'rested' && inst.donRested !== true) return false;
  if (!forceIncludeSource && selector.states?.includes('PLAYED_THIS_TURN') && inst.enteredPlayTurn !== ctx.state.turnNumber) return false;

  if (selector.keywords) {
    const keyword = KEYWORD_TO_LEGACY[selector.keywords.value];
    const hasKeyword = hasPrintedKeyword_V2(def, selector.keywords.value)
      || (keyword ? hasContinuousKeyword(ctx.defs, ctx.state, instanceId, keyword) : false);
    if (!forceIncludeSource && selector.keywords.kind === 'HAS_KEYWORD' && !hasKeyword) return false;
    if (!forceIncludeSource && selector.keywords.kind === 'DOES_NOT_HAVE_KEYWORD' && hasKeyword) return false;
  }

  return true;
}

export function resolveSelector_V2(ctx: SelectorContext_V2, selector: Selector_V2): ResolvedSelector_V2 {
  const bounds = quantityBounds_V2(selector.quantity);
  const perCardCategory = selector.perCardCategoryQuantity ? quantityBounds_V2(selector.perCardCategoryQuantity) : undefined;
  const ordered = selector.ordering === 'DECK_ORDER' || selector.ordering === 'PLAYER_CHOOSES_ORDER' || selector.ordering === 'OWNER_CHOOSES_ORDER';
  return {
    selector,
    candidateInstanceIds: baseCandidates(ctx, selector).filter((id) => matchesSelector(ctx, selector, id)),
    minimum: bounds.minimum,
    maximum: bounds.maximum,
    ...(perCardCategory ? { perCardCategory } : {}),
    isOrdered: ordered,
  };
}

export function selectResolvedCandidateIds_V2(ctx: SelectorContext_V2, resolved: ResolvedSelector_V2): string[] {
  const maximum = resolved.maximum < 0 ? resolved.candidateInstanceIds.length : resolved.maximum;
  const distinctBy = resolved.selector.distinctBy;
  const acceptsDistinct = (id: string, selectedIds: string[]): boolean => {
    if (!distinctBy || distinctBy === 'NONE' || distinctBy === 'CARD_OBJECT') return true;
    const def = defOf(ctx, id);
    const key = distinctBy === 'CARD_NUMBER' ? def?.cardNumber : def?.name;
    if (!key) return true;
    return !selectedIds.some((selectedId) => {
      const selectedDef = defOf(ctx, selectedId);
      const selectedKey = distinctBy === 'CARD_NUMBER' ? selectedDef?.cardNumber : selectedDef?.name;
      return selectedKey === key;
    });
  };
  if (!resolved.perCardCategory || resolved.perCardCategory.maximum < 0) {
    const selectedIds: string[] = [];
    for (const id of resolved.candidateInstanceIds) {
      if (selectedIds.length >= maximum) break;
      if (!acceptsDistinct(id, selectedIds)) continue;
      selectedIds.push(id);
    }
    return selectedIds;
  }

  const selectedIds: string[] = [];
  const selectedByCategory: Partial<Record<CardCategory_V2, number>> = {};
  for (const id of resolved.candidateInstanceIds) {
    if (selectedIds.length >= maximum) break;
    const def = defOf(ctx, id);
    const category = def ? CATEGORY_TO_V2[def.category] : undefined;
    if (!category) continue;
    const selectedForCategory = selectedByCategory[category] ?? 0;
    if (selectedForCategory >= resolved.perCardCategory.maximum) continue;
    if (!acceptsDistinct(id, selectedIds)) continue;
    selectedByCategory[category] = selectedForCategory + 1;
    selectedIds.push(id);
  }
  return selectedIds;
}
