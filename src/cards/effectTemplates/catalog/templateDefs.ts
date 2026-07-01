/**
 * Template catalog: identifiers and typed parameter schemas.
 *
 * Every TemplateId names one reusable card-effect shape. The TemplateParamMap
 * constrains what params each shape accepts — TypeScript narrows the params
 * field in CardEffectAssignment automatically based on the templateId
 * discriminant.
 *
 * Rules:
 *   - Add a template only when at least one reviewed card uses it.
 *   - Keep params minimal: only what the factory needs to produce the IR.
 *   - No free-text strings that could be confused with card effect text.
 */
import type { AbilityCost, SearchFilter } from '../../../engine/effects/effectIr';

// ---------------------------------------------------------------------------
// Template identifiers
// ---------------------------------------------------------------------------

export const TEMPLATE_IDS = {
  // --- draw ---
  ON_PLAY_DRAW: 'onPlayDraw',
  ON_KO_DRAW: 'onKODraw',

  // --- DON!! ramp (add from DON!! deck) ---
  ON_PLAY_ADD_DON_FROM_DECK: 'onPlayAddDonFromDeck',
  ON_KO_ADD_DON_FROM_DECK: 'onKOAddDonFromDeck',

  // --- give DON!! (attach from cost area) ---
  ON_PLAY_GIVE_DON: 'onPlayGiveDon',
  ACTIVATE_MAIN_GIVE_DON: 'activateMainGiveDon',

  // --- K.O. ---
  ON_PLAY_KO_OPPONENT_CHARACTER: 'onPlayKoOpponentCharacter',
  TRIGGER_KO_OPPONENT_CHARACTER: 'triggerKoOpponentCharacter',
  ACTIVATE_MAIN_KO: 'activateMainKo',

  // --- rest opponent ---
  ON_PLAY_REST_OPPONENT_CHARACTER: 'onPlayRestOpponentCharacter',
  ACTIVATE_MAIN_REST: 'activateMainRest',

  // --- bounce (return to hand) ---
  ON_PLAY_RETURN_TO_HAND: 'onPlayReturnToHand',

  // --- modify cost ---
  ON_PLAY_MODIFY_COST_OPPONENT: 'onPlayModifyCostOpponent',
  WHEN_ATTACKING_MODIFY_COST_OPPONENT: 'whenAttackingModifyCostOpponent',
  ACTIVATE_MAIN_MODIFY_COST_OPPONENT: 'activateMainModifyCostOpponent',

  // --- modify power ---
  WHEN_ATTACKING_MODIFY_POWER_OPPONENT: 'whenAttackingModifyPowerOpponent',

  // --- draw + discard ---
  WHEN_ATTACKING_DRAW_AND_TRASH: 'whenAttackingDrawAndTrash',

  // --- searcher (look at top N, pick matching) ---
  ON_PLAY_SEARCH_TOP_DECK: 'onPlaySearchTopDeck',
  ACTIVATE_MAIN_SEARCH_TOP_DECK: 'activateMainSearchTopDeck',

  // --- DON!! attachment conditional power boost (passive) ---
  DON_ATTACHED_SELF_POWER: 'donAttachedSelfPower',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

// ---------------------------------------------------------------------------
// Typed params per template (one entry per TemplateId)
// ---------------------------------------------------------------------------

export interface TemplateParamMap {
  // draw
  onPlayDraw: { amount: number };
  onKODraw: { amount: number };

  // DON!! ramp
  onPlayAddDonFromDeck: { count: number; rested: boolean };
  onKOAddDonFromDeck: { count: number; rested: boolean };

  // give DON!! (attach from cost area to a leader/character)
  /** [On Play] Give up to `count` rested DON!! to a chosen Leader/Character. */
  onPlayGiveDon: { count: number };
  /** [Activate: Main] [Once Per Turn] Give up to `count` rested DON!! to a chosen Leader/Character. */
  activateMainGiveDon: { count: number };

  // K.O.
  onPlayKoOpponentCharacter: { filter: { maxCost?: number; maxPower?: number } };
  triggerKoOpponentCharacter: { filter: { maxCost?: number; maxPower?: number } };
  /** [Activate: Main] K.O. up to 1 opponent Character matching filter. Optional activation cost. */
  activateMainKo: { filter: { maxCost?: number; maxPower?: number }; cost?: AbilityCost[]; oncePerTurn?: boolean };

  // rest
  onPlayRestOpponentCharacter: { filter: { maxCost?: number; maxPower?: number } };
  /** [Activate: Main] Rest up to 1 opponent Character matching filter. Optional activation cost. */
  activateMainRest: { filter: { maxCost?: number; maxPower?: number }; cost?: AbilityCost[]; oncePerTurn?: boolean };

  // bounce
  /** [On Play] Return up to 1 opponent Character with cost ≤ maxCost to owner's hand. */
  onPlayReturnToHand: { maxCost: number };

  // modify cost
  /** [On Play] Give up to 1 opponent Character −|amount| cost this turn. amount must be negative. */
  onPlayModifyCostOpponent: { amount: number };
  /** [When Attacking] Give up to 1 opponent Character −|amount| cost this turn. */
  whenAttackingModifyCostOpponent: { amount: number; donRequired?: number };
  /** [Activate: Main] Give up to 1 opponent Character −|amount| cost this turn. Optional activation cost. */
  activateMainModifyCostOpponent: { amount: number; cost?: AbilityCost[]; oncePerTurn?: boolean };

  // modify power (opponent)
  /** [When Attacking] Give up to `maxTargets` (default 1) opponent Characters −|amount| power this turn. */
  whenAttackingModifyPowerOpponent: { amount: number; donRequired?: number; maxTargets?: number };

  // draw + discard
  /** [When Attacking] Draw `drawCount` cards, then choose `trashCount` to trash. */
  whenAttackingDrawAndTrash: { drawCount: number; trashCount: number; donRequired?: number };

  // searcher
  onPlaySearchTopDeck: { look: number; pick: number; filter: SearchFilter };
  /** [Activate: Main] Look at top `look`; add up to `pick` matching cards to hand. Optional cost. */
  activateMainSearchTopDeck: { look: number; pick: number; filter: SearchFilter; cost?: AbilityCost[]; oncePerTurn?: boolean };

  // DON!! attachment passive boost
  donAttachedSelfPower: { donAttachedAtLeast: number; amount: number };
}
