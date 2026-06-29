/**
 * The engine-owned execution surface for card effects.
 *
 * Boundary (blueprint Section 16): /src/engine never imports /src/cards. The
 * generic interpreter (interpreter.ts) and these primitives live here; the
 * front-end compiler that turns card text into EffectProgram IR lives in
 * /src/cards/effectTemplates and is injected as `EffectTemplateRegistry`.
 *
 * `EffectContext` is the interpreter's instruction set — one method per IR op.
 * Card behavior is DATA (EffectProgram, see effectIr.ts), never code; nothing
 * here is per-card.
 */
import type { ContinuousEffectDuration, ContinuousPowerCondition, GameState } from '../state/game';
import type { PendingChoice } from '../events/pendingChoice';
import type { EffectProgram } from './effectIr';

export interface EffectContext {
  /** The CardInstance whose effect is resolving (8-1-3-1-3). */
  readonly sourceInstanceId: string;
  /** The player who controls the source (defaults to owner). */
  readonly controllerId: string;
  /** The other player. */
  readonly opponentId: string;
  /** Read-only view of the current working state, for conditions/selectors. */
  state(): GameState;

  // --- selectors ---
  controllerLeaderId(): string;
  controllerCharacterIds(): string[];
  opponentCharacterIds(): string[];

  // --- instruction set (one per IR op) ---
  /** Draw `n` cards for `playerId` (6-3; empty-deck draw loses, 9-2-1). */
  draw(playerId: string, n: number): void;
  /** Register a continuous power modifier (8-1-3-3); condition re-checked on every read. */
  addContinuousPower(spec: {
    appliesToInstanceId: string;
    amount: number;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void;
  /** Give up to `count` un-attached DON!! from the controller's cost area to a Leader/Character (6-5-5). */
  giveDon(targetInstanceId: string, count: number): void;
  /** K.O. a Character: move it to its owner's trash, dropping attachments/continuous effects (7-1-4-1-2). */
  ko(targetInstanceId: string): void;
  /** Emit a fully-built PendingChoice (the interpreter uses this to suspend; carries its resume point). */
  emitChoice(choice: PendingChoice): void;
}

/**
 * Injected map cardNumber -> compiled EffectProgram. Absent entry = the card
 * has no (yet-compilable) effect. The dispatcher passes this to the engine; the
 * engine never reaches into /src/cards.
 */
export type EffectTemplateRegistry = Record<string, EffectProgram>;
