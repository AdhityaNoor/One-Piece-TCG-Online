/**
 * Power/cost resolution. Source of truth: 2-6 (power), 2-7 (cost),
 * 6-5-5-2 (+1000 per attached DON!!), 7-1-3-2-1 (Counter Character "during
 * this battle" boost), 8-1-3-3 (permanent/continuous effects).
 *
 * Card-effect power modifiers ARE now read, via GameState.continuousEffects'
 * structured `powerModifier` payload (see game.ts). Each modifier's optional
 * condition ([DON!! xN], [Your Turn]/[Opponent's Turn]) is re-evaluated here on
 * every read, so a conditional buff turns on/off as DON!! attaches or the turn
 * flips, with no extra bookkeeping. Cost modifiers remain future work.
 */
import type { ContinuousEffectRecord, GameState } from '../../state/game';
import { type CardDefinitionLookup, getDefinition } from './definitions';

function powerModifierApplies(record: ContinuousEffectRecord, state: GameState, instanceId: string): boolean {
  const mod = record.powerModifier;
  if (!mod || mod.appliesToInstanceId !== instanceId) return false;
  const cond = mod.condition;
  if (!cond) return true;
  const instance = state.cardsById[instanceId];
  if (cond.donAttachedAtLeast !== undefined && instance.donAttached.length < cond.donAttachedAtLeast) return false;
  if (cond.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === instance.ownerId;
    if (cond.turn === 'your' && !isOwnersTurn) return false;
    if (cond.turn === 'opponent' && isOwnersTurn) return false;
  }
  return true;
}

export function computeCurrentPower(defs: CardDefinitionLookup, state: GameState, instanceId: string): number {
  const instance = state.cardsById[instanceId];
  const def = getDefinition(defs, instance);
  const base = def.basePower ?? 0;
  const donBonus = instance.donAttached.length * 1000; // 6-5-5-2
  const battleBonus = state.currentBattle?.battlePowerBonuses[instanceId] ?? 0; // 7-1-3-2-1
  let continuousBonus = 0; // 8-1-3-3 card-effect power modifiers
  for (const record of state.continuousEffects) {
    if (powerModifierApplies(record, state, instanceId)) continuousBonus += record.powerModifier!.amount;
  }
  return base + donBonus + battleBonus + continuousBonus;
}

export function computeCurrentCost(defs: CardDefinitionLookup, state: GameState, instanceId: string): number {
  const instance = state.cardsById[instanceId];
  const def = getDefinition(defs, instance);
  return def.baseCost ?? 0;
}
