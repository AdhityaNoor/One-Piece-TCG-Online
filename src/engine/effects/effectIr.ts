/**
 * Effect IR: the curated runtime representation for card effects.
 *
 * A card's behavior is data, not code: reviewed templates in /src/cards build
 * EffectProgram objects, and one engine interpreter executes them for every
 * card. Raw API/scraped text is reference text only, never executable logic.
 * Everything here is JSON-serializable.
 *
 * The op vocabulary is the interpreter's instruction set; it maps 1:1 onto the
 * EffectContext primitives. Grow the vocabulary (new ops) rather than adding
 * bespoke card logic.
 */
import type { ContinuousEffectDuration, ContinuousPowerCondition } from '../state/game';
import type { CardCategory, Color } from '../state/card';

/** Resolves to a set of CardInstance ids at run time. Pure data. */
export type Selector =
  | { sel: 'self' } // the source card
  | { sel: 'controllerLeader' }
  | { sel: 'controllerCharacters'; maxCost?: number; exactCost?: number; color?: Color }
  | { sel: 'controllerLeaderOrCharacters'; typeIncludes?: string; excludeSelf?: boolean }
  | { sel: 'opponentLeaderOrCharacters' }
  | { sel: 'allCharacters'; maxCost?: number; maxPower?: number } // any player's Characters
  | { sel: 'opponentCharacters'; maxCost?: number; maxPower?: number; rested?: boolean; hasBlocker?: boolean } // optional cost/power/rested/blocker filters
  | { sel: 'controllerHand'; filter?: SearchFilter } // controller's hand cards matching a filter (for play-from-hand)
  | { sel: 'controllerTrash'; filter?: SearchFilter } // controller's trash cards matching a filter (for recover-to-hand)
  | { sel: 'var'; name: string }; // ids bound by a prior chooseTargets op

export type IrCondition = ContinuousPowerCondition; // { donAttachedAtLeast?, turn? }
export type IrDuration = ContinuousEffectDuration;

/**
 * Predicate for the "searcher" pattern (look at top N, add a matching card to
 * hand). All present fields are ANDed against the looked-at card's definition.
 * Pure data — the interpreter evaluates it against CardDefinitions via defs.
 */
export interface SearchFilter {
  /** OR branch: a card matches when it satisfies any child filter, plus any sibling gates on this filter. */
  anyOf?: SearchFilter[];
  /** A free-text tribal type the card must carry (2-4), e.g. "Straw Hat Crew". */
  typeIncludes?: string;
  /** "other than [SelfName]" — exclude cards sharing the source card's name. */
  excludeSelfName?: boolean;
  /** Card category gate (2-2), e.g. "reveal up to 1 Character card". */
  category?: Exclude<CardCategory, 'don'>;
  /** Card color gate (2-3), e.g. "red Event". */
  color?: Color;
  /** Exact card name (2-1), e.g. "play up to 1 [Gaimon]". */
  name?: string;
  maxCost?: number;
  minCost?: number;
  /** Exact cost (2-7), e.g. "with a cost of 6" (no "or less"). */
  exactCost?: number;
  maxPower?: number;
  exactPower?: number;
}

export type SearchRemainderDestination = 'bottom' | 'trash';
export type SearchPickDestination = 'hand' | 'lifeTop';
export type SequenceCondition = 'previousSelectedAny' | 'previousMovedAny';

export interface EffectOpSequenceGate {
  /**
   * Optional sequencing gate for text like "If you do" after an optional
   * function. Plain "Then" does not use this; choosing 0 for an "up to" effect
   * still counts as resolving the prior function.
   */
  ifPrevious?: SequenceCondition;
}

/**
 * One instruction. `chooseTargets` and `searchTopDeck` both suspend the program
 * via a PendingChoice; `chooseTargets` binds the player's selection to `var`
 * (later ops reference it via { sel: 'var', name }), while `searchTopDeck`
 * resolves its own deck movement on resume.
 */
