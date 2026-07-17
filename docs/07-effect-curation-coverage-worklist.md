# Effect Curation — Coverage Addition Worklist

## Progress update — 2026-07-17

Latest regenerated coverage reports `2287` curated non-vanilla cards, `115` partial cards, and `2172` fully curated cards (`95.0%` of cards with text). The name-exclusion cluster and base/current-power filter cluster are closed, `EB01-030` is now covered through source-card bottom-deck movement, `EB02-023` is now covered through removed-field destination gates, `OP01-067`/`OP05-097` are now covered through the generic in-hand card cost aura, `OP02-024` is now covered through mixed name-or-type aura groups, `OP02-027` is now covered through all-field-DON-rested field-removal immunity, `OP03-028`/`OP03-036`/`OP07-078` are now covered through Leader-or-Character set-active selection, `OP04-086` is now covered through the existing battle-K.O. onBattle wrapper, `OP04-118` is now covered through filtered keyword auras, `OP05-002` is now covered through reusable union target selection, `OP05-080` is now covered through explicit deck shuffling, `OP06-011` is now covered through named Leader/Stage/Character rest targeting, `OP06-041` is now covered through all-character rest, `OP07-017` is now covered through generic Stage-to-trash movement, `OP07-026`/`OP07-059` are now covered through rested DON!! target selection, `OP07-036` is now covered through min-cost self-rest sequencing, `OP07-060` is now covered through the existing no-other-named-Character gate, `OP09-092` is now covered through the generic hand-count differential gate, `OP10-026`/`OP10-027` are now covered through source-instance bottom-deck movement, `OP10-033` is now covered through the existing rested typed Character gate and rested DON!! targeting, `OP11-067` is now covered through the existing set-active cost filter, `OP15-032` is now covered through base-cost set-active filtering, `EB04-057` is now covered through the filtered field-removal immunity aura, `OP12-061` is now covered through named next-play hand discount filters, `P-083` is now covered through filtered Character hand-trash cost, and `ST22-001`/`ST22-017` are now covered through reveal-from-hand branch sequencing.

Next high-yield clusters should be selected from the live `effect-partial-curation.csv`, not from the original counts below. The strongest remaining clusters appear to be Life manipulation/reorder, filtered removal immunity, destination-sensitive triggers, reveal-from-hand costs, dynamic scaling, and broader static in-hand/hand-play restrictions.

_Source of truth: `effect-partial-curation.csv` (127 marker rows over 115 partially-curated cards) + `effect-coverage.csv`. Regenerate with `npm run coverage`. Analysis date: 2026-07-18._

## Where coverage actually stands

`effect-coverage.csv` reports every one of the 2,287 non-vanilla cards as `status = curated` — so raw status coverage is 100%. That number is misleading. **115 of those cards are only _partially_ curated**: a curated program handles most of the text but one clause was dropped, approximated, or deferred, each recorded as a `NOTE:`/`PARTIAL:` marker. The remaining coverage work is *not* net-new cards — it is closing these partial gaps.

The old `scripts/effect-triage/run.py` returns `expressible=0 needsPrimitive=0 defer=0` because it only classifies `needsTemplate` cards, and there are none left. The live backlog now lives in the partial-curation report, not the triage report.

Breakdown of the 127 marker rows:

| kind | count | meaning |
| --- | ---: | --- |
| partial | 107 | card curated, one clause approximated/deferred |
| dropped | 4 | a clause was silently dropped (usually a filter) |
| batchNote | 8 | per-set triage batch summary (not a single card) |
| deferred | 4 | whole sub-effect deferred, needs a real primitive |
| notImplemented | 4 | unassigned defer stubs |

## Highest-yield primitives to add (ranked by cards unlocked)

Each row is a single, well-scoped engine/template addition. Ranking favors cards where the named clause is the *only* missing piece (partial → full in one change).

| # | Primitive to add | Cards | Class | Notes |
| --- | --- | ---: | --- | --- |
| 1 | **Name-exclusion filter** (`excludeCardNames` / "other than this Character") on target & deck-search groups | 11 | small | For ~8 of these it is the *sole* dropped clause → immediate full flip. `excludeSource` already exists on `registerKoReplacementAura`; generalize it. |
| 2 | **Life reorder / manipulation** (top↔bottom, to-Life, turn face) | 12 | medium | Big cluster: ST13 counter events + EB04-060, OP01-063, OP03-077, OP13-005. Touches the Life zone ordering model. |
| 3 | **Dynamic scaling** (`+X per N`, "for each") | 9 | large (defer) | Real new capability — value depends on runtime board/trash count. Highest effort; do last. |
| 4 | **Base-power gate / power filter** on target groups | 8 | small | `{ minBasePower / maxBasePower }` predicate; mirrors existing `maxCost`/`exactCost`. |
| 5 | **KO / removal-immunity filter** (typed & colored) | 6 | medium | `koImmunityControllerCharactersAll` has no type/color filter; add `anyOfTypes` + color. |
| 6 | **Destination / return filter** ("returned to hand" vs deck) | 5 | medium | Effect-outcome routing, not just a predicate. |
| 6 | **Typed hand-cost aura** (`cost −1` for typed hand cards) | 5 | medium | No typed-hand-cost aura exists yet. |
| 8 | **Named-present gate** (`if you have [Name]`) | 3 | small | Memory notes a `named-control gate` primitive was added 2026-07-06 — verify whether it already covers these before re-implementing. |
| 9 | **Negate effect** | 4 | large (defer) | Needs stack-level effect cancellation; defer. |

## Recommended first milestone — name-exclusion filter (primitive #1)

**Why this one first.** It unlocks 11 cards and, unlike the others, is the *only* missing clause on the majority of them — so those flip cleanly from partial to full with no approximation left behind. It is a pure target-selection predicate: no new timing, no stack changes, low regression risk. The plumbing half already exists (`excludeSource: true` on `registerKoReplacementAura`), so this is a generalization, not a greenfield capability.

**Cards it closes (all currently `dropped`/`partial` on this exact clause):**
`OP08-010`, `OP08-047`, `OP12-007`, `OP12-047`, `OP12-054`, `OP12-056`, `OP12-097`, `OP16-085`, `P-029`, `ST21-015`, `OP05-106`.

**Scope.** Add an optional `excludeCardNames?: string[]` (and reuse/promote `excludeSource?: boolean`) to the shared filter predicate consumed by the `characters` target group and the deck-search groups. Apply it in the group-resolution filter alongside `anyOfTypes` / `maxCost`. No parser change — the assignment authors pass the excluded name literally.

**Tests.** Per the project rule (a test for every template): one filter unit test (group resolution excludes the named card), one `excludeSource` self-exclusion test, and re-curate + assert full curation for at least OP08-047, OP12-007, and P-029.

**Known limitations after this milestone.** Name matching is by card metadata name, not by `cardNumber`; alias/alternate-name cards (e.g. Kouzuki Oden aliases) still need the separate name-alias primitive. Life reorder (#2) and dynamic scaling (#3) remain the two largest untouched clusters.

## Next recommended task

After #1 lands, take **#4 (base-power gate)** — another small predicate that flips 8 cards — before the medium/large clusters. Sequence: 1 → 4 → 8 (verify) → 5 → 6 → 2 → (defer 3, 9).
