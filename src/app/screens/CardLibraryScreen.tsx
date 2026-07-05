/**
 * Card Library screen (Task 9) - browse-only. Pick a set, optionally narrow
 * by text/color/category, page through results, zoom any card. All
 * fetching/caching/filtering/pagination lives in the shared CardSetBrowser
 * controls/results and cardLibraryStore; this component only supplies the
 * browse layout and the per-tile renderer.
 */
import type { ReactNode } from 'react';
import { CanvasMenuButton } from '../components';
import { useCardLibraryStore } from '../store/cardLibraryStore';
import { useNavigationStore } from '../store/navigationStore';
import { CardLibraryResultTile } from './CardLibraryResultTile';
import { CardSetBrowserControls, CardSetBrowserResults } from './shared';

export function CardLibraryScreen() {
  const goBack = useNavigationStore((state) => state.goBack);

  const sets = useCardLibraryStore((state) => state.sets);
  const selectedSetId = useCardLibraryStore((state) => state.selectedSetId);

  const selectedSetName = sets.find((s) => s.set_id === selectedSetId)?.set_name;

  return (
    <CardLibraryGameShell onBack={goBack}>
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
              gridClassName="grid content-start gap-x-4 gap-y-6"
              // ~2x the old 9.25rem default, and responsive: auto-fill lays out as
              // many columns as fit, each at least ~18.5rem (min() shrinks to the
              // container on narrow screens) and 1fr so they grow to fill the row —
              // so tile size scales with the viewport/panel width.
              gridStyle={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(18.5rem, 100%), 1fr))' }}
              renderEntry={(entry) => (
                <div key={entry.cardNumber} className="w-full">
                  <CardLibraryResultTile entry={entry} setName={selectedSetName} />
                </div>
              )}
            />
          </div>
        </section>
      </div>
    </CardLibraryGameShell>
  );
}

function CardLibraryGameShell({ onBack, headerRight, children }: { onBack?: () => void; headerRight?: ReactNode; children: ReactNode }) {
  return (
    <main className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#071126] font-body text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-24 grayscale" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,_rgba(255,211,74,0.14),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.36)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-3 px-3 py-3 sm:px-4">
        {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" className="max-w-[7rem]" />}
        {headerRight && <div className="flex flex-shrink-0 items-center gap-2">{headerRight}</div>}
      </div>
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-3">{children}</section>
    </main>
  );
}
