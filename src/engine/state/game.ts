/**
 * Top-level game state.
 * Source of truth: Comprehensive Rules, Section 6 "Game Progression",
 * Section 1 "Game Overview", Section 9 "Rule Processing".
 *
 * GameState must be fully JSON-serializable (project ground rule) — no
 * class instances, Map/Set, functions, or undefined values inside it.
 */
import type { CardCategory, CardInstance } from './card';
import type { PlayerState } from './player';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';
import type { RngState } from '../rng/rng';
import type { AbilityGate, AbilityCost, IrTiming } from '../effects/effectIr';

/**
 * 6-1-1. Battle (Section 7) is a Main Phase action, not a 6th phase — see
 * BattleState. 'setup' is NOT one of the 5 turn phases from 6-1-1 — it's the
 * pre-game procedure of Section 5 ("Game Setup"), which happens once, before
 * turn 1's Refresh Phase begins (5-2-1-8). Modeled as a Phase value (rather
 * than a separate state machine outside GameState) so setup actions
 * (CHOOSE_GOING_FIRST, MULLIGAN_DECISION) flow through the exact same
 * validate/execute dispatch pipeline as every other action — see
 * src/engine/setup.
 */
export type Phase = 'setup' | 'refresh' | 'draw' | 'don' | 'main' | 'end';

/** Sub-steps within the 'setup' phase. See src/engine/setup for the reducers. */
export type SetupStage = 'awaitingGoingFirstChoice' | 'awaitingMulliganDecision';

/**
 * Active only while currentPhase === 'setup'; null afterward. Tracks the
 * parts of Comprehensive Rules Section 5 that are genuine player decisions
 * (5-2-1-4/5-2-1-5 going first/second, 5-2-1-6 mulligan) — the purely
 * procedural parts (5-2-1-1 through 5-2-1-3, DON!! deck placement) are not
 * actions and are folded directly into GameState by createPreGameState.
 */
export interface SetupState {
  /**
   * 5-2-1-4: whichever player won Rock-Paper-Scissors-or-similar and gets to
   * decide whether THEY go first or second. The RPS-or-similar mechanism
   * itself is explicitly out of the engine's scope (5-2-1-4-1: "No
   * intervention of any kind is allowed in the player's decision") — the
   * caller (UI/app layer) resolves that out-of-band and supplies the result
   * here as plain data.
   */
  decidingPlayerId: string;
  stage: SetupStage;
  /** Filled in by executeChooseGoingFirst once 5-2-1-5 resolves. */
  goingFirstPlayerId?: string;
  goingSecondPlayerId?: string;
}

/** 7-1-1 through 7-1-5. */
export type BattleStep = 'attack' | 'block' | 'counter' | 'damage' | 'endOfBattle';

/** Active only while a Battle (6-5-6) is in progress; null otherwise. */
export interface BattleState {
  attackerInstanceId: string;
  /** Leader or Character CardInstance id; re-targeted if [Blocker] activates (7-1-2-1). */
  targetInstanceId: string;
  /** The DECLARE_ATTACK action's original target, kept for log/UI clarity even after a Blocker re-targets (above). */
  originalTargetInstanceId: string;
  step: BattleStep;
  /** [Blocker] used this battle? Capped at one activation (7-1-2-1). */
  blockerUsed: boolean;
  /**
   * Power granted "during this battle" by ACTIVATE_COUNTER_CHARACTER
   * (7-1-3-2-1), keyed by the boosted CardInstance id. A Counter Character's
   * boost target ("1 of your Leader or Character cards") is not necessarily
   * the card currently under attack, so this is tracked per-instance rather
   * than as a single defender bonus. Cleared (the whole BattleState is
   * discarded) at End of Battle (7-1-5) — the duration expires naturally.
   */
  battlePowerBonuses: Record<string, number>;
}

/** 1-2-1-1, 9-2-1, 1-2-3 (concession), 1-2-5 (card-effect win/loss). */
export type GameOverReason = 'lifeDamageAtZero' | 'deckedOut' | 'concession' | 'cardEffect' | 'draw';

