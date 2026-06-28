import { describe, expect, it } from 'vitest';
import { createPreGameState } from '../createPreGameState';
import { validateChooseGoingFirst, executeChooseGoingFirst } from '../applyChooseGoingFirst';
import { validateMulliganDecision, executeMulliganDecision } from '../applyMulliganDecision';
import type { GameState } from '../../state/game';
import type { ChooseGoingFirstAction, MulliganDecisionAction } from '../../actions/action';
import { makePlayerSetupInput, makeDeckOf } from './fixtures';

function freshInputs() {
  return {
    p1: makePlayerSetupInput('p1'),
    p2: makePlayerSetupInput('p2'),
  };
}

function buildPreGame(decidingPlayerId: 'p1' | 'p2' = 'p1', seed = 'fixed-test-seed') {
  const { p1, p2 } = freshInputs();
  const result = createPreGameState(p1, p2, { decidingPlayerId, rngState: { seed, cursor: 0 } });
  if (!result.ok) {
    throw new Error(`Expected createPreGameState to succeed, got: ${result.reasons.join('; ')}`);
  }
  return result.state;
}

function chooseGoingFirstAction(playerId: string, goingFirst: boolean): ChooseGoingFirstAction {
  return { type: 'CHOOSE_GOING_FIRST', actionId: `action-${playerId}-choose`, playerId, goingFirst };
}

function mulliganAction(playerId: string, redraw: boolean): MulliganDecisionAction {
  return { type: 'MULLIGAN_DECISION', actionId: `action-${playerId}-mulligan-${redraw}`, playerId, redraw };
}

describe('createPreGameState', () => {
  it('places both leaders active/face-up and queues the going-first choice', () => {
    const state = buildPreGame('p1');
    expect(state.currentPhase).toBe('setup');
    expect(state.setupState).toEqual({ decidingPlayerId: 'p1', stage: 'awaitingGoingFirstChoice' });
    expect(state.pendingChoices).toHaveLength(1);
    expect(state.pendingChoices[0]).toMatchObject({ playerId: 'p1', kind: 'YES_NO' });

    for (const playerId of ['p1', 'p2']) {
      const player = state.players[playerId];
      const leader = state.cardsById[player.leaderInstanceId];
      expect(leader.currentZone).toBe('leaderArea');
      expect(leader.orientation).toBe('active');
      expect(leader.faceState).toBe('faceUp');
      expect(player.deck.cardIds).toHaveLength(50);
      expect(player.donDeck.cardIds).toHaveLength(10);
      expect(player.hand.cardIds).toHaveLength(0);
      expect(player.lifeArea.cardIds).toHaveLength(0);
      expect(player.hasGoneFirst).toBe(false);
      expect(player.hasMulliganed).toBe(false);
    }
  });

  it('rejects a decidingPlayerId that is not one of the two players', () => {
    const { p1, p2 } = freshInputs();
    const result = createPreGameState(p1, p2, { decidingPlayerId: 'p3-does-not-exist', rngState: { seed: 's', cursor: 0 } });
    expect(result.ok).toBe(false);
  });

  it('rejects structurally invalid PlayerSetupInput (wrong deck size)', () => {
    const p1 = makePlayerSetupInput('p1', { deck: makeDeckOf(40) });
    const p2 = makePlayerSetupInput('p2');
    const result = createPreGameState(p1, p2, { decidingPlayerId: 'p1', rngState: { seed: 's', cursor: 0 } });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r) => r.includes('50 cards'))).toBe(true);
    }
  });

  it('is deterministic: identical inputs + seed produce an identical shuffled deck order', () => {
    const stateA = buildPreGame('p1', 'same-seed');
    const stateB = buildPreGame('p1', 'same-seed');
    expect(stateA.players.p1.deck.cardIds).toEqual(stateB.players.p1.deck.cardIds);
    expect(stateA.players.p2.deck.cardIds).toEqual(stateB.players.p2.deck.cardIds);
  });

  it('shuffles the deck (does not leave it in input order)', () => {
    const state = buildPreGame('p1', 'shuffle-check-seed');
    const mintedOrder = state.players.p1.deck.cardIds.slice().sort();
    expect(state.players.p1.deck.cardIds).not.toEqual(mintedOrder.length ? state.players.p1.deck.cardIds.slice() : []);
    // Stronger check: the minted ids are sequential (p1__deck__0..49); shuffled order should not match that sequence.
    const sequential = Array.from({ length: 50 }, (_, i) => `p1__deck__${i}`);
    expect(state.players.p1.deck.cardIds).not.toEqual(sequential);
  });
});

