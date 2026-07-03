# Contributing

Thanks for helping build One Piece TCG Online. The most important project rule is simple: gameplay correctness lives in the pure TypeScript engine, not in the UI.

## Before You Start

1. Read [README.md](README.md).
2. Read [Development Guide and Tech Stack](docs/05-development-guide-and-tech-stack.md).
3. Read the architecture doc for the area you are changing.
4. Open an issue or discussion for large rule, engine, deck, or architecture changes before implementing.

## Local Setup

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run typecheck
npm run build
```

## Contribution Standards

- Keep files small and focused.
- Prefer pure functions in `src/engine`.
- Do not import React, Zustand, DOM APIs, browser storage, animation libraries, or 3D code into `src/engine`.
- Do not let UI components directly mutate game state.
- Add or update tests for rule changes, action validation, deck saving, card normalization, and effect templates.
- Mark unclear rules as `TODO: needs ruling confirmation` instead of guessing.
- Keep data models JSON-serializable unless a file clearly belongs to UI-only runtime state.
- Do not commit generated reports, local cache files, `.env` files, `.vercel`, `dist`, `node_modules`, or downloaded card image dumps.

## Card Effects

Card text is source data, not executable logic.

Acceptable:

- Store raw effect text.
- Parse static metadata for display/search.
- Map known cards to curated effect templates.
- Add tests that prove the template behavior.

Not acceptable:

- Evaluating card text as code.
- Building ad hoc one-card behavior inside UI components.
- Adding hidden rule behavior without tests.

## Pull Request Checklist

- Tests pass with `npm test`.
- Type checks pass with `npm run typecheck`.
- Production build passes with `npm run build`.
- New rules or validators have tests.
- New known limitations are documented.
- No generated, secret, local, or heavyweight asset files are committed.

## Areas Of The Codebase

- Engine work: `src/engine`
- Card and deck work: `src/cards`
- UI screens and app state: `src/app`
- Board projection and interactions: `src/board`
- Optional animation: `src/animations`
- Optional 3D visuals: `src/renderer3d`
- Tooling scripts: `scripts`
- Architecture docs: `docs`

## Commit Style

Use clear, plain commit messages:

```text
Add deck snapshot validation
Fix draw phase handoff log
Document card asset cache strategy
```

Prefer small pull requests that can be reviewed safely.
