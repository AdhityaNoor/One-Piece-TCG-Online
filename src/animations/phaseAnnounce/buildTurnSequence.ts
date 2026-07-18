import type { GameLogEntry } from '../../engine/logs/logEntry';
import type { GameState } from '../../engine/state/game';
import { parseMovementSpecs } from '../cardMovement/parseLogEntries';
import { applyMovementPresentation } from '../cardMovement/presentationHints';
import { FLIGHT_MS } from '../cardMovement/types';
import type { AnnouncedPhase, TurnSequenceStep } from './types';

const PHASE_LABELS: Record<AnnouncedPhase, string> = {
  refresh: 'Refresh Phase',
  draw: 'Draw Phase',
  don: 'DON!! Phase',
  main: 'Main Phase',
};

/** How long the turn-change banner ("Turn N / PLAYER Turn") stays up — matches the old standalone TurnChangeBanner's feel. */
const TURN_CHANGE_MS = 1250;
/** Bare "read the banner" dwell for a step with no card flights, or when animations are disabled. */
const READ_MS = 900;
/** Buffer after the last flight lands before advancing, so the landing doesn't get cut off mid-motion. */
const FLIGHT_SETTLE_MS = 250;

function isPhaseMarker(entry: GameLogEntry, phase: AnnouncedPhase): boolean {
  return entry.type === 'PHASE_CHANGED' && entry.data.phase === phase;
}

function pluralCards(n: number): string {
  return `${n} card${n === 1 ? '' : 's'}`;
}

function detailFor(phase: AnnouncedPhase, entry: GameLogEntry): string | null {
  if (phase === 'refresh') {
    const count = entry.relatedCardInstanceIds.length;
    return count > 0 ? `${pluralCards(count)} activated` : null;
  }
  if (phase === 'draw' && entry.data.skipped) return 'Draw skipped';
  return null;
}

export interface TurnSequenceResult {
  /** Everything NOT part of the sequence (End Phase, ordinary mid-turn actions like playing a
   * card, etc) — the caller keeps animating these immediately via the existing
   * cardAnimationStore path, same as before this sequencer existed. */
  preStepEntries: GameLogEntry[];
  /** The full ordered sequence for this dispatch: [turnChange?] -> refresh -> draw -> don -> main, one entry per step. Empty when nothing phase-related happened (e.g. playing a card mid-Main). */
  steps: TurnSequenceStep[];
}

/**
 * Splits a dispatch's log delta into ONE fully-ordered sequence: the
 * turn-change banner (when this dispatch crossed a turn boundary) followed
 * by Refresh -> Draw -> DON!! -> Main. advanceAutomaticPhases
 * (engine/rules/phases) can run the whole cascade inside ONE dispatch, so a
 * single log delta commonly contains every marker at once — this is what
 * lets the UI replay the ENTIRE thing as one strict sequence (banner
 * appears -> its own flights, if any -> banner dismissed -> next banner)
 * instead of jumping straight to whatever the state settles at, or running
 * the turn-change banner and the phase banners as two independent systems
 * racing each other (which is what this replaced — see phaseAnnounceStore.ts
 * doc comment).
 *
 * The turn-change step is sourced from the TURN_PASSED entry
 * (runEndPhaseAndHandoff.ts) when present. Turn 1 has no TURN_PASSED (it
 * begins via MULLIGAN_DECISION, not End Phase/handoff), so whenever a
 * Refresh marker exists with no TURN_PASSED anywhere in the delta, a
 * turn-change step is synthesized from prevState.turnNumber instead —
 * otherwise the very first turn would silently skip its "Turn 1" banner.
 *
 * 'main' always gets a synthesized step (no PHASE_CHANGED entry marks
 * entering Main — see runDonPhase.ts's doc comment) with no card flights of
 * its own, appended right after 'don' whenever a cascade was found.
 *
 * When `animationsEnabled` is false, every phase step still gets its
 * READ_MS dwell (the sequence itself keeps happening — the player still
 * sees each phase announced in order) but carries zero movementSpecs, so
 * nothing flies and CardMovementOverlay never spins up.
 */
