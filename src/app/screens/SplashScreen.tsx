/**
 * SplashScreen — React-side splash shown while useAppInit pre-warms the
 * card catalog. Visually identical to the native HTML splash in index.html
 * so the hand-off is seamless; the HTML version is removed one rAF after
 * React mounts (see main.tsx).
 *
 * `progress` (0-100) drives the gold progress bar. It is fed directly from
 * useAppInit's per-set fetch loop, so the bar reflects real I/O progress.
 */

interface SplashScreenProps {
  progress: number;
}

export function SplashScreen({ progress }: SplashScreenProps) {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#071126]">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-[url('https://optcgcustom.app/theme/bg_welcome.webp')] bg-cover bg-center opacity-20 grayscale" />

      {/* Content */}
      <div className="relative flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            aria-label="One Piece TCG"
            className="h-[4.7rem] w-[min(82vw,36rem)] bg-[linear-gradient(180deg,_#ffe17a_0%,_#d9a441_50%,_#8e5b12_100%)] drop-shadow-[0_7px_0_rgba(0,0,0,0.65)] sm:h-[6.6rem] sm:w-[min(76vw,48rem)]"
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
          <p className="text-[0.55rem] tracking-[0.28em] text-gold/80 drop-shadow-[0_2px_0_rgba(0,0,0,0.65)]">
            Online
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex w-[min(72vw,22rem)] flex-col items-center gap-2.5">
          {/* Track */}
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-white/[0.08]">
            {/* Fill */}
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,_#8e5b12,_#d9a441,_#ffe17a)] transition-[width] duration-200 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Label */}
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/30">
            {pct < 100 ? `${pct}%` : 'Ready'}
          </p>
        </div>
      </div>

    </div>
  );
}
