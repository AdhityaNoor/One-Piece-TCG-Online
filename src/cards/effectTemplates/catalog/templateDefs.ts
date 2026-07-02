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

export const TEMPLATE_IDS = {
  ABILITY: 'ability',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

export type AbilityFunction =
  | { fn: 'draw'; amount: number }
  | { fn: 'addDonFromDeck'; count: number; rested: boolean }
  | { fn: 'giveDon'; count: number }
  | { fn: 'koOpponentCharacter'; filter: { maxCost?: number; maxPower?: number } }
  | { fn: 'restOpponentCharacter'; filter: { maxCost?: number; maxPower?: number } }
  | { fn: 'returnToHand'; maxCost: number; target: 'any' | 'opponent' }
  | { fn: 'modifyCostOpponent'; amount: number }
  | { fn: 'modifyPowerOpponent'; amount: number; maxTargets?: number }
  | { fn: 'drawAndTrash'; drawCount: number; trashCount: number }
  | { fn: 'trashFromHand'; count: number }
  | { fn: 'trashTopDeck'; count: number }
  | { fn: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter: SearchFilter; remainder?: SearchRemainderDestination }
  | { fn: 'addPowerSelf'; amount: number; duration: IrDuration; condition?: IrCondition };

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
}

export interface TemplateParamMap {
  ability: AbilityTemplateParams;
}
