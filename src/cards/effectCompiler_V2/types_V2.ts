export const EFFECT_SCHEMA_VERSION_V2 = 'op-tcg-effect-v2.0.0' as const;

export type EffectSchemaVersion_V2 = typeof EFFECT_SCHEMA_VERSION_V2;

export type PlayerReference_V2 =
  | 'PLAYER'
  | 'OPPONENT'
  | 'ANY'
  | 'EFFECT_OWNER'
  | 'CARD_OWNER'
  | 'CARD_CONTROLLER';

export type CardCategory_V2 = 'LEADER' | 'CHARACTER' | 'EVENT' | 'STAGE' | 'DON';
export type Color_V2 = 'RED' | 'GREEN' | 'BLUE' | 'PURPLE' | 'BLACK' | 'YELLOW';
export type Attribute_V2 = 'SLASH' | 'STRIKE' | 'RANGED' | 'SPECIAL' | 'WISDOM';

export type Zone_V2 =
  | 'LEADER_AREA'
  | 'CHARACTER_AREA'
  | 'STAGE_AREA'
  | 'COST_AREA'
  | 'ATTACHED_DON'
  | 'HAND'
  | 'DECK'
  | 'TRASH'
  | 'LIFE'
  | 'DON_DECK'
  | 'RESOLVING_TRIGGER'
  | 'RESOLUTION_LIMBO'
  | 'NONE';

export type EffectCategory_V2 = 'AUTO' | 'ACTIVATE' | 'PERMANENT' | 'REPLACEMENT';
export type EffectApplicationMode_V2 = 'ONE_SHOT' | 'CONTINUOUS' | 'DELAYED';
export type EffectOptionality_V2 = 'MANDATORY' | 'OPTIONAL';
export type StandardTiming_V2 =
  | 'ON_PLAY'
  | 'WHEN_ATTACKING'
  | 'ON_OPPONENT_ATTACK'
  | 'ON_BLOCK'
  | 'ON_KO'
  | 'END_OF_YOUR_TURN'
  | 'END_OF_OPPONENT_TURN'
  | 'ACTIVATE_MAIN'
  | 'EVENT_MAIN'
  | 'EVENT_COUNTER'
  | 'TRIGGER'
  | 'ON_ENTER_PLAY';

export type KeywordEffect_V2 =
  | 'RUSH'
  | 'RUSH_CHARACTER'
  | 'DOUBLE_ATTACK'
  | 'BANISH'
  | 'BLOCKER'
  | 'TRIGGER'
  | 'UNBLOCKABLE'
  | 'CAN_ATTACK_ACTIVE';

export type EffectFilter_V2 =
  | 'ALL_EFFECTS'
  | 'AUTO_EFFECTS'
  | 'ACTIVATE_EFFECTS'
  | 'PERMANENT_EFFECTS'
  | 'KEYWORD_EFFECTS'
  | { kind: 'MATCHING_EFFECT'; timing?: StandardTiming_V2; rawText?: string };

export type Duration_V2 =
  | { kind: 'INSTANT' }
  | { kind: 'THIS_BATTLE' }
  | { kind: 'THIS_TURN' }
  | { kind: 'UNTIL_END_OF_CURRENT_TURN' }
  | { kind: 'UNTIL_END_OF_NEXT_TURN'; player: PlayerReference_V2 }
  | { kind: 'UNTIL_NEXT_REFRESH_PHASE'; player: PlayerReference_V2 }
  | { kind: 'WHILE_SOURCE_VALID' }
  | { kind: 'WHILE_SOURCE_IN_ZONE'; zone: Zone_V2 }
  | { kind: 'WHILE_CONDITION'; condition: ConditionExpression_V2 }
  | { kind: 'PERMANENT' };

