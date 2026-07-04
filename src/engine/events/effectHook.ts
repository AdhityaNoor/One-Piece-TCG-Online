/**
 * Effect hook / timing descriptor model.
 * Source of truth: Comprehensive Rules Section 8 (8-1-3 effect categories)
 * and Section 10 (keyword timings/conditions) — see blueprint Sections 6-7.
 *
 * IMPORTANT: this describes WHEN and UNDER WHAT CONDITION a card's effect
 * would fire. It never encodes WHAT the effect does — per project ground
 * rules, the card API (and by extension this layer) is data only. Concrete
 * behavior belongs to reusable effect templates in /src/cards/effectTemplates.
 */

/** 8-1-3. */
export type EffectCategory = 'auto' | 'activate' | 'permanent' | 'replacement';

/** 8-1-3-1-1, 10-2. Keyword timings with their own activation trigger. */
export type EffectTimingKeyword =
  | 'onPlay' // [On Play]
  | 'whenAttacking' // [When Attacking]
  | 'onBlock' // [On Block]
  | 'onOpponentsAttack' // [On Your Opponent's Attack]
  | 'onKO' // [On K.O.]
  | 'endOfYourTurn' // [End of Your Turn]
  | 'endOfOpponentsTurn' // [End of Your Opponent's Turn]
  | 'activateMain' // [Activate: Main] / Event [Main]
  | 'counter' // Event [Counter]
  | 'lifeTrigger' // [Trigger] — fires when revealed from Life (2-11, 10-1-5-2)
  | 'custom'; // free-text "when ..."/"on ..." trigger not covered by a defined keyword (8-1-3-1-1)

/** 8-3-2, 10-2-9 through 10-2-13. Gating conditions, distinct from activation timing. */
export type EffectCondition = 'donAtLeastX' | 'yourTurn' | 'opponentsTurn' | 'oncePerTurn' | 'donMinusX';

/**
 * Static description of one effect on one card definition. Multiple
 * EffectHooks may exist per card (text resolved top-to-bottom, 2-8-3).
 */
export interface EffectHook {
  id: string;
  cardDefinitionId: string;
  category: EffectCategory;
  timing: EffectTimingKeyword;
  conditions: EffectCondition[];
  /** True if 10-2-13 [Once Per Turn] applies — tracked per CardInstance, see state/card.ts oncePerTurnUsed. */
  oncePerTurn: boolean;
  /** Free-text description of the activation cost, if any (8-3-1) — not executable, display/debug only. */
  activationCostDescription: string | null;
  /** Pointer into the future reusable-effect-template registry; null until that system exists. */
  effectTemplateId: string | null;
  /** Original card text this hook was derived from, for debugging/ruling lookups. */
  rawText: string;
}
