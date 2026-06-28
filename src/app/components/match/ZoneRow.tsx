/**
 * Horizontal "field row" container for a zone's BoardCardTiles/DonChips —
 * the spatial-board replacement for ZoneSection's vertical text list. Pure
 * presentational, same as ZoneSection: it has no idea what an action is,
 * everything tappable comes pre-computed from the caller (PlayerBoardPanel).
 */
import type { ReactNode } from 'react';

export interface ZoneRowProps {
  label: string;
  children: ReactNode;
  isEmpty?: boolean;
  emptyLabel?: string;
}

export function ZoneRow({ label, children, isEmpty, emptyLabel = 'Empty' }: ZoneRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-[9px] font-bold uppercase tracking-[0.18em] text-white/30">{label}</p>
      {isEmpty ? (
        <p className="rounded-lg border border-dashed border-white/10 px-2 py-2 text-center text-[10px] text-white/25">{emptyLabel}</p>
      ) : (
        <div className="flex flex-wrap items-end justify-center gap-1.5 px-1">{children}</div>
      )}
    </div>
  );
}