export type ValueExpression_V2 =
  | { kind: 'NUMBER'; value: number }
  | { kind: 'BOOLEAN'; value: boolean }
  | { kind: 'STRING'; value: string }
  | { kind: 'COUNT'; selector: Selector_V2 }
  | { kind: 'EVENT_ACTIVATION_COUNT'; player: PlayerReference_V2; during: 'THIS_TURN'; eventBaseCost?: NumericPropertyFilter_V2 }
  | { kind: 'SELF_TURN_COUNT'; player: PlayerReference_V2 }
  | { kind: 'PROPERTY_VALUE'; selector: Selector_V2; property: 'POWER' | 'COST' | 'COUNTER' | 'LIFE' | 'DAMAGE'; propertyLayer?: 'CURRENT' | 'BASE' | 'PRINTED' }
  | { kind: 'PREVIOUS_RESULT'; resultId: string }
  | { kind: 'ADD'; values: ValueExpression_V2[] }
  | { kind: 'SUBTRACT'; left: ValueExpression_V2; right: ValueExpression_V2 }
  | { kind: 'FLOOR_DIVIDE'; left: ValueExpression_V2; right: ValueExpression_V2 }
  | { kind: 'MULTIPLY'; values: ValueExpression_V2[] };

export type Quantity_V2 =
  | { kind: 'EXACTLY'; value: ValueExpression_V2 }
  | { kind: 'UP_TO'; value: ValueExpression_V2 }
  | { kind: 'AT_LEAST'; value: ValueExpression_V2 }
  | { kind: 'ALL' }
  | { kind: 'ANY_NUMBER' };

export type NumericComparison_V2 =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'AT_LEAST'
  | 'AT_MOST'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'BETWEEN'
  | 'IN_SET';

export interface NumericPropertyFilter_V2 {
  propertyLayer: 'PRINTED' | 'BASE' | 'CURRENT';
  comparison: NumericComparison_V2;
  value?: ValueExpression_V2;
  values?: ValueExpression_V2[];
  minimum?: ValueExpression_V2;
  maximum?: ValueExpression_V2;
}

export interface Selector_V2 {
  subject: 'CARD' | 'DON' | 'PLAYER' | 'EFFECT' | 'EVENT' | 'ACTION_RESULT';
  owner?: PlayerReference_V2;
  controller?: PlayerReference_V2;
  zones?: Zone_V2[];
  cardCategories?: CardCategory_V2[];
  names?: { kind: 'NAME_EXACT' | 'NAME_CONTAINS' | 'NAME_NOT'; value: string }[];
  colors?: { kind: 'HAS_COLOR' | 'HAS_ANY_COLOR' | 'HAS_ALL_COLORS'; values: Color_V2[] };
  types?: { kind: 'HAS_TYPE' | 'TYPE_INCLUDES_TEXT' | 'HAS_ANY_TYPE'; values: string[] };
  attributes?: { kind: 'HAS_ATTRIBUTE' | 'HAS_ANY_ATTRIBUTE'; values: Attribute_V2[] };
  cost?: NumericPropertyFilter_V2;
  power?: NumericPropertyFilter_V2;
  counter?: NumericPropertyFilter_V2;
  life?: NumericPropertyFilter_V2;
  states?: ('ACTIVE' | 'RESTED' | 'ATTACKING' | 'BLOCKING' | 'PLAYED_THIS_TURN')[];
  keywords?: { kind: 'HAS_KEYWORD' | 'DOES_NOT_HAVE_KEYWORD'; value: KeywordEffect_V2 };
  baseEffectStatus?: 'ANY' | 'HAS_BASE_EFFECT' | 'NO_BASE_EFFECT';
  relations?: string[];
  instanceIds?: string[];
  quantity?: Quantity_V2;
  perCardCategoryQuantity?: Quantity_V2;
  chooser?: PlayerReference_V2 | 'RANDOM';
  distinctBy?: 'NONE' | 'CARD_OBJECT' | 'CARD_NUMBER' | 'CARD_NAME';
  ordering?: 'FIELD_ORDER' | 'DECK_ORDER' | 'PLAYER_CHOOSES_ORDER' | 'OWNER_CHOOSES_ORDER' | 'RANDOM_ORDER';
}

