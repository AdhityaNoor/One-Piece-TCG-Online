/**
 * Builds the card-picker list for the "Report a Bug" modal from the match's
 * play history (requirement: "select the card played on board by the
 * playing history of the match"). Sourced from CARD_PLAYED log entries only
 * — other event types (attacks, effects, DON!! moves) don't represent a card
 * being put onto the board and would just be noise in what should be a
 * short, scannable picker.
 *
 * A pure function (log/state/defs in, options out) so it's testable under
 * plain Vitest with no store/React involved — same testing shape the rest of
 * /src/app/lib favors (see e.g. logDisplay.ts).
 */
import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { BugReportCardSnapshot } from '../../../shared/support';

export interface BugReportCardOption {
  /** React key + the value actually submitted. */
  cardInstanceId: string;
  /** e.g. "Monkey D. Luffy (OP01-001) — Turn 3" */
  label: string;
  turnNumber: number;
  /** GameLogEntry.sequence of the originating CARD_PLAYED entry — lets callers sort/dedupe deterministically. */
  sequence: number;
  snapshot: BugReportCardSnapshot;
}

export function buildBugReportCardOptions(
  log: GameLogEntry[],
  state: Pick<GameState, 'cardsById'>,
  defs: CardDefinitionLookup,
): BugReportCardOption[] {
  const options: BugReportCardOption[] = [];
  const seenInstanceIds = new Set<string>();

  for (const entry of log) {
    if (entry.type !== 'CARD_PLAYED') continue;

    for (const cardInstanceId of entry.relatedCardInstanceIds) {
      // A card instance is only ever played onto the board once (3-1-6: the
      // pre-play hand instance is retired, not reused) — de-dupe defensively
      // in case a future handler ever logs the same instance twice.
      if (seenInstanceIds.has(cardInstanceId)) continue;
      seenInstanceIds.add(cardInstanceId);

      const instance = state.cardsById[cardInstanceId];
      const definitionId = instance?.cardDefinitionId;
      const definition = definitionId ? defs[definitionId] : undefined;
      const cardName = definition?.name ?? null;
      const cardNumber = definition?.cardNumber ?? null;

      const titlePart = cardName && cardNumber ? `${cardName} (${cardNumber})` : cardName ?? cardNumber ?? `Card ${cardInstanceId}`;
      const label = `${titlePart} — Turn ${entry.turnNumber}`;

      options.push({
        cardInstanceId,
        label,
        turnNumber: entry.turnNumber,
        sequence: entry.sequence,
        snapshot: {
          cardInstanceId,
          cardDefinitionId: definitionId ?? 'unknown',
          cardNumber,
          cardName,
          cardText: definition?.text ?? null,
        },
      });
    }
  }

  // Most-recently-played first — the reporter is almost always describing
  // something that just happened, same "newest first" convention ActionLogDock uses.
  return options.sort((a, b) => b.sequence - a.sequence);
}
