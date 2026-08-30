import { buildDeckFor, buildRig, createActionId, dispatch, loadCatalog, type HarnessOptions } from './harness';
import { chooseAction } from '../../src/ai';
import { generateLegalActions, actionLabel } from '../../src/ai/utilities/legalActions';
import { buildStrategicContext, evaluateState } from '../../src/ai/evaluation/stateEvaluator';
import { generateAndRankTurnPlans, simulateTurnPlan } from '../../src/ai/planning/sequenceGenerator';
import { analyzeLeaderActivation } from '../../src/ai/planning/leaderActivationPlanner';
import { projectOpponentTurn } from '../../src/ai/planning/opponentTurnSimulator';
import { getActingPlayerId } from '../../src/board/projection';
import type { CpuDifficulty } from '../../src/ai';

const mode = (process.argv.find((a) => a.startsWith('--mode='))?.split('=')[1] ?? 'v1') as 'v1' | 'v2';
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'hard') as CpuDifficulty;
const stopTurn = Number(process.argv.find((a) => a.startsWith('--turn='))?.split('=')[1] ?? '7');
const watch = process.argv.find((a) => a.startsWith('--watch='))?.split('=')[1] ?? 'p1';
const seed = process.argv.find((a) => a.startsWith('--seed='))?.split('=')[1] ?? 'sim-1';

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const rig = buildRig(byNum.get('OP01-001')!, buildDeckFor(byNum.get('OP01-001')!, catalog), byNum.get('OP01-002')!, buildDeckFor(byNum.get('OP01-002')!, catalog), { mode, difficulty, seed } as HarnessOptions);

let guard = 0;
while (guard++ < 2000 && !rig.state.gameOver) {
  const acting = getActingPlayerId(rig.state);
  if (acting === watch && rig.state.turnNumber >= stopTurn && rig.state.currentPhase === 'main' && rig.state.activePlayerId === watch && !rig.state.currentBattle && rig.state.pendingChoices.length === 0) break;
  const d = chooseAction({ state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry, config: { difficulty, seed }, createActionId });
  const legal = generateLegalActions({ state: rig.state, playerId: acting, defs: rig.defs, registry: rig.registry, createActionId });
  const a = d?.action ?? legal[0];
  if (!a) break;
  if (!dispatch(rig, a).ok) break;
}

const state = rig.state;
const me = getActingPlayerId(state);
const strategic = buildStrategicContext(state, me, rig.defs, rig.registry);
console.log(`\n### turn ${state.turnNumber} acting=${me} mode=${strategic.mode}`);
console.log(`baseline evaluateState(now) = ${evaluateState(state, me, rig.defs, rig.registry).toFixed(2)}`);
const proj = projectOpponentTurn(state, me, rig.defs, rig.registry, createActionId, strategic);
console.log(`projectOpponentTurn(now): failed=${proj.failed} utilityAfter=${proj.failed ? 'n/a' : evaluateState(proj.state, me, rig.defs, rig.registry).toFixed(2)}`);

const la = analyzeLeaderActivation(state, me, rig.defs, rig.registry, strategic);
console.log(`leaderActivation=${JSON.stringify(la)}`);

const plans = generateAndRankTurnPlans(state, me, rig.defs, rig.registry, strategic, createActionId);
console.log(`\nplans (${plans.length}):`);
for (const p of plans) {
  console.log(`  ${p.id.padEnd(28)} endUtility=${p.endUtility.toFixed(2).padStart(12)} first=${p.firstAction ? actionLabel(state, rig.defs, p.firstAction) : 'none'}  line=[${p.actions.map((a) => actionLabel(state, rig.defs, a)).join(' > ')}]`);
}