export type ConditionExpression_V2 =
  | { kind: 'TRUE' }
  | { kind: 'FALSE' }
  | {
      kind: 'PREDICATE';
      left: ValueExpression_V2 | { kind: string; [key: string]: unknown };
      operator:
        | 'EQUAL'
        | 'NOT_EQUAL'
        | 'GREATER_THAN'
        | 'GREATER_OR_EQUAL'
        | 'LESS_THAN'
        | 'LESS_OR_EQUAL'
        | 'CONTAINS'
        | 'EXISTS'
        | 'NOT_EXISTS'
        | 'MATCHES';
      right?: ValueExpression_V2 | { kind: string; [key: string]: unknown };
    }
  | { kind: 'AND'; conditions: ConditionExpression_V2[] }
  | { kind: 'OR'; conditions: ConditionExpression_V2[] }
  | { kind: 'NOT'; condition: ConditionExpression_V2 }
  | { kind: 'ANY'; selector: Selector_V2; condition: ConditionExpression_V2 }
  | { kind: 'ALL'; selector: Selector_V2; condition: ConditionExpression_V2 };

export type TimingExpression_V2 =
  | { kind: 'STANDARD_TIMING'; timing: StandardTiming_V2 }
  | { kind: 'MANUAL_WINDOW'; phase: 'MAIN_PHASE' | 'COUNTER_STEP' | 'TRIGGER_RESOLUTION'; controller: PlayerReference_V2; battleRestriction: 'OUTSIDE_BATTLE' | 'DURING_BATTLE' | 'ANY' }
  | { kind: 'CUSTOM_EVENT'; eventType: string; subject?: Selector_V2; actor?: PlayerReference_V2; sourceSelector?: Selector_V2; fromZone?: Zone_V2; toZone?: Zone_V2; conditions?: ConditionExpression_V2 }
  | { kind: 'AND'; timings: TimingExpression_V2[] }
  | { kind: 'OR'; timings: TimingExpression_V2[] };

export interface UsageLimit_V2 {
  maximumUses: number;
  period: 'PER_TURN' | 'PER_BATTLE' | 'PER_GAME' | 'WHILE_IN_CURRENT_ZONE' | 'CUSTOM';
  trackerScope: 'EFFECT_INSTANCE' | 'CARD_OBJECT' | 'PHYSICAL_CARD' | 'PLAYER' | 'CARD_NAME';
  resetsAt?: TimingExpression_V2;
  consumeWhen: 'ACTIVATED' | 'COST_PAYMENT_STARTED' | 'COST_PAID' | 'RESOLVED';
}

