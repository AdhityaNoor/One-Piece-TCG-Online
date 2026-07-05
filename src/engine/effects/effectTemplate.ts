/**
 * The engine-owned execution surface for card effects.
 *
 * Boundary (blueprint Section 16): /src/engine never imports /src/cards. The
 * generic interpreter (interpreter.ts) and these primitives live here. Curated
 * EffectProgram data from /src/cards/effectTemplates is injected as
 * `EffectTemplateRegistry`.
 *
 * `EffectContext` is the interpreter's instruction set: one method per IR op.
 * Card behavior is DATA (EffectProgram, see effectIr.ts), never code; nothing
 * here is per-card.
 */
import type { ContinuousEffectDuration, ContinuousKeyword, ContinuousPowerCondition, GameState, PowerAuraGroup, SourceStateCondition } from '../state/game';
import type { PendingChoice } from '../events/pendingChoice';
import type { CardDefinition } from '../state/card';
import type { EffectProgram, SearchPickDestination, SearchRemainderDestination } from './effectIr';

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
  controllerDeckIds(): string[];
  controllerLifeTopBottomIds(): string[];
  controllerOrOpponentLifeTopIds(): string[];
  controllerDeckTopIds(): string[];
  opponentCharacterIds(): string[];
  opponentHandIds(): string[];
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
  /** Register an aura power modifier over a dynamic target group (8-1-3-3), optionally gated on source state; both re-checked on every read. */
  addContinuousPowerAura(spec: {
    group: PowerAuraGroup;
    amount: number;
    duration: ContinuousEffectDuration;
    sourceCondition?: SourceStateCondition;
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
  /** Register a continuous keyword grant (8-1-3-3); condition re-checked on every keyword read. */
  addContinuousKeyword(spec: {
    appliesToInstanceId: string;
    keyword: ContinuousKeyword;
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    description?: string;
  }): void;
  /** Register a "cannot be K.O.'d" grant on the target (8-1-3-3); scope + condition re-checked on every K.O. attempt. */
  addContinuousKoImmunity(spec: {
    appliesToInstanceId: string;
    scope: 'battle' | 'effect' | 'any';
    duration: ContinuousEffectDuration;
    condition?: ContinuousPowerCondition;
    attackerCategory?: 'leader' | 'character';
    description?: string;
  }): void;
  /** Prevent some/all [Blocker] activations while the target instance is attacking. */
  preventBlockers(spec: {
    appliesToAttackerInstanceId: string;
    duration: ContinuousEffectDuration;
    blockerPowerAtLeast?: number;
    description?: string;
  }): void;
  /** Give up to `count` un-attached DON!! from the controller's cost area to a Leader/Character (6-5-5). */
  giveDon(targetInstanceId: string, count: number): void;
  /** K.O. a Character: move it to its owner's trash, dropping attachments/continuous effects (7-1-4-1-2). */
  ko(targetInstanceId: string): void;
  /** Return a Character to its owner's hand (bounce), dropping attachments/continuous effects it sourced. */
  returnToHand(targetInstanceId: string): void;
  /** Move a card to the bottom of its owner's deck, dropping attachments/continuous effects it sourced. */
  moveToBottomDeck(instanceId: string): void;
  /** Move a card to the top of its owner's Life cards, optionally face-up. */
  moveToLifeTop(instanceId: string, faceUp?: boolean): void;
  /** Move a Life card to the bottom of its owner's Life cards. */
  moveLifeToBottom(instanceId: string): void;
  /** Play the source Character itself from hand into the Character Area for free. */
  playSelf(): void;
  /** Play a Character from the controller's hand into the Character Area for free (3-7), summoning-sick; raises the 3-7-6-1 overflow choice if it makes a 6th. */
  playCharacterFromHand(handInstanceId: string): void;
  /** Play a Character from the controller's deck into the Character Area for free (3-7), then the caller should shuffle the deck if card text instructs it. */
  playCharacterFromDeck(deckInstanceId: string): void;
  /** Shuffle a player's deck using the serialized seedable RNG state. */
  shuffleDeck(playerId: string): void;
  /** Move a card (e.g. from the trash) to its owner's hand. */
  moveToHand(instanceId: string): void;
  /** Move a card (e.g. from the hand) to its owner's trash. */
  trashCard(instanceId: string): void;
  /** Rest a card (4-4-1). Handles Leader/Character (orientation) and DON!! (donRested). */
  rest(targetInstanceId: string): void;
  /** Set a card as active — inverse of rest (2-4-3). Handles Leader/Character (orientation) and DON!! (donRested). */
  setActive(targetInstanceId: string): void;
  /** Trash the top `n` cards of a player's own deck (self-mill); fewer if the deck is short. */
  trashTopOfDeck(playerId: string, n: number): void;
  /** Trash the top `n` Life cards of a player (e.g. opponent Life removal); fewer if Life is short. */
  trashLife(playerId: string, n: number): void;
  /** Add `n` DON!! from the player's DON!! deck to their cost area, active or rested (DON!! ramp); fewer if the DON!! deck is short. */
  addDonFromDeck(playerId: string, n: number, rested: boolean): void;
  /**
   * Resolve a "search": `lookedIds` are the top-of-deck cards that were looked
   * at; move `chosenIds` (a subset) to the picked-card destination and the
   * remainder to the configured remainder destination. Bottom-deck remainders
   * may use a player-selected order when supplied.
   */
  searchResolve(playerId: string, lookedIds: string[], chosenIds: string[], remainder: SearchRemainderDestination, reveal: boolean, destination: SearchPickDestination, bottomOrderIds?: string[]): void;
  /** Resolve a top-deck search/look whose placement returns cards to top and bottom in selected order. */
  searchResolveTopOrBottom(playerId: string, lookedIds: string[], topOrderIds: string[], bottomOrderIds: string[]): void;
  /** Emit a fully-built PendingChoice (the interpreter uses this to suspend; carries its resume point). */
  emitChoice(choice: PendingChoice): void;
}

/**
 * Injected map cardNumber -> curated EffectProgram. Absent entry = the card
 * has no reviewed runtime effect. The dispatcher passes this to the engine; the
 * engine never reaches into /src/cards.
 */
export type EffectTemplateRegistry = Record<string, EffectProgram>;
