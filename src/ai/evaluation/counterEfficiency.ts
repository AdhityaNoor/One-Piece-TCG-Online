import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentCost, computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import { ownActiveDonIds, ownHandIds } from '../visibility/playerView';
import { resolveAiEffectProgram } from '../utilities/effectPrograms';

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

/**
 * Total Counter power this player could still add to the current battle.
 *
 * This is the number that decides whether countering is worth STARTING. A
 * Counter that fails to reach the attacker's power buys nothing at all — the
 * defender still loses the battle, the Life card is still taken, and the cards
 * spent are simply gone. So a partial Counter is only ever correct as a step
 * toward a total that DOES cover; on its own it is pure loss.
 *
 * Counts printed Counter values in hand plus the power that playable
 * [Counter] Events would add, since both feed the same battle.
 */
export function availableCounterPower(
  state: GameState,
  defs: CardDefinitionLookup,
  playerId: string,
  registry: EffectTemplateRegistry = {},
): number {
  let total = 0;
  const activeDon = ownActiveDonIds(state, playerId).length;

  for (const id of ownHandIds(state, playerId)) {
    const inst = state.cardsById[id];
    if (!inst) continue;
    const def = getDefinition(defs, inst);

    if (def.category === 'character') {
      total += def.counter ?? 0;
      continue;
    }

    if (def.category === 'event') {
      // An Event only counts if it can actually be paid for and actually adds
      // power — a [Counter] Event that draws a card does not save the battle.
      const program = resolveAiEffectProgram(registry, defs, inst.cardDefinitionId);
      const ability = program?.abilities.find((a) => a.timing === 'counter');
      if (!ability) continue;
      if (computeCurrentCost(defs, state, id, registry) > activeDon) continue;
      for (const op of ability.ops) {
        if (op.op === 'addPower' && typeof op.amount === 'number' && op.amount > 0) {
          total += op.amount;
        }
      }
    }
  }

  return total;
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
  /**
   * Total Counter power still available this battle, INCLUDING this card. When
   * omitted the unreachable check cannot run and only this card's own value is
   * considered — callers in the battle path should always pass it.
   */
  availableCounterPower?: number;
}): number {
  const { need, counterValue, boostsBattleTarget, life, survivalUrgency } = input;
  const available = input.availableCounterPower ?? counterValue;

  if (!boostsBattleTarget) return -40;
  if (counterValue <= 0) return -50;

  if (need.alreadySafe) {
    // Already winning the power check — never spend counters.
    return -120 - counterValue / 100;
  }

  const covers = counterValue >= need.deficit;
  const overkill = Math.max(0, counterValue - need.deficit);
  const underkill = Math.max(0, need.deficit - counterValue);

  /**
   * THE DEFICIT CANNOT BE COVERED, so every Counter spent here is thrown away:
   * the battle is lost either way and the Life card is taken either way. This
   * must return before the low-Life urgency bonuses below, because those exist
   * to make the CPU fight for its life and would otherwise fund exactly the
   * wrong fight — at 1-2 Life they were large enough (+35 / +18) to push a
   * hopeless partial Counter above passing, so the CPU trashed a 2000 into a
   * 3000 deficit and took the Life anyway. Desperation is a reason to spend
   * everything on a battle that CAN be saved, never on one that cannot.
   */
  if (!covers && available < need.deficit) {
    return -60 - counterValue / 200;
  }

  let score = 0;

  if (covers) {
    // Base value for saving the battle, then prefer exact/efficient covers.
    score = 55 + Math.min(need.deficit, 5000) / 200;
    score -= overkill / 120;
    // Mild preference for smaller exact covers (1k over 3k when both work).
    score -= counterValue / 400;
  } else {
    // A partial fill that DOES lead somewhere: the rest of the hand can finish
    // the job, so this is a down payment rather than a donation.
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
  /** Total Counter power still available. Omitted disables the hopeless check. */
  availableCounterPower?: number;
}): number {
  const { need, life, survivalUrgency } = input;
  if (!need) return 25;

  if (need.alreadySafe) return 90;

  /**
   * The battle is unwinnable with what is in hand. Passing is then not merely
   * acceptable, it is the only play that does not also lose cards — so it has
   * to outrank the desperation-driven Counter scores at 1-2 Life.
   */
  if (input.availableCounterPower !== undefined && input.availableCounterPower < need.deficit) {
    return 70;
  }

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
