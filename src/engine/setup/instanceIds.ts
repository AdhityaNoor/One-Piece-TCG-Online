/**
 * Deterministic instance-id minting for the ONE-TIME setup procedure.
 *
 * Per 3-1-6, a card only needs a freshly-minted instanceId when it leaves
 * the Character or Stage area — setup never places cards there, so every
 * id minted here is the card's identity for the rest of the game (drawing,
 * mulligan-reshuffling, and dealing Life cards all just move an existing
 * instanceId between zones; they never re-mint it).
 *
 * Ids are deterministic strings (not random/UUID) so that two calls to
 * createPreGameState with identical input produce byte-identical
 * CardInstance ids — important for replay/golden-test stability. A running
 * per-instance counter for the LATER in-game "new card" re-mint case
 * (3-1-6, when a card actually does leave Character/Stage area mid-game) is
 * out of scope here — that belongs to the action-dispatch/execute work
 * (see blueprint Known Limitations).
 */

export function mintLeaderInstanceId(playerId: string): string {
  return `${playerId}__leader`;
}

export function mintDeckInstanceId(playerId: string, index: number): string {
  return `${playerId}__deck__${index}`;
}

export function mintDonInstanceId(playerId: string, index: number): string {
  return `${playerId}__don__${index}`;
}
