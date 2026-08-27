/**
 * Alternate-art picker.
 *
 * Replaces the old `PrintingVariantPicker` strip, which rendered every printing as a
 * 28x40px thumbnail (40x56 at sm) crammed into an absolutely-positioned bar across the
 * bottom of the card it belonged to. At that size the arts were indistinguishable —
 * which defeats the entire point of choosing between them — and on a phone the strip
 * covered the card art AND sat under the +/View buttons, so it was near-impossible to
 * hit the one you wanted.
 *
 * Here each printing gets a real card-sized tile with its set name, so the choice is
 * made by LOOKING at the art. The grid is responsive and the modal scrolls, so a card
 * with a dozen printings works the same on a phone as on a desktop.
 */
import { Modal } from '../../components';
import type { CardPrintingRef } from '../../../cards/library';
import { resolveAssetUrl } from '../../lib/assetUrl';

/** "Base" for the canonical print, else the variant suffix (P1, P2 …) the image id carries. */
export function variantLabel(cardNumber: string, printingImageId: string, index: number): string {
  if (printingImageId === cardNumber) return 'Base';
  const prefix = `${cardNumber}_`;
  return printingImageId.startsWith(prefix) ? printingImageId.slice(prefix.length).toUpperCase() : `Art ${index + 1}`;
}

export interface PrintingPickerModalProps {
  open: boolean;
  onClose: () => void;
  cardName: string;
  cardNumber: string;
  printings: CardPrintingRef[];
  selectedPrintingImageId: string;
  onSelect: (printingImageId: string) => void;
}

export function PrintingPickerModal({
  open,
  onClose,
  cardName,
  cardNumber,
  printings,
  selectedPrintingImageId,
  onSelect,
}: PrintingPickerModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${cardName} — Choose Art`}
      maxWidthClassName="max-w-4xl"
      bodyClassName="max-h-[78vh] overflow-y-auto overscroll-contain p-4"
    >
      <p className="mb-3 text-xs leading-5 text-slate-200/60">
        {printings.length} print{printings.length === 1 ? '' : 's'} of {cardNumber}. Tap one to use it in your deck.
      </p>
      {/* auto-fill down to 7rem: 2 columns on a 390px phone, more as width allows. */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
        {printings.map((printing, index) => {
          const selected = printing.printingImageId === selectedPrintingImageId;
          const label = variantLabel(cardNumber, printing.printingImageId, index);
          const url = resolveAssetUrl(printing.imageUrl) ?? undefined;

          return (
            <button
              key={printing.printingImageId}
              type="button"
              onClick={() => {
                onSelect(printing.printingImageId);
                onClose();
              }}
              aria-pressed={selected}
              className={[
                'group relative block w-full overflow-hidden border text-left transition',
                selected
                  ? 'border-[rgb(var(--op-gold-rgb))] shadow-[0_0_0_2px_rgb(var(--op-gold-rgb)/0.6)]'
                  : 'border-white/15 hover:border-[rgb(var(--op-gold-rgb)/0.7)] hover:-translate-y-0.5',
              ].join(' ')}
            >
              <div className="relative aspect-[63/88] w-full bg-black/40">
                {url ? (
                  <img src={url} alt={`${cardName} ${label}`} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center px-2 text-center font-heading text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                    No art available
                  </span>
                )}
                {selected && (
                  <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center border border-black/40 bg-[rgb(var(--op-gold-rgb))] font-heading text-xs font-black text-black shadow-[2px_2px_0_rgba(0,0,0,0.45)]">
                    ✓
                  </span>
                )}
              </div>
              <div className="border-t border-white/10 bg-black/70 px-2 py-1.5">
                <p className="font-heading text-[11px] font-black uppercase leading-none tracking-[0.08em] text-[rgb(var(--op-gold-rgb))]">{label}</p>
                {printing.setName && <p className="mt-1 truncate text-[10px] leading-tight text-slate-200/60">{printing.setName}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/**
 * The button that opens the picker, sized as a real tap target (the old strip's tiles
 * were 28px wide — half the 44px minimum). Renders nothing for a single-print card.
 */
export function PrintingPickerButton({
  count,
  onClick,
  className,
}: {
  count: number;
  onClick: () => void;
  className?: string;
}) {
  if (count <= 1) return null;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={`Choose from ${count} alternate arts`}
      className={[
        'flex h-8 min-w-[2.75rem] items-center justify-center gap-1 whitespace-nowrap border border-white/25 bg-black/80 px-2 font-heading text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_4px_0_rgba(0,0,0,0.5)] transition hover:border-[rgb(var(--op-gold-rgb))] hover:text-[rgb(var(--op-gold-rgb))] active:translate-y-[2px]',
        className ?? '',
      ].join(' ')}
    >
      Art {count}
    </button>
  );
}
