/**
 * Admin CMS "Bugs & Reports Management": list/detail/triage over the
 * bugReports collection written by support/bugReportService.ts (the
 * player-facing "Report a Bug" modal — see MatchScreen's Paused modal).
 * Kept separate from that service on purpose: support/ is player-facing
 * intake only, this is admin-only triage over the same data.
 */
import { ObjectId } from 'mongodb';
import { bugReports, users } from '../db/mongo';
import { AdminServiceError } from './errors';
import type {
  AdminBugReportDetail,
  AdminBugReportListPage,
  AdminBugReportSummary,
  BugReportStatus,
  BugReportValidity,
  UpdateBugReportRequest,
} from '../../../shared/admin';
import type { BugReportDocument } from '../models/bugReport';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;
const VALID_STATUSES: readonly BugReportStatus[] = ['open', 'triaged', 'resolved', 'wont_fix'];
const VALID_VALIDITIES: readonly BugReportValidity[] = ['unreviewed', 'valid', 'invalid'];

function toSummary(doc: BugReportDocument, reporterUsername: string | null): AdminBugReportSummary {
  return {
    id: doc._id!.toHexString(),
    reporterUserId: doc.reporterUserId,
    reporterUsername,
    description: doc.description,
    matchMode: doc.matchMode,
    createdAt: doc.createdAt,
    clientVersion: doc.clientVersion,
    validity: doc.validity,
    status: doc.status,
    logEntryCount: doc.logEntryCount,
    selectedCardNumber: doc.selectedCard?.cardNumber ?? null,
    selectedCardName: doc.selectedCard?.cardName ?? null,
  };
}

export interface AdminBugReportFilters {
  status?: BugReportStatus;
  validity?: BugReportValidity;
}

export class BugReportAdminService {
  async list(cursor: string | null, limit: number, filters: AdminBugReportFilters = {}): Promise<AdminBugReportListPage> {
    const pageSize = Math.max(1, Math.min(PAGE_SIZE_MAX, limit || PAGE_SIZE_DEFAULT));
    const filter: Record<string, unknown> = {};
    if (cursor) {
      try {
        filter._id = { $lt: new ObjectId(cursor) };
      } catch {
        // ignore malformed cursor
      }
    }
    if (filters.status) filter.status = filters.status;
    if (filters.validity) filter.validity = filters.validity;

    const docs = await bugReports().find(filter).sort({ _id: -1 }).limit(pageSize).toArray();
    const reporterIds = [...new Set(docs.map((d) => d.reporterUserId))]
      .map((id) => {
        try {
          return new ObjectId(id);
        } catch {
          return null;
        }
      })
      .filter((id): id is ObjectId => id !== null);
    const userDocs = reporterIds.length ? await users().find({ _id: { $in: reporterIds } }).project({ username: 1 }).toArray() : [];
    const usernameById = new Map(userDocs.map((u) => [u._id!.toHexString(), u.username]));

    const reports = docs.map((doc) => toSummary(doc, usernameById.get(doc.reporterUserId) ?? null));
    return { reports, nextCursor: docs.length === pageSize ? docs[docs.length - 1]._id!.toHexString() : null };
  }

  async getById(id: string): Promise<AdminBugReportDetail> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new AdminServiceError(404, 'NOT_FOUND', 'Bug report not found.');
    }
    const doc = await bugReports().findOne({ _id: objectId });
    if (!doc) throw new AdminServiceError(404, 'NOT_FOUND', 'Bug report not found.');

    let reporterUsername: string | null = null;
    try {
      const reporter = await users().findOne({ _id: new ObjectId(doc.reporterUserId) }, { projection: { username: 1 } });
      reporterUsername = reporter?.username ?? null;
    } catch {
      reporterUsername = null;
    }

    return {
      ...toSummary(doc, reporterUsername),
      matchId: doc.matchId,
      turnNumber: doc.turnNumber,
      phase: doc.phase,
      selectedCard: doc.selectedCard,
      log: doc.log,
    };
  }

  async update(id: string, body: UpdateBugReportRequest): Promise<AdminBugReportSummary> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new AdminServiceError(404, 'NOT_FOUND', 'Bug report not found.');
    }
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      throw new AdminServiceError(400, 'VALIDATION', 'Invalid status.');
    }
    if (body.validity !== undefined && !VALID_VALIDITIES.includes(body.validity)) {
      throw new AdminServiceError(400, 'VALIDATION', 'Invalid validity.');
    }

    const update: Partial<BugReportDocument> = {};
    if (body.status !== undefined) update.status = body.status;
    if (body.validity !== undefined) update.validity = body.validity;

    const result = await bugReports().findOneAndUpdate({ _id: objectId }, { $set: update }, { returnDocument: 'after' });
    if (!result) throw new AdminServiceError(404, 'NOT_FOUND', 'Bug report not found.');

    let reporterUsername: string | null = null;
    try {
      const reporter = await users().findOne({ _id: new ObjectId(result.reporterUserId) }, { projection: { username: 1 } });
      reporterUsername = reporter?.username ?? null;
    } catch {
      reporterUsername = null;
    }
    return toSummary(result, reporterUsername);
  }
}
