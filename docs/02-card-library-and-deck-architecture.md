# Card Library & Deck-Save Architecture v1.0

Source of truth for this document: live responses from `https://optcgapi.com/api/...`, captured and cross-checked on 2026-06-28. There is no published OpenAPI/JSON-Schema for this API — every shape below is reverse-engineered from real payloads, not from written docs, and is annotated as "observed" rather than "guaranteed." Implements `docs/01-rules-engine-blueprint.md` Section 19 TODO #8 (now resolved there, with a pointer back to this file).

Ground rules this design follows (from project instructions): the Cards API is card data only, never executable logic; card effect text is stored raw and mapped to effect templates later (not yet); nothing here is assumed when the API is ambiguous — ambiguity is marked TODO; everything persisted or dispatched is plain JSON-serializable data.

---

## 1. What You Are Building

A `/src/cards` layer that sits beside (never inside) `/src/engine`, with four jobs:

1. **Fetch** card data from optcgapi.com for live browsing in the deck builder (`/src/cards/api`).
2. **Normalize** the API's raw, inconsistent rows into the engine's existing `CardDefinition` shape, handling the API's real quirks (string-encoded numbers, multiple printings per card number, undelimited tribal types) without guessing (`/src/cards/normalization`).
3. **Present** a browsing-friendly card library model that still carries everything a save needs (`/src/cards/library`).
4. **Snapshot** a deck into a fully self-contained `SavedDeck` record at save time, so the API can change, go down, or disappear without breaking any deck that was ever saved (`/src/cards/decks`), plus a forward-looking asset-caching seam (`/src/cards/assets`).

None of this is game-rules logic. It ends at producing `CardDefinition[]` and `SavedDeck` — the same `CardDefinition` type `/src/engine/state/card.ts` already declares. The engine doesn't know optcgapi.com exists.

## 2. Why This Structure Is Correct

- **One-directional dependency.** `/src/cards` imports *types only* from `/src/engine/state/card.ts` (`CardDefinition`, `CardCategory`, `Color`, `Attribute`). Nothing in `/src/engine` imports anything from `/src/cards`. `normalizeCardPrinting.ts` is the single, explicit translation point — exactly one file is allowed to know both "API shape" and "engine shape" exist.
- **Raw vs. normalized vs. saved are three different shapes on purpose.** Collapsing them would mean either polluting `CardDefinition` with API-only fields (pricing, scrape dates) or losing the ability to re-derive a card's data later. Keeping `CardPrintingDto` (raw), `CardDefinition` (normalized), and `SavedDeckCardSnapshot` (saved, embeds both) separate is what makes requirement #4 ("must not break if the API changes") actually true rather than aspirational.
- **Errors are values, not exceptions**, at every API boundary (`CardApiResult<T>`), matching the engine's own action-validation style (validate → return a result, never throw across a module boundary) — so a flaky third-party API degrades the deck builder UI, it never crashes it.
- **Card text is inert.** `card_text` flows verbatim into `CardDefinition.text` and `SavedDeckCardSnapshot`. No code anywhere in `/src/cards` parses `[Trigger]`/`[On Play]`/etc. into behavior — that mapping is future, hand-authored work in `/src/cards/effectTemplates`, keyed by `cardNumber`, per requirement #7.
- **Ambiguity produces a `NormalizationWarning`, not a guess.** Multi-color delimiters, un-splittable tribal types, and disagreeing printings all surface as structured, JSON-serializable warnings attached to the data, rather than a silent best-effort transformation that could be subtly wrong.

## 3. Files / Folders Involved (API adapter folder structure)

