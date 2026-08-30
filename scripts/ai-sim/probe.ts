/** Play forward to a given turn, then dump the AI's ranked actions for a seat. */
import { buildDeckFor, buildRig, createActionId, dispatch, loadCatalog, type HarnessOptions } from './harness';
import { chooseAction } from '../../src/ai';
import { generateLegalActions, actionLabel } from '../../src/ai/utilities/legalActions';
import { scoreAction } from '../../src/ai/evaluators/heuristicEvaluator';
import { buildStrategicContext } from '../../src/ai/evaluation/stateEvaluator';
import { getActingPlayerId } from '../../src/board/projection';
import type { CpuDifficulty } from '../../src/ai';

const mode = (process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'v1') as 'v1' | 'v2';
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'hard') as CpuDifficulty;
const stopTurn = Number(process.argv.find((a) => a.startsWith('--turn='))?.split('=')[1] ?? '7');
const watch = process.argv.find((a) => a.startsWith('--watch='))?.split('=')[1] ?? 'p1';
const seed = process.argv.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? 'sim-1';

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const la = byNum.get('OP01-001')!;
const lb = byNum.get('OP01-002')!;
const opts: HarnessOptions = { mode, difficulty, seed };
const rig = buildRig(la, buildDeckFor(la, catalog), lb, buildDeckFor(lb, catalog), opts);

let guard = 0;
while (guard++ < 2000 && !rig.state.gameOver) {
  const acting = getActingPlayerId(rig.state);
  if (
    acting === watch &&
    rig.state.turnNumber >= stopTurn &&
    rig.state.currentPhase === 'main' &&
    rig.state.activePlayerId === watch &&
    !rig.state.currentBattle &&
    rig.state.pendingChoices.length === 0
  ) {
    break;
  }
  const decision = chooseAction({
    state: rig.state,
    playerId: acting,
    defs: rig.defs,
    registry: rig.registry,
    config: { difficulty, seed },
    createActionId,
  });
  const legal = generateLegalActions({ state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry, createActionId });
  const action = decision?.action ?? legal[0];
  if (!action) break;
  const res = dispatch(rig, action);
  if (!res.ok) { console.log('REJECTED', action.type, res.reasons); break; }
}

const state = rig.state;
const acting = getActingPlayerId(state);
console.log(`\n### turn ${state.turnNumber} phase=${state.currentPhase} acting=${acting}`);
const me = state.players[acting];
console.log(`hand=${me.hand.cardIds.length} chars=${me.characterArea.cardIds.length} life=${me.lifeArea.cardIds.length} don(active)=${me.costArea.cardIds.filter((id) => state.cardsById[id].donRested === false).length}`);

const strategic = buildStrategicContext(state, acting, rig.defs, rig.registry);
console.log(`mode=${strategic.mode} phase=${strategic.gamePhase} utility=${strategic.objective.utility.toFixed(1)} leader=${strategic.leader.description}`);
console.log(`survival.immediateLossRisk=${strategic.survival.immediateLossRisk} victory=${JSON.stringify(strategic.victory)}`);
console.log(`modeWeights=${JSON.stringify(strategic.modeWeights)}`);

const legal = generateLegalActions({ state, playerId: acting, defs: rig.defs, registry: rig.registry, createActionId });
const scored = legal.map((action) => ({
  action,
  label: actionLabel(state, rig.defs, action),
  score: scoreAction(state, action, acting, rig.defs, rig.registry, difficulty, strategic, createActionId),
}));
scored.sort((a, b) => b.score - a.score);
console.log(`\nlegal=${legal.length}, ranked:`);
for (const s of scored.slice(0, 20)) console.log(`  ${s.score.toFixed(2).padStart(10)}  ${s.action.type.padEnd(24)} ${s.label}`);

// --- lookahead comparison ---
import { rankActionsWithLookahead, scoreActionWithLookahead } from '../../src/ai/planning/lookaheadPlanner';
const hs = new Map<string, number>();
for (const s of scored) hs.set(JSON.stringify(s.action), s.score);
const finalScores = rankActionsWithLookahead(state, legal, hs, acting, rig.defs, rig.registry, strategic, createActionId);
const finalRanked = legal
  .map((a) => ({ a, label: actionLabel(state, rig.defs, a), h: hs.get(JSON.stringify(a)) ?? 0, f: finalScores.get(JSON.stringify(a)) ?? 0 }))
  .sort((x, y) => y.f - x.f);
console.log('\nAFTER LOOKAHEAD (hard):');
for (const r of finalRanked.slice(0, 20)) {
  console.log(`  final=${r.f.toExponential(4).padStart(14)}  heur=${r.h.toFixed(1).padStart(9)}  ${r.a.type.padEnd(22)} ${r.label}`);
}
console.log('\nlookahead detail for top heuristic actions:');
for (const s of scored.slice(0, 4)) {
  const d = scoreActionWithLookahead(state, s.action, acting, rig.defs, rig.registry, strategic, s.score, createActionId);
  console.log(`  ${s.action.type.padEnd(22)} ${s.label.padEnd(24)} score=${d.score.toExponential(4)} simUtility=${d.simulatedUtility?.toExponential(4)} depth=${d.depth} failed=${d.failed}`);
}
const endAct = legal.find((a) => a.type === 'END_MAIN_PHASE')!;
const de = scoreActionWithLookahead(state, endAct, acting, rig.defs, rig.registry, strategic, hs.get(JSON.stringify(endAct))!, createActionId);
console.log(`  END_MAIN_PHASE          score=${de.score.toExponential(4)} simUtility=${de.simulatedUtility?.toExponential(4)} depth=${de.depth} failed=${de.failed}`);
