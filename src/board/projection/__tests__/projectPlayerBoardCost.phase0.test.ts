/**
 * Phase 0 performance baseline — see docs/08-match-performance-plan.md.
 *
 * Companion to matchScreenPerf.phase0.test.tsx (the React-commit-count
 * harness, which requires jsdom). This one runs in the 'node' environment
 * so it works even where jsdom is unavailable/broken, and measures the one
 * number that doesn't need a DOM at all: the raw cost of
 * board/projection's projectPlayerBoard(), which MatchScreen.tsx calls
 * TWICE, unmemoized, inline in its render body (MatchScreen.tsx:361-362)
 * on every single render.
 *
 * Not a correctness test — prints timing to console. Re-run after Phase 1
 * memoizes the call site to confirm the wall-clock cost per render didn't
 * change (it shouldn't; Phase 1's fix is calling this less often, not
 * making the function itself faster) and to catch any future regression
 * that makes the projection itself slower.
 */
import { describe, expect, it } from 'vitest';
import { projectPlayerBoard } from '../index';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDon,
  putInHand,
  putLifeCards,
} from '../../../engine/rules/shared/__tests__/testRig';

function buildBoard(charactersPerSide: number) {
  let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });

  for (let i = 0; i < charactersPerSide; i += 1) {
    const def = makeCharacterDef({ name: `Character ${i}`, basePower: 2000 + i * 100 });
    ({ rig } = putCharacterInPlay(rig, 'p1', def));
    ({ rig } = putCharacterInPlay(rig, 'p2', def));
  }
  for (let i = 0; i < 6; i += 1) {
    const handDef = makeCharacterDef({ name: `Hand ${i}`, basePower: 3000 });
    ({ rig } = putInHand(rig, 'p1', handDef));
    ({ rig } = putInHand(rig, 'p2', handDef));
  }
  const lifeDef = makeCharacterDef({ name: 'Life Filler', basePower: 1000 });
  ({ rig } = putLifeCards(rig, 'p1', Array.from({ length: 5 }, () => lifeDef)));
  ({ rig } = putLifeCards(rig, 'p2', Array.from({ length: 5 }, () => lifeDef)));
  ({ rig } = putDon(rig, 'p1', 6));
  ({ rig } = putDon(rig, 'p2', 4));

  const images = Object.fromEntries(Object.keys(rig.defs).map((id) => [id, null]));
  return { rig, images };
}

function timeCalls(fn: () => void, iterations: number): { totalMs: number; perCallMs: number } {
  // Warm up (JIT) before measuring, same as any real repeated-render scenario.
  for (let i = 0; i < 50; i += 1) fn();
  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) fn();
  const totalMs = performance.now() - start;
  return { totalMs, perCallMs: totalMs / iterations };
}

describe('projectPlayerBoard cost (Phase 0 baseline)', () => {
  it('measures per-call cost at a typical mid-game board size (5 characters/side) and reports render-loop impact', () => {
    const { rig, images } = buildBoard(5);
    const iterations = 2000;

    const both = timeCalls(() => {
      projectPlayerBoard(rig.state, rig.defs, images, 'p1');
      projectPlayerBoard(rig.state, rig.defs, images, 'p2');
    }, iterations);

    // eslint-disable-next-line no-console
    console.log(
      '\n=== Phase 0 baseline: projectPlayerBoard() raw cost ===\n' +
        `Board: 5 characters/side, 6 hand cards/side, 5 life cards/side, DON on both sides.\n` +
        `${iterations} iterations of (projectPlayerBoard(p1) + projectPlayerBoard(p2)):\n` +
        `  total: ${both.totalMs.toFixed(2)}ms, avg per BOTH-SIDES call: ${both.perCallMs.toFixed(4)}ms\n` +
        `MatchScreen.tsx:361-362 calls exactly this pair, unmemoized, on every render.\n` +
        `At this cost, N unrelated re-renders/second (modal open, hover, log panel,\n` +
        `any dispatch at all) spend N * ${both.perCallMs.toFixed(4)}ms rebuilding board projections\n` +
        `that didn't change, BEFORE React reconciles the un-memoized 24-component tree.\n` +
        '=========================================================\n',
    );

    expect(both.perCallMs).toBeGreaterThan(0);
  });

  it('shows projection cost scaling with board size (2 vs 5 vs 10 characters/side)', () => {
    const iterations = 1000;
    const sizes = [2, 5, 10];
    const rows = sizes.map((size) => {
      const { rig, images } = buildBoard(size);
      const result = timeCalls(() => {
        projectPlayerBoard(rig.state, rig.defs, images, 'p1');
        projectPlayerBoard(rig.state, rig.defs, images, 'p2');
      }, iterations);
      return { size, ...result };
    });

    // eslint-disable-next-line no-console
    console.log(
      '\n=== Phase 0 baseline: projectPlayerBoard() cost vs. board size ===\n' +
        rows.map((r) => `  ${r.size} characters/side: avg ${r.perCallMs.toFixed(4)}ms per both-sides call`).join('\n') +
        '\n=====================================================\n',
    );

    expect(rows.length).toBe(3);
  });
});
