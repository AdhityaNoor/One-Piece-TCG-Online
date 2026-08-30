import { buildDeckFor, buildRig, createActionId, dispatch, loadCatalog, type HarnessOptions } from './harness';
import { chooseAction } from '../../src/ai';
import { generateLegalActions, actionLabel } from '../../src/ai/utilities/legalActions';
import { buildStrategicContext } from '../../src/ai/evaluation/stateEvaluator';
import { evaluateMatchObjective } from '../../src/ai/evaluation/matchObjective';
import { simulateTurnPlan, type TurnPlanTemplate } from '../../src/ai/planning/sequenceGenerator';
import { projectOpponentTurn } from '../../src/ai/planning/opponentTurnSimulator';
import { simulateAction } from '../../src/ai/planning/stateSimulator';
import { getActingPlayerId } from '../../src/board/projection';
import type { GameState } from '../../src/engine/state/game';
import type { CpuDifficulty } from '../../src/ai';

const difficulty = 'hard' as CpuDifficulty;
const stopTurn = Number(process.argv.find((a) => a.startsWith('--turn='))?.split('=')[1] ?? '7');
const watch = process.argv.find((a) => a.startsWith('--watch='))?.split('=')[1] ?? 'p1';
const seed = 'sim-1';
const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const rig = buildRig(byNum.get('OP01-001')!, buildDeckFor(byNum.get('OP01-001')!, catalog), byNum.get('OP01-002')!, buildDeckFor(byNum.get('OP01-002')!, catalog), { mode: 'v1', difficulty, seed } as HarnessOptions);

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

const me = getActingPlayerId(rig.state);
const strategic = buildStrategicContext(rig.state, me, rig.defs, rig.registry);
function show(tag: string, s: GameState) {
  const o = evaluateMatchObjective(s, me, rig.defs, rig.registry);
  const p = s.players[me];
  console.log(
    `${tag.padEnd(34)} util=${o.utility.toFixed(1).padStart(8)} win=${o.winProbability.toFixed(2)} loss=${o.lossProbability.toFixed(2)} pressure=${o.opponentLifePressure.toFixed(1).padStart(6)} safety=${o.ownLifeSafety.toFixed(1).padStart(7)} pos=${o.strategicPositionValue.toFixed(1).padStart(7)} | life=${p.lifeArea.cardIds.length} chars=${p.characterArea.cardIds.length} hand=${p.hand.cardIds.length}`,
  );
}

show('NOW', rig.state);
const projNow = projectOpponentTurn(rig.state, me, rig.defs, rig.registry, createActionId, strategic);
if (!projNow.failed) show('NOW + opp turn', projNow.state);

const templates: TurnPlanTemplate[] = [
  { id: 'end-now', steps: ['end'] },
  { id: 'lethal-play-then-swing', steps: ['play', 'give_don', 'attack_leader', 'end'] },
  { id: 'play-only', steps: ['play', 'play', 'end'] },
  { id: 'attack-only', steps: ['attack_leader', 'end'] },
];
for (const t of templates) {
  const r = simulateTurnPlan(rig.state, me, rig.defs, rig.registry, strategic, createActionId, t);
  console.log(`\nplan ${t.id}: endUtility=${r.endUtility.toFixed(1)} line=[${r.actions.map((a) => actionLabel(rig.state, rig.defs, a)).join(' > ')}]`);
  // rebuild the pre-projection state to show both halves
  let cur = rig.state;
  for (const a of r.actions) {
    const sim = simulateAction({ state: cur, action: a, playerId: me, defs: rig.defs, registry: rig.registry, createActionId, strategic });
    if (sim.failed) { console.log('   (replay failed at', a.type, sim.reason, ')'); break; }
    cur = sim.state;
  }
  show('   after our line', cur);
  const pr = projectOpponentTurn(cur, me, rig.defs, rig.registry, createActionId, strategic);
  if (pr.failed) console.log('   opp projection FAILED'); else show('   after opp turn', pr.state);
}
