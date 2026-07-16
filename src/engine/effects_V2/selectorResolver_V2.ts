import type { CardDefinition } from '../state/card';
import type { GameState } from '../state/game';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import type { EffectRuntimeBundle_V2 } from './runtime_V2';
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

function hasType(def: CardDefinition, required: string): boolean {
  const needle = required.toLowerCase();
  return def.types.some((type) => type.toLowerCase().split(/[\/,]+/).some((part) => part.trim().includes(needle)));
}

function matchesBaseEffectStatus(def: CardDefinition, status: Selector_V2['baseEffectStatus']): boolean {
  if (!status || status === 'ANY') return true;
  const hasNoBaseEffect = cardHasNoBaseEffect(def);
  return status === 'NO_BASE_EFFECT' ? hasNoBaseEffect : !hasNoBaseEffect;
}

function matchesNameFilters(def: CardDefinition, names: Selector_V2['names']): boolean {
  if (!names?.length) return true;
  const exactNames = names.filter((name) => name.kind === 'NAME_EXACT').map((name) => name.value);
  const containsNames = names.filter((name) => name.kind === 'NAME_CONTAINS').map((name) => name.value.toLowerCase());
  const excludedNames = names.filter((name) => name.kind === 'NAME_NOT').map((name) => name.value);
  if (excludedNames.includes(def.name)) return false;
  if (exactNames.length > 0 && !exactNames.includes(def.name)) return false;
  if (containsNames.length > 0 && !containsNames.some((name) => def.name.toLowerCase().includes(name))) return false;
  return true;
}

function matchesSelector(ctx: SelectorContext_V2, selector: Selector_V2, instanceId: string): boolean {
  const inst = ctx.state.cardsById[instanceId];
  const def = defOf(ctx, instanceId);
  if (!inst || !def) return false;

  const isSourceCard = instanceId === ctx.sourceInstanceId;
  if (selector.relations?.includes('THIS_CARD') && !isSourceCard) return false;
  if (selector.relations?.includes('EXCLUDE_THIS_CARD') && isSourceCard) return false;
  const forceIncludeSource = selector.relations?.includes('INCLUDE_THIS_CARD') && isSourceCard;

  if (!forceIncludeSource && selector.cardCategories?.length && !selector.cardCategories.includes(CATEGORY_TO_V2[def.category])) return false;
  if (!forceIncludeSource && !matchesBaseEffectStatus(def, selector.baseEffectStatus)) return false;
  if (!forceIncludeSource && !matchesNameFilters(def, selector.names)) return false;

  if (selector.colors) {
    const colors = def.colors.map((color) => COLOR_TO_V2[color]);
    if (!forceIncludeSource && selector.colors.kind === 'HAS_COLOR' && !colors.includes(selector.colors.values[0])) return false;
    if (!forceIncludeSource && selector.colors.kind === 'HAS_ANY_COLOR' && !selector.colors.values.some((color) => colors.includes(color))) return false;
    if (!forceIncludeSource && selector.colors.kind === 'HAS_ALL_COLORS' && !selector.colors.values.every((color) => colors.includes(color))) return false;
  }

  if (selector.types) {
    if (!forceIncludeSource && selector.types.kind === 'HAS_TYPE' && !selector.types.values.every((type) => hasType(def, type))) return false;
    if (!forceIncludeSource && selector.types.kind === 'HAS_ANY_TYPE' && !selector.types.values.some((type) => hasType(def, type))) return false;
    if (!forceIncludeSource && selector.types.kind === 'TYPE_INCLUDES_TEXT' && !selector.types.values.some((type) => hasType(def, type))) return false;
  }

  if (selector.attributes?.values.length) {
    const attrs = def.attributes?.map((attr) => attr.toUpperCase()) ?? [];
    if (!forceIncludeSource && !selector.attributes.values.some((attr) => attrs.includes(attr))) return false;
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
    const hasKeyword = keyword ? hasContinuousKeyword(ctx.defs, ctx.state, instanceId, keyword) : false;
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
  if (!resolved.perCardCategory || resolved.perCardCategory.maximum < 0) {
    return resolved.candidateInstanceIds.slice(0, maximum);
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
    selectedByCategory[category] = selectedForCategory + 1;
    selectedIds.push(id);
  }
  return selectedIds;
}
