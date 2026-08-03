/**
 * Layer 3 leaf: shared face-down card-back image — renders the real OPTCG
 * card-back artwork (provided by the user, stored as static UI chrome under
 * public/ui/, NOT fetched from any card API at runtime). Used everywhere a
 * pile is shown sealed/face-down:
 *  - tone="navy": Life cards (LifeStack, in PlayerBoardPanel.tsx) and the
 *    Deck pile (PileStack.tsx's isFieldDeck path) — the "main" card back.
 *  - tone="teal": the DON!! Deck pile (also in LifeStack), a distinct
 *    colorway so that pile reads as a different zone at a glance.
 *
 * This is the whole card face — callers should NOT layer extra accent divs
 * (border rings, insets, etc.) on top of it; the artwork already contains
 * every accent. This is a different asset family from CardImage.tsx (which
 * renders per-card face art fetched/cached under public/card-images/) — this
 * component only ever renders one of two fixed, bundled images, so it skips
 * CardImage's null/loading/error handling entirely.
 */
import { useSeatAccessories } from './MatchAccessoriesContext';

export type CardBackTone = 'navy' | 'teal';

const TONE_SRC: Record<CardBackTone, string> = {
  navy: '/ui/card-back.png',
  teal: '/ui/don-deck-back.png',
};

export interface CardBackArtProps {
  tone: CardBackTone;
  className?: string;
  /**
   * Engine seat this back belongs to. When provided AND that seat's deck has
   * chosen a sleeve accessory, the chosen sleeve art replaces the bundled
   * default — navy uses the main-deck sleeve, teal uses the DON!! sleeve.
   * Omit for surfaces that aren't seat-specific (e.g. the shared card-
   * movement overlay) to keep the classic bundled back.
   */
  playerId?: string;
}

export function CardBackArt({ tone, className = '', playerId }: CardBackArtProps) {
  const seat = useSeatAccessories(playerId);
  const sleeveUrl = seat ? (tone === 'teal' ? seat.donSleeveUrl : seat.mainSleeveUrl) : undefined;
  return (
    <img
      src={sleeveUrl ?? TONE_SRC[tone]}
      alt=""
      aria-hidden="true"
      className={['block h-full w-full object-cover', className].join(' ')}
      draggable={false}
    />
  );
}
