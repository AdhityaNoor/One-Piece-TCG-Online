import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { CpuDifficulty } from '../types';
import { planActionScore } from '../planning/strategicPlanner';
import { actionLabel } from '../utilities/legalActions';

export function scoreAction(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  difficulty: CpuDifficulty,
  strategic?: import('../strategy/types').StrategicContext,
  createActionId?: () => string,
): number {
  return planActionScore(state, action, playerId, defs, registry, difficulty, strategic, createActionId);
}

export function applyDifficulty(
  scored: { action: GameAction; score: number; label: string }[],
  difficulty: CpuDifficulty,
  tieSeed: string,
): { action: GameAction; score: number; label: string } {
  if (scored.length === 0) throw new Error('applyDifficulty requires at least one scored action');
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  if (difficulty === 'easy') {
    const band = sorted.filter((s, i) => i < Math.min(5, sorted.length) && s.score >= sorted[0].score - 15);
    const idx = hashString(tieSeed) % band.length;
    return band[idx] ?? sorted[0];
  }
  if (difficulty === 'hard') {
    return sorted[0];
  }
  const top = sorted.filter((s) => s.score >= sorted[0].score - 3);
  const idx = hashString(tieSeed) % top.length;
  return top[idx] ?? sorted[0];
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function labelAction(state: GameState, defs: CardDefinitionLookup, action: GameAction): string {
  return actionLabel(state, defs, action);
}
