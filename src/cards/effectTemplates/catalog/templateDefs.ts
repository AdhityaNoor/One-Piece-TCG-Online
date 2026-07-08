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
  CharacterMoveFilter,
  SearchFilter,
  SearchPickDestination,
  SearchRemainderDestination,
  SequenceCondition,
} from '../../../engine/effects/effectIr';
import type { ContinuousKeyword, PowerScaleSource, SourceStateCondition } from '../../../engine/state/game';
import type { Color } from '../../../engine/state/card';

export const TEMPLATE_IDS = {
  ABILITY: 'ability',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

export type MoveCardSource =
  | { zone: 'life'; player: 'controller' | 'opponent'; position: 'top' | 'bottom' | 'topOrBottom'; hiddenChoice?: boolean; count?: number; untilLife?: number }
  | { zone: 'deck'; player: 'controller'; position: 'top'; count?: number }
  | { zone: 'hand'; player: 'controller' | 'opponent'; filter?: SearchFilter }
  | { zone: 'trash'; player: 'controller' | 'opponent'; filter?: SearchFilter }
  | { zone: 'characters'; player: 'controller' | 'opponent' | 'any'; filter?: CharacterMoveFilter }
  | { zone: 'stages'; player: 'controller' | 'opponent' | 'any'; filter?: { maxCost?: number } };

export type MoveCardDestination =
  | { zone: 'hand'; player: 'owner' }
  | { zone: 'life'; player: 'owner' | 'controller'; position: 'top' | 'topOrBottom'; faceUp?: boolean }
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
  /** Target must have at least N DON!! cards given (attached). */
  minDonAttached?: number;
  /** When set, maxCost is resolved as the opponent's current Life count at selection time. */
  maxCostFromOpponentLife?: boolean;
  /** When set, maxCost is resolved as the combined Life count of both players at selection time. */
  maxCostFromCombinedLife?: boolean;
  /** In-play target must have no base effect (2-8-5): vanilla / keywords only, no [Trigger]. */
  noBaseEffect?: boolean;
  /** Exclude cards with this exact printed name ("other than [X]"). */
  excludeName?: string;
  /** For leaderOrCharacters union: include opponent Leader only when rested/active matches. */
  restedLeader?: boolean;
}

export type TargetSpec =
  | { ref: 'self' }
  | { ref: 'previous' }
  | { ref: 'battleOpponent' }
  | { group: 'leader'; player: 'controller' }
  | { group: 'leader'; player: 'opponent'; filter?: { rested?: boolean } }
  | { group: 'characters'; player: 'controller' | 'opponent' | 'any'; filter?: TargetFilter }
  | { group: 'charactersOrDon'; player: 'opponent'; filter?: { maxCost?: number } }
  | { group: 'leaderOrCharacters'; player: 'controller' | 'opponent'; filter?: TargetFilter };

