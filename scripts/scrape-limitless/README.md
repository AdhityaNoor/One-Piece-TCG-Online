# Limitless One Piece Scraper (EN + JP)

Scrapes card data from [onepiece.limitlesstcg.com](https://onepiece.limitlesstcg.com/),
capturing **both English and Japanese** attributes for every card. Unlike
optcgapi.com, Limitless has **no JSON API** — its pages are server-side-rendered
HTML — so this tool fetches and parses the card pages directly.

## Run it

```bash
npm install                  # first time — installs tsx + jsdom (both already in package.json)
npm run scrape:limitless
```

Watch it in a separate fullscreen terminal outside your IDE:

```bash
npm run scrape:limitless:window
```

### Options

```bash
npm run scrape:limitless -- --refresh        # re-enumerate sets/cards before scraping
npm run scrape:limitless -- --set OP01        # only one set
npm run scrape:limitless -- --limit 20        # cap cards this run (good for a first test)
npm run scrape:limitless -- --delay 2000      # ms between requests (default 1200 + jitter)
npm run scrape:limitless -- --force           # re-scrape even already-completed cards
npm run scrape:limitless -- --no-images       # skip downloading card art (data only)
```

Output (gitignored — under the existing `scrape/` rule):

```
scrape/limitless/
  index.json                    # manifest: counts (total / needsReview / jpMissing / images{en,jp}), per-set tallies
  progress.json                 # resume state (enumerated lists, completed, failed)
  cards/
    OP01/OP01-016.json          # one card per file, foldered by set
    ...
  images/
    OP01/OP01-016_EN.webp       # English card art
    OP01/OP01-016_JP.webp       # Japanese card art
    ...
```

## Card images (EN + JP)

Image download is **ON by default** — every card's English and Japanese art is
downloaded from the Limitless CDN to `images/<set>/<cardNumber>_<LANG>.webp`. Each
card's `en`/`jp` block records the outcome:

```jsonc
"en": { "imageUrl": "https://…/OP01/OP01-016_EN.webp", "imageStatus": "downloaded", "imageFile": "images/OP01/OP01-016_EN.webp" },
"jp": { "imageUrl": "https://…/OP01/OP01-016_JP.webp", "imageStatus": "downloaded", "imageFile": "images/OP01/OP01-016_JP.webp" }
```

`imageStatus` is one of `downloaded` / `exists` (already on disk, skipped) /
`missing` (no art for that language — a real 404, e.g. an EN-only promo has no
JP image) / `failed` (network error, recorded and retried next run) / `skipped`
(`--no-images`). Downloads are **resumable** (existing files are never
re-fetched) and **atomic** (temp file + rename). Images use a faster pace than
the HTML pages because they come from a CDN, not the site's VPS.

> Already ran once without images? Add them with
> `npm run scrape:limitless -- --force` — it re-processes cards but only
> downloads the images that aren't already on disk.

## What's captured per card

Structural attributes are language-neutral on Limitless (English labels on both
pages), so they're stored once; only name / effect text / type names / image are
localized into `en` and `jp`:

```jsonc
{
  "cardNumber": "OP01-016",
  "category": "character", "colors": ["red"],
  "cost": 1, "power": 2000, "counter": 2000, "attributes": ["special"],
  "legality": { "standard": "Standard legal", "extra": "Extra legal" },
  "en": { "name": "Nami", "effectText": "[On Play] Look at 5 cards…", "types": ["Straw Hat Crew"], "imageUrl": "…/OP01/OP01-016_EN.webp" },
  "jp": { "name": "ナミ",  "effectText": "【登場時】…",            "types": ["麦わらの一味"], "imageUrl": "…/OP01/OP01-016_JP.webp" },
  "definition": { /* engine-facing CardDefinition (same shape the engine uses) */ },
  "effectParse": { /* inert ability hooks + draft atoms from the EN text (never executed) */ }
}
```

The EN effect text is also run through the project's shared effect parser
(`src/cards/effectParser`), so this output drops straight into the same
template-authoring workflow as the optcgapi scraper. Card text is stored raw and
never executed.

## Failsafe & resumable (respecting their ToS)

`robots.txt` allows crawling (`Disallow:` is empty), but the tool is still built
to be a good citizen and to survive interruptions:

- **Polite:** one request at a time, a delay + random jitter between every
  request, an identifying `User-Agent`, and retry-with-backoff that honors
  `Retry-After` on `429`/`5xx`.
- **Resumable:** progress is checkpointed to `progress.json` (atomic writes).
  Re-running skips already-scraped cards. **Ctrl+C** stops after the current
  card and saves — the next run continues where it left off. A second Ctrl+C
  force-exits.
- **Failsafe:** a card whose EN or JP page is missing/times out is recorded in
  `progress.json.failed` and the crawl keeps going — one bad page never aborts
  the run. A card with no Japanese printing is written with `jp.missing: true`.

## Notes / limitations

- This is HTML scraping, so it's inherently more fragile than a JSON API: if
  Limitless changes its page markup, the selectors in `parseCardPage.ts` may
  need updating. The parser degrades gracefully (warnings, not crashes) so
  you'll see which fields stopped resolving rather than getting a hard failure.
- `rarity` and `block` are best-effort (parsed from surrounding text).
- The JP effect text is stored raw only — the effect parser targets English
  bracket tags, so `effectParse` is built from the EN text. Mapping JP text is
  future work.
- Be considerate: a full EN+JP crawl is several thousand requests. Use `--limit`
  to test first, and the default pacing for the real run.
