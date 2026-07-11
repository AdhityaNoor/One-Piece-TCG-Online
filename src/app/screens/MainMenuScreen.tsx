/**
 * Full-viewport title/menu screen. The button shapes are intentionally
 * isolated here so they can later be replaced with bitmap button assets
 * without touching navigation behavior.
 */
import { useState } from 'react';
import { CanvasMenuButton, GameCanvasScreen } from '../components';
import type { PublicUser } from '../../../shared/auth';
import { useAuthStore } from '../store/authStore';
import { useNavigationStore } from '../store/navigationStore';
import { useSavedDecksStore } from '../store/savedDecksStore';

export function MainMenuScreen() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCount = useSavedDecksStore((state) => state.entries.length);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <GameCanvasScreen
      kicker="One Piece TCG"
      status={`Alpha · v${__APP_VERSION__}`}
      topRight={<ProfileMenu user={user} onDebug={() => navigateTo({ screen: 'debug-tools' })} onLogout={logout} />}
    >
      {/* Decorative backgrounds */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-y-0 left-0 -z-10 h-dvh w-screen overflow-hidden">
        <div className="op-home-speed-bg absolute bottom-0 left-0 h-full">
          {Array.from({ length: 5 }, (_, index) => (
            <img key={index} src="/ui/footer_illust_bg.webp" alt="" className="op-home-speed-bg-panel" draggable={false} />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="op-home-character pointer-events-none fixed inset-x-0 bottom-0 -z-[9] h-dvh overflow-hidden opacity-55 sm:opacity-70">
        <img
          src="/ui/footer_illust_chara.webp"
          alt=""
          className="absolute bottom-0 left-0 h-auto w-screen max-w-none select-none object-contain object-left-bottom drop-shadow-[0_24px_42px_rgba(0,0,0,0.5)] xl:h-full xl:w-auto"
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

function ProfileMenu({
  user,
  onDebug,
  onLogout,
}: {
  user: PublicUser | null;
  onDebug: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const displayName = user?.username ?? 'Offline';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="h-10 max-w-[44vw] truncate border border-white/15 bg-black/35 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white/75 shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all hover:border-gold/55 hover:text-gold"
      >
        {displayName}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 border border-gold/25 bg-[#050914]/95 p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-gold">{user ? 'Signed in' : 'Local mode'}</p>
          <p className="mt-1 truncate text-sm font-black uppercase tracking-[0.08em] text-white">{displayName}</p>
          {user?.email && <p className="mt-1 truncate text-xs text-white/55">{user.email}</p>}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDebug();
              }}
              className="border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/65 hover:border-gold/40 hover:text-gold"
            >
              Debug
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="border border-red-300/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-red-100 hover:border-red-200/50"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
