/**
 * Builds the app's local card assets from the Limitless scrape.
 *
 *   npm run build:assets
 *
 * Reads  scrape/limitless/cards/<set>/<card>.json   (the scrape output)
 * Writes public/cards/sets/<SET>.json               (LocalCard[] per set, committed)
 *        public/cards/index.json                    (set list + counts, committed)
 *        public/card-images/<SET>/<id>_<LANG>.webp  (moved from the scrape, GITIGNORED)
 *
 * Idempotent: images already present in public/card-images are kept; images
 * still in the scrape are moved over; cards with neither get image: null. Safe
 * to re-run after a fresh scrape.
 */
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRAPE_CARDS = resolve(ROOT, 'scrape', 'limitless', 'cards');
const SCRAPE_IMAGES = resolve(ROOT, 'scrape', 'limitless', 'images');
const OUT_DATA = resolve(ROOT, 'public', 'cards');
const OUT_SETS = resolve(OUT_DATA, 'sets');
const OUT_IMAGES = resolve(ROOT, 'public', 'card-images');

/** Web path (served from public/) for a card image, or null if the file isn't available. */
async function placeImage(setCode, cardNumber, lang) {
  const file = `${cardNumber}_${lang.toUpperCase()}.webp`;
  const target = resolve(OUT_IMAGES, setCode, file);
  const webPath = `/card-images/${setCode}/${file}`;
  if (existsSync(target)) return webPath; // already placed (idempotent)
  const source = resolve(SCRAPE_IMAGES, setCode, file);
  if (!existsSync(source)) return null; // no art for this language/card
  await mkdir(dirname(target), { recursive: true });
  await rename(source, target);
  return webPath;
}

function toLocalCard(scraped, enImage, jpImage) {
  return {
    cardNumber: scraped.cardNumber,
    setCode: scraped.setCode,
    setName: scraped.setCode, // Limitless cards don't carry a set display-name; code is used.
    category: scraped.category,
    colors: scraped.colors ?? [],
    cost: scraped.cost,
    power: scraped.power,
    life: scraped.life,
    counter: scraped.counter,
    attributes: scraped.attributes && scraped.attributes.length ? scraped.attributes : undefined,
    rarity: scraped.rarity,
    block: scraped.block,
    legality: scraped.legality,
    en: {
      name: scraped.en?.name ?? scraped.definition?.name ?? scraped.cardNumber,
      effectText: scraped.en?.effectText ?? '',
      types: scraped.en?.types ?? [],
      image: enImage,
    },
    jp: {
      name: scraped.jp?.name ?? null,
      effectText: scraped.jp?.effectText ?? '',
      types: scraped.jp?.types ?? [],
      image: jpImage,
    },
    definition: scraped.definition,
  };
}

async function main() {
  if (!existsSync(SCRAPE_CARDS)) {
    console.error(`[build:assets] no scrape found at ${SCRAPE_CARDS} — run \`npm run scrape:limitless\` first.`);
    process.exitCode = 1;
    return;
  }
  await mkdir(OUT_SETS, { recursive: true });
  await mkdir(OUT_IMAGES, { recursive: true });

  const setDirs = (await readdir(SCRAPE_CARDS, { withFileTypes: true })).filter((d) => d.isDirectory());
  const index = { schemaVersion: 1, generatedAt: new Date().toISOString(), total: 0, sets: [] };

  for (const dir of setDirs.sort((a, b) => a.name.localeCompare(b.name))) {
    const setDirPath = join(SCRAPE_CARDS, dir.name);
    const files = (await readdir(setDirPath)).filter((f) => f.endsWith('.json'));
    const cards = [];
    for (const f of files) {
      const scraped = JSON.parse(await readFile(join(setDirPath, f), 'utf8'));
      const setCode = scraped.setCode;
      const enImage = await placeImage(setCode, scraped.cardNumber, 'en');
      const jpImage = await placeImage(setCode, scraped.cardNumber, 'jp');
      cards.push(toLocalCard(scraped, enImage, jpImage));
    }
    cards.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
    const setCode = cards[0]?.setCode ?? dir.name;
    await writeFile(join(OUT_SETS, `${setCode}.json`), JSON.stringify(cards), 'utf8');
    index.sets.push({ code: setCode, name: setCode, count: cards.length });
    index.total += cards.length;
    console.log(`[build:assets] ${setCode}: ${cards.length} cards`);
  }

  index.sets.sort((a, b) => a.code.localeCompare(b.code));
  await writeFile(resolve(OUT_DATA, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`[build:assets] done: ${index.total} cards across ${index.sets.length} sets.`);
  console.log('[build:assets] data -> public/cards/ (committed), images -> public/card-images/ (gitignored).');
}

main().catch((e) => {
  console.error('[build:assets] FAILED:', e?.message ?? e);
  process.exitCode = 1;
});
