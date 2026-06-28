# OPTCG Card Scraper

Pulls every card from [optcgapi.com](https://optcgapi.com/), normalizes it into
the engine's `CardDefinition`, and structures each card's effect text into an
**inert** `ParsedEffect` (ability hooks + draft action atoms) that the game
engine's future effect-template system can build on.

## Run it

```bash
npm install        # first time only — installs tsx (the TS runner)
npm run scrape
```

To watch it run in a **separate, fullscreen terminal** outside your IDE:

```bash
npm run scrape:window
```

On Windows this opens **Windows Terminal fullscreen** (`wt -F`); if Windows
Terminal isn't installed it falls back to a normal pop-out console window
(press `Alt+Enter` for fullscreen, or install Windows Terminal). On macOS it
opens Terminal.app (`⌃⌘F` for fullscreen); on Linux it tries the common
terminal emulators. The launcher just opens the window — the scrape itself runs
there via `npm run scrape`.

> The sandbox this repo may be edited in **cannot reach optcgapi.com**, so the
> scrape must be run on your own machine (which has internet access).

Output (gitignored — see root `.gitignore`):

```
scrape/
  index.json                     # manifest: every card, counts, needsReview flags
  cards/
    OP-01/OP01-016.json          # one ScrapedCard per card NUMBER, foldered by set
    ST-01/ST01-001.json
    DON/don_166.json             # DON!! cards (no set_id -> "DON" folder)
    ...
```

## What's in each card file (`ScrapedCard`)

| Field | What it is |
|---|---|
| `definition` | Engine-facing normalized `CardDefinition` (stats, colors, attributes, and the four mechanically load-bearing keyword flags). |
| `effect` | `ParsedEffect` — structured-but-inert ability hooks + draft action atoms (see below). |
| `printings` | Every art variant of the card number (canonical first), for art pickers. |
| `rawText` | The canonical printing's `card_text`, verbatim. |
| `normalizationWarnings` / `effect.warnings` | Anything the parser/normalizer could not fully structure — flagged, never guessed. |

## How effects are structured (and the guardrails)

`effect.abilities[]` mirrors the engine's existing `EffectHook` model:

- `timing` (`onPlay` / `whenAttacking` / `counter` / `activateMain` / …),
  `category` (`auto` / `activate` / `permanent` / `replacement`),
  `conditions` (`donAtLeastX` / `yourTurn` / `oncePerTurn` / …), `donRequirement`,
  `isTrigger`, and the raw `tags`/`rawText` it came from.
- `actions[]` are **draft atoms** — only for tightly recognized, unambiguous
  phrasings (`draw N`, `gains +N power`, `gains [Keyword]`). Anything else is
  `{ op: 'unrecognized', rawText }`.

**This is an authoring aid, not executable logic.** Per the project's ground
rules, card text is never turned into behavior automatically. Any ability the
parser can't fully structure sets `needsTemplate: true` (and the card's
`effect.needsReview: true`), so a human can find and hand-author it. Use
`index.json`'s `counts.needsReview` and each entry's `needsReview` flag to
prioritize that work.

## Why it hits only the bulk endpoints

The API runs on a self-funded VPS and the owner asks consumers to keep call
volume low. The scraper makes only a handful of requests total (the documented
`all*` endpoints) rather than one request per card.

## Re-running / updating

Safe to re-run any time — it overwrites `scrape/` from scratch. Nothing here is
committed, so a fresh pull on a new machine just re-runs `npm run scrape`.
