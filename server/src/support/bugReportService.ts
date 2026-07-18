/**
 * Validation + persistence for "Report a Bug" submissions. Deliberately
 * dumb: no triage automation, no email/notification fan-out — this ships the
 * intake plumbing a real support/QA workflow would read from later (project
 * precedent: moderationService.ts ships report intake the same way, with an
 * explicit doc-comment note that automated action on top of it is out of
 * scope here).
 */
import { bugReports } from '../db/mongo';
import { SupportServiceError } from './errors';
import type { SubmitBugReportRequest, SubmitBugReportResponse, MatchModeTag } from '../../../shared/support';

const MAX_DESCRIPTION_LENGTH = 2000;
// A finished match's full log runs to a few hundred entries in practice;
// this cap exists only to reject an obviously corrupted/adversarial payload
// before it hits Mongo, not to trim legitimate long matches.
const MAX_LOG_ENTRIES = 5000;

const VALID_MATCH_MODES: readonly MatchModeTag[] = ['local-hotseat', 'vs-cpu', 'casual-mock', 'online'];

export class BugReportService {
  async submit(reporterUserId: string, body: SubmitBugReportRequest): Promise<SubmitBugReportResponse> {
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      throw new SupportServiceError(400, 'VALIDATION', 'Please describe the issue before submitting.');
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new SupportServiceError(400, 'VALIDATION', `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
    }
    if (!VALID_MATCH_MODES.includes(body.matchMode)) {
      throw new SupportServiceError(400, 'VALIDATION', 'Invalid matchMode.');
    }
    if (!Array.isArray(body.log)) {
      throw new SupportServiceError(400, 'VALIDATION', 'Battle log payload is missing or malformed.');
    }
    if (body.log.length > MAX_LOG_ENTRIES) {
      throw new SupportServiceError(400, 'VALIDATION', 'Battle log is unexpectedly large — this looks like a corrupted report.');
    }
    if (typeof body.turnNumber !== 'number' || !Number.isFinite(body.turnNumber) || body.turnNumber < 0) {
      throw new SupportServiceError(400, 'VALIDATION', 'Invalid turn number.');
    }
    if (typeof body.phase !== 'string' || !body.phase) {
      throw new SupportServiceError(400, 'VALIDATION', 'Invalid phase.');
    }

    const result = await bugReports().insertOne({
      reporterUserId,
      description,
      matchMode: body.matchMode,
      matchId: body.matchId ?? null,
      turnNumber: body.turnNumber,
      phase: body.phase,
      selectedCard: body.selectedCard ?? null,
      log: body.log,
      logEntryCount: body.log.length,
      clientVersion: body.clientVersion ?? null,
      createdAt: new Date().toISOString(),
      status: 'open',
    });

    return { id: result.insertedId.toHexString() };
  }
}
