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
}

/**
 * An outstanding decision the engine is blocked on. Resolved exclusively via
 * a RESOLVE_PENDING_CHOICE action (see actions/action.ts) carrying this id.
 */
export interface PendingChoice {
  id: string;
  playerId: string; // whose decision this is — not necessarily the turn player (e.g. Block Step)
  kind: ChoiceKind;
  prompt: string;
  constraints: ChoiceConstraints;
  /** The card or rule that generated this choice, for log/UI attribution. */
  sourceInstanceId: string | null;
  sourceEffectId: string | null;
  /**
   * Serializable resume point for an interpreter-suspended EffectProgram (set
   * when sourceEffectId === 'ir'). Lets RESOLVE_PENDING_CHOICE continue the
   * program from where the chooseTargets op suspended it, with bindings intact.
   * Omitted for rule-level choices (e.g. character-area overflow).
   */
  resumeState?: { abilityIndex: number; opIndex: number; bindings: Record<string, string[]> };
}
