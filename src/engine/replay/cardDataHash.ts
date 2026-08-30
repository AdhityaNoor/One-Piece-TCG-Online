/**
 * Fingerprint of the card data a match was played with.
 *
 * A trajectory replays through whatever CardDefinitions exist at replay time,
 * not the ones it was recorded with. This project re-derives printed keywords
 * and repairs catalog rows on a regular basis, so "the same card is not the
 * same card any more" is a live hazard — and a replay against drifted card
 * data produces states that never happened, silently. Comparing this hash
 * turns that into a refusal instead of corrupt training data.
 *
 * Hashes only the RULES-BEARING fields. Art, printings, rarity and flavour can
 * change freely without invalidating a recording.
 */
import type { CardDefinition } from '../state/card';

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function rulesFingerprint(def: CardDefinition): string {
  return [
    def.cardNumber,
    def.category,
    def.basePower ?? '',
    def.baseCost ?? '',
    def.life ?? '',
    def.counter ?? '',
    (def.colors ?? []).join('/'),
    (def.types ?? []).join('/'),
    (def.attributes ?? []).join('/'),
    def.hasTrigger ? 'T' : '',
    def.hasRush ? 'R' : '',
    def.hasBlocker ? 'B' : '',
    def.hasDoubleAttack ? 'D' : '',
    def.hasBanish ? 'X' : '',
    def.isUnblockable ? 'U' : '',
    def.text ?? '',
  ].join('~');
}

/**
 * Hash exactly the cards a trajectory names — both leaders plus every deck
 * entry — resolved through the caller's own lookup.
 *
 * Every producer and the replay MUST agree on the set being hashed, or the
 * comparison is meaningless. Hashing "whatever definitions this process
 * happens to have loaded" does not work: the client's lookup also carries the
 * generic DON!! card, a self-play rig carries two decks' worth, and an offline
 * replay resolves only what the trajectory names. Same cards, three different
 * hashes, and a permanent false "drift" verdict.
 */
export function hashCardDataForCardNumbers(
  cardNumbers: readonly string[],
  resolve: (cardNumber: string) => CardDefinition | undefined,
): string {
  const definitions: CardDefinition[] = [];
  for (const cardNumber of cardNumbers) {
    const def = resolve(cardNumber);
    if (def) definitions.push(def);
  }
  return hashCardData(definitions);
}

/** Hash the definitions actually used by a match, keyed and sorted by card number. */
export function hashCardData(definitions: readonly CardDefinition[]): string {
  const byNumber = new Map<string, string>();
  for (const def of definitions) {
    byNumber.set(def.cardNumber, rulesFingerprint(def));
  }
  const canonical = [...byNumber.keys()].sort().map((n) => byNumber.get(n)).join('\n');
  return fnv1a(canonical);
}
