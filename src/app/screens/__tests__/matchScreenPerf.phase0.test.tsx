// @vitest-environment jsdom
/**
 * Phase 0 performance baseline probe — see docs/08-match-performance-plan.md.
 *
 * NOT a correctness test. Mounts the real MatchScreen against a synthetic
 * mid-game board (built with the same testRig fixtures BoardCardTile.test.tsx
 * uses) and measures, for a representative "give DON -> declare attack ->
 * activate blocker" turn:
 *   1. how many times React actually commits a render (via <Profiler>)
 *   2. how many times board/projection's projectPlayerBoard() runs
 * per dispatched action, plus each commit's self-reported duration.
 *
 * These are the "before" numbers Phase 1 (useMemo the projection, React.memo
 * the board components) is supposed to reduce. Left in the repo as a
 * re-runnable tool — rerun after Phase 1 lands and diff the printed table
 * against docs/08-match-performance-plan.md's baseline section, instead of
 * re-deriving a harness from scratch.
 */
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMatchStore } from '../../store/matchStore';
import { MatchScreen } from '../MatchScreen';
import * as projectionModule from '../../../board/projection';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDon,
  putInHand,
  putLifeCards,
} from '../../../engine/rules/shared/__tests__/testRig';
import type { GameAction } from '../../../engine/actions';

