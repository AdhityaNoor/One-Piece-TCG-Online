/**
 * One browse-only card tile in the Card Library grid. Unlike the deck-builder
 * tile it never adds to a deck — it only lets you flip between a card's art
 * variants (base + alternate arts) and zoom the selected one. Art variants come
 * from `entry.printings`; the picker is the same one the deck builder uses.
 */
import { useState } from 'react';
import type { CardLibraryEntry } from '../../cards/library';
import { CardDetailModal, CardImage } from '../components';
import { PrintingVariantPicker } from './deckBuilder/PrintingVariantPicker';

export interface CardLibraryResultTileProps {
  entry: CardLibraryEntry;
  setName?: string;
}

export function CardLibraryResultTile({ entry, setName }: CardLibraryResultTileProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedPrintingImageId, setSelectedPrintingImageId] = useState(entry.printings[0]?.printingImageId ?? entry.cardNumber);

  const selectedPrinting = entry.printings.find((printing) => printing.printingImageId === selectedPrintingImageId) ?? entry.printings[0] ?? null;
  const imageUrl = selectedPrinting?.imageUrl ?? null;
  const printCount = entry.printings.length;

  return (
    <>
      <div className="w-full">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setZoomOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setZoomOpen(true);
            }
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setZoomOpen(true);
          }}
          className="group relative block w-full cursor-pointer text-left"
          title={printCount > 1 ? `${entry.definition.name} — ${printCount} arts (hover to switch)` : entry.definition.name}
        >
          <CardImage src={imageUrl} alt={entry.definition.name} className="rounded-none" />

          {printCount > 1 && (
            <span className="absolute right-1 top-1 z-10 border border-[rgb(var(--op-gold-rgb)/0.5)] bg-black/80 px-1.5 py-0.5 font-heading text-[9px] font-black uppercase tracking-[0.08em] text-[rgb(var(--op-gold-rgb))] shadow-[2px_2px_0_rgba(0,0,0,0.45)]">
              {printCount} arts
            </span>
          )}

          <div className="absolute inset-0 flex items-center justify-center bg-black/28 opacity-100 transition sm:bg-black/0 sm:opacity-0 sm:group-hover:bg-black/45 sm:group-hover:opacity-100">
            <span className="border border-[rgb(var(--op-gold-rgb)/0.5)] bg-white px-2.5 py-1 font-heading text-[10px] font-black uppercase tracking-[0.08em] text-navy-950 shadow-[0_5px_0_rgba(0,0,0,0.45)]">
              View
            </span>
          </div>

          <div className="opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100" onClick={(event) => event.stopPropagation()}>
            <PrintingVariantPicker
              cardNumber={entry.cardNumber}
              printings={entry.printings}
              selectedPrintingImageId={selectedPrintingImageId}
              onSelect={setSelectedPrintingImageId}
            />
          </div>

          <span className="pointer-events-none absolute inset-0 ring-0 ring-[rgb(var(--op-gold-rgb))] transition group-hover:ring-2" />
        </div>

        <div className="mt-1 min-h-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-white" title={entry.definition.name}>
            {entry.definition.name}
          </p>
          <p className="text-[10px] text-slate-200/60">{entry.cardNumber}</p>
        </div>
      </div>

      <CardDetailModal
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        definition={entry.definition}
        imageUrl={imageUrl}
        setName={selectedPrinting?.setName ?? setName}
        accentClassName="op-theme-blue"
      />
    </>
  );
}
