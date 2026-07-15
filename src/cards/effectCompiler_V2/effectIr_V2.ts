import type {
  ActivationCost_V2,
  ConditionExpression_V2,
  EffectDefinition_V2,
  ResolutionNode_V2,
  Selector_V2,
  StandardTiming_V2,
  TimingExpression_V2,
} from './types_V2';

/**
 * V2 authoring IR.
 *
 * This is the migration-facing equivalent of the current engine EffectProgram,
 * but it remains compiler/card-layer data only. Do not import this from
 * gameplay until the V2 migration intentionally starts.
 */
export type EffectTiming_V2 = StandardTiming_V2;

export type EffectGate_V2 =
  | ConditionExpression_V2
  | { kind: 'CANONICAL_GATE_REF'; gate: GateAtomKind_V2; params?: Record<string, unknown> };

export type GateAtomKind_V2 =
  | 'LEADER_NAME'
  | 'LEADER_NAME_INCLUDES'
  | 'LEADER_TYPE'
  | 'LEADER_ATTRIBUTE'
  | 'LEADER_MULTICOLOR'
  | 'LEADER_ACTIVE'
  | 'LEADER_RESTED'
  | 'SELF_CHARACTER_COUNT'
  | 'SELF_RESTED_CHARACTER_COUNT'
  | 'SELF_DON_FIELD_COUNT'
  | 'SELF_ACTIVE_DON_COUNT'
  | 'SELF_RESTED_DON_COUNT'
  | 'SELF_LIFE'
  | 'SELF_HAS_FACE_UP_LIFE'
  | 'OPPONENT_LIFE'
  | 'COMBINED_LIFE_TOTAL'
  | 'SELF_HAND'
  | 'OPPONENT_HAND'
  | 'SELF_TRASH_COUNT'
  | 'SELF_DECK_COUNT'
  | 'SELF_TYPED_CHARACTER_COUNT'
  | 'OPPONENT_RESTED_CHARACTER_COUNT'
  | 'SELF_GIVEN_DON_COUNT'
  | 'OPPONENT_GIVEN_DON_COUNT'
  | 'SELF_PLAYED_THIS_TURN'
  | 'SELF_BATTLED_OPPONENT_CHARACTER_THIS_TURN'
  | 'EVENT_OCCURRED_THIS_TURN'
  | 'ACTION_SUCCEEDED';

export interface EffectAbility_V2 {
  abilityId: string;
  timing: TimingExpression_V2;
  gates?: EffectGate_V2[];
  activationCost?: ActivationCost_V2;
  oncePerTurn?: boolean;
  optionalActivate?: boolean;
  resolution: ResolutionNode_V2;
}

export interface EffectProgram_V2 {
  schemaVersion: 'op-tcg-effect-v2.0.0';
  cardNumber: string;
  abilities: EffectAbility_V2[];
  canonicalEffects: EffectDefinition_V2[];
}

export interface EffectResumeState_V2 {
  abilityIndex: number;
  nodePath: number[];
  selectedObjects: Record<string, string[]>;
  actionResults: Record<string, unknown>;
}

export interface EffectContextContract_V2 {
  source: Selector_V2;
  controller: 'PLAYER' | 'OPPONENT';
  opponent: 'PLAYER' | 'OPPONENT';
  currentTiming: TimingExpression_V2;
}
