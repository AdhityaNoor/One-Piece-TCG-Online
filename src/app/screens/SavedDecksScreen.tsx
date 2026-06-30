import { type CSSProperties, useMemo, useState } from 'react';
import type { DeckLoadResult, DeckStoreListEntry } from '../../cards/decks';
import type { Color } from '../../engine/state/card';
import { Button, CanvasMenuButton, GameCanvasScreen, Modal } from '../components';
import { CARD_COLOR_TOKENS } from '../lib/cardColors';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

const DECK_BOX_COLOR_HEX: Record<Color, string> = {
  red: '#b91c24',
  green: '#0f8a55',
  blue: '#1764ad',
  purple: '#7432b8',
  black: '#151a24',
  yellow: '#d9a928',
};

function buildDeckBoxSurfaceStyles(colors: Color[] | undefined): {
  front: CSSProperties;
  side: CSSProperties;
  top: CSSProperties;
} {
  const [first = 'blue', second] = colors && colors.length > 0 ? colors : ['blue'];
  const left = DECK_BOX_COLOR_HEX[first];
  const right = second ? DECK_BOX_COLOR_HEX[second] : left;
  const split = second
    ? `linear-gradient(90deg, ${left} 0 50%, ${right} 50% 100%)`
    : `linear-gradient(90deg, ${left}, ${left})`;

  return {
    front: {
      background: `linear-gradient(180deg, rgba(255,255,255,0.12), rgba(1,5,16,0.66)), ${split}`,
    },
    side: {
      background: `linear-gradient(90deg, rgba(1,5,16,0.72), rgba(255,255,255,0.13) 44%, rgba(1,5,16,0.82)), ${split}`,
    },
    top: {
      background: `linear-gradient(180deg, rgba(255,255,255,0.18), rgba(1,5,16,0.74)), ${split}`,
    },
  };
}

interface DeckBoxCardProps {
  entry: DeckStoreListEntry;
  deck: DeckLoadResult;
  onEdit: () => void;
  onDelete: () => void;
}