/** Duration tags drive expiry in Refresh/End Phase processing (6-2-1, 6-6-1-2, 6-6-1-3, 7-1-5-3). */
export type ContinuousEffectDuration =
  | 'untilStartOfNextTurn'
  | 'endOfTurn'
  | 'endOfOpponentsTurn'
  | 'duringThisTurn'
  | 'duringThisBattle'
  | 'permanent';

/** Gating condition re-evaluated every time the modifier is read (8-3-2, 10-2-x). */
export interface ContinuousPowerCondition {
  /** [DON!! xN]: the card the modifier applies to has >= N DON!! cards attached (6-5-5, 10-2-x). */
  donAttachedAtLeast?: number;
  /** [Your Turn] / [Opponent's Turn] gating, relative to the modifier's owner. */
  turn?: 'your' | 'opponent';
  /** The card the modifier applies to must be rested / active (e.g. "If this Character is rested"). */
  rested?: boolean;
  /** Current cost of the modified card must be at most this value. */
  maxCost?: number;
  /** Printed base cost of the modified card must be at most this value. */
  maxBaseCost?: number;
  /** Printed base cost of the modified card must be at least this value. */
  minBaseCost?: number;
  /** Printed base power of the modified card must be at most this value. */
  maxBasePower?: number;
  /** Printed base power of the modified card must exactly equal this value. */
  exactBasePower?: number;
  /** The modified card must include this color. */
  color?: import('./card').Color;
  /** "If <board state>" gate(s), re-checked on every power read (e.g. "If you have 2 or less Life cards"). */
  gate?: AbilityGate[];
}

/**
 * A dynamic target group for an "aura"/anthem power modifier (e.g. "your
 * {Supernovas}/{Navy} Leaders and Characters gain +1000"). Unlike a single-target
 * modifier, the affected set is resolved at read time, so cards entering play
 * later are covered automatically. Evaluated by computeCurrentPower.
 */
export interface PowerAuraGroup {
  /** The modifier owner's own Leader + Characters. */
  ownLeaderAndCharacters?: true;
  /** Restrict to cards carrying any of these tribal types (OR). Omitted = all. */
  anyOfTypes?: string[];
  /** Restrict to cards whose printed name matches any of these (OR). Includes Leader when ownLeaderAndCharacters is set. */
  anyOfNames?: string[];
  /** Restrict to cards carrying any of these attributes (OR). Leader/Character only. */
  anyOfAttributes?: string[];
  /** Exclude the Leader (chars only) — for "all of your Characters" auras. */
  charactersOnly?: boolean;
  /** Target the OPPONENT's Characters instead of the controller's — for "give all of your opponent's Characters -N". */
  opponentCharacters?: boolean;
  /**
   * Copies of the SOURCE card in the modifier owner's hand ("give this card in your hand −N cost").
   * Requires the source to still be on the field; resolved at read time.
   */
  controllerSameDefinitionInHand?: true;
  /**
   * Character cards in the modifier owner's hand ("the next time you play a {Type} Character from your hand").
   * Optionally filtered by `anyOfTypes`. Does not require the source to remain on field once registered.
   */
  controllerCharactersInHand?: true;
}

/**
 * A gate evaluated against the modifier's SOURCE card (not the buffed card),
 * re-checked on every read. Used by auras whose activation depends on the
 * source's own state, e.g. X.Drake "[Your Turn] If this Character is rested".
 */
export interface SourceStateCondition {
  /** Source must be rested / active. */
  rested?: boolean;
  /** Source has >= N DON!! attached ([DON!! xN]). */
  donAttachedAtLeast?: number;
  /** [Your Turn]/[Opponent's Turn] relative to the source's owner. */
  turn?: 'your' | 'opponent';
}

/** A structured power delta, evaluated by computeCurrentPower. */
/** Count source for a dynamic "+X power for every N of <source>" scaling modifier. */
export type PowerScaleSource = 'controllerHand' | 'controllerTrash' | 'controllerTrashEvents' | 'controllerRestedDon';

/** Dynamic scaling term: effective bonus = floor(count(per) / step) * amountPer, re-read each time. */
export interface PowerScale {
  per: PowerScaleSource;
  step: number;
  amountPer: number;
}

