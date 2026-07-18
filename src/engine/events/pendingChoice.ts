/**
 * Pending choice model.
 * Source of truth: Comprehensive Rules 1-3-4, 1-3-5, 8-4-4 (choice
 * resolution mechanics) — see blueprint Section 11 for full rationale.
 */

export type ChoiceKind =
  | 'SELECT_CARDS' // e.g. choose DON!! to rest for a cost, choose a Character to trash (3-7-6-1)
  | 'SELECT_ZONE_TARGET' // e.g. attack target (7-1-1-2)
  | 'SELECT_NUMBER' // 1-3-5, "choose a number"
  | 'ORDER_EFFECTS' // 6-6-1-1-3, 6-6-1-1-4, simultaneous own-effect ordering
  | 'YES_NO' // e.g. activate [Blocker]? activate [Trigger]? (10-1-5-2)
  | 'SELECT_OPTION'; // generic discrete choice not covered above

export interface ChoiceConstraints {
  /** 8-4-4-1. If "up to" was used, min may be 0; otherwise min reflects a forced minimum. */
  min: number;
  max: number;
  /** Restrict selection to a specific zone, when the choice is card-based. */
  zoneId?: string;
  /** Free-text description of the eligibility filter — concrete predicate logic lives in the rules engine, not here (data only). */
  filterDescription?: string;
  /**
   * Explicit set of eligible CardInstance ids the selection must be drawn from
   * (computed when the choice was raised). Lets the generic resolver validate a
   * card-effect target choice without re-deriving the filter. Omitted for
   * choices whose eligibility is purely a zone/free-text description.
   */
  candidateInstanceIds?: string[];
  /**
   * Cards the player is allowed to see for this choice even if they are not
   * selectable. Used by search/look effects: all looked cards are visible, but
   * only filter-matching cards are eligible to add/select.
   */
  visibleInstanceIds?: string[];
  /**
   * UI hint: render ONLY candidateInstanceIds, ignoring visibleInstanceIds,
   * even though visibleInstanceIds is populated. Set by opaque whole-deck
   * search ops (playFromDeck / playStageFromDeck / searchDeck in
   * interpreter.ts) where visibleInstanceIds intentionally lists the entire
   * deck for log/AI-evaluator purposes (see e.g.
   * effectTemplates/__tests__/searchDeckFamily.test.ts, which asserts
   * visibleInstanceIds === the full deck) — but a picker showing 40+ mostly
   * irrelevant deck cards is bad UX; the player only cares about the
   * filter-matching subset. NOT set by genuinely bounded reveals
   * (searchTopDeck, lookLifeAndReorder, peekLifeThenPlace), where showing
   * every looked-at card (including non-matches) reflects what the player
   * actually saw.
   */
  uiShowOnlyCandidates?: boolean;
  /** Discrete option labels for SELECT_OPTION choices; response is the selected option index. */
  options?: { label: string }[];
  /** Inclusive range for SELECT_NUMBER choices. */
  numberMin?: number;
  numberMax?: number;
  /** For multi-target SELECT_CARDS: selected cards' combined current power must be at most this. */
  maxCombinedPower?: number;
  /** For multi-target SELECT_CARDS: selected cards must have different printed names. */
  distinctNames?: boolean;
}

export interface KoReplacementResumeState {
  phase: 'confirm' | 'payCost';
  targetInstanceId: string;
  recordId: string;
  cause: 'battle' | 'effect';
  actorPlayerId: string;
  /** Which removal event triggered this replacement (defaults to 'ko'). */
  removalTrigger?: 'ko' | 'returnToHand' | 'bottomDeck';
  /** Resume a suspended IR program after the K.O. (or replacement) resolves. */
  ir?: {
    sourceInstanceId: string;
    abilityIndex: number;
    opIndex: number;
    bindings: Record<string, string[]>;
    branchIndex?: number;
    branchOpIndex?: number;
    remainingKoTargetIds?: string[];
    /** Remaining targets for a suspended returnToHand / moveToBottomDeck op. */
    remainingRemovalTargetIds?: string[];
    /** Which removal op suspended (returnToHand | moveToBottomDeck). */
    suspendedRemovalOp?: 'returnToHand' | 'moveToBottomDeck';
  };
  /** Battle damage step paused mid-resolution for a replacement prompt. */
  battle?: {
    causedByActionId: string | null;
    attackerId: string;
    attackerPlayerId: string;
    defendingPlayerId: string;
    priorLogCount: number;
    onBattleLogLen: number;
    triggerPending: PendingChoice[];
    onBattlePending: PendingChoice[];
  };
}

export interface PendingChoice {
  id: string;
  playerId: string;
  kind: ChoiceKind;
  prompt: string;
  constraints: ChoiceConstraints;
  /** The card or rule that generated this choice, for log/UI attribution. */
  sourceInstanceId: string | null;
  sourceEffectId: string | null;
  /**
   * Serializable resume point for an interpreter-suspended EffectProgram (set
   * when sourceEffectId === 'ir') or battle damage step (sourceEffectId ===
   * 'rule:battleKoReplacement'). K.O. replacement mid-`ko` op stashes
   * `koReplacement` here while still using the normal IR resume path.
   */
  resumeState?: {
    abilityIndex: number;
    /** Parent chooseOption index when executing a modal branch; otherwise the suspending op index. */
    opIndex: number;
    bindings: Record<string, string[]>;
    branchIndex?: number;
    branchOpIndex?: number;
    koReplacement?: KoReplacementResumeState;
    v2ActivationCost?: {
      sourceInstanceId: string;
      abilityId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').StandardTiming_V2;
      costCounts: number[];
      costSelectionsByCardId?: Record<string, import('../effects_V2/costs_V2').CostPaymentSelection_V2[]>;
    };
    v2SelectMoveToHand?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      moveAction: Extract<import('../../cards/effectCompiler_V2/types_V2').Action_V2, { type: 'MOVE_CARD' }>;
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
    v2ChooseOption?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      options: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
    v2OptionalResolution?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      node: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2;
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
    v2ReorderCards?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      reorderAction: Extract<import('../../cards/effectCompiler_V2/types_V2').Action_V2, { type: 'REORDER_CARDS' }>;
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
    v2SelectPlayCard?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      playAction: Extract<import('../../cards/effectCompiler_V2/types_V2').Action_V2, { type: 'PLAY_CARD' }>;
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
    v2SelectActionTarget?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      action: import('../../cards/effectCompiler_V2/types_V2').Action_V2;
      targetField: 'selector' | 'newTarget' | 'mixedTargets';
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
    v2SelectGiveDon?: {
      sourceInstanceId: string;
      controllerId: string;
      timing: import('../../cards/effectCompiler_V2/types_V2').TimingExpression_V2;
      giveDonAction: Extract<import('../../cards/effectCompiler_V2/types_V2').Action_V2, { type: 'GIVE_DON' }>;
      targetField: 'donSelector' | 'target';
      remainingNodes: import('../../cards/effectCompiler_V2/types_V2').ResolutionNode_V2[];
      bindings: {
        selectedObjects: Record<string, string[]>;
        actionResults: Record<string, unknown>;
      };
    };
  };
}
