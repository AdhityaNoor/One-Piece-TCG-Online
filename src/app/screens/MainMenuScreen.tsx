/**
 * Full-viewport title/menu screen. The button shapes are intentionally
 * isolated here so they can later be replaced with bitmap button assets
 * without touching navigation behavior.
 */
import { useState } from 'react';
import { BrandLogo, CanvasMenuButton, GameCanvasScreen, LandingBackdrop } from '../components';
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
      topRight={<ProfileMenu user={user} onProfile={() => navigateTo({ screen: 'profile' })} onDebug={() => navigateTo({ screen: 'debug-tools' })} onLogout={logout} />}
    >
      <LandingBackdrop />

      {/* Centered content: logo + nav as one unit */}
      <div className="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden">
        <BrandLogo />

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
  onProfile,
  onDebug,
  onLogout,
}: {
  user: PublicUser | null;
  onProfile: () => void;
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
                onProfile();
              }}
              className="col-span-2 border border-gold/25 bg-gold/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-gold hover:border-gold/60"
            >
              Pirate Profile
            </button>
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
