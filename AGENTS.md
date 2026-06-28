Design the card library and deck-save architecture.

Requirements:
1. Card library preview should fetch/search cards from OPTCG API.
2. Deck builder should use live API data while browsing.
3. Saving a deck must create a stable local snapshot of every selected card.
4. The saved deck must not break if the API changes later.
5. Saved deck data should include normalized card data for the game engine.
6. Do not use API card text directly as executable effect logic.
7. Store card effect text as raw text, then map it later to effect templates.
8. Card images/assets should be cacheable.
9. Support future asset download/caching.
10. Support future offline/local deck loading.

Output:
1. API provider analysis
2. Card data model
3. Normalized card model
4. Saved deck model
5. Card asset caching strategy
6. Deck builder flow
7. Save deck flow
8. API adapter folder structure
9. Error handling strategy
10. TypeScript interfaces
11. First implementation milestone

## Imported Claude Cowork project instructions

You are helping me build a web-based One Piece TCG simulator.

Project goal:
Build a local single-player hotseat simulator first, where one human controls both sides and turns alternate locally. However, the architecture must be prepared for future online multiplayer with an authoritative server.

Available resources:
1. One Piece TCG Comprehensive Rule PDF
2. One Piece TCG Cards API

Core principles:
- Treat the Comprehensive Rule PDF as the source of truth.
- Treat the card API as card data only, not executable logic.
- Do not assume rules. If unclear, mark as TODO / needs ruling confirmation.
- Build a pure TypeScript game engine first.
- Keep the engine completely UI-agnostic.
- The UI must never directly mutate game state.
- Every player action must go through a serializable action dispatch system.
- Every action must be validated before execution.
- Every valid action must return:
  1. new game state
  2. game log entry
  3. pending choices, if any
- Game state, game actions, logs, and pending choices must be JSON-serializable.
- Design local hotseat as if every click will later become a network request.
- Randomness must use a seedable RNG interface.
- Card visibility must be modeled properly, even if both hands are visible in debug mode.
- Animations and 3D assets must never control game rules.

Target platform:
- Web-based
- Optimized for mobile and desktop
- Mobile-first controls
- Touch and mouse support
- Landscape gameplay prioritized
- Portrait mode supported with simplified layout
- Drag-and-drop supported
- Tap-to-select fallback required
- Card zoom/preview required for small screens

Rendering:
- Core gameplay should use clear 2D UI.
- Optional 3D assets and animations are allowed for polish.
- The game must remain fully playable with animations and 3D disabled.
- Animation state must be separate from game state.
- 3D rendering must be optional and isolated from rules logic.

Recommended stack:
- React + Vite
- TypeScript
- Tailwind CSS
- Zustand or Redux Toolkit for app/UI state
- Pure TypeScript engine
- React Three Fiber / Three.js for optional 3D assets
- Framer Motion or GSAP for UI animations
- Vitest for unit tests

Architecture:
Use this layered model:

Layer 1: Pure game state
Layer 2: Rules engine
Layer 3: UI board projection
Layer 4: Interaction layer
Layer 5: Animation layer
Layer 6: Optional 3D visual layer

Only Layers 1 and 2 decide legality and game outcome.

Suggested folders:

/src
  /engine
    /state
    /rules
    /actions
    /validation
    /effects
    /events
    /rng
    /logs
    /setup
    /tests

  /cards
    /api
    /normalization
    /effectTemplates

  /app
    /components
    /screens
    /localHotseat
    /store
    /hooks

  /board
    /projection
    /layout
    /interactions

  /animations
    /timelines
    /motionState

  /renderer3d
    /scene
    /assets
    /effects

  /networkFuture
    notes.md

Implementation priorities:
1. Rules blueprint from PDF
2. Game state schema
3. Local hotseat action system
4. Deck setup and starting game flow
5. Turn and phase system
6. Basic action validation
7. Battle flow
8. Event hooks
9. Simple card effect templates
10. Responsive board UI
11. Optional animations
12. Optional 3D polish
13. Future online multiplayer adapter

Important game systems to model carefully:
- Game zones
- Leader, character, stage, event, DON!! cards
- Cost payment
- DON!! attachment
- Turn phases
- Attack declaration
- Blocker/counter timing
- Damage/life flow
- K.O. and trash
- Once-per-turn tracking
- Active/rested state
- Effect timing windows
- Pending player choices
- Event logs
- Replayability

Coding rules:
- Prefer small modular files.
- Add tests for every rule module.
- Add tests for every action validator.
- Do not write giant monolithic functions.
- Do not mix UI state with game state.
- Do not hardcode one-off card behavior unless absolutely necessary.
- Prefer reusable effect templates.
- Document every known limitation.

When responding to me, always structure your answer as:
1. What you are building
2. Why this structure is correct
3. Files/folders involved
4. Code or schema
5. Tests
6. Known limitations
7. Next recommended task

Design the card library and deck-save architecture.

Requirements:
1. Card library preview should fetch/search cards from OPTCG API.
2. Deck builder should use live API data while browsing.
3. Saving a deck must create a stable local snapshot of every selected card.
4. The saved deck must not break if the API changes later.
5. Saved deck data should include normalized card data for the game engine.
6. Do not use API card text directly as executable effect logic.
7. Store card effect text as raw text, then map it later to effect templates.
8. Card images/assets should be cacheable.
9. Support future asset download/caching.
10. Support future offline/local deck loading.

Output:
1. API provider analysis
2. Card data model
3. Normalized card model
4. Saved deck model
5. Card asset caching strategy
6. Deck builder flow
7. Save deck flow
8. API adapter folder structure
9. Error handling strategy
10. TypeScript interfaces
11. First implementation milestone
