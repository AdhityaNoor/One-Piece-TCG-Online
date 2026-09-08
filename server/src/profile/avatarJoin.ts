/**
 * One place that answers "what avatar do I draw for this OTHER player" for
 * every list surface — friends, friend requests and player search.
 *
 * It exists because that answer has three parts (a catalog id, an uploaded
 * URL that overrides it, and an equipped frame) resolved from the same
 * projection, and each list previously rebuilt the join by hand. Two of
 * them already disagreed once: search only ever selected
 * equippedCosmetics.avatar, so a player who uploaded a photo still appeared
 * with their old default portrait in search results while looking correct
 * everywhere else.
 *
 * Only the three display fields are projected. A list row must never carry
 * a whole ProfileDocument — that is how privacy-filtered fields leak into a
 * response nobody thought to filter.
 */
import { profiles } from '../db/mongo';

export interface AvatarDisplayFields {
  avatarCatalogId: string | null;
  avatarImageUrl: string | null;
  avatarFrameId: string | null;
}

export const EMPTY_AVATAR_DISPLAY: AvatarDisplayFields = {
  avatarCatalogId: null,
  avatarImageUrl: null,
  avatarFrameId: null,
};

/** Resolves display fields for a batch of userIds in one query. Returns a lookup, not an array, so callers can't mis-zip it against their own ordering. */
export async function loadAvatarDisplayFields(userIds: string[]): Promise<(userId: string) => AvatarDisplayFields> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return () => EMPTY_AVATAR_DISPLAY;

  const docs = await profiles()
    .find({ userId: { $in: unique } })
    .project({ userId: 1, 'equippedCosmetics.avatar': 1, 'equippedCosmetics.frame': 1, 'customImages.avatar': 1 })
    .toArray();

  const byUserId = new Map<string, AvatarDisplayFields>();
  for (const doc of docs as unknown as {
    userId: string;
    equippedCosmetics?: { avatar?: string | null; frame?: string | null };
    customImages?: { avatar?: { url?: string | null } | null };
  }[]) {
    byUserId.set(doc.userId, {
      avatarCatalogId: doc.equippedCosmetics?.avatar ?? null,
      avatarImageUrl: doc.customImages?.avatar?.url ?? null,
      avatarFrameId: doc.equippedCosmetics?.frame ?? null,
    });
  }

  return (userId: string) => byUserId.get(userId) ?? EMPTY_AVATAR_DISPLAY;
}
