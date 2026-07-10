import type { CardDefinitionLookup } from '../rules/shared/definitions';
import type { GameState } from '../state/game';

export function effectLogDataForSource(
  state: GameState,
  defs: CardDefinitionLookup,
  sourceInstanceId: string | null | undefined,
): Record<string, unknown> {
  if (!sourceInstanceId) return {};

  const instance = state.cardsById[sourceInstanceId];
  if (!instance) return { sourceInstanceId };

  const definition = defs[instance.cardDefinitionId];
  return {
    sourceInstanceId,
    sourceCardDefinitionId: instance.cardDefinitionId,
    ...(definition
      ? {
          sourceCardName: definition.name,
          sourceCardNumber: definition.cardNumber,
          effectText: definition.text,
          ...(definition.triggerText ? { triggerText: definition.triggerText } : {}),
        }
      : {}),
  };
}
