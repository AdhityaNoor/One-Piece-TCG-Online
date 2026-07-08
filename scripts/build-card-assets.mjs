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
const SET_DISPLAY_NAMES = JSON.parse(
  await readFile(resolve(ROOT, 'src/cards/catalog/setDisplayNames.json'), 'utf8'),
);
const SCRAPE_CARDS = resolve(ROOT, 'scrape', 'limitless', 'cards');
const SCRAPE_IMAGES = resolve(ROOT, 'scrape', 'limitless', 'images');
const OUT_DATA = resolve(ROOT, 'public', 'cards');
const OUT_SETS = resolve(OUT_DATA, 'sets');
const OUT_IMAGES = resolve(ROOT, 'public', 'card-images');

/**
 * Web path (served from public/) for a card image, or null if unavailable.
 * `variantId` is '' for the base print, 'p1'/'p2'/… for alternate arts, so the
 * filename mirrors the scrape/CDN: OP01-016_EN.webp / OP01-016_p1_EN.webp.
 */
async function placeImage(setCode, cardNumber, lang, variantId = '') {
  const infix = variantId ? `_${variantId}` : '';
  const file = `${cardNumber}${infix}_${lang.toUpperCase()}.webp`;
  const target = resolve(OUT_IMAGES, setCode, file);
  const webPath = `/card-images/${setCode}/${file}`;
  if (existsSync(target)) return webPath; // already placed (idempotent)
  const source = resolve(SCRAPE_IMAGES, setCode, file);
  if (!existsSync(source)) return null; // no art for this language/card/print
  await mkdir(dirname(target), { recursive: true });
  await rename(source, target);
  return webPath;
}

/**
 * Promotes every printing's art (base + alternate arts) from the scrape into
 * public/card-images and returns the LocalCard `prints[]`. Falls back to a
 * single base print for cards scraped before alt-art support (no scraped.prints).
 */
async function placePrints(scraped) {
  const setCode = scraped.setCode;
  const scrapedPrints = Array.isArray(scraped.prints) && scraped.prints.length
    ? scraped.prints
    : [{ variantId: '', isAlternateArt: false, printKind: scraped.rarity ?? null }];

  const prints = [];
  for (const p of scrapedPrints) {
    const variantId = p.variantId ?? '';
    const enImage = await placeImage(setCode, scraped.cardNumber, 'en', variantId);
    const jpImage = await placeImage(setCode, scraped.cardNumber, 'jp', variantId);
    prints.push({
      variantId,
      isAlternateArt: Boolean(p.isAlternateArt),
      printKind: p.printKind ?? null,
      image: enImage,
      imageJp: jpImage,
    });
  }
  return prints;
}

function resolveSetDisplayName(setCode, fallbackName) {
  return SET_DISPLAY_NAMES[setCode.toUpperCase()] ?? fallbackName ?? setCode;
}

function toLocalCard(scraped, prints) {
  const effectText = scraped.en?.effectText ?? '';
  const definition = scraped.definition
    ? { ...scraped.definition, hasBanish: effectText.includes('[Banish]') }
    : scraped.definition;

  const basePrint = prints.find((p) => !p.isAlternateArt) ?? prints[0] ?? null;

  return {
    cardNumber: scraped.cardNumber,
    setCode: scraped.setCode,
    setName: resolveSetDisplayName(scraped.setCode, scraped.setCode),
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
      effectText,
      types: scraped.en?.types ?? [],
      image: basePrint?.image ?? null,
    },
    jp: {
      name: scraped.jp?.name ?? null,
      effectText: scraped.jp?.effectText ?? '',
      types: scraped.jp?.types ?? [],
      image: basePrint?.imageJp ?? null,
    },
    // Base first, then alternate arts — consumed by the card catalog loader to
    // offer art variants in the library/deck builder.
    prints,
    definition,
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
    let altArtImages = 0;
    for (const f of files) {
      const scraped = JSON.parse(await readFile(join(setDirPath, f), 'utf8'));
      const prints = await placePrints(scraped);
      altArtImages += prints.filter((p) => p.isAlternateArt && p.image).length;
      cards.push(toLocalCard(scraped, prints));
    }
    cards.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
    const setCode = cards[0]?.setCode ?? dir.name;
    await writeFile(join(OUT_SETS, `${setCode}.json`), JSON.stringify(cards), 'utf8');
    index.sets.push({ code: setCode, name: resolveSetDisplayName(setCode, setCode), count: cards.length });
    index.total += cards.length;
    console.log(`[build:assets] ${setCode}: ${cards.length} cards${altArtImages ? `, ${altArtImages} alt-art image(s)` : ''}`);
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
