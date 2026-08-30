/**
 * Turn recorded trajectories into training rows.
 *
 * THIS IS THE TRUST BOUNDARY. Recordings reach the database unverified —
 * client uploads by definition, server recordings because the rules may have
 * changed since. Every trajectory is replayed here against the current engine
 * and card catalog, and anything that does not reconstruct exactly is DROPPED
 * with a reason. Nothing downstream ever sees a stream that could not be
 * reproduced.
 *
 * Reads .json trajectories from a directory (as written by record.ts, or
 * exported from Mongo) and emits JSONL, one decision per line:
 *
 *   npx tsx scripts/ai-sim/exportTraining.ts --in=training-data --out=rows.jsonl
 *
 * Each row is (what the acting seat could SEE, what they did, whether they went
 * on to win). The visible state is redacted per seat — see replayTrajectory.
 */
import { createWriteStream, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadCatalog } from './harness';
import { replayTrajectory, trainableSteps } from '../../src/engine/replay';
import { generateLegalActions } from '../../src/ai/utilities/legalActions';
import { buildCuratedEffectRegistry } from '../../src/cards/effectTemplates';
import { GENERIC_DON_CARD_DEFINITION } from '../../src/cards/decks/genericDonCard';
import { normalizeEngineCardDefinition } from '../../src/cards/normalization/engineDefinition';
import type { MatchTrajectory } from '../../shared/replay';
import type { CardDefinitionLookup } from '../../src/engine/rules/shared';

const inDir = process.argv.find((a) => a.startsWith('--in='))?.split('=')[1] ?? 'training-data';
const outFile = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] ?? 'training-rows.jsonl';
/** Keep the redacted state? Off by default — it is by far the bulk of the size. */
const withState = process.argv.includes('--with-state');

const catalog = loadCatalog();
const defs: CardDefinitionLookup = {};
for (const def of catalog) defs[def.cardDefinitionId] = def;
const registry = buildCuratedEffectRegistry(defs);

let actionIdSeq = 0;
const createActionId = () => `export-${++actionIdSeq}`;

mkdirSync(dirname(resolve(outFile)) || '.', { recursive: true });
const out = createWriteStream(resolve(outFile), { encoding: 'utf8' });

const rejected: Record<string, number> = {};
let accepted = 0;
let rows = 0;

const files = readdirSync(resolve(inDir)).filter((n) => n.endsWith('.json'));
for (const file of files) {
  let trajectory: MatchTrajectory;
  try {
    trajectory = JSON.parse(readFileSync(resolve(inDir, file), 'utf8')) as MatchTrajectory;
  } catch {
    rejected['unparseable'] = (rejected['unparseable'] ?? 0) + 1;
    continue;
  }

  const replay = replayTrajectory(trajectory, {
    defs,
    registry,
    donCardDefinition: GENERIC_DON_CARD_DEFINITION,
    // The same repair the live game applied on the way in — without it we
    // would be replaying with different cards than were actually played.
    normalizeDefinition: normalizeEngineCardDefinition,
    // Fills in the count for server recordings, which skip it on the hot path.
    countLegalActions: (state, playerId) =>
      generateLegalActions({ state, playerId, defs, registry, createActionId }).length,
  });

  if (!replay.ok) {
    const reason = replay.failure?.reason ?? 'unknown';
    rejected[reason] = (rejected[reason] ?? 0) + 1;
    continue;
  }

  accepted += 1;
  for (const step of trainableSteps(replay.steps)) {
    out.write(
      JSON.stringify({
        source: trajectory.source,
        matchId: file.replace(/\.json$/, ''),
        index: step.index,
        seat: step.actingSeatId,
        turn: step.turnNumber,
        phase: step.phase,
        actionType: step.action.type,
        action: step.action,
        legalActionCount: step.legalActionCount,
        decisionMs: step.decisionMs,
        /** 1 = the acting seat won this match, 0 = lost. The label. */
        won: step.outcomeForActor,
        ...(withState ? { visibleState: JSON.parse(step.visibleStateJson) } : {}),
      }) + '\n',
    );
    rows += 1;
  }
}

out.end();
console.log(`trajectories: ${files.length} read, ${accepted} replayed cleanly`);
if (Object.keys(rejected).length > 0) console.log('dropped:', rejected);
console.log(`rows: ${rows} written to ${resolve(outFile)}${withState ? ' (with redacted states)' : ''}`);
