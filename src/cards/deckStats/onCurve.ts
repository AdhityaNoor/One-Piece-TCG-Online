/**
 * On Curve Plays — for each cost, how many playable cards sit at that cost (and
 * at-or-below it), and the odds you have drawn at least one such card by the
 * turn you first have enough DON!! to play it.
 *
 * DRAW MODEL (documented, not a ruling): we assume the player is GOING FIRST.
 * A going-first player has (2t - 1) DON!! on turn t (turn 1 adds 1 DON!!, each
 * later turn adds 2 — DON!! Phase, 6-3) and has seen 5 opening cards plus one
 * draw at the start of each turn AFTER the first (a going-first player skips
 * their turn-1 draw, 6-4). So by turn t they have seen (5 + t - 1) = (t + 4)
 * cards. The turn a cost c first becomes affordable is ceil((c + 1) / 2).
 *
 * These are approximations for deck-comparison purposes (they ignore mulligan
 * selection, search, and cards already played) and are surfaced to the user as
 * such via {@link OnCurveStat.assumptions}. Pure math — no rules engine.
 */
import type { SavedDeckCardSnapshot } from '../decks/savedDeck';
import { atLeastOne } from './hypergeometric';
import type { OnCurveRow, OnCurveStat } from './types';

const ASSUMPTIONS =
  'Going first: (2·turn − 1) DON!! per turn, 5 opening cards + 1 draw each turn after the first. ' +
  'Odds are hypergeometric over the 50-card deck and ignore mulligan choice, searching, and cards already played.';

/** Cards you have seen by the turn a card costing `cost` first becomes affordable. */
function cardsSeenByCost(cost: number): number {
  const turn = Math.max(1, Math.ceil((cost + 1) / 2));
  return 5 + (turn - 1);
}

export function computeOnCurve(cards: SavedDeckCardSnapshot[], deckSize: number): OnCurveStat {
  const atCost = new Map<number, number>();
  let maxCost = 0;

  for (const snap of cards) {
    const cost = snap.definition.baseCost;
    if (cost === undefined) continue; // Leader/DON!! — never an on-curve play from hand.
    atCost.set(cost, (atCost.get(cost) ?? 0) + snap.quantity);
    if (cost > maxCost) maxCost = cost;
  }

  const rows: OnCurveRow[] = [];
  for (let cost = 1; cost <= maxCost; cost += 1) {
    const cardsAtCost = atCost.get(cost) ?? 0;
    let cardsAtOrBelow = 0;
    for (let c = 0; c <= cost; c += 1) cardsAtOrBelow += atCost.get(c) ?? 0;
    rows.push({
      cost,
      cardsAtCost,
      cardsAtOrBelow,
      onCurveChance: atLeastOne(deckSize, cardsAtCost, cardsSeenByCost(cost)),
    });
  }

  return { rows, assumptions: ASSUMPTIONS };
}
