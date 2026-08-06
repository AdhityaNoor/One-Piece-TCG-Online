/**
 * Searcher hit chance — HEURISTIC.
 *
 * A "searcher" is a card that looks at the top N cards of your deck and adds a
 * card matching some filter (a tribal type or a color) to your hand — the
 * bread-and-butter consistency engine of One Piece decks. gumgum.gg reports,
 * per searcher, the probability it finds at least one valid target.
 *
 * IMPORTANT — this is text pattern-matching for a DISPLAY metric only. It does
 * NOT compile card text into executable effect logic (project rule: "card text
 * is raw text, mapped later to effect templates; never executed directly").
 * When a card's text looks searcher-ish but doesn't fit the patterns below, it
 * is reported in {@link SearcherStat.unparsed} as needs-confirmation rather
 * than guessed at.
 *
 * The odds themselves are hypergeometric over the remaining deck (the searcher
 * copy being resolved is removed from the universe). Target pool = copies of
 * cards in the main deck whose type/color matches the parsed filter.
 */
import type { Color } from '../../engine/state/card';
import type { SavedDeckCardSnapshot } from '../decks/savedDeck';
import { atLeastOne } from './hypergeometric';
import type { SearcherEntry, SearcherStat } from './types';

const COLORS: Color[] = ['red', 'green', 'blue', 'purple', 'black', 'yellow'];

type SearcherFilter =
  | { kind: 'type'; value: string }
  | { kind: 'color'; value: Color };

interface ParsedSearcher {
  lookCount: number;
  filter: SearcherFilter;
  description: string;
}

/** How many cards the effect looks at from the top of the deck, or null. */
function parseLookCount(text: string): number | null {
  const patterns = [
    /look at (?:the top )?(\d+) cards? (?:from the top )?of your deck/i,
    /look at the top (\d+) cards?/i,
    /reveal the top (\d+) cards?/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return Number.parseInt(m[1], 10);
  }
  return null;
}

/** Extract the "add a matching card to hand" target phrase, if this is a to-hand searcher. */
function parseFilter(text: string): SearcherFilter | null {
  // Must actually put something into the hand to count as a searcher.
  if (!/add (?:it|them|up to \d+|(?:this|that|1|one) card)[^.]*?to your hand/i.test(text) && !/to your hand/i.test(text)) {
    return null;
  }

  // The phrase between "reveal (up to) N" and "add ... to your hand" holds the filter.
  const revealMatch =
    text.match(/reveal (?:up to )?\d+\s+(.*?)\s+(?:and )?(?:add|then add)/i) ??
    text.match(/add (?:up to )?\d+\s+(.*?)\s+(?:from among them )?to your hand/i);
  const scope = revealMatch ? revealMatch[1] : text;

  // Tribal type: "{Straw Hat Crew} type", "Straw Hat Crew type card".
  const typeMatch = scope.match(/\{?([A-Z][A-Za-z0-9 '.!/-]*?)\}?\s+type\b/);
  if (typeMatch) {
    const value = typeMatch[1].replace(/\s+/g, ' ').trim();
    if (value.length > 1) return { kind: 'type', value };
  }

  // Color: "{Red} card", "a red Character".
  const colorMatch = scope.match(/\{?(red|green|blue|purple|black|yellow)\}?\b/i);
  if (colorMatch) {
    const value = colorMatch[1].toLowerCase() as Color;
    if (COLORS.includes(value)) return { kind: 'color', value };
  }

  return null;
}

function parseSearcher(text: string): ParsedSearcher | { reason: string } | null {
  const lookCount = parseLookCount(text);
  if (lookCount === null) return null; // not a look-at-deck card at all — silently ignore.

  const filter = parseFilter(text);
  if (!filter) {
    return { reason: 'Looks at deck top but the search target could not be parsed.' };
  }

  const description =
    filter.kind === 'type' ? `{${filter.value}} type card` : `${filter.value} card`;
  return { lookCount, filter, description };
}

/** Copy-weighted count of main-deck cards matching the searcher's filter. */
function countTargets(cards: SavedDeckCardSnapshot[], filter: SearcherFilter): number {
  let total = 0;
  for (const snap of cards) {
    const def = snap.definition;
    const matches =
      filter.kind === 'type'
        ? def.types.some((t) => t.toLowerCase() === filter.value.toLowerCase())
        : def.colors.includes(filter.value);
    if (matches) total += snap.quantity;
  }
  return total;
}

export function computeSearcherStat(
  cards: SavedDeckCardSnapshot[],
  deckSize: number,
): SearcherStat {
  const entries: SearcherEntry[] = [];
  const unparsed: SearcherStat['unparsed'] = [];

  for (const snap of cards) {
    const def = snap.definition;
    const parsed = parseSearcher(def.text);
    if (parsed === null) continue;

    if ('reason' in parsed) {
      unparsed.push({ cardNumber: def.cardNumber, name: def.name, reason: parsed.reason });
      continue;
    }

    const targetPool = countTargets(cards, parsed.filter);
    // Universe = deck minus the one searcher copy being resolved. Its other
    // copies stay in the pool only if they themselves match the filter.
    const remainingDeck = Math.max(1, deckSize - 1);
    const hitChance = atLeastOne(remainingDeck, Math.min(targetPool, remainingDeck), parsed.lookCount);

    entries.push({
      cardNumber: def.cardNumber,
      name: def.name,
      quantity: snap.quantity,
      lookCount: parsed.lookCount,
      targetDescription: parsed.description,
      targetPool,
      hitChance,
    });
  }

  entries.sort((a, b) => b.hitChance - a.hitChance || a.name.localeCompare(b.name));
  return { entries, unparsed };
}
