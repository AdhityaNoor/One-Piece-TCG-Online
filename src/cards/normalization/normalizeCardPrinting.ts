/**
 * Maps raw OPTCG API rows to the engine's CardDefinition (src/engine/state/card.ts).
 *
 * This is the ONLY place a dependency is allowed to point from /src/cards
 * toward /src/engine, and it only imports TYPES — no engine logic is ever
 * imported here, and nothing in /src/engine imports anything from
 * /src/cards. The engine stays card-API-agnostic; this module is the sole
 * translator at the boundary, per project ground rule ("treat the card API
 * as card data only, not executable logic").
 *
 * card_text is copied through verbatim into CardDefinition.text and is
 * NEVER parsed into behavior here — effect templates (future work, per
 * project requirement #7) are a separate mapping keyed by cardNumber,
 * authored by hand, not derived from this string.
 */
import type { Attribute, CardCategory, CardDefinition, Color } from '../../engine/state/card';
import type { CardPrintingDto, DonCardDto } from '../api/types';
import { pickCanonicalPrinting } from './canonicalPrinting';
import { extractTriggerText } from './extractTriggerText';
import { coerceCounterAmount, coerceOptionalNumber } from './parseNumericField';
import { warn, type NormalizationWarning } from './warnings';

const CARD_TYPE_TO_CATEGORY: Record<CardPrintingDto['card_type'], CardCategory> = {
  Leader: 'leader',
  Character: 'character',
  Event: 'event',
  Stage: 'stage',
};

const COLOR_MAP: Record<string, Color> = {
  red: 'red',
  green: 'green',
  blue: 'blue',
  purple: 'purple',
  black: 'black',
  yellow: 'yellow',
};

const ATTRIBUTE_MAP: Record<string, Attribute> = {
  slash: 'slash',
  strike: 'strike',
  ranged: 'ranged',
  special: 'special',
  wisdom: 'wisdom',
  '?': 'unknown',
};

/**
 * The live API represents some multicolor cards as space-separated values
 * (for example OP01-061 Kaido: "Blue Purple"). Slash/comma delimiters are
 * accepted too so saved/imported snapshots remain tolerant.
 */