export type CostAction_V2 =
  | { type: 'REST_DON_COST'; count: ValueExpression_V2 }
  | { type: 'DON_MINUS_COST'; count: ValueExpression_V2; selectableZones: Zone_V2[] }
  | { type: 'REST_CARD_COST'; selector: Selector_V2 }
  | { type: 'TRASH_CARD_COST'; selector: Selector_V2 }
  | { type: 'KO_CARD_COST'; selector: Selector_V2 }
  | { type: 'MODIFY_POWER_COST'; selector: Selector_V2; operation: 'ADD' | 'SUBTRACT'; value: ValueExpression_V2; duration: Duration_V2 }
  | { type: 'GIVE_DON_COST'; donSelector: Selector_V2; targetSelector: Selector_V2 }
  | { type: 'PLAY_CARD_COST'; selector: Selector_V2; state?: 'ACTIVE' | 'RESTED' }
  | { type: 'RETURN_CARD_TO_HAND_COST'; selector: Selector_V2 }
  | { type: 'RETURN_CARD_TO_DECK_COST'; selector: Selector_V2; position?: 'TOP' | 'BOTTOM' }
  | { type: 'RETURN_CARD_TO_DECK_AND_SHUFFLE_COST'; selector: Selector_V2 }
  | { type: 'RETURN_DON_TO_DON_DECK_COST'; selector: Selector_V2 }
  | { type: 'RETURN_DON_TO_COST_AREA_COST'; selector: Selector_V2; state: 'ACTIVE' | 'RESTED' }
  | { type: 'ADD_CARD_TO_LIFE_COST'; selector: Selector_V2; position: 'TOP' | 'BOTTOM'; face: 'FACE_UP' | 'FACE_DOWN' }
  | { type: 'ADD_LIFE_TO_HAND_COST'; selector: Selector_V2 }
  | { type: 'TRASH_LIFE_COST'; selector: Selector_V2 }
  | { type: 'TURN_LIFE_FACE_UP_COST' | 'TURN_LIFE_FACE_DOWN_COST'; selector: Selector_V2 }
  | { type: 'REVEAL_CARD_COST'; selector: Selector_V2 }
  | { type: 'CHOOSE_ONE_COST'; options: CostAction_V2[][]; rawText?: string }
  | { type: 'RAW_COST'; rawText: string };

export interface ActivationCost_V2 {
  preconditions?: ConditionExpression_V2;
  payments: CostAction_V2[];
  optionalPayment: 'REQUIRED_TO_ACTIVATE' | 'PLAYER_MAY_DECLINE';
  executionPolicy: 'VERIFY_ALL_THEN_PAY_IN_ORDER';
}