describe('validateChooseGoingFirst / executeChooseGoingFirst', () => {
  it('rejects a non-deciding player', () => {
    const state = buildPreGame('p1');
    const result = validateChooseGoingFirst(state, chooseGoingFirstAction('p2', true));
    expect(result.legal).toBe(false);
  });

  it('deals a 5-card opening hand to both players and queues the first-player mulligan choice', () => {
    const state = buildPreGame('p1');
    const validation = validateChooseGoingFirst(state, chooseGoingFirstAction('p1', true));
    expect(validation.legal).toBe(true);

    const { state: next, log, pendingChoices } = executeChooseGoingFirst(state, chooseGoingFirstAction('p1', true));
    expect(next.players.p1.hand.cardIds).toHaveLength(5);
    expect(next.players.p2.hand.cardIds).toHaveLength(5);
    expect(next.players.p1.deck.cardIds).toHaveLength(45);
    expect(next.players.p1.hasGoneFirst).toBe(true);
    expect(next.players.p2.hasGoneFirst).toBe(false);
    expect(next.activePlayerId).toBe('p1');
    expect(next.setupState).toMatchObject({ stage: 'awaitingMulliganDecision', goingFirstPlayerId: 'p1', goingSecondPlayerId: 'p2' });
    expect(pendingChoices).toHaveLength(1);
    expect(pendingChoices[0].playerId).toBe('p1');
    expect(log.length).toBeGreaterThan(0);
    expect(next.log).toHaveLength(state.log.length + log.length);
  });

  it('honors goingFirst: false — the OTHER player goes first', () => {
    const state = buildPreGame('p1');
    const { state: next } = executeChooseGoingFirst(state, chooseGoingFirstAction('p1', false));
    expect(next.players.p2.hasGoneFirst).toBe(true);
    expect(next.players.p1.hasGoneFirst).toBe(false);
    expect(next.setupState).toMatchObject({ goingFirstPlayerId: 'p2', goingSecondPlayerId: 'p1' });
  });

  it('rejects re-running CHOOSE_GOING_FIRST after it has already resolved', () => {
    const state = buildPreGame('p1');
    const { state: next } = executeChooseGoingFirst(state, chooseGoingFirstAction('p1', true));
    const result = validateChooseGoingFirst(next, chooseGoingFirstAction('p1', true));
    expect(result.legal).toBe(false);
  });
});

