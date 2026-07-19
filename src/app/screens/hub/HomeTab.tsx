/**
 * Home tab content (see HubScreen) — two columns: a 3:1 auto-rotating
 * carousel on the left, primary play/build shortcut cards on the right.
 * Wrapped in GameCanvasScreen so Home shares the same background treatment
 * as every other hub tab (Play/Decks/Social) instead of sitting on
 * AppShell's flat fill color.
 *
 * The carousel is now wired to the Admin CMS's Banner & News Management
 * section (GET /banners, public/unauthenticated — see
 * multiplayer/net/bannerClient.ts and server/src/banners/publicRoutes.ts):
 * active banners, if any, replace the static placeholder slides below. The
 * placeholders remain as a fallback so Home never renders an empty
 * carousel before an admin has published anything.
 */
import { useEffect, useState } from 'react';
import { GameCanvasScreen } from '../../components';
import { useDeckEligibility } from '../../hooks/useDeckEligibility';
import { useNavigationStore } from '../../store/navigationStore';
import type { NavigationTarget } from '../../store/navigationStore';
import { fetchActiveBanners } from '../../../multiplayer/net/bannerClient';
import type { PublicHomeBanner } from '../../../../shared/admin';

interface CarouselSlide {
  image: string | null;
  eyebrow: string;
  title: string;
  body: string;
  linkUrl?: string | null;
}

const FALLBACK_SLIDES: CarouselSlide[] = [
  { image: '/ui/Banners/mv.webp', eyebrow: 'One Piece Online', title: 'Set Sail', body: 'Featured content coming soon.' },
  { image: '/ui/Banners/mv2.webp', eyebrow: 'One Piece Online', title: 'Build Your Fleet', body: 'Featured content coming soon.' },
  { image: '/ui/Banners/mv3.webp', eyebrow: 'One Piece Online', title: 'Challenge Rivals', body: 'Featured content coming soon.' },
  { image: '/ui/Banners/mv4.webp', eyebrow: 'One Piece Online', title: 'Climb the Ranks', body: 'Featured content coming soon.' },
];

const AUTO_ROTATE_MS = 6000;

function toSlide(banner: PublicHomeBanner): CarouselSlide {
  return { image: banner.imageUrl, eyebrow: 'Announcement', title: banner.title, body: banner.caption, linkUrl: banner.linkUrl };
}

export function HomeTab() {
  return (
    <GameCanvasScreen dense>
      <div className="grid h-full min-h-0 gap-4 overflow-y-auto px-2 py-2 sm:px-3 sm:py-3 lg:grid-cols-[3fr_1fr] lg:gap-6 lg:overflow-hidden">
        <HomeCarousel />
        <HomeActions />
      </div>
    </GameCanvasScreen>
  );
}

