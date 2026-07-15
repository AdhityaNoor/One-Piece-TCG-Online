import type { PlayerReference_V2, ResolutionNode_V2 } from '../../cards/effectCompiler_V2/types_V2';
import type { GameState } from '../state/game';
import type { SelectorContext_V2 } from './selectorResolver_V2';

export interface ChoiceOptionRecord_V2 {
  index: number;
  label: string;
  node: ResolutionNode_V2;
}

export interface ChoicePromptRecord_V2 {
  id: string;
  sourceInstanceId: string;
  controllerId: string;
  chooserPlayerId: string;
  minimumChoices: number;
  maximumChoices: number;
  options: ChoiceOptionRecord_V2[];
  createdAtTurn: number;
  status: 'PENDING';
}

function opponentOf(state: GameState, playerId: string): string {
  return Object.keys(state.players).find((id) => id !== playerId) ?? playerId;
}

function playerIdForReference(ctx: SelectorContext_V2, ref: PlayerReference_V2): string {
  const source = ctx.state.cardsById[ctx.sourceInstanceId];
  switch (ref) {
    case 'PLAYER':
    case 'EFFECT_OWNER':
      return ctx.controllerId;
    case 'OPPONENT':
      return opponentOf(ctx.state, ctx.controllerId);
    case 'CARD_OWNER':
      return source?.ownerId ?? ctx.controllerId;
    case 'CARD_CONTROLLER':
      return source?.controllerId ?? ctx.controllerId;
    case 'ANY':
      return ctx.controllerId;
  }
}

export function createChoicePromptRecord_V2(params: {
  ctx: SelectorContext_V2;
  chooser: PlayerReference_V2;
  options: ResolutionNode_V2[];
  minimumChoices: number;
  maximumChoices: number;
  existingCount: number;
}): ChoicePromptRecord_V2 {
  const chooserPlayerId = playerIdForReference(params.ctx, params.chooser);
  return {
    id: `${params.ctx.sourceInstanceId}:choice:${params.ctx.state.turnNumber}:${params.existingCount}`,
    sourceInstanceId: params.ctx.sourceInstanceId,
    controllerId: params.ctx.controllerId,
    chooserPlayerId,
    minimumChoices: params.minimumChoices,
    maximumChoices: params.maximumChoices,
    options: params.options.map((node, index) => ({
      index,
      label: `Option ${index + 1}`,
      node,
    })),
    createdAtTurn: params.ctx.state.turnNumber,
    status: 'PENDING',
  };
}
