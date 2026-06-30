/**
 * Effect IR — the compile TARGET for card effects.
 *
 * A card's behavior is DATA, not code: the front-end compiler
 * (/src/cards/effectTemplates/compile.ts) turns parsed effect text into an
 * `EffectProgram`, and ONE generic interpreter (interpreter.ts) executes it for
 * every card. There is no per-card code — adding a card means producing IR,
 * never writing a resolver. Everything here is JSON-serializable.
 *
 * The op vocabulary is the interpreter's instruction set; it maps 1:1 onto the
 * EffectContext primitives. Grow the vocabulary (new ops) rather than adding
 * bespoke card logic.
 */
import type { ContinuousEffectDuration, ContinuousPowerCondition } from '../state/game';

/** Resolves to a set of CardInstance ids at run time. Pure data. */
export type Selector =
  | { sel: 'self' } // the source card
  | { sel: 'controllerLeader' }
  | { sel: 'controllerCharacters' }
  | { sel: 'controllerLeaderOrCharacters' }
  | { sel: 'opponentCharacters'; maxCost?: number; maxPower?: number } // optional "cost/power N or less" filter
  | { sel: 'var'; name: string }; // ids bound by a prior chooseTargets op

export type IrCondition = ContinuousPowerCondition; // { donAttachedAtLeast?, turn? }
export type IrDuration = ContinuousEffectDuration;

/**
 * Predicate for the "searcher" pattern (look at top N, add a matching card to
 * hand). All present fields are ANDed against the looked-at card's definition.
 * Pure data — the interpreter evaluates it against CardDefinitions via defs.
 */
export interface SearchFilter {
  /** A free-text tribal type the card must carry (2-4), e.g. "Straw Hat Crew". */
  typeIncludes?: string;
  /** "other than [SelfName]" — exclude cards sharing the source card's name. */
  excludeSelfName?: boolean;
  /** Card category gate (2-2), e.g. "reveal up to 1 Character card". */
  category?: 'character' | 'event' | 'stage' | 'leader';
  maxCost?: number;
  minCost?: number;
  maxPower?: number;
}

/**
 * One instruction. `chooseTargets` and `searchTopDeck` both suspend the program
 * via a PendingChoice; `chooseTargets` binds the player's selection to `var`
 * (later ops reference it via { sel: 'var', name }), while `searchTopDeck`
 * resolves its own deck movement on resume.
 */
export type EffectOp =
  | { op: 'draw'; amount: number }
  | { op: 'addPower'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition }
  | { op: 'giveDon'; target: Selector; count: number }
  | { op: 'ko'; target: Selector }
  | { op: 'rest'; target: Selector }
  | { op: 'returnToHand'; target: Selector } // bounce a Character to its owner's hand
  | { op: 'chooseTargets'; var: string; from: Selector; min: number; max: number; prompt: string }
  // Look at top `look` cards; player adds up to `pick` filter-matching cards to
  // hand; the rest go to the bottom of the deck (the classic "searcher").
  | { op: 'searchTopDeck'; look: number; pick: number; filter?: SearchFilter; prompt: string }
  // Trash the top `count` cards of the controller's own deck (self-mill).
  | { op: 'trashTopDeck'; count: number };

/** When the ability is exposed/fires (mirrors EffectTimingKeyword). */
export type IrTrigger = 'onEnterPlay' | 'onPlay' | 'whenAttacking' | 'activateMain' | 'onKO' | 'counter';

export interface Ability {
  trigger: IrTrigger;
  /** Gate for whether a TRIGGERED ability fires at all ([DON!! xN] / [Your/Opponent's Turn]). */
  condition?: IrCondition;
  /** 10-2-13 [Once Per Turn] — an activated ability may only be used once per turn per source. */
  oncePerTurn?: boolean;
  ops: EffectOp[];
}

/** A whole card's compiled effect. */
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
