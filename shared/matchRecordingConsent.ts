/**
 * Whether a match may be recorded, given what each seat answered.
 *
 * Lives in `shared/` rather than inside the room because it is a policy both
 * sides need to agree on: the client's settings copy tells a player what
 * declining does, and the server is what actually honours it. A rule stated in
 * one place cannot drift between the promise and the behaviour.
 *
 * THE RULE: EVERY SEAT MUST AGREE.
 * A trajectory is a single artifact describing the whole match — both decks,
 * both players' decisions, replayed together from one seed. There is no
 * coherent way to record one seat's half of it, so a single decline stops the
 * whole recording. The alternative (record whenever anyone consents) would mean
 * a player who turned the setting off still had their decks and their play
 * written to disk, decided by their opponent. That is not consent.
 *
 * An absent answer counts as yes: the shipped client default is on, and an
 * older build that does not send the field must keep behaving as it does today.
 */
export interface RecordingConsentSeat {
  seatId: string;
  /** Undefined means "did not answer", which is treated as consent. */
  contributeMatchData?: boolean;
}

export function shouldRecordMatch(seats: readonly RecordingConsentSeat[]): boolean {
  // No seats is not consent from anybody — there is nobody to have agreed.
  if (seats.length === 0) return false;
  return seats.every((seat) => seat.contributeMatchData !== false);
}

/** Which seats declined, for logging or for telling a player why. */
export function decliningSeatIds(seats: readonly RecordingConsentSeat[]): string[] {
  return seats.filter((seat) => seat.contributeMatchData === false).map((seat) => seat.seatId);
}