export type Action_V2 =
  | { type: 'DRAW_CARD'; player: PlayerReference_V2; count: ValueExpression_V2 }
  | { type: 'LOOK_AT_CARDS'; player: PlayerReference_V2; source: Selector_V2; count: ValueExpression_V2 }
  | { type: 'SELECT'; selector: Selector_V2; selectionId: string }
  | { type: 'REVEAL_CARD'; selector: Selector_V2; viewers: 'BOTH_PLAYERS' | PlayerReference_V2 }
  | { type: 'REORDER_CARDS'; selector: Selector_V2; destination: { zone: Zone_V2; owner?: PlayerReference_V2; position?: 'TOP' | 'BOTTOM' }; orderChooser: PlayerReference_V2 | 'OWNER' | 'RANDOM' }
  | { type: 'SHUFFLE_ZONE'; player: PlayerReference_V2; zone: Zone_V2 }
  | { type: 'MOVE_CARD'; selector: Selector_V2; to: { zone: Zone_V2; owner?: PlayerReference_V2; position?: 'TOP' | 'BOTTOM' }; cause: 'EFFECT' | 'COST' | 'RULE' }
  | { type: 'PLAY_CARD'; selector: Selector_V2; player: PlayerReference_V2 }
  | { type: 'ACTIVATE_EVENT'; selector: Selector_V2; player: PlayerReference_V2 }
  | { type: 'TRASH_CARD'; selector: Selector_V2; cause: 'EFFECT' | 'COST' | 'RULE' }
  | { type: 'KO_CARD'; selector: Selector_V2; cause: 'EFFECT' | 'BATTLE' | 'RULE' }
  | { type: 'ADD_CARD_TO_LIFE'; selector: Selector_V2; player: PlayerReference_V2; position: 'TOP' | 'BOTTOM'; face: 'FACE_UP' | 'FACE_DOWN' }
  | { type: 'TAKE_LIFE_TO_HAND'; player: PlayerReference_V2; position: 'TOP' | 'BOTTOM'; count: ValueExpression_V2; triggerPolicy: 'DO_NOT_CHECK_TRIGGER' }
  | { type: 'TRASH_LIFE'; player: PlayerReference_V2; position: 'TOP' | 'BOTTOM'; count: ValueExpression_V2; activateTrigger: false }
  | { type: 'TAKE_DAMAGE'; targetPlayer: PlayerReference_V2; amount: ValueExpression_V2; lifeProcessing: 'CHECK_TRIGGER' | 'BANISH' | 'CUSTOM' }
  | { type: 'LOOK_AT_LIFE'; player: PlayerReference_V2; count: ValueExpression_V2; position: 'TOP' | 'BOTTOM' | 'ALL' }
  | { type: 'REORDER_LIFE'; player: PlayerReference_V2; selector: Selector_V2; orderChooser: PlayerReference_V2 | 'OWNER' | 'RANDOM' }
  | { type: 'TURN_LIFE_FACE_UP' | 'TURN_LIFE_FACE_DOWN'; selector: Selector_V2 }
  | { type: 'REST_CARD'; selector: Selector_V2 }
  | { type: 'SET_CARD_ACTIVE'; selector: Selector_V2 }
  | { type: 'REST_MIXED_TARGETS'; selectors: Selector_V2[]; quantity: Quantity_V2 }
  | { type: 'TURN_CARD_FACE_UP' | 'TURN_CARD_FACE_DOWN'; selector: Selector_V2 }
  | { type: 'ADD_DON_FROM_DON_DECK'; player: PlayerReference_V2; count: ValueExpression_V2; destination: 'COST_AREA'; state: 'ACTIVE' | 'RESTED' }
  | { type: 'GIVE_DON'; donSelector: Selector_V2; target: Selector_V2 }
  | { type: 'DETACH_DON'; sourceCard: Selector_V2; count: ValueExpression_V2; destination: 'COST_AREA'; state: 'ACTIVE' | 'RESTED' }
  | { type: 'REST_DON' | 'SET_DON_ACTIVE'; selector: Selector_V2 }
  | { type: 'RETURN_DON_TO_DON_DECK'; selector: Selector_V2 }
  | { type: 'MOVE_DON_TO_COST_AREA'; selector: Selector_V2; state: 'ACTIVE' | 'RESTED' }
  | { type: 'MODIFY_POWER' | 'MODIFY_COST' | 'MODIFY_COUNTER' | 'MODIFY_LIFE_VALUE' | 'MODIFY_DAMAGE'; selector: Selector_V2; propertyLayer: 'CURRENT_VALUE' | 'BASE_VALUE' | 'PRINTED_VALUE'; operation: 'ADD' | 'SUBTRACT' | 'SET' | 'COPY' | 'SET_TO_ZERO'; value: ValueExpression_V2; duration: Duration_V2 }
  | { type: 'SWAP_POWER'; selector: Selector_V2; propertyLayer: 'CURRENT_VALUE' | 'BASE_VALUE' | 'PRINTED_VALUE'; duration: Duration_V2 }
  | { type: 'MODIFY_NAME'; selector: Selector_V2; operation: 'ADD_NAME' | 'REPLACE_NAMES' | 'TREAT_AS_ADDITIONAL_NAME'; names: string[]; duration: Duration_V2 }
  | { type: 'MODIFY_COLOR'; selector: Selector_V2; operation: 'ADD_COLOR' | 'REMOVE_COLOR' | 'REPLACE_COLORS'; colors: Color_V2[]; duration: Duration_V2 }
  | { type: 'MODIFY_TYPE'; selector: Selector_V2; operation: 'ADD_TYPE' | 'REMOVE_TYPE' | 'REPLACE_TYPES'; types: string[]; duration: Duration_V2 }
  | { type: 'MODIFY_ATTRIBUTE'; selector: Selector_V2; operation: 'ADD_ATTRIBUTE' | 'REMOVE_ATTRIBUTE' | 'REPLACE_ATTRIBUTES'; attributes: Attribute_V2[]; duration: Duration_V2 }
  | { type: 'MODIFY_BASE_EFFECT_STATUS'; selector: Selector_V2; enabled: boolean; duration: Duration_V2 }
  | { type: 'GRANT_KEYWORD' | 'REMOVE_KEYWORD'; selector: Selector_V2; keyword: KeywordEffect_V2; duration: Duration_V2 }
  | { type: 'ADD_EFFECT'; selector: Selector_V2; effect: EffectDefinition_V2; duration: Duration_V2 }
  | { type: 'REMOVE_GAINED_EFFECT'; selector: Selector_V2; effectFilter: string; duration: Duration_V2 }
  | { type: 'INVALIDATE_EFFECTS' | 'VALIDATE_EFFECTS'; selector: Selector_V2; effectFilter: EffectFilter_V2; duration: Duration_V2 }
  | { type: 'COPY_EFFECT'; selector: Selector_V2; sourceEffect: Selector_V2; duration: Duration_V2 }
  | { type: 'CREATE_DELAYED_EFFECT' | 'CREATE_REPLACEMENT_EFFECT'; effect: EffectDefinition_V2; duration: Duration_V2 }
  | { type: 'PREVENT_ACTION' | 'ALLOW_ACTION'; selector: Selector_V2; action: string; causeFilter?: string; sourceSelector?: Selector_V2; duration: Duration_V2 }
  | { type: 'PREVENT_SELECTION' | 'PREVENT_ZONE_CHANGE' | 'MODIFY_VALID_TARGETS' | 'MODIFY_PLAY_PERMISSION'; selector: Selector_V2; action?: string; sourceSelector?: Selector_V2; duration: Duration_V2 }
  | { type: 'DECLARE_ATTACK'; attacker: Selector_V2; target: Selector_V2 }
  | { type: 'CHANGE_ATTACK_TARGET'; newTarget: Selector_V2 }
  | { type: 'ACTIVATE_BLOCKER'; selector: Selector_V2 }
  | { type: 'CANCEL_ATTACK' | 'END_BATTLE'; battle: 'CURRENT_BATTLE' }
  | { type: 'DEAL_DAMAGE'; source: Selector_V2; targetPlayer: PlayerReference_V2; amount: ValueExpression_V2 }
  | { type: 'SET_DAMAGE'; source: Selector_V2; targetPlayer: PlayerReference_V2; amount: ValueExpression_V2 }
  | { type: 'SKIP_BATTLE_STEP'; step: 'BLOCK_STEP' | 'COUNTER_STEP' | 'DAMAGE_STEP' | 'END_OF_BATTLE' }
  | { type: 'PLAYER_WINS' | 'PLAYER_LOSES'; player: PlayerReference_V2 }
  | { type: 'PLAYER_CHOOSES' | 'OPPONENT_CHOOSES'; options: ResolutionNode_V2[]; minimumChoices: number; maximumChoices: number }
  | { type: 'MODIFY_DEFEAT_CONDITION' | 'MODIFY_VICTORY_CONDITION' | 'MODIFY_DECK_CONSTRUCTION' | 'MODIFY_STARTING_SETUP' | 'MODIFY_AREA_CAPACITY' | 'MODIFY_RULE_PERMISSION'; modifier: RuleModifier_V2 }
  | { type: 'RAW_UNCOVERED_ACTION'; rawText: string; reason: string };

