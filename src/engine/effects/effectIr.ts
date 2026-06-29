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
  | { sel: 'opponentCharacters' }
  | { sel: 'var'; name: string }; // ids bound by a prior chooseTargets op

export type IrCondition = ContinuousPowerCondition; // { donAttachedAtLeast?, turn? }
export type IrDuration = ContinuousEffectDuration;

/**
 * One instruction. `chooseTargets` suspends the program and binds the player's
 * selection to `var`; later ops reference it via { sel: 'var', name }.
 */
export type EffectOp =
  | { op: 'draw'; amount: number }
  | { op: 'addPower'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition }
  | { op: 'giveDon'; target: Selector; count: number }
  | { op: 'ko'; target: Selector }
  | { op: 'chooseTargets'; var: string; from: Selector; min: number; max: number; prompt: string };

/** When the ability is exposed/fires (mirrors EffectTimingKeyword). */
export type IrTrigger = 'onEnterPlay' | 'onPlay' | 'whenAttacking' | 'activateMain' | 'onKO' | 'counter';

export interface Ability {
  trigger: IrTrigger;
  /** Gate for whether a TRIGGERED ability fires at all ([DON!! xN] / [Your/Opponent's Turn]). */
  condition?: IrCondition;
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
