/**
 * Best-effort extraction of the [Trigger] clause's own text out of
 * `card_text`, for display in the card library/deck builder without forcing
 * a reader to scan the full effect text for it.
 *
 * IMPORTANT — this is text *extraction* for display, never *parsing into
 * behavior*. The substring returned here is exactly what `hasTrigger`
 * already detects the presence of (`card_text.includes('[Trigger]')`); this
 * module just slices out the surrounding sentence(s). What the trigger
 * effect actually DOES remains unparsed free text, same as the rest of
 * CardDefinition.text — mapping it to an executable effect template is
 * future, hand-authored work in /src/cards/effectTemplates (per project
 * requirement #7), not this file's job.
 *
 * Why "best-effort": the API gives no structural delimiter for where a
 * keyword-bracketed clause ends. The heuristic used here is: take
 * everything from "[Trigger]" to the start of the next recognized
 * "[Keyword]"-style bracket if one follows, otherwise to the end of the
 * string. Trailing non-bracketed notes (e.g. "This card has been officially
 * errata'd.") have no structural delimiter either and will be included in
 * the extracted text when they happen to follow a card's [Trigger] clause —
 * this is the SAME category of limitation already accepted for `sub_types`
 * (see normalizeCardPrinting.ts's `unsplit-sub-types` warning), not a new
 * kind of guess. A `trigger-text-best-effort` warning is always emitted
 * when a non-empty triggerText is produced, so callers know not to treat it
 * as a guaranteed-clean boundary.
 */
import { warn, type NormalizationWarning } from './warnings';

const TRIGGER_TAG = '[Trigger]';
/** Matches the start of another bracketed keyword clause, e.g. "[On Play]", "[DON!! x1]". Used only to find where a trailing clause MIGHT end — never to interpret what it means. */
const NEXT_BRACKET_KEYWORD = /\[[^\]]+\]/g;

export function extractTriggerText(cardText: string, cardNumber: string, warnings: NormalizationWarning[]): string | undefined {
  const tagIndex = cardText.indexOf(TRIGGER_TAG);
  if (tagIndex === -1) return undefined;

  const afterTag = tagIndex + TRIGGER_TAG.length;
  const rest = cardText.slice(afterTag);

  // Find the next bracketed keyword AFTER [Trigger] itself, so the slice stops there if one exists.
  NEXT_BRACKET_KEYWORD.lastIndex = 0;
  let nextBracketRelativeIndex = -1;
  let match: RegExpExecArray | null;
  while ((match = NEXT_BRACKET_KEYWORD.exec(rest)) !== null) {
    nextBracketRelativeIndex = match.index;
    break;
  }

  const slice = nextBracketRelativeIndex === -1 ? rest : rest.slice(0, nextBracketRelativeIndex);
  const triggerText = slice.trim();

  if (triggerText.length === 0) return undefined;

  warnings.push(
    warn(
      'trigger-text-best-effort',
      cardNumber,
      `triggerText was extracted heuristically (from "[Trigger]" to the next bracketed keyword or end of text) — trailing non-bracketed notes (e.g. errata disclaimers) may be included. Never treat this as a guaranteed-clean boundary.`,
      'card_text',
    ),
  );

  return triggerText;
}
