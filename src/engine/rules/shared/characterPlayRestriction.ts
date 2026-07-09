import type { GameState } from '../../state/game';
import type { CardDefinitionLookup } from './definitions';

/** True when `playerId` cannot play a Character matching `cardDefinitionId` due to an active restriction. */
export function isControllerCharacterPlayPrevented(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  cardDefinitionId: string,
): boolean {
  const def = defs[cardDefinitionId];
  if (!def || def.category !== 'character') return false;
  const baseCost = def.baseCost ?? 0;
  return state.continuousEffects.some((record) => {
    const restriction = record.characterPlayRestriction;
    if (!restriction || restriction.appliesToControllerId !== playerId) return false;
    if (restriction.minBaseCost !== undefined && baseCost < restriction.minBaseCost) return false;
    if (restriction.maxBaseCost !== undefined && baseCost > restriction.maxBaseCost) return false;
    return true;
  });
}
