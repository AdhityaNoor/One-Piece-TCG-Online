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
import type { ContinuousKeyword, KoReplacementLeaderOrNamedFilter, PowerAuraFilterGroup, PowerScale, PowerScaleSource, SourceStateCondition } from '../../../engine/state/game';
import type { Attribute, CardCategory, Color } from '../../../engine/state/card';

export const TEMPLATE_IDS = {
  ABILITY: 'ability',
  NO_RUNTIME: 'noRuntime',
} as const;

export type TemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS];

export type MoveCardSource =
  | { zone: 'life'; player: 'controller' | 'opponent'; position: 'top' | 'bottom' | 'topOrBottom'; hiddenChoice?: boolean; count?: number; untilLife?: number }
  | { zone: 'deck'; player: 'controller'; position: 'top'; count?: number }
  | { zone: 'hand'; player: 'controller' | 'opponent'; filter?: SearchFilter }
  | { zone: 'trash'; player: 'controller' | 'opponent'; filter?: SearchFilter }
  | { zone: 'characters'; player: 'controller' | 'opponent' | 'any'; filter?: CharacterMoveFilter }
  | { zone: 'stages'; player: 'controller' | 'opponent' | 'any'; filter?: { maxCost?: number; exactCost?: number } };

export type MoveCardDestination =
  | { zone: 'hand'; player: 'owner' }
  | { zone: 'life'; player: 'owner' | 'controller'; position: 'top' | 'topOrBottom'; faceUp?: boolean }
  | { zone: 'deck'; player: 'owner'; position: 'bottom' | 'top' | 'topOrBottom' }
  | { zone: 'trash'; player: 'owner' };

export interface TargetFilter {
  /**
   * CURRENT cost/power filters (include continuous modifiers + on-turn DON!! bonus). Use these for
  * card text that says "a cost of N or less" / "N power or less".
  */
  minCost?: number;
  maxCost?: number;
  exactCost?: number;
  maxPower?: number;
  minPower?: number;
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
  hasTrigger?: boolean;
  typeIncludes?: string;
  anyOfTypes?: string[];
  color?: Color;
  name?: string;
  /** Leader/Character attribute gate (2-5), e.g. "<Slash> attribute Character". */
  attribute?: Attribute;
  excludeSelf?: boolean;
  /** Target must have at least N DON!! cards given (attached). */
  minDonAttached?: number;
  /** When set, maxCost is resolved as the opponent's current Life count at selection time. */
  maxCostFromOpponentLife?: boolean;
  /** When set, maxCost is resolved as the combined Life count of both players at selection time. */
  maxCostFromCombinedLife?: boolean;
  /** When set, maxCost is resolved as the controller's current Life count at selection time. */
  maxCostFromSelfLife?: boolean;
  /** When set, maxCost is resolved as the opponent's DON!! cards on field at selection time. */
  maxCostFromOpponentDon?: boolean;
  /** When set, maxCost is resolved as the controller's DON!! cards on field at selection time. */
  maxCostFromSelfDon?: boolean;
  /** In-play target must have no base effect (2-8-5): vanilla / keywords only, no [Trigger]. */
  noBaseEffect?: boolean;
  /** Exclude cards with this exact printed name ("other than [X]"). */
  excludeName?: string;
  /** Exclude cards with any of these exact printed names ("other than [X]"). */
  excludeCardNames?: string[];
  /** For leaderOrCharacters union: include opponent Leader only when rested/active matches. */
  restedLeader?: boolean;
  /** When typeIncludes/anyOfTypes is set on leaderOrCharacters, still include the controller Leader. */
  typeFilterCharactersOnly?: boolean;
  /** Exclude instance ids currently bound in this var (e.g. prior chooseTargets / captureCount). */
  excludeIdsFromVar?: string;
}

