/**
 * Shared return shape for every automatic phase step (Refresh/Draw/DON!!/End),
 * mirroring setup/setupExecuteResult.ts's delta convention: `log` is only
 * what THIS step produced, even though `state.log` already has it appended.
 * No PendingChoice slot — none of these steps ever block on player input in
 * this milestone (Main Phase is where the cascade always stops and hands
 * control back to the dispatcher's caller).
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';

export interface PhaseStepResult {
  state: GameState;
  log: GameLogEntry[];
}
