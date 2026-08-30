/** Run several CPU-vs-CPU matches and report aggregate AI behaviour. */
import { buildDeckFor, buildRig, loadCatalog, runMatch, type HarnessOptions } from './harness';
import type { CpuDifficulty } from '../../src/ai';

const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'hard') as CpuDifficulty;
const mode = (process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'v1') as 'v1' | 'v2';
const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));

const PAIRS: [string, string][] = [
  ['OP01-001', 'OP01-002'],
  ['OP01-002', 'OP01-003'],
  ['OP02-025', 'OP03-021'],
  ['OP04-001', 'OP01-031'],
  ['OP01-003', 'OP01-001'],
  ['EB01-040', 'OP02-093'],
];

const only = process.argv.find((a) => a.startsWith('--pair='))?.split('=')[1];
const selected = only === undefined ? PAIRS : [PAIRS[Number(only)]];

let games = 0, finished = 0, stuck = 0, totalTurns = 0, emptyTurns = 0, totalMainTurns = 0;
let decisionMs = 0, decisions = 0, slowestMs = 0;
const agg: Record<string, number> = {};

for (const [a, b] of selected) {
  for (const seed of ['s1', 's2']) {
    const la = byNum.get(a), lb = byNum.get(b);
    if (!la || !lb) { console.log('skip', a, b); continue; }
    const opts: HarnessOptions = { mode, difficulty, seed: `${a}-${b}-${seed}`, maxActions: 2500 };
    const rig = buildRig(la, buildDeckFor(la, catalog), lb, buildDeckFor(lb, catalog), opts);
    // count "empty turns": a main phase whose only action was END_MAIN_PHASE
    const perTurn = new Map<string, number>();
    const res = runMatch(rig, {
      ...opts,
      onAction: ({ action, state, playerId, decisionMs: ms }) => {
        agg[action.type] = (agg[action.type] ?? 0) + 1;
        if (typeof ms === 'number') { decisionMs += ms; decisions += 1; slowestMs = Math.max(slowestMs, ms); }
        if (state.currentPhase === 'main' && state.activePlayerId === playerId && !state.currentBattle) {
          const key = `${state.turnNumber}:${playerId}`;
          perTurn.set(key, (perTurn.get(key) ?? 0) + (action.type === 'END_MAIN_PHASE' ? 0 : 1));
        }
      },
    });
    games += 1;
    if (res.stuck) stuck += 1;
    if (rig.state.gameOver) finished += 1;
    totalTurns += rig.state.turnNumber;
    for (const [, n] of perTurn) { totalMainTurns += 1; if (n === 0) emptyTurns += 1; }
    console.log(`${a} vs ${b} [${seed}] turns=${String(rig.state.turnNumber).padStart(2)} actions=${String(res.actions).padStart(3)} over=${rig.state.gameOver ? (rig.state.gameOver as any).winnerId : 'NO'}${res.stuck ? ' STUCK' : ''}`);
  }
}

console.log(`\ngames=${games} finished=${finished} stuck=${stuck} avgTurns=${(totalTurns / games).toFixed(1)}`);
console.log(`main phases that did NOTHING but end the turn: ${emptyTurns}/${totalMainTurns} (${((emptyTurns / Math.max(1, totalMainTurns)) * 100).toFixed(1)}%)`);
console.log(`decision time: avg=${(decisionMs / Math.max(1, decisions)).toFixed(0)}ms slowest=${slowestMs.toFixed(0)}ms over ${decisions} decisions`);
console.log('actions:', JSON.stringify(Object.fromEntries(Object.entries(agg).sort((x, y) => y[1] - x[1]))));
