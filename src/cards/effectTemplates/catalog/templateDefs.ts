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

export type AbilityFunction =
  | { fn: 'draw'; amount: number }
  | { fn: 'addDonFromDeck'; count: number; rested: boolean }
  | { fn: 'giveDon'; count: number }
  | { fn: 'koOpponentCharacter'; filter: { maxCost?: number; exactCost?: number; maxPower?: number; rested?: boolean; hasBlocker?: boolean }; maxTargets?: number }
  | { fn: 'restOpponentCharacter'; filter: { maxCost?: number; maxPower?: number; rested?: boolean }; maxTargets?: number }
  | { fn: 'returnToHand'; maxCost: number; target: 'any' | 'opponent' }
  | { fn: 'moveToBottomDeck'; maxCost: number; target: 'any' | 'opponent' }
  | { fn: 'modifyCostOpponent'; amount: number; maxTargets?: number }
  | { fn: 'modifyPowerOpponent'; amount: number; maxTargets?: number }
  | { fn: 'addPowerController'; amount: number; duration: IrDuration; maxTargets?: number; filter?: { typeIncludes?: string; excludeSelf?: boolean } }
  | { fn: 'addPowerControllerLeader'; amount: number; duration: IrDuration }
  | { fn: 'addPowerControllerCharacter'; amount: number; duration: IrDuration; filter?: { maxCost?: number; exactCost?: number; color?: Color }; maxTargets?: number }
  | { fn: 'modifyPowerOpponentLeaderOrCharacter'; amount: number; duration: IrDuration; maxTargets?: number }
  | { fn: 'addKeywordSelf'; keyword: ContinuousKeyword; duration: IrDuration; condition?: IrCondition }
  | { fn: 'addKeywordControllerLeaderOrCharacter'; keyword: ContinuousKeyword; duration: IrDuration; filter?: { name?: string }; maxTargets?: number }
  | { fn: 'preventBlockers'; duration: IrDuration; target?: 'self' | 'chosenControllerLeaderOrCharacter'; filter?: { typeIncludes?: string }; blockerPowerAtLeast?: number }
  | { fn: 'drawAndTrash'; drawCount: number; trashCount: number }
  | { fn: 'trashFromHand'; count: number }
  | { fn: 'optionalTrashFromHand'; count: number }
  | { fn: 'trashFromOpponentHandChosenByOpponent'; count: number }
  | { fn: 'trashTopDeck'; count: number }
  | { fn: 'optionalTakeLifeTopOrBottomToHand' }
  | { fn: 'addDeckTopToLifeTop' }
  | { fn: 'optionalAddDeckTopToLifeTop' }
  | { fn: 'playFromHand'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'playFromDeck'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'moveFromTrashToHand'; filter: SearchFilter; maxTargets?: number }
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
  | { fn: 'koImmunitySelf'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition }
  | { fn: 'koImmunityControllerCharactersAll'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition }
  // Grant K.O. immunity to the card chosen by the immediately preceding function (var 't').
  | { fn: 'koImmunityChosen'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration }
  // Trash exactly `count` cards of a given type from your hand (used to pay a typed hand cost).
  | { fn: 'trashTypeFromHand'; count: number; filter: { typeIncludes?: string } }
  // Trash the top `count` of the opponent's Life cards ("Trash up to N of your opponent's Life cards").
  | { fn: 'trashOpponentLife'; count: number };

export type SequencedAbilityFunction = AbilityFunction & {
  /** Gate this function on the prior function result, for "if you do" wording. */
  ifPrevious?: SequenceCondition;
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
