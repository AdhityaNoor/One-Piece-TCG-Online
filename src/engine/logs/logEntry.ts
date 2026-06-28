/**
 * Game log model.
 * Source of truth: project ground rules (every action must produce a log
 * entry) plus the secrecy rules in Comprehensive Rules Section 3 (3-1-5)
 * and Section 11 (11-3-1) that determine what a redacted log may show.
 */

export type LogEventType =
  | 'PHASE_CHANGED'
  | 'TURN_PASSED'
  | 'CARD_DRAWN'
  | 'CARD_PLAYED'
  | 'EFFECT_ACTIVATED'
  | 'EFFECT_RESOLVED'
  | 'DON_GIVEN'
  | 'ATTACK_DECLARED'
  | 'BLOCKER_ACTIVATED'
  | 'COUNTER_ACTIVATED'
  | 'DAMAGE_DEALT'
  | 'TRIGGER_REVEALED'
  | 'CHARACTER_KO'
  | 'CARD_MOVED'
  | 'CHOICE_REQUESTED'
  | 'CHOICE_RESOLVED'
  | 'GAME_OVER';

/** 'public' = both players (and spectators) may see it. Otherwise scoped to specific player ids. */
export type LogVisibility = 'public' | { visibleTo: string[] };

export interface GameLogEntry {
  id: string;
  /** Monotonic, deterministic — drives replay ordering, not wall-clock time. */
  sequence: number;
  turnNumber: number;
  phase: string; // mirrors GameState.Phase as a string to avoid a state<->log import cycle
  actorPlayerId: string | null; // null for purely automatic/rule-processing entries
  type: LogEventType;
  /** Short machine summary; human-facing copy/i18n is a presentation-layer concern, not engine state. */
  message: string;
  data: Record<string, unknown>;
  relatedCardInstanceIds: string[];
  visibility: LogVisibility;
  /** The GameAction.actionId that caused this entry, if any (vs. automatic rule processing). */
  causedByActionId: string | null;
}
