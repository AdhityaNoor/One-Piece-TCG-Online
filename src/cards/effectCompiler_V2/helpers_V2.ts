import type {
  Action_V2,
  ConditionExpression_V2,
  Duration_V2,
  EffectCategory_V2,
  EffectOptionality_V2,
  Quantity_V2,
  ResolutionNode_V2,
  Selector_V2,
  StandardTiming_V2,
  TimingExpression_V2,
  ValueExpression_V2,
  Zone_V2,
} from './types_V2';

export function numberValue_V2(value: number): ValueExpression_V2 {
  return { kind: 'NUMBER', value };
}

export function exactly_V2(value: number): Quantity_V2 {
  return { kind: 'EXACTLY', value: numberValue_V2(value) };
}

export function upTo_V2(value: number): Quantity_V2 {
  return { kind: 'UP_TO', value: numberValue_V2(value) };
}

export function selfSelector_V2(): Selector_V2 {
  return {
    subject: 'CARD',
    relations: ['THIS_CARD'],
    quantity: exactly_V2(1),
    chooser: 'EFFECT_OWNER',
  };
}

export function controllerCharacterSelector_V2(quantity: Quantity_V2 = { kind: 'ANY_NUMBER' }): Selector_V2 {
  return {
    subject: 'CARD',
    controller: 'PLAYER',
    zones: ['CHARACTER_AREA'],
    cardCategories: ['CHARACTER'],
    quantity,
    chooser: 'EFFECT_OWNER',
  };
}

export function opponentCharacterSelector_V2(quantity: Quantity_V2 = { kind: 'ANY_NUMBER' }): Selector_V2 {
  return {
    subject: 'CARD',
    controller: 'OPPONENT',
    zones: ['CHARACTER_AREA'],
    cardCategories: ['CHARACTER'],
    quantity,
    chooser: 'EFFECT_OWNER',
  };
}

export function leaderOrCharacterSelector_V2(player: 'PLAYER' | 'OPPONENT', quantity: Quantity_V2 = upTo_V2(1)): Selector_V2 {
  return {
    subject: 'CARD',
    controller: player,
    zones: ['LEADER_AREA', 'CHARACTER_AREA'],
    cardCategories: ['LEADER', 'CHARACTER'],
    quantity,
    chooser: 'EFFECT_OWNER',
  };
}

export function handSelector_V2(player: 'PLAYER' | 'OPPONENT', quantity: Quantity_V2): Selector_V2 {
  return {
    subject: 'CARD',
    owner: player,
    zones: ['HAND'],
    quantity,
    chooser: player === 'PLAYER' ? 'EFFECT_OWNER' : 'OPPONENT',
  };
}

export function sourceZoneForCategory_V2(category: EffectCategory_V2): Zone_V2[] {
  if (category === 'ACTIVATE') return ['HAND', 'LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'];
  if (category === 'PERMANENT') return ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA'];
  return ['LEADER_AREA', 'CHARACTER_AREA', 'STAGE_AREA', 'HAND', 'LIFE', 'TRASH'];
}

export function timing_V2(timing: StandardTiming_V2): TimingExpression_V2 {
  return { kind: 'STANDARD_TIMING', timing };
}

export function durationFromText_V2(text: string): Duration_V2 {
  if (/until the end of your opponent'?s next turn/i.test(text)) return { kind: 'UNTIL_END_OF_NEXT_TURN', player: 'OPPONENT' };
  if (/until the end of your next turn/i.test(text)) return { kind: 'UNTIL_END_OF_NEXT_TURN', player: 'PLAYER' };
  if (/during this battle/i.test(text)) return { kind: 'THIS_BATTLE' };
  if (/during this turn|this turn/i.test(text)) return { kind: 'THIS_TURN' };
  return { kind: 'INSTANT' };
}

export function donAttachedAtLeast_V2(count: number): ConditionExpression_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'ATTACHED_DON_COUNT', selector: selfSelector_V2() },
    operator: 'GREATER_OR_EQUAL',
    right: numberValue_V2(count),
  };
}

export function turnIs_V2(player: 'PLAYER' | 'OPPONENT'): ConditionExpression_V2 {
  return {
    kind: 'PREDICATE',
    left: { kind: 'CURRENT_TURN_PLAYER' },
    operator: 'EQUAL',
    right: { kind: player === 'PLAYER' ? 'EFFECT_OWNER' : 'EFFECT_OPPONENT' },
  };
}

export function andConditions_V2(conditions: ConditionExpression_V2[]): ConditionExpression_V2 | undefined {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { kind: 'AND', conditions };
}

export function sequence_V2(nodes: ResolutionNode_V2[]): ResolutionNode_V2 {
  if (nodes.length === 0) return { kind: 'NO_OP' };
  if (nodes.length === 1) return nodes[0];
  return { kind: 'SEQUENCE', nodes };
}

export function actionNode_V2(action: Action_V2, actionId?: string): ResolutionNode_V2 {
  return actionId ? { kind: 'ACTION', action, actionId } : { kind: 'ACTION', action };
}

export function optionalityFromText_V2(text: string): EffectOptionality_V2 {
  return /\byou may\b|\bmay\b/i.test(text) ? 'OPTIONAL' : 'MANDATORY';
}
