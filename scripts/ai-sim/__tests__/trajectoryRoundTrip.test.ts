/**
 * End-to-end proof that a recorded match reconstructs, and that the
 * reconstruction never leaks hidden information.
 *
 * This runs a REAL self-play match over the real card catalog rather than a
 * hand-built fixture, because the two properties under test only hold if the
 * whole pipeline agrees: deterministic setup ids, seeded RNG, the exact
 * pre-shuffle deck order, and the engine's own visibility model. A synthetic
 * two-action fixture would pass while the real thing silently diverged.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDeckFor, loadCatalog, recordMatch } from '../harness';
import { replayTrajectory, trainableSteps } from '../../../src/engine/replay';
import { HIDDEN_CARD_DEF_ID } from '../../../src/engine/view/redactState';
import { buildCuratedEffectRegistry } from '../../../src/cards/effectTemplates';
import { GENERIC_DON_CARD_DEFINITION } from '../../../src/cards/decks/genericDonCard';
import { normalizeEngineCardDefinition } from '../../../src/cards/normalization/engineDefinition';
import type { MatchTrajectory } from '../../../shared/replay';
import type { CardDefinitionLookup } from '../../../src/engine/rules/shared';
import type { EffectTemplateRegistry } from '../../../src/engine/effects';
import type { GameState } from '../../../src/engine/state/game';

let trajectory: MatchTrajectory;
let finalState: GameState;
let defs: CardDefinitionLookup;
let registry: EffectTemplateRegistry;

function replay(t: MatchTrajectory, allowDrift = false) {
  return replayTrajectory(t, {
    defs,
    registry,
    donCardDefinition: GENERIC_DON_CARD_DEFINITION,
    normalizeDefinition: normalizeEngineCardDefinition,
    allowCardDataDrift: allowDrift,
  });
}

beforeAll(() => {
  const catalog = loadCatalog();
  defs = {};
  for (const def of catalog) defs[def.cardDefinitionId] = def;
  registry = buildCuratedEffectRegistry(defs);

  const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
  const la = byNum.get('OP01-001')!;
  const lb = byNum.get('OP01-002')!;
  const recorded = recordMatch(la, buildDeckFor(la, catalog), lb, buildDeckFor(lb, catalog), {
    mode: 'v1',
    difficulty: 'easy',
    seed: 'round-trip-seed',
    maxActions: 1200,
  });
  trajectory = recorded.trajectory;
  finalState = recorded.rig.state;
});

describe('match trajectory round trip', () => {
  it('records a complete match', () => {
    expect(trajectory.actions.length).toBeGreaterThan(20);
    expect(trajectory.seats).toHaveLength(2);
    expect(trajectory.seats[0].deckCardNumbers).toHaveLength(50);
    expect(trajectory.outcome).not.toBeNull();
  });

  it('stays small — the whole point of storing actions instead of states', () => {
    const bytesPerAction = JSON.stringify(trajectory).length / trajectory.actions.length;
    // A redacted state snapshot per decision would be in the KILObytes each.
    expect(bytesPerAction).toBeLessThan(400);
  });

  it('replays back to the identical final position', () => {
    const result = replay(trajectory);
    expect(result.failure).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(result.steps).toHaveLength(trajectory.actions.length);
    expect(result.finalState?.gameOver?.winnerId).toBe(finalState.gameOver?.winnerId);
    expect(result.finalState?.turnNumber).toBe(finalState.turnNumber);
  });

  it('labels every step with whether the acting seat went on to win', () => {
    const result = replay(trajectory);
    const winner = trajectory.outcome?.winnerSeatId;
    expect(winner).toBeTruthy();
    for (const step of result.steps) {
      expect(step.outcomeForActor).toBe(step.actingSeatId === winner ? 1 : 0);
    }
  });

  it('keeps only steps where the actor actually had a choice', () => {
    const result = replay(trajectory);
    const trainable = trainableSteps(result.steps);
    expect(trainable.length).toBeGreaterThan(0);
    expect(trainable.length).toBeLessThanOrEqual(result.steps.length);
    for (const step of trainable) expect(step.legalActionCount).toBeGreaterThan(1);
  });
});

/**
 * A card in a secret zone may be visible for exactly two legitimate reasons,
 * both of which mirror what the real player at that seat can see:
 *   - it was revealed to them by an effect (CardInstance.revealedTo, 11-2-2);
 *   - it is named by one of THEIR OWN open pending choices, e.g. "look at the
 *     top 5 cards of your deck and add 1 to your hand".
 * Anything else visible in a secret zone is a leak.
 */
function justifiablyVisible(state: GameState, cardId: string, seatId: string): boolean {
  const card = state.cardsById[cardId];
  if (!card) return false;
  if (card.revealedTo === 'all') return true;
  if (Array.isArray(card.revealedTo) && card.revealedTo.includes(seatId)) return true;
  for (const choice of state.pendingChoices) {
    if (choice.playerId !== seatId) continue;
    const named = [
      ...(choice.constraints.visibleInstanceIds ?? []),
      ...(choice.constraints.candidateInstanceIds ?? []),
    ];
    if (named.includes(cardId)) return true;
  }
  return false;
}

