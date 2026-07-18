/**
 * Builds the card-picker list for the "Report a Bug" modal from the match's
 * play history (requirement: "select the card played on board by the
 * playing history of the match"), PLUS both players' Leaders — a Leader is
 * never logged via CARD_PLAYED (3-6-3: it's placed during setup, not
 * "played"), so without adding it explicitly a reporter could never pin a
 * bug to their own or the opponent's Leader ability. Leaders are pinned to
 * the top of the list (Infinity sequence) since they're always relevant,
 * unlike a CARD_PLAYED entry which ages as the match goes on.
 *
 * Each option also carries `subEffects`: the card's raw text broken into its
 * individual bracketed abilities (e.g. separate [On Play] / [Trigger]
 * entries), via the existing effect parser (src/cards/effectParser). That
 * parser is a pure text-segmentation/description layer — it never executes
 * anything (see its own header) — so reusing it here to offer "which part of
 * the text is this about" is safe under project rule #6 (never treat card
 * text as executable logic): we only ever read `rawText` back out, never
 * `actions`/`timing`/etc. A card with 0 or 1 ability has no meaningful choice
 * to offer, so `subEffects` is `[]` in that case and the picker should just
 * skip the sub-effect step.
 *
 * A pure function (log/state/defs in, options out) so it's testable under
 * plain Vitest with no store/React involved — same testing shape the rest of
 * /src/app/lib favors (see e.g. logDisplay.ts).
 */
import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { BugReportCardSnapshot } from '../../../shared/support';
import { parseEffect } from '../../cards/effectParser/parseEffect';

export interface BugReportSubEffectOption {
  /** Index into the card's parsed ability list — the value actually submitted (paired with cardInstanceId). */
  index: number;
  /** e.g. "[On Play] Draw 1 card." — short enough for a <select> row, full text if it isn't. */
  label: string;
  /** The exact raw text slice this ability came from (see parseEffect's ParsedAbility.rawText). */
  text: string;
}

export interface BugReportCardOption {
  /** React key + the value actually submitted. */
  cardInstanceId: string;
  /** e.g. "Monkey D. Luffy (OP01-001) — Turn 3" */
  label: string;
  turnNumber: number;
  /** GameLogEntry.sequence of the originating CARD_PLAYED entry — lets callers sort/dedupe deterministically. Leader options use Infinity so they always sort first. */
  sequence: number;
  snapshot: BugReportCardSnapshot;
  /** This card's text split into individually-selectable abilities; empty when there's only one (nothing to choose between). */
  subEffects: BugReportSubEffectOption[];
}

const SUB_EFFECT_LABEL_MAX_LENGTH = 70;

function buildSubEffects(cardNumber: string | null, cardText: string | null): BugReportSubEffectOption[] {
  if (!cardText || !cardText.trim()) return [];
  const { abilities } = parseEffect(cardNumber ?? 'unknown', cardText);
  // Nothing to choose between when the whole card is one ability (or the parser found none).
  if (abilities.length < 2) return [];
  return abilities.map((ability, index) => ({
    index,
    label: ability.rawText.length > SUB_EFFECT_LABEL_MAX_LENGTH ? `${ability.rawText.slice(0, SUB_EFFECT_LABEL_MAX_LENGTH)}…` : ability.rawText,
    text: ability.rawText,
  }));
}

function buildSnapshot(
  cardInstanceId: string,
  definitionId: string | undefined,
  cardName: string | null,
  cardNumber: string | null,
  cardText: string | null,
): BugReportCardSnapshot {
  return {
    cardInstanceId,
    cardDefinitionId: definitionId ?? 'unknown',
    cardNumber,
    cardName,
    cardText,
    selectedEffectText: null,
  };
}

export function buildBugReportCardOptions(
  log: GameLogEntry[],
  state: Pick<GameState, 'cardsById' | 'players'>,
  defs: CardDefinitionLookup,
): BugReportCardOption[] {
  const options: BugReportCardOption[] = [];
  const seenInstanceIds = new Set<string>();

  // Leaders first — always available, never gated on having been "played" this match.
  for (const player of Object.values(state.players)) {
    const cardInstanceId = player.leaderInstanceId;
    if (seenInstanceIds.has(cardInstanceId)) continue;
    seenInstanceIds.add(cardInstanceId);

    const instance = state.cardsById[cardInstanceId];
    const definitionId = instance?.cardDefinitionId;
    const definition = definitionId ? defs[definitionId] : undefined;
    const cardName = definition?.name ?? null;
    const cardNumber = definition?.cardNumber ?? null;
    const cardText = definition?.text ?? null;

    const titlePart = cardName && cardNumber ? `${cardName} (${cardNumber})` : cardName ?? cardNumber ?? `Card ${cardInstanceId}`;

    options.push({
      cardInstanceId,
      label: `${titlePart} — ${player.playerId}'s Leader`,
      turnNumber: 0,
      sequence: Number.POSITIVE_INFINITY,
      snapshot: buildSnapshot(cardInstanceId, definitionId, cardName, cardNumber, cardText),
      subEffects: buildSubEffects(cardNumber, cardText),
    });
  }

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
      const cardText = definition?.text ?? null;

      const titlePart = cardName && cardNumber ? `${cardName} (${cardNumber})` : cardName ?? cardNumber ?? `Card ${cardInstanceId}`;
      const label = `${titlePart} — Turn ${entry.turnNumber}`;

      options.push({
        cardInstanceId,
        label,
        turnNumber: entry.turnNumber,
        sequence: entry.sequence,
        snapshot: buildSnapshot(cardInstanceId, definitionId, cardName, cardNumber, cardText),
        subEffects: buildSubEffects(cardNumber, cardText),
      });
    }
  }

  // Leaders (Infinity) first, then most-recently-played first — the reporter
  // is almost always describing something that just happened, same
  // "newest first" convention ActionLogDock uses.
  return options.sort((a, b) => b.sequence - a.sequence);
}
