import type { Ability, AbilityCost, AbilityGate, EffectOp, EffectProgram, IrCondition, IrDuration, IrTiming, SearchFilter, Selector } from '../../engine/effects/effectIr';
import type { ContinuousKeyword } from '../../engine/state/game';
import type {
  Action_V2,
  ConditionExpression_V2,
  CostAction_V2,
  EffectAssignment_V2,
  EffectDefinition_V2,
  KeywordEffect_V2,
  PlayerReference_V2,
  Quantity_V2,
  ResolutionNode_V2,
  Selector_V2,
  StandardTiming_V2,
  ValueExpression_V2,
} from './types_V2';

export interface LegacyAdapterWarning_V2 {
  cardNumber: string;
  effectId: string;
  message: string;
}

export interface LegacyAdapterResult_V2 {
  program: EffectProgram;
  warnings: LegacyAdapterWarning_V2[];
}

const TIMING_TO_LEGACY_V2: Record<StandardTiming_V2, IrTiming> = {
  ON_PLAY: 'onPlay',
  WHEN_ATTACKING: 'whenAttacking',
  ON_OPPONENT_ATTACK: 'onOpponentsAttack',
  ON_BLOCK: 'onBlock',
  ON_KO: 'onKO',
  END_OF_YOUR_TURN: 'endOfTurn',
  END_OF_OPPONENT_TURN: 'endOfTurn',
  ACTIVATE_MAIN: 'activateMain',
  EVENT_MAIN: 'activateMain',
  EVENT_COUNTER: 'counter',
  TRIGGER: 'lifeTrigger',
  ON_ENTER_PLAY: 'onEnterPlay',
};

const KEYWORD_TO_LEGACY_V2: Record<KeywordEffect_V2, ContinuousKeyword> = {
  RUSH: 'rush',
  RUSH_CHARACTER: 'canAttackCharactersWhileSummoningSick',
  DOUBLE_ATTACK: 'doubleAttack',
  BANISH: 'banish',
  BLOCKER: 'blocker',
  TRIGGER: 'rush',
  UNBLOCKABLE: 'unblockable',
  CAN_ATTACK_ACTIVE: 'canAttackActive',
};

function warn(warnings: LegacyAdapterWarning_V2[], cardNumber: string, effectId: string, message: string): null {
  warnings.push({ cardNumber, effectId, message });
  return null;
}

function legacyTiming_V2(effect: Pick<EffectDefinition_V2, 'timing'>): IrTiming {
  if (effect.timing?.kind === 'STANDARD_TIMING') return TIMING_TO_LEGACY_V2[effect.timing.timing];
  if (effect.timing?.kind === 'CUSTOM_EVENT') {
    switch (effect.timing.eventType) {
      case 'CARD_ACTIVATED':
        return effect.timing.actor === 'OPPONENT' ? 'onOpponentEventActivated' : 'onYouEventActivated';
      case 'CARD_MOVED':
        return 'onRemovedFromField';
      case 'CARD_RESTED':
        return 'onRested';
      case 'DAMAGE_TAKEN':
        return 'onLifeDamageDealt';
      case 'CARD_PLAYED':
        return effect.timing.actor === 'OPPONENT' ? 'onOpponentCharacterPlayedFromHand' : 'onCharacterPlayedFromHand';
      default:
        return 'onEnterPlay';
    }
  }
  return 'onEnterPlay';
}

function legacyDuration_V2(kind: string | undefined): IrDuration {
  if (kind === 'THIS_BATTLE') return 'duringThisBattle';
  if (kind === 'THIS_TURN' || kind === 'UNTIL_END_OF_CURRENT_TURN') return 'duringThisTurn';
  if (kind === 'UNTIL_END_OF_NEXT_TURN') return 'endOfOpponentsTurn';
  return 'permanent';
}

function numberValue_V2(value: ValueExpression_V2 | undefined): number | null {
  return value?.kind === 'NUMBER' ? value.value : null;
}

function conditionNumberValue_V2(value: unknown): number | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as { kind?: unknown; value?: unknown };
  return candidate.kind === 'NUMBER' && typeof candidate.value === 'number' ? candidate.value : null;
}

function quantityBounds_V2(quantity: Quantity_V2 | undefined): { min: number; max: number; directAll: boolean } {
  if (!quantity) return { min: 1, max: 1, directAll: false };
  if (quantity.kind === 'ALL' || quantity.kind === 'ANY_NUMBER') return { min: 0, max: -1, directAll: true };
  const value = numberValue_V2(quantity.value) ?? 1;
  if (quantity.kind === 'UP_TO') return { min: 0, max: value, directAll: false };
  if (quantity.kind === 'AT_LEAST') return { min: value, max: -1, directAll: false };
  return { min: value, max: value, directAll: false };
}

