/**
 * Shared return shape for every action handler's execute* function —
 * the generic-action-layer equivalent of setup/setupExecuteResult.ts,
 * satisfying the same project ground rule ("every valid action must
 * return: new game state, game log entry, pending choices").
 *
 * `log` and `pendingChoices` are DELTAS (this dispatch only), exactly like
 * SetupExecuteResult — see that file's doc comment for why.
 */
import type { GameState } from '../state/game';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';

export interface ActionExecuteResult {
  state: GameState;
  log: GameLogEntry[];
  pendingChoices: PendingChoice[];
}
