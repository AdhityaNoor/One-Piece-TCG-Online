/**
 * Parses a pasted deck-list text blob (one card per line, e.g.
 * "4xOP09-083_r1") into structured data, per the project's clipboard-import
 * requirement.
 *
 * Scope is deliberately narrow — this module ONLY turns text into
 * `{ cardId, variant, quantity }` triples and reports lines it could not
 * parse. It does NOT:
 * - resolve cardId against the OPTCG API or any CardDefinition (that is the
 *   deck builder's job, one layer up, once it has live API access);
 * - enforce deck-construction legality (max 4 copies of a card NUMBER,
 *   50-card main deck, etc. — see ./deckValidation.ts, which runs AFTER
 *   resolution, on cardNumber-keyed quantities);
 * - decide which printing/art a variant maps to — that is also a downstream
 *   resolver concern (matching against a CardLibraryEntry's rawPrintings).
 *
 * This keeps the "card API is data only" and "do not assume rules" ground
 * rules intact: this file has zero knowledge of what a card IS, only of how
 * the pasted TEXT is shaped.
 *
 * Format (per spec):
 *   "<quantity>x<cardId>[_<variant>]"
 *   e.g. "1xOP09-081_p2", "4xOP09-083_r1", "3xOP09-093"
 * - quantity: the integer before "x"/"X" (whitespace around the separator
 *   is tolerated, e.g. "1 x OP09-081" also parses).
 * - cardId: the base card number, e.g. "OP09-081". Uppercased on output —
 *   OPTCG card numbers are uppercase everywhere they're observed in the API
 *   (api/types.ts), so this is a text-canonicalization, not a rules guess.
 * - variant: everything after the FIRST "_", preserved verbatim (not
 *   case-normalized — card_image_id suffixes are observed lowercase, e.g.
 *   "_p1", "_r1", but nothing here assumes that). `null` if no "_" present.
 *   Matches the API's own `card_image_id` convention of
 *   `${cardNumber}_${variant}` (see api/types.ts), so a downstream resolver
 *   can look up `card_image_id === \`${cardId}_${variant}\`` directly.
 *
 * Per-line validation: every non-empty line must match the format above or
 * it is reported in `invalidLines` with a reason — never silently dropped.
 * Empty lines (whitespace-only) are silently ignored, per spec. Duplicate
 * lines (same cardId + variant) are aggregated into one entry with a summed
 * quantity and every contributing raw line recorded in `sourceLines`, so the
 * deck builder can show provenance ("this entry came from these 2 lines").
 *
 * TODO / needs ruling confirmation: whether two DIFFERENT variants of the
 * SAME cardId should collapse into one entry for import purposes. This
 * module intentionally keeps them as separate entries (variant selects
 * cosmetic art, see savedDeck.ts) but also exposes `totalQuantityByCardId`
 * (pure arithmetic over the parsed quantities, no rules logic) so a deck
 * builder can flag "you have 5 total copies of OP09-083 across variants"
 * before even resolving cards against the API.
 */

export interface ParsedDeckListEntry {
  /** Uppercased card number, e.g. "OP09-081". Not yet validated against any real card. */
  cardId: string;
  /** Verbatim suffix after the first "_", or null if the line had none. */
  variant: string | null;
  /** Summed across every line that shared this exact (cardId, variant) pair. */
  quantity: number;
  /** Every original line (verbatim, including its own whitespace) that contributed to this entry, in encounter order. */
  sourceLines: string[];
}

export interface InvalidDeckListLine {
  /** 1-based line number within the original pasted text (blank lines count toward numbering). */
  lineNumber: number;
  /** The original line, verbatim, untrimmed. */
  raw: string;
  reason: string;
}

export interface ParseClipboardDeckListResult {
  /** The exact text passed in, untouched — for re-display/edit-and-retry UX. */
  rawInput: string;
  entries: ParsedDeckListEntry[];
  invalidLines: InvalidDeckListLine[];
  /** cardId -> summed quantity across ALL its variants (and the variant-less entry, if any). Pure arithmetic, not a legality check. */
  totalQuantityByCardId: Record<string, number>;
  /** Sum of every valid entry's quantity. */
  totalQuantity: number;
}

const LINE_PATTERN = /^(\d+)\s*[xX]\s*([^\s_]+)(?:_(\S+))?$/;
/** A line that LOOKS like a bare card id (with or without a variant) but is missing its quantity prefix — used only to produce a more specific error message. */
const BARE_CARD_ID_PATTERN = /^[^\s_]+(?:_\S+)?$/;

export function parseClipboardDeckList(rawInput: string): ParseClipboardDeckListResult {
  const lines = rawInput.split(/\r\n|\r|\n/);
  const entriesByKey = new Map<string, ParsedDeckListEntry>();
  const invalidLines: InvalidDeckListLine[] = [];
  const totalQuantityByCardId: Record<string, number> = {};

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return; // ignore empty lines, per spec — not reported as invalid

    const match = LINE_PATTERN.exec(trimmed);
    if (!match) {
      const reason = BARE_CARD_ID_PATTERN.test(trimmed)
        ? `Missing quantity prefix — expected something like "1x${trimmed}".`
        : `Unrecognized format — expected something like "4xOP09-083_r1" or "3xOP09-093".`;
      invalidLines.push({ lineNumber: index + 1, raw: line, reason });
      return;
    }

    const quantityText = match[1];
    const quantity = Number(quantityText);
    if (!Number.isFinite(quantity) || quantity < 1) {
      invalidLines.push({
        lineNumber: index + 1,
        raw: line,
        reason: `Quantity must be at least 1 (got "${quantityText}").`,
      });
      return;
    }

    const cardId = match[2].toUpperCase();
    const variant = match[3] ?? null;

    const key = `${cardId}__${variant ?? ''}`;
    const existing = entriesByKey.get(key);
    if (existing) {
      existing.quantity += quantity;
      existing.sourceLines.push(line);
    } else {
      entriesByKey.set(key, { cardId, variant, quantity, sourceLines: [line] });
    }

    totalQuantityByCardId[cardId] = (totalQuantityByCardId[cardId] ?? 0) + quantity;
  });

  const entries = Array.from(entriesByKey.values());
  const totalQuantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);

  return { rawInput, entries, invalidLines, totalQuantityByCardId, totalQuantity };
}
