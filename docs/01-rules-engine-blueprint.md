# Rules Engine Blueprint v0.1

Source of truth: `rule_comprehensive.pdf` ("ONE PIECE CARD GAME Comprehensive Rules", Version 1.2.0, last updated 1/16/2026). All citations below are Comprehensive Rules section numbers (e.g. `6-5-3-1`). Where the rules are silent or genuinely ambiguous, the item is marked **TODO**. Nothing below invents a rule that isn't in the PDF.

This document is the blueprint only — no game logic is implemented yet. Section 20's TypeScript interfaces live as real files in `/src/engine` (types only).

---

## 1. Complete Game Zones (`3. Game Areas`)

Nine zones per player (`3-1-1`). "The field" collectively means Leader area + Character area + Stage area + cost area (`3-1-2`).

| Zone | Visibility | Capacity | Order control | Orientation |
|---|---|---|---|---|
| Deck | Secret (`3-2-2`) | 50 cards at construction (`5-1-2`) | Neither player; shuffled only on instruction (`3-2-4`) | Face-down stack |
| DON!! Deck | **Open** — contents and order visible, and either player may reorder (`3-3-2`) | 10 cards at construction (`5-1-2`) | Either player, freely | Face-down stack (face-down despite being open — `3-3-2`) |
| Hand | Secret to opponent; owner can view/reorder freely (`3-4-2`, `3-4-3`) | No stated cap | Owner only | N/A |
| Trash | Open; owner may reorder own trash freely (`3-5-2`) | No cap | Owner only | Face-up stack, new cards placed on top |
| Leader Area | Open (`3-6-2`) | Exactly 1, fixed for the game — cannot be moved out by effects/rules (`3-6-3`) | N/A | Face-up; active/rested |
| Character Area | Open (`3-7-2`) | Max 5 (`3-7-6`); overflow forces a trash-1 rule action (`3-7-6-1`) | Owner, on play | Face-up; active/rested; default active on entry (`3-7-5`) |
| Stage Area | Open (`3-8-2`) | Max 1 (`3-8-5`); overflow forces trash of the existing Stage (`3-8-5-1`) | N/A | Face-up; active/rested; default active on entry (`3-8-4`) |
| Cost Area | Open (`3-9-2`) | No cap | Owner, freely | DON!! cards; default active on entry (`3-9-3`); no face state (DON!! is open either way) |
| Life Area | Secret (`3-10-2`) — unless a specific effect adds a card face-up, which is an explicit open-area exception (`3-10-2-1`) | Set at setup = Leader's Life value (`2-9-2`) | Strict stack: top of deck ends up at bottom of Life (`2-9-2-1`); top card is the only one removable unless stated otherwise (`3-10-2`) | Face-down stack (mixed face-up/down possible per `3-10-2-1`) |

Notes:
- Moving a card out of Character/Stage area resets it as a "new card" — prior applied effects do not carry over (`3-1-6`). DON!! cards lose all applied effects on any zone change (`3-1-6-1`).
- "Given" DON!! cards (`6-5-5-1`) are **not** a separate zone in the rules' own enumeration (`3-1-1` lists only the 9 zones above). They are modeled as an attachment list on the Leader/Character `CardInstance` they were given to, not as a zone. See `CardInstance.donAttached` in Section 20.
- Cards-in-zone counts are always public information, even for secret zones (`3-1-4`) — only identity/order is hidden.

---

## 2. Card Types and Important Properties (`2. Card Information`)

Five categories (`2-2-2`): **Leader**, **Character**, **Event**, **Stage**, **DON!!**.

