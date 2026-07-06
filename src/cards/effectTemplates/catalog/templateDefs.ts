/**
 * Template catalog: identifiers and typed parameter schemas.
 *
 * Card behavior is modeled as timing + reusable functions:
 *   - `timing` says when the ability exists/fires.
 *   - `condition`, `gate`, `cost`, and `oncePerTurn` describe the ability wrapper.
 *   - `functions` is an ordered list of reusable effect functions translated to IR ops.
 *
 * Raw card text never enters this path.
 */
import type {
  AbilityCost,
  AbilityGate,
  IrCondition,
  IrDuration,
  IrTiming,
  SearchFilter,
  SearchPickDestination,
  SearchRemainderDestination,
  SequenceCondition,
} from '../../../engine/effects/effectIr';
import type { ContinuousKeyword, SourceStateCondition } from '../../../engine/state/game';
import type { Color } from '../../../engine/state/card';

export const TEMPLATE_IDS = {
  ABILITY: 'ability',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

export type MoveCardSource =
  | { zone: 'life'; player: 'controller' | 'opponent'; position: 'top' | 'bottom' | 'topOrBottom'; hiddenChoice?: boolean; count?: number }
  | { zone: 'deck'; player: 'controller'; position: 'top'; count?: number }
  | { zone: 'hand'; player: 'controller'; filter?: SearchFilter }
  | { zone: 'trash'; player: 'controller'; filter?: SearchFilter }
  | { zone: 'characters'; player: 'controller' | 'opponent' | 'any'; filter?: { maxCost?: number; exactCost?: number; maxPower?: number; maxBaseCost?: number; minBaseCost?: number; exactBaseCost?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; rested?: boolean; typeIncludes?: string; anyOfTypes?: string[] } };

export type MoveCardDestination =
  | { zone: 'hand'; player: 'owner' }
  | { zone: 'life'; player: 'owner' | 'controller'; position: 'top'; faceUp?: boolean }
  | { zone: 'deck'; player: 'owner'; position: 'bottom' }
  | { zone: 'trash'; player: 'owner' };

export interface TargetFilter {
  /**
   * CURRENT cost/power filters (include continuous modifiers + on-turn DON!! bonus). Use these for
   * card text that says "a cost of N or less" / "N power or less".
   */
  maxCost?: number;
  exactCost?: number;
  maxPower?: number;
  /**
   * BASE (printed) cost/power filters — the card's original values, IGNORING buffs/debuffs. Use these
   * ONLY for card text that literally says "base cost" / "base power" (e.g. "6000 base power or less").
   */
  maxBaseCost?: number;
  minBaseCost?: number;
  exactBaseCost?: number;
  maxBasePower?: number;
  minBasePower?: number;
  exactBasePower?: number;
  rested?: boolean;
  hasBlocker?: boolean;
  typeIncludes?: string;
  anyOfTypes?: string[];
  color?: Color;
  name?: string;
  excludeSelf?: boolean;
}

export type TargetSpec =
  | { ref: 'self' }
  | { ref: 'previous' }
  | { ref: 'battleOpponent' }
  | { group: 'leader'; player: 'controller' }
  | { group: 'characters'; player: 'controller' | 'opponent' | 'any'; filter?: TargetFilter }
  | { group: 'leaderOrCharacters'; player: 'controller' | 'opponent'; filter?: TargetFilter };

export type AbilityFunction =
  | { fn: 'draw'; amount: number }
  | { fn: 'addDonFromDeck'; count: number; rested: boolean }
  | { fn: 'giveDon'; count: number }
  | { fn: 'ko'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'rest'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'preventRefresh'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'addCost'; target: TargetSpec; amount: number; duration?: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'addPower'; target: TargetSpec; amount: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'addKeyword'; target: TargetSpec; keyword: ContinuousKeyword; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'preventBlockers'; duration: IrDuration; target?: 'self' | 'chosenControllerLeaderOrCharacter'; filter?: { typeIncludes?: string }; blockerPowerAtLeast?: number }
  | { fn: 'drawAndTrash'; drawCount: number; trashCount: number }
  | { fn: 'trashFromHand'; count: number }
  | { fn: 'optionalTrashFromHand'; count: number }
  | { fn: 'trashFromOpponentHandChosenByOpponent'; count: number }
  | { fn: 'trashTopDeck'; count: number }
  | { fn: 'moveCards'; from: MoveCardSource; to: MoveCardDestination; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'peekLifeAndPlace'; from: 'controllerOrOpponentTop'; placement: 'topOrBottom' }
  | { fn: 'chooseOne'; chooser: 'controller' | 'opponent'; prompt: string; options: { label: string; functions: SequencedAbilityFunction[] }[] }
  | { fn: 'playFromHand'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'playFromDeck'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'playFromTrash'; filter: SearchFilter; maxTargets?: number; rested?: boolean }
  | { fn: 'triggerPlaySelf' }
  | { fn: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter?: SearchFilter; remainder?: SearchRemainderDestination }
  | { fn: 'addPowerSelf'; amount: number; duration: IrDuration; condition?: IrCondition }
  | { fn: 'restSelf' }
  // Set-active family (inverse of rest). Composes the shared `setActive` primitive.
  | { fn: 'setActiveSelf' }
  | { fn: 'setActiveControllerCharacter'; filter?: { maxCost?: number; exactCost?: number; rested?: boolean; typeIncludes?: string; anyOfTypes?: string[] }; maxTargets?: number }
  | { fn: 'setActiveControllerDon'; maxTargets: number }
  // Rest up to N of the opponent's active DON!! cards (DON!! denial).
  | { fn: 'restOpponentDon'; maxTargets?: number }
  // Aura: give the controller's own Leader + Characters (optionally type-filtered)
  // a flat power delta, optionally gated on the source card's own state.
  | { fn: 'addPowerAuraControllerTypes'; amount: number; duration: IrDuration; anyOfTypes?: string[]; sourceCondition?: SourceStateCondition }
  // Give ALL of the controller's own Characters (optionally type-filtered) a flat power delta —
  // no target choice ("All of your {FILM} type Characters gain +2000").
  | { fn: 'addPowerControllerCharactersAll'; amount: number; duration: IrDuration; filter?: { typeIncludes?: string; maxCost?: number } }
  // "This card cannot be K.O.'d" — scope 'battle' (battle K.O. only) or 'any'.
  // `attackerCategory` optionally limits a battle immunity to a given attacker ("by Leaders").
  | { fn: 'koImmunitySelf'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; attackerCategory?: 'leader' | 'character' }
  | { fn: 'koImmunityControllerCharactersAll'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition }
  // Grant K.O. immunity to the card chosen by the immediately preceding function (var 't').
  | { fn: 'koImmunityChosen'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration }
  // Trash exactly `count` cards of a given type from your hand (used to pay a typed hand cost).
  | { fn: 'trashTypeFromHand'; count: number; filter: { typeIncludes?: string } }
  // K.O. ALL Characters (both players) matching a cost/power filter, no target choice
  // ("K.O. all Characters with a cost of 1 or less").
  | { fn: 'koAllCharacters'; filter?: { maxCost?: number; maxPower?: number } }
  // Give up to `count` rested DON!! to the controller's Leader (no target choice) — "give ... to this Leader".
  | { fn: 'giveDonControllerLeader'; count: number };

export type SequencedAbilityFunction = AbilityFunction & {
  /** Gate this function on the prior function result, for "if you do" wording. */
  ifPrevious?: SequenceCondition;
  /** Gate this function at its exact sequence point, after prior effects/costs have resolved. */
  ifGate?: AbilityGate[];
};

export interface AbilityTemplateParams {
  timing: IrTiming;
  functions: readonly SequencedAbilityFunction[];
  condition?: IrCondition;
  gate?: AbilityGate[];
  cost?: AbilityCost[];
  oncePerTurn?: boolean;
  /** onBattle only: the battled Character must carry this attribute (e.g. 'strike'). */
  battlingOpponentAttribute?: string;
}

export interface TemplateParamMap {
  ability: AbilityTemplateParams;
}
