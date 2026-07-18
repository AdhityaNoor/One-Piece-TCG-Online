# Match Screen Performance Plan

Grounded in a read-through of the current `MatchScreen` render path, `board/projection`, `matchStore`, and the 24 components under `src/app/components/match/`. Phases 0 and 1 are implemented (see their results sections below); Phases 2–4 and Phase 1.5 are still planning-only.

## What's actually causing the sluggishness

1. **`MatchScreen.tsx` (2,501 lines) subscribes to the entire engine state as one blob** — `useMatchStore((s) => s.state)`. The engine returns a brand-new `GameState` object on every valid action (by design — that's the "new state each dispatch" contract). So every single action, no matter how small, produces a new top-level reference and forces this one giant component to re-evaluate in full.

2. **Zero `React.memo` anywhere in the match UI.** Checked all 24 files in `src/app/components/match/` — none of them (`PlayerBoardPanel`, `BoardCardTile`, `DockHand`, `DonStack`, `PileStack`, `ActionBar`, `ActionLogPanel`, `PendingChoicePrompt`, etc.) are memoized. There is no re-render firewall anywhere in the tree, so #1's full-tree re-render actually reconciles the entire board every time, not just the card that changed.

3. **Board projection is rebuilt from scratch on every render, unmemoized.** `MatchScreen.tsx:361-362` calls `projectPlayerBoard(matchState, defs, images, ...)` directly in the render body for both players — no `useMemo`. This walks every zone (hand, characters, stage, life, DON, trash, deck) for both sides and rebuilds `CardView` objects each time, even for renders triggered by something UI-only (opening the log panel, a hover state, a modal).

4. **Card art has no responsive/thumbnail variant.** `cardView.ts` resolves one fixed `imageUrl` per card (`images[instance.cardDefinitionId]`) — the same 84–132KB webp is used whether it's a 150×210px board tile or a full-size zoom preview. No `loading="lazy"`, no explicit `width`/`height` on the `<img>` tags in `BoardCardTile.tsx` (layout-shift risk on top of the transfer weight).

**Verified NOT a problem** (worth not re-investigating later):
- `CardMovementOverlay` uses the Web Animations API (`node.animate`) with correct cleanup (cancels timers/animations on unmount) — GPU-composited, not a likely main-thread cost.
- `ScaleToFit` already went through 3 iterations and landed on pure CSS `container-type: size` + `cqh` units — no JS-computed transform scaling left.
- Zustand stores are already split by concern (`matchStore`, `cardAnimationStore`, `phaseAnnounceStore`, `settingsStore` are separate stores), so the blast radius is contained *within* matchStore, not cross-store noise.

## Phase 0 results (baseline measurement — done)

Two diagnostic test files were added as permanent, re-runnable tools (not one-off scripts):

- `src/board/projection/__tests__/projectPlayerBoardCost.phase0.test.ts` — runs in plain Node, no browser needed. **Ran successfully in this environment.**
- `src/app/screens/__tests__/matchScreenPerf.phase0.test.tsx` — mounts the real `MatchScreen` in jsdom via `React.Profiler` and counts commits + `projectPlayerBoard()` calls per dispatched action (give DON, declare attack, activate blocker). **Written and ready, but could not be executed in this sandbox** — jsdom hangs indefinitely here even for a zero-React sanity test (isolated by testing a trivial `document.body.innerHTML` assertion under `// @vitest-environment jsdom` with no React at all — it hung the same way, ruling out this test's own code as the cause). This is an environment issue with this sandbox, not the test. Run it locally (`npx vitest run src/app/screens/__tests__/matchScreenPerf.phase0.test.tsx`) or in CI to get real commit counts before starting Phase 1.

**What the Node benchmark actually measured** — `projectPlayerBoard()`'s own compute cost, at a representative mid-game board (5 characters/side, 6 hand cards/side, 5 life cards/side, DON on both sides), 2000 iterations:

- ~0.05ms per both-sides call (both players projected, as `MatchScreen.tsx:361-362` does every render) on this sandbox's CPU.
- Scales with board size as expected: 2 characters/side → 0.029ms, 5 → 0.033ms, 10 → 0.048ms (both-sides call).

**This changes the emphasis of Phase 1.** The projection function itself is cheap in isolation — sub-millisecond even completely unmemoized. The actual cost isn't rebuilding the projection data; it's that every one of the ~24 match components has zero `React.memo`, so a cheap-but-unmemoized projection call is followed by React re-rendering (running every component function, then diffing, then committing) the *entire* board tree on every single dispatch, no matter how small the change. `useMemo`-ing the projection call still matters (it's still needless recomputation and it produces new object references that would defeat `React.memo` even if added), but **`React.memo` on the leaf/mid components is where the real win is**, not the projection math. Phase 1 below is unchanged in content but this is why it's ordered "memoize projection AND add React.memo together" rather than treating the projection as the expensive part.

Real render-commit counts, main-thread time under CPU throttling, and low-spec-device FPS still need the jsdom harness (or a real device) — that's Phase 4's job once Phase 1 lands, and remains a known limitation of what could be verified from here today.

## Phase 1 results (re-render blast radius — done, needs local verification before merge)

Scope grew significantly beyond the original "add `useMemo` + wrap 7 components in `React.memo`" plan, discovered mid-implementation:

- **`useBoardSelection.ts` (1,309 lines) had to be touched too.** It returns ~28 functions (`hasActivateMain`, `canGiveDonOnCard`, `handleCardTap`, etc.) and a handful of derived values (`counterProgress`, `donChoiceProgress`, `fieldChoiceInfo`), every one of them a fresh closure/object on every render — none `useCallback`/`useMemo`'d. These flow straight into `PlayerBoardPanel`/`DockHand`/`ActionBar` as props (some directly, some called *during* the child's own render, e.g. `hasActivateMain(card)`). Wrapping those 3 components in `React.memo` without fixing this would add comparison overhead for zero benefit — exactly the failure mode this doc's "Known limitations" section already called out.
- Rather than hand-writing a `useCallback` dependency array for each of the ~28 functions (real risk of a stale-closure correctness bug in the single most gameplay-critical file in the app, with no way to verify by rendering here — jsdom is broken in this sandbox), added `src/app/hooks/useStableDelegates.ts`: a small generic "latest ref" hook. Every function gets a permanently-stable wrapper that always delegates to the current render's real implementation via a ref — standard, low-risk pattern for exactly this situation, no per-function dependency bookkeeping. `counterProgress`/`donChoiceProgress`/`fieldChoiceInfo` got real `useMemo` (they're plain derived data, not delegate-safe), and the hook's whole return value is now `useMemo`'d too, so `selection` itself (the single prop `ActionBar` receives) is reference-stable when nothing in it actually changed.
- **`PlayerBoardPanel`'s prop contract changed**, not just wrapped in `memo()`: `onCardTap`/`onAttachedDonLabelTap` now take `ownerPlayerId` as a parameter (supplied internally from `board.playerId`, which the component already receives) instead of MatchScreen pre-binding it into a new closure per side per render; same for `canGiveDonOnCard`/`onGiveDon` taking `board` internally instead of a pre-bound `topPlayerBoard`/`bottomPlayerBoard` closure. This means `MatchScreen` can pass `selection.handleCardTap`/`selection.canGiveDonOnCard`/etc. straight through with **zero new closures**, sidestepping a much bigger problem: those props are assembled inside JSX that sits *after* several early returns in `MatchScreen`, and hooks (`useCallback`) can't be called after a conditional return (Rules of Hooks). Only one call site for `PlayerBoardPanel` exists in the whole repo (`PlayerSideRow`, itself only called twice, both in `MatchScreen`), so this was a contained, low-blast-radius change — confirmed by grep before touching it.
- `MatchScreen.tsx` itself: a new block of hooks (`useMemo`/`useCallback`) was hoisted to the top of the component, above every early return, computing null-safe versions of `bottomPlayerId`/`topPlayerId`/`actingPlayerId`/`bottomPlayerBoard`/`topPlayerBoard`/`battlePowerInstanceIds`/`openZoom`/the attack-target-hover handler/per-side `DockHand` callback bundles. A narrowing guard (`if (!bottomPlayerBoard || ...) return null;`) right after the existing `if (!matchState) return (...)` early return hands the rest of the function the same non-null names it already used, so the ~2,000 lines of JSX after that point needed only the specific prop-value edits described above, not a rewrite.
- `ActionLogPanel`/`ActionLogDock` were wrapped in `React.memo` too (not in the original 7) — their props (`log`, `playerNames`, `viewerPlayerId`) are already direct state reads, no extra wiring needed, so this was a free, low-risk win found while in the area.

**Deliberately deferred: `BoardCardTile`, `DonStack`, `PileStack`.** Their `card`/`cards` props come straight from `projectPlayerBoard`'s output, which rebuilds every `CardView` fresh on every *real* board change (no per-card memoization inside the projection layer itself). So even wrapped in `React.memo`, these three would get a new prop reference every time `PlayerBoardPanel` legitimately re-renders — comparison overhead, zero skip-render benefit. The actual fix (memoizing individual `CardView` construction inside `board/projection` so an unrelated card's props stay referentially stable) is a data-layer change, not a component-wrapping one — tracked as a **Phase 1.5 follow-up**, not done here.

