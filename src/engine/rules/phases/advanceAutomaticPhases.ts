/**
 * Orchestrates the fully-automatic phases (6-1-1): Refresh -> Draw -> DON!!
 * -> Main (stop, awaits player input) | End -> handoff -> Refresh (loop for
 * the new turn player). Called by the dispatcher (actions/dispatch.ts) after
 * EVERY executeAction, including setup's last step — it's a no-op whenever
 * currentPhase is already 'main' or 'setup', so it's always safe to call.
 *
 * Stops immediately if gameOver becomes set mid-loop (e.g. a Draw Phase
 * deck-out) — never advances a phase once the game has ended.
 */
import type { GameState } from '../../state/game';
import type { GameLogEntry } from '../../logs/logEntry';
import type { CardDefinitionLookup } from '../shared/definitions';
import type { EffectTemplateRegistry } from '../../effects';
import { runRefreshPhase } from './runRefreshPhase';
import { runDrawPhase } from './runDrawPhase';
import { runDonPhase } from './runDonPhase';
import { runEndPhaseAndHandoff } from './runEndPhaseAndHandoff';
import { fireStartOfTurnReactions } from '../../effects/fireTiming';
import { advanceStartOfGameEffects } from '../../setup/advanceStartOfGameEffects';

export interface AdvanceAutomaticPhasesResult {
  state: GameState;
  log: GameLogEntry[];
}

export function advanceAutomaticPhases(state: GameState, defs: CardDefinitionLookup = {}, registry: EffectTemplateRegistry = {}): AdvanceAutomaticPhasesResult {
  let current = state;
  const log: GameLogEntry[] = [];

  // Safety valve: a real game can never legitimately loop more than a
  // handful of times per call (one pass per phase, per turn). A much higher
  // ceiling guards against an actual infinite loop turning into a hang
  // without ever tripping during normal play.
  const MAX_ITERATIONS = 1000;
  let iterations = 0;

  while (!current.gameOver && iterations < MAX_ITERATIONS) {
    iterations += 1;
    // Never auto-advance turn phases while a player choice is outstanding
    // (e.g. start-of-turn YES_NO / search suspended mid-Refresh). Setup keeps
    // its own PendingChoice handling via advanceStartOfGameEffects below.
    if (current.pendingChoices.length > 0 && current.currentPhase !== 'setup') {
      return { state: current, log };
    }
    switch (current.currentPhase) {
      case 'refresh': {
        // OP11-040 FAQ: start-of-turn effects fire at the beginning of Refresh,
        // before returning given DON!! / set-active / Draw / DON!! placement.
        const sot = fireStartOfTurnReactions(current, registry, defs, null);
        current = sot.state;
        log.push(...sot.log);
        if (sot.pendingChoices.length > 0) {
          // Choice is already on state.pendingChoices — do not append again.
          return { state: current, log };
        }
        const result = runRefreshPhase(current, defs);
        current = result.state;
        log.push(...result.log);
        break;
      }
      case 'draw': {
        const result = runDrawPhase(current);
        current = result.state;
        log.push(...result.log);
        break;
      }
      case 'don': {
        const result = runDonPhase(current);
        current = result.state;
        log.push(...result.log);
        break;
      }
      case 'end': {
        const result = runEndPhaseAndHandoff(current, defs, registry);
        current = result.state;
        log.push(...result.log);
        break;
      }
      case 'setup': {
        // Only the 'awaitingStartOfGameLeaderEffect' stage does automatic work
        // here (5-2-1-5-1); advanceStartOfGameEffects itself is a no-op for
        // the other two setup stages ('awaitingGoingFirstChoice' /
        // 'awaitingMulliganDecision'), matching this function's existing
        // "no-op outside handled phases/stages" contract.
        const result = advanceStartOfGameEffects(current, defs, registry, null);
        current = result.state;
        log.push(...result.log);
        return { state: current, log };
      }
      case 'main':
        return { state: current, log };
      default:
        return { state: current, log };
    }
  }

  return { state: current, log };
}
