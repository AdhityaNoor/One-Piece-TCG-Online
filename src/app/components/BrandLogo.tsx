/**
 * The masked gold OPTCG YoHoHo! lockup. Extracted out of
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
/**
 * The shadow under the mark, on a WRAPPER rather than on the masked element.
 *
 * `mask` is applied after `filter` in the rendering pipeline, so a filter set
 * on the masked element has its own output clipped away by that same mask —
 * which is why the identical drop-shadow this component used to carry inline
 * rendered nothing at all. On a wrapper the filter sees an already-masked
 * glyph and follows its alpha.
 */
const MARK_SHADOW = 'drop-shadow(0 7px 0 rgba(0,0,0,0.65))';

export function BrandLogo() {
  return (
    <div className="flex flex-col items-center" aria-label="OPTCG YoHoHo!">
      {/* Gold glow behind logo */}
      <div className="absolute h-16 w-[min(72vw,44rem)] bg-brand/40 blur-3xl" aria-hidden="true" />
      {/*
        Sized by HEIGHT against the art's own aspect ratio, rather than by a
        width the mask then fits inside. The old lockup was one wide line and
        this one is two stacked, so a shared width box would have rendered it
        at an unrelated size; pinning the box to the artwork's ratio makes one
        number decide how big the mark is.
      */}
      <span aria-hidden="true" className="relative block leading-none" style={{ filter: MARK_SHADOW }}>
        <span
          className="block aspect-[218.92/77.48] h-[7.28rem] max-w-[86vw] bg-[linear-gradient(180deg,_#ffe17a_0%,_#d9a441_50%,_#8e5b12_100%)] sm:h-[10.14rem] md:h-[12.35rem]"
          style={{
            WebkitMaskImage: 'url(/ui/new-icon.svg)',
            maskImage: 'url(/ui/new-icon.svg)',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
      </span>
    </div>
  );
}
