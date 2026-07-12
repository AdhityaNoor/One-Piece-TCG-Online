/**
 * Cosmetic inventory + equip. Ownership is authoritative server-side
 * (CosmeticInventoryDocument) — equip() ALWAYS re-checks the catalog +
 * inventory before writing, never trusts a client-submitted item id
 * (project rule: "Validate cosmetic ownership on the server. Do not trust
 * client-submitted cosmetic IDs.").
 */
import { cosmeticInventories, profiles } from '../db/mongo';
import { COSMETIC_CATALOG, DEFAULT_OWNED_COSMETIC_IDS, findCosmeticDefinition } from './cosmeticCatalog';
import type { CosmeticInventoryDocument } from '../models/profile';
import type { CosmeticInventoryEntry, CosmeticType, EquippedCosmetics } from '../../../shared/profile';
import { ProfileServiceError } from './errors';

const SLOT_TO_FIELD: Record<CosmeticType, keyof EquippedCosmetics> = {
  avatar: 'avatar',
  banner: 'banner',
  frame: 'frame',
  title: 'title',
  badge: 'badge',
  card_back: 'cardBack',
  board_skin: 'boardSkin',
  match_intro_effect: 'matchIntroEffect',
  victory_effect: 'victoryEffect',
  emote_set: 'emoteSet',
};

export class CosmeticService {
  async getOrCreateInventory(userId: string): Promise<CosmeticInventoryDocument> {
    const existing = await cosmeticInventories().findOne({ userId });
    if (existing) return existing;
    const doc: CosmeticInventoryDocument = { userId, ownedItemIds: [...DEFAULT_OWNED_COSMETIC_IDS], updatedAt: new Date().toISOString() };
    await cosmeticInventories().updateOne({ userId }, { $setOnInsert: doc }, { upsert: true });
    return (await cosmeticInventories().findOne({ userId }))!;
  }

  /** Grants an item (e.g. from an achievement/season reward). Idempotent. */
  async grant(userId: string, itemId: string): Promise<void> {
    if (!findCosmeticDefinition(itemId)) return; // unknown id — silently ignore rather than corrupt inventory
    await this.getOrCreateInventory(userId);
    await cosmeticInventories().updateOne({ userId }, { $addToSet: { ownedItemIds: itemId }, $set: { updatedAt: new Date().toISOString() } });
  }

  async listInventory(userId: string, equipped: EquippedCosmetics): Promise<CosmeticInventoryEntry[]> {
    const inventory = await this.getOrCreateInventory(userId);
    const equippedIds = new Set(Object.values(equipped).filter((value): value is string => Boolean(value)));
    return COSMETIC_CATALOG.map((item) => ({
      item,
      owned: inventory.ownedItemIds.includes(item.id),
      equipped: equippedIds.has(item.id),
    }));
  }

  async equip(userId: string, itemId: string, slot: CosmeticType): Promise<EquippedCosmetics> {
    const definition = findCosmeticDefinition(itemId);
    if (!definition) throw new ProfileServiceError(404, 'NOT_FOUND', 'Unknown cosmetic item.');
    if (definition.type !== slot) throw new ProfileServiceError(400, 'VALIDATION', `Item ${itemId} is not a ${slot}.`);

    const inventory = await this.getOrCreateInventory(userId);
    if (!inventory.ownedItemIds.includes(itemId)) {
      throw new ProfileServiceError(403, 'VALIDATION', 'You do not own this cosmetic item.');
    }

    const field = SLOT_TO_FIELD[slot];
    const profile = await profiles().findOne({ userId });
    if (!profile) throw new ProfileServiceError(404, 'NOT_FOUND', 'Profile not found.');

    const nextEquipped: EquippedCosmetics = { ...profile.equippedCosmetics, [field]: itemId };
    await profiles().updateOne({ userId }, { $set: { equippedCosmetics: nextEquipped, updatedAt: new Date().toISOString() } });
    return nextEquipped;
  }

  async unequip(userId: string, slot: CosmeticType): Promise<EquippedCosmetics> {
    const field = SLOT_TO_FIELD[slot];
    const profile = await profiles().findOne({ userId });
    if (!profile) throw new ProfileServiceError(404, 'NOT_FOUND', 'Profile not found.');
    const nextEquipped: EquippedCosmetics = { ...profile.equippedCosmetics, [field]: null };
    await profiles().updateOne({ userId }, { $set: { equippedCosmetics: nextEquipped, updatedAt: new Date().toISOString() } });
    return nextEquipped;
  }
}