export type ResolutionNode_V2 =
  | { kind: 'ACTION'; action: Action_V2; actionId?: string }
  | { kind: 'SEQUENCE'; nodes: ResolutionNode_V2[] }
  | { kind: 'OPTIONAL'; node: ResolutionNode_V2 }
  | { kind: 'IF'; condition: ConditionExpression_V2; then: ResolutionNode_V2; else?: ResolutionNode_V2 }
  | { kind: 'IF_ACTION_SUCCEEDED'; actionResult: string; then: ResolutionNode_V2; else?: ResolutionNode_V2 }
  | { kind: 'CHOOSE'; chooser: PlayerReference_V2; options: ResolutionNode_V2[]; minimumChoices: number; maximumChoices: number }
  | { kind: 'FOR_EACH'; items: Selector_V2; node: ResolutionNode_V2 }
  | { kind: 'REPEAT'; count: ValueExpression_V2; node: ResolutionNode_V2 }
  | { kind: 'REPLACEMENT'; timing: TimingExpression_V2; node: ResolutionNode_V2 }
  | { kind: 'DELAY'; timing: TimingExpression_V2; node: ResolutionNode_V2; expiration?: Duration_V2 }
  | { kind: 'CREATE_CONTINUOUS_EFFECT'; modifier: ModifierExpression_V2; duration: Duration_V2; selector?: Selector_V2 }
  | { kind: 'NO_OP' };

