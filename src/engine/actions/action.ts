/**
 * Player-originated action dispatch model.
 * Source of truth: derived from the legal-actions-per-phase table in the
 * blueprint (docs/01-rules-engine-blueprint.md, Section 4), grounded in
 * Comprehensive Rules Sections 6 and 7.
 *
 * Every action is plain, serializable data — no functions, no class
 * instances. The same shape is dispatched locally (hotseat) and, later,
 * over the network (project ground rule).
 */

export type GameActionType =
  | 'PLAY_CHARACTER'
  | 'PLAY_STAGE'
  | 'ACTIVATE_EVENT_MAIN'
  | 'ACTIVATE_CARD_EFFECT'
  | 'GIVE_DON'
  | 'DECLARE_ATTACK'
  | 'ACTIVATE_BLOCKER'
  | 'ACTIVATE_COUNTER_CHARACTER'
  | 'ACTIVATE_COUNTER_EVENT'
  | 'PASS_STEP'
  | 'RESOLVE_PENDING_CHOICE'
  | 'END_MAIN_PHASE'
  | 'MULLIGAN_DECISION'
  | 'CHOOSE_GOING_FIRST'
  | 'CONCEDE';

interface BaseAction<T extends GameActionType> {
  type: T;
  actionId: string; // unique per dispatch, useful for replay/dedup over network
  playerId: string; // the player this action is attributed to (4-2-1)
}

/** 6-5-3-1, 2-7-2. donInstanceIds.length must equal the card's current cost. */
export interface PlayCharacterAction extends BaseAction<'PLAY_CHARACTER'> {
  handCardInstanceId: string;
  donInstanceIds: string[];
}

/** 6-5-3-1, 2-7-4. */
export interface PlayStageAction extends BaseAction<'PLAY_STAGE'> {
  handCardInstanceId: string;
  donInstanceIds: string[];
}

/** 2-7-3, 10-2-3. Event marked [Main]. */
export interface ActivateEventMainAction extends BaseAction<'ACTIVATE_EVENT_MAIN'> {
  handCardInstanceId: string;
  donInstanceIds: string[];
}

/** 8-1-3-2-1. Field card marked [Activate: Main] or [Main]. */
export interface ActivateCardEffectAction extends BaseAction<'ACTIVATE_CARD_EFFECT'> {
  sourceInstanceId: string;
  effectId: string;
  donInstanceIds: string[]; // activation cost payment, if any (8-3-1-5)
}

/** 6-5-5-1. */
export interface GiveDonAction extends BaseAction<'GIVE_DON'> {
  donInstanceId: string;
  targetInstanceId: string; // Leader or Character receiving the DON!!
}

/** 7-1-1-1, 7-1-1-2. */
export interface DeclareAttackAction extends BaseAction<'DECLARE_ATTACK'> {
  attackerInstanceId: string;
  targetInstanceId: string; // opponent Leader, or an opponent's RESTED Character
}

/** 7-1-2-1. */
export interface ActivateBlockerAction extends BaseAction<'ACTIVATE_BLOCKER'> {
  blockerInstanceId: string;
}

/** 7-1-3-2-1. */
export interface ActivateCounterCharacterAction extends BaseAction<'ACTIVATE_COUNTER_CHARACTER'> {
  handCardInstanceId: string;
  boostTargetInstanceId: string; // Leader or 1 Character to receive the Counter power boost
}

/** 7-1-3-2-2. */
export interface ActivateCounterEventAction extends BaseAction<'ACTIVATE_COUNTER_EVENT'> {
  handCardInstanceId: string;
  donInstanceIds: string[];
}

/** Generic decline for an optional Block/Counter Step action, or a declined optional trigger. */
export interface PassStepAction extends BaseAction<'PASS_STEP'> {}

/** Answers an outstanding PendingChoice (blueprint Section 11). Shape of `response` depends on the choice's kind. */
export interface ResolvePendingChoiceAction extends BaseAction<'RESOLVE_PENDING_CHOICE'> {
  choiceId: string;
  response: string[] | number | boolean;
}

/** 6-5-2-1. */
export interface EndMainPhaseAction extends BaseAction<'END_MAIN_PHASE'> {}

/** 5-2-1-6. */
export interface MulliganDecisionAction extends BaseAction<'MULLIGAN_DECISION'> {
  redraw: boolean;
}

/** 5-2-1-4, 5-2-1-5. */
export interface ChooseGoingFirstAction extends BaseAction<'CHOOSE_GOING_FIRST'> {
  goingFirst: boolean;
}

/** 1-2-3, 1-2-4. Cannot be replaced or forced by any card effect. */
export interface ConcedeAction extends BaseAction<'CONCEDE'> {}

export type GameAction =
  | PlayCharacterAction
  | PlayStageAction
  | ActivateEventMainAction
  | ActivateCardEffectAction
  | GiveDonAction
  | DeclareAttackAction
  | ActivateBlockerAction
  | ActivateCounterCharacterAction
  | ActivateCounterEventAction
  | PassStepAction
  | ResolvePendingChoiceAction
  | EndMainPhaseAction
  | MulliganDecisionAction
  | ChooseGoingFirstAction
  | ConcedeAction;

/** Returned by the (not-yet-implemented) validator — see blueprint Section 12. */
export interface ValidationResult {
  legal: boolean;
  /** Human-readable reasons the action was rejected; empty when legal. */
  reasons: string[];
}
