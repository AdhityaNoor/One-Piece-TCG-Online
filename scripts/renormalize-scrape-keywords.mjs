/**
 * Re-derives printed-keyword flags on the STORED Limitless scrape, without re-fetching.
 *
 *   node scripts/renormalize-scrape-keywords.mjs [--write]
 *
 * `scrape/limitless/cards/<set>/<card>.json` carries a `definition` block that the
 * scraper DERIVED from the card's effect text at scrape time. When a derivation bug is
 * fixed in scrapeOutput.ts, every already-scraped card keeps the wrong value until the
 * scrape is re-run — and limitlesstcg is not reachable from every environment. This
 * script re-applies the corrected predicate to the stored text so the fix lands without
 * a network round-trip. Re-run `npm run build:assets` afterwards to push it into
 * public/cards/sets/*.json, which is what the app and engine actually read.
 *
 * Scope is deliberately narrow: ONLY `hasRush`. The other flags either have a smarter
 * derivation in normalizeCardPrinting.ts than the scraper's plain substring test
 * (hasBlocker), or have known open issues of their own (conditional keywords) — naively
 * re-deriving those here would trade one wrong answer for another. Widen only with a
 * predicate you have actually verified against the affected cards.
 *
 * Dry-run by default; pass --write to save.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CARDS = resolve(ROOT, 'scrape', 'limitless', 'cards');
const WRITE = process.argv.includes('--write');

/**
 * [Rush] only. '[Rush: Character]' is a DIFFERENT keyword (attack Characters only, never
 * the Leader) and deliberately does NOT match — it does not contain the substring
 * '[Rush]'. The engine models it as the continuous keyword
 * `canAttackCharactersWhileSummoningSick`, granted by a curated onEnterPlay ability.
 */
const derivesHasRush = (text) => text.includes('[Rush]');

// Read set-at-a-time in parallel: the scrape is ~2800 small files, and on a mounted
// filesystem a serial walk is dominated by per-file latency (minutes, not seconds).
const changes = [];
for (const set of await readdir(CARDS)) {
  const files = (await readdir(join(CARDS, set))).filter((f) => f.endsWith('.json'));
  const results = await Promise.all(files.map(async (file) => {
    const path = join(CARDS, set, file);
    const card = JSON.parse(await readFile(path, 'utf8'));
    const def = card.definition;
    if (!def) return null;
    const text = card.en?.effectText ?? def.text ?? '';
    const want = derivesHasRush(text);
    if (def.hasRush === want) return null;
    return { path, card, def, want, entry: { cardNumber: card.cardNumber, from: def.hasRush, to: want, text: text.slice(0, 80) } };
  }));
  for (const r of results) {
    if (!r) continue;
    changes.push(r.entry);
    if (WRITE) {
      r.def.hasRush = r.want;
      await writeFile(r.path, `${JSON.stringify(r.card, null, 1)}\n`, 'utf8');
    }
  }
}

for (const c of changes) console.log(`${c.cardNumber}  hasRush ${c.from} -> ${c.to}   ${c.text}`);
console.log(`\n${changes.length} card(s) ${WRITE ? 'updated' : 'would change (dry run; pass --write)'}`);

/**
 * --sync-public: push the corrected `definition` flags from the scrape into
 * public/cards/sets/<SET>.json, which is what the app and engine actually read.
 *
 * `npm run build:assets` normally does this by copying `scraped.definition` verbatim,
 * but it walks the whole ~2800-card scrape and can exceed a short command timeout. For
 * a flag-only correction this touches just the affected set files and produces the same
 * bytes build:assets would have. Run the full build:assets when convenient regardless.
 */
if (process.argv.includes('--sync-public')) {
  const SETS = resolve(ROOT, 'public', 'cards', 'sets');
  // Re-derive from each catalog entry's OWN text rather than from `changes`, so this
  // stays correct (and idempotent) whether or not the scrape pass above found anything —
  // e.g. when the scrape was already corrected by an earlier run.
  let synced = 0;
  for (const file of await readdir(SETS)) {
    if (!file.endsWith('.json')) continue;
    const path = join(SETS, file);
    const cards = JSON.parse(await readFile(path, 'utf8'));
    let dirty = false;
    for (const card of cards) {
      if (!card.definition) continue;
      const want = derivesHasRush(card.en?.effectText ?? card.definition.text ?? '');
      if (card.definition.hasRush === want) continue;
      card.definition.hasRush = want;
      dirty = true;
      synced += 1;
      console.log(`  public/cards/sets/${file}: ${card.cardNumber} hasRush -> ${want}`);
    }
    if (dirty && WRITE) await writeFile(path, `${JSON.stringify(cards, null, 1)}\n`, 'utf8');
  }
  console.log(`${synced} catalog entr(ies) ${WRITE ? 'synced' : 'would sync (dry run)'}`);
}
