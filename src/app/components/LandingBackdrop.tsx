/**
 * Shared decorative background (speed-line illustration panels + character
 * silhouette), extracted out of MainMenuScreen. Rendered behind every stage
 * of LandingScreen (Start/Login/Signup) AND MainMenuScreen itself, so the
 * hand-off from the pre-auth landing flow to the real main menu doesn't cut
 * to a different backdrop — it reads as one continuous page.
 *
 * Fixed-position + negative z-index, so it's safe to mount from multiple
 * screens without any layout impact on their own content.
 */
export function LandingBackdrop() {
  return (
    <>
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
    </>
  );
}
