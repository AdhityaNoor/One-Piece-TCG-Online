/**
 * Opponent hand Counter capacity from public information only.
 * Never inspects hidden hand / face-down life / deck order.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { GameState } from '../../engine/state/game';
import { opponentHandCount } from '../visibility/playerView';

/** Fraction of unknown hand cards expected to carry a printed Counter. */
const BASE_COUNTER_CARD_RATE = 0.42;
/** Blend of common 1000 / 2000 Counter prints. */
const BASE_AVG_COUNTER_VALUE = 1300;
/** Opponents rarely dump an entire hand on one swing. */
const MAX_LIKELY_COUNTER_CARDS = 3;

export type CounterEstimateConfidence = 'low' | 'medium' | 'high';

export interface OpponentCounterEstimate {
  handCount: number;
  /** Expected total Counter power available from the hand. */
  estimatedTotalCounterPower: number;
  /** Likely spend to stop a lethal Life swing (capped). */
  estimatedLikelySpend: number;
  /** Strongest single Counter card expected in hand. */
  estimatedMaxSingleCounter: number;
  confidence: CounterEstimateConfidence;
  /** Average printed Counter among publicly seen Counter cards (0 if none). */
  publicAvgCounter: number;
  publicCounterCardCount: number;
}

interface PublicCounterStats {
  counterCardCount: number;
  totalCounterValue: number;
  maxCounter: number;
  publicCardCount: number;
}

function observePublicCounterStats(
  state: GameState,
  opponentId: string,
  defs: CardDefinitionLookup,
): PublicCounterStats {
  const opponent = state.players[opponentId];
  if (!opponent) {
    return { counterCardCount: 0, totalCounterValue: 0, maxCounter: 0, publicCardCount: 0 };
  }

  const publicIds = [
    ...opponent.trash.cardIds,
    ...opponent.characterArea.cardIds,
    ...opponent.stageArea.cardIds,
    ...opponent.lifeArea.cardIds.filter((id) => state.cardsById[id]?.faceState === 'faceUp'),
  ];

  let counterCardCount = 0;
  let totalCounterValue = 0;
  let maxCounter = 0;

  for (const id of publicIds) {
    const inst = state.cardsById[id];
    if (!inst || inst.ownerId !== opponentId) continue;
    // Explicitly skip hand / face-down life / deck — only zones listed above.
    if (inst.currentZone === 'hand' || inst.currentZone === 'deck') continue;
    if (inst.currentZone === 'lifeArea' && inst.faceState !== 'faceUp') continue;

    const def = getDefinition(defs, inst);
    const counter = def.counter ?? 0;
    if (counter > 0) {
      counterCardCount += 1;
      totalCounterValue += counter;
      maxCounter = Math.max(maxCounter, counter);
    }
  }

  return {
    counterCardCount,
    totalCounterValue,
    maxCounter,
    publicCardCount: publicIds.length,
  };
}

function confidenceFor(handCount: number, publicCardCount: number): CounterEstimateConfidence {
  if (handCount === 0) return 'high';
  if (publicCardCount >= 6) return 'medium';
  if (handCount <= 2 && publicCardCount >= 3) return 'medium';
  return 'low';
}

/**
 * Estimate opponent Counter capacity without reading hidden hand contents.
 */
export function estimateOpponentCounterCapacity(
  state: GameState,
  viewerId: string,
  defs: CardDefinitionLookup,
): OpponentCounterEstimate {
  const handCount = opponentHandCount(state, viewerId);
  const opponentId = getOpponentId(state, viewerId);
  const publicStats = observePublicCounterStats(state, opponentId, defs);

  const publicAvgCounter =
    publicStats.counterCardCount > 0
      ? publicStats.totalCounterValue / publicStats.counterCardCount
      : 0;

  // Trash/board density nudges the prior: counter-heavy public zones → denser hand.
  let rate = BASE_COUNTER_CARD_RATE;
  if (publicStats.publicCardCount >= 3) {
    const density = publicStats.counterCardCount / publicStats.publicCardCount;
    rate = Math.min(0.7, Math.max(0.2, BASE_COUNTER_CARD_RATE * 0.55 + density * 0.7));
  }

  const avgValue = publicAvgCounter > 0
    ? publicAvgCounter * 0.55 + BASE_AVG_COUNTER_VALUE * 0.45
    : BASE_AVG_COUNTER_VALUE;

  const expectedCounterCards = handCount * rate;
  const estimatedTotalCounterPower = Math.round(expectedCounterCards * avgValue);
  const likelyCards = Math.min(MAX_LIKELY_COUNTER_CARDS, Math.ceil(expectedCounterCards));
  const estimatedLikelySpend = Math.round(Math.min(estimatedTotalCounterPower, likelyCards * avgValue));
  const estimatedMaxSingleCounter = Math.round(
    publicStats.maxCounter > 0
      ? Math.max(publicStats.maxCounter, avgValue)
      : Math.max(1000, avgValue),
  );

  if (handCount === 0) {
    return {
      handCount: 0,
      estimatedTotalCounterPower: 0,
      estimatedLikelySpend: 0,
      estimatedMaxSingleCounter: 0,
      confidence: 'high',
      publicAvgCounter,
      publicCounterCardCount: publicStats.counterCardCount,
    };
  }

  return {
    handCount,
    estimatedTotalCounterPower,
    estimatedLikelySpend,
    estimatedMaxSingleCounter,
    confidence: confidenceFor(handCount, publicStats.publicCardCount),
    publicAvgCounter,
    publicCounterCardCount: publicStats.counterCardCount,
  };
}
