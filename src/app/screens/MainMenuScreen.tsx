/**
 * Full-viewport title/menu screen. The button shapes are intentionally
 * isolated here so they can later be replaced with bitmap button assets
 * without touching navigation behavior.
 */
import { CanvasMenuButton, GameCanvasScreen } from '../components';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function MainMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCount = useSavedDecksStore((state) => state.entries.length);

  return (
    <GameCanvasScreen
      kicker="Local Hotseat"
      status={`Alpha · v${__APP_VERSION__}`}
      topRight={
        <button
          type="button"
          onClick={() => navigateTo({ screen: 'debug-tools' })}
          className="h-10 border border-white/15 bg-black/28 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/65 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
        >
          Debug
        </button>
      }
    >
      {/* Decorative backgrounds */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 -z-10 h-dvh w-screen overflow-hidden">
        <div className="op-home-speed-bg absolute bottom-0 left-0 h-full">
          {Array.from({ length: 5 }, (_, index) => (
            <img key={index} src="/ui/footer_illust_bg.webp" alt="" className="op-home-speed-bg-panel" draggable={false} />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="op-home-character pointer-events-none fixed bottom-0 left-0 -z-[9] h-dvh opacity-55 sm:opacity-70">
        <img
          src="/ui/footer_illust_chara.webp"
          alt=""
          className="h-full w-auto max-w-none select-none object-contain object-left-bottom drop-shadow-[0_24px_42px_rgba(0,0,0,0.5)]"
          draggable={false}
        />
      </div>

      {/* Centered content: logo + nav as one unit */}
      <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4" aria-label="One Piece Online">
          {/* Gold glow behind logo */}
          <div className="absolute h-16 w-[min(72vw,44rem)] bg-brand/40 blur-3xl" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="relative block h-[4.7rem] w-[min(82vw,36rem)] bg-[linear-gradient(180deg,_#ffe17a_0%,_#d9a441_50%,_#8e5b12_100%)] drop-shadow-[0_7px_0_rgba(0,0,0,0.65)] sm:h-[6.6rem] sm:w-[min(76vw,48rem)] md:h-[8rem] md:w-[min(72vw,58rem)]"
            style={{
              WebkitMaskImage: 'url(/ui/logo_op.png)',
              maskImage: 'url(/ui/logo_op.png)',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
          <span className="relative block font-heading text-[2rem] font-black uppercase tracking-[0.45em] text-gold drop-shadow-[0_5px_0_rgba(0,0,0,0.7)] sm:text-[2.6rem] md:text-[3rem]">
            Online
          </span>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex w-full flex-col items-center gap-3 sm:gap-3.5" aria-label="Main menu">
          <CanvasMenuButton label="Play" prominence="primary" onClick={() => navigateTo({ screen: 'play-menu' })} disabled={deckCount < 1} />
          <CanvasMenuButton label="Card Library" onClick={() => navigateTo({ screen: 'card-library' })} />
          <CanvasMenuButton label="Decks" badge={deckCount} onClick={() => navigateTo({ screen: 'saved-decks' })} />
          <CanvasMenuButton label="Settings" onClick={() => navigateTo({ screen: 'settings' })} />
          <CanvasMenuButton label="Credits" size="sm" onClick={() => navigateTo({ screen: 'credits' })} />
        </nav>
      </div>
    </GameCanvasScreen>
  );
}
