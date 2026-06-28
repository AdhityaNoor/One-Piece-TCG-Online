/**
 * Shared return shape for every setup-phase execute* function, matching the
 * project ground rule "every valid action must return: new game state, game
 * log entry, pending choices" (blueprint Section 12).
 *
 * `log` and `pendingChoices` here are DELTAS — only what this single action
 * newly produced — not the full accumulated `state.log` / `state.pendingChoices`,
 * which already contain everything including these new entries. A UI/log
 * viewer wanting "what just happened" reads the delta; anything wanting
 * "everything so far" reads off `state` directly.
 */
import type { GameState } from '../state/game';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';

export interface SetupExecuteResult {
  state: GameState;
  log: GameLogEntry[];
  pendingChoices: PendingChoice[];
}
