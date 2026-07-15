import type {
  Duration_V2,
  EffectCategory_V2,
  EffectDefinition_V2,
  EffectFilter_V2,
  KeywordEffect_V2,
  PlayerReference_V2,
  Selector_V2,
  StandardTiming_V2,
  ValueExpression_V2,
  Zone_V2,
} from '../../cards/effectCompiler_V2/types_V2';

export interface StatModifierRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  stat: 'POWER' | 'COST' | 'COUNTER' | 'LIFE_VALUE' | 'DAMAGE';
  selector: Selector_V2;
  propertyLayer: 'CURRENT_VALUE' | 'BASE_VALUE' | 'PRINTED_VALUE';
  operation: 'ADD' | 'SUBTRACT' | 'SET' | 'COPY' | 'SET_TO_ZERO';
  value: ValueExpression_V2;
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export interface KeywordModifierRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  operation: 'GRANT_KEYWORD' | 'REMOVE_KEYWORD';
  keyword: KeywordEffect_V2;
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export interface EffectInvalidationRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  selectedInstanceIds: string[];
  selectedEffectRefs?: string[];
  effectFilter: EffectFilter_V2;
  operation: 'INVALIDATE_EFFECTS' | 'VALIDATE_EFFECTS';
  duration: Duration_V2;
  createdAtTurn: number;
  status: 'ACTIVE';
}

export interface EffectCandidate_V2 {
  effectId?: string;
  sourceInstanceId: string;
  sourceOwnerId?: string;
  controllerId: string;
  sourceZone?: Zone_V2;
  category?: EffectCategory_V2;
  timing?: StandardTiming_V2;
}

export function createStatModifierRecord_V2(args: {
  sourceInstanceId: string;
  controllerId: string;
  stat: StatModifierRecord_V2['stat'];
  selector: Selector_V2;
  propertyLayer: StatModifierRecord_V2['propertyLayer'];
  operation: StatModifierRecord_V2['operation'];
  value: ValueExpression_V2;
  duration: Duration_V2;
  turnNumber: number;
  existingCount: number;
}): StatModifierRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:stat:${args.stat}:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    stat: args.stat,
    selector: args.selector,
    propertyLayer: args.propertyLayer,
    operation: args.operation,
    value: args.value,
    duration: args.duration,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE',
  };
}

export function createKeywordModifierRecord_V2(args: {
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  operation: KeywordModifierRecord_V2['operation'];
  keyword: KeywordEffect_V2;
  duration: Duration_V2;
  turnNumber: number;
  existingCount: number;
}): KeywordModifierRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:keyword:${args.keyword}:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    selector: args.selector,
    operation: args.operation,
    keyword: args.keyword,
    duration: args.duration,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE',
  };
}

export function createEffectInvalidationRecord_V2(args: {
  sourceInstanceId: string;
  controllerId: string;
  selector: Selector_V2;
  selectedInstanceIds: string[];
  selectedEffectRefs?: string[];
  effectFilter: EffectInvalidationRecord_V2['effectFilter'];
  operation: EffectInvalidationRecord_V2['operation'];
  duration: Duration_V2;
  turnNumber: number;
  existingCount: number;
}): EffectInvalidationRecord_V2 {
  return {
    id: `${args.sourceInstanceId}:effect-status:${args.operation}:${args.turnNumber}:${args.existingCount}`,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    selector: args.selector,
    selectedInstanceIds: args.selectedInstanceIds,
    ...(args.selectedEffectRefs ? { selectedEffectRefs: args.selectedEffectRefs } : {}),
    effectFilter: args.effectFilter,
    operation: args.operation,
    duration: args.duration,
    createdAtTurn: args.turnNumber,
    status: 'ACTIVE',
  };
}

function standardTimingOf(effect: EffectDefinition_V2): StandardTiming_V2 | undefined {
  return effect.timing?.kind === 'STANDARD_TIMING' ? effect.timing.timing : undefined;
}