function parseColors(cardColor: string, cardNumber: string, warnings: NormalizationWarning[]): Color[] {
  const tokens = cardColor
    .split(/[\/,\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const colors: Color[] = [];
  for (const token of tokens) {
    const mapped = COLOR_MAP[token];
    if (mapped && !colors.includes(mapped)) {
      colors.push(mapped);
    } else if (token.length > 0) {
      warnings.push(warn('unrecognized-color', cardNumber, `Unrecognized card_color token "${token}" (raw value: "${cardColor}").`, 'card_color'));
    }
  }
  return colors;
}

function parseAttributes(attribute: string | null, cardNumber: string, warnings: NormalizationWarning[]): Attribute[] | undefined {
  if (attribute === null) return undefined;
  const mapped = ATTRIBUTE_MAP[attribute.trim().toLowerCase()];
  if (!mapped) {
    warnings.push(warn('unrecognized-attribute', cardNumber, `Unrecognized attribute value "${attribute}".`, 'attribute'));
    return undefined;
  }
  return [mapped];
}

/**
 * sub_types has no reliable inter-type delimiter (see api/types.ts) — a
 * value like "Animal Kingdom Pirates The Four Emperors" cannot be split into
 * its two real multi-word types without a maintained dictionary. Policy:
 * never guess a split. Preserve the whole raw string as ONE element of
 * CardDefinition.types and always flag it, so callers know tribal-type
 * filtering in the deck builder is not yet reliable for multi-type cards.
 */
function parseTypes(subTypes: string | null, cardNumber: string, warnings: NormalizationWarning[]): string[] {
  if (subTypes === null) return [];
  const trimmed = subTypes.trim();
  if (trimmed.length === 0) return [];
  if (/[\/,]/.test(trimmed)) {
    return trimmed
      .split(/[\/,]+/)
      .map((type) => type.trim())
      .filter(Boolean);
  }
  warnings.push(
    warn(
      'unsplit-sub-types',
      cardNumber,
      `sub_types "${trimmed}" preserved as a single raw tag — no reliable delimiter between distinct types exists in the API response.`,
      'sub_types',
    ),
  );
  return [trimmed];
}

function leadingBracketTags(text: string): string[] {
  const tags: string[] = [];
  let rest = text.trimStart();
  while (rest.startsWith('[')) {
    const end = rest.indexOf(']');
    if (end < 0) break;
    tags.push(rest.slice(0, end + 1));
    rest = rest.slice(end + 1).trimStart();
  }
  return tags;
}

function hasLeadingKeywordTag(text: string, tag: string): boolean {
  return leadingBracketTags(text).includes(tag);
}

export interface NormalizeCardPrintingsResult {
  definition: CardDefinition;
  /** card_image_id of every non-canonical printing (Parallel/SP/manga/etc.) — for library/UI art-picker use, not gameplay. */
  alternatePrintingImageIds: string[];
  warnings: NormalizationWarning[];
}

/** Normalizes one card NUMBER's full printing array (as returned by /sets/card, /decks/card, /promos/card) into one CardDefinition. */
export function normalizeCardPrintings(printings: CardPrintingDto[]): NormalizeCardPrintingsResult {
  const { canonical, alternates, warnings } = pickCanonicalPrinting(printings);
  const cardNumber = canonical.card_set_id;

  // "Also treat this card's name as [X] according to the rules." (2-1). Apostrophe
  // may be straight or curly; there can be more than one alias.
  const aliasNames: string[] = [];
  for (const m of canonical.card_text.matchAll(/treat this card[’']s name as \[([^\]]+)\]/gi)) {
    if (m[1] && !aliasNames.includes(m[1])) aliasNames.push(m[1]);
  }

  const definition: CardDefinition = {
    cardDefinitionId: cardNumber,
    name: canonical.card_name,
    ...(aliasNames.length > 0 ? { aliasNames } : {}),
    category: CARD_TYPE_TO_CATEGORY[canonical.card_type],
    colors: parseColors(canonical.card_color, cardNumber, warnings),
    types: parseTypes(canonical.sub_types, cardNumber, warnings),
    attributes: parseAttributes(canonical.attribute, cardNumber, warnings),
    basePower: coerceOptionalNumber(canonical.card_power),
    baseCost: coerceOptionalNumber(canonical.card_cost),
    text: canonical.card_text,
    life: coerceOptionalNumber(canonical.life),
    counter: coerceCounterAmount(canonical.counter_amount),
    hasTrigger: canonical.card_text.includes('[Trigger]'),
    triggerText: extractTriggerText(canonical.card_text, cardNumber, warnings),
    // Static keyword flags. [Blocker] must be in the leading tag run; text like
    // "cannot activate [Blocker]" does not make this card a Blocker.
    hasRush: canonical.card_text.includes('[Rush]') || canonical.card_text.includes('[Rush: Character]'),
    hasBlocker: hasLeadingKeywordTag(canonical.card_text, '[Blocker]'),
    hasDoubleAttack: canonical.card_text.includes('[Double Attack]'),
    hasBanish: canonical.card_text.includes('[Banish]'),
    isUnblockable: canonical.card_text.includes('[Unblockable]'),
    cardNumber,
    rarity: canonical.rarity,
    // blockSymbol, illustration, illustrator: not exposed by the OPTCG API at all (no source field) —
    // left undefined rather than guessed. See docs known-limitations.
  };

  return {
    definition,
    alternatePrintingImageIds: alternates.map((p) => p.card_image_id),
    warnings,
  };
}

/** Normalizes a DON!! card row. DON!! has no card_set_id in the API — card_image_id is the closest stable per-printing identifier and is used as both id and "number". */
export function normalizeDonCard(don: DonCardDto): { definition: CardDefinition; warnings: NormalizationWarning[] } {
  const cardNumber = don.card_image_id;
  const definition: CardDefinition = {
    cardDefinitionId: cardNumber,
    name: don.card_name,
    category: 'don',
    colors: [],
    types: [],
    text: don.card_text,
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    hasBanish: false,
    isUnblockable: false,
    cardNumber,
    rarity: don.rarity,
  };
  return { definition, warnings: [] };
}
