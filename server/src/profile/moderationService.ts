/**
 * Moderation-compatible audit trail + report intake. Deliberately minimal:
 * this ships the plumbing (audit log writes, report storage, moderation
 * status field) a real moderation team would need, WITHOUT an automated
 * suspension engine — project rule: "Do not automatically suspend users
 * using weak automated heuristics alone." Suspending a profile is exposed
 * here only as an explicit admin-invoked method; nothing in this codebase
 * calls it automatically.
 */
import { moderationAuditEvents, playerReports, profiles } from '../db/mongo';
import type { ModerationAuditAction } from '../models/profile';
import type { ReportPlayerRequest } from '../../../shared/profile';
import { ProfileServiceError } from './errors';

export class ModerationService {
  async recordAudit(targetUserId: string, actorUserId: string, action: ModerationAuditAction, metadata: Record<string, unknown> = {}): Promise<void> {
    await moderationAuditEvents().insertOne({
      targetUserId,
      actorUserId,
      action,
      at: new Date().toISOString(),
      // Never store raw free-text (bio/status message) content — lengths and
      // field names only, so audit logs stay useful without becoming a
      // second copy of private user text (observability rule).
      metadata,
    });
  }

  async submitReport(reporterUserId: string, targetUserId: string, body: ReportPlayerRequest): Promise<void> {
    if (reporterUserId === targetUserId) throw new ProfileServiceError(400, 'VALIDATION', 'You cannot report yourself.');
    if (!body.details || body.details.length > 1000) {
      throw new ProfileServiceError(400, 'VALIDATION', 'Report details must be 1-1000 characters.');
    }
    await playerReports().insertOne({
      reporterUserId,
      targetUserId,
      reason: body.reason,
      details: body.details,
      createdAt: new Date().toISOString(),
      status: 'open',
    });
    await this.recordAudit(targetUserId, reporterUserId, 'report_submitted', { reason: body.reason });
  }

  /** Admin/dev-tool only — nothing in the player-facing routes calls this. */
  async setModerationStatus(targetUserId: string, actorUserId: string, status: 'active' | 'warned' | 'suspended', reason: string): Promise<void> {
    await profiles().updateOne({ userId: targetUserId }, { $set: { moderationStatus: status, updatedAt: new Date().toISOString() } });
    await this.recordAudit(targetUserId, actorUserId, status === 'suspended' ? 'suspension_applied' : 'profile_hidden', { status, reason });
  }
}