function DeckBoxCard({ entry, deck, onEdit, onDelete }: DeckBoxCardProps) {
  const loadedDeck = deck.ok ? deck.deck : null;
  const leader = loadedDeck?.leader;
  const imageUrl = leader?.imageUrl ?? null;
  const leaderName = leader?.definition.name ?? 'Unavailable deck';
  const cardCount = loadedDeck?.cards.reduce((sum, card) => sum + card.quantity, 0);
  const boxSurfaceStyles = buildDeckBoxSurfaceStyles(leader?.definition.colors);
  const updatedAt = (() => {
    const parsed = new Date(entry.updatedAt);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
  })();

  return (
    <article className="group flex min-w-0 justify-center overflow-visible py-2">
      <div className="relative h-[18.25rem] w-[15.75rem] overflow-visible [perspective:980px]">
        <div className="absolute left-6 top-7 h-[15.75rem] w-[11rem] transition-transform duration-300 [transform-style:preserve-3d] [transform:rotateY(-16deg)] group-hover:[transform:rotateY(-10deg)_translateY(-5px)]">
          <div
            className="absolute inset-0 z-20 overflow-hidden border-2 border-gold/55 p-3 shadow-[0_16px_0_rgba(1,5,16,0.78),_0_30px_44px_rgba(0,0,0,0.42)] [backface-visibility:hidden]"
            style={boxSurfaceStyles.front}
          >
            <div className="flex h-full items-center justify-center border border-gold/30 bg-black/35 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              {imageUrl ? (
                <img src={imageUrl} alt={leaderName} className="h-full max-h-full w-auto max-w-full object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.42)]" />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs font-black uppercase tracking-[0.16em] text-white/35">
                  No leader image
                </div>
              )}
            </div>

            <div className="absolute inset-0 flex flex-col justify-end bg-[linear-gradient(180deg,_rgba(0,0,0,0.18),_rgba(0,0,0,0.92))] p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <p className="truncate text-center font-display text-base font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]">{entry.name}</p>
              <p className="mt-1 truncate text-center text-[10px] font-bold uppercase tracking-[0.12em] text-gold/90">{leaderName}</p>
              <div className="mt-2 flex items-center justify-center gap-1">
                {loadedDeck?.leader.definition.colors.map((color) => (
                  <span key={color} className={['h-2.5 w-2.5 rounded-full ring-1 ring-white/60', CARD_COLOR_TOKENS[color].dotClassName].join(' ')} aria-hidden="true" />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">
                {cardCount !== undefined && <span>{cardCount}/50</span>}
                {updatedAt && <span>{updatedAt}</span>}
                {!deck.ok && <span>Load Error</span>}
              </div>
              <div className="mt-3 flex justify-center gap-2">
                {deck.ok && (
                  <Button variant="secondary" size="sm" onClick={onEdit}>
                    Edit
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={onDelete}>
                  Delete
                </Button>
              </div>
            </div>
          </div>

          <div
            className="absolute bottom-0 right-0 top-0 z-10 w-[5.5rem] border-y-2 border-r-2 border-gold/35 shadow-[inset_22px_0_34px_rgba(255,255,255,0.08),_inset_-18px_0_24px_rgba(0,0,0,0.42)]"
            style={{ ...boxSurfaceStyles.side, transform: 'translateX(5.5rem) rotateY(76deg)', transformOrigin: 'left center' }}
          />
          <div
            className="absolute left-0 right-0 top-0 z-10 h-[5.5rem] border-x-2 border-t-2 border-gold/35 shadow-[inset_0_-18px_32px_rgba(0,0,0,0.5),_inset_0_14px_28px_rgba(255,255,255,0.08)]"
            style={{ ...boxSurfaceStyles.top, transform: 'translateY(-5.5rem) rotateX(76deg)', transformOrigin: 'bottom center' }}
          />
        </div>
      </div>
    </article>
  );
}

export function SavedDecksScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const entries = useSavedDecksStore((state) => state.entries);
  const load = useSavedDecksStore((state) => state.load);
  const remove = useSavedDecksStore((state) => state.remove);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => entries.map((entry) => ({ entry, deck: load(entry.deckId) })), [entries, load]);
  const pendingDeleteName = pendingDeleteId ? entries.find((e) => e.deckId === pendingDeleteId)?.name ?? 'this deck' : null;

  return (
    <GameCanvasScreen
      kicker="Deck Rack"
      status={`${entries.length} saved`}
      title="Saved Decks"
      onBack={goBack}
      topRight={
        <CanvasMenuButton label="New Deck" size="sm" onClick={() => navigateTo({ screen: 'deck-builder' })} className="max-w-[10rem]" />
      }
    >
      <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col border-2 border-cyan-200/20 bg-[linear-gradient(180deg,_rgba(10,28,66,0.82),_rgba(3,9,24,0.9))] p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)]">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Roster</p>
          {rows.length === 0 ? (
            <div className="mt-3 border border-white/10 bg-black/24 p-6 text-center">
              <p className="text-sm text-slate-200/60">No saved decks yet.</p>
              <div className="mt-4 flex justify-center">
                <CanvasMenuButton label="Build First Deck" prominence="primary" size="sm" onClick={() => navigateTo({ screen: 'deck-builder' })} />
              </div>
            </div>
          ) : (
            <div className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              <div className="grid grid-cols-[repeat(auto-fill,15.75rem)] content-start justify-start gap-x-3 gap-y-4 pb-3">
                {rows.map(({ entry, deck }) => (
                  <DeckBoxCard
                    key={entry.deckId}
                    entry={entry}
                    deck={deck}
                    onEdit={() => navigateTo({ screen: 'deck-builder', deckIdToEdit: entry.deckId })}
                    onDelete={() => setPendingDeleteId(entry.deckId)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="border-2 border-gold/30 bg-black/26 p-4 shadow-[0_14px_0_rgba(1,5,16,0.55),_0_26px_45px_rgba(0,0,0,0.3)] backdrop-blur-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gold">Local Storage</p>
          <p className="mt-2 text-sm leading-6 text-slate-200/70">
            Saved decks are stored locally as stable snapshots. Editing or deleting here does not affect live card data browsing.
          </p>
        </section>
      </div>

      <Modal open={pendingDeleteId !== null} onClose={() => setPendingDeleteId(null)} title="Delete deck?">
        <div className="flex flex-col gap-4 p-5">
          <p className="text-sm text-slate-200/75">This permanently deletes "{pendingDeleteName}" from this browser's local storage. This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPendingDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => { if (pendingDeleteId) remove(pendingDeleteId); setPendingDeleteId(null); }}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </GameCanvasScreen>
  );
}
