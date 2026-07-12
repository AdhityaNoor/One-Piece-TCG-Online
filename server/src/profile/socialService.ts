/**
 * Friends/blocked-list state, deliberately kept in its OWN collection
 * (SocialGraphDocument) rather than on ProfileDocument (project rule:
 * "Keep social state separate from the main user profile model") so a
 * friend-request write can never race a profile-edit write.
 *
 * Not a full mutual-transaction system — Mongo here runs without a
 * multi-document ACID transaction wrapper (single-instance dev/staging
 * topology), so a friend-accept is two sequential updateOne calls. See
 * known-limitations in the final deliverables summary: a crash between the
 * two writes could leave the graph asymmetric. Acceptable for this scope;
 * flagged rather than silently ignored.
 */
import { socialGraphs } from '../db/mongo';
import type { SocialGraphDocument } from '../models/profile';
import type { SocialRelationship } from '../../../shared/profile';
import { ProfileServiceError } from './errors';

async function getOrCreateGraph(userId: string): Promise<SocialGraphDocument> {
  const existing = await socialGraphs().findOne({ userId });
  if (existing) return existing;
  const doc: SocialGraphDocument = { userId, friends: [], outgoingRequests: [], incomingRequests: [], blocked: [], updatedAt: new Date().toISOString() };
  await socialGraphs().updateOne({ userId }, { $setOnInsert: doc }, { upsert: true });
  return (await socialGraphs().findOne({ userId }))!;
}

export class SocialService {
  async getGraph(userId: string): Promise<SocialGraphDocument> {
    return getOrCreateGraph(userId);
  }

  /** Relationship of `viewerId` looking AT `targetId` — used by privacyService's ViewerContext. */
  async relationshipOf(viewerId: string, targetId: string): Promise<SocialRelationship> {
    if (viewerId === targetId) return 'none';
    const [viewerGraph, targetGraph] = await Promise.all([getOrCreateGraph(viewerId), getOrCreateGraph(targetId)]);
    if (viewerGraph.blocked.includes(targetId)) return 'blocked_by_viewer';
    if (targetGraph.blocked.includes(viewerId)) return 'blocking_viewer';
    if (viewerGraph.friends.includes(targetId)) return 'friends';
    if (viewerGraph.outgoingRequests.includes(targetId)) return 'outgoing_request';
    if (viewerGraph.incomingRequests.includes(targetId)) return 'incoming_request';
    return 'none';
  }

  async sendFriendRequest(fromUserId: string, toUserId: string): Promise<void> {
    if (fromUserId === toUserId) throw new ProfileServiceError(400, 'VALIDATION', 'You cannot friend yourself.');
    const [fromGraph, toGraph] = await Promise.all([getOrCreateGraph(fromUserId), getOrCreateGraph(toUserId)]);
    if (fromGraph.blocked.includes(toUserId) || toGraph.blocked.includes(fromUserId)) {
      throw new ProfileServiceError(403, 'BLOCKED', 'Cannot send a friend request to a blocked player.');
    }
    if (fromGraph.friends.includes(toUserId)) return; // already friends, no-op
    const now = new Date().toISOString();
    await socialGraphs().updateOne({ userId: fromUserId }, { $addToSet: { outgoingRequests: toUserId }, $set: { updatedAt: now } });
    await socialGraphs().updateOne({ userId: toUserId }, { $addToSet: { incomingRequests: fromUserId }, $set: { updatedAt: now } });
  }

  async acceptFriendRequest(userId: string, fromUserId: string): Promise<void> {
    const graph = await getOrCreateGraph(userId);
    if (!graph.incomingRequests.includes(fromUserId)) {
      throw new ProfileServiceError(404, 'NOT_FOUND', 'No pending friend request from that player.');
    }
    const now = new Date().toISOString();
    await socialGraphs().updateOne(
      { userId },
      { $pull: { incomingRequests: fromUserId }, $addToSet: { friends: fromUserId }, $set: { updatedAt: now } },
    );
    await socialGraphs().updateOne(
      { userId: fromUserId },
      { $pull: { outgoingRequests: userId }, $addToSet: { friends: userId }, $set: { updatedAt: now } },
    );
  }

  async declineFriendRequest(userId: string, fromUserId: string): Promise<void> {
    const now = new Date().toISOString();
    await socialGraphs().updateOne({ userId }, { $pull: { incomingRequests: fromUserId }, $set: { updatedAt: now } });
    await socialGraphs().updateOne({ userId: fromUserId }, { $pull: { outgoingRequests: userId }, $set: { updatedAt: now } });
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const now = new Date().toISOString();
    await socialGraphs().updateOne({ userId }, { $pull: { friends: friendId }, $set: { updatedAt: now } });
    await socialGraphs().updateOne({ userId: friendId }, { $pull: { friends: userId }, $set: { updatedAt: now } });
  }

  async blockUser(userId: string, targetId: string): Promise<void> {
    if (userId === targetId) throw new ProfileServiceError(400, 'VALIDATION', 'You cannot block yourself.');
    const now = new Date().toISOString();
    await socialGraphs().updateOne(
      { userId },
      { $addToSet: { blocked: targetId }, $pull: { friends: targetId, outgoingRequests: targetId, incomingRequests: targetId }, $set: { updatedAt: now } },
      { upsert: true },
    );
    await socialGraphs().updateOne(
      { userId: targetId },
      { $pull: { friends: userId, outgoingRequests: userId, incomingRequests: userId }, $set: { updatedAt: now } },
      { upsert: true },
    );
  }

  async unblockUser(userId: string, targetId: string): Promise<void> {
    await socialGraphs().updateOne({ userId }, { $pull: { blocked: targetId }, $set: { updatedAt: new Date().toISOString() } });
  }
}