**Verification performed, and what could not be:**
- `vite build`'s esbuild transform pass completed cleanly twice ("589 modules transformed", no errors) — confirms no syntax/import/JSX-structural errors across the whole app, including every changed file. Rollup's bundling step after that hung in this sandbox (same class of issue as Phase 0's jsdom hang — not investigated further, out of scope).
- `tsc -p tsconfig.app.json --noEmit` could not complete in this sandbox — killed after 40–85s+ across several attempts. Confirmed via a trivial single-file check that this is genuine slowness (real CPU burned on lib-loading overhead, ~25s just for that), not a hang, but a full project check needs more time than any single command here allows. **Not verified by the compiler — run `npx tsc -p tsconfig.app.json --noEmit` locally before relying on this.**
- Did a manual, line-by-line review of every changed function-signature contract (`PlayerBoardPanel`'s props, `PlayerSideRow`'s mirrored types, `useBoardSelection`'s return shape through `useStableDelegates`, the two `DockHand` callback bundles) to check type consistency by inspection, since the compiler couldn't be run to confirm it directly.
- `src/board/projection/__tests__/projectPlayerBoardCost.phase0.test.ts` (2/2), `playTestEnelDonLimit.test.ts` (1/1), `resolvePlayerName.test.ts` (2/2) all still pass — but none of these import the actually-changed files (`matchStore` doesn't depend on `useBoardSelection`/`PlayerBoardPanel`/etc.), so this is a "didn't break the wider import graph" signal, not direct coverage.
- **No jsdom test could run** (Phase 0's environment issue, unchanged) — the actual UI-interaction behavior of this change (does tapping a card still do the right thing after `PlayerBoardPanel`'s contract change?) has **not been verified by rendering or by a human**. This is the single highest-risk gap: **a manual playtest of a full turn (play a card, attach DON!!, attack, block, activate an effect) is required before trusting this.**

## Plan (in order — each phase should be measured before starting the next)

**Phase 0 — Baseline measurement.** Profile before touching anything: React DevTools Profiler render count per action, Chrome Performance panel with 4x CPU throttle, on a standard turn (attack + block + DON attach). Without this, "should be faster" isn't verifiable.

**Phase 1 — Cut the re-render blast radius (highest ROI, lowest risk).**
- `useMemo` the board projection calls, keyed on the state/images actually needed — stop rebuilding both players' full board on every render.
- Add `React.memo` to the leaf/mid components (`BoardCardTile`, `PlayerBoardPanel`, `DockHand`, `DonStack`, `PileStack`, `ActionLogPanel`, `ActionBar`) so a change to one card doesn't reconcile the whole board.
- These two have to land together — memoizing a component that's still handed a freshly-rebuilt projection object every render gets no benefit.
- Longer-term: `MatchScreen` itself is a 2,501-line monolith; consider narrowing what it reads from the store (per-zone/per-field selectors instead of the whole `state`) so it isn't the thing re-evaluating on every action in the first place.

**Phase 2 — Image weight and layout stability.**
- Explicit `width`/`height` or `aspect-ratio` on every card `<img>`.
- `loading="lazy"` / `decoding="async"` for off-screen or face-down zones.
- A smaller board-tile image variant separate from the zoom/full-art asset (this is an asset-pipeline task, not a CSS tweak — needs its own scoping, flagged as a limitation below).

**Phase 3 — Animation/interaction audit under throttling.** Re-verify (empirically, not just by reading code) that no rAF loop or `getBoundingClientRect` polling keeps running after an animation finishes, under actual CPU throttling rather than an idle desktop.

**Phase 4 — Verification.** Re-run Phase 0's profiling after each phase and diff render counts / main-thread time. Consider a lightweight render-count regression test so memoization doesn't silently rot later.

## Files/folders involved
`src/app/screens/MatchScreen.tsx`, `src/board/projection/*.ts`, all 24 files in `src/app/components/match/`, `src/board/projection/cardView.ts`, `src/cards/assets/assetCache.ts` (adjacent, Phase-2 caching already documented there as a future milestone).

Phase 1 additionally touched/added: `src/app/hooks/useStableDelegates.ts` (new), `src/app/components/match/useBoardSelection.ts`, `src/app/components/match/PlayerBoardPanel.tsx`, `src/app/components/match/DockHand.tsx`, `src/app/components/match/ActionBar.tsx`, `src/app/components/match/ActionLogPanel.tsx`.

## Known limitations
- Can't get real FPS/main-thread numbers from this environment — Phase 0's commit-count harness needs to run locally or in CI (this sandbox's jsdom hangs on any test, unrelated to this project's code) or on an actual device/throttled browser profile.
- The thumbnail-variant work (Phase 2) implies either a build-time image pipeline or a second generated asset per printing across a 906MB / 8,346-file image set — that's a real scoping decision, not a quick fix.
- Memoization only helps where props are reference-stable; if a parent keeps passing new inline objects/callbacks into a memoized child, the memo does nothing. Phase 1 needs to check callback/prop identity, not just wrap components in `memo()`.
- **Phase 1 is unverified by both the TypeScript compiler and any rendered/manual test in this sandbox** (see Phase 1 results above) — treat it as needing a local `tsc` run + a manual playtest before merging, not as done-and-safe.
- Phase 1.5 (not started): per-card memoization inside `board/projection` so `BoardCardTile`/`DonStack`/`PileStack` can actually benefit from `React.memo` — currently skipped because their `card`/`cards` props are rebuilt fresh by the projection on every real board change.

## Next recommended task
Before anything else: run `npx tsc -p tsconfig.app.json --noEmit` locally and manually playtest one full turn (play a card, attach DON!!, attack, block, activate an effect) to confirm Phase 1's `PlayerBoardPanel`/`useBoardSelection` changes didn't break interaction behavior — this sandbox couldn't verify either. Once confirmed, re-run the Phase 0 profiling harness (`matchScreenPerf.phase0.test.tsx`, which also needs a working jsdom) to get real before/after commit-count numbers, then move to Phase 2 (image weight) or Phase 1.5 (per-card projection memoization) depending on what those numbers show is still costly.
