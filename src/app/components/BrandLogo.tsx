/**
 * The masked gold "One Piece" logo + "Online" wordmark. Extracted out of
 * MainMenuScreen so the pre-auth landing flow (LandingScreen's Start stage)
 * can show the exact same mark pixel-for-pixel — the point of merging
 * Start/Login/Signup into "the landing page" is that this logo never
 * visually disappears or jumps between Start and the main menu it hands off
 * to, so the whole thing reads as one continuous page.
 *
 * Caller is responsible for a `relative` positioned ancestor (the glow div
 * below is `absolute`, sized relative to that ancestor) — both current
 * callers (MainMenuScreen, LandingScreen) already wrap this in a
 * `relative flex ... items-center justify-center` container.
 */
export function BrandLogo() {
  return (
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
  );
}
