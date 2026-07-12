import type { CardPrintingRef } from '../../../cards/library';
import { resolveAssetUrl } from '../../lib/assetUrl';

function variantLabel(cardNumber: string, printingImageId: string, index: number): string {
  if (printingImageId === cardNumber) return 'Base';
  const prefix = `${cardNumber}_`;
  return printingImageId.startsWith(prefix) ? printingImageId.slice(prefix.length).toUpperCase() : `Art ${index + 1}`;
}

export interface PrintingVariantPickerProps {
  cardNumber: string;
  printings: CardPrintingRef[];
  selectedPrintingImageId: string;
  onSelect: (printingImageId: string) => void;
}

export function PrintingVariantPicker({ cardNumber, printings, selectedPrintingImageId, onSelect }: PrintingVariantPickerProps) {
  if (printings.length <= 1) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-1 bottom-1 z-20 flex max-h-[3.5rem] gap-1 overflow-x-auto border border-[rgb(var(--op-gold-rgb)/0.4)] bg-black/82 p-1 shadow-[0_8px_18px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:max-h-[4.75rem]">
      {printings.map((printing, index) => {
        const selected = printing.printingImageId === selectedPrintingImageId;
        const label = variantLabel(cardNumber, printing.printingImageId, index);

        return (
          <button
            key={printing.printingImageId}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(printing.printingImageId);
            }}
            className={[
              'relative h-10 w-7 flex-shrink-0 overflow-hidden border bg-black/70 transition hover:-translate-y-0.5 sm:h-14 sm:w-10',
              selected ? 'border-[rgb(var(--op-gold-rgb))] shadow-[0_0_0_1px_rgb(var(--op-gold-rgb)/0.72)]' : 'border-white/20 hover:border-[rgb(var(--op-gold-rgb)/0.65)]',
            ].join(' ')}
            title={`Use ${label} art`}
          >
            {printing.imageUrl ? (
              <img src={resolveAssetUrl(printing.imageUrl) ?? undefined} alt={label} className="h-full w-full object-contain" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[8px] font-black uppercase tracking-[0.08em] text-white/35">No art</span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/80 px-0.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.04em] text-white">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
