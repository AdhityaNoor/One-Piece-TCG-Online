import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { AnnouncedPhase, PhaseAnnouncement } from './types';

const PHASE_LABELS: Record<AnnouncedPhase, string> = {
  refresh: 'Refresh Phase',
  draw: 'Draw Phase',
  don: 'DON!! Phase',
};

function isAnnouncedPhase(phase: unknown): phase is AnnouncedPhase {
  return phase === 'refresh' || phase === 'draw' || phase === 'don';
}

function pluralCards(n: number): string {
  return `${n} card${n === 1 ? '' : 's'}`;
}

/**
 * Turns a dispatch log delta into a sequence of phase-transition banners.
 * advanceAutomaticPhases (engine/rules/phases) can run Refresh -> Draw ->
 * DON!! -> Main inside a SINGLE dispatch call, so one log delta commonly
 * contains several PHASE_CHANGED entries at once — React only re-renders
 * once the state settles at 'main', so a component can never observe the
 * intermediate phases just by watching GameState.currentPhase change. This
 * function is what lets the UI recover and replay that sequence instead.
 *
 * 'main' is deliberately never announced here: no PHASE_CHANGED entry marks
 * entering Main (runDonPhase.ts sets currentPhase: 'main' without logging a
 * distinct marker for it — the DON!! Phase's own PHASE_CHANGED is the last
 * signal before Main begins), and Main is the long-lived phase where the
 * player actually acts, not a fleeting transition worth a banner. 'end' is
 * also skipped — TurnChangeBanner (MatchScreen.tsx) already announces the
 * turn handoff that immediately follows it; a second banner there would
 * just be noise.
 */
export function parsePhaseAnnouncements(logDelta: GameLogEntry[]): PhaseAnnouncement[] {
  const out: PhaseAnnouncement[] = [];

  for (const entry of logDelta) {
    if (entry.type !== 'PHASE_CHANGED' || !entry.actorPlayerId) continue;
    const phase = entry.data.phase;
    if (!isAnnouncedPhase(phase)) continue;

    let detail: string | null = null;
    if (phase === 'refresh') {
      const count = entry.relatedCardInstanceIds.length;
      detail = count > 0 ? `${pluralCards(count)} activated` : null;
    } else if (phase === 'draw' && entry.data.skipped) {
      detail = 'Draw skipped';
    }

    out.push({
      id: entry.id,
      phase,
      playerId: entry.actorPlayerId,
      label: PHASE_LABELS[phase],
      detail,
    });
  }

  return out;
}