function typeValues_V2(selector: Selector_V2): string[] | undefined {
  return selector.types?.values?.length ? [...selector.types.values] : undefined;
}

function nameFilter_V2(selector: Selector_V2): string | undefined {
  return selector.names?.find((name) => name.kind === 'NAME_EXACT')?.value;
}

function excludeNameFilter_V2(selector: Selector_V2): string | undefined {
  return selector.names?.find((name) => name.kind === 'NAME_NOT')?.value;
}

function maxCost_V2(selector: Selector_V2): number | undefined {
  return selector.cost?.comparison === 'AT_MOST' ? numberValue_V2(selector.cost.value) ?? undefined : undefined;
}

function minCost_V2(selector: Selector_V2): number | undefined {
  return selector.cost?.comparison === 'AT_LEAST' ? numberValue_V2(selector.cost.value) ?? undefined : undefined;
}

function exactCost_V2(selector: Selector_V2): number | undefined {
  return selector.cost?.comparison === 'EQUAL' ? numberValue_V2(selector.cost.value) ?? undefined : undefined;
}

function maxPower_V2(selector: Selector_V2): number | undefined {
  return selector.power?.comparison === 'AT_MOST' ? numberValue_V2(selector.power.value) ?? undefined : undefined;
}

function searchFilter_V2(selector: Selector_V2): SearchFilter | undefined {
  const types = typeValues_V2(selector);
  const filter: SearchFilter = {
    ...(types?.length === 1 ? { typeIncludes: types[0] } : {}),
    ...(selector.cardCategories?.length === 1 && selector.cardCategories[0] !== 'DON' ? { category: selector.cardCategories[0].toLowerCase() as SearchFilter['category'] } : {}),
    ...(nameFilter_V2(selector) ? { name: nameFilter_V2(selector) } : {}),
    ...(maxCost_V2(selector) !== undefined ? { maxCost: maxCost_V2(selector) } : {}),
    ...(minCost_V2(selector) !== undefined ? { minCost: minCost_V2(selector) } : {}),
    ...(exactCost_V2(selector) !== undefined ? { exactCost: exactCost_V2(selector) } : {}),
    ...(maxPower_V2(selector) !== undefined ? { maxPower: maxPower_V2(selector) } : {}),
  };
  return Object.keys(filter).length > 0 ? filter : undefined;
}