export function effectCandidateFromDefinition_V2(args: {
  effect: EffectDefinition_V2;
  sourceInstanceId: string;
  controllerId: string;
  sourceOwnerId?: string;
}): EffectCandidate_V2 {
  return {
    effectId: args.effect.id,
    sourceInstanceId: args.sourceInstanceId,
    controllerId: args.controllerId,
    sourceOwnerId: args.sourceOwnerId,
    sourceZone: args.effect.source.sourceZone,
    category: args.effect.category,
    timing: standardTimingOf(args.effect),
  };
}

function playerReferenceMatchesCandidate_V2(
  ref: PlayerReference_V2 | undefined,
  record: EffectInvalidationRecord_V2,
  candidate: EffectCandidate_V2,
  field: 'controllerId' | 'sourceOwnerId',
): boolean {
  if (!ref || ref === 'ANY') return true;
  const candidatePlayer = field === 'controllerId' ? candidate.controllerId : candidate.sourceOwnerId;
  if (!candidatePlayer) return false;
  switch (ref) {
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return candidatePlayer === record.controllerId;
    case 'OPPONENT':
      return candidatePlayer !== record.controllerId;
    case 'CARD_OWNER':
      return candidate.sourceOwnerId ? candidatePlayer === candidate.sourceOwnerId : true;
    case 'CARD_CONTROLLER':
      return candidatePlayer === candidate.controllerId;
  }
}

export function effectSelectorMatchesCandidate_V2(record: EffectInvalidationRecord_V2, candidate: EffectCandidate_V2): boolean {
  const selector = record.selector;
  if (selector.subject === 'CARD' || selector.subject === 'DON') {
    return record.selectedInstanceIds.includes(candidate.sourceInstanceId);
  }
  if (selector.subject !== 'EFFECT') return false;
  if (!playerReferenceMatchesCandidate_V2(selector.controller, record, candidate, 'controllerId')) return false;
  if (!playerReferenceMatchesCandidate_V2(selector.owner, record, candidate, 'sourceOwnerId')) return false;
  if (selector.zones?.length && (!candidate.sourceZone || !selector.zones.includes(candidate.sourceZone))) return false;
  if (selector.relations?.includes('THIS_EFFECT')) {
    return candidate.sourceInstanceId === record.sourceInstanceId || Boolean(candidate.effectId && record.selectedEffectRefs?.includes(candidate.effectId));
  }
  return true;
}

export function effectFilterMatchesCandidate_V2(filter: EffectFilter_V2, candidate: EffectCandidate_V2): boolean {
  if (filter === 'ALL_EFFECTS') return true;
  if (filter === 'AUTO_EFFECTS') return candidate.category === 'AUTO';
  if (filter === 'ACTIVATE_EFFECTS') return candidate.category === 'ACTIVATE';
  if (filter === 'PERMANENT_EFFECTS') return candidate.category === 'PERMANENT';
  if (filter === 'KEYWORD_EFFECTS') return false;
  if (filter.kind === 'MATCHING_EFFECT') {
    if (filter.timing && candidate.timing !== filter.timing) return false;
    return true;
  }
  return false;
}

export function effectInvalidationRecordMatchesCandidate_V2(record: EffectInvalidationRecord_V2, candidate: EffectCandidate_V2): boolean {
  return record.status === 'ACTIVE'
    && effectSelectorMatchesCandidate_V2(record, candidate)
    && effectFilterMatchesCandidate_V2(record.effectFilter, candidate);
}

export function isEffectInvalidated_V2(candidate: EffectCandidate_V2, records: EffectInvalidationRecord_V2[]): boolean {
  let invalidated = false;
  for (const record of records) {
    if (!effectInvalidationRecordMatchesCandidate_V2(record, candidate)) continue;
    invalidated = record.operation === 'INVALIDATE_EFFECTS';
  }
  return invalidated;
}