```
/src/cards
  /api                       — talks to optcgapi.com, raw DTOs only
    types.ts                 — CardPrintingDto, DonCardDto, SetSummaryDto (wire shapes)
    endpoints.ts             — OPTCG_API_BASE_URL + one URL-builder per documented endpoint
    client.ts                — FetchLike, CardApiResult<T>, fetchAllSets/fetchCardPrintings/fetchDonCards
    cache.ts                 — CacheStore interface, InMemoryCacheStore, withCache() (TTL + in-flight dedupe)
    index.ts                 — barrel
    __fixtures__/sampleApiResponses.ts  — real captured rows, used by normalization tests

  /normalization             — the ONLY boundary allowed to import engine types
    warnings.ts              — NormalizationWarningCode, NormalizationWarning, warn()
    parseNumericField.ts     — coerceOptionalNumber, coerceCounterAmount
    canonicalPrinting.ts     — pickCanonicalPrinting() — one row per card number
    normalizeCardPrinting.ts — normalizeCardPrintings(), normalizeDonCard() -> CardDefinition
    index.ts                 — barrel
    __tests__/

  /library                    — browsing/search-facing model for the deck builder UI
    cardPrintingSummary.ts   — CardLibraryEntry, buildCardLibraryEntry()
    index.ts

  /decks                      — deck construction legality + the save flow
    savedDeck.ts             — SavedDeck, SavedDeckCardSnapshot, SAVED_DECK_SCHEMA_VERSION
    deckValidation.ts        — validateDeckConstruction() (Comprehensive Rules 5-1-2 family)
    saveDeck.ts              — createSavedDeck() — selections -> SavedDeck | rejection reasons
    index.ts
    __tests__/

  /assets                     — image reference + the Phase-2 caching seam
    assetCache.ts            — AssetRef, buildAssetRef(), AssetCacheManager (interface, not yet implemented)
    index.ts

  index.ts                    — top-level barrel (api, normalization, library, decks, assets)
```

This matches the project's suggested `/src/cards/{api, normalization, effectTemplates}` convention, extended with `library`, `decks`, and `assets` — the three additional concerns this task explicitly asked for (browsing, saving, caching) that don't fit inside `api` or `normalization` without overloading them.

## 4. API Provider Analysis

`optcgapi.com` (no relation to Bandai) is a community-run, **unauthenticated, GET-only, JSON** API. Confirmed live, 2026-06-28:

- **No auth, no API key, no rate-limit header observed.** The site owner explicitly asks consumers to keep call volume low — it runs on a self-funded VPS. This is the reason `cache.ts` exists at all; it is a requirement, not an optimization.
- **Resource families:** Sets (`/api/sets/...`, `/api/allSets/`, `/api/allSetCards/`), Starter Decks (`/api/decks/...`, `/api/allDecks/`, `/api/allSTCards/`), Promos (`/api/promos/...`, `/api/allPromoCards/`), DON!! (`/api/allDonCards/`). All four "card row" families (Sets/Decks/Promos) return the **identical** row shape (`CardPrintingDto`); DON!! is structurally separate (`DonCardDto`).
- **One card number → many rows.** `GET /api/sets/card/{card_id}/` (and the `/decks/card/` and `/promos/card/` equivalents) return an **array**, one row per printing (base, Parallel, SP, manga reprint, regional promo, ...) that shares the same `card_set_id`. Confirmed live on OP01-016 (Nami): 4 rows, and the SP printing's `card_text` is phrased slightly differently from the base printing's. There is no "is this the canonical printing" flag in the response — see Section 6.
- **`/api/sets/filtered/` is unreliable per-field.** Live test of `?card_color=Red&card_type=Event` correctly filtered `card_type` (123/123 rows were Event) but **silently ignored `card_color`** (all 6 colors came back). Conclusion: never trust a `/filtered/` query param to have actually filtered; the adapter must always re-filter client-side, treating the server-side filter as a no-op-possible optimization hint only.
- **The "all\*" endpoints are large and unpaginated.** No pagination parameters are documented or observed anywhere. `allDonCards` alone is 70KB+ today and will only grow.
- **Numeric encoding is inconsistent** *within the same row*: `card_power`/`card_cost`/`life` arrive as numeric strings or `null`; `counter_amount` arrives as a real JSON number or `null` — except one promo Character (`P-001`) where it's `0` meaning "no counter," not "Counter 0" (Comprehensive Rules 2-10-2 has no "Counter +0" concept). `card_image` is a URL string or `null` (several promo rows have never had an image scraped — a real "missing asset" state, not an error).
- **No multicolor sample observed.** Comprehensive Rules 2-3-5 describes multicolor cards; `card_color` has only ever been seen as a single token. The delimiter for a hypothetical multicolor value is **unconfirmed** — TODO, flagged in `types.ts` and handled defensively in `normalizeCardPrinting.ts` (unmapped tokens are dropped with a warning, never guessed).