describe('hidden information', () => {
  it('never reveals a secret card the acting seat has no right to see', () => {
    const result = replay(trajectory);
    expect(result.ok).toBe(true);

    const leaks: string[] = [];
    let secretCardsChecked = 0;

    for (const step of result.steps) {
      const state = JSON.parse(step.visibleStateJson) as GameState;
      const seat = step.actingSeatId;
      const opponentId = Object.keys(state.players).find((id) => id !== seat)!;

      const secret: [string, string[]][] = [
        // Your own hand is open to you; the opponent's never is.
        [`${opponentId}.hand`, state.players[opponentId].hand.cardIds],
        // Deck order is secret to EVERYONE, its owner included.
        [`${seat}.deck`, state.players[seat].deck.cardIds],
        [`${opponentId}.deck`, state.players[opponentId].deck.cardIds],
        [`${seat}.life`, state.players[seat].lifeArea.cardIds],
        [`${opponentId}.life`, state.players[opponentId].lifeArea.cardIds],
      ];

      for (const [label, ids] of secret) {
        for (const id of ids) {
          const card = state.cardsById[id];
          secretCardsChecked += 1;
          if (card.cardDefinitionId === HIDDEN_CARD_DEF_ID) continue;
          if (label.endsWith('.life') && card.faceState === 'faceUp') continue;
          if (justifiablyVisible(state, id, seat)) continue;
          leaks.push(`step ${step.index} (${seat} acting): ${label} exposed ${card.cardDefinitionId}`);
        }
      }
    }

    expect(leaks).toEqual([]);
    // Guard against the assertion passing vacuously.
    expect(secretCardsChecked).toBeGreaterThan(1000);
  });

  it('does show the acting seat its OWN hand', () => {
    const result = replay(trajectory);
    const withHand = result.steps.find((step) => {
      const state = JSON.parse(step.visibleStateJson) as GameState;
      return state.players[step.actingSeatId].hand.cardIds.length > 0;
    });
    expect(withHand).toBeDefined();
    const state = JSON.parse(withHand!.visibleStateJson) as GameState;
    const own = state.players[withHand!.actingSeatId].hand.cardIds;
    expect(own.every((id) => state.cardsById[id].cardDefinitionId !== HIDDEN_CARD_DEF_ID)).toBe(true);
  });

  it('shows deck cards an effect put in front of that seat, and only to that seat', () => {
    // "Look at the top N cards of your deck" is real, legitimate information —
    // the model SHOULD see it, because the human at that seat does. What must
    // never happen is the opponent seeing the same cards.
    const result = replay(trajectory);
    const peeking = result.steps.find((step) => {
      const state = JSON.parse(step.visibleStateJson) as GameState;
      return state.players[step.actingSeatId].deck.cardIds.some(
        (id) => state.cardsById[id].cardDefinitionId !== HIDDEN_CARD_DEF_ID,
      );
    });
    if (!peeking) return; // no deck-peek effect resolved in this match

    const state = JSON.parse(peeking.visibleStateJson) as GameState;
    const exposed = state.players[peeking.actingSeatId].deck.cardIds.filter(
      (id) => state.cardsById[id].cardDefinitionId !== HIDDEN_CARD_DEF_ID,
    );
    for (const id of exposed) {
      expect(justifiablyVisible(state, id, peeking.actingSeatId)).toBe(true);
    }
  });
});

describe('divergence is refused, never silently accepted', () => {
  it('rejects a trajectory whose state checksum no longer matches', () => {
    const tampered: MatchTrajectory = {
      ...trajectory,
      checkpoints: trajectory.checkpoints.map((c, i) =>
        i === 0 ? { ...c, checksum: 'deadbeef' } : c,
      ),
    };
    const result = replay(tampered);
    expect(result.ok).toBe(false);
    expect(result.failure?.reason).toBe('checksum-mismatch');
    expect(result.failure?.atActionIndex).toBe(trajectory.checkpoints[0].afterActionIndex);
  });

  it('rejects a trajectory recorded against different card data', () => {
    const result = replay({ ...trajectory, cardDataHash: 'not-the-same' });
    expect(result.ok).toBe(false);
    expect(result.failure?.reason).toBe('card-data-drift');
    expect(result.steps).toHaveLength(0);
  });

  it('rejects a trajectory from a future schema version', () => {
    const result = replay({ ...trajectory, schemaVersion: trajectory.schemaVersion + 1 });
    expect(result.ok).toBe(false);
    expect(result.failure?.reason).toBe('schema-version');
  });

  it('can be forced past card-data drift when a human decides it is safe', () => {
    const result = replay({ ...trajectory, cardDataHash: 'not-the-same' }, true);
    expect(result.ok).toBe(true);
  });
});
