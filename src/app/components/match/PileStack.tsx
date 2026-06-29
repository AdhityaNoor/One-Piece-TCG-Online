/**
 * Face-down stack visual for a zone the player never browses card-by-card
 * on the field itself (Deck, DON!! Deck, Trash) — a real OPTCG board shows
 * these as a single pile with a count, not a fanned row of every card in
 * it. Trash is the one pile that's actually inspectable (onClick wired by
 * the caller), since "what got KO'd" is useful debug/board info; Deck/DON!!
 * Deck stay sealed — no card-order info should ever leak to the UI from a
 * secret zone just because we're in a debug build.
 *
 * The field-size Deck pile (isFieldDeck below) uses the same CardBackArt
 * illustration as the Life cards (tone="navy") instead of a hand-drawn
 * gradient, so Deck and Life read as the same physical card back.
 */
import { CardBackArt } from './CardBackArt';
import { cqh } from './boardScale';
import { CountBadge } from './CountBadge';

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
        style={isFieldDeck ? { width: cqh(150), height: cqh(210) } : { width: cqh(40), height: cqh(56) }}
        className={[
          'relative flex items-center justify-center overflow-hidden rounded-md border text-[10px] font-extrabold text-white/70 shadow-[0_4px_10px_rgba(0,0,0,0.3)] transition-transform',
          isFieldDeck ? 'border-none' : `bg-gradient-to-br ${VARIANT_CLASSES[variant]}`,
          onClick ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
        ].join(' ')}
      >
        {isFieldDeck ? (
          <>
            <div className="absolute inset-0">
              <CardBackArt tone="navy" />
            </div>
            <CountBadge count={count} />
          </>
        ) : (
          <span className="relative z-10">{count}</span>
        )}
      </button>
      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">{label}</span>
    </div>
  );
}
