/**
 * Admin CMS "Player Data" section: list/detail/decks/match-history + ban.
 *
 * KNOWN LIMITATION on decks (see docs on this from the scoping pass): decks
 * are local-storage-only on the client in general (src/cards/decks/deckStorage.ts).
 * The server only ever sees deck contents in two cases — (a) a lightweight,
 * player-chosen FeaturedDeckSummary on their public profile (ProfileDocument
 * .featuredDecks), and (b) a full SavedDeck snapshot captured at ranked-queue
 * time (RankedMatchParticipantDocument.deckSnapshot). Casual / local-hotseat
 * / VS-CPU decks never reach the server at all, persistently or otherwise —
 * "Player Decks" here can only ever show what those two sources expose.
 */
import { ObjectId } from 'mongodb';
import { users, profiles, rankedMatches } from '../db/mongo';
import { ProfileService } from '../profile/profileService';
import { ModerationService } from '../profile/moderationService';
import { AdminServiceError } from './errors';
import type { AdminPlayerDeckSummary, AdminPlayerDetail, AdminPlayerListPage, AdminPlayerSummary } from '../../../shared/admin';

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

const profileService = new ProfileService();
const moderationService = new ModerationService();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class PlayerAdminService {
  /**
   * Unlike profileService.searchPlayers (player-facing, 2-char minimum,
   * capped at 20 to resist enumeration), this lists ALL players — that
   * restriction exists specifically to stop ONE PLAYER from crawling
   * others; an admin needs the opposite: a real, complete roster.
   */
  async listPlayers(cursor: string | null, limit: number, query?: string): Promise<AdminPlayerListPage> {
    const pageSize = Math.max(1, Math.min(PAGE_SIZE_MAX, limit || PAGE_SIZE_DEFAULT));
    const filter: Record<string, unknown> = {};
    if (cursor) {
      try {
        filter._id = { $lt: new ObjectId(cursor) };
      } catch {
        // ignore a malformed cursor rather than 500ing the whole list
      }
    }
    if (query?.trim()) {
      filter.username = { $regex: escapeRegExp(query.trim()), $options: 'i' };
    }

    const docs = await users().find(filter).sort({ _id: -1 }).limit(pageSize).toArray();
    const userIds = docs.map((d) => d._id!.toHexString());
    const profileDocs = userIds.length ? await profiles().find({ userId: { $in: userIds } }).toArray() : [];
    const profileByUserId = new Map(profileDocs.map((p) => [p.userId, p]));

    const players: AdminPlayerSummary[] = docs.map((doc) => {
      const userId = doc._id!.toHexString();
      const profile = profileByUserId.get(userId);
      return {
        userId,
        username: doc.username,
        email: doc.email,
        createdAt: doc.createdAt.toISOString(),
        moderationStatus: profile?.moderationStatus ?? 'active',
        lastActiveAt: profile?.lastActiveAt ?? null,
      };
    });

    return { players, nextCursor: docs.length === pageSize ? docs[docs.length - 1]._id!.toHexString() : null };
  }

  async getPlayerDetail(userId: string): Promise<AdminPlayerDetail> {
    let user;
    try {
      user = await users().findOne({ _id: new ObjectId(userId) });
    } catch {
      user = null;
    }
    if (!user) throw new AdminServiceError(404, 'NOT_FOUND', 'Player not found.');

    const profile = await profileService.getOrCreateProfileDoc(userId, user.username);
    return {
      userId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      moderationStatus: profile.moderationStatus,
      lastActiveAt: profile.lastActiveAt,
      displayName: profile.displayName,
      region: profile.region,
      favoriteLeaderCardNumber: profile.favoriteLeaderCardNumber,
    };
  }

  async getPlayerDecks(userId: string): Promise<AdminPlayerDeckSummary[]> {
    const profile = await profiles().findOne({ userId });
    const featured: AdminPlayerDeckSummary[] =
      profile?.featuredDecks.map((deck) => ({
        deckId: deck.deckId,
        name: deck.name,
        leaderName: deck.leaderName || null,
        colors: deck.colors,
        source: 'featured' as const,
        capturedAt: profile.updatedAt,
      })) ?? [];

    const rankedDocs = await rankedMatches()
      .find({ 'participants.playerId': userId })
      .sort({ finalizedAt: -1 })
      .limit(50)
      .toArray();

    const seenDeckIds = new Set(featured.map((d) => d.deckId));
    const rankedSnapshots: AdminPlayerDeckSummary[] = [];
    for (const match of rankedDocs) {
      const participant = match.participants.find((p) => p.playerId === userId);
      if (!participant?.deckSnapshot) continue;
      const deckId = participant.deckSnapshot.deckId;
      if (seenDeckIds.has(deckId)) continue;
      seenDeckIds.add(deckId);
      rankedSnapshots.push({
        deckId,
        name: participant.deckSnapshot.name,
        leaderName: participant.leaderName || null,
        // Not derivable from SavedDeck without a full card-definition lookup
        // — left empty for ranked-snapshot decks (see module doc comment).
        colors: [],
        source: 'ranked-match-snapshot',
        capturedAt: match.finalizedAt ?? participant.deckSnapshot.updatedAt,
      });
    }

    return [...featured, ...rankedSnapshots];
  }

  async ban(actorAdminId: string, userId: string, reason: string): Promise<void> {
    const user = await this.requireUser(userId);
    // setModerationStatus does a plain $set with no upsert — if this player
    // has never touched their profile (no ProfileDocument yet), the update
    // would silently match zero documents and the ban would NOT take
    // effect. Ensure the doc exists first.
    await profileService.getOrCreateProfileDoc(userId, user.username);
    await moderationService.setModerationStatus(userId, actorAdminId, 'suspended', reason || 'Banned by admin.');
  }

  async unban(actorAdminId: string, userId: string): Promise<void> {
    const user = await this.requireUser(userId);
    await profileService.getOrCreateProfileDoc(userId, user.username);
    await moderationService.setModerationStatus(userId, actorAdminId, 'active', 'Unbanned by admin.');
  }

  private async requireUser(userId: string) {
    let user;
    try {
      user = await users().findOne({ _id: new ObjectId(userId) });
    } catch {
      user = null;
    }
    if (!user) throw new AdminServiceError(404, 'NOT_FOUND', 'Player not found.');
    return user;
  }
}