export type ModifierExpression_V2 =
  | { type: 'STAT_MODIFIER'; stat: 'POWER' | 'COST' | 'COUNTER' | 'LIFE_VALUE' | 'DAMAGE'; operation: 'ADD' | 'SUBTRACT' | 'SET'; value: ValueExpression_V2 }
  | { type: 'EFFECT_MODIFIER'; operation: 'GRANT_KEYWORD' | 'REMOVE_KEYWORD'; keyword: KeywordEffect_V2 }
  | { type: 'PERMISSION_MODIFIER'; operation: 'PREVENT_ACTION' | 'ALLOW_ACTION'; action: string }
  | { type: 'RULE_MODIFIER'; scope: string; expression: Record<string, unknown> };

export interface RuleModifier_V2 {
  scope:
    | 'DECK_CONSTRUCTION'
    | 'CARD_NAME'
    | 'CARD_COLOR'
    | 'CARD_TYPE'
    | 'CARD_ATTRIBUTE'
    | 'STARTING_LIFE'
    | 'STARTING_HAND'
    | 'STARTING_DON'
    | 'DON_DECK_SIZE'
    | 'MAIN_DECK_SIZE'
    | 'CHARACTER_AREA_CAPACITY'
    | 'STAGE_AREA_CAPACITY'
    | 'DEFEAT_CONDITION'
    | 'VICTORY_CONDITION'
    | 'PLAY_PERMISSION'
    | 'ATTACK_PERMISSION'
    | 'GAME_SETUP'
    | 'GENERAL_RULE';
  validFrom: 'DECK_REGISTRATION' | 'PRE_GAME' | 'GAME_SETUP' | 'GAME_START' | 'ALWAYS';
  modifier: ModifierExpression_V2;
}

export interface EffectSource_V2 {
  objectRef: 'THIS_CARD' | 'CARD_OBJECT_ID' | 'RULE_OBJECT' | 'GENERATED_EFFECT';
  objectId?: string;
  physicalCardId?: string;
  owner: PlayerReference_V2;
  controller: PlayerReference_V2;
  sourceZone: Zone_V2;
  effectIndex?: number;
}

export interface EffectDefinitionMetadata_V2 {
  sourceCardNumber: string;
  effectIndex: number;
  printedText: string;
  normalizedText?: string;
  parserVersion?: string;
  assignmentId?: string;
  authoringStatus: 'PARSED_ONLY' | 'ASSIGNED' | 'PARTIAL' | 'UNCOVERED';
}

export interface EffectDefinition_V2 {
  id: string;
  source: EffectSource_V2;
  category: EffectCategory_V2;
  applicationMode: EffectApplicationMode_V2;
  activationZones: Zone_V2[];
  timing?: TimingExpression_V2;
  conditions?: ConditionExpression_V2;
  usageLimit?: UsageLimit_V2;
  optionality: EffectOptionality_V2;
  activationCost?: ActivationCost_V2;
  resolution: ResolutionNode_V2;
  duration?: Duration_V2;
  ruleModifier?: RuleModifier_V2;
  metadata: EffectDefinitionMetadata_V2;
}