// jsdom doesn't implement these; MatchScreen's attack-arrow ResizeObserver
// and CardDetailModal's matchMedia check run unconditionally on mount.
beforeEach(() => {
  if (typeof (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface CommitRecord {
  actualDuration: number;
  baseDuration: number;
  phase: string;
}

function buildBoard() {
  let rig = buildBaseRig({ phase: 'main', activePlayerId: 'p1', turnNumber: 3 });

  const attackerDef = makeCharacterDef({ name: 'Attacker', basePower: 5000, hasRush: true });
  const blockerDef = makeCharacterDef({ name: 'Blocker', basePower: 4000, hasBlocker: true });
  // A handful of extra characters + hand + life cards on both sides so the
  // board projection has a realistic amount of work to do, not a near-empty
  // 2-card toy board.
  const extraDefs = Array.from({ length: 3 }, (_, i) => makeCharacterDef({ name: `Filler ${i}`, basePower: 2000 }));

  let attackerId!: string;
  let blockerId!: string;
  ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p1', attackerDef));
  ({ rig, instanceId: blockerId } = putCharacterInPlay(rig, 'p2', blockerDef));
  for (const def of extraDefs) {
    ({ rig } = putCharacterInPlay(rig, 'p1', def));
    ({ rig } = putCharacterInPlay(rig, 'p2', def));
  }
  for (let i = 0; i < 4; i += 1) {
    const handDef = makeCharacterDef({ name: `Hand ${i}`, basePower: 3000 });
    ({ rig } = putInHand(rig, 'p1', handDef));
    ({ rig } = putInHand(rig, 'p2', handDef));
  }
  const lifeDef = makeCharacterDef({ name: 'Life Filler', basePower: 1000 });
  ({ rig } = putLifeCards(rig, 'p1', Array.from({ length: 4 }, () => lifeDef)));
  ({ rig } = putLifeCards(rig, 'p2', Array.from({ length: 4 }, () => lifeDef)));

  let donIds: string[] = [];
  ({ rig, donIds } = putDon(rig, 'p1', 3, { rested: false }));

  return { rig, attackerId, blockerId, donId: donIds[0] };
}

// Type inferred from the actual working vi.spyOn() call below, rather than
// hand-written against vitest's spyOn generics — those vary across vitest
// versions/overloads and are easy to get subtly wrong; this way the
// declaration below can never drift out of sync with what spyOn really returns.
function createProjectPlayerBoardSpy() {
  return vi.spyOn(projectionModule, 'projectPlayerBoard');
}

describe('Match screen Phase 0 performance baseline', () => {
  let container: HTMLDivElement;
  let root: Root;
  const commits: CommitRecord[] = [];
  let projectSpy: ReturnType<typeof createProjectPlayerBoardSpy>;

  const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration, baseDuration) => {
    commits.push({ actualDuration, baseDuration, phase });
  };

  beforeEach(() => {
    useMatchStore.getState().reset();
    commits.length = 0;
    projectSpy = createProjectPlayerBoardSpy();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    projectSpy.mockRestore();
  });

  it('reports commits and projectPlayerBoard() calls per action for a give-DON -> attack -> block turn', () => {
    const { rig, attackerId, blockerId, donId } = buildBoard();

    useMatchStore.setState({
      state: rig.state,
      defs: rig.defs,
      registry: {},
      v2EffectRuntime: null,
      v2EffectSidecars: null,
      cardImagesByDefinitionId: Object.fromEntries(Object.keys(rig.defs).map((id) => [id, null])),
      startedWithDeckIds: null,
      startError: null,
      localPlayerId: null,
      playerNames: {},
      cpuPlayerIds: [],
      cpuDifficulty: 'normal',
      cpuDebug: false,
      playTestMode: true,
      onlineMode: false,
      onlineSendIntent: null,
    });

    act(() => {
      root.render(
        <Profiler id="match-screen" onRender={onRender}>
          <MatchScreen />
        </Profiler>,
      );
    });

    const mountCommits = commits.length;
    const mountProjectCalls = projectSpy.mock.calls.length;

    const p2LeaderId = rig.state.players.p2.leaderInstanceId;

    const results: { action: string; ok: boolean; reasons?: string[]; commits: number; projectCalls: number; totalActualMs: number }[] = [];

    const dispatchAndMeasure = (label: string, action: GameAction) => {
      const commitsBefore = commits.length;
      const projectBefore = projectSpy.mock.calls.length;
      let outcome: { ok: boolean; reasons?: string[] } = { ok: false };
      act(() => {
        outcome = useMatchStore.getState().dispatch(action);
      });
      const commitDelta = commits.length - commitsBefore;
      const projectDelta = projectSpy.mock.calls.length - projectBefore;
      const totalActualMs = commits
        .slice(commitsBefore)
        .reduce((sum, c) => sum + c.actualDuration, 0);
      results.push({ action: label, ok: outcome.ok, reasons: outcome.reasons, commits: commitDelta, projectCalls: projectDelta, totalActualMs });
    };

    dispatchAndMeasure('GIVE_DON', {
      type: 'GIVE_DON',
      actionId: 'phase0-give-don',
      playerId: 'p1',
      donInstanceId: donId,
      targetInstanceId: attackerId,
    });

    dispatchAndMeasure('DECLARE_ATTACK', {
      type: 'DECLARE_ATTACK',
      actionId: 'phase0-attack',
      playerId: 'p1',
      attackerInstanceId: attackerId,
      targetInstanceId: p2LeaderId,
    });

    dispatchAndMeasure('ACTIVATE_BLOCKER', {
      type: 'ACTIVATE_BLOCKER',
      actionId: 'phase0-block',
      playerId: 'p2',
      blockerInstanceId: blockerId,
    });

    // eslint-disable-next-line no-console
    console.log(
      '\n=== Phase 0 baseline: MatchScreen re-render cost ===\n' +
        `Initial mount: ${mountCommits} commit(s), ${mountProjectCalls} projectPlayerBoard() call(s)\n` +
        results
          .map(
            (r) =>
              `${r.action.padEnd(16)} ok=${String(r.ok).padEnd(5)} commits=${String(r.commits).padEnd(3)} ` +
              `projectPlayerBoard=${String(r.projectCalls).padEnd(3)} actualRenderMs=${r.totalActualMs.toFixed(3)}` +
              (r.ok ? '' : ` reasons=${JSON.stringify(r.reasons)}`),
          )
          .join('\n') +
        '\n=====================================================\n',
    );

    // Not hard assertions on exact counts (those are expected to change once
    // Phase 1 lands) — just a sanity check that the harness actually
    // exercised real dispatches and produced measurable commits.
    expect(mountCommits).toBeGreaterThan(0);
    expect(results.some((r) => r.ok)).toBe(true);
  });
});
