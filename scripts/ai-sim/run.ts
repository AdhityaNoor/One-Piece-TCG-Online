import { buildDeckFor, buildRig, loadCatalog, runMatch, type HarnessOptions } from './harness';
import { actionLabel } from '../../src/ai/utilities/legalActions';
import type { CpuDifficulty } from '../../src/ai';

const mode = (process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'v1') as 'v1' | 'v2';
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'hard') as CpuDifficulty;
const leaderA = process.argv.find((a) => a.startsWith('--leaderA='))?.split('=')[1] ?? 'OP01-001';
const leaderB = process.argv.find((a) => a.startsWith('--leaderB='))?.split('=')[1] ?? 'OP01-002';
const seed = process.argv.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? 'sim-1';
const verbose = process.argv.includes('--verbose');

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const la = byNum.get(leaderA);
const lb = byNum.get(leaderB);
if (!la || !lb) throw new Error(`unknown leader ${leaderA}/${leaderB}`);

const opts: HarnessOptions = { mode, difficulty, seed, maxActions: 3000 };
const rig = buildRig(la, buildDeckFor(la, catalog), lb, buildDeckFor(lb, catalog), opts);

const counts: Record<string, number> = {};
const perTurn = new Map<string, string[]>();
let rejects = 0;
const rejectSamples: string[] = [];

const result = runMatch(rig, {
  ...opts,
  onAction: ({ action, ok, reasons, state, playerId, legalCount }) => {
    counts[action.type] = (counts[action.type] ?? 0) + 1;
    const key = `T${state.turnNumber}:${state.activePlayerId}`;
    const label = `${playerId} ${actionLabel(state, rig.defs, action)}${ok ? '' : ` [REJECTED ${reasons?.join('|')}]`} (legal=${legalCount})`;
    perTurn.set(key, [...(perTurn.get(key) ?? []), label]);
    if (!ok) {
      rejects += 1;
      if (rejectSamples.length < 8) rejectSamples.push(`${action.type}: ${reasons?.join(' | ')}`);
    }
  },
});

console.log(`\n=== mode=${mode} diff=${difficulty} ${leaderA} vs ${leaderB} ===`);
console.log(`actions=${result.actions} stuck=${result.stuck} gameOver=${rig.state.gameOver} turns=${rig.state.turnNumber}`);
console.log(`life p1=${rig.state.players.p1.lifeArea.cardIds.length} p2=${rig.state.players.p2.lifeArea.cardIds.length}`);
console.log(`board p1=${rig.state.players.p1.characterArea.cardIds.length} p2=${rig.state.players.p2.characterArea.cardIds.length}`);
console.log(`hand p1=${rig.state.players.p1.hand.cardIds.length} p2=${rig.state.players.p2.hand.cardIds.length}`);
console.log('\naction counts:');
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(30)} ${v}`);
console.log(`\nrejected dispatches: ${rejects}`);
for (const s of rejectSamples) console.log(`  ! ${s}`);

if (verbose) {
  console.log('\n--- per-turn ---');
  for (const [k, v] of perTurn) {
    console.log(`${k}: ${v.length} actions`);
    for (const line of v.slice(0, 25)) console.log(`    ${line}`);
  }
}

if (result.stuck) {
  const s = rig.state;
  const acting = (await import('../../src/board/projection')).getActingPlayerId(s);
  console.log('\n=== STUCK STATE ===');
  console.log(`phase=${s.currentPhase} activePlayer=${s.activePlayerId} acting=${acting} battle=${JSON.stringify(s.currentBattle && { step: s.currentBattle.step, atk: s.currentBattle.attackerInstanceId, tgt: s.currentBattle.targetInstanceId })}`);
  console.log(`pendingChoices=${JSON.stringify(s.pendingChoices.map((c) => ({ id: c.id, player: c.playerId, kind: c.kind, src: c.sourceEffectId, prompt: c.prompt, min: c.constraints.min, max: c.constraints.max, cands: c.constraints.candidateInstanceIds?.length, zone: c.constraints.zoneId })), null, 1)}`);
  const { generateLegalActions: gla } = await import('../../src/ai/utilities/legalActions');
  for (const pid of ['p1', 'p2']) {
    const l = gla({ state: s, playerId: pid, defs: rig.defs, registry: rig.registry, createActionId: () => 'x' });
    console.log(`legal(${pid})=${l.length} ${l.slice(0, 6).map((a) => a.type).join(',')}`);
  }
  console.log('last log:', s.log.slice(-6).map((e: any) => e.message ?? e.description ?? JSON.stringify(e).slice(0, 120)));
}
