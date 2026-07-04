import type { GameState } from '../../../engine/state/game';

const PHASES: GameState['currentPhase'][] = ['refresh', 'draw', 'don', 'main', 'end'];

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
  return (
    <section className={['rounded-lg border p-2', active ? 'border-gold/30 bg-gold/10' : 'border-white/10 bg-white/[0.03]'].join(' ')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="max-w-[70%] truncate text-[10px] font-black uppercase tracking-[0.16em] text-white/45" title={label ?? playerId}>{label ?? playerId}</span>
        {active && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-gold">Turn</span>}
      </div>
      <div className="flex flex-col gap-1">
        {PHASES.map((phase) => (
          <div
            key={phase}
            className={[
              'rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]',
              currentPhase === phase && active ? 'bg-gold/20 text-gold' : 'text-white/40',
            ].join(' ')}
          >
            {phaseLabel(phase)} Phase
          </div>
        ))}
      </div>
    </section>
  );
}