## 5. Card Data Model (raw DTOs — `/src/cards/api/types.ts`)

```ts
export interface SetSummaryDto {
  set_name: string;
  set_id: string; // "OP-01", "EB-01", "PRB-01", "OP14-EB04" — no fixed pattern
}

export interface CardPrintingDto {
  inventory_price: number | null;
  market_price: number | null;
  card_name: string;
  set_name: string;
  card_text: string;
  set_id: string;          // the set this PRINTING belongs to, e.g. "OP-01"
  rarity: string;
  card_set_id: string;     // the card NUMBER, e.g. "OP01-016" — the 5-1-2-3 identity key
  card_color: string;      // single token in every sample; multicolor delimiter TODO
  card_type: 'Leader' | 'Character' | 'Event' | 'Stage';
  life: string | null;
  card_cost: string | null;
  card_power: string | null;
  sub_types: string;       // space-joined, no reliable inter-type delimiter
  counter_amount: number | null;
  attribute: string | null;
  date_scraped: string;    // pricing metadata only, not a rules field
  card_image_id: string;   // PRINTING id, e.g. "OP01-016" vs "OP01-016_p1"
  card_image: string | null;
}

export interface DonCardDto {
  inventory_price: number | null;
  market_price: number | null;
  card_name: string;
  card_text: string;
  rarity: string;           // observed constant "DON!!"
  card_type: 'DON!!';
  don_id: string | null;    // always null observed; purpose unconfirmed
  date_scraped: string;
  card_image_id: string;
  card_image: string | null;
  optcg_don_name: string;
}
```

These are wire types only. Nothing outside `/src/cards/api` should construct or destructure them directly except `/src/cards/normalization`.

## 6. Normalized Card Model

Normalization's hardest problem isn't field mapping, it's that **one card number is many rows**. `pickCanonicalPrinting()` (`canonicalPrinting.ts`) resolves it with a documented heuristic — *a data-hygiene decision, not a rules citation*:

1. Prefer the row where `card_image_id === card_set_id` (the un-suffixed base printing, true in every sample seen).
2. Otherwise, prefer the most recently `date_scraped` row, and emit an `ambiguous-canonical-printing` warning.
3. If printings disagree on `card_text`, emit `inconsistent-text-across-printings` and use the canonical row's text — never blend or average text.

`normalizeCardPrintings()` then maps the canonical row to `CardDefinition`:

```ts
export interface NormalizeCardPrintingsResult {
  definition: CardDefinition;
  alternatePrintingImageIds: string[]; // every other printing's card_image_id, for art pickers
  warnings: NormalizationWarning[];
}

export function normalizeCardPrintings(printings: CardPrintingDto[]): NormalizeCardPrintingsResult
export function normalizeDonCard(don: DonCardDto): { definition: CardDefinition; warnings: NormalizationWarning[] }
```

Field-level handling, each chosen to avoid guessing:

