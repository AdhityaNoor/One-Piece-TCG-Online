/**
 * One-time migration: seeds the Banner & News Management collection with the
 * 4 slides that were previously hardcoded as `FALLBACK_SLIDES` in
 * src/app/screens/hub/HomeTab.tsx. Those stay in the frontend as a
 * last-resort fallback (so Home never renders an empty carousel before an
 * admin has published anything — see that file's doc comment), but until
 * now they were invisible to the Admin CMS: nothing in the database backed
 * them, so "Banner & News Management" showed an empty list even though the
 * home screen displayed content.
 *
 * `imageUrl` must be an absolute http(s) URL (see bannerService.ts
 * validateBody) — the frontend fallback used root-relative paths
 * (/ui/Banners/mv.webp), which resolve fine in the browser but aren't valid
 * here, so this script qualifies them against the deployed frontend origin.
 *
 * Idempotent: matches existing rows by title, so re-running updates instead
 * of duplicating.
 *
 * Usage (from server/):
 *   npm run seed:banners
 *   npm run seed:banners -- --origin https://your-frontend.example.com
 *
 * Requires the same MONGODB_URI env var the server itself uses.
 */
import { connectMongo, closeMongo, homeBanners } from '../db/mongo';
import { BannerService } from './bannerService';

function arg(name: string): string | null {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

interface SeedSlide {
  title: string;
  caption: string;
  imagePath: string;
  sortOrder: number;
}

// Mirrors FALLBACK_SLIDES in src/app/screens/hub/HomeTab.tsx exactly, so the
// migrated rows read identically to what was already live.
const SEED_SLIDES: SeedSlide[] = [
  { title: 'Set Sail', caption: 'Featured content coming soon.', imagePath: '/ui/Banners/mv.webp', sortOrder: 0 },
  { title: 'Build Your Fleet', caption: 'Featured content coming soon.', imagePath: '/ui/Banners/mv2.webp', sortOrder: 1 },
  { title: 'Challenge Rivals', caption: 'Featured content coming soon.', imagePath: '/ui/Banners/mv3.webp', sortOrder: 2 },
  { title: 'Climb the Ranks', caption: 'Featured content coming soon.', imagePath: '/ui/Banners/mv4.webp', sortOrder: 3 },
];

async function main(): Promise<void> {
  const origin = (arg('origin') ?? 'https://one-piece-tcg-online.vercel.app').replace(/\/+$/, '');

  await connectMongo();
  const service = new BannerService();

  for (const slide of SEED_SLIDES) {
    const imageUrl = `${origin}${slide.imagePath}`;
    const existing = await homeBanners().findOne({ title: slide.title });
    if (existing) {
      await service.update('seed-script', existing._id!.toHexString(), {
        title: slide.title,
        caption: slide.caption,
        imageUrl,
        linkUrl: null,
        active: true,
        sortOrder: slide.sortOrder,
      });
      console.log(`Updated existing banner: ${slide.title}`);
    } else {
      await service.create('seed-script', {
        title: slide.title,
        caption: slide.caption,
        imageUrl,
        linkUrl: null,
        active: true,
        sortOrder: slide.sortOrder,
      });
      console.log(`Created banner: ${slide.title}`);
    }
  }

  await closeMongo();
}

main().catch((err) => {
  console.error('[seed:banners] failed:', err);
  process.exitCode = 1;
});
