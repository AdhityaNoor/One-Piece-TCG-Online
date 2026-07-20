const TYPE_ALIASES: Record<string, string[]> = {
  blackbeardpirates: ['blackbeardpirates', '\u9ED2\u3072\u3052\u6D77\u8CCA\u56E3'],
};

function normalizeTypeForCompare(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function typeNeedles(required: string): string[] {
  const normalized = normalizeTypeForCompare(required);
  return Array.from(new Set(TYPE_ALIASES[normalized] ?? [normalized])).filter(Boolean);
}

/**
 * True when any printed type tag contains the required type.
 *
 * Saved decks may preserve older scraped/localized type strings, so matching is
 * compacted for punctuation/spacing and can include conservative known aliases.
 */
export function cardTypeIncludes(types: readonly string[] | undefined, required: string): boolean {
  const needles = typeNeedles(required);
  if (needles.length === 0) return false;
  return (types ?? []).some((type) =>
    type
      .split(/[\/,]+/)
      .map(normalizeTypeForCompare)
      .some((candidate) => needles.some((needle) => candidate.includes(needle))),
  );
}