export interface ContinuousPowerModifier {
  /** Single fixed target. Exactly one of appliesToInstanceId / appliesToGroup is set. */
  appliesToInstanceId?: string;
  /** Dynamic aura target set, resolved at read time. */
  appliesToGroup?: PowerAuraGroup;
  /** Signed power delta (can be negative, e.g. "−2000 power"; 1-3-6-1 allows negative power). */
  amount: number;
  /**
   * "This card's/your Leader's base power BECOMES N" (2-6): OVERWRITES the printed base power
   * instead of adding to it. When present, `amount` is ignored for this record; additive
   * `amount`/`scale`/DON!! bonuses from OTHER records still stack on top of the set value.
   * If several applicable set records exist, the LAST-applied one wins (append order =
   * recalculation order, 8-1-3-3-5).
   */
  setBase?: number;
  /** "base power becomes the same as your Leader's base power" — resolved at read time. */
  setBaseFromLeader?: true;
  /** Gate evaluated against the buffed (modified) card. Omitted when unconditional. */
  condition?: ContinuousPowerCondition;
  /** Gate evaluated against the SOURCE card. Omitted when the modifier does not depend on source state. */
  sourceCondition?: SourceStateCondition;
  /** Dynamic "+X for every N" scaling term added to `amount` at read time. */
  scale?: PowerScale;
}

export interface ContinuousCostModifier {
  /** Single fixed target. Exactly one of appliesToInstanceId / appliesToGroup is set. */
  appliesToInstanceId?: string;
  /**
   * Dynamic aura target set, resolved at read time (e.g. "all of your {Navy} Characters
   * gain +2 cost", "give all of your opponent's Characters −1 cost"). Reuses PowerAuraGroup.
   */
  appliesToGroup?: PowerAuraGroup;
  /** Signed cost delta; final computed cost is floored at 0. */
  amount: number;
  /**
   * "This card's base cost BECOMES N" (2-7): OVERWRITES the printed base cost instead of adding.
   * When present, `amount` is ignored for this record; additive `amount` deltas from OTHER
   * records still stack on top. Last-applied set wins. Final cost is still floored at 0.
   */
  setBase?: number;
  /** Gate evaluated against the buffed (modified) card. Omitted when the modifier is unconditional. */
  condition?: ContinuousPowerCondition;
  /** Gate evaluated against the SOURCE card. Omitted when the modifier does not depend on source state. */
  sourceCondition?: SourceStateCondition;
}

/** Prevents some or all [Blocker] activations — either while a specific attacker attacks, or on one Character globally. */
export interface ContinuousBlockerRestriction {
  /** While this Leader/Character is attacking, restrict opponent [Blocker] activations. */
  appliesToAttackerInstanceId?: string;
  /** This Character cannot activate [Blocker] for the record duration (any battle). */
  appliesToBlockerInstanceId?: string;
  /** Omitted for "cannot activate [Blocker]" with no blocker filter (attacker-scoped only). */
  blockerPowerAtLeast?: number;
  /** Restrict only Blocker Characters with current power at or below this value. */
  blockerPowerAtMost?: number;
  /** Restrict only Blocker Characters with current cost at or below this value. */
  blockerMaxCost?: number;
}

/** Prevents the target Leader/Character from declaring an attack (7-1-1-1) while this record is active. */
export interface ContinuousAttackRestriction {
  /** Single fixed attacker. Omitted when `appliesToControllerId` is set. */
  appliesToInstanceId?: string;
  /** All Leaders/Characters controlled by this player. Omitted when `appliesToInstanceId` is set. */
  appliesToControllerId?: string;
  /** Omitted = cannot declare any attack. 'leader' = may attack Characters but not the opponent Leader. */
  forbiddenTarget?: 'leader';
  /** Partial target ban: forbid attacks into matching opponent Leaders/Characters only. */
  forbiddenTargetFilter?: ForbiddenAttackTargetFilter;
  /** With `forbiddenTarget`, only while the attacker still has summoning sickness. */
  whileSummoningSick?: boolean;
  /** Re-evaluated gate: when it fails, the card cannot attack ("cannot attack unless …"). */
  attackUnlessGate?: AbilityGate[];
  /** Re-evaluated condition on the restricted card (e.g. "if you have 5+ cards in hand, cannot attack"). */
  condition?: ContinuousPowerCondition;
}