| Property | Applies to | Notes |
|---|---|---|
| Name (`2-1`) | All | Some cards derive their name from their own text (`2-1-3`); bracket/quote text in card text can reference partial names (`2-1-2`, `2-1-2-1`) |
| Category (`2-2`) | All | Drives zone placement and base mechanics |
| Color (`2-3`) | All | 6 colors: red, green, blue, purple, black, yellow (`2-3-3`); multicolor cards count as every listed color (`2-3-5`) |
| Type (`2-4`) | All | Free-text tribal tags, slash-separated when multiple (`2-4-2`); some cards derive types from text (`2-4-4`) |
| Attribute (`2-5`) | **Leader & Character only** (`2-5-5`) | 6 values: Slash, Strike, Ranged, Special, Wisdom, "?" (`2-5-2`); can be multiple (`2-5-3`, `2-5-4`) |
| Power (`2-6`) | **Leader & Character only** (`2-6-2`) | Can be modified above/below printed value; can go negative (`1-3-6-1`) without being trashed (`1-3-6-1-1`) |
| Cost (`2-7`) | **Character, Event, Stage only** (`2-7-5`) | Paid by resting active DON!! from cost area (`2-7-2`–`2-7-4`); floor of 0 outside in-progress calculations (`1-3-6-2`) |
| Card Text (`2-8`) | All (may be empty = "no base effect", `2-8-5`) | Resolved top-to-bottom (`2-8-3`); parenthetical text is a non-functional explanatory note (`2-8-4`, `2-8-4-1`), except where explicitly used to clarify the effect itself (`2-8-4-2`) |
| Life (`2-9`) | **Leader only** (`2-9-3`) | Determines starting Life-area card count |
| Counter (symbol) (`2-10`) | **Character only** (`2-10-2`) | Power boost activatable in the Counter Step |
| [Trigger] (`2-11`) | Part of card text | Alternate-resolution effect on Life-card reveal |
| Card Number (`2-14`) | All | Max 4 copies of the same number per deck (`2-14-2`) |
| Copyright, Rarity, Block Symbol, Illustration, Illustrator (`2-12`, `2-13`, `2-15`–`2-17`) | All | **Explicitly no gameplay effect** — store as metadata only, engine must never branch on these |

---

## 3. Turn Structure and Phases (`6. Game Progression`)

A turn = Refresh → Draw → DON!! → Main → End (`6-1-1`).

