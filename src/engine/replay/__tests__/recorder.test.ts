/**
 * Recorder mechanics. The round-trip against a real match lives in
 * scripts/ai-sim/__tests__/trajectoryRoundTrip.test.ts; this covers the
 * bookkeeping that file takes for granted.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
} from '../../rules/shared/__tests__/testRig';
import { createTrajectoryRecorder, DEFAULT_CHECKPOINT_INTERVAL } from '../recorder';
import { checksumState } from '../stateChecksum';
import { hashCardData } from '../cardDataHash';
import type { GameAction } from '../../actions/action';
import type { GameState } from '../../state/game';
import type { TrajectorySeat } from '../../../../shared/replay';

const seats: TrajectorySeat[] = [
  { seatId: 'p1', userId: null, controller: 'human', leaderCardNumber: 'L-1', deckCardNumbers: ['C-1'], donDeckSize: 10 },
  { seatId: 'p2', userId: null, controller: 'cpu', cpuDifficulty: 'hard', leaderCardNumber: 'L-2', deckCardNumbers: ['C-1'], donDeckSize: 10 },
];

function recorder(overrides: Partial<Parameters<typeof createTrajectoryRecorder>[0]> = {}) {
  let clock = 0;
  return createTrajectoryRecorder({
    source: 'self-play',
    engineBuild: 'test',
    cardDataHash: 'hash',
    rngSeed: 'seed',
    decidingPlayerId: 'p1',
    seats,
    now: () => `2026-01-01T00:00:${String(clock++).padStart(2, '0')}.000Z`,
    ...overrides,
  });
}

function action(n: number): GameAction {
  return { type: 'END_MAIN_PHASE', actionId: `a-${n}`, playerId: 'p1' };
}

const baseState = (): GameState => ({ ...buildBaseRig().state, setupState: null, pendingChoices: [] });

describe('trajectory recorder', () => {
  it('captures actions in order with their legal-action counts', () => {
    const rec = recorder();
    const state = baseState();
    rec.record(action(1), state, { legalActionCount: 5, decisionMs: 12 });
    rec.record(action(2), state, { legalActionCount: 3 });

    const trajectory = rec.finish(state);
    expect(trajectory.actions.map((a) => a.action.actionId)).toEqual(['a-1', 'a-2']);
    expect(trajectory.actions[0].legalActionCount).toBe(5);
    expect(trajectory.actions[0].decisionMs).toBe(12);
    expect(trajectory.actions[1].decisionMs).toBeNull();
  });

  it('marks an unmeasured legal-action count as -1, distinct from a real 1', () => {
    // A genuine 1 means "forced, no signal"; -1 means "we did not look". The
    // live server records -1 rather than paying to enumerate on the hot path,
    // and the offline replay fills it in. Conflating them would silently
    // discard every server-recorded decision.
    const rec = recorder();
    const state = baseState();
    rec.record(action(1), state);
    const trajectory = rec.finish(state);
    expect(trajectory.actions[0].legalActionCount).toBe(-1);
  });

  it('checkpoints on the interval and always on the final action', () => {
    const rec = recorder({ checkpointInterval: 3 });
    const state = baseState();
    for (let i = 0; i < 7; i++) rec.record(action(i), state);
    const trajectory = rec.finish(state);

    // Interval checkpoints at indexes 2 and 5, plus the mandatory final one.
    expect(trajectory.checkpoints.map((c) => c.afterActionIndex)).toEqual([2, 5, 6]);
    for (const checkpoint of trajectory.checkpoints) {
      expect(checkpoint.checksum).toBe(checksumState(state));
    }
  });

  it('does not double-checkpoint when the last action already landed on one', () => {
    const rec = recorder({ checkpointInterval: 2 });
    const state = baseState();
    for (let i = 0; i < 4; i++) rec.record(action(i), state);
    const trajectory = rec.finish(state);
    expect(trajectory.checkpoints.map((c) => c.afterActionIndex)).toEqual([1, 3]);
  });

  it('reads the outcome off the final state', () => {
    const rec = recorder();
    const state = baseState();
    rec.record(action(1), state);
    const finished: GameState = {
      ...state,
      turnNumber: 9,
      gameOver: { winnerId: 'p2', reason: 'life-loss' as GameState['gameOver'] extends null ? never : never },
    } as GameState;

    const trajectory = rec.finish(finished);
    expect(trajectory.outcome).toEqual({ winnerSeatId: 'p2', reason: 'life-loss', turnNumber: 9 });
  });

  it('records no outcome for an abandoned match', () => {
    const rec = recorder();
    const state = baseState();
    rec.record(action(1), state);
    expect(rec.finish(state).outcome).toBeNull();
  });

  it('seals once — a late action cannot mutate a finished recording', () => {
    const rec = recorder();
    const state = baseState();
    rec.record(action(1), state);
    const first = rec.finish(state);
    rec.record(action(2), state);
    const second = rec.finish(state);

    expect(second).toBe(first);
    expect(first.actions).toHaveLength(1);
  });

  it('uses a sane default checkpoint interval', () => {
    expect(DEFAULT_CHECKPOINT_INTERVAL).toBeGreaterThan(1);
    const rec = recorder();
    const state = baseState();
    for (let i = 0; i < DEFAULT_CHECKPOINT_INTERVAL; i++) rec.record(action(i), state);
    expect(rec.actionCount()).toBe(DEFAULT_CHECKPOINT_INTERVAL);
  });
});

describe('state checksum', () => {
  it('changes when the position changes', () => {
    const rig = buildBaseRig();
    const before = checksumState(rig.state);
    const after = checksumState(putCharacterInPlay(rig, 'p1', makeCharacterDef({ cardNumber: 'X' })).rig.state);
    expect(after).not.toBe(before);
  });

  it('is stable across re-serialization of the same position', () => {
    const state = baseState();
    const clone = JSON.parse(JSON.stringify(state)) as GameState;
    expect(checksumState(clone)).toBe(checksumState(state));
  });
});

describe('card data hash', () => {
  it('ignores presentation-only changes', () => {
    const def = makeCharacterDef({ cardNumber: 'C-1', basePower: 5000 });
    const restyled = { ...def, rarity: 'SR', imageUrl: 'somewhere-else' } as typeof def;
    expect(hashCardData([restyled])).toBe(hashCardData([def]));
  });

  it('changes when a rules-bearing field changes', () => {
    const def = makeCharacterDef({ cardNumber: 'C-1', basePower: 5000 });
    expect(hashCardData([{ ...def, basePower: 6000 }])).not.toBe(hashCardData([def]));
    expect(hashCardData([{ ...def, hasRush: true }])).not.toBe(hashCardData([def]));
    expect(hashCardData([{ ...def, text: 'different' }])).not.toBe(hashCardData([def]));
  });

  it('does not depend on the order definitions are supplied in', () => {
    const a = makeCharacterDef({ cardNumber: 'A' });
    const b = makeCharacterDef({ cardNumber: 'B' });
    expect(hashCardData([a, b])).toBe(hashCardData([b, a]));
  });
});