function legacySelector_V2(selector: Selector_V2): Selector | null {
  if (selector.subject === 'ACTION_RESULT') {
    if (selector.relations?.includes('PREVIOUS_ACTION_TARGET') || selector.relations?.includes('SELECTED_PREVIOUSLY')) return { sel: 'var', name: 't' };
    if (selector.relations?.includes('REMAINDER_OF_PREVIOUS_SELECTION')) return { sel: 'var', name: '__lastMovedIds' };
  }
  if (selector.relations?.includes('THIS_CARD')) return { sel: 'self' };

  const zones = selector.zones ?? [];
  const isOpponent = selector.controller === 'OPPONENT' || selector.owner === 'OPPONENT';
  const isController = selector.controller === 'PLAYER' || selector.owner === 'PLAYER';
  const hasLeader = zones.includes('LEADER_AREA') || selector.cardCategories?.includes('LEADER');
  const hasCharacters = zones.includes('CHARACTER_AREA') || selector.cardCategories?.includes('CHARACTER');
  const types = typeValues_V2(selector);
  const name = nameFilter_V2(selector);
  const excludeName = excludeNameFilter_V2(selector);
  const filter = {
    ...(types?.length === 1 ? { typeIncludes: types[0] } : {}),
    ...(types && types.length > 1 ? { anyOfTypes: types } : {}),
    ...(name ? { name } : {}),
    ...(maxCost_V2(selector) !== undefined ? { maxCost: maxCost_V2(selector) } : {}),
    ...(minCost_V2(selector) !== undefined ? { minCost: minCost_V2(selector) } : {}),
    ...(exactCost_V2(selector) !== undefined ? { exactCost: exactCost_V2(selector) } : {}),
    ...(maxPower_V2(selector) !== undefined ? { maxPower: maxPower_V2(selector) } : {}),
    ...(selector.states?.includes('RESTED') ? { rested: true } : {}),
    ...(selector.relations?.some((r) => r.startsWith('HAS_ATTACHED_DON_AT_LEAST_')) ? { minDonAttached: Number(selector.relations.find((r) => r.startsWith('HAS_ATTACHED_DON_AT_LEAST_'))?.replace('HAS_ATTACHED_DON_AT_LEAST_', '') ?? 1) } : {}),
  };

  if (isController && hasLeader && hasCharacters) return { sel: 'controllerLeaderOrCharacters', ...filter };
  if (isOpponent && hasLeader && hasCharacters) return { sel: 'opponentLeaderOrCharacters', ...filter, ...(excludeName ? { excludeName } : {}) };
  if (isController && hasCharacters) return { sel: 'controllerCharacters', ...filter };
  if (isOpponent && hasCharacters) return { sel: 'opponentCharacters', ...filter, ...(excludeName ? { excludeName } : {}) };
  if (isController && hasLeader) return { sel: 'controllerLeader' };
  if (isOpponent && hasLeader) return { sel: 'opponentLeader' };
  if (selector.subject === 'DON' && isController && selector.states?.includes('RESTED')) return { sel: 'controllerRestedDon' };
  if (selector.subject === 'DON' && isController && selector.states?.includes('ACTIVE')) return { sel: 'controllerActiveDon' };
  if (selector.subject === 'DON' && isController) return { sel: 'controllerFieldDon' };
  if (selector.subject === 'DON' && isOpponent && selector.states?.includes('RESTED')) return { sel: 'opponentRestedDon' };
  if (selector.subject === 'DON' && isOpponent && selector.states?.includes('ACTIVE')) return { sel: 'opponentActiveDon' };
  if (selector.subject === 'DON' && isOpponent) return { sel: 'opponentFieldDon' };
  if (isController && zones.includes('HAND')) return { sel: 'controllerHand', ...(searchFilter_V2(selector) ? { filter: searchFilter_V2(selector) } : {}) };
  if (isOpponent && zones.includes('HAND')) return { sel: 'opponentHand' };
  if (isController && zones.includes('TRASH')) return { sel: 'controllerTrash', ...(searchFilter_V2(selector) ? { filter: searchFilter_V2(selector) } : {}) };
  if (isOpponent && zones.includes('TRASH')) return { sel: 'opponentTrash', ...(searchFilter_V2(selector) ? { filter: searchFilter_V2(selector) } : {}) };
  if (isController && zones.includes('DECK')) return { sel: 'controllerDeck', ...(searchFilter_V2(selector) ? { filter: searchFilter_V2(selector) } : {}) };
  if (isController && zones.includes('LIFE') && selector.ordering === 'DECK_ORDER') return { sel: 'controllerLifeTop' };
  if (isOpponent && zones.includes('LIFE') && selector.ordering === 'DECK_ORDER') return { sel: 'opponentLifeTop' };
  if (hasCharacters) return { sel: 'allCharacters', ...filter };
  return null;
}

function needsPrompt_V2(selector: Selector_V2): boolean {
  if (selector.subject === 'ACTION_RESULT') return false;
  if (selector.relations?.includes('THIS_CARD')) return false;
  const quantity = quantityBounds_V2(selector.quantity);
  return !quantity.directAll;
}

function promptFor_V2(action: string, selector: Selector_V2): string {
  const quantity = quantityBounds_V2(selector.quantity);
  const count = quantity.max > 0 ? quantity.max : quantity.min;
  return `${action}${count > 0 ? ` ${count}` : ''} target${count === 1 ? '' : 's'}.`;
}

function withTargetChoice_V2(selector: Selector_V2, actionLabel: string, makeOp: (target: Selector) => EffectOp): EffectOp[] | null {
  const target = legacySelector_V2(selector);
  if (!target) return null;
  if (!needsPrompt_V2(selector)) return [makeOp(target)];
  const bounds = quantityBounds_V2(selector.quantity);
  return [
    {
      op: 'chooseTargets',
      var: 't',
      from: target,
      min: bounds.min,
      max: bounds.max,
      prompt: promptFor_V2(actionLabel, selector),
      ...(selector.chooser === 'OPPONENT' ? { chooser: 'opponent' as const } : {}),
    },
    makeOp({ sel: 'var', name: 't' }),
  ];
}