1. **Refresh Phase** (`6-2`): expire "until start of your next turn" effects; fire "at start of your/opponent's turn" effects; return all given DON!! to cost area and rest them (`6-2-3`); set all of the turn player's rested field cards to active (`6-2-4`).
2. **Draw Phase** (`6-3`): draw 1 card — **except** the first player draws no card on their own first turn (`6-3-1`).
3. **DON!! Phase** (`6-4`): place 2 DON!! face-up into cost area; first player's first turn places only 1 (`6-4-1`); if only 1 card remains in the DON!! deck, place that 1 (`6-4-2`); if 0 remain, place none (`6-4-3`).
4. **Main Phase** (`6-5`): fire "at start of Main Phase" effects (`6-5-1`); then the turn player may freely interleave, any number of times: Play a Card, Activate a Card's Effect, Give DON!!, Battle (`6-5-2`); ends on player declaration (`6-5-2-1`).
5. **End Phase** (`6-6`): resolve `[End of Your Turn]` effects (turn player's choice of order if multiple), then `[End of Your Opponent's Turn]` effects (non-turn player's choice of order) (`6-6-1-1`–`6-6-1-1-4`); expire "end of this turn" continuous effects, turn-player's first then non-turn player's (`6-6-1-2`, `6-6-1-3`); pass turn (`6-6-1-4`).

Battle is **not** a sixth phase — it is one of the repeatable Main Phase actions (`6-5-6`), itself a 5-step sub-flow (Section 5 below / Section 7 of the rules).

---

## 4. Legal Actions per Phase

| Phase | Player-facing actions |
|---|---|
| Refresh | None — fully automatic (`6-2`) |
| Draw | None — automatic draw; any triggered effects resolve as pending choices if they offer one |
| DON!! | None — automatic placement |
| Main | `PLAY_CHARACTER`, `PLAY_STAGE`, `ACTIVATE_EVENT_MAIN` (Event marked `[Main]`), `ACTIVATE_CARD_EFFECT` (field card marked `[Activate: Main]`/`[Main]`), `GIVE_DON`, `DECLARE_ATTACK` (enters Battle), `END_MAIN_PHASE` — turn player only (`6-5-2`–`6-5-5`) |
| Battle → Attack Step | System fires `[When Attacking]`/`[On Your Opponent's Attack]`; no extra player action beyond the initiating `DECLARE_ATTACK` (`7-1-1`) |
| Battle → Block Step | Non-turn player: `ACTIVATE_BLOCKER` (at most once per battle, `7-1-2-1`) or pass |
| Battle → Counter Step | Non-turn player: any number/order of `ACTIVATE_COUNTER_CHARACTER` (trash a Counter character from hand) and/or `ACTIVATE_COUNTER_EVENT` (pay cost + trash a `[Counter]` Event), or pass (`7-1-3-2`) |
| Battle → Damage Step | None — automatic resolution, may surface a pending choice to activate `[Trigger]` (`7-1-4-1-1-2`) |
| Battle → End of Battle | None — automatic; returns control to Main Phase (`7-1-5-5`) |
| End | Turn player orders own `[End of Your Turn]` resolutions if multiple; non-turn player orders own `[End of Your Opponent's Turn]` resolutions if multiple (`6-6-1-1-3`, `6-6-1-1-4`) |

Any Main Phase action may, mid-resolution, produce a `PendingChoice` (Section 11) that must be resolved via `RESOLVE_PENDING_CHOICE` before further actions are legal.

---

## 5. Battle Flow (`7. Card Attacks and Battles`)

Attacker is the Leader or one Character from the Character area, declared by resting it (`7-1-1-1`). Legal targets: opponent's Leader, **or an opponent's already-rested Character** — active opposing Characters cannot be targeted (`7-1`, `7-1-1-2`).

1. **Attack Step** (`7-1-1`): declare attacker (rest it) → declare target → `[When Attacking]`/"when you attack"/`[On Your Opponent's Attack]`/「When Attacked」 effects fire (`7-1-1-3`). If attacker or target left their zone by the end of this step, skip straight to End of Battle (`7-1-1-4`).
2. **Block Step** (`7-1-2`): defender may rest one `[Blocker]` card to substitute itself as the new target, once per battle (`7-1-2-1`); `[On Block]`/"when you block" fires on activation (`7-1-2-2`). Same early-exit-to-End-of-Battle check (`7-1-2-3`).
3. **Counter Step** (`7-1-3`): "when attacked" effects fire (`7-1-3-1`); defender may freely interleave trashing Counter-symbol Characters from hand for a power boost (`7-1-3-2-1`) and/or paying-and-trashing `[Counter]` Events (`7-1-3-2-2`). Same early-exit check — printed in the source as `7-1-2-3` a second time, almost certainly a typo for `7-1-3-3` (see Section 19 #2).
4. **Damage Step** (`7-1-4`): compare power, attacker wins ties (`>=`). vs. Leader → 1 damage, doubled by `[Double Attack]` (`7-1-4-1-1-3`), each point of damage individually triggers Life-card-to-hand or `[Trigger]` reveal (`7-1-4-1-1-2`); 0 Life at the moment damage is determined = attacker wins the game (`7-1-4-1-1-1`). vs. Character → defender Character is K.O.'d (`7-1-4-1-2`). Attacker underpowered → battle simply fails, no effect (`7-1-4-2`).
5. **End of Battle** (`7-1-5`): "at the end of the/this battle" effects fire; battle-scoped continuous effects from both players expire; return to Main Phase (`7-1-5-5`).

---

## 6. Effect Timing Categories (`8. Activating and Resolving Effects`, `10. Keyword Effects and Keywords`)

Four effect categories (`8-1-3`):
- **Auto effects** — fire automatically and repeatably whenever their activation event occurs (`8-1-3-1`); includes `[On Play]`, `[When Attacking]`, `[On Block]`, `[On K.O.]`, `[End of Your Turn]`, `[End of Your Opponent's Turn]`, plus any free-text "when…/on…" trigger (`8-1-3-1-1`). Voided if the source card leaves its zone before the effect actually activates (`8-1-3-1-3`).
- **Activate effects** — player-declared during the turn player's Main Phase outside of battle; tagged `[Activate: Main]` or `[Main]` (`8-1-3-2`).
- **Permanent effects** — continuously valid while in scope, may require ongoing conditions (`8-1-3-3`); some apply even from a secret area if tagged "according to/under the rules" (`8-1-3-3-3`). Conflicting permanent-effect recalculation order: turn player's effects, then non-turn player's, repeated to a fixed point (`8-1-3-3-5`).
- **Replacement effects** — keyed by the word "instead"; substitute for the entire replaced process, optional unless forced, and cannot reapply to an already-replaced situation (`8-1-3-4`).

Effects are also either **one-shot** (resolve once, done) or **continuous** (`8-1-4`).

Timing keywords with their own activation trigger (`10-1`, `10-2`): `[Rush]`, `[Double Attack]`, `[Banish]`, `[Blocker]`, `[Trigger]`, `[Rush: Character]`, `[Unblockable]`, `[On Play]`, `[When Attacking]`, `[On Block]`, `[On Your Opponent's Attack]`, `[On K.O.]`, `[End of Your Turn]`, `[End of Your Opponent's Turn]`. Condition keywords (not triggers, gate activation): `[DON!! xX]`, `[Your Turn]`, `[Opponent's Turn]`, `[Once Per Turn]`, `DON!! −X`.

Resolution order when multiple things are ready at once: turn player resolves first (`8-6-1`); newly-fulfilled turn-player triggers caused by that resolution still yield to any newly-fulfilled non-turn-player trigger before continuing (`8-6-1`, example in `8-6-1-1`). Effects whose timing is fulfilled *during* damage processing wait until all damage processing finishes (`8-6-2`), except a `[Trigger]` reveal mid-damage-processing, which can suspend the procedure (`8-6-2-1`).

---

## 7. Required Event Hooks

Derived directly from the auto-effect timings (Section 6) and phase/step transitions (Sections 3 & 5). These are the hook names the rules engine must expose for the (future, separate) effect-template system to subscribe to — the hooks themselves carry no card-specific logic:

- `onGameStart`, `onGoingFirstChosen`, `onMulliganDecision`
- `onTurnStart` (Refresh Phase entry — covers "at the start of your/opponent's turn")
- `onDrawPhase`, `onDonPhase`
- `onMainPhaseStart`
- `onCardPlayed` (`[On Play]`)
- `onAttackDeclared` (`[When Attacking]` / `[On Your Opponent's Attack]` / 「When Attacked」)
- `onBlockerActivated` (`[On Block]`)
- `onCounterStepEntered`
- `onDamageAboutToBeDealt` / `onLifeCardRevealed` (for `[Trigger]` decision points)
- `onCharacterKO` (`[On K.O.]` — note the activation/resolution split in `10-2-17-1`/`10-2-17-2`)
- `onBattleEnd`
- `onEndOfTurn` (`[End of Your Turn]`) / `onEndOfOpponentsTurn` (`[End of Your Opponent's Turn]`)
- `onCardMoved` (zone-change hook; needed for the repeated "did the attacker/target move zones" checks in Section 5, and for `3-1-6`'s "new card" reset)
- `onDonGiven`
- `onPermanentEffectRecalculate` (drives the `8-1-3-3-5` fixed-point loop)
- `onRuleProcessing` (defeat-condition sweep, Section 9 of the rules)

---

## 8. Required Game State Variables

- `turnNumber: number`
- `activePlayerId: PlayerId` (the "turn player", `4-3-1`)
- `currentPhase: Phase`
- `currentBattle: BattleState | null` (attacker/target instance ids, current `BattleStep`, per-battle continuous-effect ledger)
- `players: Record<PlayerId, PlayerState>`
- `rng: RngState` (seed + cursor/call-count, never the raw `Math.random`)
- `effectStack` / `pendingTriggers` (queue of fulfilled-but-unresolved auto effects, needed for `8-6-1` ordering)
- `continuousEffects: ContinuousEffectRecord[]` (source card instance id, duration tag — `untilStartOfNextTurn` / `endOfTurn` / `duringThisBattle` / etc., owner)
- `oncePerTurnUsage: Record<effectInstanceKey, true>` (cleared on Refresh; keyed by card-instance id specifically because re-entering the field resets the lock, `10-2-13-4`)
- `pendingChoices: PendingChoice[]`
- `log: GameLogEntry[]`
- `gameOver: { winnerId: PlayerId | null; reason: GameOverReason } | null` (Section 1-2 of the rules)
- `isFirstTurnOfGame: boolean` (gates the no-draw / 1-DON!! / no-battle first-turn exceptions, `6-3-1`, `6-4-1`, `6-5-6-1`)

---

## 9. Required Player State Variables

- `playerId: PlayerId`
- `leader: CardInstance`
- `deck: CardInstance[]` (ordered, secret, top = index 0 by convention)
- `donDeck: CardInstance[]` (ordered, open — both players may view/reorder, `3-3-2`)
- `hand: CardInstance[]` (secret to opponent)
- `characterArea: CardInstance[]` (max 5, `3-7-6`)
- `stageArea: CardInstance | null` (max 1, `3-8-5`)
- `costArea: CardInstance[]` (DON!! cards currently un-given)
- `trash: CardInstance[]` (ordered, owner-reorderable)
- `lifeArea: CardInstance[]` (ordered stack, top = next to flip, `3-10-2`)
- `hasGoneFirst: boolean`
- `hasMulliganed: boolean` (the once-only redraw, `5-2-1-6`)
- `donGivenThisTurnCount` is **not** tracked globally — it's per-card via `CardInstance.donAttached`

---

## 10. Required Card Instance Variables

A `CardInstance` is a specific physical card in a specific zone-occupancy — re-entering a zone counts as a new instance for the purposes of effect history (`3-1-6`).

- `instanceId: string` (unique per zone-entry, regenerated/reset on zone change)
- `cardDefinitionId: string` (foreign key into the normalized card-data layer — API data, never logic)
- `ownerId: PlayerId`
- `controllerId: PlayerId` (defaults to `ownerId`; see TODO #4, no confirmed control-changing effect found yet in this ruleset)
- `currentZone: ZoneId`
- `orientation: 'active' | 'rested' | null` (`null` for DON!! cards, which are neither, `4-4-2`)
- `faceState: 'faceUp' | 'faceDown'` (relevant for Life/Deck cards revealed by an effect, `3-10-2-1`, `11-2`)
- `donAttached: CardInstance[]` (DON!! cards "given" to this Leader/Character, `6-5-5-1`; each grants +1000 power for the turn, `6-5-5-2`)
- `powerModifiers` / `currentPower` (derived; base power per `2-6`, can be negative `1-3-6-1`)
- `costModifiers` / `currentCost` (derived; floors at 0 outside in-progress calc, `1-3-6-2`)
- `appliedContinuousEffects: string[]` (ids into the game-level `continuousEffects` ledger)
- `summoningSick: boolean` (cannot attack the turn it was played unless `[Rush]`/`[Rush: Character]`, `3-7-4`)
- `revealedTo: PlayerId[] | 'all'` (transient reveal tracking, reset after the revealing effect/cost resolves, `11-2-2`)

---

## 11. Pending Choice Model

Any rule text containing "choose", "select", "up to", "may", or a player-ordering decision (`1-3-4`, `8-4-4`) produces a `PendingChoice` instead of the engine guessing. Examples directly from the rules: which active DON!! to rest for a cost (`2-7-2`–`2-7-4`), attack target (`7-1-1-2`), whether to activate `[Blocker]` (`7-1-2-1`), Counter Step action ordering (`7-1-3-2`), whether to reveal and activate `[Trigger]` instead of drawing (`10-1-5-1`, `10-1-5-2`), which Character to trash when the Character area is full — though that specific case is a forced rule action with **no effect attached**, per `3-7-6-1-1` — and ordering of simultaneously-fulfilled own-effects (`1-3-4`, `6-6-1-1-3`).

The choice itself is always made by a specific player, scoped to a specific source (a card, a cost, or a rule), with explicit min/max cardinality (`8-4-4-1`), and — critically — if the choice is drawn from a secret area, the player is allowed to decline even a card that would satisfy the condition, since they can't be forced to guarantee an unknown card's properties (`8-4-4-2`).

---

## 12. Game Action Model

Every player-originated action is a serializable, validated, single dispatch — designed so a local hotseat click and a future network packet are the same shape. Action types map 1:1 to Section 4's table: `PLAY_CHARACTER`, `PLAY_STAGE`, `ACTIVATE_EVENT_MAIN`, `ACTIVATE_CARD_EFFECT`, `GIVE_DON`, `DECLARE_ATTACK`, `ACTIVATE_BLOCKER`, `ACTIVATE_COUNTER_CHARACTER`, `ACTIVATE_COUNTER_EVENT`, `PASS_STEP`, `RESOLVE_PENDING_CHOICE`, `END_MAIN_PHASE`, `MULLIGAN_DECISION`, `CHOOSE_GOING_FIRST`, `CONCEDE`.

Pipeline (per project instructions): `validate(state, action) → ValidationResult`, then, only if valid, `execute(state, action) → { state: GameState; log: GameLogEntry[]; pendingChoices: PendingChoice[] }`. Validation and execution are pure functions — no UI, no animation, no I/O.

---

## 13. Game Log Model

Every state mutation emits one or more `GameLogEntry` records, append-only, sequence-numbered for deterministic replay (not wall-clock dependent). Because some information is hidden (hands, deck order, Life contents), each entry needs a **visibility scope** independent of the zone it touches — e.g. "Player A played a card from hand" is public the instant the card resolves into an open zone, but "Player A looked at the top 3 of their deck" is private to Player A unless a card says otherwise (`11-3-1`). Debug/local-hotseat mode can render the unredacted log; a future networked client must only ever receive the redacted projection for its own `playerId`.

---

## 14. Seeded RNG Model

The only randomness explicitly required by the rules is **shuffling**: initial deck shuffle (`5-2-1-2`), mulligan reshuffle (`5-2-1-6-1`), and "shuffle your deck" effects in general (`3-2-4`). The engine must never call ambient `Math.random()` — all randomness flows through an injected, serializable `SeededRNG` so a game (or a single shuffle) can be replayed bit-for-bit from a log. `SeededRNG` needs: a serializable internal state (seed + draw count, not a closure), a pure `nextFloat()`/`nextInt(max)`, and a `shuffle<T>(array: T[])` helper (Fisher–Yates) built only from those primitives.

TODO: the DON!! deck's shuffling requirement at setup is unspecified (Section 19 #3) — it may turn out to need no RNG at all, since its order is fully open information (`3-3-2`).

---

## 15. Local Hotseat Flow

One human, two seats, strict turn alternation per Section 3. The engine does not know or care that one human is driving both seats — it only ever sees actions tagged with a `playerId`, exactly as it would over a network. Concretely:

1. Setup: `CHOOSE_GOING_FIRST` → both players' "at the start of the game" Leader effects, chooser's first (`5-2-1-5-1`) → opening hand of 5 → sequential `MULLIGAN_DECISION` (first player, then second, `5-2-1-6`) → Life cards dealt face-down per Leader's Life value (`5-2-1-7`) → first player's turn begins (`5-2-1-8`).
2. During normal play, the UI determines which seat is "active" for the *next required input* — that's the turn player during most of the Main Phase, but flips to the non-turn player during Block/Counter Step decisions and any opponent-side `PendingChoice`. The UI layer (not the engine) is responsible for prompting "pass the device" or swapping the active half of a split layout.
3. Per project ground rules, secret-zone redaction is still modeled even though one human technically "owns" both hands — a debug toggle reveals both hands; the default hotseat view should still respect per-seat visibility so the same projection logic ships unchanged to online play.

---

## 16. Path to Online Multiplayer

Because Sections 12–13 already force every mutation through serializable `GameAction → (state, log, pendingChoices)`, the same pure engine can run unmodified on an authoritative server: clients send a `GameAction`, the server validates+executes it against the canonical `GameState`, and broadcasts results. Three additions are needed, none of which touch the engine's rules:

1. **Per-player view projection** — a `projectStateForPlayer(state, playerId)` function that strips opponent hand/deck/Life contents per the zone-visibility table in Section 1, and redacts `GameLogEntry`s per Section 13's visibility scope.
2. **Server-seeded RNG only** — clients must never supply or influence the seed; the `SeededRNG` from Section 14 lives server-side exclusively.
3. **Pending-choice round trips** — a `PendingChoice` becomes a request sent to the specific `playerId` it targets; `RESOLVE_PENDING_CHOICE` is the only action type a client can submit while one is outstanding for them.

This is exactly why `/networkFuture` exists as an empty placeholder today — the adapter is additive, not a rewrite.

---

## 17. Mobile/Desktop Board Layout Considerations

Reference: official `playsheet.pdf` single-player half-board layout —

- Top band, full width: **Character Area** (row of up to 5 cards).
- Middle band: vertical **phase tracker** (Refresh → Draw → DON!! → Main → End) and **Life** counter on the left edge; **Leader / Stage / Deck** as three single-card slots on the right.
- Bottom band: **DON!! Deck** (left), wide **Cost Area** (center, holds in-play DON!!), **Trash** (right).

For the full two-player surface, the opponent's half-board mirrors (rotates 180°) above the local player's half — matching the physical tabletop. Implications for the UI/board-projection layer (Layer 3, never the engine):

- **Landscape** is the primary layout and should mirror this physical band structure directly.
- **Portrait** needs simplification: collapse Cost Area to a DON!! count badge, tuck DON!! Deck/Trash behind a tap-to-expand drawer, keep Character Area + Leader + Life always visible, and replace the analog phase tracker with a compact persistent phase indicator (no room for 5 discrete boxes).
- Both **drag-and-drop** (mouse/desktop, tablet) and **tap-to-select → tap-target** (touch fallback, small phones) must drive the *same* `GameAction` dispatch — the input method is purely an interaction-layer (Layer 4) concern.
- **Card zoom/preview** (long-press or explicit tap) is required wherever card art is rendered below a legible size, which in practice means most mobile layouts.

---

## 18. 3D/Animation Separation Rules

Per project ground rules, Layers 1–2 (state + rules engine) are the only layers that decide legality or outcome; Layers 5–6 (animation, 3D) are purely observational.

- Every `GameAction` resolves to a **new, complete `GameState`** atomically — there is no "mid-animation" game state. A K.O.'d Character is already in the trash in the very state update that reflects the K.O.
- The Animation layer consumes a *diff* between the previous and next `GameState` (or the emitted `GameLogEntry` stream) and plays a purely presentational transition; it must be fully skippable/instant without changing the outcome or timing of any future legal action.
- The 3D renderer subscribes only to the Board Projection (Layer 3) output and/or the Animation layer's state, never to raw engine internals — this is what keeps 3D "optional and isolated" per project ground rules.
- A global "reduced motion / 2D only" config flag must make the Animation and 3D layers no-op straight to final-state rendering, and the game must remain fully playable in that mode.

---

## 19. Ambiguous Rules or Missing Data — Needs Confirmation

1. **TODO** — `6-5-6-1` says "Neither player can battle on their first turn." Read here as *each player's own individual turn 1* (i.e., no attacks during either of the game's first two turns), consistent with the no-draw (`6-3-1`) and single-DON!! (`6-4-1`) carve-outs which are unambiguously per-player. Flagging because the clause itself doesn't restate "their" as explicitly as the draw/DON!! rules do.
2. **TODO** — Source PDF numbers the Counter-Step early-exit clause `7-1-2-3`, duplicating the Block-Step clause's number; contextually it should read `7-1-3-3`. Treating it as a step-exit-to-End-of-Battle rule identical in shape to `7-1-1-4`/`7-1-2-3`, but flagging the source typo rather than silently renumbering it without confirmation.
3. **TODO** — Section 5 (Game Setup) specifies shuffling the *card* deck (`5-2-1-2`) but never states whether the 10-card DON!! deck is shuffled, ordered, or arranged arbitrarily at setup. Since the DON!! deck is fully open information (`3-3-2`), order may be inconsequential, but this needs an explicit ruling before the engine decides whether `SeededRNG` is even invoked for it.
4. **TODO** — No control-changing effect ("take control of opponent's Character") appears anywhere in this Comprehensive Rules document. `CardInstance.controllerId` is included defensively (mirrors `ownerId` for now) but should be revisited once actual card text exercising this is found — otherwise it's speculative surface area.
5. **TODO** — `8-6-1`/`8-6-1-1` walks through a 3-effect simultaneous-trigger example but doesn't give a fully general N-effect algorithm; the engine's trigger-ordering implementation should be checked against official rulings/FAQ once available, not just this document.
6. **TODO** — `5-2-1-6` establishes mulligans are sequential (first player, then second) but doesn't state whether the second player's decision is informed by anything about the first player's redraw beyond hand size (which doesn't change). Treating both mulligan decisions as independent.
7. **TODO** — `10-1-6` (`[Rush: Character]`) only states the card may attack the turn it's played; it doesn't restate the normal targeting restriction (Leader, or a *rested* Character) explicitly for this keyword. Assuming the general Attack Step targeting rule (`7-1`) still applies, pending confirmation.
8. **RESOLVED, with a follow-on TODO** — The OPTCG Cards API (`optcgapi.com`) has been inspected and mapped; see `docs/02-card-library-and-deck-architecture.md` for the full design (`/src/cards/api`, `/src/cards/normalization`, `/src/cards/library`, `/src/cards/decks`, `/src/cards/assets`). Card identity, color, attribute, numeric fields, and canonical-printing selection are normalized into `CardDefinition`. Still open: `[Trigger]`/`[Counter]`/`[Blocker]`/`[On Play]` etc. remain **free text only** inside `CardDefinition.text` — the API has no structured keyword field, and per project rule #6/#7 this text is never parsed into executable logic here. Mapping specific cardNumbers to effect templates is separate, hand-authored future work (`/src/cards/effectTemplates`, not yet started).
9. **TODO** — Exact granularity of "rule processing" (`9-1-1`, defeat-condition sweep) — i.e., whether it must run after literally every state mutation or only at defined checkpoints (damage dealt, deck draw) — is implied but not spelled out as an algorithm. Likely "after every action and every effect resolution," matching common TCG state-based-action patterns, but not explicitly stated in this document.

---

## 20. TypeScript Interfaces

Implemented as real files (types only, no logic) under `/src/engine`:

- `src/engine/state/zone.ts` — `ZoneId`, `Zone<T>`
- `src/engine/state/card.ts` — `CardInstance`, `CardCategory`, `Color`, `Attribute`, `Orientation`, `FaceState`
- `src/engine/state/player.ts` — `PlayerState`
- `src/engine/state/game.ts` — `GameState`, `Phase`, `BattleState`, `BattleStep`
- `src/engine/actions/action.ts` — `GameAction` (discriminated union) + per-type payloads
- `src/engine/logs/logEntry.ts` — `GameLogEntry`, `LogVisibility`
- `src/engine/events/pendingChoice.ts` — `PendingChoice`, `ChoiceKind`
- `src/engine/events/effectHook.ts` — `EffectHook`, `EffectCategory`, `EffectTimingKeyword`
- `src/engine/rng/rng.ts` — `SeededRng`, `RngState`

See those files for the actual interfaces — kept out of this document so there is exactly one source of truth for the schema (the code itself), with this doc only describing *why* each shape exists.

**Implemented since v0.1 (Section 5 setup flow, this pass):**

- `src/engine/rng/seededRng.ts` — concrete `SeededRng` (FNV-1a seed hash + splitmix32-style finalizer); pure function of `(seed, cursor)`, no stateful generator.
- `src/engine/state/game.ts` — added `Phase: 'setup' | ...`, `SetupStage`, `SetupState`, `GameState.setupState`.
- `src/engine/state/player.ts` — added `PlayerState.leaderLifeValue` (a setup-time snapshot of the Leader's printed Life, `2-9`, so `5-2-1-7` and any future Life-value-referencing effect never need to import `CardDefinition` lookups into the engine).
- `src/engine/setup/setupInput.ts` — `PlayerSetupInput`, `validatePlayerSetupInput` (structural checks only — see file header for why deck-construction legality is deliberately NOT re-derived here).
- `src/engine/setup/instanceIds.ts` — deterministic (non-random) `CardInstance` id minting for setup, so replays are byte-identical.
- `src/engine/setup/createPreGameState.ts` — `5-2-1-1`–`5-2-1-3` + DON!! deck placement (not action-driven; nothing here waits on a `GameAction`).
- `src/engine/setup/applyChooseGoingFirst.ts` — `validateChooseGoingFirst` / `executeChooseGoingFirst` (`5-2-1-4`–`5-2-1-6` opening hands).
- `src/engine/setup/applyMulliganDecision.ts` — `validateMulliganDecision` / `executeMulliganDecision` (`5-2-1-6` mulligan, cascading into `5-2-1-7` Life dealing and `5-2-1-8` turn-1 start once both players have decided).
- `src/engine/setup/setupExecuteResult.ts` — shared `{ state, log, pendingChoices }` return shape (Section 12 pipeline), where `log`/`pendingChoices` are this-action-only deltas, not the full accumulated `state.log`/`state.pendingChoices`.

---

## Known Limitations of This Blueprint

- Card data normalization (`/src/cards`) is implemented — see `docs/02-card-library-and-deck-architecture.md`. No card effect TEMPLATE execution model exists yet; effect text is stored raw and unmapped (`/src/cards/effectTemplates` not started).
- The App Shell + Deck/Card UI layer (`/src/app`) is implemented — see `docs/03-app-shell-and-ui.md`. It is UI/navigation only and decides nothing about legality or outcome; the Match screen it ends in is an explicit placeholder pending everything in this document.
- No effect-template execution model exists yet; `EffectHook` (Section 20) only describes *when* a card's effect would fire, never *what* it does.
- Replacement-effect precedence (`8-1-3-4-2`), permanent-effect fixed-point recalculation (`8-1-3-3-5`), and infinite-loop handling (`11-1`) are documented as rules but have no engine algorithm yet — they're earmarked for the rules-engine implementation task, not this blueprint.
- 8 of 9 TODOs in Section 19 are still open (#8 resolved above) and should be resolved (or explicitly accepted as "best read of the text") before the corresponding engine code is written.
- **Section 5 setup flow is now implemented** (`createPreGameState`, `executeChooseGoingFirst`, `executeMulliganDecision`) but deliberately skips `5-2-1-5-1`/`5-2-1-5-2` (start-of-game Leader effects and the conditional reshuffle they can trigger) — there is no effect-template system yet for an engine-level hook to call into, so this is a tracked gap, not an oversight. The DON!! deck is placed unshuffled (Section 19 #3 is still open on whether it needs shuffling at all).
- **Vitest could not be executed in this sandbox.** `node_modules` here was installed on a Windows machine and only contains Windows-platform optional deps (`@rollup/rollup-win32-*`); the sandbox is Linux and the npm registry is blocked for fetching the missing `@rollup/rollup-linux-x64-gnu` binary, and the bundled `esbuild` binary is likewise a Windows binary (confirmed by running it — `win32-x64` mismatch). Verification performed instead: (1) `tsc --noEmit` passes cleanly across the whole engine, including all new setup code and all three new test files (`seededRng.test.ts`, `setupFlow.test.ts`, `fixtures.ts`), so every shape/contract the tests assert against is statically sound; (2) the RNG's actual hash/mix/shuffle algorithm was copy-run standalone under plain `node` (no bundler involved) across 500+ trials, confirming determinism, valid Fisher–Yates permutations, a reasonably uniform first-card distribution, and in-range floats. **Action needed from the user:** run `npm test` (or `npx vitest run`) on your own machine to get an actual pass/fail signal from the Vitest suite itself — that has not happened yet.

## Next Recommended Task

Implement the generic action dispatcher (priority #3, Section 12): a single `validateAction(state, action) → ValidationResult` / `executeAction(state, action) → { state, log, pendingChoices }` switchboard that routes by `action.type` to the per-action validate/execute pairs — wiring in the two pairs that already exist (`CHOOSE_GOING_FIRST`, `MULLIGAN_DECISION`) first, with the remaining Section 4 action types stubbed as explicit "not yet implemented" rejections rather than silently falling through. This is what the local hotseat UI (priority #4) will call instead of importing individual setup functions directly, and it's the seam the future network adapter (priority #13) reuses unchanged.
