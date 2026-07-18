/**
 * Shared ban-enforcement check, used by BOTH requireAuth (REST) and
 * GameRoom.onAuth (WebSocket) so a suspended account is locked out
 * everywhere from a single choke point rather than two copies of the same
 * logic drifting apart. Reads ProfileDocument.moderationStatus — the same
 * field admin's player-ban action writes via moderationService
 * .setModerationStatus (server/src/profile/moderationService.ts).
 *
 * A missing profile document (moderationStatus lazily created on first
 * profile touch — see profileService.getOrCreateProfileDoc) is NOT treated
 * as suspended; it just means this user has never triggered profile
 * creation, which is not evidence of a ban.
 */
import { profiles } from '../db/mongo';

export async function isSuspended(userId: string): Promise<boolean> {
  const doc = await profiles().findOne({ userId }, { projection: { moderationStatus: 1 } });
  return doc?.moderationStatus === 'suspended';
}
