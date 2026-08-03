/**
 * Read/upsert helpers for the cosmetic-accessory master data (sleeves + DON!!
 * arts). Mirrors the shape of admin/bannerService.ts but simpler — there is
 * no admin CRUD UI yet, so the only writer is the seed script
 * (server/src/accessories/seedAccessories.ts). Public reads go through
 * `listActiveForPlayers`.
 */
import { accessories } from '../db/mongo';
import type { AccessoryDocument } from '../models/accessory';
import type { PublicAccessory } from '../../../shared/accessories';

function toPublicView(doc: AccessoryDocument): PublicAccessory {
  return {
    optionId: doc.optionId,
    kind: doc.kind,
    name: doc.name,
    source: doc.source,
    imageUrl: doc.imageUrl,
    thumbnailUrl: doc.thumbnailUrl,
    ...(doc.packSize !== undefined ? { packSize: doc.packSize } : {}),
  };
}

export interface AccessoryUpsertInput {
  optionId: string;
  kind: AccessoryDocument['kind'];
  name: string;
  source: AccessoryDocument['source'];
  imageUrl: string;
  thumbnailUrl: string;
  packSize?: number;
  sortOrder: number;
  active?: boolean;
}

export class AccessoryService {
  /** Active options, sleeves then DON!! arts, each ordered by sortOrder. */
  async listActiveForPlayers(): Promise<PublicAccessory[]> {
    const docs = await accessories()
      .find({ active: true })
      .sort({ kind: 1, sortOrder: 1 })
      .toArray();
    return docs.map(toPublicView);
  }

  /** Idempotent upsert keyed by optionId — used by the seed script. Returns 'created' | 'updated'. */
  async upsert(input: AccessoryUpsertInput): Promise<'created' | 'updated'> {
    const now = new Date().toISOString();
    const result = await accessories().updateOne(
      { optionId: input.optionId },
      {
        $set: {
          kind: input.kind,
          name: input.name,
          source: input.source,
          imageUrl: input.imageUrl,
          thumbnailUrl: input.thumbnailUrl,
          ...(input.packSize !== undefined ? { packSize: input.packSize } : {}),
          active: input.active ?? true,
          sortOrder: input.sortOrder,
          updatedAt: now,
        },
        $setOnInsert: { optionId: input.optionId, createdAt: now },
      },
      { upsert: true },
    );
    return result.upsertedCount > 0 ? 'created' : 'updated';
  }
}
