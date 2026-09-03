/**
 * Pull recorded match trajectories out of Mongo into a directory that
 * exportTraining.ts can read.
 *
 *   MONGODB_URI="mongodb+srv://..." npx tsx scripts/ai-sim/dumpTrajectories.ts \
 *     --out=training-data/online --source=online --limit=5000
 *
 * WHY THIS IS A SCRIPT AND NOT AN ENDPOINT
 * This is a bulk read of recorded player matches. Behind an HTTP route it would
 * be a permanently exposed way to enumerate other people's games, secured only
 * by whatever the admin middleware happens to be that week. As a script it runs
 * where the operator already has the database credentials, leaves an obvious
 * local artifact, and adds no attack surface to the running service.
 *
 * WHAT IT DOES NOT WRITE
 * `userIds` are dropped. Training needs the decisions, not who made them, and a
 * corpus of files on a laptop keyed by account id is a liability with no
 * corresponding benefit. `roomCode` is dropped for the same reason. What lands
 * on disk is the MatchTrajectory itself — seeds, decks, actions.
 *
 * READ-ONLY. It never writes to, updates, or deletes anything in the database.
 *
 * The driver is imported at RUNTIME from server/node_modules rather than at the
 * top of the file. `mongodb` is a backend dependency and is deliberately not in
 * the root package.json — importing it statically would make the whole scripts
 * typecheck depend on the server's install being present, which it is not on a
 * frontend-only checkout.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { MatchTrajectory } from '../../shared/replay';

/** Minimal surface of the driver this script uses. */
interface MongoLike {
  connect(): Promise<unknown>;
  close(): Promise<unknown>;
  db(name: string): {
    collection(name: string): {
      countDocuments(query: Record<string, unknown>): Promise<number>;
      find(query: Record<string, unknown>): {
        sort(spec: Record<string, number>): { limit(n: number): AsyncIterable<TrajectoryDocument> };
      };
    };
  };
}

function loadMongoClient(): new (uri: string) => MongoLike {
  const require = createRequire(import.meta.url);
  for (const specifier of ['mongodb', resolve('server/node_modules/mongodb')]) {
    try {
      return (require(specifier) as { MongoClient: new (uri: string) => MongoLike }).MongoClient;
    } catch {
      // try the next location
    }
  }
  throw new Error(
    'Could not load the mongodb driver. Run this from the repo root with the server installed ' +
      '(cd server && npm install), or install mongodb at the root.',
  );
}

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const uri = process.env.MONGODB_URI ?? arg('uri');
const dbName = process.env.MONGODB_DB ?? arg('db') ?? 'optcg';
const outDir = arg('out') ?? 'training-data/online';
const sourceFilter = arg('source');
const limit = Number(arg('limit') ?? 10000);
const since = arg('since');

if (!uri) {
  console.error('Set MONGODB_URI (or pass --uri=...). This script reads your database directly.');
  process.exit(1);
}

interface TrajectoryDocument {
  _id: unknown;
  source?: string;
  winnerSeatId?: string | null;
  reason?: string;
  createdAt?: Date;
  trajectory?: MatchTrajectory;
}

async function main(): Promise<void> {
  const MongoClient = loadMongoClient();
  const client = new MongoClient(uri!);
  await client.connect();
  try {
    const collection = client.db(dbName).collection('matchTrajectories');

    const query: Record<string, unknown> = {};
    if (sourceFilter) query.source = sourceFilter;
    if (since) query.createdAt = { $gte: new Date(since) };

    const total = await collection.countDocuments(query);
    console.log(`matching documents: ${total}${total > limit ? ` (taking the newest ${limit})` : ''}`);

    mkdirSync(resolve(outDir), { recursive: true });

    let written = 0;
    let skipped = 0;
    const cursor = collection.find(query).sort({ createdAt: -1 }).limit(limit);
    for await (const doc of cursor) {
      const trajectory = doc.trajectory;
      // A document without a replayable stream is not data. Dropping it here
      // keeps the export's rejection counts about the RULES having changed,
      // rather than about malformed rows.
      if (!trajectory || !Array.isArray(trajectory.actions) || trajectory.actions.length === 0) {
        skipped += 1;
        continue;
      }
      const name = `${doc.source ?? 'unknown'}-${String(doc._id)}.json`;
      writeFileSync(resolve(outDir, name), JSON.stringify(trajectory), 'utf8');
      written += 1;
    }

    console.log(`written: ${written} trajectories to ${resolve(outDir)}`);
    if (skipped > 0) console.log(`skipped: ${skipped} documents with no usable action stream`);
    console.log('');
    console.log('Next:');
    console.log(`  npx tsx scripts/ai-sim/exportTraining.ts --in=${outDir} --out=rows.jsonl --with-actions --winners-only`);
    console.log('  npx tsx scripts/ai-sim/fitPolicy.ts --in=rows.jsonl --out=/tmp/policyWeights.json');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
