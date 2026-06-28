# App Shell & UI v1.0

Covers the "App shell + Deck/Card UI" milestone: React app scaffold, the Zustand app-store layer, shared UI components, and every screen needed to close the navigation graph **Main Menu → Deck Builder → Save → Saved Decks → Play → Deck Select → Match** end-to-end. Implements requirements 1–3 and 6–10 from `CLAUDE.md`'s card-library/deck-save spec at the UI layer; `docs/02-card-library-and-deck-architecture.md` covers the data layer this UI consumes and remains the source of truth for it.

No gameplay engine work is in scope here. The Match screen is an explicit, clearly-labeled placeholder — see Section 11.

---

## 1. What You Are Building

A `/src/app` layer — React components, Zustand stores, and a hand-rolled stack-based screen router — that sits **above** `/src/cards` and `/src/engine`, never inside them:

1. **Navigation** (`navigationStore.ts`) — a typed stack of `NavigationTarget`s, no router library, because the graph is small and every "click" should already look like the `dispatchAction` calls the future rules engine will use.
2. **App store layer** — five more Zustand stores (`settingsStore`, `cardLibraryStore`, `deckBuilderStore`, `savedDecksStore`, `matchSetupStore`), each owning exactly one slice of UI-flow state and never game-rule state.
3. **Shared components** (`/src/app/components`) — presentational primitives (`Button`, `Modal`, `CardTile`, `CardImage`, `DeckListSummary`, `ScreenShell`, chips, etc.) with no business logic.
4. **Screens** (`/src/app/screens`) — one component per `NavigationTarget` variant, each wiring components to stores and nothing else.

## 2. Why This Structure Is Correct