export type TargetSpec =
  | { ref: 'self' }
  | { ref: 'previous' }
  | { ref: 'battleOpponent' }
  | { ref: 'eventPlayedCharacter' }
  | { group: 'union'; targets: TargetSpec[] }
  | { group: 'leader'; player: 'controller' }
  | { group: 'leader'; player: 'opponent'; filter?: { rested?: boolean } }
  | { group: 'leaderOrStages'; player: 'controller'; filter?: { typeIncludes?: string; name?: string } }
  | { group: 'characters'; player: 'controller' | 'opponent' | 'any'; filter?: TargetFilter }
  | { group: 'don'; player: 'controller' | 'opponent'; filter?: { rested?: boolean } }
  | { group: 'charactersOrDon'; player: 'opponent'; filter?: { maxCost?: number } }
  | { group: 'charactersOrStages'; player: 'controller' | 'opponent' | 'any'; filter?: TargetFilter }
  | { group: 'leaderOrCharacters'; player: 'controller' | 'opponent'; filter?: TargetFilter };

export type AbilityFunction =
  | { fn: 'draw'; amount: number; optional?: boolean; player?: 'controller' | 'opponent' }
  | { fn: 'drawUntilHandCount'; targetCount: number; player?: 'controller' | 'opponent' }
  | { fn: 'addDonFromDeck'; count: number; rested: boolean }
  | { fn: 'giveDon'; count: number; optional?: boolean; targetTypeIncludes?: string; anyOfTypes?: string[]; charactersOnly?: boolean; targetName?: string; targetFilter?: TargetFilter; maxTargets?: number; activeDonOnly?: boolean; skipRestedDonGate?: boolean }
  | { fn: 'preventBlockersOnPreviousTarget'; duration: IrDuration }
  | { fn: 'preventAttackLeaderWhileSummoningSick'; duration: IrDuration }
  | { fn: 'giveGivenDon'; count?: number; optional?: boolean; targetTypeIncludes?: string }
  | { fn: 'ko'; target: TargetSpec; optional?: boolean; maxTargets?: number; maxCombinedPower?: number; prompt?: string }
  | { fn: 'rest'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'restAllCharacters'; player?: 'any' | 'controller' | 'opponent'; filter?: CharacterMoveFilter }
  | { fn: 'preventRefresh'; target: TargetSpec; duration?: IrDuration; optional?: boolean; maxTargets?: number; prompt?: string; maxCost?: number }
  // "This/these Character(s) cannot attack" for the given duration (e.g. "until the end of your opponent's next turn" -> duration: 'endOfOpponentsTurn').
  | { fn: 'preventAttack'; target: TargetSpec; duration: IrDuration; forbiddenTarget?: 'leader'; forbiddenTargetFilter?: { zone?: 'leader' | 'character'; maxBaseCost?: number; minBaseCost?: number; maxCost?: number; minCost?: number; excludeName?: string }; attackUnlessGate?: AbilityGate[]; condition?: IrCondition; optional?: boolean; maxTargets?: number; prompt?: string }
  // Player-wide attack restriction without a target choice (e.g. "you cannot attack a Leader during this turn").
  | { fn: 'preventAttackAll'; duration: IrDuration; forbiddenTarget?: 'leader' }
  | { fn: 'setForcedAttackTarget'; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition }
  | { fn: 'redirectAttackTarget'; target: TargetSpec; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'swapBasePower'; target: TargetSpec; duration: IrDuration; minTargets?: number; maxTargets?: number; swapKind?: 'anyTwo' | 'leaderAndCharacter'; prompt?: string }
  | { fn: 'preventRest'; target: TargetSpec; duration: IrDuration; optional?: boolean; maxTargets?: number; prompt?: string; effectSourceController?: 'opponent' | 'controller'; condition?: IrCondition }
  // "This Character/Stage cannot be removed from the field by [opponent's] effects" — blocks
  // effect K.O., return-to-hand, and bottom-of-deck placement in one check. Never blocks battle K.O.
  | { fn: 'preventFieldRemoval'; target: TargetSpec; duration: IrDuration; effectSourceController?: 'opponent' | 'controller'; condition?: IrCondition }
  | { fn: 'preventFieldRemovalAuraControllerCharacters'; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfColors?: Color[]; targetCondition?: IrCondition; gate?: AbilityGate[]; effectSourceController?: 'opponent' | 'controller' }
  | { fn: 'negateEffect'; target: TargetSpec; duration: IrDuration; negatedTimings?: IrTiming[]; optional?: boolean; maxTargets?: number; prompt?: string }
  | { fn: 'negateControllerEffects'; player: 'controller' | 'opponent'; duration: IrDuration; negatedTimings?: IrTiming[]; appliesToCategories?: Exclude<CardCategory, 'don'>[]; exceptTypeIncludes?: string }
  // "You cannot add Life cards to your hand using your own effects" for the controller (or opponent).
  | { fn: 'preventControllerLifeToHand'; duration: IrDuration; player?: 'controller' | 'opponent' }
  // "You cannot play Character cards [matching filter] this turn" for the controller (or opponent).
  | { fn: 'preventControllerCharacterPlay'; duration: IrDuration; player?: 'controller' | 'opponent'; minBaseCost?: number; maxBaseCost?: number }
  | { fn: 'preventControllerHandPlay'; duration: IrDuration; player?: 'controller' | 'opponent' }
  | { fn: 'preventControllerCharacterSetActiveDon'; duration: IrDuration; player?: 'controller' | 'opponent' }
  | { fn: 'addCost'; target: TargetSpec; amount: number; duration?: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; scale?: PowerScale; prompt?: string }
  | { fn: 'addPower'; target: TargetSpec; amount: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; scale?: PowerScale; amountPer?: number; amountPerStep?: number; countVar?: string; prompt?: string }
  // "This card's / your Leader's base power BECOMES N" (2-6): a SET (overwrite), not a +/− delta.
  // Additive power modifiers still stack on top of the set value.
  | { fn: 'setBasePower'; target: TargetSpec; value: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'setBasePowerFromSource'; target: TargetSpec; source: TargetSpec; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  // "This card's base cost BECOMES N" (2-7): a SET (overwrite). Additive cost deltas still stack.
  | { fn: 'setBaseCost'; target: TargetSpec; value: number; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  | { fn: 'addKeyword'; target: TargetSpec; keyword: ContinuousKeyword; duration: IrDuration; optional?: boolean; maxTargets?: number; condition?: IrCondition; prompt?: string }
  // Aura: grant a keyword to the controller's own Leader + Characters (optionally name/type-filtered).
  | { fn: 'addKeywordAuraControllerTypes'; keyword: ContinuousKeyword; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Aura: grant a keyword to ALL of the controller's Characters (chars only), optionally name/type-filtered.
  | { fn: 'addKeywordAuraControllerCharacters'; keyword: ContinuousKeyword; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfColors?: Color[]; excludeSource?: boolean; sourceCondition?: SourceStateCondition; targetCondition?: IrCondition; gate?: AbilityGate[] }
  | { fn: 'preventBlockers'; duration: IrDuration; target?: 'self' | 'controllerLeader' | 'chosenControllerLeaderOrCharacter'; filter?: { typeIncludes?: string; name?: string; minPower?: number }; blockerPowerAtLeast?: number; blockerPowerAtMost?: number; blockerMaxCost?: number; powerBonus?: number }
  | { fn: 'suppressBlockerOnTarget'; target: TargetSpec; duration: IrDuration; optional?: boolean; maxTargets?: number }
  | { fn: 'drawAndTrash'; drawCount: number; trashCount: number }
  | { fn: 'drawAndTrashByTypedCharacterCount'; typeIncludes: string }
  | { fn: 'trashFromHand'; count: number }
  | { fn: 'optionalTrashFromHand'; count?: number; anyNumber?: true; filter?: SearchFilter }
  | { fn: 'trashFromOpponentHandChosenByOpponent'; count: number }
  | { fn: 'revealOpponentHand'; count?: number }
  | { fn: 'trashTopDeck'; count?: number; countVar?: string; optional?: boolean }
  | { fn: 'trashSelf' }
  | { fn: 'returnSelfToHand' }
  | { fn: 'moveSelfToBottomDeck' }
  | { fn: 'moveCards'; from: MoveCardSource; to: MoveCardDestination; optional?: boolean; minTargets?: number; maxTargets?: number; prompt?: string; chooser?: 'controller' | 'opponent' }
  | { fn: 'movePreviousSelection'; to: MoveCardDestination; varName?: string }
  | { fn: 'moveAllCards'; from: Extract<MoveCardSource, { zone: 'characters' | 'stages' }>; to: MoveCardDestination }
  | { fn: 'moveAllCharactersToBottomDeck'; filter?: { maxCost?: number; maxPower?: number; maxBaseCost?: number; maxBasePower?: number } }
  | { fn: 'peekLifeAndPlace'; from: 'controllerOrOpponentTop'; placement: 'topOrBottom' }
  | { fn: 'chooseOne'; chooser: 'controller' | 'opponent'; prompt: string; options: { label: string; functions: SequencedAbilityFunction[] }[] }
  | { fn: 'playFromHand'; filter?: SearchFilter; fromVar?: string; maxTargets?: number; minTargets?: number; optional?: boolean; rested?: boolean; player?: 'controller' | 'opponent'; chooser?: 'controller' | 'opponent'; distinctNames?: boolean; prompt?: string }
  | { fn: 'activateEventFromHand'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'activateEventFromTrash'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'playFromDeck'; filter: SearchFilter; maxTargets?: number; rested?: boolean }
  // "At the start of the game, play up to N matching Stage cards from your deck" (5-2-1-5-1, e.g. Imu/OP13-079).
  | { fn: 'playStageFromDeck'; filter: SearchFilter; maxTargets?: number }
  | { fn: 'playFromTrash'; filter?: SearchFilter; fromVar?: string; maxTargets?: number; rested?: boolean; distinctNames?: boolean; prompt?: string }
  /**
   * Choose up to 1 card matching each pick filter from trash (distinct), then if 2 were
   * chosen pick which enters rested and play the other active; a lone pick plays active.
   */
  | { fn: 'playPairOneRested'; zone: 'trash'; picks: [{ filter: SearchFilter; prompt?: string }, { filter: SearchFilter; prompt?: string }] }
  | { fn: 'playSelfFromTrash' }
  | { fn: 'triggerPlaySelf' }
  | { fn: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter?: SearchFilter; remainder?: SearchRemainderDestination; rested?: boolean }
  | { fn: 'searchDeck'; pick: number; reveal: boolean; destination: Extract<SearchPickDestination, 'hand'>; filter?: SearchFilter }
  // "Reveal 1 card from the top of your deck. If <filter>, <then>." Reveals the top card
  // (public), leaves it on top, and runs `then` only when the card matches `filter`
  // (omit filter for an unconditional reveal). `then` branch functions must not use
  // their own ifPrevious — the compiler gates every branch op on the reveal result.
  | { fn: 'revealTopThen'; filter?: SearchFilter; then: SequencedAbilityFunction[] }
  // "Reveal 1 card from the top of your Life cards. If <filter>, you may play that
  // card; if you do, <then>." Reveals the top Life card (public), and — only when it
  // matches `filter` — offers to play it from Life for no cost, then runs the `then`
  // branch when the card was actually played. `then` functions must not carry their
  // own ifPrevious; the compiler gates them on the play result.
  | { fn: 'revealTopLifePlay'; filter?: SearchFilter; rested?: boolean; then?: SequencedAbilityFunction[] }
  // Choose a cost, reveal opponent deck top; if printed cost matches, run `then`.
  | { fn: 'revealOpponentTopIfChosenCostMatches'; costMin?: number; costMax?: number; then: SequencedAbilityFunction[] }
  // Reveal (look at) the top card of the opponent's deck; optional unconditional `then` branch.
  | { fn: 'revealOpponentDeckTop' }
  | { fn: 'addPowerSelf'; amount: number; duration: IrDuration; condition?: IrCondition }
  | { fn: 'addPowerSelfPerPreviousTrashed'; amountPer: number; duration: IrDuration; countVar?: string; ifPrevious?: SequenceCondition }
  // Snapshot the count of the previous variable-count selection (var `from`, default 't')
  // into a stable var `into`, so a LATER buff whose own target selection reuses `t` does
  // not clobber it. Pair with `addPower ... countVar: <into>, amountPer: N` for "<recipient>
  // gains +N for every returned/K.O.'d Character" (e.g. P-059).
  | { fn: 'captureCount'; from?: string; into: string }
  // Continuous self-buff that scales: +amountPer power for every `step` of `per` (e.g. cards in hand, Events in trash).
  | { fn: 'addPowerSelfScaling'; per: PowerScaleSource; step: number; amountPer: number; duration: IrDuration; condition?: IrCondition }
  | { fn: 'restSelf' }
  // Rest 1 chosen controller Leader/Stage matching a type (for 'You may rest 1 of your {X} Leader or Stage cards:' costs). Binds var 't'.
  | { fn: 'restControllerLeaderOrStage'; typeIncludes?: string }
  // 'You may turn N cards from the top of your Life cards face-up/down:' cost. Optional flip of the top Life card(s); binds var 't'.
  | { fn: 'turnTopLifeFace'; faceUp: boolean; count?: number; fromFaceUp?: true }
  | { fn: 'turnAllLifeFace'; player?: 'controller' | 'opponent'; faceUp: boolean }
  | { fn: 'lookLifeAndReorder'; player?: 'controller' | 'opponent'; moveOneToDeckTop?: boolean }
  // Set-active family (inverse of rest). Composes the shared `setActive` primitive.
  | { fn: 'setActiveSelf' }
  | { fn: 'setActiveControllerLeader' }
  | { fn: 'setActiveControllerLeaderOrCharacter'; filter?: { minCost?: number; maxCost?: number; exactCost?: number; minPower?: number; maxPower?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; typeIncludes?: string; anyOfTypes?: string[]; name?: string; excludeCardNames?: string[]; color?: Color }; maxTargets?: number; optional?: boolean }
  | { fn: 'setActiveControllerCharacters'; filter?: { minCost?: number; maxCost?: number; exactCost?: number; minBaseCost?: number; maxBaseCost?: number; exactBaseCost?: number; minPower?: number; maxPower?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; rested?: boolean; typeIncludes?: string; anyOfTypes?: string[]; name?: string; excludeCardNames?: string[]; color?: Color; attribute?: Attribute } }
  | { fn: 'setActiveControllerCharacter'; filter?: { minCost?: number; maxCost?: number; exactCost?: number; minBaseCost?: number; maxBaseCost?: number; exactBaseCost?: number; minPower?: number; maxPower?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; rested?: boolean; typeIncludes?: string; anyOfTypes?: string[]; name?: string; excludeCardNames?: string[]; color?: Color; attribute?: Attribute }; maxTargets?: number; optional?: boolean }
  | { fn: 'setActiveControllerDon'; maxTargets: number }
  | { fn: 'setActiveControllerDonAtEndOfTurn'; maxTargets: number }
  | { fn: 'restOpponentDonAtStartOfNextMain'; maxTargets?: number }
  | { fn: 'trashSelfAtEndOfTurn' }
  | { fn: 'moveSelfToBottomDeckAtEndOfBattle' }
  | { fn: 'moveBattleOpponentToBottomDeckAtEndOfBattle'; maxCost?: number }
  | { fn: 'movePreviousMovedToBottomDeckAtEndOfTurn'; ifPrevious?: SequenceCondition }
  | { fn: 'trashControllerCharacterAtEndOfTurn'; filter?: { typeIncludes?: string } }
  | { fn: 'returnDonToMatchOpponentAtEndOfTurn' }
  | { fn: 'moveDeckTopToLifeAtEndOfTurn'; gates?: AbilityGate[]; ifPrevious?: SequenceCondition }
  | { fn: 'trashHandDownTo'; handSize: number; player?: 'controller' | 'opponent' }
  | { fn: 'trashFaceUpLife' }
  | { fn: 'returnSelfToHandAtEndOfTurn'; ifPrevious?: SequenceCondition }
  | { fn: 'preventRefreshOnGivenCharacterAtEndOfTurn'; minDonAttached: number; requireRested?: boolean; ifPrevious?: SequenceCondition }
  | { fn: 'preventRefreshOnCharactersCostAtMost'; maxCost: number; activationGate?: AbilityGate[] }
  // Optional reveal-from-hand payment (card stays in hand; gates subsequent steps via ifPrevious).
  | { fn: 'optionalRevealTypeFromHand'; filter?: SearchFilter; prompt?: string; count?: number; upTo?: boolean; then?: SequencedAbilityFunction[] }
  // Rest up to N of the opponent's active DON!! cards (DON!! denial).
  | { fn: 'restOpponentDon'; maxTargets?: number; optional?: boolean }
  // Rest up to N of the controller's active DON!! cards (optional effect-chain payment).
  | { fn: 'restControllerDon'; maxTargets?: number; optional?: boolean }
  // Rest N of your active cards (Leader/Characters/Stage/DON!!) as an effect-chain payment.
  | { fn: 'restControllerCards'; count: number; optional?: boolean }
  // Controller may return 1+ DON!! from field to DON!! deck (optional; gates subsequent steps via ifPrevious).
  | { fn: 'optionalReturnControllerDon'; maxTargets?: number }
  // Opponent chooses N DON!! cards from their field and returns them to their DON!! deck.
  | { fn: 'returnOpponentDon'; count: number; activeOnly?: boolean }
  // Aura: give the controller's own Leader + Characters (optionally type-filtered)
  // a flat power delta, optionally gated on the source card's own state.
  | { fn: 'addPowerAuraControllerTypes'; amount: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfGroups?: PowerAuraFilterGroup[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Aura: set base power to N for the controller's own Leader + Characters (optionally name/type-filtered).
  | { fn: 'setBasePowerAuraControllerTypes'; value: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Give ALL of the controller's own Characters (optionally type-filtered) a flat power delta —
  // no target choice ("All of your {FILM} type Characters gain +2000").
  | { fn: 'addPowerControllerCharactersAll'; amount: number; duration: IrDuration; filter?: { typeIncludes?: string; maxCost?: number } }
  // Dynamic aura over ALL the controller's Characters (chars only), optionally type-filtered + gated on source state ([DON!! xN]/[Your/Opponent's Turn]).
  | { fn: 'addPowerAuraControllerCharacters'; amount: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfGroups?: PowerAuraFilterGroup[]; sourceCondition?: SourceStateCondition; targetCondition?: IrCondition; gate?: AbilityGate[]; scale?: PowerScale }
  // Dynamic aura over ALL the opponent's Characters ("give all of your opponent's Characters -N power").
  | { fn: 'addPowerAuraOpponentCharacters'; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // Continuous cost aura over ALL the controller's Characters (chars only), optionally type-filtered + gated on source state ("all of your {Navy} Characters gain +2 cost").
  | { fn: 'addCostAuraControllerCharacters'; amount: number; duration: IrDuration; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfColors?: Color[]; minBaseCost?: number; maxBaseCost?: number; sourceCondition?: SourceStateCondition; gate?: AbilityGate[]; scale?: PowerScale }
  // Continuous cost aura over cards in the controller's hand, optionally filtered by category/color/type/name/base cost.
  | { fn: 'addCostAuraControllerHandCards'; amount: number; duration: IrDuration; filter?: { category?: Exclude<CardCategory, 'don'>; color?: Color; typeIncludes?: string; anyOfTypes?: string[]; anyOfNames?: string[]; minBaseCost?: number; maxBaseCost?: number }; sourceCondition?: SourceStateCondition; gate?: AbilityGate[]; scale?: PowerScale }
  // Continuous cost aura over ALL the opponent's Characters ("give all of your opponent's Characters -N cost").
  | { fn: 'addCostAuraOpponentCharacters'; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; gate?: AbilityGate[] }
  // "Give this card in your hand −N cost" while the source is on the field (same cardDefinitionId copies in hand).
  | { fn: 'addCostAuraSameCardInHand'; amount: number; duration: IrDuration; gate?: AbilityGate[] }
  // One-shot "next time you play a matching Character from your hand this turn, cost −N".
  | { fn: 'addNextPlayFromHandCostDiscount'; amount: number; filter?: { typeIncludes?: string; name?: string; anyOfNames?: string[]; minBaseCost?: number; maxBaseCost?: number } }
  // "This card cannot be K.O.'d" — scope 'battle' (battle K.O. only) or 'any'.
  // `attackerCategory` optionally limits a battle immunity to a given attacker ("by Leaders").
  | { fn: 'koImmunitySelf'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; attackerCategory?: 'leader' | 'character'; attackerAttribute?: string; effectSourceController?: 'opponent' | 'controller'; effectSourceMaxBasePower?: number; effectSourceCategory?: 'leader' | 'character'; effectSourceWithoutAttribute?: string }
  | { fn: 'koImmunityControllerCharactersAll'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition }
  | { fn: 'koImmunityAuraControllerCharacters'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; anyOfTypes?: string[]; excludeSource?: boolean; targetCondition?: IrCondition; sourceCondition?: SourceStateCondition; effectSourceController?: 'opponent' | 'controller' }
  // Grant K.O. immunity to the card chosen by the immediately preceding function (var 't').
  | { fn: 'koImmunityChosen'; scope: 'battle' | 'effect' | 'any'; duration: IrDuration }
  // Register optional K.O. replacement on this card ("would be K.O.'d … instead").
  | { fn: 'registerKoReplacementSelf'; scope?: 'battle' | 'effect' | 'any'; oncePerTurn?: boolean; replacementTriggers?: ('ko' | 'returnToHand' | 'bottomDeck')[]; effectSourceController?: 'opponent' | 'controller'; activationGate?: AbilityGate[]; sourceCondition?: SourceStateCondition; trashFromHand?: { count: number; filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } }; trashSelf?: true; trashSource?: true; returnSourceToHand?: true; restSource?: true; trashSelfAndDraw?: { amount: number }; giveSelfPowerPenalty?: { amount: number; duration: IrDuration }; giveLeaderPowerPenalty?: { amount: number; duration: IrDuration }; moveTargetToLifeFaceDown?: true; trashLife?: { position?: 'top' | 'bottom' | 'topOrBottom' }; trashTrashToDeckBottom?: { count: number }; turnTopLifeFace?: { faceUp: boolean }; bottomDeckCharacter?: true; restCharacter?: true; restCards?: { count?: number }; restCharacterFilter?: { minCost?: number; excludeSourceName?: boolean; typeIncludes?: string }; returnDon?: { count?: number }; restDon?: { count?: number }; lifeToHand?: { position?: 'top' | 'topOrBottom' }; restLeaderOrNamed?: KoReplacementLeaderOrNamedFilter; duration: IrDuration }
  | { fn: 'registerKoReplacementAura'; scope?: 'battle' | 'effect' | 'any'; oncePerTurn?: boolean; replacementTriggers?: ('ko' | 'returnToHand' | 'bottomDeck')[]; effectSourceController?: 'opponent' | 'controller'; effectSourceCategory?: 'leader' | 'character'; anyOfTypes?: string[]; anyOfNames?: string[]; anyOfAttributes?: string[]; anyOfColors?: Color[]; charactersOnly?: boolean; excludeSource?: boolean; targetCondition?: IrCondition; sourceCondition?: SourceStateCondition; trashSource?: true; returnSourceToHand?: true; trashFromHand?: { count: number; filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } }; restSource?: true; restCharacter?: true; restCards?: { count?: number }; bottomDeckCharacter?: true; trashSelfAndDraw?: { amount: number }; giveSelfPowerPenalty?: { amount: number; duration: IrDuration }; giveLeaderPowerPenalty?: { amount: number; duration: IrDuration }; moveTargetToLifeFaceDown?: true; returnDon?: { count?: number }; restDon?: { count?: number }; lifeToHand?: { position?: 'top' | 'topOrBottom' }; trashTrashToDeckBottom?: { count: number }; turnTopLifeFace?: { faceUp: boolean }; restTargetAndTrashFromHand?: { filter?: { category?: 'character' | 'event' | 'stage'; categories?: ('character' | 'event' | 'stage')[]; maxCurrentPower?: number; minCurrentPower?: number; typeIncludes?: string } }; duration: IrDuration }
  | { fn: 'registerRestReplacementSelf'; oncePerTurn?: boolean; sourceCondition?: SourceStateCondition; effectSourceController?: 'opponent' | 'controller'; effectSourceCategory?: 'leader' | 'character'; duration: IrDuration }
  | { fn: 'setBasePowerFromLeader'; target: TargetSpec; duration: IrDuration; condition?: IrCondition; sourceCondition?: SourceStateCondition }
  | { fn: 'drawByEventCount'; countField: 'handTrashedCount' }
  // Shuffle a player's main deck without moving cards itself.
  | { fn: 'shuffleDeck'; player?: 'controller' | 'opponent' }
  // Return all hand cards to deck, shuffle, then draw equal count (or fixed drawAmount).
  | { fn: 'returnHandShuffleDraw'; player?: 'controller' | 'opponent'; drawAmount?: number }
  // Trash exactly `count` cards of a given type from your hand (used to pay a typed hand cost).
  | { fn: 'trashTypeFromHand'; count: number; filter: SearchFilter; optional?: boolean; anyNumber?: true }
  // K.O. ALL Characters (both players) matching a cost/power filter, no target choice
  // ("K.O. all Characters with a cost of 1 or less").
  | { fn: 'koAllCharacters'; player?: 'any' | 'controller' | 'opponent'; filter?: { maxCost?: number; maxPower?: number; rested?: boolean }; excludeSource?: boolean }
  // Give up to `count` rested DON!! to the controller's Leader (no target choice) — "give ... to this Leader".
  | { fn: 'giveDonControllerLeader'; count: number }
  | { fn: 'giveDonLeaderAndCharacter'; count: number }
  // Give up to `count` rested DON!! to the source card itself.
  | { fn: 'giveDonSelf'; count: number }
  // Give up to `count` DON!! from the opponent's cost area to 1 opponent Character (`restedOnly` when text says "rested DON!!").
  | { fn: 'giveDonFromOpponentCostArea'; count: number; restedOnly?: boolean; optional?: boolean; maxTargets?: number }
  // After choosing an opponent Character (var `t`), give rested DON!! from that card's owner's cost area to their Leader/Character.
  | { fn: 'giveDonFromPreviousTargetOwnerCostArea'; count: number; restedOnly?: boolean; optional?: boolean };

export type SequencedAbilityFunction = AbilityFunction & {
  /** Gate this function on the prior function result, for "if you do" wording. */
  ifPrevious?: SequenceCondition;
  /** Gate this function on any card moved by the prior function having printed cost >= N. */
  ifPreviousMovedAnyCostAtLeast?: number;
  /** Gate this function on the prior selection (var `t`) having CURRENT power ≤ N. */
  ifPreviousSelectedPowerAtMost?: number;
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
  /** Shared OPT bucket across multiple reactive timings on the same source card. */
  oncePerTurnKey?: string;
  /** onStartOfTurn only: player may decline before the ability resolves. */
  optionalActivate?: boolean;
  /** Attacker attribute filter for onBattle / onOpponentsAttack (e.g. 'slash'). */
  battlingOpponentAttribute?: string;
  /** whenAttacking only: battle target must be the opponent's Leader. */
  battleTargetIsOpponentLeader?: boolean;
  /** onBattle only: fire after K.O.'ing an opponent Character in this battle (not at battle start). */
  requiresOpponentKoed?: boolean;
}

export interface TemplateParamMap {
  ability: AbilityTemplateParams;
  noRuntime: Record<string, never>;
}
