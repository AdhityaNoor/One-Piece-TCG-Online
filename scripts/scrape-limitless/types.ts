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
  warnings: string[];
}
