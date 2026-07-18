/**
 * Runtime-toggleable feature flag (Admin CMS "Game Management" section).
 * Distinct from the env-var flags in config/env.ts (rankedEnabled,
 * profileEnabled) — those are boot-time, redeploy-to-change flags for
 * whole subsystems. These are Mongo-backed, admin-editable at any time.
 *
 * KNOWN LIMITATION: nothing in the gameplay/client code reads this
 * collection yet — this ships the CRUD/storage/admin-UI plumbing an admin
 * would need, but wiring an individual flag into actual gameplay behavior
 * (e.g. "hide the ranked queue button") is a separate, per-flag follow-up.
 */
import type { ObjectId } from 'mongodb';

export interface FeatureFlagDocument {
  _id?: ObjectId;
  /** Stable machine key, e.g. "ranked_queue_enabled" — never shown to players, only to admins. */
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: string;
  /** Admin _id (string) who last changed this flag. */
  updatedBy: string;
}
