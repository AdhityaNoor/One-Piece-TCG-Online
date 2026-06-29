/**
 * Full-viewport title/menu screen. The button shapes are intentionally
 * isolated here so they can later be replaced with bitmap button assets
 * without touching navigation behavior.
 */
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

interface CanvasMenuButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | number;
  prominence?: 'primary' | 'secondary';
}

function CanvasMenuButton({ label, onClick, disabled, badge, prominence = 'secondary' }: CanvasMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative h-14 w-full max-w-[21rem] select-none overflow-visible px-7 text-center font-heading text-base font-black uppercase tracking-[0.12em] text-white transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#061024]',
        disabled ? 'cursor-not-allowed opacity-40 saturate-50' : 'hover:-translate-y-1 active:translate-y-0.5',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'absolute inset-0 -skew-x-12 border-2 shadow-[0_8px_0_rgba(1,5,16,0.78),_0_18px_28px_rgba(0,0,0,0.34)] transition-all duration-200',
          'before:absolute before:inset-[5px] before:border before:border-white/16 before:content-[""]',
          prominence === 'primary'
            ? 'border-gold/75 bg-[linear-gradient(180deg,_#ff3c28_0%,_#c2181d_54%,_#7d0d18_100%)] group-hover:brightness-110'
            : 'border-cyan-200/35 bg-[linear-gradient(180deg,_rgba(32,68,126,0.98)_0%,_rgba(9,28,66,0.98)_58%,_rgba(3,10,29,0.98)_100%)] group-hover:border-gold/65 group-hover:brightness-110',
        ].join(' ')}
      />
      <span
        aria-hidden="true"
        className="absolute -left-2 top-1/2 h-7 w-4 -translate-y-1/2 -skew-x-12 border border-gold/55 bg-[#071126] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]"
      />
      <span
        aria-hidden="true"
        className="absolute -right-2 top-1/2 h-7 w-4 -translate-y-1/2 -skew-x-12 border border-gold/55 bg-[#071126] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]"
      />
      <span className="relative z-10 flex h-full items-center justify-center gap-3 drop-shadow-[0_2px_0_rgba(0,0,0,0.72)]">
        {label}
        {badge !== undefined && (
          <span className="min-w-7 border border-gold/70 bg-black/35 px-2 py-0.5 text-xs text-gold shadow-inner shadow-black/40">
            {badge}
          </span>
        )}
      </span>
    </button>
  );
}

export function MainMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCount = useSavedDecksStore((state) => state.entries.length);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#071126] font-body text-white">
      <div className="absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-30 grayscale" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,_rgba(255,211,74,0.18),_transparent_24%),linear-gradient(180deg,_rgba(5,9,20,0.2)_0%,_rgba(5,10,24,0.92)_72%,_#030713_100%)]" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,_rgba(255,255,255,0.16),_transparent)]" />
      <div className="absolute inset-x-[-10%] bottom-[-18%] h-[42%] rotate-[-2deg] border-t-2 border-gold/35 bg-[linear-gradient(180deg,_rgba(11,28,62,0.78),_rgba(3,7,19,0.98))] shadow-[0_-20px_60px_rgba(0,0,0,0.45)]" />

      <section className="relative z-10 grid h-full grid-rows-[1fr_auto_1fr] px-4 py-5 sm:px-8 sm:py-7">
        <div className="flex items-start justify-between gap-3">
          <div className="border-l-4 border-gold bg-black/24 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">Local Hotseat</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Alpha client</p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo({ screen: 'debug-tools' })}
            className="h-10 border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
          >
            Debug
          </button>
        </div>

        <div className="mx-auto flex w-full max-w-[58rem] flex-col items-center justify-center gap-6">
          <div className="relative w-full max-w-[42rem] text-center">
            <div className="absolute inset-x-8 top-1/2 h-12 -translate-y-1/2 bg-brand/50 blur-3xl" />
            <h1 className="relative font-display text-5xl font-black uppercase leading-[0.86] tracking-[0.04em] text-white drop-shadow-[0_7px_0_rgba(0,0,0,0.55)] sm:text-7xl md:text-8xl lg:text-[6.5rem]">
              One Piece
              <span className="mt-2 block text-[0.42em] tracking-[0.22em] text-gold drop-shadow-[0_4px_0_rgba(0,0,0,0.65)]">TCG Online</span>
            </h1>
          </div>

          <nav className="flex w-full flex-col items-center gap-3 sm:gap-3.5" aria-label="Main menu">
            <CanvasMenuButton label="Play" prominence="primary" onClick={() => navigateTo({ screen: 'deck-select' })} disabled={deckCount < 1} />
            <CanvasMenuButton label="Deck Builder" onClick={() => navigateTo({ screen: 'deck-builder' })} />
            <CanvasMenuButton label="Card Library" onClick={() => navigateTo({ screen: 'card-library' })} />
            <CanvasMenuButton label="Saved Decks" badge={deckCount} onClick={() => navigateTo({ screen: 'saved-decks' })} />
            <CanvasMenuButton label="Settings" onClick={() => navigateTo({ screen: 'settings' })} />
          </nav>
        </div>

        <div className="flex items-end justify-center">
          <div className="h-2 w-40 border-x-2 border-gold/45 bg-[linear-gradient(90deg,_transparent,_rgba(217,164,65,0.85),_transparent)]" />
        </div>
      </section>
    </main>
  );
}
