import type { CardDefinitionLookup } from '../engine/rules/shared';
import type { EffectTemplateRegistry } from '../engine/effects';
import type { GameState } from '../engine/state/game';
import type { CpuConfig, CpuDecision } from './types';
import { decideBestAction } from './decisionEngine';

export interface CpuPlayerContext {
  state: GameState;
  playerId: string;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  config: CpuConfig;
  createActionId: () => string;
}

/**
 * Choose the next engine action for a CPU-controlled seat.
 * Uses only player-visible information via the legal-action generator.
 */
export function chooseAction(ctx: CpuPlayerContext): CpuDecision | null {
  return decideBestAction({
    state: ctx.state,
    playerId: ctx.playerId,
    defs: ctx.defs,
    registry: ctx.registry,
    config: ctx.config,
    createActionId: ctx.createActionId,
  });
}

export type { CpuConfig, CpuDecision, CpuDifficulty, ScoredAction } from './types';
