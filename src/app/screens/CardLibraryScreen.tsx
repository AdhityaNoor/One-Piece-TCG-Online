/**
 * Card Library screen (Task 9) - browse-only. Pick a set, optionally narrow
 * by text/color/category, page through results, zoom any card. All
 * fetching/caching/filtering/pagination lives in the shared CardSetBrowser
 * controls/results and cardLibraryStore; this component only supplies the
 * browse layout and the per-tile renderer.
 */
import type { ReactNode } from 'react';
import type { CardLibraryEntry } from '../../cards/library';
import { CardDetailModal, CardTile } from '../components';
import type { CardTileData } from '../components';
import { useCardLibraryStore } from '../store/cardLibraryStore';
import { useNavigationStore } from '../store/navigationStore';
import { CardSetBrowserControls, CardSetBrowserResults } from './shared';

function toTileData(entry: CardLibraryEntry): CardTileData {
  return {
    cardNumber: entry.cardNumber,
    name: entry.definition.name,
    imageUrl: entry.printings[0]?.imageUrl ?? null,
    colors: entry.definition.colors,
    category: entry.definition.category,
  };
}

export function CardLibraryScreen() {
  const goBack = useNavigationStore((state) => state.goBack);

  const sets = useCardLibraryStore((state) => state.sets);
  const selectedSetId = useCardLibraryStore((state) => state.selectedSetId);
  const entriesBySetId = useCardLibraryStore((state) => state.entriesBySetId);
  const selectedCardNumber = useCardLibraryStore((state) => state.selectedCardNumber);
  const selectCard = useCardLibraryStore((state) => state.selectCard);

  const selectedSetName = sets.find((s) => s.set_id === selectedSetId)?.set_name;
  const selectedEntry: CardLibraryEntry | null =
    selectedSetId && selectedCardNumber ? entriesBySetId[selectedSetId]?.find((entry) => entry.cardNumber === selectedCardNumber) ?? null : null;

  return (
    <CardLibraryGameShell
      title="Card Library"
      headerRight={
        <button
          type="button"
          onClick={goBack}
          className="h-10 border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
        >
          Back
        </button>
      }
    >
      <div className="grid h-full min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="h-full min-h-0 overflow-hidden">
          <section className="op-panel flex h-full min-h-0 flex-col overflow-hidden p-3">
            <p className="op-section-title">Browser Controls</p>
            <div className="mt-2 min-h-0 flex-1 overflow-auto">
              <CardSetBrowserControls />
            </div>
          </section>
        </aside>

        <section className="op-panel flex min-h-0 flex-col overflow-hidden p-3">
          <p className="op-section-title">Browsing Results</p>
          <p className="mt-1 text-sm leading-6 text-slate-200/70">Browse or search the card library below.</p>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <CardSetBrowserResults
              gridClassName="grid content-start gap-x-3 gap-y-5"
              gridStyle={{ gridTemplateColumns: 'repeat(auto-fill, 9.25rem)' }}
              renderEntry={(entry) => (
                <div key={entry.cardNumber} className="w-[9.25rem]">
                  <CardTile card={toTileData(entry)} onClick={() => selectCard(entry.cardNumber)} />
                </div>
              )}
            />
          </div>
        </section>
      </div>

      <CardDetailModal
        open={selectedEntry !== null}
        onClose={() => selectCard(null)}
        definition={selectedEntry?.definition ?? null}
        imageUrl={selectedEntry?.printings[0]?.imageUrl ?? null}
        setName={selectedSetName}
      />
    </CardLibraryGameShell>
  );
}

function CardLibraryGameShell({ title, headerRight, children }: { title: string; headerRight?: ReactNode; children: ReactNode }) {
  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#071126] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-24 grayscale" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_rgba(255,211,74,0.14),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.36)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <header className="relative z-10 flex min-h-16 flex-shrink-0 items-center justify-between gap-3 border-b-2 border-gold/55 bg-black/28 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.4)] backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1 bg-gold shadow-[0_0_18px_rgba(217,164,65,0.45)]" aria-hidden="true" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Local Hotseat</p>
            <h1 className="font-display text-lg font-black uppercase tracking-[0.12em] text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]">{title}</h1>
          </div>
        </div>
        {headerRight && <div className="flex flex-shrink-0 items-center gap-2">{headerRight}</div>}
      </header>
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3">{children}</section>
    </main>
  );
}