function conditionToGate_V2(condition: ConditionExpression_V2): AbilityGate[] | null {
  if (condition.kind === 'TRUE') return [];
  if (condition.kind === 'AND') {
    const all: AbilityGate[] = [];
    for (const child of condition.conditions) {
      const gates = conditionToGate_V2(child);
      if (!gates) return null;
      all.push(...gates);
    }
    return all;
  }
  if (condition.kind !== 'PREDICATE' || condition.left.kind !== 'COUNT') return null;
  const selector = condition.left.selector as Selector_V2;
  const right = conditionNumberValue_V2(condition.right);
  if (right == null) return null;
  const atLeast = condition.operator === 'GREATER_OR_EQUAL' ? right : undefined;
  const atMost = condition.operator === 'LESS_OR_EQUAL' ? right : undefined;
  const equal = condition.operator === 'EQUAL' ? right : undefined;
  const countValue: { atLeast?: number; atMost?: number } = {
    ...(atLeast !== undefined ? { atLeast } : {}),
    ...(atMost !== undefined ? { atMost } : {}),
  };
  if (selector.zones?.includes('TRASH') && selector.owner === 'PLAYER') return [{ kind: 'selfTrashCount', ...countValue }];
  if (selector.zones?.includes('LIFE') && selector.owner === 'PLAYER') return [{ kind: 'selfLife', ...countValue }];
  if (selector.zones?.includes('LIFE') && selector.owner === 'OPPONENT') return [{ kind: 'opponentLife', ...countValue }];
  if (selector.zones?.includes('HAND') && selector.owner === 'PLAYER') return [{ kind: 'selfHand', ...countValue }];
  if (selector.zones?.includes('HAND') && selector.owner === 'OPPONENT') return [{ kind: 'opponentHand', ...countValue }];
  if (selector.subject === 'DON' && selector.owner === 'PLAYER') return [{ kind: 'selfDonFieldCount', ...countValue }];
  if (selector.subject === 'DON' && selector.owner === 'OPPONENT') return [{ kind: 'opponentDonFieldCount', ...countValue }];
  if (selector.zones?.includes('LEADER_AREA') && selector.controller === 'PLAYER' && selector.types?.values?.[0]) return [{ kind: 'leaderType', type: selector.types.values[0] }];
  if (selector.zones?.includes('LEADER_AREA') && selector.controller === 'PLAYER' && selector.names?.[0]?.kind === 'NAME_EXACT') return [{ kind: 'leaderName', name: selector.names[0].value }];
  if (selector.zones?.includes('CHARACTER_AREA') && selector.controller === 'PLAYER' && selector.names?.[0]?.kind === 'NAME_EXACT') {
    return equal === 0 ? [{ kind: 'selfDoesNotControlNamed', name: selector.names[0].value }] : [{ kind: 'selfControlsNamed', name: selector.names[0].value }];
  }
  return null;
}

