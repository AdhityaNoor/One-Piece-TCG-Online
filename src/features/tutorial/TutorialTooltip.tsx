/**
 * Floating instructor dialogue bubble. Positions itself near the current
 * spotlight (below it if there's room, above otherwise) so it never covers
 * the thing it's explaining; falls back to a bottom-center dock when there's
 * no live anchor (pure-narration chapters).
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { resolveAnchorRect } from './tutorialAnchors';
import type { TutorialAnchorId, TutorialDialogueLine } from './types';

export interface TutorialTooltipProps {
  anchorId: TutorialAnchorId;
  lines: TutorialDialogueLine[];
  /** Index into `lines` currently shown — TutorialManager advances this on tap before the chapter's own objective becomes live. */
  lineIndex: number;
  onAdvanceLine: () => void;
  objective: string;
  showObjective: boolean;
  showSuccess: boolean;
  successLine: string;
}

function useTooltipPosition(anchorId: TutorialAnchorId): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ bottom: 180, left: '50%', transform: 'translateX(-50%)' });

  useEffect(() => {
    const rect = resolveAnchorRect(anchorId);
    if (!rect) {
      setStyle({ bottom: 180, left: '50%', transform: 'translateX(-50%)' });
      return;
    }
    const spaceBelow = window.innerHeight - rect.top - rect.height;
    if (spaceBelow > 220) {
      setStyle({ top: rect.top + rect.height + 18, left: Math.min(Math.max(rect.left, 16), window.innerWidth - 340), transform: 'none' });
    } else {
      setStyle({ top: Math.max(rect.top - 190, 16), left: Math.min(Math.max(rect.left, 16), window.innerWidth - 340), transform: 'none' });
    }
  }, [anchorId]);

  return style;
}

export function TutorialTooltip({ anchorId, lines, lineIndex, onAdvanceLine, objective, showObjective, showSuccess, successLine }: TutorialTooltipProps) {
  const position = useTooltipPosition(anchorId);
  const line = lines[Math.min(lineIndex, lines.length - 1)];
  const hasMoreDialogue = lineIndex < lines.length - 1;

  return (
    <div
      style={{ position: 'fixed', zIndex: 9995, width: 320, maxWidth: 'calc(100vw - 32px)', ...position }}
      className="rounded-xl border border-[rgb(var(--op-gold-rgb)/0.55)] bg-[#0b1c3e]/95 p-4 shadow-2xl backdrop-blur"
    >
      <p className="font-display text-[11px] font-black uppercase tracking-[0.2em] text-gold">Instructor</p>

      {showSuccess ? (
        <p className="mt-2 text-sm font-semibold leading-6 text-emerald-300">{successLine}</p>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-white/90">{line.text}</p>
          {showObjective && (
            <div className="mt-3 rounded-lg border border-white/15 bg-white/5 p-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/40">Current Objective</p>
              <p className="mt-1 text-xs font-semibold text-white/85">{objective}</p>
            </div>
          )}
        </>
      )}

      {!showSuccess && hasMoreDialogue && (
        <button
          type="button"
          onClick={onAdvanceLine}
          className="mt-3 w-full rounded-md border border-white/20 bg-white/10 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-white/85 transition hover:bg-white/20"
        >
          Continue
        </button>
      )}
    </div>
  );
}
