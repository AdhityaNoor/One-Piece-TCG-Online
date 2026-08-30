/**
 * Which static keyword abilities are PRINTED on a card, derived from its text.
 *
 * The single source of truth for the `hasRush` / `hasBlocker` / `hasDoubleAttack` /
 * `hasBanish` / `isUnblockable` flags on CardDefinition. Three call sites must agree, or the
 * flags drift apart depending on where a card's data came from:
 *   1. `normalizeCardPrinting` (the OPTCG API path),
 *   2. `scripts/scrape-limitless/scrapeOutput.ts` (the path that writes public/cards),
 *   3. `savedDeckToSetupInput`'s snapshot repair (decks saved by an OLDER build).
 *
 * WHY IT IS NOT A SUBSTRING TEST. A printed keyword is a keyword ABILITY the card has all the
 * time. Card text mentions the same words in three other shapes, none of which grant it:
 *   - a CONDITIONAL grant to itself — "If you have 1 or less Life cards, this Character gains
 *     [Blocker]." The engine models that as a curated `addKeyword` with a condition; a printed
 *     flag would hand it over unconditionally, which is strictly more permissive than the card.
 *   - a grant to OTHER cards — "Your [Blugori] gains [Blocker]", "Up to 1 of your Characters
 *     gains [Double Attack] during this turn."
 *   - a NEGATION — "Your opponent cannot activate [Blocker] during this battle."
 * A loose `text.includes('[Blocker]')` counted all three. Across the catalog that was 211 cards
 * carrying a keyword they should not have (93 Blocker, 72 Rush, 23 Double Attack, 15 Banish,
 * 8 Unblockable).
 *
 * `[Rush: Character]` is a DIFFERENT keyword — it allows attacking Characters on the turn the
 * card is played, never the Leader — and is modelled as the continuous keyword
 * `canAttackCharactersWhileSummoningSick`, granted by a curated ability. It must never set
 * `hasRush`. (It does not contain the substring `[Rush]`, so this falls out for free, but the
 * scraper used to test for it explicitly and OP17-003/027/048/069 all gained unrestricted Rush.)
 */

/**
 * The run of `[Tag]` tokens a card opens with, e.g. `['[Blocker]', '[On Play]']`.
 * Reminder text in parentheses between tags is skipped, so "[Rush] (This card can attack…)
 * [Double Attack] (…)" reports BOTH keywords.
 */
export function leadingBracketTags(text: string): string[] {
  const tags: string[] = [];
  let rest = text.trimStart();
  while (rest.startsWith('[')) {
    const end = rest.indexOf(']');
    if (end < 0) break;
    tags.push(rest.slice(0, end + 1));
    rest = rest.slice(end + 1).trimStart();
    // Skip one reminder-text parenthetical so a following keyword tag still counts.
    if (rest.startsWith('(')) {
      const close = rest.indexOf(')');
      if (close < 0) break;
      rest = rest.slice(close + 1).trimStart();
    }
  }
  return tags;
}

/**
 * True when `[<keyword>]` is printed as a keyword ability: either in the leading tag run, or as
 * its own clause after a completed sentence ("…+5 cost.[Blocker] (After your opponent…)").
 * Anything else — "gains [X]", "cannot activate [X]", "[X] Character with 4000 power or less" —
 * is a mention, not a grant.
 */
export function hasPrintedKeyword(text: string, keyword: string): boolean {
  const tag = `[${keyword}]`;
  if (leadingBracketTags(text).includes(tag)) return true;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(String.raw`(?:^|[.!?])\s*\[${escaped}\](?:\s*(?:\(|\[|$))`, 'm').test(text);
}

/** The printed static-keyword flags for one card's text. */
export interface PrintedKeywordFlags {
  hasRush: boolean;
  hasBlocker: boolean;
  hasDoubleAttack: boolean;
  hasBanish: boolean;
  isUnblockable: boolean;
}

export function derivePrintedKeywordFlags(text: string): PrintedKeywordFlags {
  return {
    hasRush: hasPrintedKeyword(text, 'Rush'),
    hasBlocker: hasPrintedKeyword(text, 'Blocker'),
    hasDoubleAttack: hasPrintedKeyword(text, 'Double Attack'),
    hasBanish: hasPrintedKeyword(text, 'Banish'),
    isUnblockable: hasPrintedKeyword(text, 'Unblockable'),
  };
}
