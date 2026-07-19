import type { GameState } from '../../../engine/state/game';

/**
 * Compact per-player header: 2 rows normally (Player Name, Current Phase —
 * swaps text the instant `currentPhase` changes, no per-phase row list to
 * animate through), 3 rows for ranked matches (+ a live mm:ss chess-clock
 * row). Replaces the earlier 5-row "glide" layout (one row per phase with a
 * sliding highlight) — see git history for that version if it's ever needed
 * again.
 */

function phaseLabel(phase: GameState['currentPhase']): string {
  const word = phase === 'don' ? 'DON!!' : `${phase[0].toUpperCase()}${phase.slice(1)}`;
  return `${word} Phase`;
}

/** mm:ss, rounding UP to the nearest second so the clock never visibly shows 0:00 while time remains. */
function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const LOW_TIME_THRESHOLD_MS = 60_000;

export interface PhaseIndicatorProps {
  playerId: string;
  /** Display label for the seat — defaults to the raw engine id (hotseat shows p1/p2; Casual passes a username). */
  label?: string;
  currentPhase: GameState['currentPhase'];
  active: boolean;
  /**
   * Ranked-only chess-clock ms remaining for THIS seat. Pass `null`/omit for
   * every non-ranked match (hotseat, VS CPU, Casual) — that's what keeps the
   * component to its plain 2-row layout. Ticks only while `active` is true
   * (server-authoritative; this just renders whatever value it's given —
   * see server/src/rooms/GameRoom.ts's clock tick, project rule "the UI
   * must never directly mutate game state").
   */
  timerMs?: number | null;
}

export function PhaseIndicator({ playerId, label, currentPhase, active, timerMs = null }: PhaseIndicatorProps) {
  const ranked = timerMs !== null && timerMs !== undefined;
  const lowTime = ranked && (timerMs as number) <= LOW_TIME_THRESHOLD_MS;

  return (
    <section className={['flex flex-col gap-1 rounded-lg border p-2', active ? 'border-gold/30 bg-gold/10' : 'border-white/10 bg-white/[0.03]'].join(' ')}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/45" title={label ?? playerId}>
          {label ?? playerId}
        </span>
        {active && <span className="flex-shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-gold">Turn</span>}
      </div>

      <p className={['truncate text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-300', active ? 'text-gold' : 'text-white/55'].join(' ')}>
        {phaseLabel(currentPhase)}
      </p>

      {ranked && (
        <p
          className={[
            'flex items-center gap-1.5 text-[11px] font-black tabular-nums tracking-[0.04em] transition-colors duration-300',
            !active ? 'text-white/35' : lowTime ? 'text-red-300' : 'text-white/78',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={['h-1.5 w-1.5 flex-shrink-0 rounded-full', active ? (lowTime ? 'bg-red-400' : 'bg-emerald-400') : 'bg-white/25'].join(' ')}
          />
          {formatClock(timerMs as number)}
          {!active && <span className="text-[9px] font-bold normal-case tracking-normal text-white/30">(paused)</span>}
        </p>
      )}
    </section>
  );
}
