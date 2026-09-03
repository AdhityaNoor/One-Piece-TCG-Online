/**
 * Dump self-play trajectories to disk, then verify each one replays exactly.
 *
 *   npx tsx scripts/ai-sim/record.ts --games=20 --diff=hard --out=training-data
 *
 * Every file written has already survived a full replay + redaction pass, so
 * the directory only ever contains recordings that are known to reconstruct.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDeckFor, loadCatalog, recordMatch, type HarnessOptions } from './harness';
import { replayTrajectory, trainableSteps } from '../../src/engine/replay';
import { buildCuratedEffectRegistry } from '../../src/cards/effectTemplates';
import { GENERIC_DON_CARD_DEFINITION } from '../../src/cards/decks/genericDonCard';
import { normalizeEngineCardDefinition } from '../../src/cards/normalization/engineDefinition';
import type { CpuDifficulty } from '../../src/ai';
import type { CardDefinitionLookup } from '../../src/engine/rules/shared';

const games = Number(process.argv.find((a) => a.startsWith('--games='))?.split('=')[1] ?? '5');
const difficulty = (process.argv.find((a) => a.startsWith('--diff='))?.split('=')[1] ?? 'hard') as CpuDifficulty;
const outDir = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'training-data';

const catalog = loadCatalog();
const byNum = new Map(catalog.map((d) => [d.cardNumber, d]));
const LEADERS = ['OP01-001', 'OP01-002', 'OP01-003', 'OP02-025', 'OP03-021', 'OP04-001'];

const allDefs: CardDefinitionLookup = {};
for (const def of catalog) allDefs[def.cardDefinitionId] = def;
const registry = buildCuratedEffectRegistry(allDefs);

mkdirSync(resolve(outDir), { recursive: true });

let written = 0;
let rejected = 0;
let totalSteps = 0;
let trainable = 0;

for (let i = 0; i < games; i++) {
  const la = byNum.get(LEADERS[i % LEADERS.length])!;
  const lb = byNum.get(LEADERS[(i + 1) % LEADERS.length])!;
  // deadlineMs, not just maxActions: some board states loop without ever
  // adding actions (OP04-001's "cannot attack" lock is the known one), so an
  // action cap never fires and the whole run hangs on one game. The arena
  // already learned this; recording needs the same guard.
  const opts: HarnessOptions = {
    mode: 'v1', difficulty, seed: `selfplay-${difficulty}-${i}`, maxActions: 2500,
    deadlineMs: Number(process.argv.find((a) => a.startsWith('--deadline='))?.split('=')[1] ?? 40000),
  };

  const { trajectory, stuck } = recordMatch(la, buildDeckFor(la, catalog), lb, buildDeckFor(lb, catalog), opts);

  // Verify before writing: a recording that cannot be replayed is not data.
  const replay = replayTrajectory(trajectory, {
    defs: allDefs,
    registry,
    donCardDefinition: GENERIC_DON_CARD_DEFINITION,
    normalizeDefinition: normalizeEngineCardDefinition,
  });

  if (!replay.ok) {
    rejected += 1;
    console.log(`  [${i}] REJECTED ${replay.failure?.reason} @${replay.failure?.atActionIndex}: ${replay.failure?.detail}`);
    continue;
  }

  totalSteps += replay.steps.length;
  trainable += trainableSteps(replay.steps).length;
  const name = `${trajectory.seats[0].leaderCardNumber}-vs-${trajectory.seats[1].leaderCardNumber}-${i}.json`;
  writeFileSync(resolve(outDir, name), JSON.stringify(trajectory));
  written += 1;
  console.log(
    `  [${i}] ${trajectory.actions.length} actions, ${replay.steps.length} steps, winner=${trajectory.outcome?.winnerSeatId ?? 'none'}${stuck ? ' (stuck)' : ''} -> ${name}`,
  );
}

console.log(`\nwritten=${written} rejected=${rejected}`);
console.log(`decision steps: ${totalSteps} total, ${trainable} with a real choice (${((trainable / Math.max(1, totalSteps)) * 100).toFixed(0)}%)`);
console.log(`out: ${resolve(outDir)}`);
