/**
 * Persisted "Report a Bug" submission from a match screen. Written once per
 * report by BugReportService; never mutated by game logic (project rule
 * boundary from db/mongo.ts's doc comment: Mongo holds PERSISTENT data only —
 * a bug report is exactly that, a point-in-time diagnostic snapshot, not
 * live GameState).
 */
import type { ObjectId } from 'mongodb';
import type { GameLogEntry } from '../../../src/engine/logs/logEntry';
import type { BugReportCardSnapshot, MatchModeTag } from '../../../shared/support';
import type { BugReportValidity } from '../../../shared/admin';

export type BugReportStatus = 'open' | 'triaged' | 'resolved' | 'wont_fix';

export interface BugReportDocument {
  _id?: ObjectId;
  reporterUserId: string;
  description: string;
  matchMode: MatchModeTag;
  matchId: string | null;
  turnNumber: number;
  phase: string;
  selectedCard: BugReportCardSnapshot | null;
  /** Full battle log at report time — see shared/support.ts doc comment on why this is the real GameLogEntry[] shape, not unknown[]. */
  log: GameLogEntry[];
  /** Cached log.length for cheap admin-list rendering without shipping the whole log. */
  logEntryCount: number;
  clientVersion: string | null;
  createdAt: string;
  status: BugReportStatus;
  /** Admin CMS triage field: has anyone judged whether this report is a real bug? Set via PATCH /admin/bug-reports/:id. */
  validity: BugReportValidity;
}
