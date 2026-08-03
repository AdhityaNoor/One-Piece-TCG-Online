/**
 * Accessories screen — a cosmetic sub-screen of deck create/edit (Decks tab).
 * Lets a deck pick three PURELY COSMETIC things, each browsed in the same
 * gallery-grid style as the Card Library:
 *   1. Main Deck Sleeves  -> DeckAccessories.mainSleeve
 *   2. DON!! Sleeves       -> DeckAccessories.donSleeve
 *   3. DON!! Card art       -> DeckAccessories.donCardArt
 *
 * Both sleeve galleries share the same TCGplayer-sourced sleeve catalog (per
 * spec: "Both Main Deck Sleeves and Don Sleeves have the same options"). The
 * DON!! art gallery is currently the single bundled default (placeholder —
 * see cards/accessories/donArtCatalog.ts).
 *
 * State + persistence live entirely in deckBuilderStore: selecting an option
 * calls setAccessory, which snapshots the choice onto the in-progress deck
 * and (when a saved deck is being edited) writes it straight through to
 * storage, so the pick is reflected the next time the deck is loaded into a
 * match (see matchStore buildAccessoriesByPlayer -> CardBackArt).
 *
 * This screen never touches cards, rules, or the engine — it is Layer 3 only.
 */
import { useEffect, type ReactNode } from 'react';
import { CanvasMenuButton, CardImage } from '../components';
import { useHexDriftDelay } from '../hooks/useHexDriftDelay';
import { useCurrentScreen, useNavigationStore } from '../store/navigationStore';
import { useDeckBuilderStore, type DeckAccessorySlot } from '../store/deckBuilderStore';
import { useSavedDecksStore } from '../store/savedDecksStore';
import { useAccessoryCatalogStore } from '../store/accessoryCatalogStore';
import type { AccessoryOption } from '../../cards/accessories';

const DEFAULT_TILE_IMAGES: Record<DeckAccessorySlot, string> = {
  mainSleeve: '/ui/card-back.png',
  donSleeve: '/ui/don-deck-back.png',
  donCardArt: '/ui/don-token.png',
};

function AccessoryTile({ imageUrl, label, selected, onSelect }: { imageUrl: string; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'group relative flex w-full flex-col items-center gap-1 rounded-none border p-1 transition',
        selected
          ? 'border-[rgb(var(--op-gold-rgb))] bg-[rgb(var(--op-gold-rgb)/0.12)] shadow-[0_0_0_2px_rgb(var(--op-gold-rgb)/0.35)]'
          : 'border-white/10 bg-black/25 hover:border-[rgb(var(--op-gold-rgb)/0.6)]',
      ].join(' ')}
      aria-pressed={selected}
    >
      <div className="aspect-[63/88] w-full overflow-hidden">
        <CardImage src={imageUrl} alt={label} className="h-full w-full rounded-none" />
      </div>
      <span className="line-clamp-2 min-h-[2rem] text-center text-[11px] font-semibold leading-tight text-slate-100/85">{label}</span>
      {selected && (
        <span className="absolute right-1 top-1 border border-[rgb(var(--op-gold-rgb)/0.5)] bg-black/80 px-1 py-0.5 font-heading text-[9px] font-black uppercase tracking-[0.08em] text-[rgb(var(--op-gold-rgb))]">
          Selected
        </span>
      )}
    </button>
  );
}

