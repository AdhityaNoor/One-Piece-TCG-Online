/**
 * Builds the card-picker list for the "Report a Bug" modal from three
 * sources, highest-priority first:
 *  1. Both players' Leaders — a Leader is never logged via CARD_PLAYED
 *     (3-6-3: it's placed during setup, not "played"), so without adding it
 *     explicitly a reporter could never pin a bug to a Leader ability.
 *  2. The reporting player's OWN hand (`handOwnerPlayerId`) — a bug can be
 *     about a card that hasn't been played yet (e.g. "this shows the wrong
 *     cost in hand"). Deliberately only the reporter's own hand, never the
 *     opponent's: the opponent's hand is secret game state (3-4) and the
 *     picker has no business exposing it just because someone is filing a
 *     report. Callers pass null to omit this source entirely (e.g. no
 *     match in progress).
 *  3. The match's play history (CARD_PLAYED log entries) — cards already on
 *     the board or in the trash.
 * Each tier sorts above the next via `sequence` (Leaders = Infinity, hand
 * cards = MAX_SAFE_INTEGER, play history = the entry's real log sequence) —
 * see the final sort at the bottom of this function.
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

/** Which of the picker's three <optgroup> sections (ReportBugModal) this option belongs to. */
export type BugReportCardSection = 'leader' | 'hand' | 'field';

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
  /** Which picker section (Leader/Hand/Field) this option renders under. */
  section: BugReportCardSection;
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

/** Shared per-instance option builder — Leaders, hand cards, and play-history entries all resolve identically once you have an instance id, a label suffix, a sort tier, and a section. */
function buildOption(
  cardInstanceId: string,
  labelSuffix: string,
  turnNumber: number,
  sequence: number,
  section: BugReportCardSection,
  state: Pick<GameState, 'cardsById'>,
  defs: CardDefinitionLookup,
): BugReportCardOption {
  const instance = state.cardsById[cardInstanceId];
  const definitionId = instance?.cardDefinitionId;
  const definition = definitionId ? defs[definitionId] : undefined;
  const cardName = definition?.name ?? null;
  const cardNumber = definition?.cardNumber ?? null;
  const cardText = definition?.text ?? null;

  const titlePart = cardName && cardNumber ? `${cardName} (${cardNumber})` : cardName ?? cardNumber ?? `Card ${cardInstanceId}`;

  return {
    cardInstanceId,
    label: `${titlePart} — ${labelSuffix}`,
    turnNumber,
    sequence,
    snapshot: buildSnapshot(cardInstanceId, definitionId, cardName, cardNumber, cardText),
    subEffects: buildSubEffects(cardNumber, cardText),
    section,
  };
}

/** Sort tiers: Leaders always first, then the reporter's own hand, then real play-history sequence numbers (both comfortably below MAX_SAFE_INTEGER). */
const LEADER_SEQUENCE = Number.POSITIVE_INFINITY;
const HAND_CARD_SEQUENCE = Number.MAX_SAFE_INTEGER;

export function buildBugReportCardOptions(
  log: GameLogEntry[],
  state: Pick<GameState, 'cardsById' | 'players'>,
  defs: CardDefinitionLookup,
  /** The reporting player's own hand is offered too (requirement: "select cards in own hands"); the OPPONENT's hand never is — that's secret game state (3-4). Pass null when there's no meaningful "reporter" (e.g. no match in progress). */
  handOwnerPlayerId: string | null = null,
): BugReportCardOption[] {
  const options: BugReportCardOption[] = [];
  const seenInstanceIds = new Set<string>();

  // Leaders first — always available, never gated on having been "played" this match.
  for (const player of Object.values(state.players)) {
    const cardInstanceId = player.leaderInstanceId;
    if (seenInstanceIds.has(cardInstanceId)) continue;
    seenInstanceIds.add(cardInstanceId);
    options.push(buildOption(cardInstanceId, `${player.playerId}'s Leader`, 0, LEADER_SEQUENCE, 'leader', state, defs));
  }

  // The reporter's own hand — every entry shares HAND_CARD_SEQUENCE; Array.sort is
  // stable (ES2019+), so ties preserve this loop's order (i.e. hand order).
  const handOwner = handOwnerPlayerId ? state.players[handOwnerPlayerId] : undefined;
  if (handOwner) {
    for (const cardInstanceId of handOwner.hand.cardIds) {
      if (seenInstanceIds.has(cardInstanceId)) continue;
      seenInstanceIds.add(cardInstanceId);
      options.push(buildOption(cardInstanceId, 'In Hand', 0, HAND_CARD_SEQUENCE, 'hand', state, defs));
    }
  }

  for (const entry of log) {
    if (entry.type !== 'CARD_PLAYED') continue;

    for (const cardInstanceId of entry.relatedCardInstanceIds) {
      // A card instance is only ever played onto the board once (3-1-6: the
      // pre-play hand instance is retired, not reused) — de-dupe defensively
      // in case a future handler ever logs the same instance twice.
      if (seenInstanceIds.has(cardInstanceId)) continue;
      seenInstanceIds.add(cardInstanceId);
      options.push(buildOption(cardInstanceId, `Turn ${entry.turnNumber}`, entry.turnNumber, entry.sequence, 'field', state, defs));
    }
  }

  // Leaders, then the reporter's hand, then most-recently-played first — the
  // reporter is almost always describing something that just happened, same
  // "newest first" convention ActionLogDock uses.
  return options.sort((a, b) => b.sequence - a.sequence);
}
