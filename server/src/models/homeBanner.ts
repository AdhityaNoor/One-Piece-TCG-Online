/**
 * Home-screen announcement banner (Admin CMS "Banner & News Management").
 * NOT related to the existing profile-cosmetic "banner" concept
 * (src/app/lib/banners.ts / cosmeticCatalog.ts — CSS-gradient profile
 * backgrounds a player picks for themself). This is a from-scratch
 * announcement/news system with no prior code to build on.
 */
import type { ObjectId } from 'mongodb';

export interface HomeBannerDocument {
  _id?: ObjectId;
  title: string;
  caption: string;
  /** Absolute http(s) URL or null for a text-only banner. */
  imageUrl: string | null;
  /** Optional outbound link (e.g. to patch notes) or null. */
  linkUrl: string | null;
  active: boolean;
  /** Lower sorts first. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
