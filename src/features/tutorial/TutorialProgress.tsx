/**
 * "Tutorial / Chapter N / 12" header + progress bar (project spec mockup).
 * Purely presentational — reads chapterIndex/chapterCount, never GameState.
 */
export interface TutorialProgressProps {
  chapterIndex: number; // 0-based
  chapterCount: number;
  title: string;
}

export function TutorialProgress({ chapterIndex, chapterCount, title }: TutorialProgressProps) {
  const pct = Math.round(((chapterIndex + 1) / chapterCount) * 100);
  return (
    <div style={{ position: 'fixed', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 9996 }} className="w-[min(90vw,26rem)] select-none text-center">
      <p className="font-display text-xs font-black uppercase tracking-[0.24em] text-gold drop-shadow">
        Tutorial <span className="text-white/60">— Chapter {chapterIndex + 1} / {chapterCount}</span>
      </p>
      <p className="mt-0.5 font-display text-sm font-black uppercase tracking-[0.14em] text-white drop-shadow">{title}</p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
        <div className="h-full rounded-full bg-gradient-to-r from-gold/70 via-gold to-gold/70 transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
