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