function conditionToIrCondition_V2(condition: ConditionExpression_V2 | undefined): IrCondition | undefined {
  if (!condition) return undefined;
  if (condition.kind === 'AND') {
    const out: IrCondition = {};
    for (const child of condition.conditions) {
      const piece = conditionToIrCondition_V2(child);
      if (!piece) continue;
      Object.assign(out, piece);
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (condition.kind !== 'PREDICATE') return undefined;
  if (condition.left.kind === 'ATTACHED_DON_COUNT') {
    const donAttachedAtLeast = conditionNumberValue_V2(condition.right);
    return donAttachedAtLeast == null ? undefined : { donAttachedAtLeast };
  }
  if (condition.left.kind === 'CURRENT_TURN_PLAYER' && condition.right?.kind === 'EFFECT_OWNER') return { turn: 'your' };
  if (condition.left.kind === 'CURRENT_TURN_PLAYER' && condition.right?.kind === 'OPPONENT') return { turn: 'opponent' };
  return undefined;
}

function activationCosts_V2(costs: CostAction_V2[] | undefined): AbilityCost[] | null | undefined {
  if (!costs?.length) return undefined;
  const out: AbilityCost[] = [];
  for (const cost of costs) {
    switch (cost.type) {
      case 'REST_DON_COST': {
        const count = numberValue_V2(cost.count);
        if (count == null) return null;
        out.push({ kind: 'restDon', count });
        break;
      }
      case 'DON_MINUS_COST': {
        const count = numberValue_V2(cost.count);
        if (count == null) return null;
        out.push({ kind: 'donMinus', count });
        break;
      }
      case 'REST_CARD_COST':
        if (cost.selector.relations?.includes('THIS_CARD')) out.push({ kind: 'restThis' });
        else return null;
        break;
      case 'TRASH_CARD_COST':
        if (cost.selector.relations?.includes('THIS_CARD')) out.push({ kind: 'trashThis' });
        else return null;
        break;
      default:
        return null;
    }
  }
  return out;
}

function valueAsNumber_V2(value: ValueExpression_V2): number | null {
  if (value.kind === 'NUMBER') return value.value;
  return null;
}

function actionToLegacyOps_V2(action: Action_V2, warnings: LegacyAdapterWarning_V2[], cardNumber: string, effectId: string): EffectOp[] | null {
  switch (action.type) {
    case 'DRAW_CARD': {
      const amount = numberValue_V2(action.count);
      if (amount == null) return warn(warnings, cardNumber, effectId, 'Dynamic DRAW_CARD count is not lowered yet.');
      return [{ op: 'draw', amount, ...(action.player === 'OPPONENT' ? { player: 'opponent' as const } : {}) }];
    }
    case 'MODIFY_POWER': {
      const amount = valueAsNumber_V2(action.value);
      if (amount == null) return warn(warnings, cardNumber, effectId, 'Dynamic MODIFY_POWER value is not lowered yet.');
      return withTargetChoice_V2(action.selector, 'Choose power modifier target', (target) => ({
        op: 'addPower',
        target,
        amount: action.operation === 'SUBTRACT' ? -amount : amount,
        duration: legacyDuration_V2(action.duration.kind),
      }));
    }
    case 'MODIFY_COST': {
      const amount = valueAsNumber_V2(action.value);
      if (amount == null) return warn(warnings, cardNumber, effectId, 'Dynamic MODIFY_COST value is not lowered yet.');
      return withTargetChoice_V2(action.selector, 'Choose cost modifier target', (target) => ({
        op: 'addCost',
        target,
        amount: action.operation === 'SUBTRACT' ? -amount : amount,
        duration: legacyDuration_V2(action.duration.kind),
      }));
    }
    case 'GRANT_KEYWORD': {
      const keyword = KEYWORD_TO_LEGACY_V2[action.keyword];
      return withTargetChoice_V2(action.selector, `Choose ${keyword} target`, (target) => ({
        op: 'addKeyword',
        target,
        keyword,
        duration: legacyDuration_V2(action.duration.kind),
      }));
    }
    case 'KO_CARD':
      return withTargetChoice_V2(action.selector, 'Choose K.O. target', (target) => ({ op: 'ko', target }));
    case 'REST_CARD':
      return withTargetChoice_V2(action.selector, 'Choose rest target', (target) => ({ op: 'rest', target }));
    case 'SET_CARD_ACTIVE':
      return withTargetChoice_V2(action.selector, 'Choose active target', (target) => ({ op: 'setActive', target }));
    case 'INVALIDATE_EFFECTS':
      return withTargetChoice_V2(action.selector, 'Choose effect-negation target', (target) => ({
        op: 'negateEffect',
        target,
        duration: legacyDuration_V2(action.duration.kind),
      }));
    case 'PREVENT_ACTION': {
      if (action.action === 'DECLARE_ATTACK') {
        return withTargetChoice_V2(action.selector, 'Choose attack prevention target', (target) => ({
          op: 'preventAttack',
          target,
          duration: legacyDuration_V2(action.duration.kind),
        }));
      }
      if (action.action === 'REST_CARD') {
        return withTargetChoice_V2(action.selector, 'Choose rest-prevention target', (target) => ({
          op: 'preventRest',
          target,
          duration: legacyDuration_V2(action.duration.kind),
          ...(action.causeFilter === 'EFFECT' ? { effectSourceController: 'opponent' as const } : {}),
        }));
      }
      if (action.action === 'ACTIVATE_BLOCKER') {
        return [{ op: 'suppressBlockerActivation', target: { sel: 'opponentCharacters' }, duration: legacyDuration_V2(action.duration.kind) }];
      }
      if (action.action === 'SET_CARD_ACTIVE') {
        return withTargetChoice_V2(action.selector, 'Choose refresh-prevention target', (target) => ({
          op: 'preventRefresh',
          target,
          duration: legacyDuration_V2(action.duration.kind),
        }));
      }
      if (action.action === 'PLAY_CARD') {
        return [{ op: 'preventControllerCharacterPlay', player: action.selector.owner === 'OPPONENT' || action.selector.controller === 'OPPONENT' ? 'opponent' : 'controller', duration: legacyDuration_V2(action.duration.kind) }];
      }
      return warn(warnings, cardNumber, effectId, `PREVENT_ACTION ${action.action} has no V2 legacy lowering yet.`);
    }
    case 'ADD_DON_FROM_DON_DECK': {
      const count = numberValue_V2(action.count);
      if (count == null) return warn(warnings, cardNumber, effectId, 'Dynamic ADD_DON_FROM_DON_DECK count is not lowered yet.');
      return [{ op: 'addDonFromDeck', count, rested: action.state === 'RESTED' }];
    }
    case 'GIVE_DON': {
      const count = numberValue_V2(action.donSelector.quantity?.kind === 'UP_TO' || action.donSelector.quantity?.kind === 'EXACTLY' ? action.donSelector.quantity.value : undefined);
      if (count == null) return warn(warnings, cardNumber, effectId, 'Dynamic GIVE_DON count is not lowered yet.');
      return withTargetChoice_V2(action.target, 'Choose DON!! recipient', (target) => ({
        op: 'giveDonFromCostArea',
        target,
        count,
        donOwner: action.donSelector.owner === 'OPPONENT' ? 'opponent' : 'controller',
        ...(action.donSelector.states?.includes('RESTED') ? { restedOnly: true } : {}),
        ...(action.donSelector.states?.includes('ACTIVE') ? { activeOnly: true } : {}),
      }));
    }
    case 'REST_DON': {
      const target = legacySelector_V2(action.selector);
      return target ? [{ op: 'rest', target }] : warn(warnings, cardNumber, effectId, 'REST_DON selector is not lowered yet.');
    }
    case 'SET_DON_ACTIVE': {
      const target = legacySelector_V2(action.selector);
      return target ? [{ op: 'setActive', target }] : warn(warnings, cardNumber, effectId, 'SET_DON_ACTIVE selector is not lowered yet.');
    }
    case 'RETURN_DON_TO_DON_DECK': {
      const target = legacySelector_V2(action.selector);
      return target ? [{ op: 'returnDonToDonDeck', target }] : warn(warnings, cardNumber, effectId, 'RETURN_DON selector is not lowered yet.');
    }
    case 'MOVE_CARD': {
      const target = legacySelector_V2(action.selector);
      if (!target) return warn(warnings, cardNumber, effectId, 'MOVE_CARD selector is not lowered yet.');
      if (action.to.zone === 'HAND') return withTargetChoice_V2(action.selector, 'Choose card to hand', (chosen) => ({ op: 'moveToHand', target: chosen }));
      if (action.to.zone === 'TRASH') return withTargetChoice_V2(action.selector, 'Choose card to trash', (chosen) => ({ op: 'trashCards', target: chosen }));
      if (action.to.zone === 'DECK' && action.to.position === 'BOTTOM') return withTargetChoice_V2(action.selector, 'Choose card to bottom deck', (chosen) => ({ op: 'moveToBottomDeck', target: chosen }));
      if (action.to.zone === 'DECK' && action.to.position === 'TOP') return withTargetChoice_V2(action.selector, 'Choose card to top deck', (chosen) => ({ op: 'moveToTopDeck', target: chosen }));
      if (action.to.zone === 'LIFE' && action.to.position === 'TOP') return withTargetChoice_V2(action.selector, 'Choose card to Life', (chosen) => ({ op: 'moveToLifeTop', target: chosen }));
      if (action.to.zone === 'LIFE' && action.to.position === 'BOTTOM') return withTargetChoice_V2(action.selector, 'Choose card to Life', (chosen) => ({ op: 'moveToLifeBottom', target: chosen }));
      return warn(warnings, cardNumber, effectId, `MOVE_CARD destination ${action.to.zone}/${action.to.position ?? ''} has no lowering yet.`);
    }
    case 'TRASH_CARD':
      return withTargetChoice_V2(action.selector, 'Choose card to trash', (target) => ({ op: 'trashCards', target }));
    case 'PLAY_CARD': {
      if (action.selector.relations?.includes('THIS_CARD')) return [{ op: 'playSelf' }];
      if (action.selector.zones?.includes('HAND')) return withTargetChoice_V2(action.selector, 'Choose card to play', (target) => ({ op: 'playFromHand', target, ...(action.selector.states?.includes('RESTED') ? { rested: true } : {}) }));
      if (action.selector.zones?.includes('TRASH')) return withTargetChoice_V2(action.selector, 'Choose card to play', (target) => ({ op: 'playFromTrash', target, ...(action.selector.states?.includes('RESTED') ? { rested: true } : {}) }));
      if (action.selector.zones?.includes('DECK')) {
        const count = quantityBounds_V2(action.selector.quantity).max;
        return [{ op: 'playFromDeck', pick: count > 0 ? count : 1, filter: searchFilter_V2(action.selector) ?? {}, prompt: 'Choose card to play from deck.' }];
      }
      return warn(warnings, cardNumber, effectId, 'PLAY_CARD source is not lowered yet.');
    }
    case 'ACTIVATE_EVENT': {
      if (action.selector.zones?.includes('TRASH')) return withTargetChoice_V2(action.selector, 'Choose Event to activate', (target) => ({ op: 'activateEventFromTrash', target }));
      return withTargetChoice_V2(action.selector, 'Choose Event to activate', (target) => ({ op: 'activateEventFromHand', target }));
    }
    case 'LOOK_AT_CARDS': {
      const count = numberValue_V2(action.count);
      if (count == null) return warn(warnings, cardNumber, effectId, 'Dynamic LOOK_AT_CARDS count is not lowered yet.');
      return [{ op: 'searchTopDeck', look: count, pick: 0, reveal: false, destination: 'deckTopOrBottom', remainder: 'deckTopOrBottom', prompt: `Look at ${count} cards.` }];
    }
    case 'REVEAL_CARD':
      return withTargetChoice_V2(action.selector, 'Choose card to reveal', (target) => ({ op: 'revealCards', target }));
    case 'TAKE_LIFE_TO_HAND':
      return [{ op: 'moveLifeTopToHand', player: action.player === 'OPPONENT' ? 'opponent' : 'controller', count: numberValue_V2(action.count) ?? 1 }];
    case 'TRASH_LIFE':
      return [{ op: 'trashLife', player: action.player === 'OPPONENT' ? 'opponent' : 'controller', count: numberValue_V2(action.count) ?? 1 }];
    case 'ADD_CARD_TO_LIFE':
      return withTargetChoice_V2(action.selector, 'Choose card to add to Life', (target) => ({
        op: action.position === 'BOTTOM' ? 'moveToLifeBottom' : 'moveToLifeTop',
        target,
        faceUp: action.face === 'FACE_UP',
      }));
    case 'LOOK_AT_LIFE':
      return [{ op: 'lookLifeAndReorder', player: action.player === 'OPPONENT' ? 'opponent' : 'controller', prompt: 'Look at Life cards and reorder them.' }];
    case 'REORDER_LIFE':
      return [{ op: 'lookLifeAndReorder', player: action.player === 'OPPONENT' ? 'opponent' : 'controller', prompt: 'Reorder Life cards.' }];
    case 'REORDER_CARDS':
      if (action.destination.zone === 'DECK') {
        const target = legacySelector_V2(action.selector);
        if (target?.sel === 'controllerDeck') {
          const look = quantityBounds_V2(action.selector.quantity).max;
          if (look > 0) return [{ op: 'searchTopDeck', look, pick: 0, reveal: false, destination: 'deckTopOrBottom', remainder: 'deckTopOrBottom', prompt: `Reorder the top ${look} cards.` }];
        }
      }
      return warn(warnings, cardNumber, effectId, 'V2 action REORDER_CARDS has no legacy EffectOp adapter yet.');
    case 'SHUFFLE_ZONE':
      return action.zone === 'DECK' ? [{ op: 'searchDeck', pick: 0, reveal: false, destination: 'hand', prompt: 'Shuffle deck.' }] : warn(warnings, cardNumber, effectId, 'V2 action SHUFFLE_ZONE has no legacy EffectOp adapter yet.');
    case 'TURN_LIFE_FACE_UP':
      return withTargetChoice_V2(action.selector, 'Choose Life card', (target) => ({ op: 'turnLifeFace', target, faceUp: true }));
    case 'TURN_LIFE_FACE_DOWN':
      return withTargetChoice_V2(action.selector, 'Choose Life card', (target) => ({ op: 'turnLifeFace', target, faceUp: false }));
    case 'PLAYER_CHOOSES':
    case 'OPPONENT_CHOOSES': {
      const options = action.options.map((option, index) => {
        const ops = resolutionToLegacyOps_V2(option, warnings, cardNumber, `${effectId}:choice${index}`) ?? [];
        return { label: `Option ${index + 1}`, ops };
      });
      return [{ op: 'chooseOption', prompt: 'Choose one.', chooser: action.type === 'OPPONENT_CHOOSES' ? 'opponent' : 'controller', options }];
    }
    default:
      return warn(warnings, cardNumber, effectId, `V2 action ${action.type} has no legacy EffectOp adapter yet.`);
  }
}

function applyGates_V2(ops: EffectOp[], gates: AbilityGate[] | null): EffectOp[] {
  if (!gates?.length) return ops;
  return ops.map((op) => ({ ...op, ifGate: [...(op.ifGate ?? []), ...gates] }) as EffectOp);
}

function resolutionToLegacyOps_V2(node: ResolutionNode_V2, warnings: LegacyAdapterWarning_V2[], cardNumber: string, effectId: string): EffectOp[] | null {
  if (node.kind === 'NO_OP') return [];
  if (node.kind === 'ACTION') return actionToLegacyOps_V2(node.action, warnings, cardNumber, effectId);
  if (node.kind === 'SEQUENCE') {
    const ops: EffectOp[] = [];
    for (const child of node.nodes) {
      const childOps = resolutionToLegacyOps_V2(child, warnings, cardNumber, effectId);
      if (!childOps) continue;
      ops.push(...childOps);
    }
    return ops;
  }
  if (node.kind === 'OPTIONAL') return resolutionToLegacyOps_V2(node.node, warnings, cardNumber, effectId);
  if (node.kind === 'IF') {
    const gates = conditionToGate_V2(node.condition);
    const ops = resolutionToLegacyOps_V2(node.then, warnings, cardNumber, effectId);
    if (!ops) return null;
    if (!gates) {
      warn(warnings, cardNumber, effectId, 'IF condition has no AbilityGate lowering yet.');
      return ops;
    }
    return applyGates_V2(ops, gates);
  }
  if (node.kind === 'IF_ACTION_SUCCEEDED') {
    const ops = resolutionToLegacyOps_V2(node.then, warnings, cardNumber, effectId);
    return ops?.map((op) => ({ ...op, ifPrevious: 'previousSelectedAny' }) as EffectOp) ?? null;
  }
  if (node.kind === 'CHOOSE') {
    const options = node.options.map((option, index) => ({
      label: `Option ${index + 1}`,
      ops: resolutionToLegacyOps_V2(option, warnings, cardNumber, `${effectId}:choice${index}`) ?? [],
    }));
    return [{ op: 'chooseOption', prompt: 'Choose one.', options }];
  }
  warn(warnings, cardNumber, effectId, `V2 resolution node ${node.kind} has no legacy EffectOp adapter yet.`);
  return null;
}

function assignmentEffectToDefinition_V2(assignment: EffectAssignment_V2): EffectDefinition_V2 {
  return {
    id: assignment.assignmentId,
    source: {
      objectRef: 'THIS_CARD',
      owner: 'PLAYER',
      controller: 'PLAYER',
      sourceZone: 'NONE',
      effectIndex: assignment.effectIndex,
    },
    metadata: {
      sourceCardNumber: assignment.cardNumber,
      effectIndex: assignment.effectIndex,
      printedText: assignment.printedText,
      assignmentId: assignment.assignmentId,
      authoringStatus: assignment.status,
    },
    ...assignment.effect,
  };
}

function abilityFromAssignment_V2(assignment: EffectAssignment_V2, warnings: LegacyAdapterWarning_V2[]): Ability | null {
  const effect = assignmentEffectToDefinition_V2(assignment);
  const ops = resolutionToLegacyOps_V2(effect.resolution, warnings, assignment.cardNumber, assignment.assignmentId);
  if (!ops?.length) return null;
  const cost = activationCosts_V2(effect.activationCost?.payments);
  if (cost === null) {
    warn(warnings, assignment.cardNumber, assignment.assignmentId, 'Activation cost has no legacy lowering yet.');
    return null;
  }
  const gate = effect.conditions ? conditionToGate_V2(effect.conditions) : [];
  const condition = conditionToIrCondition_V2(effect.conditions);
  return {
    timing: legacyTiming_V2(effect),
    ...(effect.usageLimit?.period === 'PER_TURN' || /\[Once Per Turn\]/i.test(effect.metadata.printedText) ? { oncePerTurn: true } : {}),
    ...(effect.optionality === 'OPTIONAL' ? { optionalActivate: true } : {}),
    ...(cost?.length ? { cost } : {}),
    ...(gate?.length ? { gate } : {}),
    ...(condition ? { condition } : {}),
    ops,
  };
}

export function adaptEffectAssignmentsToLegacyProgram_V2(cardNumber: string, assignments: readonly EffectAssignment_V2[]): LegacyAdapterResult_V2 {
  const warnings: LegacyAdapterWarning_V2[] = [];
  const abilities = assignments
    .filter((assignment) => assignment.cardNumber === cardNumber && assignment.status !== 'UNCOVERED')
    .map((assignment) => abilityFromAssignment_V2(assignment, warnings))
    .filter((ability): ability is Ability => Boolean(ability));

  return {
    program: { cardNumber, abilities },
    warnings,
  };
}

export function adaptCompiledCardEffectsToLegacyProgram_V2(compiled: { cardNumber: string; assignments: readonly EffectAssignment_V2[] }): LegacyAdapterResult_V2 {
  return adaptEffectAssignmentsToLegacyProgram_V2(compiled.cardNumber, compiled.assignments);
}
