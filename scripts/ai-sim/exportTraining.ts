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
 *   npx tsx scripts/ai-sim/exportTraining.ts --in=training-data --out=rows.jsonl
 *
 * FLAGS
 *   --with-state     keep the redacted state per row (large; off by default)
 *   --with-actions   emit the LEGAL SET and its feature vectors (for fitPolicy)
 *   --winners-only   keep only decisions made by the seat that went on to win
 *   --min-turns=N    drop matches shorter than N turns (default 3)
 *   --source=online  keep only matches from one recording source
 *
 * WHY --with-actions EXISTS
 * "They played this card" is not a preference until you know what else they
 * could have played. A row without the rejected alternatives can only support
 * outcome regression — the Stage 1 approach that predicted winners at 72.9%
 * and did not improve play. Learning to CHOOSE needs the choice set.
 *
 * WHY CONCEDED AND TIMED-OUT MATCHES ARE DROPPED
 * The label is "did this seat go on to win". A concession makes that label a
 * statement about the player's patience, not their play, and it is attached to
 * every decision they made beforehand — including good ones. Worse, keeping
 * them teaches an imitator that conceding is what winners' opponents do. Draws
 * and unfinished streams go for the same reason: a 0.5 label is not a choice
 * anyone made.
 */
import { createWriteStream, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadCatalog } from './harness';
import { replayTrajectory, trainableSteps } from '../../src/engine/replay';
import { generateLegalActions } from '../../src/ai/utilities/legalActions';
import {
  ACTION_FEATURE_KEYS,
  actionFeaturesToVector,
  createActionFeatureContext,
  extractActionFeatures,
} from '../../src/ai/evaluation/actionFeatures';
import { buildCuratedEffectRegistry } from '../../src/cards/effectTemplates';
import { GENERIC_DON_CARD_DEFINITION } from '../../src/cards/decks/genericDonCard';
import { normalizeEngineCardDefinition } from '../../src/cards/normalization/engineDefinition';
import type { MatchTrajectory } from '../../shared/replay';
import type { GameAction } from '../../src/engine/actions/action';
import type { CardDefinitionLookup } from '../../src/engine/rules/shared';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const inDir = arg('in') ?? 'training-data';
const outFile = arg('out') ?? 'training-rows.jsonl';
const sourceFilter = arg('source');
const minTurns = Number(arg('min-turns') ?? 3);
/** Keep the redacted state? Off by default — it is by far the bulk of the size. */
const withState = process.argv.includes('--with-state');
const withActions = process.argv.includes('--with-actions');
const winnersOnly = process.argv.includes('--winners-only');

const catalog = loadCatalog();
const defs: CardDefinitionLookup = {};
for (const def of catalog) defs[def.cardDefinitionId] = def;
const registry = buildCuratedEffectRegistry(defs);

let actionIdSeq = 0;
const createActionId = () => `export-${++actionIdSeq}`;

mkdirSync(dirname(resolve(outFile)) || '.', { recursive: true });
const out = createWriteStream(resolve(outFile), { encoding: 'utf8' });

/**
 * A decision's alternatives, as attached during replay.
 *
 * `chosenIndex` is -1 when the action actually taken could not be found in the
 * enumeration. That is a real and interesting condition — it means the AI's
 * legal-action generator cannot produce something a human legitimately did —
 * so it is counted and reported rather than silently dropped.
 */
interface DecisionAnnotation {
  chosenIndex: number;
  candidates: { type: string; features: number[] }[];
}

/**
 * Identity for matching the recorded action against a freshly enumerated one.
 * actionId is regenerated on every enumeration and must not be part of it.
 */
function actionKey(action: GameAction): string {
  const parts: string[] = [action.type];
  for (const [k, v] of Object.entries(action).sort(([a], [b]) => a.localeCompare(b))) {
    if (k === 'actionId' || k === 'type' || k === 'playerId') continue;
    parts.push(`${k}=${Array.isArray(v) ? [...v].sort().join(',') : String(v)}`);
  }
  return parts.join('|');
}