describe('validateMulliganDecision / executeMulliganDecision', () => {
  function afterGoingFirstChosen() {
    const pregame = buildPreGame('p1');
    return executeChooseGoingFirst(pregame, chooseGoingFirstAction('p1', true)).state;
  }

  it('rejects the going-second player acting before the going-first player decides', () => {
    const state = afterGoingFirstChosen();
    const result = validateMulliganDecision(state, mulliganAction('p2', false));
    expect(result.legal).toBe(false);
  });

  it('keep (no redraw): hand is untouched, turn passes to the going-second player', () => {
    const state = afterGoingFirstChosen();
    const handBefore = state.players.p1.hand.cardIds;
    const { state: next, pendingChoices } = executeMulliganDecision(state, mulliganAction('p1', false));
    expect(next.players.p1.hand.cardIds).toEqual(handBefore);
    expect(next.players.p1.hasMulliganed).toBe(true);
    expect(next.activePlayerId).toBe('p2');
    expect(next.currentPhase).toBe('setup'); // still mid-setup; p2 hasn't decided yet
    expect(next.setupState?.stage).toBe('awaitingMulliganDecision');
    expect(pendingChoices).toHaveLength(1);
    expect(pendingChoices[0].playerId).toBe('p2');
  });

  it('redraw: returns hand to deck, reshuffles, deals a new 5-card hand, deck size unchanged net', () => {
    const state = afterGoingFirstChosen();
    const handBefore = state.players.p1.hand.cardIds;
    const { state: next } = executeMulliganDecision(state, mulliganAction('p1', true));
    expect(next.players.p1.hand.cardIds).toHaveLength(5);
    expect(next.players.p1.deck.cardIds).toHaveLength(45);
    expect(next.players.p1.hasMulliganed).toBe(true);
    // The 50 (deck+hand) cards are conserved across the reshuffle.
    const allAfter = [...next.players.p1.deck.cardIds, ...next.players.p1.hand.cardIds].sort();
    const allBefore = [...state.players.p1.deck.cardIds, ...handBefore].sort();
    expect(allAfter).toEqual(allBefore);
  });

  it('rejects a second mulligan decision from the same player', () => {
    const state = afterGoingFirstChosen();
    const { state: afterFirst } = executeMulliganDecision(state, mulliganAction('p1', false));
    const result = validateMulliganDecision(afterFirst, mulliganAction('p1', false));
    expect(result.legal).toBe(false);
  });

  it('finishing the second mulligan deals Life cards and starts turn 1 (5-2-1-7, 5-2-1-8)', () => {
    const state = afterGoingFirstChosen();
    const afterP1 = executeMulliganDecision(state, mulliganAction('p1', false)).state;
    const { state: final, pendingChoices } = executeMulliganDecision(afterP1, mulliganAction('p2', true));

    expect(final.setupState).toBeNull();
    expect(final.currentPhase).toBe('refresh');
    expect(final.turnNumber).toBe(1);
    expect(final.activePlayerId).toBe('p1'); // going-first player starts turn 1
    expect(final.pendingChoices).toHaveLength(0);
    expect(pendingChoices).toHaveLength(0);

    for (const playerId of ['p1', 'p2'] as const) {
      const player = final.players[playerId];
      expect(player.lifeArea.cardIds).toHaveLength(player.leaderLifeValue);
      expect(player.deck.cardIds).toHaveLength(50 - 5 - player.leaderLifeValue);
      expect(player.hand.cardIds).toHaveLength(5);
    }
  });
});

describe('full setup flow — end to end', () => {
  function runFullFlow(seed: string): GameState {
    const pregame = buildPreGame('p1', seed);
    const afterChoice = executeChooseGoingFirst(pregame, chooseGoingFirstAction('p1', true)).state;
    const afterP1Mulligan = executeMulliganDecision(afterChoice, mulliganAction('p1', true)).state;
    return executeMulliganDecision(afterP1Mulligan, mulliganAction('p2', false)).state;
  }

  it('produces a fully-formed turn-1 GameState', () => {
    const final = runFullFlow('e2e-seed');
    expect(final.currentPhase).toBe('refresh');
    expect(final.turnNumber).toBe(1);
    expect(final.setupState).toBeNull();
    expect(Object.keys(final.cardsById)).toHaveLength(2 * (1 + 50 + 10)); // leader + deck + DON!! per player
  });

  it('replays identically given the same seed and the same decisions (determinism / replayability)', () => {
    const finalA = runFullFlow('replay-seed');
    const finalB = runFullFlow('replay-seed');
    expect(finalA).toEqual(finalB);
  });

  it('is fully JSON-serializable with no information lost (no undefined values, round-trips exactly)', () => {
    const final = runFullFlow('serialization-seed');
    const roundTripped = JSON.parse(JSON.stringify(final)) as GameState;
    expect(roundTripped).toEqual(final);
  });
});