/** While active, the opponent may only attack this specific Character as their target. */
export interface ContinuousForcedAttackTargetModifier {
  appliesToInstanceId: string;
  sourceCondition?: SourceStateCondition;
  condition?: ContinuousPowerCondition;
}

/** Partial attack-target filter for "cannot attack … Characters with …" restrictions. */
export interface ForbiddenAttackTargetFilter {
  zone?: 'leader' | 'character';
  maxBaseCost?: number;
  minBaseCost?: number;
  maxCost?: number;
  minCost?: number;
  excludeName?: string;
}

/** Prevents a Leader/Character from being rested by card effects while this record is active. */
export interface ContinuousRestRestriction {
  appliesToInstanceId: string;
  /** Omitted = any effect source. Otherwise relative to the protected card's owner. */
  effectSourceController?: 'opponent' | 'controller';
  /** Re-evaluated condition on the protected card (e.g. rested-DON count + leader attribute). */
  condition?: ContinuousPowerCondition;
}

/**
 * `'canAttackActive'`: "This Leader/Character can also attack active Characters" —
 * relaxes the normal 7-1-1-2 restriction (only the opponent's Leader or a RESTED
 * Character may be attacked) for the granted instance's own attacks.
 *
 * `'canAttackCharactersWhileSummoningSick'`: "can attack Characters on the turn
 * in which they are played" — bypasses summoning sickness only when the declared
 * target is an opponent Character, not when attacking a Leader.
 */
export type ContinuousKeyword = 'rush' | 'blocker' | 'doubleAttack' | 'banish' | 'unblockable' | 'canAttackActive' | 'canAttackCharactersWhileSummoningSick';

/** A structured keyword grant applied to one instance or a dynamic aura group, with optional dynamic conditions. */
export interface ContinuousKeywordModifier {
  /** Single fixed target. Exactly one of appliesToInstanceId / appliesToGroup is set. */
  appliesToInstanceId?: string;
  /** Dynamic aura target set, resolved at read time (Leader + Characters or chars only). */
  appliesToGroup?: PowerAuraGroup;
  keyword: ContinuousKeyword;
  /** Gate evaluated against the buffed (modified) card. Omitted when the grant is unconditional. */
  condition?: ContinuousPowerCondition;
  /** Gate evaluated against the SOURCE card. Omitted when the grant does not depend on source state. */
  sourceCondition?: SourceStateCondition;
}

/**
 * Grants "this card cannot be K.O.'d" to one instance (re-evaluated on every K.O.
 * attempt). `scope` distinguishes "cannot be K.O.'d in battle" (7-1-4-2 only) from
 * "cannot be K.O.'d" by any source (battle or card effect).
 */
export type KoImmunityAuraGroup = PowerAuraGroup & { excludeSource?: true };

export interface ContinuousKoImmunityModifier {
  /** Single fixed target. Exactly one of appliesToInstanceId / appliesToGroup is set. */
  appliesToInstanceId?: string;
  /** Dynamic aura target set, resolved at read time (e.g. "your {Type} Characters with cost ≤N"). */
  appliesToGroup?: KoImmunityAuraGroup;
  scope: 'battle' | 'effect' | 'any';
  /**
   * Restrict a battle immunity to K.O.s dealt by an attacker of this category
   * ("cannot be K.O.'d in battle by Leaders" → 'leader'). Omitted = any attacker.
   */
  attackerCategory?: 'leader' | 'character';
  /** Battle K.O. only: restrict immunity to attackers with this printed attribute. */
  attackerAttribute?: string;
  /** Omitted when the immunity is unconditional. */
  condition?: ContinuousPowerCondition;
  /** Gate evaluated against the SOURCE card (e.g. "If this Character is active/rested"). */
  sourceCondition?: SourceStateCondition;
  /**
   * Effect K.O. only: restrict to K.O.s caused by a card controlled by this player
   * relative to the modifier owner ("by your opponent's effects" → 'opponent').
   */
  effectSourceController?: 'opponent' | 'controller';
  /** Effect K.O. only: the K.O.-ing card must have printed base power at most this value. */
  effectSourceMaxBasePower?: number;
  /** Effect K.O. only: the K.O.-ing card must be of this category. */
  effectSourceCategory?: 'leader' | 'character';
  /** Effect K.O. only: the K.O.-ing card must NOT have this printed attribute. */
  effectSourceWithoutAttribute?: string;
}

