# 09 — Audio & Sound Design

Layer 5 (presentation). The audio layer reads game state and the game log; it
never writes either, and `/src/engine` and `/src/cards` must never import it.
Audio is **never load-bearing**: a missing asset, a browser with no WebAudio,
or a blocked autoplay degrades to silence and the game plays on.

Most cues now play a **real recording** from `public/audio/sfx/src/`. That
folder holds eight files — a click, an alert, a card slide, an impact, a
victory and defeat sting, and the menu and battle beds — and 75 of the 87 cues
are cut from them: several cues share one file and separate themselves with a
fixed pitch shift (`detuneBiasCents`), so a K.O. is the impact dropped half an
octave and a `[Blocker]` is the same impact lifted. Sharing a URL is also a
load win, because `soundManager` keys its buffer cache by URL.

The remaining 12 cues are still procedural **placeholders** from
`scripts/audio/build.sh`: the two hover ticks, the screen-transition whoosh,
the brand sting, the matchmaking-search loop, the two shuffles, and five of the
six `effect.*` sparkles. `public/audio/sfx/manifest.json` marks each cue with
`placeholder: true|false`; regenerate it with `npm run audio:manifest` after
any change to the registry.

---

## 1. Architecture

```
engine (GameLogEntry[])          UI components
        │                              │
        ▼                              ▼
 audio/matchCues.ts              audio/uiCues.ts
 parseSoundCues()                resolveClickCue()
 pure: log delta -> cues         pure: element -> cue
        │                              │
        └──────────────┬───────────────┘
                       ▼
              audio/cues.ts  ── the catalogue: id, asset, bus, mix, limits
                       ▼
          audio/soundManager.ts  ── factory over injected deps
       throttle · voice caps · priority · pitch bias + detune · ducking
                       ▼
             audio/runtime.ts  ── the browser singleton + settings binding
                       ▼
        WebAudio: source -> cue gain -> bus gain -> master
```

Files:

| File | Responsibility |
| --- | --- |
| `src/audio/cues.ts` | The cue catalogue. One entry per sound; `SoundCueId` is derived from it, so a typo is a compile error. |
| `src/audio/soundManager.ts` | Playback engine. A **factory over injected deps** (clock, context, fetch, settings) so it runs headless in vitest. |
| `src/audio/matchCues.ts` | Pure `parseSoundCues(prevState, logDelta, opts)`. The audio sibling of `animations/cardMovement/parseLogEntries.ts`. |
| `src/audio/uiCues.ts` | Pure element→cue resolution for the one delegated click listener. |
| `src/audio/runtime.ts` | The browser singleton, `configureAudioSettings()`, `installAudioUnlock()`. |
| `src/audio/index.ts` | Public surface: `playCue`, `soundManager`, `parseSoundCues`, types. |
| `scripts/audio/{synth,voices,generate}.py`, `build.sh` | Placeholder generator. |
| `public/audio/sfx/manifest.json` | Generated list of every asset + the replacement brief for each. |

**Why a factory instead of a module singleton.** Every rule below —
throttling, voice caps, priority, ducking — is behaviour worth a test, and
none of it should require jsdom or a real audio device. `createSoundManager()`
takes its clock, its `AudioContext`, its fetch and its settings from the
caller; `runtime.ts` is the only file that knows about `window`.

**Why `/src/audio` never imports `/src/app`.** The app hands the audio layer
its settings at boot (`configureAudioSettings` in `useAppInit.ts`) rather than
the audio layer reaching into a zustand store. That keeps the layer droppable
into a test, a harness or a future renderer untouched.

---

## 2. Buses and the mix

| Bus | What is on it | User control |
| --- | --- | --- |
| `ui` | menus, buttons, deck builder, chat | SFX toggle + slider |
| `game` | phases, card motion, DON!!, prompts | SFX toggle + slider |
| `battle` | combat and card effects — the loudest transient layer | SFX toggle + slider |
| `stinger` | rare, deliberately dominant moments | SFX toggle + slider |
| `music` | looping beds | Backsound toggle + slider |

