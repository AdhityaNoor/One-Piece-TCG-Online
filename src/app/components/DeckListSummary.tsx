/**
 * One row in the Saved Decks list (Task 11). Deliberately takes flat,
 * optional display props rather than a `SavedDeck`/`DeckStoreListEntry`
 * directly: `DeckStoreListEntry` (deckStorage.ts) only carries
 * {deckId, name, updatedAt} by design (cheap listing, no per-deck parse), so
 * whether/how richer fields (leader art, colors, card count) get loaded for
 * display is a Task 11 data-flow decision, not something this presentational
 * component should assume.
 */
import type { ReactNode } from 'react';
import type { DeckFormatStatus } from '../../cards/format';
import type { Color } from '../../engine/state/card';
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
import { CardImage } from './CardImage';
import { DeckFormatBadge } from './DeckFormatBadge';

export interface DeckListSummaryProps {
  name: string;
  updatedAt: string;
  leaderName?: string;
  leaderImageUrl?: string | null;
  colors?: Color[];
  /** Main-deck card count, e.g. to show "50/50". Omitted entirely when unknown. */
  cardCount?: number;
  /** Tournament format status from evaluateSavedDeckFormatStatus — Legal / Extra Legal / Banned. */
  formatStatus?: DeckFormatStatus;
  onSelect?: () => void;
  /** Highlights this row as the current pick — e.g. Deck Select's "which deck is Player 1 using" state. Purely visual, mirrors CardTile's `selected`. */
  selected?: boolean;
  /** Edit/Delete/Play buttons — left to the caller so this component doesn't bake in a fixed action set. */
  actions?: ReactNode;
}

export function DeckListSummary({ name, updatedAt, leaderName, leaderImageUrl, colors, cardCount, formatStatus, onSelect, selected, actions }: DeckListSummaryProps) {
  const formattedDate = (() => {
    const parsed = new Date(updatedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
  })();

  return (
    <div
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      className={[
        'flex items-center gap-2 border border-white/10 bg-[#08101f] p-2 text-slate-100 shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition-all sm:gap-3 sm:rounded-[1.4rem] sm:bg-gradient-to-br sm:from-white/12 sm:to-white/5 sm:p-3 sm:shadow-[0_14px_30px_rgba(0,0,0,0.18)]',
        onSelect ? 'cursor-pointer hover:-translate-y-0.5 hover:border-white/20 hover:from-white/16 hover:to-white/8' : '',
        selected ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-navy-950' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="w-12 flex-shrink-0 sm:w-12">
        <CardImage src={leaderImageUrl ?? null} alt={leaderName ?? name} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5">
          <p className="truncate text-[13px] font-bold uppercase leading-tight tracking-[0.08em] text-white sm:text-sm">{name}</p>
          {formatStatus && <DeckFormatBadge status={formatStatus} size="sm" className="w-fit" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-200/60 sm:text-[11px]">
          {leaderName && <span className="truncate">{leaderName}</span>}
          {cardCount !== undefined && <span>{cardCount}/50 cards</span>}
          {formattedDate && <span>Updated {formattedDate}</span>}
        </div>
        {colors && colors.length > 0 && (
          <div className="mt-1 flex gap-1">
            {colors.map((color) => (
              <span key={color} className={['h-2.5 w-2.5 rounded-full', CARD_COLOR_TOKENS[color].dotClassName].join(' ')} aria-hidden="true" />
            ))}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">{actions}</div>}
    </div>
  );
}