- **UI never mutates game state, because there is no game state here yet.** Every store in this layer holds UI-flow state (which screen, what's in the deck-builder draft, which saved deck is selected) or wraps a pure `/src/cards` function. `deckBuilderStore.save()` does not implement deck-legality rules — it calls `createSavedDeck()`/`validateDeckConstruction()` from `/src/cards/decks`, the same pure functions `docs/02` already specifies and tests. The live legality banner in the Deck Builder screen calls `useDeckBuilderLegality()`, which calls that *exact same* validator — never a parallel UI-only rule check. This is the project's "single source of truth" rule applied to the UI layer.
- **Stack-based navigation, not a router library.** `navigationStore.stack: NavigationTarget[]` with `navigateTo`/`goBack`/`resetTo` is enough for this graph's size and keeps every screen transition serializable and inspectable — consistent with "design every click as if it will later be a network request." `resetTo` exists specifically for one-way transitions (e.g. quitting a match should not let "back" return you into a finished match).
- **One store, one job, no duplication.** `cardLibraryStore` is the single owner of every live optcgapi.com call made while browsing; both the Card Library screen and the Deck Builder's Browse/Search-by-ID tabs read it, so a set fetched once is never re-fetched. `matchSetupStore` is the single owner of "which saved deck is Player 1/Player 2 using," shared by Deck Select and Match — neither screen keeps its own copy.
- **Errors as values, all the way up.** `CardApiResult<T>` (data layer) → `LoadStatus`/`SearchByIdStatus` (cardLibraryStore) → conditional rendering (screens). `DeckLoadResult` (`{ok:true,deck}|{ok:false,deckId,reason}`) flows the same way into Saved Decks/Deck Select/Match, so a corrupted localStorage entry degrades to an inline error row instead of crashing the screen.
- **Render-prop sharing over copy-paste.** `CardSetBrowser` (`/src/app/screens/shared`) owns the set-picker/search/filter/pagination logic once; Card Library and the Deck Builder's Browse tab each supply only a `renderEntry` tile. Without this, the ~100-line fetch/filter/paginate block would exist twice and drift.
- **Tap-vs-action collision is solved structurally, not with z-index tricks.** `CardTile`'s `onClick` is always the zoom trigger; every action button rendered inside its `actionSlot` (add/remove/set-leader) calls `event.stopPropagation()` in its own handler, so the two gestures can never both fire from one tap.

## 3. Files / Folders Involved

```
/src/app
  /components
    Button.tsx, Toggle.tsx, MenuRow.tsx, Pill.tsx          — primitives
    ColorChip.tsx, SetChip.tsx, CategoryChip.tsx            — filter chips
    Modal.tsx                                               — portal + Esc/backdrop close
    CardImage.tsx, CardTile.tsx, CardDetailModal.tsx        — card display
    DeckListSummary.tsx                                     — one row in any deck list
    ScreenShell.tsx                                          — shared screen frame (title/back/headerRight)
    index.ts                                                 — barrel

  /lib
    runtime.ts            — shared singletons: browserFetch, cardLibraryCache, deckStore, generateDeckId, nowIso
    cardColors.ts          — CARD_COLOR_TOKENS, ALL_CARD_COLORS (Tailwind class lookup per Color)
    formatCardApiError.ts  — CardApiError -> user-facing string

  /store
    navigationStore.ts     — NavigationTarget union, stack, navigateTo/goBack/resetTo
    settingsStore.ts       — debug/display toggles
    cardLibraryStore.ts    — live API browse/search state (shared by Card Library + Deck Builder)
    deckBuilderStore.ts    — in-progress deck draft (Browse/Search/Clipboard selections, save())
    savedDecksStore.ts     — reactive wrapper over the pure deckStore (list/load/save/remove)
    matchSetupStore.ts     — deckIdA/deckIdB picks between Deck Select and Match
    index.ts                — barrel

  /screens
    MainMenuScreen.tsx, SettingsScreen.tsx, DebugToolsScreen.tsx
    CardLibraryScreen.tsx
    /deckBuilder
      DeckBuilderScreen.tsx, BrowseTab.tsx, SearchByIdTab.tsx, ClipboardImportTab.tsx,
      DeckBuilderResultTile.tsx, index.ts
    SavedDecksScreen.tsx
    DeckSelectScreen.tsx
    MatchScreen.tsx                — PLACEHOLDER, see Section 11
    /shared
      CardSetBrowser.tsx, index.ts — set-picker/filter/pagination, shared by 2 screens
    ComingSoonScreen.tsx           — generic fallback, currently unused (every NavigationTarget has a real screen)
    index.ts

  App.tsx                  — thin switch over useCurrentScreen()
```

This matches the project's suggested `/src/app/{components, screens, localHotseat, store, hooks}` convention; `localHotseat` and `hooks` are not yet needed (no engine to wrap) and were not speculatively created.

## 4. App Store Layer (state shapes)

| Store | Owns | Key shape |
|---|---|---|
| `navigationStore` | Screen stack | `NavigationTarget = {screen:'main-menu'} \| {screen:'settings'} \| {screen:'debug-tools'} \| {screen:'card-library'} \| {screen:'deck-builder', deckIdToEdit?} \| {screen:'saved-decks'} \| {screen:'deck-select'} \| {screen:'match', deckIdA, deckIdB}` |
| `cardLibraryStore` | Live API browse/search | `sets`, `entriesBySetId: Record<setId, CardLibraryEntry[]>`, `filter: CardLibraryFilter`, `visibleCount` (pagination), `searchById: {queryId, status, result, error?}` |
| `deckBuilderStore` | In-progress deck draft | `editingDeckId`, `name`, `leaderSelection: DeckCardSelection \| null`, `mainDeckSelections: DeckCardSelection[]`, `clipboardImportSummary`, `lastSaveResult` |
| `savedDecksStore` | Persisted decks (reactive) | `entries: DeckStoreListEntry[]` (cheap `{deckId,name,updatedAt}` index) + `load`/`save`/`remove` delegating to the pure `deckStore` from `docs/02` |
| `matchSetupStore` | Seat picks | `deckIdA: string \| null`, `deckIdB: string \| null`, `setDeckA`, `setDeckB`, `swapSides`, `reset` |
| `settingsStore` | Debug/display toggles | (drives `DebugToolsScreen`; not consumed by gameplay) |

`deckBuilderStore.save()` never invents deck-legality logic itself — it builds a `deckId` (reusing `editingDeckId` when editing) and hands `{leader, mainDeck}` straight to `createSavedDeck()` from `/src/cards/decks`. On success it calls `useSavedDecksStore.getState().save(result.deck)` so the Saved Decks list reflects the new/updated deck immediately, without the two stores needing to know about each other beyond that one call.

## 5. Screen Inventory & Navigation Graph

```
Main Menu
 ├─ Play          -> Deck Select -> Start Match -> Match (Pause -> Quit -> Main Menu)
 ├─ Deck Builder  -> (Browse | Search by ID | Import) -> Save -> Saved Decks
 ├─ Card Library  -> (zoom only, no selection side-effects)
 ├─ Saved Decks   -> Edit -> Deck Builder (deckIdToEdit) | Delete (confirm modal) | New Deck
 ├─ Settings
 └─ Debug Tools
```

"Play" is disabled on the Main Menu while zero decks are saved (`deckCount < 1`), so Deck Select is never reachable with an empty deck list. Every transition is a plain `navigateTo({...})`/`goBack()`/`resetTo({...})` call against `navigationStore` — no screen reads or writes another screen's local state directly.

## 6. Deck Builder Flow (3 creation methods)

`DeckBuilderScreen` seeds itself once on mount: if `navigationStore`'s current target carries `deckIdToEdit`, it loads that saved deck via `savedDecksStore.load()` and calls `deckBuilderStore.startEditingDeck(deck)`; otherwise `startNewDeck()`. This is safe as a mount-only effect because `App.tsx`'s switch-on-navigation model fully unmounts the screen between visits — there is no stale-state code path to guard against.

The three tabs all write into the same `leaderSelection`/`mainDeckSelections` state, so legality feedback and the Save action behave identically regardless of which method built the deck:

- **Browse** (`BrowseTab` → shared `CardSetBrowser`) — pick a set, filter by color/category/text, tap a tile's +/− or "Set Leader" button. Only ever adds/sets the *first* printing of a card number (`rawPrintings[0]`) — see Section 10.
- **Search by ID** (`SearchByIdTab`) — resolves one card id across all endpoint families via `resolveCardPrintingsById`, same result tile as Browse.
- **Clipboard Import** (`ClipboardImportTab`) — parses pasted `<qty>x<cardId>[_variant]` lines via `parseClipboardDeckList`, resolves each unique id against the live API, and **replaces** the current main deck (and the Leader, if exactly one Leader line is found). This is a deliberate replace, not a merge — surfaced in the UI's own warning text. Every line that fails to resolve, resolves to the wrong printing, or doesn't even parse is shown back to the user (`issues`/`unresolvedEntries`/`invalidLines`), per the data layer's "never silently dropped" contract.

A live legality banner (`useDeckBuilderLegality()`) re-runs `validateDeckConstruction` on every render — there is no separate "is this deck valid" UI-only check anywhere.

## 7. Save Deck Flow

1. User taps "Save Deck" → `deckBuilderStore.save()`.
2. If no Leader is selected, returns `{ok:false, reasons:['No Leader selected.']}` immediately — no API/storage call.
3. Otherwise calls `createSavedDeck({deckId, name, leader, mainDeck, now})` (pure, from `docs/02`), which re-validates construction legality and, only if legal, builds a fully self-contained `SavedDeck` (raw + normalized card data snapshotted, per requirement #3–5).
4. On success: `savedDecksStore.save(deck)` persists it via the localStorage-backed `deckStore` and refreshes the reactive `entries` list; `lastSaveResult` flips to `{ok:true, deck}` and the screen offers a "View Saved Decks" shortcut.
5. On failure: `lastSaveResult` carries the rejection `reasons` array, rendered inline — never thrown.

## 8. Saved Decks / Deck Select / Match Flow

- **Saved Decks** lists `savedDecksStore.entries` (the cheap index) and calls `load(deckId)` per row to enrich the display (leader name/art/colors, card count) — synchronous local JSON parsing, not a network cost. A row whose `load()` fails (`DeckLoadResult.ok === false`, e.g. corrupted JSON) still renders, with only a Delete action, never a crash. Delete is gated behind a confirmation `Modal`, mirroring the existing pattern in `DebugToolsScreen`.
- **Deck Select** picks one saved deck per seat into `matchSetupStore` (not local component state — see Section 2). The same deck is explicitly allowed on both seats (a normal mirror-match use case); `swapSides()` and `useIsMatchSetupReady()` — both already scaffolded on the store when it was first built — are now wired to a "Swap Sides" button and the "Start Match" disabled state, respectively. "Start Match" calls `navigateTo({screen:'match', deckIdA, deckIdB})`, passing ids only, never loaded deck objects.
- **Match** is a placeholder — see Section 11. Its Pause → "Quit to Main Menu" path calls `matchSetupStore.reset()` before `resetTo({screen:'main-menu'})`, so a future Deck Select visit never silently inherits a finished match's picks.

## 9. Key TypeScript Interfaces (this layer)

```ts
// navigationStore.ts
export type NavigationTarget =
  | { screen: 'main-menu' }
  | { screen: 'settings' }
  | { screen: 'debug-tools' }
  | { screen: 'card-library' }
  | { screen: 'deck-builder'; deckIdToEdit?: string }
  | { screen: 'saved-decks' }
  | { screen: 'deck-select' }
  | { screen: 'match'; deckIdA: string; deckIdB: string };

// deckBuilderStore.ts
export interface ClipboardImportSummary {
  resolvedCount: number;
  issues: ClipboardImportIssue[];
  unresolvedEntries: { cardId: string; variant: string | null; reason: string }[];
  invalidLines: InvalidDeckListLine[];
}

// DeckListSummary.tsx (presentational — intentionally NOT typed as SavedDeck/DeckStoreListEntry)
export interface DeckListSummaryProps {
  name: string;
  updatedAt: string;
  leaderName?: string;
  leaderImageUrl?: string | null;
  colors?: Color[];
  cardCount?: number;
  onSelect?: () => void;
  selected?: boolean;
  actions?: ReactNode;
}
```

## 10. Tests

No new automated test suites were added in `/src/app` for this milestone. This is deliberate, not an oversight: per the project's layered model, only Layers 1–2 (`/src/engine`) and the `/src/cards` data layer decide legality/outcome, and that is exactly where the project's "add tests for every rule module / every validator" rule already applies — `deckValidation.test.ts`, `saveDeck.test.ts`, `clipboardImport.test.ts`, `deckStorage.test.ts`, and `savedDeck.test.ts` (all pre-existing, see `docs/02` Section 13) already cover every rule this UI layer calls into. The screens and stores here are wiring: they call those already-tested pure functions and render the result.

**Verification performed this session:** no automated build/typecheck/test run — this sandbox's `npm`/`vitest`/`tsc` access is unreliable for this project (prior verification attempts found bash-mounted file reads can lag behind fresh edits). Verification was instead done by re-reading every new and edited file in full via the file tool immediately after writing it, and by cross-checking every prop name, store selector, and type field referenced by a new screen against the actual exporting file (`Button`, `Modal`, `DeckListSummary`, `ScreenShell`, `navigationStore`, `savedDecksStore`, `matchSetupStore`, `deckStorage.ts`'s `DeckLoadResult`/`DeckStoreListEntry`) before relying on it. **Action item carried forward:** run `npm install && npx tsc --noEmit && npx vitest run` on a machine with working tooling to get a real compiler/test confirmation of this milestone.

## 11. Known Limitations

- **Match screen is a placeholder, by design.** It loads and displays the two selected decks and offers a stub Pause Menu ("Quit to Main Menu" only) — no turn structure, no action dispatch, no GameState, because none of that exists yet (engine priorities #1–9 come first). This is the single biggest piece of unfinished scope in the whole app, and is intentional rather than deferred-by-accident.
- **Canonical-printing-only in Deck Builder.** Browse/Search-by-ID only ever add/set `rawPrintings[0]` of a card number — `CardLibraryEntry` already collapses every art variant into one entry, and there is currently no alternate-art picker UI. Narrow and documented, not silently ignored.
- **Clipboard textarea is local component state**, not store-backed — switching tabs before pressing "Import" discards unsaved pasted text. Accepted tradeoff to avoid an uncontrolled-DOM multi-tab-mount system.
- **No automated UI tests** (Section 10) — coverage lives at the data/rules layer this UI calls into, not in `/src/app` itself.
- **`ComingSoonScreen` is now dead code** in the sense that no `NavigationTarget` currently routes to it — kept only as a ready-made fallback for whatever screen gets added next (e.g. an in-engine board) before it's actually built.
- **No responsive/landscape-specific layout work yet.** Every screen so far is a single vertical `ScreenShell` column; mobile-first/landscape-priority polish (project's "Rendering" section) is explicitly a later, optional pass.

## 12. Next Recommended Task

**This milestone (delivered this session):** the full App Shell + Deck/Card UI slice — store layer, shared components, and all seven real screens, with the navigation graph closed end-to-end from Main Menu to a (placeholder) Match screen.

**Next recommended task:** start the actual rules engine per the project's own implementation priorities #1–7 — `GameState` schema (`/src/engine/state`, partially scaffolded already: `card.ts`/`game.ts`/`player.ts`/`zone.ts` exist with serialization tests), the action dispatch/validation system, and the turn/phase system — so the Match screen has something real to render instead of a deck-summary placeholder. The setup flow already has a head start (`/src/engine/setup` — `createPreGameState`, mulligan/going-first decisions — already exists with tests), so picking up from there is the most direct path to a first real turn.
