import type { GameAction } from '../engine/actions';

export type CpuDifficulty = 'easy' | 'normal' | 'hard';

export interface CpuConfig {
  difficulty: CpuDifficulty;
  /** When true, logs ranked actions to the console (dev only). */
  debug?: boolean;
  /** Optional tie-break seed for deterministic decisions among equal scores. */
  seed?: string;
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