export type AbilityFunction =
  | { fn: 'draw'; amount: number; optional?: boolean; player?: 'controller' | 'opponent' }
  | { fn: 'addDonFromDeck'; count: number; rested: boolean }
  | { fn: 'giveDon'; count: number; optional?: boolean; targetTypeIncludes?: string; charactersOnly?: boolean; targetName?: string; activeDonOnly?: boolean }
  | { fn: 'preventBlockersOnPreviousTarget'; duration: IrDuration }
  | { fn: 'preventAttackLeaderWhileSummoningSick'; duration: IrDuration }
  | { fn: 'giveGivenDon'; count?: number; optional?: boolean; targetTypeIncludes?: string }
  | { fn: 'ko'; target: TargetSpec; optional?: boolean; maxTargets?: number; maxCombinedPower?: number; prompt?: string }
  | { fn: 'rest'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'preventRefresh'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  // "This/these Character(s) cannot attack" for the given duration (e.g. "until the end of your opponent's next turn" -> duration: 'endOfOpponentsTurn').
  | { fn: 'preventAttack'; target: TargetSpec; duration: IrDuration; forbiddenTarget?: 'leader'; forbiddenTargetFilter?: { zone?: 'leader' | 'character'; maxBaseCost?: number; minBaseCost?: number; maxCost?: number; minCost?: number; excludeName?: string }; attackUnlessGate?: AbilityGate[]; condition?: IrCondition; optional?: boolean; maxTargets?: number; prompt?: string }
  // Player-wide attack restriction without a target choice (e.g. "you cannot attack a Leader during this turn").
  | { fn: 'preventAttackAll'; duration: IrDuration; forbiddenTarget?: 'leader' }
  | { fn: 'setForcedAttackTarget'; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition }
  | { fn: 'preventRest'; target: TargetSpec; duration: IrDuration; optional?: boolean; maxTargets?: number; prompt?: string; effectSourceController?: 'opponent' | 'controller'; condition?: IrCondition }
  | { fn: 'negateEffect'; target: TargetSpec; duration: IrDuration; negatedTimings?: IrTiming[]; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'negateControllerEffects'; player: 'controller' | 'opponent'; duration: IrDuration; negatedTimings?: IrTiming[] }
  | { fn: 'addCost'; target: TargetSpec; amount: number; duration?: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'addPower'; target: TargetSpec; amount: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  // "This card's / your Leader's base power BECOMES N" (2-6): a SET (overwrite), not a +/− delta.
  // Additive power modifiers still stack on top of the set value. Fixed value only — "becomes the
  // same as X" (dynamic) is intentionally out of scope.
  | { fn: 'setBasePower'; target: TargetSpec; value: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  // "This card's base cost BECOMES N" (2-7): a SET (overwrite). Additive cost deltas still stack.
  | { fn: 'setBaseCost'; target: TargetSpec; value: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'addKeyword'; target: TargetSpec; keyword: ContinuousKeyword; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  // Aura: grant a keyword to the controller's own Leader + Characters (optionally name/type-filtered).
  | { fn: 'addKeywordAuraControllerTypes'; keyword: ContinuousKeyword; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Aura: grant a keyword to ALL of the controller's Characters (chars only), optionally name/type-filtered.
  | { fn: 'addKeywordAuraControllerCharacters'; keyword: ContinuousKeyword; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  | { fn: 'preventBlockers'; duration: IrDuration; target?: 'self' | 'chosenControllerLeaderOrCharacter'; filter?: { typeIncludes?: string; name?: string; minPower?: number }; blockerPowerAtLeast?: number; powerBonus?: number }
  | { fn: 'suppressBlockerOnTarget'; target: TargetSpec; duration: IrDuration; optional?: boolean; maxTargets?: number }
  | { fn: 'drawAndTrash'; drawCount: number; trashCount: number }
  | { fn: 'drawAndTrashByTypedCharacterCount'; typeIncludes: string }
  | { fn: 'trashFromHand'; count: number }
  | { fn: 'optionalTrashFromHand'; count: number }
  | { fn: 'trashFromOpponentHandChosenByOpponent'; count: number }
  | { fn: 'revealOpponentHand'; count?: number }
  | { fn: 'trashTopDeck'; count: number; optional?: boolean }
  | { fn: 'moveCards'; from: MoveCardSource; to: MoveCardDestination; optional?: boolean; maxTargets?: number; prompt?: string; chooser?: 'controller' | 'opponent' }
  | { fn: 'moveAllCharactersToBottomDeck'; filter?: { maxCost?: number; maxPower?: number; maxBaseCost?: number; maxBasePower?: number } }
  | { fn: 'peekLifeAndPlace'; from: 'controllerOrOpponentTop'; placement: 'topOrBottom' }
  | { fn: 'chooseOne'; chooser: 'controller' | 'opponent'; prompt: string; options: { label: string; functions: SequencedAbilityFunction[] }[] }
  | { fn: 'playFromHand'; filter: SearchFilter; maxTargets?: number; optional?: boolean; rested?: boolean }
  | { fn: 'playFromDeck'; filter: SearchFilter; maxTargets?: number; rested?: boolean }
  | { fn: 'playFromTrash'; filter: SearchFilter; maxTargets?: number; rested?: boolean }
  | { fn: 'triggerPlaySelf' }
  | { fn: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter?: SearchFilter; remainder?: SearchRemainderDestination; rested?: boolean }
  // "Reveal 1 card from the top of your deck. If <filter>, <then>." Reveals the top card
  // (public), leaves it on top, and runs `then` only when the card matches `filter`
  // (omit filter for an unconditional reveal). `then` branch functions must not use
  // their own ifPrevious — the compiler gates every branch op on the reveal result.
  | { fn: 'revealTopThen'; filter?: SearchFilter; then: SequencedAbilityFunction[] }
  // Choose a cost, reveal opponent deck top; if printed cost matches, run `then`.
  | { fn: 'revealOpponentTopIfChosenCostMatches'; costMin?: number; costMax?: number; then: SequencedAbilityFunction[] }
  // Reveal (look at) the top card of the opponent's deck; optional unconditional `then` branch.
  | { fn: 'revealOpponentDeckTop' }
  | { fn: 'addPowerSelf'; amount: number; duration: IrDuration; condition?: IrCondition }
  // Continuous self-buff that scales: +amountPer power for every `step` of `per` (e.g. cards in hand, Events in trash).
  | { fn: 'addPowerSelfScaling'; per: PowerScaleSource; step: number; amountPer: number; duration: IrDuration; condition?: IrCondition }
  | { fn: 'restSelf' }
  // Rest 1 chosen controller Leader/Stage matching a type (for 'You may rest 1 of your {X} Leader or Stage cards:' costs). Binds var 't'.
  | { fn: 'restControllerLeaderOrStage'; typeIncludes?: string }
  // 'You may turn 1 card from the top of your Life cards face-up/down:' cost. Optional flip of the top Life card; binds var 't'.
  | { fn: 'turnTopLifeFace'; faceUp: boolean }
  | { fn: 'turnAllLifeFace'; player?: 'controller' | 'opponent'; faceUp: boolean }
  | { fn: 'lookLifeAndReorder'; player?: 'controller' | 'opponent'; moveOneToDeckTop?: boolean }
  // Set-active family (inverse of rest). Composes the shared `setActive` primitive.
  | { fn: 'setActiveSelf' }
  | { fn: 'setActiveControllerLeader' }
  | { fn: 'setActiveControllerCharacter'; filter?: { minCost?: number; maxCost?: number; exactCost?: number; rested?: boolean; typeIncludes?: string; anyOfTypes?: string[]; name?: string }; maxTargets?: number; optional?: boolean }
  | { fn: 'setActiveControllerDon'; maxTargets: number }
  | { fn: 'setActiveControllerDonAtEndOfTurn'; maxTargets: number }
  | { fn: 'restOpponentDonAtStartOfNextMain'; maxTargets?: number }
  // Rest up to N of the opponent's active DON!! cards (DON!! denial).
  | { fn: 'restOpponentDon'; maxTargets?: number; optional?: boolean }
  // Opponent chooses N DON!! cards from their field and returns them to their DON!! deck.
  | { fn: 'returnOpponentDon'; count: number }
  // Aura: give the controller's own Leader + Characters (optionally type-filtered)
  // a flat power delta, optionally gated on the source card's own state.
  | { fn: 'addPowerAuraControllerTypes'; amount: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Aura: set base power to N for the controller's own Leader + Characters (optionally name/type-filtered).
  | { fn: 'setBasePowerAuraControllerTypes'; value: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Give ALL of the controller's own Characters (optionally type-filtered) a flat power delta —
  // no target choice ("All of your {FILM} type Characters gain +2000").
  | { fn: 'addPowerControllerCharactersAll'; amount: number; duration: IrDuration; filter?: { typeIncludes?: string; maxCost?: number } }
  // Dynamic aura over ALL the controller's Characters (chars only), optionally type-filtered + gated on source state ([DON!! xN]/[Your/Opponent's Turn]).
  | { fn: 'addPowerAuraControllerCharacters'; amount: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; targetCondition?: IrCondition; gate?: AbilityGate[] }
  // Dynamic aura over ALL the opponent's Characters ("give all of your opponent's Characters -N power").
  | { fn: 'addPowerAuraOpponentCharacters'; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Continuous cost aura over ALL the controller's Characters (chars only), optionally type-filtered + gated on source state ("all of your {Navy} Characters gain +2 cost").
  | { fn: 'addCostAuraControllerCharacters'; amount: number; duration: IrDuration; anyOfTypes?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Continuous cost aura over ALL the opponent's Characters ("give all of your opponent's Characters -N cost").
  | { fn: 'addCostAuraOpponentCharacters'; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // "Give this card in your hand −N cost" while the source is on the field (same cardDefinitionId copies in hand).
  | { fn: 'addCostAuraSameCardInHand'; amount: number; duration: IrDuration; gate?: AbilityGate[] }
  // One-shot "next time you play a matching Character from your hand this turn, cost −N".
  | { fn: 'addNextPlayFromHandCostDiscount'; amount: number; filter?: { typeIncludes?: string; minBaseCost?: number } }
  // "This card cannot be K.O.'d" — scope 'battle' (battle K.O. only) or 'any'.
  // `attackerCategory` optionally limits a battle immunity to a given attacker ("by Leaders").
  | { fn: 'koImmunitySelf'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; attackerCategory?: 'leader' | 'character'; attackerAttribute?: string; effectSourceController?: 'opponent' | 'controller'; effectSourceMaxBasePower?: number; effectSourceCategory?: 'leader' | 'character'; effectSourceWithoutAttribute?: string }
  | { fn: 'koImmunityControllerCharactersAll'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition }
  | { fn: 'koImmunityAuraControllerCharacters'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; anyOfTypes?: string[]; excludeSource?: boolean; targetCondition?: IrCondition; sourceCondition?: SourceStateCondition; effectSourceController?: 'opponent' | 'controller' }
  // Grant K.O. immunity to the card chosen by the immediately preceding function (var 't').
  | { fn: 'koImmunityChosen'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration }
  // Register optional K.O. replacement on this card ("would be K.O.'d … instead").
  | { fn: 'registerKoReplacementSelf'; scope?: 'battle' | 'effect' | 'any'; oncePerTurn?: boolean; trashFromHand?: { count: number; filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } }; trashSelf?: true; returnDon?: { count?: number }; restDon?: { count?: number }; lifeToHand?: { position?: 'top' | 'topOrBottom' }; duration: IrDuration }
  // Register optional K.O. replacement aura on ally Characters ("If your {Type} Character would be K.O.'d … trash this Character instead").
  | { fn: 'registerKoReplacementAura'; scope?: 'battle' | 'effect' | 'any'; oncePerTurn?: boolean; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfAttributes?: string[]; charactersOnly?: boolean; excludeSource?: boolean; targetCondition?: IrCondition; sourceCondition?: SourceStateCondition; trashSource?: true; trashFromHand?: { count: number; filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } }; restSource?: true; restCharacter?: true; returnDon?: { count?: number }; restDon?: { count?: number }; lifeToHand?: { position?: 'top' | 'topOrBottom' }; duration: IrDuration }
  // Trash exactly `count` cards of a given type from your hand (used to pay a typed hand cost).
  | { fn: 'trashTypeFromHand'; count: number; filter: SearchFilter; optional?: boolean }
  // K.O. ALL Characters (both players) matching a cost/power filter, no target choice
  // ("K.O. all Characters with a cost of 1 or less").
  | { fn: 'koAllCharacters'; filter?: { maxCost?: number; maxPower?: number } }
  // Give up to `count` rested DON!! to the controller's Leader (no target choice) — "give ... to this Leader".
  | { fn: 'giveDonControllerLeader'; count: number }
  // Give up to `count` rested DON!! to the source card itself.
  | { fn: 'giveDonSelf'; count: number }
  // Give up to `count` DON!! from the opponent's cost area to 1 opponent Character (`restedOnly` when text says "rested DON!!").
  | { fn: 'giveDonFromOpponentCostArea'; count: number; restedOnly?: boolean; optional?: boolean; maxTargets?: number }
  // After choosing an opponent Character (var `t`), give rested DON!! from that card's owner's cost area to their Leader/Character.
  | { fn: 'giveDonFromPreviousTargetOwnerCostArea'; count: number; restedOnly?: boolean; optional?: boolean };

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
