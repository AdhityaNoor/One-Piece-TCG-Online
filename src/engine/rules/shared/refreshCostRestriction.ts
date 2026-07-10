import type { GameState } from '../../state/game';
import { evaluateGates } from '../../effects/gates';
import type { CardDefinitionLookup } from './definitions';
import { computeCurrentCost } from './power';

/** True when a Character must stay rested through this Refresh Phase (Birdcage-style lock). */
export function isCharacterRefreshCostBlocked(
  defs: CardDefinitionLookup,
  state: GameState,
  instanceId: string,
): boolean {
  const inst = state.cardsById[instanceId];
  if (!inst || inst.currentZone !== 'characterArea') return false;
  const def = defs[inst.cardDefinitionId];
  if (!def || def.category !== 'character') return false;
  const cost = computeCurrentCost(defs, state, instanceId);

  for (const ce of state.continuousEffects) {
    const restriction = ce.refreshCostRestriction;
    if (!restriction) continue;
    const source = state.cardsById[ce.sourceInstanceId];
    if (!source || source.currentZone !== 'stageArea') continue;
    if (restriction.activationGate?.length) {
      const gateOk = evaluateGates(restriction.activationGate, state, defs, ce.ownerId, ce.sourceInstanceId);
      if (!gateOk) continue;
    }
    if (cost <= restriction.maxCost) return true;
  }
  return false;
}
