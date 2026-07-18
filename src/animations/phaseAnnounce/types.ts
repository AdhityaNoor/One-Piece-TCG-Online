import type { CardMovementSpec } from '../cardMovement/types';

export type AnnouncedPhase = 'refresh' | 'draw' | 'don' | 'main';

/**
 * A single step in the turn-start sequence the player watches play out:
 * (Turn N begins ->) Refresh -> Draw -> DON!! -> Main. This is ONE
 * discriminated union, and the whole sequence lives in ONE queue
 * (phaseAnnounceStore), specifically so the turn-change banner and the
 * phase banners can never race each other — they used to be two entirely
 * separate systems (TurnChangeBanner reacting to prop diffs on its own
 * clock, phase banners queued separately) and nothing stopped both from
 * showing at once. Now there is exactly one "currently showing" step at a
 * time, drained strictly in order.
 */
export type TurnSequenceStep =
  | {
      kind: 'turnChange';
      /** Sourced from the originating TURN_PASSED GameLogEntry.id, or synthesized for turn 1 (which has no TURN_PASSED — see buildTurnSequence.ts). */
      id: string;
      /** The player whose turn is starting. */
      playerId: string;
      turnNumber: number;
      durationMs: number;
    }
  | {
      kind: 'phase';
      /** Sourced from the originating PHASE_CHANGED GameLogEntry.id (or a synthesized id for 'main', which has none). */
      id: string;
      phase: AnnouncedPhase;
      playerId: string;
      label: string;
      /** Optional secondary line, e.g. "3 cards activated" or "Draw skipped". */
      detail: string | null;
      /** Card flights that belong to this step (deck->hand draw, DON!! deck->cost area, etc). Empty for Refresh (no zone-to-zone movement — cards flip in place) and Main. */
      movementSpecs: CardMovementSpec[];
      durationMs: number;
    };