/** Hand filter for a K.O. replacement that trashes from hand. */
export interface KoReplacementHandFilter {
  category?: Exclude<CardCategory, 'don' | 'leader'>;
  /** Match if card category is any of these (e.g. Event or Stage). */
  categories?: Exclude<CardCategory, 'don' | 'leader'>[];
  typeIncludes?: string;
  /** Current (live) power, not printed base power. */
  maxCurrentPower?: number;
  minCurrentPower?: number;
}

export type KoReplacementAction =
  | { kind: 'trashFromHand'; count: number; filter?: KoReplacementHandFilter }
  /** Trash the character that would be K.O.'d (self replacement). */
  | { kind: 'trashSelf' }
  /** Trash the aura source character (ally replacement — "trash this Character instead"). */
  | { kind: 'trashSource' }
  /** Return the aura source character to its owner's hand instead of removing the ally. */
  | { kind: 'returnSourceToHand' }
  /** Rest the aura source character instead of the K.O. */
  | { kind: 'restSource' }
  /** Rest one or more of your Characters instead of the K.O. */
  | { kind: 'restCharacter'; count: number }
  /** Place one or more of your Characters at the bottom of the owner's deck instead. */
  | { kind: 'bottomDeckCharacter'; count: number }
  /** Trash this Character and draw N (ally field-removal replacement on aura source). */
  | { kind: 'trashSelfAndDraw'; drawAmount: number }
  /** Trash a Life card (top/bottom) instead of being K.O.'d. */
  | { kind: 'trashLife'; position: 'top' | 'bottom' | 'topOrBottom' }
  /** Place N cards from your trash at the bottom of your deck in chosen order. */
  | { kind: 'trashTrashToDeckBottom'; count: number }
  /** Turn the top Life card face-up/face-down instead of being K.O.'d. */
  | { kind: 'turnTopLifeFace'; faceUp: boolean }
  /** Give the aura source −N power for the duration instead of removing the ally. */
  | { kind: 'giveSelfPowerPenalty'; amount: number; duration: ContinuousEffectDuration }
  /** Give your Leader −N power for the duration instead of removing the ally. */
  | { kind: 'giveLeaderPowerPenalty'; amount: number; duration: ContinuousEffectDuration }
  /** Move the ally that would be removed to the top of your Life face-down instead. */
  | { kind: 'moveTargetToLifeFaceDown' }
  /** Pay structured ability costs (e.g. `{ kind: 'donMinus', count: 1 }`). */
  | { kind: 'payAbilityCosts'; costs: AbilityCost[] }
  /** Add a Life card to hand — same op shape as effect IR `chooseLifeToHand`. */
  | { kind: 'chooseLifeToHand'; position: 'top' | 'topOrBottom' };

/** Which field-removal event a replacement modifier listens for. Omitted = K.O. only (legacy). */
export type KoReplacementTrigger = 'ko' | 'returnToHand' | 'bottomDeck';

/** Aura target group for K.O. replacement on ally Characters. */
export type KoReplacementAuraGroup = PowerAuraGroup & { excludeSource?: true };

/**
 * Optional K.O. replacement registered on a Character ("would be K.O.'d … instead").
 * Exactly one of `appliesToInstanceId` (self) or `appliesToGroup` (aura) is set.
 */
export interface ContinuousKoReplacementModifier {
  appliesToInstanceId?: string;
  appliesToGroup?: KoReplacementAuraGroup;
  scope: 'battle' | 'effect' | 'any';
  oncePerTurn?: boolean;
  /** Events that can trigger this replacement. Defaults to `['ko']` when omitted. */
  replacementTriggers?: KoReplacementTrigger[];
  /** Restrict to removals by opponent/controller-sourced effects. */
  effectSourceController?: 'opponent' | 'controller';
  effectSourceCategory?: 'leader' | 'character';
  /** Board-state gate evaluated when the replacement would fire (e.g. Leader type). */
  activationGate?: AbilityGate[];
  /** Condition on the character that would be K.O.'d. */
  condition?: ContinuousPowerCondition;
  /** Condition on the aura source card (e.g. [Opponent's Turn]). */
  sourceCondition?: SourceStateCondition;
  action: KoReplacementAction;
}

