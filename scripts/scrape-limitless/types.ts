/**
 * Output schema for the Limitless scraper.
 *
 * Structural attributes (category/colors/cost/power/counter/attribute/life)
 * are language-neutral on Limitless (shown with English labels on both the EN
 * and JP page), so they live once at the top level. Only name, effect text,
 * tribal type names, and the card image are localized — those go under `en`
 * and `jp`.
 *
 * As with the optcgapi scraper, effect text is stored RAW; the EN text is also
 * run through the project's inert effect parser (effectParse), but nothing is
 * executed.
 */
import type { CardDefinition } from '../../src/engine/state/card';
import type { ParsedEffect } from '../../src/cards/effectParser';
import type { PROVIDER } from './config';

/** Per-language localized fields. */
export interface LimitlessLangData {
  language: 'en' | 'jp';
  /** Localized card name (e.g. "Nami" / "ナミ"). null if the language page was missing. */
  name: string | null;
  /** Raw localized effect text, verbatim. '' if the card has no effect; null if the page was missing. */
  effectText: string | null;
  /** Localized tribal type names (e.g. ["Straw Hat Crew"] / ["麦わらの一味"]). */
  types: string[];
  /** Canonical CDN image URL for this language (constructed, deterministic). */
  imageUrl: string;
  /** Outcome of downloading the image: downloaded/exists/missing/failed/skipped (when images disabled). */
  imageStatus: 'downloaded' | 'exists' | 'missing' | 'failed' | 'skipped';
  /** Local path to the downloaded image, relative to scrape/limitless/ (null if not on disk). */
  imageFile: string | null;
  /** The page URL this data came from. */
  pageUrl: string;
  /** True if the language page could not be fetched (404/timeout); data above is then mostly null. */
  missing: boolean;
}

/**
 * Per-language image data for ONE print (base OR an alternate art). Unlike
 * LimitlessLangData this only carries the image — name/effect/types are
 * identical across prints of the same card number, so they stay on `en`/`jp`.
 */
export interface LimitlessPrintImage {
  language: 'en' | 'jp';
  /** Exact CDN image URL taken verbatim from that print page's og:image (authoritative, not constructed). */
  imageUrl: string | null;
  /** Outcome of downloading this print's image. */
  imageStatus: 'downloaded' | 'exists' | 'missing' | 'failed' | 'skipped';
  /** Local path relative to scrape/limitless/ (null if not on disk). */
  imageFile: string | null;
  /** The print page URL this image came from (…/cards/en/OP01-016?v=1). */
  pageUrl: string;
  /** True if this language's print page could not be fetched. */
  missing: boolean;
}

/**
 * One printing of a card. The BASE print is `variantParam: 0`, `variantId: ''`,
 * `isAlternateArt: false`. Every other printing (parallel/alternate art, SP,
 * manga, promo reprint) is an alternate art with `variantParam > 0` and a
 * `variantId` like "p1"/"p2" derived from the ACTUAL CDN image filename — never
 * assumed. `printKind`/`printLabel` come straight from the page's current-print
 * line (e.g. "Alternate Art", "Rare"), so nothing here is guessed.
 */
export interface LimitlessPrint {
  /** Limitless `?v=N` query param. 0 = base print. */
  variantParam: number;
  /** Filename infix used by the CDN: '' for base, 'p1'/'p2'/… for alternates. Derived from the real image filename. */
  variantId: string;
  /** True for any non-base printing (i.e. an alternate art). */
  isAlternateArt: boolean;
  /** Full current-print label, e.g. "Romance Dawn (OP01) Alternate Art". null if the line was absent. */
  printLabel: string | null;
  /** Just the trailing descriptor of printLabel, e.g. "Alternate Art" / "Rare" / "Special Card". */
  printKind: string | null;
  /** Illustrator credit for this print if the page shows one ("Illustrated by …"). */
  illustrator: string | null;
  en: LimitlessPrintImage;
  jp: LimitlessPrintImage;
}

export interface LimitlessCard {
  schemaVersion: number;
  cardNumber: string; // "OP01-016"
  setCode: string; // "OP01" (folder + CDN segment)
  category: 'leader' | 'character' | 'event' | 'stage' | 'unknown';
  colors: string[]; // lowercased: ["red"], ["blue","purple"]
  cost?: number;
  power?: number;
  life?: number;
  counter?: number;
  attributes: string[]; // lowercased: ["special"]
  block?: string; // regulation/block marker, e.g. "Block 1"
  rarity?: string;
  legality: { standard?: string; extra?: string };

  /**
   * Every printing of this card number, base first then alternate arts in
   * ?v order. Always has at least the base print. Localized name/effect/types
   * live on `en`/`jp` below (shared across prints); this array is the per-art
   * image + label data the art picker renders.
   */
  prints: LimitlessPrint[];

  en: LimitlessLangData;
  jp: LimitlessLangData;

  /** Engine-facing normalized definition (from EN structural data). Same CardDefinition the engine declares. */
  definition: CardDefinition;
  /** Inert structured parse of the EN effect text (authoring aid, never executed). */
  effectParse: ParsedEffect;

  warnings: string[];
  source: { provider: typeof PROVIDER; fetchedAt: string };
}

/** A single ability/field the parser pulled from a card page, before merge. */
export interface ParsedCardPage {
  cardNumber: string | null;
  name: string | null;
  category: LimitlessCard['category'];
  colors: string[];
  cost?: number;
  power?: number;
  life?: number;
  counter?: number;
  attributes: string[];
  block?: string;
  rarity?: string;
  legality: { standard?: string; extra?: string };
  effectText: string;
  types: string[];
  /** Exact image URL for THIS page (from og:image meta). Authoritative per-print image. */
  ogImage: string | null;
  /** Current-print line label, e.g. "Romance Dawn (OP01) Alternate Art". */
  printLabel: string | null;
  /** Trailing descriptor of printLabel ("Alternate Art" / "Rare" / …). */
  printKind: string | null;
  /** Illustrator credit ("Illustrated by …" with the prefix stripped). */
  illustrator: string | null;
  /** Other prints' `?v=N` params linked from this page's prints table (does NOT include this page's own param). */
  variantParams: number[];
  warnings: string[];
}