function HomeCarousel() {
  const [index, setIndex] = useState(0);
  const [slides, setSlides] = useState<CarouselSlide[]>(FALLBACK_SLIDES);

  useEffect(() => {
    let cancelled = false;
    void fetchActiveBanners().then((banners) => {
      if (!cancelled && banners.length > 0) setSlides(banners.map(toSlide));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [slides]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const slide = slides[index];

  return (
    <section
      className="relative min-h-[12rem] flex-shrink-0 overflow-hidden border border-white/10 bg-black/30 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-md sm:min-h-[15rem] lg:h-full lg:min-h-0"
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {slides.map((entry, entryIndex) =>
        entry.image ? (
          <img
            key={entry.image + entryIndex}
            src={entry.image}
            alt=""
            draggable={false}
            className={[
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
              entryIndex === index ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />
        ) : null,
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(3,7,19,0.15)_0%,_rgba(3,7,19,0.35)_55%,_rgba(3,7,19,0.92)_100%)]" />

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{slide.eyebrow}</p>
        {slide.linkUrl ? (
          <a href={slide.linkUrl} target="_blank" rel="noreferrer" className="group inline-block">
            <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-[0.06em] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] group-hover:underline sm:text-3xl">
              {slide.title}
            </h2>
          </a>
        ) : (
          <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-[0.06em] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] sm:text-3xl">
            {slide.title}
          </h2>
        )}
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/75">{slide.body}</p>
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-1.5 sm:right-6 sm:top-6">
        {slides.map((entry, entryIndex) => (
          <button
            key={(entry.image ?? 'slide') + entryIndex}
            type="button"
            onClick={() => setIndex(entryIndex)}
            aria-label={`Go to slide ${entryIndex + 1}`}
            aria-current={entryIndex === index ? 'true' : undefined}
            className={[
              'h-1.5 w-5 border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]',
              entryIndex === index
                ? 'border-gold bg-gold shadow-[0_0_10px_rgba(217,164,65,0.65)]'
                : 'border-white/40 bg-white/10 hover:border-white/70',
            ].join(' ')}
          />
        ))}
      </div>
    </section>
  );
}

interface ActionCardDef {
  title: string;
  subtitle: string;
  target: NavigationTarget;
  disabled: boolean;
  /** Foreground character art — see /public/ui/Menus. Source art is drawn
      left-anchored and alpha-fades to transparent on its own right edge;
      rendered here fit-to-height (natural aspect, not cropped) and docked
      to the card's left edge to match, so the fade plays out into the
      shared bg.png texture across the rest of the card. */
  image: string;
}

const MENUS_BG = '/ui/Menus/bg.png';

function HomeActions() {
  const navigateTo = useNavigationStore((state) => state.navigateTo);
  const deckCounts = useDeckEligibility();

  const cards: ActionCardDef[] = [
    {
      title: 'Play Casual',
      subtitle: deckCounts.standard > 0 ? 'Jump into the live casual lobby.' : 'Save a Legal deck first.',
      target: { screen: 'casual-lobby', regulation: 'casualStandard' },
      disabled: deckCounts.standard < 1,
      image: '/ui/Menus/bg_casual.webp',
    },
    {
      title: 'Play VS CPU',
      subtitle: deckCounts.local > 0 ? 'Battle the local CPU solo.' : 'Save a deck first.',
      target: { screen: 'cpu-deck-select' },
      disabled: deckCounts.local < 1,
      image: '/ui/Menus/bg_vscpu.webp',
    },
    {
      title: 'Play Ranked',
      subtitle: deckCounts.ranked > 0 ? 'Climb the seasonal ladder.' : 'No Legal decks found.',
      target: { screen: 'ranked' },
      disabled: deckCounts.ranked < 1,
      image: '/ui/Menus/bg_ranked.webp',
    },
    {
      title: 'Build a Deck',
      subtitle: 'Create or edit a deck.',
      target: { screen: 'deck-builder' },
      disabled: false,
      image: '/ui/Menus/bg_deck.webp',
    },
  ];

  return (
    <nav className="flex h-full min-h-0 flex-col gap-0" aria-label="Play shortcuts">
      {cards.map((card) => (
        <button
          key={card.title}
          type="button"
          disabled={card.disabled}
          onClick={() => navigateTo(card.target)}
          className={[
            'group relative flex-1 overflow-hidden border border-white/10 text-left shadow-[0_10px_26px_rgba(0,0,0,0.35)] transition',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--op-gold-rgb))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030713]',
            card.disabled
              ? 'cursor-not-allowed opacity-45'
              : 'cursor-pointer hover:-translate-y-0.5 hover:border-red-500/50 hover:shadow-[0_16px_34px_rgba(0,0,0,0.48)]',
          ].join(' ')}
        >
          {/* Shared texture behind every card. bg.png itself is ~73% fully
              transparent (sparse faint ink-line map art) — it's an overlay,
              not a fill, so it needs a solid dark base underneath or the
              gaps show through to whatever's behind the button. */}
          <div className="absolute inset-0 bg-[#08101f] transition-opacity duration-200 group-hover:opacity-0" />
          <div className="absolute inset-0 bg-repeat opacity-70" style={{ backgroundImage: `url('${MENUS_BG}')` }} />
          {/* Per-card foreground art — fit to the card's height (natural aspect,
              not cropped) and docked to the left edge, matching the source
              art's own left-anchored composition (see field doc above). */}
          <img
            src={card.image}
            alt=""
            draggable={false}
            className="absolute inset-y-0 left-0 h-full w-auto object-contain object-left transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {/* Bottom-up dark fade so the bottom-right text stays legible over both the art and the light map texture. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          <div className="relative z-10 flex h-full flex-col items-end justify-end gap-0.5 px-3 py-2 text-right sm:px-4 sm:py-3">
            <span className="font-display text-lg font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] transition-colors group-hover:text-red-600 sm:text-xl lg:text-2xl">
              {card.title}
            </span>
            <span className="text-xs text-slate-100/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-sm">{card.subtitle}</span>
          </div>
        </button>
      ))}
    </nav>
  );
}