- **Numbers** (`coerceOptionalNumber`/`coerceCounterAmount`, `parseNumericField.ts`): numeric strings coerce to real numbers; `null`/non-numeric never becomes `NaN`, always `undefined`. `counter_amount: 0` is normalized to `undefined` specifically (2-10-2 reasoning above), distinct from other fields where `0` would be a real value.
- **Colors** (`parseColors`): split on `/` (best-guess placeholder, unconfirmed), map known tokens, drop+warn (`unrecognized-color`) on anything else.
- **Attributes** (`parseAttributes`): single-token map; unrecognized → `undefined` + `unrecognized-attribute` warning, never a fabricated value.
- **Tribal types** (`parseTypes`): `sub_types` is preserved **whole, as one element** of `CardDefinition.types`, and an `unsplit-sub-types` warning is *always* emitted when non-empty — there is no dictionary-free way to know "Animal Kingdom Pirates The Four Emperors" is two types, not four words of one type, so this code never tries.
- **`hasTrigger`**: `card_text.includes('[Trigger]')` — a text *presence* check only; the trigger's actual effect stays unparsed text.
- **`blockSymbol`/`illustration`/`illustrator`**: left `undefined` — the API exposes no source field for any of them. Documented as a known limitation (Section 14), not silently dropped.

`NormalizationWarning` (`warnings.ts`) is the structured, JSON-serializable record format every one of the above failure modes produces instead of throwing:

```ts
export type NormalizationWarningCode =
  | 'unrecognized-color' | 'unrecognized-attribute' | 'unsplit-sub-types'
  | 'missing-image' | 'ambiguous-canonical-printing' | 'inconsistent-text-across-printings';

export interface NormalizationWarning {
  code: NormalizationWarningCode;
  cardNumber: string;
  message: string;
  field?: string;
}
```

## 7. Saved Deck Model

`SavedDeck` (`decks/savedDeck.ts`) is the resilience guarantee for requirement #4. Every selected card embeds **both** its derived engine data and its raw API row, in place — not by reference, not by id:

```ts
export const SAVED_DECK_SCHEMA_VERSION = 1;

export interface SavedDeckCardSnapshot {
  cardNumber: string;          // = CardDefinition.cardNumber; the 5-1-2-3 copy-count key
  printingImageId: string;     // chosen art — cosmetic only, never affects rules
  imageUrl: string | null;
  definition: CardDefinition;  // what the ENGINE reads — never touches /src/cards/api again
  rawPrinting: CardPrintingDto;// frozen source row — lets a future normalizer re-derive offline
  quantity: number;            // 1-4; always 1 for the leader slot
  warnings: NormalizationWarning[];
}

export interface SavedDeck {
  schemaVersion: number;
  deckId: string;
  name: string;
  leader: SavedDeckCardSnapshot;
  cards: SavedDeckCardSnapshot[];  // quantities sum to exactly 50 once validated
  donDeckSize: 10;                 // always 10 generic DON!! per 5-1-2 — nothing to snapshot
  createdAt: string;               // ISO 8601
  updatedAt: string;
  source: { provider: 'optcgapi'; fetchedAt: string }; // provenance only, never read by the engine
}
```

Embedding `rawPrinting` is deliberately more than requirement #5 strictly asked for ("normalized card data for the engine"). The reasoning: if a normalization bug is found and fixed later, or the API's field meanings turn out to differ from what was assumed, every already-saved deck can be **re-normalized offline from data already on disk** — without ever touching optcgapi.com again, which may have changed shape or gone away by then. Trusting a frozen *derived* value forever is strictly riskier than being able to re-derive from a frozen *source* value. `schemaVersion` exists so a future loader can migrate old saves instead of failing on them outright.

## 8. Card Asset Caching Strategy

Phase 1 (this milestone, `assets/assetCache.ts`): images are referenced by **URL only**; the browser's normal HTTP cache handles repeat-view performance. `card_image: null` is a real, observed state (several promo rows have never had an image scraped) — surfaced as `status: 'missing'` so the UI renders a placeholder, never a broken `<img>`:

```ts
export type AssetStatus = 'remote' | 'cached' | 'missing';

export interface AssetRef {
  cacheKey: string;       // = card_image_id — assets are cached by PRINTING, never by card number
  url: string | null;
  status: AssetStatus;
}

export function buildAssetRef(printing: CardPrintingDto): AssetRef
```