/** "Would be rested by an effect … rest another Character instead." */
export interface ContinuousRestReplacementModifier {
  appliesToInstanceId: string;
  oncePerTurn?: boolean;
  effectSourceController?: 'opponent' | 'controller';
  effectSourceCategory?: 'leader' | 'character';
  sourceCondition?: SourceStateCondition;
  action: { kind: 'restCharacter'; count: number };
}

/** "You cannot add Life cards to your hand using your own effects" (self-sourced Life→hand only). */
export interface ContinuousLifeToHandRestriction {
  appliesToControllerId: string;
}

/** "You cannot play Character cards [matching filter] during this turn." */
export interface ContinuousCharacterPlayRestriction {
  appliesToControllerId: string;
  /** When set, only Characters with base cost >= this value are blocked. */
  minBaseCost?: number;
  /** When set, only Characters with base cost <= this value are blocked. */
  maxBaseCost?: number;
}

/** "You cannot play cards from your hand during this turn." */
export interface ContinuousHandPlayRestriction {
  appliesToControllerId: string;
}

/** "You cannot set DON!! cards as active using Character effects during this turn." */
export interface ContinuousCharacterSetActiveDonRestriction {
  appliesToControllerId: string;
}

/** "Negate the effect(s)" on one instance or all cards controlled by a player. */
export interface ContinuousEffectNegation {
  /** Negate abilities on this Leader/Character/Stage instance. */
  appliesToInstanceId?: string;
  /** Negate abilities on all cards controlled by this player. */
  appliesToControllerId?: string;
  /** Omitted or empty = all timings; otherwise only the listed timings are negated. */
  negatedTimings?: IrTiming[];
}

export interface ContinuousEffectRecord {
  id: string;
  sourceInstanceId: string;
  ownerId: string;
  duration: ContinuousEffectDuration;
  /** Free-text description, for log/debug. */
  description: string;
  /** Structured power delta, when this record modifies power. Omitted for non-power effects. */
  powerModifier?: ContinuousPowerModifier;
  /** Structured cost delta, when this record modifies cost. Omitted for non-cost effects. */
  costModifier?: ContinuousCostModifier;
  /** Structured blocker-activation restriction. Omitted for unrelated continuous effects. */
  blockerRestriction?: ContinuousBlockerRestriction;
  /** Structured attack restriction ("cannot attack"). Omitted for unrelated continuous effects. */
  attackRestriction?: ContinuousAttackRestriction;
  /** Opponent must attack this Character when the modifier is active. Omitted otherwise. */
  forcedAttackTarget?: ContinuousForcedAttackTargetModifier;
  /** Structured rest restriction ("cannot be rested by effects"). Omitted for unrelated continuous effects. */
  restRestriction?: ContinuousRestRestriction;
  /** Structured keyword grant. Omitted for unrelated continuous effects. */
  keywordModifier?: ContinuousKeywordModifier;
  /** Structured "cannot be K.O.'d" grant. Omitted for unrelated continuous effects. */
  koImmunityModifier?: ContinuousKoImmunityModifier;
  /** Structured optional K.O. replacement. Omitted for unrelated continuous effects. */
  koReplacementModifier?: ContinuousKoReplacementModifier;
  /** Structured optional rest replacement. Omitted for unrelated continuous effects. */
  restReplacementModifier?: ContinuousRestReplacementModifier;
  /** Structured effect negation. Omitted for unrelated continuous effects. */
  effectNegation?: ContinuousEffectNegation;
  /** Blocks controller-sourced Life→hand moves. Omitted for unrelated continuous effects. */
  lifeToHandRestriction?: ContinuousLifeToHandRestriction;
  /** Blocks Character plays from hand/trash/deck for a controller. Omitted for unrelated continuous effects. */
  characterPlayRestriction?: ContinuousCharacterPlayRestriction;
  /** Blocks all card plays from hand for a controller. Omitted for unrelated continuous effects. */
  handPlayRestriction?: ContinuousHandPlayRestriction;
  /** Blocks Character-sourced DON!! set-active effects for a controller. Omitted for unrelated continuous effects. */
  characterSetActiveDonRestriction?: ContinuousCharacterSetActiveDonRestriction;
  /**
   * One-shot counter for cost discounts that expire after N matching plays from hand.
   * Omitted = unlimited until duration expiry.
   */
  usesRemaining?: number;
}