export interface CardDefinition_V2 {
  schemaVersion: EffectSchemaVersion_V2;
  cardNumber: string;
  cardCategory: CardCategory_V2;
  printedName: string;
  colors: Color_V2[];
  types: string[];
  attributes: Attribute_V2[];
  printedCost?: number;
  printedPower?: number;
  printedCounter?: number;
  printedLife?: number;
  blockNumber?: number;
  baseEffects: EffectDefinition_V2[];
  rawEffectText: string;
  createdBy: 'effectCompiler_V2';
}

export interface ParsedAtomicEffect_V2 {
  id: string;
  cardNumber: string;
  effectIndex: number;
  atomIndex: number;
  markerTags: string[];
  rawText: string;
  normalizedText: string;
  parsedAction?: Action_V2;
  parsedCost?: CostAction_V2;
  parsedCosts?: CostAction_V2[];
  semanticStatus?: 'safe' | 'needsAudit';
  semanticIssues?: string[];
  canonicalAtoms?: string[];
  canonicalCoverage?: 'canonical' | 'parserGap' | 'definitionGap';
  canonicalRemark?: string;
  coverage: 'coveredByParser' | 'uncovered';
  unrecognizedKind?: string;
  uncoveredReason?: string;
  trackingRemark?: string;
}

export interface ParsedEffect_V2 {
  schemaVersion: EffectSchemaVersion_V2;
  parserVersion: string;
  cardNumber: string;
  rawText: string;
  effects: EffectDefinition_V2[];
  atomicEffects: ParsedAtomicEffect_V2[];
  warnings: string[];
}

export interface EffectAssignment_V2 {
  assignmentId: string;
  cardNumber: string;
  effectIndex: number;
  status: 'ASSIGNED' | 'PARTIAL' | 'UNCOVERED';
  printedText: string;
  effect: Omit<EffectDefinition_V2, 'id' | 'source' | 'metadata'>;
  coveredAtomicEffectIds: string[];
  uncoveredNotes?: string[];
}

export interface CompiledCardEffects_V2 {
  schemaVersion: EffectSchemaVersion_V2;
  compilerVersion: string;
  cardNumber: string;
  parsedEffects: EffectDefinition_V2[];
  effects: EffectDefinition_V2[];
  assignments: EffectAssignment_V2[];
}

export interface AtomicCoverageStatus_V2 {
  atomicEffectId: string;
  cardNumber: string;
  effectIndex: number;
  atomIndex: number;
  rawText: string;
  parserStatus: 'recognized' | 'unrecognized';
  semanticStatus?: 'safe' | 'needsAudit';
  semanticIssues?: string[];
  assignmentStatus: 'assigned' | 'partial' | 'unassigned';
  status: 'covered' | 'partial' | 'uncovered';
  coveredByAssignmentIds: string[];
  canonicalAtoms?: string[];
  canonicalCoverage?: 'canonical' | 'parserGap' | 'definitionGap';
  canonicalRemark?: string;
  unrecognizedKind?: string;
  uncoveredReason?: string;
  trackingRemark?: string;
}

export interface CardEffectCoverageReport_V2 {
  schemaVersion: EffectSchemaVersion_V2;
  generatedBy: 'effectCompiler_V2';
  cardNumber: string;
  totalAtomicEffects: number;
  parserRecognizedAtomicEffects: number;
  parserUnrecognizedAtomicEffects: number;
  assignmentCoveredAtomicEffects: number;
  assignmentPartialAtomicEffects: number;
  assignmentUncoveredAtomicEffects: number;
  /** @deprecated Use assignmentCoveredAtomicEffects. Kept for existing generated readers. */
  coveredAtomicEffects: number;
  /** @deprecated Use assignmentPartialAtomicEffects. Kept for existing generated readers. */
  partialAtomicEffects: number;
  /** @deprecated Use assignmentUncoveredAtomicEffects. Kept for existing generated readers. */
  uncoveredAtomicEffects: number;
  statuses: AtomicCoverageStatus_V2[];
}
