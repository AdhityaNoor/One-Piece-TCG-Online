import type { GameState } from '../state/game';
import type { CardDefinitionLookup } from '../rules/shared/definitions';

export function recordEventActivation(
  state: GameState,
  playerId: string,
  eventInstanceId: string,
  defs: CardDefinitionLookup,
): GameState {
  const inst = state.cardsById[eventInstanceId];
  const def = inst ? defs[inst.cardDefinitionId] : undefined;
  if (!def || def.category !== 'event') return state;
  const record = {
    playerId,
    cardDefinitionId: def.cardDefinitionId,
    cardNumber: def.cardNumber,
    baseCost: def.baseCost ?? 0,
    turnNumber: state.turnNumber,
  };
  return { ...state, eventActivationHistory: [...(state.eventActivationHistory ?? []), record] };
}