export type DelayedEffectRecord =
  | {
      id: string;
      kind: 'setActiveControllerDonAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
      maxTargets: number;
    }
  | {
      id: string;
      kind: 'restOpponentDonAtStartOfMain';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
      maxTargets: number;
      triggerTurnNumber: number;
    }
  | {
      id: string;
      kind: 'trashSourceAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
    }
  | {
      id: string;
      kind: 'moveSourceToBottomDeckAtEndOfBattle';
      sourceInstanceId: string;
      ownerId: string;
      battleAttackerInstanceId: string;
    }
  | {
      id: string;
      kind: 'moveInstanceToBottomDeckAtEndOfBattle';
      sourceInstanceId: string;
      ownerId: string;
      battleAttackerInstanceId: string;
      targetInstanceId: string;
    }
  | {
      id: string;
      kind: 'moveInstanceToBottomDeckAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
      targetInstanceId: string;
    }
  | {
      id: string;
      kind: 'trashControllerCharacterAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
      typeIncludes?: string;
    }
  | {
      id: string;
      kind: 'returnDonToMatchOpponentAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
    }
  | {
      id: string;
      kind: 'moveDeckTopToLifeAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
      requiresLeaderType?: string;
    }
  | {
      id: string;
      kind: 'returnSourceToHandAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
    }
  | {
      id: string;
      kind: 'preventRefreshOnCharacterAtEndOfTurn';
      sourceInstanceId: string;
      ownerId: string;
      triggerPlayerId: string;
      targetInstanceId: string;
      minDonAttached: number;
      requireRested: boolean;
    };

export interface EventActivationRecord {
  playerId: string;
  cardDefinitionId: string;
  cardNumber: string;
  baseCost: number;
  turnNumber: number;
}

export interface GameState {
  /** 0 during the 'setup' phase (Section 5 hasn't reached 5-2-1-8 yet); 1 from the moment the first turn begins. */
  turnNumber: number;
  /**
   * "Turn player" (4-3-1) once currentPhase !== 'setup'. During 'setup',
   * this instead tracks whose input is required next (the deciding player
   * for the going-first choice, then whichever player's mulligan decision
   * is outstanding) — there is no "turn player" yet at that point.
   */
  activePlayerId: string;
  currentPhase: Phase;
  currentBattle: BattleState | null;
  /** Section 5 ("Game Setup") progress; null once 5-2-1-8 has happened. See SetupState. */
  setupState: SetupState | null;
  players: Record<string, PlayerState>;
  /** Single source of truth for every card in the game, keyed by instanceId. Zones store ids only. */
  cardsById: Record<string, CardInstance>;
  rng: RngState;
  continuousEffects: ContinuousEffectRecord[];
  delayedEffects?: DelayedEffectRecord[];
  /** Events activated this game. Gates filter by turnNumber/player so prior turns cannot leak into current effects. */
  eventActivationHistory?: EventActivationRecord[];
  /** Keyed by `${cardInstanceId}:${effectId}`; cleared on that instance's owner's Refresh Phase. */
  oncePerTurnUsage: Record<string, true>;
  pendingChoices: PendingChoice[];
  log: GameLogEntry[];
  gameOver: { winnerId: string | null; reason: GameOverReason } | null;
  /** Gates 6-3-1 (no draw), 6-4-1 (1 DON!!), 6-5-6-1 (no battle) first-turn exceptions. */
  isFirstTurnOfGame: boolean;
  /**
   * Monotonic counter used to mint a fresh CardInstance id whenever a
   * Character/Stage/Event card changes zones mid-game (3-1-6 — "treated as
   * a brand-new card", see card.ts's CardInstance doc comment). Setup-minted
   * ids (leader/deck/DON!!) never touch this counter — see
   * setup/instanceIds.ts. Starts at 0 the moment setup hands off to turn 1.
   */
  nextInstanceSeq: number;
}