Signal path is `source → per-cue gain → bus gain → master → destination`.
Per-cue `gain` in the registry is **sound design**, not a user setting: it is
where a cue sits in the mix relative to its neighbours. The user's sliders
move bus gains only, so the internal balance survives any volume setting.

**Ducking.** A cue with `duckMusicTo < 1` pulls the music bus down for its own
duration plus 250 ms, then releases over 450 ms. Ducks are released *by
identity*, not by an expiry timestamp, so two overlapping stingers hold the
bed down until the last one finishes rather than the first one's release
yanking it back up under the second.

---

## 3. The rules that keep a card game from sounding like a slot machine

A TCG dispatch is not one event. Playing a card can produce a dozen log
entries; a Refresh → Draw → DON!! → Main cascade routinely arrives in a
*single* log delta. Five guards exist because of that:

1. **Throttle** — each cue declares a minimum gap. Critically, the gap is
   measured against *when the cue will sound*, not when `play()` was called: a
   staggered batch is dispatched in one synchronous burst, and comparing
   against "now" would throttle away everything after the first cue and
   silence the stagger entirely.
2. **Per-cue voice cap** — `maxVoices`. The oldest copy is stolen, not the
   newest dropped, so the most recent action is always the one you hear.
3. **Global voice cap** — `MAX_TOTAL_VOICES = 16`. When full, the
   lowest-`priority` voice is evicted; a K.O. (priority 9) always outranks a
   hover tick (priority 1). If nothing quieter is playing, the new cue is
   refused rather than clipping the master.
4. **Detune** — every play is pitched ±`detuneCents`. Three identical draw
   samples fired 70 ms apart otherwise sound like one machine.
5. **Repeat cap in the mapper** — beyond 4 emissions of one cue per log delta,
   `parseSoundCues` stops. A ten-card mill is one riffle, not ten.

**Timing.** A cue describing a card *arriving* is delayed by `FLIGHT_MS` so it
lands with the card. A cue describing an *impact* — a declaration, a Life card
taken, a K.O. — fires immediately: the hit is the moment, the flight is the
aftermath. With `animationsEnabled` off, every flight delay collapses to zero.

**Sequencing.** Cues for a phase step ride on `TurnSequenceStep.soundCues` and
are released by `phaseAnnounceStore` when that step reaches the front of the
queue — exactly like the step's card flights. This is the same reason the
flights are queued: otherwise a whole turn's audio empties into one frame.

---

## 4. Cue catalogue

86 cues. `manifest.json` carries the per-cue replacement brief.

**UI (28)** — `ui.hover` `ui.click` `ui.confirm` `ui.back` `ui.toggle.on/off`
`ui.tab` `ui.modal.open/close` `ui.error` `ui.success` `ui.notify`
`ui.slider.tick` `ui.screen.transition` `ui.brand.stinger` `ui.card.hover`
`ui.card.detail.open/close` `ui.deck.add/remove/save/invalid`
`ui.chat.send/receive` `ui.matchmaking.search/found` `ui.rank.up` `ui.unlock`

**Match setup (8)** — `match.start` `match.rps.throw/win/lose`
`match.mulligan.shuffle` `match.deal` `match.leader.reveal` `match.concede`

**Turn & phase (7)** — `turn.begin.you/opponent` `phase.refresh` `phase.draw`
`phase.don` `phase.main` `phase.end`

**Card motion (11)** — `card.draw` `card.play.character/stage/event`
`card.move` `card.return.hand` `card.trash` `card.rest` `card.setactive`
`card.reveal` `deck.shuffle`

**DON!! (5)** — `don.draw` `don.attach` `don.return` `don.rest` `don.refresh`

**Battle (10)** — `battle.attack.declare` `battle.attack.leader`
`battle.blocker` `battle.counter.card` `battle.counter.event` `battle.clash`
`battle.nullified` `battle.ko` `battle.life.take` `battle.trigger.reveal`

**Effects (6)** — `effect.activate` `effect.resolve` `effect.buff`
`effect.debuff` `effect.search` `effect.negate`

**Prompts (4)** — `prompt.open` `prompt.select` `prompt.confirm`
`prompt.cancel`

**Stingers (3)** — `stinger.life.critical` `stinger.game.win`
`stinger.game.lose`

