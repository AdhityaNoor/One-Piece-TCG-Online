/**
 * Ingest for client-recorded VS CPU matches (see shared/replay.ts).
 *
 * WHY THIS ENDPOINT DOES NOT VERIFY THE STREAM
 * Verifying a trajectory means replaying it, and replaying it needs the full
 * card catalog — which this service deliberately does not have: `public/` is
 * excluded from the backend image (.dockerignore) because the frontend assets
 * are gigabytes and the server never needed them. Shipping the catalog here
 * just to gate an upload would be the tail wagging the dog.
 *
 * So the boundary is drawn one step later instead. Everything stored here is
 * UNVERIFIED by construction and marked as such, and the offline training
 * pipeline replays every trajectory before using it — a stream that does not
 * reconstruct never becomes training data, whoever sent it. That is the check
 * that actually matters, because the threat here is poisoned training data
 * rather than anything a player could gain in the moment.
 *
 * What IS enforced at the door: authentication, a size cap, structural shape,
 * and a per-account daily rate limit, so this cannot be used as free storage.
 */
import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../auth/middleware';
import { matchTrajectories } from '../db/mongo';
import type { MatchTrajectory } from '../../../shared/replay';
import { MATCH_TRAJECTORY_SCHEMA_VERSION } from '../../../shared/replay';

/** Matches the client-side cap in multiplayer/net/trajectoryClient.ts. */
const MAX_BODY_BYTES = 512 * 1024;
/** Per-account ceiling. A human cannot finish this many matches in a day. */
const MAX_UPLOADS_PER_DAY = 200;

function userId(req: Request): string {
  return (req as Request & { auth: { sub: string } }).auth.sub;
}

function looksLikeTrajectory(value: unknown): value is MatchTrajectory {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as Partial<MatchTrajectory>;
  return (
    t.schemaVersion === MATCH_TRAJECTORY_SCHEMA_VERSION &&
    typeof t.rngSeed === 'string' &&
    typeof t.decidingPlayerId === 'string' &&
    typeof t.engineBuild === 'string' &&
    typeof t.cardDataHash === 'string' &&
    Array.isArray(t.seats) &&
    t.seats.length === 2 &&
    t.seats.every((seat) => typeof seat?.leaderCardNumber === 'string' && Array.isArray(seat?.deckCardNumbers)) &&
    Array.isArray(t.actions) &&
    Array.isArray(t.checkpoints)
  );
}

export function trajectoriesRouter(): Router {
  const router = Router();

  router.post('/', requireAuth, async (req: Request, res: Response) => {
    const trajectory = (req.body as { trajectory?: unknown } | undefined)?.trajectory;

    if (!looksLikeTrajectory(trajectory)) {
      res.status(400).json({ error: 'Malformed trajectory.', code: 'BAD_REQUEST' });
      return;
    }
    if (trajectory.source !== 'vs-cpu') {
      // Online recordings are written by the server itself and self-play never
      // travels over the wire, so anything else claiming another source is
      // mislabelled at best.
      res.status(400).json({ error: 'Only VS CPU recordings may be uploaded.', code: 'BAD_REQUEST' });
      return;
    }
    if (JSON.stringify(trajectory).length > MAX_BODY_BYTES) {
      res.status(413).json({ error: 'Trajectory too large.', code: 'PAYLOAD_TOO_LARGE' });
      return;
    }

    const uid = userId(req);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await matchTrajectories().countDocuments({ userIds: uid, createdAt: { $gte: since } });
    if (recent >= MAX_UPLOADS_PER_DAY) {
      res.status(429).json({ error: 'Upload limit reached.', code: 'RATE_LIMITED' });
      return;
    }

    await matchTrajectories().insertOne({
      userIds: [uid],
      source: 'vs-cpu',
      engineBuild: trajectory.engineBuild,
      cardDataHash: trajectory.cardDataHash,
      leaderCardNumbers: trajectory.seats.map((seat) => seat.leaderCardNumber),
      actionCount: trajectory.actions.length,
      // CLAIMED by the client, not established. The export step replaces these
      // with what the replay actually produced, or drops the record.
      winnerSeatId: trajectory.outcome?.winnerSeatId ?? null,
      reason: trajectory.outcome?.reason ?? 'unknown',
      verified: false,
      trajectory,
      createdAt: new Date(),
    });

    res.status(201).json({ ok: true });
  });

  return router;
}
