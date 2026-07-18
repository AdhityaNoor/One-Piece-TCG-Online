import { useEffect, useState } from 'react';
import type { GameState } from '../../../engine/state/game';

const PHASES: GameState['currentPhase'][] = ['refresh', 'draw', 'don', 'main', 'end'];

/** Must match each phase row's fixed height below (ROW_H) plus its gap-1 spacing (GAP), in px —
 * the sliding highlight's translateY is computed from these rather than measured via ref, since
 * the row count/order is static and this is far cheaper than a ResizeObserver for five fixed rows. */
const ROW_H = 22;
const GAP = 4;

function phaseLabel(phase: GameState['currentPhase']): string {
  if (phase === 'don') return 'DON!!';
  return phase;
}

export interface PhaseIndicatorProps {
  playerId: string;
  /** Display label for the seat — defaults to the raw engine id (hotseat shows p1/p2; Casual passes a username). */
  label?: string;
  currentPhase: GameState['currentPhase'];
  active: boolean;
}

export function PhaseIndicator({ playerId, label, currentPhase, active }: PhaseIndicatorProps) {
  // Frozen at this player's last-known phase row while `active` is false, instead of
  // unmounting the highlight — that's what makes it GLIDE: when this player's next turn
  // starts (active flips true, currentPhase resets to 'refresh'), the bar animates from
  // wherever it was parked (typically 'end', the bottom row) back UP to 'refresh' at the
  // top, then down again through draw/don/main as the turn progresses. A never-yet-active
  // seat (e.g. the second player before their first turn) has no prior position to park
  // at, so it simply isn't rendered until `active` fires for the first time.
  const [displayIndex, setDisplayIndex] = useState<number | null>(null);

  useEffect(() => {
    if (active) setDisplayIndex(PHASES.indexOf(currentPhase));
  }, [active, currentPhase]);

  return (
    <section className={['rounded-lg border p-2', active ? 'border-gold/30 bg-gold/10' : 'border-white/10 bg-white/[0.03]'].join(' ')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="max-w-[70%] truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/45" title={label ?? playerId}>{label ?? playerId}</span>
        {active && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-gold">Turn</span>}
      </div>
      <div className="relative flex flex-col gap-1">
        {displayIndex !== null && (
          <div
            aria-hidden="true"
            className={[
              'pointer-events-none absolute inset-x-0 rounded shadow-[0_0_0_1px_rgba(255,211,74,0.25)] transition-[transform,background-color,opacity] duration-300 ease-out',
              active ? 'bg-gold/20 opacity-100' : 'bg-gold/10 opacity-60',
            ].join(' ')}
            style={{ height: ROW_H, transform: `translateY(${displayIndex * (ROW_H + GAP)}px)` }}
          />
        )}
        {PHASES.map((phase, index) => (
          <div
            key={phase}
            style={{ height: ROW_H }}
            className={[
              'relative z-[1] flex items-center rounded px-2 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors duration-300',
              displayIndex === index ? (active ? 'text-gold' : 'text-gold/50') : 'text-white/40',
            ].join(' ')}
          >
            {phaseLabel(phase)} Phase
          </div>
        ))}
      </div>
    </section>
  );
}