**Music (5)** — `music.menu` `music.battle` `music.battle.tense`
`music.victory` `music.defeat`

### Log event → cue

| `LogEventType` | Cue | Notes |
| --- | --- | --- |
| `PHASE_CHANGED` | `phase.*` | `data.phase`. Refresh also emits `card.setactive` / `don.refresh` when it listed cards. Entries carrying only `step` are rules annotations — silent. |
| `TURN_PASSED` | `turn.begin.you` / `.opponent` | Perspective-aware; silent for a spectator. |
| `CARD_DRAWN` | `card.draw` | Delayed to landing. |
| `CARD_PLAYED` | `card.play.character` / `.stage` / `.event` | By `data.to`. |
| `CARD_MOVED` | `don.draw` / `card.trash` / `card.return.hand` / … | DON!! Phase bulk add (no `from`, to `costArea`) is heard as DON!!. |
| `CHARACTER_KO` | `battle.ko` | |
| `CARD_RESTED` / `DON_RESTED` | `card.rest` / `don.rest` | |
| `DON_GIVEN` / `DON_RETURNED` | `don.attach` / `don.return` | |
| `ATTACK_DECLARED` | `battle.attack.leader` if the target is in `leaderArea`, else `battle.attack.declare` | |
| `BLOCKER_ACTIVATED` | `battle.blocker` | |
| `COUNTER_ACTIVATED` | `battle.counter.card` | |
| `DAMAGE_DEALT` | `battle.life.take` (+ `stinger.life.critical` on **your** last Life) | Life is walked forward across the delta so the sting fires once. |
| `TRIGGER_REVEALED` | `battle.trigger.reveal` | |
| `EFFECT_ACTIVATED` | `battle.counter.event` during a battle, else `card.play.event` / `effect.activate` | |
| `EFFECT_RESOLVED` | `effect.resolve` | `data.debug` entries are play-test scaffolding — silent. |
| `CHOICE_REQUESTED` | `prompt.open` | Only for the player who must choose. |
| `CHOICE_RESOLVED` | `prompt.confirm` | |
| `GAME_OVER` | `stinger.game.win` / `.lose` | From `data.winnerId`. |

---

## 5. Using it from a component

One delegated `click` listener in `BacksoundControl` covers every control in
the app. A component tunes its own sound with attributes rather than wiring a
handler:

```tsx
<button data-sfx="ui.deck.save">Save deck</button>   {/* name a cue        */}
<button data-sfx="none">Drag handle</button>          {/* stay silent       */}
<button data-sfx-role="destructive">Remove</button>   {/* pick one by role  */}
```

Roles: `primary` `confirm` `back` `cancel` `close` `tab` `destructive` `add`
`card` `chat`. Without either attribute the resolver falls back to
`role="switch"` state, `role="tab"`, then the accessible label, then
`ui.click`. An unknown `data-sfx` value falls back to the default rather than
going silent — a typo is quiet-but-audible, never a dead control.

Anything else:

```ts
import { playCue, soundManager } from '../../audio';

playCue('battle.trigger.reveal');
playCue('card.draw', { delayMs: 640 });     // land it with the flight
soundManager.playMusic('music.battle');      // crossfades from the current bed
soundManager.stopAll();                      // leaving a match
```

---

## 6. Replacing a sound

Two ways in, depending on whether the cue is on a placeholder or on a shared
recording.

**A cue still on a placeholder** (`placeholder: true` in the manifest):

1. Pick the cue in `public/audio/sfx/manifest.json`; its `brief` is the
   sound-design instruction.
2. Drop your `.ogg` at the same path, same filename.
3. Done. Nothing else changes.

**A cue sharing a recording from `public/audio/sfx/src/`:** overwriting the
file there changes every cue cut from it. To give one cue its own sound, add
the new file to `public/audio/sfx/src/` and point that cue's `src` at it in
`src/audio/cues.ts`, then run `npm run audio:manifest`. To keep the shared
file but change how one cue sits against its siblings, adjust that cue's
`detuneBiasCents` (pitch) and `gain` — no new asset needed.

Asset guidance:

- **Format** `.ogg` (Vorbis, q3, 44.1 kHz). Every evergreen browser decodes it
  and the whole current set is 1.2 MB.
