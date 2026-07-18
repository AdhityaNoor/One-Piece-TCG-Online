/**
 * CRUD for home-screen announcement banners (Admin CMS "Banner & News
 * Management"). See models/homeBanner.ts doc comment — unrelated to the
 * existing profile-cosmetic banner picker.
 */
import { ObjectId } from 'mongodb';
import { homeBanners } from '../db/mongo';
import { AdminServiceError } from './errors';
import type { AdminHomeBanner, PublicHomeBanner, SaveHomeBannerRequest } from '../../../shared/admin';
import type { HomeBannerDocument } from '../models/homeBanner';

function toAdminView(doc: HomeBannerDocument): AdminHomeBanner {
  return {
    id: doc._id!.toHexString(),
    title: doc.title,
    caption: doc.caption,
    imageUrl: doc.imageUrl,
    linkUrl: doc.linkUrl,
    active: doc.active,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPublicView(doc: HomeBannerDocument): PublicHomeBanner {
  return { id: doc._id!.toHexString(), title: doc.title, caption: doc.caption, imageUrl: doc.imageUrl, linkUrl: doc.linkUrl };
}

function validateBody(body: Partial<SaveHomeBannerRequest>): void {
  if (!body.title?.trim()) throw new AdminServiceError(400, 'VALIDATION', 'Title is required.');
  if (body.title.length > 120) throw new AdminServiceError(400, 'VALIDATION', 'Title must be 120 characters or fewer.');
  if (!body.caption?.trim()) throw new AdminServiceError(400, 'VALIDATION', 'Caption is required.');
  if (body.caption.length > 400) throw new AdminServiceError(400, 'VALIDATION', 'Caption must be 400 characters or fewer.');
  if (body.imageUrl && !/^https?:\/\//.test(body.imageUrl)) throw new AdminServiceError(400, 'VALIDATION', 'Image URL must be an absolute http(s) URL.');
  if (body.linkUrl && !/^https?:\/\//.test(body.linkUrl)) throw new AdminServiceError(400, 'VALIDATION', 'Link URL must be an absolute http(s) URL.');
}

export class BannerService {
  async listAllForAdmin(): Promise<AdminHomeBanner[]> {
    const docs = await homeBanners().find().sort({ sortOrder: 1, createdAt: -1 }).toArray();
    return docs.map(toAdminView);
  }

  async listActiveForPlayers(): Promise<PublicHomeBanner[]> {
    const docs = await homeBanners().find({ active: true }).sort({ sortOrder: 1 }).toArray();
    return docs.map(toPublicView);
  }

  async create(adminId: string, body: SaveHomeBannerRequest): Promise<AdminHomeBanner> {
    validateBody(body);
    const nowIso = new Date().toISOString();
    const doc: HomeBannerDocument = {
      title: body.title.trim(),
      caption: body.caption.trim(),
      imageUrl: body.imageUrl?.trim() || null,
      linkUrl: body.linkUrl?.trim() || null,
      active: Boolean(body.active),
      sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      updatedBy: adminId,
    };
    const result = await homeBanners().insertOne(doc);
    return toAdminView({ ...doc, _id: result.insertedId });
  }

  async update(adminId: string, id: string, body: SaveHomeBannerRequest): Promise<AdminHomeBanner> {
    validateBody(body);
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new AdminServiceError(404, 'NOT_FOUND', 'Banner not found.');
    }
    const update: Partial<HomeBannerDocument> = {
      title: body.title.trim(),
      caption: body.caption.trim(),
      imageUrl: body.imageUrl?.trim() || null,
      linkUrl: body.linkUrl?.trim() || null,
      active: Boolean(body.active),
      sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId,
    };
    const result = await homeBanners().findOneAndUpdate({ _id: objectId }, { $set: update }, { returnDocument: 'after' });
    if (!result) throw new AdminServiceError(404, 'NOT_FOUND', 'Banner not found.');
    return toAdminView(result);
  }

  async remove(id: string): Promise<void> {
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch {
      throw new AdminServiceError(404, 'NOT_FOUND', 'Banner not found.');
    }
    const result = await homeBanners().deleteOne({ _id: objectId });
    if (result.deletedCount === 0) throw new AdminServiceError(404, 'NOT_FOUND', 'Banner not found.');
  }
}
