/**
 * Layer 5 presentation queue item — announces an automatic phase
 * transition to the player (Refresh / Draw / DON!!). Never drives game
 * rules; purely derived from a dispatch's log delta by
 * parsePhaseAnnouncements.ts. Kept in its own folder (mirroring
 * animations/cardMovement) since both are Layer 5 "log delta -> UI intent"
 * translators that must stay decoupled from GameState itself.
 */
export type AnnouncedPhase = 'refresh' | 'draw' | 'don';

export interface PhaseAnnouncement {
  /** Sourced from the originating GameLogEntry.id — stable across a single dispatch. */
  id: string;
  phase: AnnouncedPhase;
  playerId: string;
  label: string;
  /** Optional secondary line, e.g. "3 cards activated" or "Draw skipped". */
  detail: string | null;
}