- **Length** UI ≤ 150 ms, card motion ≤ 300 ms, battle ≤ 900 ms, stingers
  ≤ 2.5 s, music loops 8–30 s.
- **Headroom** peak around −3 dBFS. The mix is set by the registry's `gain`,
  not by how hot the file is; a normalised-to-0 asset just costs headroom.
- **Ends** hard-trim silence and fade the last few ms. A DC step at the end of
  a 60 ms cue is an audible click.
- **Loops** must be seamless — no fade at either end, matched RMS across the
  splice.
- **Bulk regeneration** of placeholders: `bash scripts/audio/build.sh`. This
  overwrites every generated `.ogg` under `public/audio/sfx/<folder>/`, so run
  it when the cue table changes, **not** after a real asset has landed. It
  never touches `public/audio/sfx/src/`, where the real recordings live.
- **After any registry change**, run `npm run audio:manifest` so the manifest's
  file paths and `placeholder` flags match `src/audio/cues.ts`. `cues.test.ts`
  fails if they drift.

Adding a *new* cue: add it to `CUES` in `scripts/audio/generate.py`, run
`build.sh`, then add the matching entry to `SOUND_CUES` in `src/audio/cues.ts`.
`cues.test.ts` fails if the registry, the manifest and the files on disk ever
disagree.

---

## 7. Tests

`src/audio/__tests__/` — 48 tests, all in the `node` environment.

- `cues.test.ts` — registry ↔ manifest ↔ files on disk parity; mix bounds;
  loop/duck invariants; preload grouping.
- `soundManager.test.ts` — no-WebAudio fallback, muted bus, 404 handled once
  and never retried, throttle window, **throttle-against-scheduled-time**,
  audio-clock offset, detune spread, per-cue and global voice caps, priority
  eviction, natural voice release, `stopAll`, ducking attack + release,
  slider→bus gain, batch playback.
- `matchCues.test.ts` — flight-delay timing, stagger, repeat cap, zone→cue
  mapping, DON!! bulk add, Leader vs Character attack, counter-in-battle
  detection, last-Life sting fires once, perspective (turn / prompt / game
  over), noise control.
- `uiCues.test.ts` — attribute override, opt-out, typo fallback, roles, switch
  direction, label heuristic.

---

## 8. Known limitations / next

- **Music is not migrated yet.** `BacksoundControl` still owns the menu bed
  with its own `<audio>` element. The `music.*` cues, the music bus and
  `playMusic()` crossfade all exist and are wired to the same user settings,
  but nothing calls them yet — doing so before removing the `<audio>` element
  would play two beds at once. Next task: delete that element, call
  `soundManager.playMusic('music.menu' | 'music.battle')` per screen, and drop
  `music.battle.tense` in when the local player reaches 1 Life.
- **Hover cues are unwired.** `resolveHoverCue` exists and is tested; no
  `pointerenter` listener is installed yet. Wire it with a delegated listener
  next to the click one, but only after checking it does not fire on touch.
- **No per-bus user sliders.** Users get one SFX slider and one music slider.
  Per-bus trims live in the registry. If players ask for "quieter UI, louder
  battle", add `busVolumes` to `settingsStore` and multiply it into
  `busBaseGain`.
- **No positional audio.** Everything is centre-panned with a small stereo
  spread baked into the placeholder assets. Panning cues by board side (yours
  vs theirs) is a plausible later polish pass.
- **`ui.matchmaking.search` is a one-shot**, not a loop. If the queue needs an
  audible heartbeat, make it a looping `music`-bus cue instead of repeating it.
- **Twelve cues are still synthetic placeholders**, listed in the manifest with
  `placeholder: true`. The `effect.*` sparkle layer is the clearest gap: those
  cues fire several times per resolution chain, which is exactly where a
  recorded click would turn an effect chain into typing.
- **Seventy-five cues share eight recordings**, separated by pitch. That is a
  deliberate trade — coherent and cheap to load, but a long match hears the
  same impact many times. The fix when it starts to fatigue is more source
  files, not more pitch: variation slots (`impact-a/b/c`) chosen per play would
  need a small `srcVariants` addition to the registry and `soundManager`.
