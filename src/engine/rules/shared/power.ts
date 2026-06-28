/**
 * Power/cost resolution. Source of truth: 2-6 (power), 2-7 (cost),
 * 6-5-5-2 (+1000 per attached DON!!), 7-1-3-2-1 (Counter Character "during
 * this battle" boost).
 *
 * Card-effect power/cost modifiers (continuous effects, [On Play] boosts,
 * cost reduction, etc.) are NOT implemented — card effects are fully stubbed
 * this milestone (project decision: "stub everything" for effect text).
 * `continuousEffects` exists on GameState but nothing here reads it yet;
 * documented as a known limitation, not silently ignored.
 */
import type { GameState } from '../../state/game';
import { type CardDefinitionLookup, getDefinition } from './definitions';

export function computeCurrentPower(defs: CardDefinitionLookup, state: GameState, instanceId: string): number {
  const instance = state.cardsById[instanceId];
  const def = getDefinition(defs, instance);
  const base = def.basePower ?? 0;
  const donBonus = instance.donAttached.length * 1000; // 6-5-5-2
  const battleBonus = state.currentBattle?.battlePowerBonuses[instanceId] ?? 0; // 7-1-3-2-1
  return base + donBonus + battleBonus;
}

export function computeCurrentCost(defs: CardDefinitionLookup, state: GameState, instanceId: string): number {
  const instance = state.cardsById[instanceId];
  const def = getDefinition(defs, instance);
  return def.baseCost ?? 0;
}
