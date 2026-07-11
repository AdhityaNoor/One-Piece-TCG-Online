# One Piece TCG Online

A web-based One Piece TCG simulator focused first on local single-player hotseat play, with an engine architecture that can later support online multiplayer through an authoritative server.

The project is built around a pure TypeScript rules engine. The UI, animation layer, and optional 3D rendering must never decide game legality or mutate game state directly.

## Project Status

This project is in active development. The current priority is building a correct, testable local simulator before adding online multiplayer.

Current focus areas:

- Rules engine and serializable game state
- Local hotseat action dispatch
- Card library, deck builder, and saved deck snapshots
- Card effect template mapping
- Responsive 2D gameplay UI
- Optional visual polish that stays separate from rules logic

## Tech Stack

- React 18 for the app UI
- Vite for local development and production builds
- TypeScript for app, engine, card data, and tooling
- Tailwind CSS for styling
- Zustand for app/UI state
- Vitest for unit tests
- Three.js for optional isolated 3D visuals
- Node.js scripts for scraping, card asset processing, and effect reports
- Vercel-ready static deployment

See [Development Guide and Tech Stack](docs/05-development-guide-and-tech-stack.md) for the full contributor guide.

## Architecture

The simulator follows a layered model:

1. Pure game state
2. Rules engine
3. UI board projection
4. Interaction layer
5. Animation layer
6. Optional 3D visual layer

Only Layers 1 and 2 decide legality and game outcomes.

Important folders:

- `src/engine` - UI-agnostic game state, rules, actions, validation, effects, logs, setup, and RNG
- `src/cards` - API adapters, normalization, saved deck snapshots, asset cache helpers, effect templates
- `src/app` - React app shell, screens, components, stores, hooks
- `src/board` - UI board projection, layout, and interaction helpers
- `src/animations` - animation state and timelines only
- `src/renderer3d` - optional Three.js visual layer only
- `scripts` - scraper, asset, worklist, and report generation tools
- `docs` - project architecture and contributor documentation

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local app:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run type checks:

```bash
npm run typecheck
```

Build for production:

```bash
npm run build
```

## Development Rules

- Treat the official Comprehensive Rules PDF as the source of truth for gameplay rules.
- Treat card APIs and scraped data as card data only, not executable game logic.
- Do not execute API card text as card effects.
- Store raw card text, then map known behavior to curated effect templates.
- Keep engine state, actions, logs, and pending choices JSON-serializable.
- Route every player action through serializable action dispatch.
- Validate every action before execution.
- Keep UI state separate from game state.
- Keep animation and 3D state separate from game state.
- Use seedable RNG for randomness.
- Add focused tests for rule modules, action validators, normalization, deck saving, and effect templates.

## Documentation

- [Rules Engine Blueprint](docs/01-rules-engine-blueprint.md)
- [Card Library and Deck Architecture](docs/02-card-library-and-deck-architecture.md)
- [App Shell and UI](docs/03-app-shell-and-ui.md)
- [Frontend Deployment](docs/04-deployment.md)
- [Development Guide and Tech Stack](docs/05-development-guide-and-tech-stack.md)
- [Backend Deployment](docs/07-backend-deployment.md)

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then read the docs that match the area you want to work on.

Good first contribution areas:

- Unit tests for existing rules and validators
- Card normalization edge cases
- Effect template coverage
- Mobile layout improvements
- Accessibility improvements
- Documentation cleanup

## Legal Notice

This is an unofficial fan project. One Piece and the One Piece Card Game are owned by their respective rights holders. Do not commit copyrighted card image dumps or private assets unless the project owner explicitly approves the licensing and storage plan.
