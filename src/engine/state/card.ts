/**
 * Card type/category and per-instance state.
 * Source of truth: Comprehensive Rules, Section 2 "Card Information" and
 * Section 4 "Basic Game Terminology" (4-4 Card States).
 */
import type { ZoneId } from './zone';

/** 2-2-2. */
export type CardCategory = 'leader' | 'character' | 'event' | 'stage' | 'don';

/** 2-3-3. Multicolor cards count as every color they list (2-3-5). */
export type Color = 'red' | 'green' | 'blue' | 'purple' | 'black' | 'yellow';

/** 2-5-2. Leader/Character only (2-5-5). "?" is represented as 'unknown'. */
export type Attribute = 'slash' | 'strike' | 'ranged' | 'special' | 'wisdom' | 'unknown';

/** 4-4-1. DON!! cards are neither (4-4-2) -> represented as null on CardInstance. */
export type Orientation = 'active' | 'rested';

/** 3-10-2-1, 11-2. Tracks whether a card in a secret area is currently revealed face-up. */
export type FaceState = 'faceUp' | 'faceDown';

/**
 * Static, card-API-sourced data. This is "card data only, not executable
 * logic" per project ground rules — effect TEXT is stored as a string for
 * display/debug; actual behavior lives in /src/cards/effectTemplates,
 * never here.
 */
export interface CardDefinition {
  cardDefinitionId: string;
  name: string; // 2-1
  category: CardCategory; // 2-2
  colors: Color[]; // 2-3
  types: string[]; // 2-4, free-text tribal tags
  attributes?: Attribute[]; // 2-5, Leader/Character only
  basePower?: number; // 2-6, Leader/Character only
  baseCost?: number; // 2-7, Character/Event/Stage only
  text: string; // 2-8, raw card text, display/debug only
  life?: number; // 2-9, Leader only
  counter?: number; // 2-10, Character only ((Symbol) Counter value)
  hasTrigger: boolean; // 2-11, [Trigger] presence (text itself parsed elsewhere)
  /**
   * 2-11. Best-effort SUBSTRING of `text` covering just the [Trigger]
   * clause, for display only — see /src/cards/normalization/extractTriggerText.ts
   * for exactly how/why this is heuristic, not a guaranteed-clean boundary.
   * Undefined whenever hasTrigger is false. Never parsed into behavior here.
   */
  triggerText?: string;
  /**
   * Keyword PRESENCE flags (10-1, 10-2) — same category of detection as
   * hasTrigger above: a plain substring check of `text`, never an
   * interpretation of what the keyword's effect does. These four are
   * mechanically load-bearing for core battle flow (blueprint Section 5)
   * rather than card-specific behavior, which is why the rules engine is
   * allowed to branch on them directly (unlike free-text effects):
   * - hasRush: card may attack the turn it's played, overriding
   *   CardInstance.summoningSick (3-7-4, 10-1-6). True for either "[Rush]" or
   *   "[Rush: Character]" — blueprint TODO #7 (targeting-restriction nuance
   *   between the two) is NOT resolved by this flag and remains open.
   * - hasBlocker: card is eligible to activate as a Blocker in the Block
   *   Step (7-1-2-1).
   * - hasDoubleAttack: a successful Leader-targeted attack from this card
   *   deals 2 damage instead of 1 (7-1-4-1-1-3).
   * - isUnblockable: the Block Step is skipped for attacks made BY this
   *   card — read from the attacker's definition, not the defender's
   *   (10-1 keyword list).
   */
  hasRush: boolean;
  hasBlocker: boolean;
  hasDoubleAttack: boolean;
  isUnblockable: boolean;
  cardNumber: string; // 2-14, deck-construction max-4-copies key
  // 2-12, 2-13, 2-15, 2-16, 2-17: explicitly no gameplay effect — metadata only.
  rarity?: string;
  blockSymbol?: string;
  illustration?: string;
  illustrator?: string;
}

/**
 * A specific physical card occupying a specific zone-slot right now.
 * Per 3-1-6, a card that changes zones (Character/Stage area in particular)
 * is treated as a brand-new card — no carried-over effect history. Engine
 * code that moves a card between zones should mint a new instanceId and a
 * fresh continuous-effect/oncePerTurn slate rather than mutate in place.
 */
export interface CardInstance {
  instanceId: string;
  cardDefinitionId: string;
  ownerId: string;
  /** Defaults to ownerId. See blueprint TODO #4 — no confirmed control-changing effect found yet. */
  controllerId: string;
  currentZone: ZoneId;
  /** null for DON!! cards (4-4-2). */
  orientation: Orientation | null;
  /**
   * DON!! cards do not use the formal Active/Rested vocabulary (4-4-2,
   * hence `orientation` is null for them above), but cost payment still
   * requires "resting active DON!! from the cost area" (2-7-2–2-7-4) and
   * Refresh Phase still needs to undo that (6-2-4, "field" includes the
   * cost area per 3-1-2). This tracks that DON!!-specific tapped state
   * separately rather than overloading `orientation`. undefined for every
   * non-DON!! card.
   *
   * FLAGGED ASSUMPTION (not re-verified against the raw PDF this session —
   * see docs/01 Section 19 TODO #10): the exact wording of 4-4-2 and 3-9-3
   * was not re-read; this field exists to reconcile what looked like a
   * contradiction between them. Revisit once the source PDF is available
   * again.
   */
  donRested?: boolean;
  faceState: FaceState;
  /** DON!! cards "given" to this Leader/Character (6-5-5-1). +1000 power each, for the turn (6-5-5-2). */
  donAttached: string[]; // CardInstance ids of attached DON!! cards
  /** Resolved power after modifiers; undefined for non-Leader/Character cards (2-6-2). */
  currentPower?: number;
  /** Resolved cost after modifiers; undefined for Leader/DON!! cards (2-7-5). */
  currentCost?: number;
  /** Ids into GameState.continuousEffects currently applied to this instance. */
  appliedContinuousEffectIds: string[];
  /** Ids of [Once Per Turn] effects already resolved for THIS instance this turn (10-2-13-4). */
  oncePerTurnUsed: string[];
  /** Cannot attack the turn it was played unless [Rush]/[Rush: Character] (3-7-4). */
  summoningSick: boolean;
  /** Transient reveal tracking for cards in secret areas (11-2-2). 'all' or specific player ids. */
  revealedTo: 'all' | string[];
}
