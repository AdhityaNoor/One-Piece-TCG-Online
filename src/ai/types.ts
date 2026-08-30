import type { GameAction } from '../engine/actions';
import type { EvaluatorWeights } from './evaluation/weights';

export type CpuDifficulty = 'easy' | 'normal' | 'hard';

export interface CpuConfig {
  difficulty: CpuDifficulty;
  /** When true, logs ranked actions to the console (dev only). */
  debug?: boolean;
  /** Optional tie-break seed for deterministic decisions among equal scores. */
  seed?: string;
  /**
   * Position-evaluation weights for this seat. Omitted means the shipped
   * baseline. Present so two weight sets can be played against each other in
   * one process — see evaluation/weights.ts.
   */
  weights?: EvaluatorWeights;
}

export interface ScoredAction {
  action: GameAction;
  score: number;
  label: string;
}

export interface CpuDebugInfo {
  generated: number;
  top: ScoredAction[];
  chosen: ScoredAction;
  elapsedMs: number;
}

export interface CpuDecision {
  action: GameAction;
  debug?: CpuDebugInfo;
}

export interface ChooseActionParams {
  playerId: string;
  createActionId: () => string;
}
