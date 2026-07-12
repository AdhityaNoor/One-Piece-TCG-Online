/**
 * Per-seat hidden-information redaction. The server holds the FULL
 * authoritative GameState, but must never send a seat information it isn't
 * entitled to see — otherwise a modified client could read the opponent's
 * hand straight off the wire (project rule: do not trust the client; card
 * visibility must be modeled properly even though the local hot-seat UI can
 * reveal both hands).
 *
 * We reuse the engine's OWN visibility model rather than inventing rules:
 *   - Zone.visibility ('open' | 'secret') — 3-1-5.
 *   - CardInstance.revealedTo ('all' | playerId[]) — transient reveals (11-2-2).
 *   - CardInstance.faceState — face-down cards in secret areas (life).
 *   - GameLogEntry.visibility ('public' | { visibleTo }) — secret log lines.
 *
 * Secret zones: `deck` (order secret to everyone), `hand` (secret to the
 * opponent), `lifeArea` (face-down, secret to everyone until revealed). All
 * other zones are open and fully visible.
 *
 * Redaction blanks a hidden card's identity (cardDefinitionId -> sentinel) so
 * the client literally cannot look up what it is; structural fields
 * (instanceId, zone membership, orientation, faceState) remain so a card BACK
 * still renders in the right place. Hand SIZE stays visible — that is public
 * information (you can count an opponent's hand).
 */
import type { GameState } from '../../../src/engine/state';
import type { CardInstance } from '../../../src/engine/state/card';
import type { GameLogEntry } from '../../../src/engine/logs/logEntry';

/** Sentinel identity for a card the viewing seat may not see. */
export const HIDDEN_CARD_DEF_ID = '__HIDDEN__';

/** The three secret zones on a PlayerState, by field name. */
const SECRET_ZONE_FIELDS = ['deck', 'hand', 'lifeArea'] as const;

function isRevealedTo(card: CardInstance, seatId: string): boolean {
  if (card.revealedTo === 'all') return true;
  return Array.isArray(card.revealedTo) && card.revealedTo.includes(seatId);
}

function pendingChoiceVisibleInstanceIds(state: GameState, seatId: string): Set<string> {
  const visible = new Set<string>();
  for (const choice of state.pendingChoices) {
    if (choice.playerId !== seatId) continue;
    for (const id of choice.constraints.visibleInstanceIds ?? choice.constraints.candidateInstanceIds ?? []) {
      visible.add(id);
    }
  }
  return visible;
}

/** May `seatId` know the identity of `card` sitting in `zoneField` owned by `ownerId`? */
function cardVisibleToSeat(
  card: CardInstance,
  ownerId: string,
  zoneField: (typeof SECRET_ZONE_FIELDS)[number],
  seatId: string,
  pendingVisibleIds: Set<string>,
): boolean {
  if (pendingVisibleIds.has(card.instanceId)) return true;
  if (isRevealedTo(card, seatId)) return true;
  switch (zoneField) {
    case 'hand':
      return ownerId === seatId; // you see your own hand, never the opponent's
    case 'deck':
      return false; // deck order/identity is secret to everyone
    case 'lifeArea':
      return card.faceState === 'faceUp'; // face-down life is secret to all
    default:
      return true;
  }
}

export interface RedactedView {
  /** Serialized, seat-redacted GameState (JSON). */
  json: string;
  /**
   * Distinct cardDefinitionIds that remain VISIBLE to this seat after
   * redaction. The room uses this to ship only the card definitions the seat
   * is entitled to see — never the opponent's hidden decklist.
   */
  definitionIds: string[];
}

/**
 * Produce a seat-redacted GameState. Deep-clones via JSON (the state is
 * JSON-serializable by contract) so the authoritative object is never mutated.
 * Also reports which card definitions remain visible, so only those are sent.
 */
export function redactStateForSeat(state: GameState, seatId: string): RedactedView {
  const clone = JSON.parse(JSON.stringify(state)) as GameState;
  const pendingVisibleIds = pendingChoiceVisibleInstanceIds(state, seatId);

  for (const player of Object.values(clone.players)) {
    const ownerId = player.playerId;
    for (const zoneField of SECRET_ZONE_FIELDS) {
      const zone = player[zoneField];
      if (!zone) continue;
      for (const instanceId of zone.cardIds) {
        const card = clone.cardsById[instanceId];
        if (!card) continue;
        if (!cardVisibleToSeat(card, ownerId, zoneField, seatId, pendingVisibleIds)) {
          card.cardDefinitionId = HIDDEN_CARD_DEF_ID;
          // Strip any resolved/derived identity hints; a hidden card shows nothing.
          card.currentPower = undefined;
          card.currentCost = undefined;
          card.revealedTo = [];
        }
      }
    }
  }

  // Redact the embedded log too (state.log carries the full history).
  clone.log = filterLogForSeat(clone.log, seatId);

  // Collect the definition ids that survived redaction (i.e. this seat may see).
  const definitionIds = new Set<string>();
  for (const card of Object.values(clone.cardsById)) {
    if (card.cardDefinitionId !== HIDDEN_CARD_DEF_ID) definitionIds.add(card.cardDefinitionId);
  }

  return { json: JSON.stringify(clone), definitionIds: [...definitionIds] };
}

/**
 * Filter a list of log entries to those `seatId` is allowed to see. Secret
 * entries (a private draw, a peeked card, etc.) are dropped entirely rather
 * than masked, so no trace of the secret leaks. Used both for the state's
 * embedded log and for the per-action log deltas the room streams.
 */
export function filterLogForSeat(entries: GameLogEntry[], seatId: string): GameLogEntry[] {
  return entries.filter((entry) => {
    if (entry.visibility === 'public') return true;
    return entry.visibility.visibleTo.includes(seatId);
  });
}
