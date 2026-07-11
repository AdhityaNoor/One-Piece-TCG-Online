import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { GameState } from '../../engine/state/game';
import { ownHandIds } from '../visibility/playerView';

export interface CounterNeedAnalysis {
  attackerPower: number;
  defenderPower: number;
  /** Power still needed for defender to survive (attackerPower - defenderPower). 0 if already safe. */
  deficit: number;
  alreadySafe: boolean;
  lifeAtRisk: boolean;
}

export function analyzeCounterNeed(
  state: GameState,
  defs: CardDefinitionLookup,
  defenderInstanceId: string,
): CounterNeedAnalysis | null {
  const battle = state.currentBattle;
  if (!battle || battle.step !== 'counter') return null;

  const attackerPower = computeCurrentPower(defs, state, battle.attackerInstanceId);
  const defenderPower = computeCurrentPower(defs, state, defenderInstanceId);
  const deficit = Math.max(0, attackerPower - defenderPower);

  return {
    attackerPower,
    defenderPower,
    deficit,
    alreadySafe: deficit === 0,
    lifeAtRisk: state.cardsById[defenderInstanceId]?.currentZone === 'leaderArea',
  };
}

export function printedCounterValue(
  state: GameState,
  defs: CardDefinitionLookup,
  handCardInstanceId: string,
): number {
  const inst = state.cardsById[handCardInstanceId];
  if (!inst) return 0;
  const def = getDefinition(defs, inst);
  return def.counter ?? 0;
}

/** Smallest printed counter in hand that covers `need`, or null if none covers. */
export function smallestCoveringCounter(
  state: GameState,
  defs: CardDefinitionLookup,
  playerId: string,
  need: number,
): number | null {
  if (need <= 0) return null;
  let best: number | null = null;
  for (const id of ownHandIds(state, playerId)) {
    const value = printedCounterValue(state, defs, id);
    if (value <= 0) continue;
    if (value >= need && (best === null || value < best)) best = value;
  }
  return best;
}

/**
 * Score using a character counter card.
 * Prefer the smallest counter that covers the deficit; heavily penalize overkill and unnecessary counters.
 */
export function scoreCharacterCounterUse(input: {
  need: CounterNeedAnalysis;
  counterValue: number;
  boostsBattleTarget: boolean;
  life: number;
  survivalUrgency: number;
}): number {
  const { need, counterValue, boostsBattleTarget, life, survivalUrgency } = input;

  if (!boostsBattleTarget) return -40;
  if (counterValue <= 0) return -50;

  if (need.alreadySafe) {
    // Already winning the power check — never spend counters.
    return -120 - counterValue / 100;
  }

  const covers = counterValue >= need.deficit;
  const overkill = Math.max(0, counterValue - need.deficit);
  const underkill = Math.max(0, need.deficit - counterValue);

  let score = 0;

  if (covers) {
    // Base value for saving the battle, then prefer exact/efficient covers.
    score = 55 + Math.min(need.deficit, 5000) / 200;
    score -= overkill / 120;
    // Mild preference for smaller exact covers (1k over 3k when both work).
    score -= counterValue / 400;
  } else {
    // Partial fill only makes sense if more counters can follow; still costly.
    score = 18 - underkill / 400 - counterValue / 500;
    if (life > 2 && !need.lifeAtRisk) score -= 15;
  }

  if (need.lifeAtRisk && life <= 1) score += 35 + survivalUrgency * 0.3;
  else if (need.lifeAtRisk && life <= 2) score += 18 + survivalUrgency * 0.15;

  return score;
}

export function scorePassCounterStep(input: {
  need: CounterNeedAnalysis | null;
  life: number;
  survivalUrgency: number;
}): number {
  const { need, life, survivalUrgency } = input;
  if (!need) return 25;

  if (need.alreadySafe) return 90;

  // Passing while losing: bad if life is on the line, otherwise often correct to conserve.
  if (need.lifeAtRisk) {
    if (life <= 1) return -55 - survivalUrgency;
    if (life <= 2 && need.deficit >= 3000) return -15;
    if (need.deficit <= 1000) return 10;
    return 20;
  }

  // Character under attack — losing the trade may be fine.
  return 35 - Math.min(need.deficit, 4000) / 800;
}
