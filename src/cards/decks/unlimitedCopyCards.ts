/**
 * Deck-construction config: card numbers exempt from the 5-1-2-3 four-copies-
 * per-card-number cap — i.e. cards printed with "Under the rules of this game,
 * you may have any number of this card in your deck."
 *
 * This is an explicit, hand-maintained allowlist rather than something derived
 * from card text or the card API, so the exemption is auditable, stable across
 * API changes, and lives in one place. Add a card number here when a new "any
 * number" card is released.
 */
export const UNLIMITED_COPY_CARD_NUMBERS: ReadonlySet<string> = new Set<string>([
  'OP01-075', // Pacifista
  'OP08-072', // Biscuit Warrior
  'OP16-042', // Prisoner of Impel Down
]);

/** True if `cardNumber` is exempt from the 4-copies-per-number deck cap. */
export function hasUnlimitedCopies(cardNumber: string): boolean {
  return UNLIMITED_COPY_CARD_NUMBERS.has(cardNumber);
}