function AccessorySection({
  title,
  subtitle,
  slot,
  options,
}: {
  title: string;
  subtitle: string;
  slot: DeckAccessorySlot;
  options: AccessoryOption[];
}) {
  const selection = useDeckBuilderStore((state) => state.accessories[slot]);
  const setAccessory = useDeckBuilderStore((state) => state.setAccessory);
  const selectedOptionId = selection.optionId;

  return (
    <section className="op-panel op-panel-plain flex min-h-0 flex-col overflow-hidden p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="op-section-title">{title}</p>
        <p className="text-xs text-slate-200/55">{options.length + 1} options</p>
      </div>
      <p className="mt-0.5 text-xs leading-5 text-slate-200/60">{subtitle}</p>
      <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] content-start gap-2 overflow-y-auto sm:grid-cols-[repeat(auto-fill,7rem)]">
        <AccessoryTile
          imageUrl={DEFAULT_TILE_IMAGES[slot]}
          label="Default"
          selected={selectedOptionId === null}
          onSelect={() => setAccessory(slot, null)}
        />
        {options.map((option) => (
          <AccessoryTile
            key={option.id}
            imageUrl={option.thumbnailUrl}
            label={option.name}
            selected={selectedOptionId === option.id}
            onSelect={() => setAccessory(slot, option)}
          />
        ))}
      </div>
    </section>
  );
}

export function AccessoriesScreen() {
  const goBack = useNavigationStore((state) => state.goBack);
  const current = useCurrentScreen();
  const deckIdToEdit = current.screen === 'accessories' ? current.deckIdToEdit : undefined;

  const editingDeckId = useDeckBuilderStore((state) => state.editingDeckId);
  const startEditingDeck = useDeckBuilderStore((state) => state.startEditingDeck);
  const load = useSavedDecksStore((state) => state.load);

  const sleeves = useAccessoryCatalogStore((state) => state.sleeves);
  const donArts = useAccessoryCatalogStore((state) => state.donArts);
  const loadCatalog = useAccessoryCatalogStore((state) => state.load);

  // Pull the authoritative catalog (MongoDB master data + Blob images) once;
  // falls back to the bundled static catalog when no backend is configured.
  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  // If the builder store isn't already holding this deck (e.g. a direct
  // navigation, or a reload), load it so the galleries reflect saved picks.
  useEffect(() => {
    if (deckIdToEdit && editingDeckId !== deckIdToEdit) {
      const result = load(deckIdToEdit);
      if (result.ok) startEditingDeck(result.deck);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdToEdit]);

  return (
    <AccessoriesGameShell onBack={goBack}>
      <div className="op-panel op-panel-plain flex flex-shrink-0 items-center justify-between gap-3 p-3">
        <div>
          <p className="op-section-title">Accessories</p>
          <p className="mt-0.5 text-sm text-slate-200/70">Customize the sleeves and DON!! art for this deck. Changes are saved to the deck and shown in your matches.</p>
        </div>
      </div>

      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto xl:grid-cols-3 xl:overflow-hidden">
        <AccessorySection
          title="Main Deck Sleeves"
          subtitle="Shown behind your deck, life, and hand."
          slot="mainSleeve"
          options={sleeves}
        />
        <AccessorySection
          title="DON!! Sleeves"
          subtitle="Shown behind your DON!! deck."
          slot="donSleeve"
          options={sleeves}
        />
        <AccessorySection
          title="DON!! Card Art"
          subtitle="The DON!! card face used in play."
          slot="donCardArt"
          options={donArts}
        />
      </div>
    </AccessoriesGameShell>
  );
}

function AccessoriesGameShell({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  const hexDriftDelay = useHexDriftDelay();
  return (
    <main className="op-theme-blue relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-[#13329a] font-body text-white xl:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[url('/ui/bg.png')] bg-cover bg-center op-bg-tint opacity-80" />
      <div aria-hidden="true" style={hexDriftDelay} className="op-hex-bg pointer-events-none absolute inset-0" />
      <div className="relative z-10 flex flex-shrink-0 items-center justify-between gap-3 px-3 py-3">
        {onBack && <CanvasMenuButton label="Back" onClick={onBack} size="sm" className="max-w-[7rem]" />}
      </div>
      <section className="relative z-10 flex min-h-0 flex-1 flex-col overflow-visible px-3 pb-4 pt-2 xl:overflow-hidden xl:pb-3">{children}</section>
    </main>
  );
}
