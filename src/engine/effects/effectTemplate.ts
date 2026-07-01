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
import type { CardDefinition } from '../state/card';
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

  // --- selectors / queries ---
  controllerLeaderId(): string;
  controllerCharacterIds(): string[];
  controllerHandIds(): string[];
  controllerTrashIds(): string[];
  opponentCharacterIds(): string[];
  /** Current power of an instance (2-6, incl. modifiers) — for cost/power-threshold target filters. */
  powerOf(instanceId: string): number;
  /** Current cost of an instance (2-7). */
  costOf(instanceId: string): number;
  /** The CardDefinition behind an instance (2-x), for searcher filters. Undefined if unknown. */
  definitionOf(instanceId: string): CardDefinition | undefined;
  /** Instance ids of the top `n` cards of a player's deck, top-first (read-only). */
  topOfDeck(playerId: string, n: number): string[];

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
  /** Register a continuous cost modifier (8-1-3-3); condition re-checked on every read. */
  addContinuousCost(spec: {
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
  /** Return a Character to its owner's hand (bounce), dropping attachments/continuous effects it sourced. */
  returnToHand(targetInstanceId: string): void;
  /** Play a Character from the controller's hand into the Character Area for free (3-7), summoning-sick; raises the 3-7-6-1 overflow choice if it makes a 6th. */
  playCharacterFromHand(handInstanceId: string): void;
  /** Move a card (e.g. from the trash) to its owner's hand. */
  moveToHand(instanceId: string): void;
  /** Move a card (e.g. from the hand) to its owner's trash. */
  trashCard(instanceId: string): void;
  /** Rest a card (4-4-1). */
  rest(targetInstanceId: string): void;
  /** Trash the top `n` cards of a player's own deck (self-mill); fewer if the deck is short. */
  trashTopOfDeck(playerId: string, n: number): void;
  /** Add `n` DON!! from the player's DON!! deck to their cost area, active or rested (DON!! ramp); fewer if the DON!! deck is short. */
  addDonFromDeck(playerId: string, n: number, rested: boolean): void;
  /**
   * Resolve a "search": `lookedIds` are the top-of-deck cards that were looked
   * at; move `chosenIds` (a subset) to the player's hand and the remainder to
   * the bottom of the deck, in looked order (the classic searcher tail).
   */
  searchResolve(playerId: string, lookedIds: string[], chosenIds: string[]): void;
  /** Emit a fully-built PendingChoice (the interpreter uses this to suspend; carries its resume point). */
  emitChoice(choice: PendingChoice): void;
}

/**
 * Injected map cardNumber -> compiled EffectProgram. Absent entry = the card
 * has no (yet-compilable) effect. The dispatcher passes this to the engine; the
 * engine never reaches into /src/cards.
 */
export type EffectTemplateRegistry = Record<string, EffectProgram>;
