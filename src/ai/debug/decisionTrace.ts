import type { ScoredAction } from '../types';
import type { StrategicContext } from '../strategy/types';

export interface DecisionTrace {
  mode: string;
  gamePhase: string;
  leader: string;
  utility: number;
  lethalProbability: number;
  survivalRisk: number;
  topActions: Array<{ label: string; score: number; trace?: string[] }>;
  chosen: { label: string; score: number };
  elapsedMs: number;
}

export function buildDecisionTrace(
  strategic: StrategicContext,
  scored: ScoredAction[],
  chosen: ScoredAction,
  elapsedMs: number,
  actionTraces?: Map<string, string[]>,
): DecisionTrace {
  const sorted = [...scored].sort((a, b) => b.score - a.score).slice(0, 5);
  return {
    mode: strategic.mode,
    gamePhase: strategic.gamePhase,
    leader: strategic.leader.description,
    utility: strategic.objective.utility,
    lethalProbability: strategic.objective.currentLethalProbability,
    survivalRisk: strategic.survival.immediateLossRisk,
    topActions: sorted.map((s) => ({
      label: s.label,
      score: s.score,
      trace: actionTraces?.get(JSON.stringify(s.action)),
    })),
    chosen: { label: chosen.label, score: chosen.score },
    elapsedMs,
  };
}

export function logDecisionTrace(trace: DecisionTrace): void {
  if (typeof console === 'undefined') return;
  console.group(`CPU Strategy [${trace.mode} / ${trace.gamePhase}]`);
  console.log(`Leader: ${trace.leader}`);
  console.log(`Utility: ${trace.utility.toFixed(1)} | Lethal: ${trace.lethalProbability.toFixed(0)}% | Survival risk: ${(trace.survivalRisk * 100).toFixed(0)}%`);
  for (const entry of trace.topActions) {
    const extra = entry.trace?.length ? ` — ${entry.trace.join(', ')}` : '';
    console.log(`  ${entry.label} (${entry.score.toFixed(1)})${extra}`);
  }
  console.log(`→ ${trace.chosen.label} (${trace.chosen.score.toFixed(1)}) [${trace.elapsedMs.toFixed(1)} ms]`);
  console.groupEnd();
}
