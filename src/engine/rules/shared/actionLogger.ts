/**
 * Shared log-entry builder for action handlers — the same delta-accumulating
 * pattern already used by setup/applyChooseGoingFirst.ts and
 * setup/applyMulliganDecision.ts, factored out here so every new handler
 * (one per GameActionType) doesn't reimplement sequence-numbering. See
 * setup/setupExecuteResult.ts for why `log` returned to the caller is a
 * DELTA, not the full accumulated state.log.
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';

export type DraftLogEntry = Omit<GameLogEntry, 'id' | 'sequence' | 'turnNumber' | 'phase' | 'causedByActionId'>;

export interface ActionLogger {
  log: GameLogEntry[];
  push(entry: DraftLogEntry): void;
}

/**
 * `state` should be the state at the START of the handler (before any
 * mutation) — turnNumber/currentPhase/log.length are all read once, up
 * front, which is correct because every entry pushed during one action
 * dispatch happens conceptually "during" that one turn/phase.
 */
export function createActionLogger(state: GameState, actionId: string | null): ActionLogger {
  const log: GameLogEntry[] = [];
  let sequence = state.log.length;
  return {
    log,
    push(entry: DraftLogEntry): void {
      sequence += 1;
      log.push({
        id: `log-${sequence}`,
        sequence,
        turnNumber: state.turnNumber,
        phase: state.currentPhase,
        causedByActionId: actionId,
        ...entry,
      });
    },
  };
}