export function buildTurnSequence(
  prevState: GameState,
  logDelta: GameLogEntry[],
  images: Record<string, string | null>,
  localPlayerId: string | null,
  animationsEnabled: boolean,
): TurnSequenceResult {
  const refreshIdx = logDelta.findIndex((entry) => isPhaseMarker(entry, 'refresh'));
  const turnPassedEntry = logDelta.find((entry) => entry.type === 'TURN_PASSED') ?? null;

  const steps: TurnSequenceStep[] = [];

  if (refreshIdx !== -1) {
    if (turnPassedEntry && turnPassedEntry.actorPlayerId) {
      const turnNumber = typeof turnPassedEntry.data.turnNumber === 'number' ? turnPassedEntry.data.turnNumber : prevState.turnNumber + 1;
      steps.push({ kind: 'turnChange', id: turnPassedEntry.id, playerId: turnPassedEntry.actorPlayerId, turnNumber, durationMs: TURN_CHANGE_MS });
    } else {
      // No TURN_PASSED but a cascade still ran -> this is turn 1 (mulligan-driven), which never
      // hands off from a previous player. Attribute it to whoever the cascade's own first marker
      // belongs to, read below once we know it, rather than guessing here.
      const firstMarker = logDelta[refreshIdx];
      if (firstMarker.actorPlayerId) {
        steps.push({ kind: 'turnChange', id: `${firstMarker.id}-turn`, playerId: firstMarker.actorPlayerId, turnNumber: prevState.turnNumber, durationMs: TURN_CHANGE_MS });
      }
    }
  }

  if (refreshIdx === -1) {
    const preStepEntries = turnPassedEntry ? logDelta.filter((entry) => entry !== turnPassedEntry) : logDelta;
    return { preStepEntries, steps };
  }

  const preStepEntries = logDelta.slice(0, refreshIdx).filter((entry) => entry !== turnPassedEntry);
  const cascade = logDelta.slice(refreshIdx);

  const markers: { phase: AnnouncedPhase; index: number; entry: GameLogEntry }[] = [];
  cascade.forEach((entry, index) => {
    if (isPhaseMarker(entry, 'refresh')) markers.push({ phase: 'refresh', index, entry });
    else if (isPhaseMarker(entry, 'draw')) markers.push({ phase: 'draw', index, entry });
    else if (isPhaseMarker(entry, 'don')) markers.push({ phase: 'don', index, entry });
  });

  let lastPhasePlayerId: string | null = null;
  let lastPhaseStepId: string | null = null;

  for (let i = 0; i < markers.length; i += 1) {
    const marker = markers[i];
    if (!marker.entry.actorPlayerId) continue;
    const segmentEnd = i + 1 < markers.length ? markers[i + 1].index : cascade.length;
    const segment = cascade.slice(marker.index, segmentEnd);

    const rawSpecs = animationsEnabled
      ? applyMovementPresentation(parseMovementSpecs(prevState, segment, images), localPlayerId)
      : [];
    const durationMs = rawSpecs.length > 0
      ? Math.max(READ_MS, Math.max(...rawSpecs.map((s) => s.delayMs)) + FLIGHT_MS + FLIGHT_SETTLE_MS)
      : READ_MS;

    lastPhasePlayerId = marker.entry.actorPlayerId;
    lastPhaseStepId = marker.entry.id;

    steps.push({
      kind: 'phase',
      id: marker.entry.id,
      phase: marker.phase,
      playerId: marker.entry.actorPlayerId,
      label: PHASE_LABELS[marker.phase],
      detail: detailFor(marker.phase, marker.entry),
      movementSpecs: rawSpecs,
      durationMs,
    });
  }

  if (lastPhasePlayerId && lastPhaseStepId) {
    steps.push({
      kind: 'phase',
      id: `${lastPhaseStepId}-main`,
      phase: 'main',
      playerId: lastPhasePlayerId,
      label: PHASE_LABELS.main,
      detail: null,
      movementSpecs: [],
      durationMs: READ_MS,
    });
  }

  return { preStepEntries, steps };
}