Phase 2 (future, requirements #8/#9/#10 — cacheable, downloadable, offline-usable) is declared now as an interface with zero implementation, so Phase 1 callers never have to change shape when it lands:

```ts
export interface AssetCacheManager {
  has(cacheKey: string): Promise<boolean>;
  get(cacheKey: string): Promise<string | undefined>; // local/offline ref once downloaded (blob: URL, file path, ...)
  put(cacheKey: string, remoteUrl: string): Promise<void>;
  evict(cacheKey: string): Promise<void>;
}
```

This is the same "inject an interface, ship one trivial implementation now" pattern already used for `SeededRng` (engine) and `CacheStore` (Section below) — swapping in a real Cache Storage API / IndexedDB / filesystem-backed manager later touches zero call sites.

## 9. Deck Builder Flow

1. UI calls `withCache(store, key, () => fetchCardPrintings(fetchImpl, optcgEndpoints.cardPrintings(cardNumber)), { ttlMs })` to search/browse. `withCache` (`api/cache.ts`) de-dupes concurrent identical requests and serves a stale cached value (flagged `stale: true`) if a re-fetch fails, rather than blanking the UI on a transient optcgapi.com hiccup.
2. A successful fetch's `CardPrintingDto[]` goes straight into `buildCardLibraryEntry()` (`library/cardPrintingSummary.ts`), which normalizes once and returns a `CardLibraryEntry` — `definition` for engine-shaped fields, `printings`/`rawPrintings` (canonical printing sorted first) for the art picker, `warnings` for any "data may be incomplete" UI hint.
3. The deck builder renders entirely from `CardLibraryEntry[]`. Never from raw `CardPrintingDto[]` directly, and never re-implements normalization at the call site.
4. Picking a card records a `DeckCardSelection { libraryEntry, chosenPrintingImageId, quantity }` in builder-local UI state (outside `/src/cards` entirely — this is app/UI state, not engine or card-data state).

## 10. Save Deck Flow

1. Builder UI has accumulated one leader `DeckCardSelection` and N main-deck `DeckCardSelection`s.
2. `createSavedDeck({ deckId, name, leader, mainDeck, now? })` (`decks/saveDeck.ts`):
   - Runs `validateDeckConstruction()` (`decks/deckValidation.ts`) against the *normalized* `CardDefinition`s — total count must be exactly 50 (5-1-2), no Leader/DON!! card in the main deck (5-1-2-1), at most 4 copies of a card number summed across every printing choice (5-1-2-3), every card's color(s) legal for the Leader's colors (5-1-2-2, single-color case unambiguous; multicolor case takes the stricter subset reading and is flagged `[multicolor subset rule — TODO ruling confirmation]` in its rejection reason, pending an official ruling).
   - For each selection, looks up the chosen printing by `card_image_id` inside that entry's already-fetched `rawPrintings`. If the id isn't found (the selection went stale — e.g. the user picked an art variant, then the cache evicted and re-fetched with a different printing set), it's rejected with an explicit "selection is stale, re-fetch before saving" reason rather than silently substituting a different printing.
   - On any failure, returns `{ ok: false, reasons: string[] }` — every reason a plain string the UI can show as-is.
   - On success, returns `{ ok: true, deck: SavedDeck }` with `schemaVersion`, both timestamps, and `source.fetchedAt` all set from one injected clock call (`now`), so output is deterministic under test.
3. Persistence (localStorage / IndexedDB / future backend) is **deliberately not this module's job** — `saveDeck.ts` never imports `api/client.ts` and does zero I/O. The app layer decides where a `SavedDeck` actually gets written, the same separation the engine keeps between pure logic and storage.

## 11. Error Handling Strategy

Three error surfaces, each a discriminated union the caller is forced to handle, none of them ever a thrown exception crossing a module boundary:

```ts
// api/client.ts — network/API failures
export type CardApiError =
  | { kind: 'network'; message: string }
  | { kind: 'http'; status: number; url: string }
  | { kind: 'parse'; url: string; message: string }
  | { kind: 'shape-mismatch'; url: string; message: string };
export type CardApiResult<T> = { ok: true; data: T } | { ok: false; error: CardApiError };
```
`fetchAllSets`/`fetchCardPrintings`/`fetchDonCards` additionally run a per-row **shape guard** (checking only the handful of fields normalization actually needs) and drop individual malformed rows rather than rejecting an entire response over one unrelated field — this is what makes the adapter survive the API "changing later" (requirement #4) instead of hard-failing the whole library on the first schema drift.

```ts
// api/cache.ts — TTL + in-flight dedupe + stale-on-failure
withCache<T>(store, key, loader, { ttlMs, now? }):
  Promise<{ ok: true; data: T; stale: boolean } | { ok: false; error: unknown }>
```
A failed re-fetch with a stale value already cached returns that stale value (`stale: true`) instead of propagating the error — the deck builder degrades to "showing slightly old data," never to a blank screen.

```ts
// cards/decks/saveDeck.ts — domain/business-rule failures
export type CreateSavedDeckResult = { ok: true; deck: SavedDeck } | { ok: false; reasons: string[] };
```
Construction-legality and stale-selection failures are collected and returned together (not thrown one at a time), so the UI can show every problem with a deck at once rather than forcing fix-one/resubmit/fix-next cycles.

No code path in `/src/cards` throws past its own function boundary except `pickCanonicalPrinting([])` (an internal programmer-error guard for "zero printings," which should be unreachable given the API always returns at least one row for a card number that exists — callers never need to catch it).

## 12. TypeScript Interfaces

All real files, no logic-free stubs — every interface referenced above is implemented in:

`api/types.ts` · `api/client.ts` · `api/cache.ts` · `normalization/warnings.ts` · `normalization/canonicalPrinting.ts` · `normalization/normalizeCardPrinting.ts` · `library/cardPrintingSummary.ts` · `decks/savedDeck.ts` · `decks/deckValidation.ts` · `decks/saveDeck.ts` · `assets/assetCache.ts`

See those files for the authoritative shapes (same convention as `docs/01-rules-engine-blueprint.md` Section 20) — this document explains *why* each shape exists; the code is the one source of truth for the schema itself.

## 13. Tests

`npx tsc --noEmit` passes clean against the project's real `tsconfig.json` (`strict: true`, no DOM lib — `/src/cards/api` is environment-agnostic by construction, using an injected `FetchLike` and a hand-written query-string builder instead of `URLSearchParams`).

38 tests pass across the new suites plus the pre-existing engine suite, run against compiled output with the project's actual compiler options (see note below):

| Suite | Tests | Covers |
|---|---|---|
| `normalization/__tests__/canonicalPrinting.test.ts` | 6 | Base-printing selection, alternates dedup, text-mismatch warning present/absent, single-printing no-warning case, empty-array throw |
| `normalization/__tests__/normalizeCardPrinting.test.ts` | 17 | Leader/Character/Event/DON fixtures — field coercion, color/attribute mapping, `hasTrigger`, sub-types preservation+warning, DON identity choice |
| `decks/__tests__/deckValidation.test.ts` | 7 | 5-1-2 / 5-1-2-1 / 5-1-2-2 / 5-1-2-3 accept and reject cases, including the multicolor TODO-flagged case |
| `decks/__tests__/saveDeck.test.ts` | 4 | Full legal deck build (raw+normalized data both present), JSON round-trip losslessness, construction-illegal rejection, stale-printing-id rejection |
| `engine/state/__tests__/serialization.test.ts` (pre-existing) | 3 | Confirms this work didn't regress the engine's own JSON-serializability guarantees |

One real test bug was caught and fixed during verification: a Leader-fixture test asserted "zero warnings" when it actually meant "no text-mismatch warning" — it didn't account for the (intentional) `unsplit-sub-types` warning that fixture also triggers. Fixed to assert the specific warning code's absence instead of a total count.

**Verification note on tooling:** this sandbox's network policy blocks new npm registry fetches, and the project's `node_modules` here is missing the Linux-x64 native binary `vitest`'s bundler dependency (Rollup) needs — a platform-binary gap, not a code issue (the binary is already declared in `package-lock.json`; it just never got extracted for this OS). Tests above were executed by compiling the same source files to CommonJS with the project's own `tsconfig.json` settings (only `module`/`outDir` overridden) and running them under a minimal `describe`/`it`/`expect` shim backed by Node's `assert/strict`, replicating vitest's actual matcher semantics (including its "ignore `undefined`-valued object keys" behavior in `toEqual`). This is a sandbox-environment workaround for running tests in *this* session only — it changes nothing in the project itself. Run `npm install && npm test` on a machine with a working native binary (e.g. your own Windows checkout) to re-confirm with real Vitest.

## 14. Known Limitations

- **Multicolor `card_color` delimiter is unconfirmed.** No multicolor row has been observed live. `parseColors` guesses `/` and drops+warns on anything unrecognized — verify against a real multicolor card before trusting multicolor decks.
- **`sub_types` is never split.** "Animal Kingdom Pirates The Four Emperors"-style values are stored as one raw tag with a permanent warning. Tribal-type filtering in the deck builder will under-match multi-type cards until a maintained type-name dictionary exists.
- **5-1-2-2's multicolor subset-vs-intersect reading is a TODO**, not a confirmed ruling — `deckValidation.ts` takes the stricter subset reading and flags every rejection it causes so it's distinguishable from an unambiguous single-color rejection.
- **`blockSymbol`, `illustration`, `illustrator` are always `undefined`.** The API exposes no source field for any of them.
- **Stage cards' field pattern is assumed, not directly observed** (no Stage row has been captured live yet) — assumed consistent with Event's null pattern for power/life/counter.
- **No `[Trigger]`/`[Counter]`/`[Blocker]`/etc. structured parsing exists, by design.** `hasTrigger` is the one narrow exception (a text-presence check, not a parse). Effect templates are unbuilt future work.
- **DON!! cards have no `card_set_id`**, so `normalizeDonCard` uses `card_image_id` as both `cardDefinitionId` and `cardNumber` — fine since DON!! is never deck-construction-limited the way other cards are (5-1-2 fixes the DON!! deck at 10 generic cards), but worth remembering if DON!! identity is ever used elsewhere.
- **Phase 1 asset caching is URL-only** — no download, no offline storage yet. `AssetCacheManager` is declared but has zero implementations.
- **Persistence (where a `SavedDeck` actually gets written/read) is intentionally out of scope here** — `/src/cards/decks` produces the data; storing it is an app-layer decision for the next milestone.
- **`/api/sets/filtered/` and `/api/don/filtered/` are not used anywhere in this layer** for anything load-bearing, given the confirmed `card_color` no-op bug — every consumer must re-filter client-side.

## 15. Next Recommended Task

**First implementation milestone (delivered this session):** the full vertical slice above — fetch → normalize → browse → save, fully typed, fully tested, zero UI. This is intentionally "deep and narrow" rather than broad: one real card number's worth of data correctly flows end-to-end from a live-shaped API row to a JSON-serializable `SavedDeck`, before any pixel of UI exists.

**Next recommended task:** build the minimal localStorage-backed persistence for `SavedDeck` (a `/src/cards/decks/deckStorage.ts` with `listSavedDecks()`/`loadSavedDeck(id)`/`writeSavedDeck(deck)`, behind a `DeckStore` interface so swapping to IndexedDB or a future backend later doesn't touch callers — same pattern as `CacheStore`/`AssetCacheManager`). That closes requirement #10 ("support future offline/local deck loading") for real, and is the last piece standing between this layer and a working (if UI-less) save/load round trip. After that: the actual deck-builder screen (`/src/app/screens`), wired to `library/cardPrintingSummary.ts` for browsing and `decks/saveDeck.ts` for saving.

**Status update:** both of the above are now done. `deckStorage.ts` exists and is tested; the full App Shell + Deck/Card UI (deck builder, card library, saved decks, deck select, and a placeholder match screen) is built on top of this layer exactly as anticipated, with zero changes needed to anything in this document. See `docs/03-app-shell-and-ui.md`.