export type EffectOp =
  | ({ op: 'draw'; amount: number } & EffectOpSequenceGate)
  | ({ op: 'addPower'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate)
  | ({ op: 'addCost'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate)
  | ({ op: 'preventBlockers'; target: Selector; duration: IrDuration; blockerPowerAtLeast?: number } & EffectOpSequenceGate)
  | ({ op: 'giveDon'; target: Selector; count: number } & EffectOpSequenceGate)
  | ({ op: 'ko'; target: Selector } & EffectOpSequenceGate)
  | ({ op: 'rest'; target: Selector } & EffectOpSequenceGate)
  | ({ op: 'returnToHand'; target: Selector } & EffectOpSequenceGate) // bounce a Character to its owner's hand
  | ({ op: 'moveToBottomDeck'; target: Selector } & EffectOpSequenceGate) // move chosen cards to the bottom of their owner's deck
  | ({ op: 'playFromHand'; target: Selector } & EffectOpSequenceGate) // put a chosen Character from hand into play (no cost)
  | ({ op: 'moveToHand'; target: Selector } & EffectOpSequenceGate) // move a chosen card (e.g. from the trash) to its owner's hand
  | ({ op: 'trashCards'; target: Selector } & EffectOpSequenceGate) // move chosen cards (e.g. from the hand) to their owner's trash
  | ({ op: 'chooseTargets'; var: string; from: Selector; min: number; max: number; prompt: string } & EffectOpSequenceGate)
  // Look at top `look` cards; player adds up to `pick` filter-matching cards to
  // `destination`; `reveal` means the added card identity is public ("reveal up to N").
  // Without that text, the added card remains secret to the controller.
  // The rest go to the configured destination (bottom by default).
  | ({ op: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter?: SearchFilter; remainder?: SearchRemainderDestination; prompt: string } & EffectOpSequenceGate)
  // Trash the top `count` cards of the controller's own deck (self-mill).
  | ({ op: 'trashTopDeck'; count: number } & EffectOpSequenceGate)
  // Add `count` DON!! from the DON!! deck to the cost area, active or rested (DON!! ramp).
  | ({ op: 'addDonFromDeck'; count: number; rested: boolean } & EffectOpSequenceGate);

/** When the ability is exposed/fires (mirrors EffectTimingKeyword). */
export type IrTiming = 'onEnterPlay' | 'onPlay' | 'whenAttacking' | 'activateMain' | 'onKO' | 'counter' | 'lifeTrigger';

/**
 * An activation cost that must be PAID before an activated ability resolves
 * (8-3-1-5). Pure data; the ACTIVATE_CARD_EFFECT handler pays it. Only fully
 * mechanical costs are modeled. Ambiguous costs stay out of curated runtime
 * templates until reviewed rather than resolving for free.
 */
export type AbilityCost =
  | { kind: 'donMinus'; count: number } // return N DON!! from the field to the DON!! deck
  | { kind: 'restThis' } // rest the source card
  | { kind: 'restDon'; count: number }; // rest N of your active DON!! cards

/**
 * A board-state precondition on an "If …, <effect>" ability (checked once when
 * the ability would fire/activate). Pure data — evaluated by evaluateGates.
 */
export type AbilityGate =
  | { kind: 'leaderName'; name: string } // "If your Leader is [X]"
  | { kind: 'leaderType'; type: string } // "If your Leader has the {Y} type"
  | { kind: 'leaderMulticolor' } // "If your Leader is multicolored"
  | { kind: 'selfCharacterCount'; atLeast?: number; atMost?: number } // "If you have N or more/less Characters"
  | { kind: 'opponentCharacterCount'; atLeast?: number; atMost?: number } // "If your opponent has N or less Characters"
  | { kind: 'selfDonFieldCount'; atLeast?: number; atMost?: number } // "If you have N or less DON!! cards on your field"
  | { kind: 'selfLife'; atLeast?: number; atMost?: number } // "If you have N or less Life cards"
  | { kind: 'opponentLife'; atLeast?: number; atMost?: number } // "If your opponent has N or less Life cards"
  | { kind: 'selfHand'; atLeast?: number; atMost?: number }; // "If you have N or less cards in your hand"

export interface Ability {
  timing: IrTiming;
  /** Gate for whether a TRIGGERED ability fires at all ([DON!! xN] / [Your/Opponent's Turn]). */
  condition?: IrCondition;
  /** "If …" board-state preconditions (all must hold) — checked once at fire/activate time. */
  gate?: AbilityGate[];
  /** 10-2-13 [Once Per Turn] — an activated ability may only be used once per turn per source. */
  oncePerTurn?: boolean;
  /** Activation cost(s) paid on use (8-3-1-5); [Activate: Main] and [Counter] handlers pay these before resolution. */
  cost?: AbilityCost[];
  ops: EffectOp[];
}

/** A whole card's curated runtime effect program. */
export interface EffectProgram {
  cardNumber: string;
  abilities: Ability[];
}

/** Serializable resume point stored on a PendingChoice for an interpreter-suspended program. */
export interface EffectResumeState {
  abilityIndex: number;
  /** Index of the chooseTargets op that suspended; resume continues after it. */
  opIndex: number;
  /** Variables bound so far (var name -> selected instance ids). */
  bindings: Record<string, string[]>;
}