const rejected: Record<string, number> = {};
let accepted = 0;
let rows = 0;
let unmatchedChoices = 0;

const files = readdirSync(resolve(inDir)).filter((n) => n.endsWith('.json'));
for (const file of files) {
  let trajectory: MatchTrajectory;
  try {
    trajectory = JSON.parse(readFileSync(resolve(inDir, file), 'utf8')) as MatchTrajectory;
  } catch {
    rejected['unparseable'] = (rejected['unparseable'] ?? 0) + 1;
    continue;
  }

  if (sourceFilter && trajectory.source !== sourceFilter) {
    rejected['wrong-source'] = (rejected['wrong-source'] ?? 0) + 1;
    continue;
  }

  // Filter on the recorded outcome BEFORE paying for a replay.
  const outcome = trajectory.outcome;
  if (!outcome || outcome.winnerSeatId === null) {
    rejected['no-winner'] = (rejected['no-winner'] ?? 0) + 1;
    continue;
  }
  if (outcome.reason === 'concession' || outcome.reason === 'timeout') {
    rejected[`ended-by-${outcome.reason}`] = (rejected[`ended-by-${outcome.reason}`] ?? 0) + 1;
    continue;
  }
  if (outcome.turnNumber < minTurns) {
    rejected['too-short'] = (rejected['too-short'] ?? 0) + 1;
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
    annotateDecision: withActions
      ? (state, action, playerId): DecisionAnnotation => {
          const legal = generateLegalActions({ state, playerId, defs, registry, createActionId });
          const ctx = createActionFeatureContext(state, defs, registry, playerId);
          const key = actionKey(action);
          return {
            chosenIndex: legal.findIndex((candidate) => actionKey(candidate) === key),
            candidates: legal.map((candidate) => ({
              type: candidate.type,
              features: actionFeaturesToVector(extractActionFeatures(ctx, candidate)),
            })),
          };
        }
      : undefined,
  });

  if (!replay.ok) {
    const reason = replay.failure?.reason ?? 'unknown';
    rejected[reason] = (rejected[reason] ?? 0) + 1;
    continue;
  }

  accepted += 1;
  for (const step of trainableSteps(replay.steps)) {
    // The label is "the acting seat went on to win". Training only on the
    // winner's decisions keeps that label at 1 for every row — which is the
    // point: an imitator should not be shown losing play as an example.
    if (winnersOnly && step.outcomeForActor !== 1) continue;

    const annotation = step.annotation as DecisionAnnotation | undefined;
    if (withActions) {
      if (!annotation) continue;
      if (annotation.chosenIndex < 0) {
        unmatchedChoices += 1;
        continue;
      }
      // One candidate means no choice was made; nothing to learn from.
      if (annotation.candidates.length < 2) continue;
    }

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
        ...(withActions
          ? {
              featureKeys: ACTION_FEATURE_KEYS,
              chosenIndex: annotation!.chosenIndex,
              candidates: annotation!.candidates,
            }
          : {}),
        ...(withState ? { visibleState: JSON.parse(step.visibleStateJson) } : {}),
      }) + '\n',
    );
    rows += 1;
  }
}

out.end();
console.log(`trajectories: ${files.length} read, ${accepted} replayed cleanly`);
if (Object.keys(rejected).length > 0) console.log('dropped:', rejected);
if (unmatchedChoices > 0) {
  // Worth attention, not a crash: the generator could not reproduce something
  // a player actually did, so the CPU can never consider that line either.
  console.log(
    `NOTE: ${unmatchedChoices} recorded choices were not in the enumerated legal set — ` +
      'generateLegalActions cannot produce these, so the CPU cannot play them either.',
  );
}
console.log(
  `rows: ${rows} written to ${resolve(outFile)}` +
    `${withActions ? ' (with legal sets)' : ''}${withState ? ' (with redacted states)' : ''}` +
    `${winnersOnly ? ' [winners only]' : ''}`,
);
