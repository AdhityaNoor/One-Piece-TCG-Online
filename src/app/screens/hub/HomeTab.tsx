/**
 * Home tab content (see HubScreen) — two columns: a 3:1 auto-rotating
 * carousel on the left, primary play/build shortcut cards on the right.
 * Wrapped in GameCanvasScreen so Home shares the same background treatment
 * as every other hub tab (Play/Decks/Social) instead of sitting on
 * AppShell's flat fill color.
 *
 * KNOWN LIMITATION: the carousel's text container is a placeholder (static
 * copy, no per-slide content model yet). Wire it to real
 * announcements/promo copy once that data source exists.
 */
import { useEffect, useState } from 'react';
import { GameCanvasScreen } from '../../components';
import { useDeckEligibility } from '../../hooks/useDeckEligibility';
import { useNavigationStore } from '../../store/navigationStore';
import type { NavigationTarget } from '../../store/navigationStore';

const CAROUSEL_SLIDES = [
  { image: '/ui/Banners/mv.webp', eyebrow: 'One Piece Online', title: 'Set Sail', body: 'Featured content coming soon.' },
  { image: '/ui/Banners/mv2.webp', eyebrow: 'One Piece Online', title: 'Build Your Fleet', body: 'Featured content coming soon.' },
  { image: '/ui/Banners/mv3.webp', eyebrow: 'One Piece Online', title: 'Challenge Rivals', body: 'Featured content coming soon.' },
  { image: '/ui/Banners/mv4.webp', eyebrow: 'One Piece Online', title: 'Climb the Ranks', body: 'Featured content coming soon.' },
];

const AUTO_ROTATE_MS = 6000;

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % CAROUSEL_SLIDES.length);
    }, AUTO_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const slide = CAROUSEL_SLIDES[index];

  return (
    <section
      className="relative min-h-[12rem] flex-shrink-0 overflow-hidden border border-white/10 bg-black/30 backdrop-blur-md sm:min-h-[15rem] lg:h-full lg:min-h-0"
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      {CAROUSEL_SLIDES.map((entry, entryIndex) => (
        <img
          key={entry.image}
          src={entry.image}
          alt=""
          draggable={false}
          className={[
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
            entryIndex === index ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      ))}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(3,7,19,0.15)_0%,_rgba(3,7,19,0.35)_55%,_rgba(3,7,19,0.92)_100%)]" />

      {/* Placeholder text container — see module TODO. */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gold">{slide.eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-[0.06em] text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] sm:text-3xl">
          {slide.title}
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-200/75">{slide.body}</p>
      </div>

      <div className="absolute right-4 top-4 z-10 flex gap-1.5 sm:right-6 sm:top-6">
        {CAROUSEL_SLIDES.map((entry, entryIndex) => (
          <button
            key={entry.image}
            type="button"
            onClick={() => setIndex(entryIndex)}
            aria-label={`Go to slide ${entryIndex + 1}`}
            aria-current={entryIndex === index ? 'true' : undefined}
            className={[
              'h-1.5 w-5 border transition-all',
              entryIndex === index ? 'border-gold bg-gold' : 'border-white/40 bg-white/10 hover:border-white/70',
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
    <nav className="flex h-full min-h-0 flex-col gap-3" aria-label="Play shortcuts">
      {cards.map((card) => (
        <button
          key={card.title}
          type="button"
          disabled={card.disabled}
          onClick={() => navigateTo(card.target)}
          className={[
            'group relative flex-1 overflow-hidden border border-white/10 text-left transition',
            card.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:-translate-y-0.5 hover:border-red-500/50',
          ].join(' ')}
        >
          {/* Shared texture behind every card. bg.png itself is ~73% fully
              transparent (sparse faint ink-line map art) — it's an overlay,
              not a fill, so it needs a solid dark base underneath or the
              gaps show through to whatever's behind the button. */}
          <div className="absolute inset-0 bg-[#08101f]" />
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
            <span className="font-display text-lg font-black uppercase tracking-[0.08em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] sm:text-xl lg:text-2xl">
              {card.title}
            </span>
            <span className="text-xs text-slate-100/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-sm">{card.subtitle}</span>
          </div>
        </button>
      ))}
    </nav>
  );
}
