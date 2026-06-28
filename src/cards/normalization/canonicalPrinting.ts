/**
 * Picks ONE row out of a card number's printing array to drive the
 * gameplay-facing CardDefinition (rules text/stats), and keeps the rest as
 * alternate-art metadata only.
 *
 * Why this is needed: /api/sets/card/{id}/ etc. return every printing of a
 * card number (base, Parallel, SP, manga reprint, regional promo...) as
 * separate rows, and those rows are not guaranteed textually identical
 * (observed: OP01-016 Nami's SP-printing row phrases its own errata text
 * slightly differently than the base printing). The rules apply to the card
 * NUMBER, not to a specific printing, so the engine needs exactly one
 * authoritative row per number — picking is a data-hygiene decision, never a
 * rules decision.
 *
 * Heuristic (documented, not a rules citation — there is nothing in the
 * Comprehensive Rules about API row selection):
 * 1. Prefer the row whose card_image_id === card_set_id exactly (no "_p1",
 *    "_p8", etc. suffix) — this is the base/original printing in every
 *    sample seen.
 * 2. Otherwise, prefer the row with the most recent date_scraped (most
 *    likely to reflect the latest scrape/errata pass).
 * 3. Otherwise, take the first row and emit a warning — this is a fallback,
 *    not a confident choice.
 */
import type { CardPrintingDto } from '../api/types';
import { warn, type NormalizationWarning } from './warnings';

export interface CanonicalPrintingResult {
  canonical: CardPrintingDto;
  alternates: CardPrintingDto[];
  warnings: NormalizationWarning[];
}

export function pickCanonicalPrinting(printings: CardPrintingDto[]): CanonicalPrintingResult {
  if (printings.length === 0) {
    throw new Error('pickCanonicalPrinting requires at least one printing');
  }

  const cardNumber = printings[0].card_set_id;
  const warnings: NormalizationWarning[] = [];

  const basePrinting = printings.find((p) => p.card_image_id === p.card_set_id);
  let canonical = basePrinting;

  if (!canonical) {
    const sorted = [...printings].sort((a, b) => (a.date_scraped < b.date_scraped ? 1 : -1));
    canonical = sorted[0];
    warnings.push(
      warn(
        'ambiguous-canonical-printing',
        cardNumber,
        `No printing of ${cardNumber} had card_image_id === card_set_id; fell back to most-recently-scraped printing (${canonical.card_image_id}).`,
      ),
    );
  }

  const distinctTexts = new Set(printings.map((p) => p.card_text.trim()));
  if (distinctTexts.size > 1) {
    warnings.push(
      warn(
        'inconsistent-text-across-printings',
        cardNumber,
        `Printings of ${cardNumber} disagree on card_text (${distinctTexts.size} variants); using the canonical printing's text (${canonical.card_image_id}) and discarding the rest.`,
        'card_text',
      ),
    );
  }

  return {
    canonical,
    alternates: printings.filter((p) => p.card_image_id !== canonical!.card_image_id),
    warnings,
  };
}
