/**
 * CRUD for runtime feature flags (Admin CMS "Game Management"). See
 * models/featureFlag.ts doc comment for the known limitation: nothing
 * outside this admin surface reads these yet.
 */
import { featureFlags } from '../db/mongo';
import { AdminServiceError } from './errors';
import type { AdminFeatureFlag, CreateFeatureFlagRequest, UpdateFeatureFlagRequest } from '../../../shared/admin';
import type { FeatureFlagDocument } from '../models/featureFlag';

const KEY_RE = /^[a-z][a-z0-9_]{1,63}$/;

function toView(doc: FeatureFlagDocument): AdminFeatureFlag {
  return { key: doc.key, label: doc.label, description: doc.description, enabled: doc.enabled, updatedAt: doc.updatedAt, updatedBy: doc.updatedBy };
}

export class FeatureFlagService {
  async list(): Promise<AdminFeatureFlag[]> {
    const docs = await featureFlags().find().sort({ key: 1 }).toArray();
    return docs.map(toView);
  }

  async create(adminId: string, body: CreateFeatureFlagRequest): Promise<AdminFeatureFlag> {
    const key = (body.key ?? '').trim().toLowerCase();
    if (!KEY_RE.test(key)) {
      throw new AdminServiceError(400, 'VALIDATION', 'Key must be lowercase snake_case, 2-64 characters, starting with a letter.');
    }
    if (!body.label?.trim()) throw new AdminServiceError(400, 'VALIDATION', 'Label is required.');

    const doc: FeatureFlagDocument = {
      key,
      label: body.label.trim().slice(0, 80),
      description: (body.description ?? '').trim().slice(0, 500),
      enabled: Boolean(body.enabled),
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    try {
      await featureFlags().insertOne(doc);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: number }).code === 11000) {
        throw new AdminServiceError(409, 'CONFLICT', `A flag with key "${key}" already exists.`);
      }
      throw err;
    }
    return toView(doc);
  }

  async update(adminId: string, key: string, body: UpdateFeatureFlagRequest): Promise<AdminFeatureFlag> {
    const existing = await featureFlags().findOne({ key });
    if (!existing) throw new AdminServiceError(404, 'NOT_FOUND', `No flag with key "${key}".`);

    const update: Partial<FeatureFlagDocument> = { updatedAt: new Date().toISOString(), updatedBy: adminId };
    if (body.label !== undefined) update.label = body.label.trim().slice(0, 80);
    if (body.description !== undefined) update.description = body.description.trim().slice(0, 500);
    if (body.enabled !== undefined) update.enabled = body.enabled;

    await featureFlags().updateOne({ key }, { $set: update });
    return toView({ ...existing, ...update });
  }

  async remove(key: string): Promise<void> {
    const result = await featureFlags().deleteOne({ key });
    if (result.deletedCount === 0) throw new AdminServiceError(404, 'NOT_FOUND', `No flag with key "${key}".`);
  }
}
