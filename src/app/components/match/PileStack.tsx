/**
 * Face-down stack visual for a zone the player never browses card-by-card
 * on the field itself (Deck, DON!! Deck, Trash) — a real OPTCG board shows
 * these as a single pile with a count, not a fanned row of every card in
 * it. Trash is the one pile that's actually inspectable (onClick wired by
 * the caller), since "what got KO'd" is useful debug/board info; Deck/DON!!
 * Deck stay sealed — no card-order info should ever leak to the UI from a
 * secret zone just because we're in a debug build.
 */
export type PileStackVariant = 'deck' | 'don' | 'trash';

const VARIANT_CLASSES: Record<PileStackVariant, string> = {
  deck: 'from-slate-700 to-slate-900 border-white/10',
  don: 'from-amber-700 to-amber-900 border-amber-400/20',
  trash: 'from-zinc-800 to-black border-white/10',
};

export interface PileStackProps {
  label: string;
  count: number;
  variant: PileStackVariant;
  size?: 'compact' | 'field';
  onClick?: () => void;
}

export function PileStack({ label, count, variant, size = 'compact', onClick }: PileStackProps) {
  const isFieldDeck = variant === 'deck' && size === 'field';

  return (
    <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
      <button
        type="button"
        disabled={!onClick}
        onClick={onClick}
        style={isFieldDeck ? { width: 150, height: 210 } : { width: 40, height: 56 }}
        className={[
          'relative flex items-center justify-center overflow-hidden rounded-md border text-[10px] font-extrabold text-white/70 shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform',
          isFieldDeck ? 'border-blue-200/20 bg-[linear-gradient(145deg,_#17233f,_#0b1228)]' : `bg-gradient-to-br ${VARIANT_CLASSES[variant]}`,
          onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
        ].join(' ')}
      >
        {isFieldDeck && (
          <>
            <div className="absolute inset-[10%] rounded border border-gold/25" />
            <div className="absolute inset-[23%] rounded-full border border-gold/40" />
            <div className="absolute bottom-[10%] left-1/2 h-px w-1/2 -translate-x-1/2 bg-gold/35" />
          </>
        )}
        <span className={isFieldDeck ? 'relative z-10 rounded-md bg-black/35 px-2 py-1 text-xs' : 'relative z-10'}>{count}</span>
      </button>
      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</span>
    </div>
  );
}
