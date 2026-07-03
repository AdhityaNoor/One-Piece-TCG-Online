# Development Guide and Tech Stack

## What You Are Building

One Piece TCG Online is a browser-based simulator for the One Piece Card Game. The first target is local single-player hotseat play where one person controls both players. The architecture should still behave as if every click may later become a network request to an authoritative server.

The core product is not the React UI. The core product is a deterministic, serializable, UI-agnostic TypeScript game engine that the UI can project and control through validated actions.

## Why This Structure Is Correct

The simulator needs to support rule correctness, replays, local saves, future online multiplayer, and future offline deck loading. Those requirements all push in the same direction:

- Game state must be serializable.
- Player intent must be represented as serializable actions.
- Every action must be validated before execution.
- Valid actions must return a new game state, log entries, and pending choices.
- Randomness must be seedable.
- Card API data must be normalized before the engine uses it.
- Raw card text must be stored as text, then mapped to effect templates.
- UI, animation, and 3D layers must be replaceable without changing rules.

This keeps gameplay testable and prevents visual code from becoming hidden rules code.

## Tech Stack

Runtime and framework:

- React 18
- Vite
- TypeScript
- Zustand
- Tailwind CSS

Testing and validation:

- Vitest
- TypeScript compiler checks
- Focused unit tests for engine rules, action handlers, card normalization, saved decks, and effect templates

Optional presentation layers:

- Three.js for isolated 3D visuals
- CSS and future animation libraries for UI polish

Tooling:

- Node.js scripts
- `tsx` for TypeScript scripts
- Vercel-compatible static build output

## Files/Folders Involved

Primary source folders:

- `src/engine/state` - JSON-serializable game state types
- `src/engine/actions` - serializable player and system actions
- `src/engine/rules` - gameplay rule execution
- `src/engine/validation` - action legality checks, when present
- `src/engine/effects` - effect IR, interpreters, timing gates, and effect contexts
- `src/engine/events` - pending choices and effect hooks
- `src/engine/rng` - seedable random number generation
- `src/engine/logs` - serializable game log entries
- `src/engine/setup` - pre-game and match setup flows
- `src/cards/api` - card data provider adapters and API cache helpers
- `src/cards/normalization` - API/scraped card data to engine-ready normalized cards
- `src/cards/decks` - saved deck snapshots, validation, import/export, and storage
- `src/cards/assets` - card image and asset cache helpers
- `src/cards/effectTemplates` - curated effect template assignment and assembly
- `src/cards/effectParser` - raw text parsing helpers that do not execute rules directly
- `src/cards/library` - browsing, filtering, and grouping helpers
- `src/app` - React app shell, screens, stores, components, and hooks
- `src/board` - board projections and interaction helpers
- `src/animations` - optional animation state
- `src/renderer3d` - optional 3D visuals
- `scripts` - scraping, asset build, coverage, and worklist tooling
- `public/cards` - committed card catalog data
- `public/card-images` - ignored heavyweight card image output
- `docs` - architecture and contributor documentation

## Architecture Rules

Engine rules:

- `src/engine` must not depend on React, Zustand, DOM APIs, browser storage, animation code, or 3D code.
- Engine state must be JSON-serializable.
- Engine actions must be JSON-serializable.
- Engine functions should prefer immutable updates or explicit state-copy patterns.
- Every player action must go through action dispatch.
- Every action must be validated before execution.
- Logs should describe what happened without requiring UI state.
- Pending choices should be explicit and serializable.

Card data rules:

- API data is provider data, not engine data.
- Normalize cards before the engine uses them.
- Saved decks must snapshot normalized card data.
- Saved decks must not depend on future API availability or future API response shape.
- Card effect text is raw text until mapped to a curated template.
- Do not use API card text as executable logic.

UI rules:

- UI components may dispatch actions, display projected state, and manage visual state.
- UI components must not directly mutate engine state.
- UI state belongs in app stores, not engine state.
- Animation state belongs outside the engine.
- 3D assets and animation must never control rules.

## Code Or Schema

Common development commands:

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

Data and tooling commands:

```bash
npm run scrape
npm run scrape:limitless
npm run build:assets
npm run worklist
npm run coverage
```

Use scraper and report commands carefully. Their generated outputs can be large and are intentionally ignored unless a maintainer decides a specific data artifact should be committed.

Recommended action result shape:

```ts
export interface ActionExecuteResult {
  state: GameState;
  log: GameLogEntry[];
  pendingChoices: PendingChoice[];
}
```

Recommended saved deck principle:

```ts
export interface SavedDeck {
  schemaVersion: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: "deck-builder" | "import" | "test-fixture";
  leader: SavedDeckCard;
  mainDeck: SavedDeckCard[];
  donDeck: SavedDeckCard[];
}

export interface SavedDeckCard {
  quantity: number;
  sourceCardId: string;
  normalizedCard: NormalizedCard;
  rawText: string;
  assetRefs: CardAssetRefs;
}
```

The exact interfaces in the codebase may be more detailed. Follow the local types in `src/cards/decks` and `src/cards/normalization` when implementing.

## Tests

Add tests near the code being changed:

- `src/engine/**/__tests__` for rules, actions, phases, battle, setup, RNG, and serialization
- `src/cards/**/__tests__` for normalization, deck saving, imports, effect parsing, and template mapping

Minimum expectations:

- Rule changes include rule tests.
- Action handler changes include valid and invalid action tests.
- Normalization changes include representative source data tests.
- Saved deck changes include stability and serialization tests.
- Effect template changes include behavior tests and integration coverage where practical.

Run before opening a pull request:

```bash
npm test
npm run typecheck
npm run build
```

## Error Handling Strategy

Engine:

- Invalid actions should return structured validation failures or safe rejected execution results.
- Do not throw for expected illegal gameplay actions.
- Throw only for programmer errors or corrupted impossible state.

Card API:

- Treat network failure, provider shape changes, missing images, and missing printings as expected failures.
- Return typed errors where possible.
- Preserve enough context for UI messages and debugging.
- Never let API failure break already saved local decks.

Deck loading:

- Validate schema version.
- Validate required zones and card counts.
- Validate normalized card fields before setup.
- Provide migration points for future saved deck versions.

Assets:

- Missing card images should fall back to a local placeholder.
- Asset cache misses should not block deck legality.
- Future downloaded assets should be reproducible from stored asset references.

## Git Ignore Policy

Commit source, tests, docs, lightweight catalog data, and reusable tooling.

Do not commit:

- `node_modules`
- `dist` or build output
- `.env` files
- `.vercel`
- local agent/tool state such as `.agents` or `.codex`
- generated reports such as `test-results.txt`, effect coverage CSVs, and worklists
- scraper output directories
- downloaded heavyweight card image dumps
- temporary reference folders, reverse-engineering folders, and local scratch data

If a generated file becomes part of the public source of truth, document why before removing it from `.gitignore`.

## Known Limitations

- Not every card effect is implemented.
- Raw card text still needs curated mapping to safe effect templates.
- Some rules may require ruling confirmation from the Comprehensive Rules PDF or official rulings.
- Online multiplayer is not implemented yet.
- Offline deck loading is supported architecturally, but future asset download/cache behavior still needs dedicated implementation.
- Large card images should remain outside git until the project has a clear asset hosting strategy.

## Next Recommended Task

For public contribution readiness, the next useful task is adding GitHub issue templates and a pull request template that enforce:

- Tests run
- Rule source cited when gameplay behavior changes
- No generated assets committed
- Known limitations documented
