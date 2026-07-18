# Effect Curation — Coverage Addition Worklist

## Progress update — 2026-07-18 (reveal-from-var play + trash pair one-rested)

Closed **2** more partials (**51 → 49**). New reusable pieces:

- **`optionalRevealTypeFromHand.upTo`** — reveal 1..N (OP10-058).
- **`playFromHand` / `playFromTrash` `fromVar`** — play a subset of a prior binding; var selector supports `filter` + `excludeIdsFromVar`.
- **`playPairOneRested`** — dual trash picks, then choose which enters rested when both selected (`boundVarsTotalCount` sequence gate).
- **`SearchFilter.excludeIdsFromVar`** + trash selectors pass bindings into `searchEligible`.

| Card | Closure |
| --- | --- |
| OP10-058 | gated draw (any Character ≥8) → reveal up to 2 Dressrosa ≤7 → play 1 → other rested if ≤4 |
| OP06-086 | ≤4 + ≤2 from trash → if 2 picked, choose rested; lone pick plays active |

### Next recommended targets

- Expressible leftovers from `effect-partial-curation.csv`.
- Hard defer: ST28-004 DON return rested, EB02-039 same-name-as-trashed.

## Progress update — 2026-07-18 (opponent active-DON modal + exclude-previous split debuff)

Closed **2** more partials (**53 → 51**). New reusable pieces:

- **`returnOpponentDon.activeOnly`** — opponent returns active (unattached cost-area) DON!! only (OP15-059 modal).
- **`TargetFilter.excludeIdsFromVar` / `opponentCharacters.excludeIdsFromVar`** — second target choice excludes a prior `captureCount` binding (OP08-118 −3000/−2000 split).

| Card | Closure |
| --- | --- |
| OP15-059 | opponent `chooseOne`: return 1 active DON!! **or** take −2000 |
| OP08-118 | −3000 on up to 1 Character, −2000 on a different Character, then KO ≤3000 |

Still deferred: OP06-086 (which of two trash plays is rested is a free choice, not slot-forced); OP10-058 (reveal up to 2 → play 1 → play other rested if ≤4). Tests: assembler (`activeOnly`, `excludeIdsFromVar`); `returnOpponentDonFamily` active-only candidates.

### Next recommended targets

- OP10-058 — reveal-from-hand selection → play one / play other rested.
- OP06-086 — choose which trash card enters rested after dual pick.
- Hard defer: ST28-004 DON return rested, EB02-039 same-name-as-trashed.

## Progress update — 2026-07-18 (Life+hand gate + mill-by-count + dual hand-down-to)

Closed **4** more partials (**57 → 53**). New reusable pieces:

- **`selfLifeAndHand` / `noneOf` gates** — Life+hand total checks and NOR nesting (OP04-040 draw vs deck→Life branch).
- **`trashTopDeck.countVar`** — mill by length of prior selection binding (OP09-059).
- **`trashHandDownTo.player`** — opponent hand equalization (OP05-058).

| Card | Closure |
| --- | --- |
| OP04-040 | Life+hand ≤4 → choose draw vs deck→Life when cost-8+ Char; else draw |
| OP09-059 | Counter +3000 → trash up to 2 hand → mill same count |
| OP05-058 | board clear + both players `trashHandDownTo` 5 |
| OP04-073 | chooseOne: trash BW ally + self → add 1 active DON!! |

Known limitation: `trashHandDownTo` auto-discards from hand end (no per-card choice), matching OP14-054. Tests: gates (Life+hand, noneOf); `trashTopDeckCountVarFamily`; assembler / partialCurationsBatch green.

### Next recommended targets

- Expressible leftovers from `effect-partial-curation.csv`.
- Hard defer: ST28-004 DON return rested, EB02-039 same-name-as-trashed.

## Progress update — 2026-07-18 (opponent modal + recur + play remainder)

Closed **6** more partials (**63 → 57**). New reusable piece:

- **`searchTopDeck` `destination: 'play'` + `remainder: 'deckTopOrBottom'`** — reveal/play from look, then place unplayed remainder top or bottom (OP06-057). Shares the hand-remainder choice path via `__searchPickChosen`.

| Card | Closure |
| --- | --- |
| OP05-099 | opponent `chooseOne`: trash top Life **or** take −2000 |
| OP05-111 | stale PARTIAL removed — Kotori play → Life face-up already exact |
| OP11-117 | dropped bogus `restThis` / Counter note; Main Life-face + typed +1000 only |
| OP15-080 | onKO: place 3 trash bottom → `playSelfFromTrash` |
| OP15-100 | `chooseOne` trash-self + Life→hand → KO cost ≤6 |
| OP06-057 | `searchTopDeck` play cost-2 + remainder top/bottom (replaces hand approx) |

Tests: hand-remainder family still green; new play+topOrBottom case in `searchTopDeckPlayFamily`; assembler / partialCurationsBatch / gates green.

### Next recommended targets

- OP04-040 — `selfLifeAndHand` gate + optional deck→Life branch.
- OP09-059 — trash up to 2 → mill equal count (`countVar` mill).
- Hard defer: OP08-118 split debuff, ST28-004 DON return rested, EB02-039 same-name-as-trashed.

## Progress update — 2026-07-18 (deck top/bottom + optional Leader negate + face-up Life)

Closed **4** more partials (**67 → 63**). New reusable pieces:

- **`MoveCardDestination` deck `topOrBottom`** — hand→deck after draw (OP08-056).
- **Optional Leader `chooseTargets`** — Leader group is choosable only when `optional: true`, so "up to 1 opponent Leader" can be declined; mandatory Leader effects stay direct.
- **`turnTopLifeFace.fromFaceUp`** + selector `controllerFaceUpLife` — turn a face-up Life card face-down (ST13-009).
- **`selfHandMatching.exactCost`** — unlocks reveal-then-move for cost-filtered hand reveals (ST13-005).

| Card | Closure |
| --- | --- |
| OP08-056 | draw 1 then place 1 hand card top **or** bottom of deck |
| OP09-093 | optional opponent-Leader negate + Character negate → `preventAttack` on `ref: 'previous'` |
| ST13-005 | Life trash cost → `optionalRevealTypeFromHand` cost-5 Character → Life top face-down |
| ST13-009 | turn 1 face-up Life face-down → optional trash opp Life top if hand ≥7 |

ST13-003 face-up Life→deck-bottom replacement rule still deferred. Tests: assembler (deck topOrBottom, optional Leader negate, fromFaceUp), gates exactCost; partialCurationsBatch / revealTopLifePlayFamily green.

### Next recommended targets

- ST13-003 — static Life-to-deck-bottom replacement (rules-layer).
- Remaining Life reorder / face-state cluster from the live backlog.
- Other expressible leftovers in `effect-partial-curation.csv`.

## Progress update — 2026-07-18 (koedCharacter filters + same-target power KO)

Closed **4** more partials (**71 → 67**). New reusable pieces:

- **`koedCharacterTypeIncludes` / `koedCharacterAnyOfTypes` / `koedCharacterMinBasePower`** — onCharacterKoed event context now carries `koedCharacterDefinitionId` from the pre-K.O. state.
- **`oncePerTurnKey`** on abilities — shared OPT bucket across reactive timings (OP10-042 removal + KO halves).
- **`ifPreviousSelectedPowerAtMost`** — gate follow-on ops on current power of var `t` (OP06-074).
- **`opponentLeaderOrCharacters`** now filters Leader+Characters by `typeIncludes` / `anyOfTypes` / `attribute` (ST12-016).

| Card | Closure |
| --- | --- |
| OP10-042 | Dressrosa cost aura + non-trash effect-removal draw + typed onCharacterKoed draw, shared OPT |
| OP14-041 | onCharacterKoed with Amazon Lily/Kuja + base power ≥5000 (replaced loose onRemovedFromField proxy) |
| ST12-016 | union rest target: {Muggy Kingdom} OR \<Slash\> + cost ≤4 |
| OP06-074 | negate → `ref: 'previous'` KO gated by `ifPreviousSelectedPowerAtMost: 5000` |

Tests: gate cases for koedCharacter\* filters; `negateSameTargetKoFamily.test.ts` (2). Assembler / partialCurationsBatch / gates green.

### Next recommended targets

- OP09-093 — optional single-Leader negate + preventAttack on negated Character.
- Life face-state gates (ST13-003/005/009).
- OP08-056 hand→deck top/bottom choice after removal draw.

## Progress update — 2026-07-18 (stale leftovers + minBaseCost cost aura)

Closed **8** partials by re-checking the live backlog against capabilities that already exist (plus one small factory thread). Partial assigned cards **79 → 71**; dropped markers **2 → 0**.

| Card | Closure |
| --- | --- |
| ST29-003 | `selfLifeAtMostOpponent` + `addPowerSelf` +1000 (exact cover text already in registry) |
| ST25-001 | `addCost` self +1 gated on `selfCharacterBaseCostCount` (same shape as ST25-002/005) |
| ST26-001 | swapped current-power gate for `selfControlsNamedCharacterBasePower` (printed "7000 base power") |
| OP10-022 | `chooseOne` return → `revealTopLifePlay` Supernovas ≤5 (replaces Life→hand approximation) |
| OP15-086 | `playFromTrash` + `captureCount from: '__lastMovedIds'` + `addKeyword` Rush on reminted field id |
| OP15-106 | `playFromHand` with `anyOf` yellow Character **or** Stage cost ≤2 |
| OP03-077 | stale PARTIAL removed — mapping already matched printed text |
| OP04-055 | stale PARTIAL removed — sequenced trash/bottom-deck/play is the accepted model |

Also threaded `minBaseCost` / `maxBaseCost` onto `addCostAuraControllerCharacters` (PowerAuraGroup already supported them) and applied it on **OP10-042** Dressrosa cost-2+ aura. OP10-042 remains partial only for the battle-K.O. draw branch (`onCharacterKoed` still lacks a type filter).

New test: minBaseCost case in `costAura.test.ts`. Related suites green (costAura, revealTopLifePlayFamily, partialCurationsBatch, assembler, gates).

### Next recommended targets

- **`koedCharacterTypeIncludes` gate** — unlocks OP10-042 battle-K.O. half and similar Dressrosa/type-filtered KO reactions.
- **OP06-074** — per-target power gate on `ref: 'previous'` after negate.
- **OP09-093** — optional single-Leader negate.
- Life face-state gates (ST13-003/005/009 cluster).

## Progress update — 2026-07-17

Latest regenerated coverage reports `2287` curated non-vanilla cards, `115` partial cards, and `2172` fully curated cards (`95.0%` of cards with text). The name-exclusion cluster and base/current-power filter cluster are closed, `EB01-030` is now covered through source-card bottom-deck movement, `EB02-023` is now covered through removed-field destination gates, `OP01-067`/`OP05-097` are now covered through the generic in-hand card cost aura, `OP02-024` is now covered through mixed name-or-type aura groups, `OP02-027` is now covered through all-field-DON-rested field-removal immunity, `OP03-028`/`OP03-036`/`OP07-078` are now covered through Leader-or-Character set-active selection, `OP04-086` is now covered through the existing battle-K.O. onBattle wrapper, `OP04-118` is now covered through filtered keyword auras, `OP05-002` is now covered through reusable union target selection, `OP05-080` is now covered through explicit deck shuffling, `OP06-011` is now covered through named Leader/Stage/Character rest targeting, `OP06-041` is now covered through all-character rest, `OP07-017` is now covered through generic Stage-to-trash movement, `OP07-026`/`OP07-059` are now covered through rested DON!! target selection, `OP07-036` is now covered through min-cost self-rest sequencing, `OP07-060` is now covered through the existing no-other-named-Character gate, `OP09-092` is now covered through the generic hand-count differential gate, `OP10-026`/`OP10-027` are now covered through source-instance bottom-deck movement, `OP10-033` is now covered through the existing rested typed Character gate and rested DON!! targeting, `OP11-067` is now covered through the existing set-active cost filter, `OP15-032` is now covered through base-cost set-active filtering, `EB04-057` is now covered through the filtered field-removal immunity aura, `OP12-061` is now covered through named next-play hand discount filters, `P-083` is now covered through filtered Character hand-trash cost, and `ST22-001`/`ST22-017` are now covered through reveal-from-hand branch sequencing.

Next high-yield clusters should be selected from the live `effect-partial-curation.csv`, not from the original counts below. The strongest remaining clusters appear to be Life manipulation/reorder, filtered removal immunity, destination-sensitive triggers, reveal-from-hand costs, dynamic scaling, and broader static in-hand/hand-play restrictions.

## Progress update — 2026-07-18 (Life reveal-and-play)

Re-clustered the live 115-partial backlog: **Life reorder/manipulation was the largest remaining cluster (14 cards)**. Implemented its cleanest, identical-shape sub-cluster — the ST13 "reveal top of Life, if it's a [Name] cost 5 you may play it, then Leader +2000" trio (ST13-007 Sabo, ST13-010 Portgas.D.Ace, ST13-014 Monkey.D.Luffy) — as a real primitive instead of the previous play-from-hand approximation. Partial count dropped 115 → 112; fully curated 2172 → 2175.

New engine capability `revealTopLifePlay`:

- `revealTopLife` IR op — reveals the top Life card (public), tests it against a `SearchFilter`, records the result in `__lastRevealMatched` (mirrors `revealTopDeck`). Non-suspending.
- `playFromLife` IR op + `EffectContextImpl.playCharacterFromLife` — plays a Character out of the Life area for no cost, honoring Character-play restrictions and Character-area overflow (mirrors `playCharacterFromTrash`). This is the genuinely new capability: no path previously moved a card Life → field.
- `revealTopLifePlay` template function — reveal, then a `chooseOption` play prompt gated on `previousRevealMatched` (skipped entirely on a non-match), with the `then` branch running only inside the play option (so the buff fires only "if you do").

Files changed: `src/engine/effects/effectIr.ts`, `src/engine/effects/effectContext.ts`, `src/engine/effects/interpreter.ts`, `src/cards/effectTemplates/catalog/templateDefs.ts`, `src/cards/effectTemplates/catalog/factories.ts`, `src/cards/effectTemplates/catalog/capability/registry.ts`, `src/cards/effectTemplates/assignments/ST13.ts`, plus new test `src/cards/effectTemplates/__tests__/revealTopLifePlayFamily.test.ts` (3 tests: match→play→buff, decline, non-match). No regressions in the adjacent play/reveal/Life families or the 97-case partial-curation batch.

Known limitations: `playCharacterFromLife` plays only the **top** Life card (all three cards reveal the top), and only Characters (per the rules — a revealed non-Character simply can't be played). Duration uses `endOfOpponentsTurn` (the closest modeled equivalent to "until the end of your opponent's next turn"). The rest of the Life cluster — reorder-in-any-order, Life↔hand swaps, deck-top→Life, face toggling with gates — is still partial.

## Progress update — 2026-07-18 (removal-immunity recheck + color cost aura)

Investigated the filtered removal/KO-immunity cluster. Finding: it is **not** a primitive gap — most of it is already solved or is hard singletons.

- **OP03-008 (stale leftover, now closed):** "cannot be K.O.'d in battle by <Slash> attribute cards" was marked deferred, but `koImmunitySelf` already supports `attackerAttribute` (used by OP03-032, OP08, OP12). Just an un-combined clause — converted the card to two abilities (static slash-immunity + On Play red-Event search). No engine change.
- **OP10-118** ("once per turn, cannot be K.O.'d by opponent's effects") needs a *consumable* once-per-turn effect-KO shield — genuine new capability; current permanent-immunity approximation is strictly stronger. Deferred as a real (harder) primitive.
- **OP14-079** ("all opponent Characters cannot be removed by your effects") is an opponent-wide removal-prevention aura — niche, deferred.
- **OP02-118** approximates only the target-picker for `koImmunityChosen`; the immunity itself is fine.

While sweeping the `dropped`/`deferred` buckets for other stale leftovers, also closed **ST14-017** (Thousand Sunny): "All of your black {Straw Hat Crew} Characters gain +1 cost" needed a **color filter** on the cost aura. Added `anyOfColors` to `addCostAuraControllerCharacters` (one-line factory thread — the underlying `addCostAura` group already supported `anyOfColors`, as the hand-card variant proves), and wired the static aura + On Play draw.

Files changed: `templateDefs.ts` (`anyOfColors` on the cost-aura fn), `factories.ts` (thread it), `capability/registry.ts` (doc), `assignments/OP03.ts` (OP03-008), `assignments/ST14.ts` (ST14-017), plus a new color-filter case in `src/engine/rules/shared/__tests__/costAura.test.ts`. Partial count 112 → **110** (OP03-008 + ST14-017). All tests green.

## Progress update — 2026-07-18 (more stale leftovers)

Checked the "destination/return" group (OP14-070, OP15-059, OP16-118, P-059, P-105, ST29-007). It was a loose label — the cards are heterogeneous, and most deferrals are genuinely hard (P-059 per-return dynamic scaling; OP15-059 opponent-DON modal; OP14-070 opponent-effect-rested trigger; OP16-118 static hand-counter buff). But two were stale leftovers closable with existing verbs and **no engine change**:

- **ST29-007** — the deferred "[Trigger] Up to 1 of your [Monkey.D.Luffy] cards gains +2000" is just a name-filtered `addPower` (`TargetFilter.name`). Added it as a second `lifeTrigger` ability alongside the existing On K.O.
- **P-105** — the deferred static "If Leader {Revolutionary Army}, this gains [Blocker] and +4 cost" is a conditional `addKeyword` (blocker) + conditional `addCost` on self, both gated on `leaderType`. Added as an `onEnterPlay` ability alongside the existing On Play.

Partial count 110 → **108**. No new engine capability (pure re-curation with already-tested primitives), so covered by the existing primitive tests + the 97-case partial-curation batch; all green.

### Session tally

Partial cards closed this session: **7** (ST13-007/010/014, OP03-008, ST14-017, ST29-007, P-105), taking the backlog 115 → 108. New/extended capabilities: `revealTopLifePlay` (+ `revealTopLife`/`playFromLife` ops + `playCharacterFromLife`) and `anyOfColors` on `addCostAuraControllerCharacters`. New tests: `revealTopLifePlayFamily.test.ts` (3) and a color-filter case in `costAura.test.ts`.

### Recurring lesson

Several partial markers were **stale** — the deferring note predated a primitive that now exists (OP03-008 `attackerAttribute`, ST29-007 name filter, P-105 conditional keyword/cost). Before treating a partial as needing new engine work, check whether the required verb already exists; these are zero-risk, zero-code wins. A cheap future improvement: a script that flags partial cards whose deferred clause matches an existing capability's `covers` text.

## Progress update — 2026-07-18 (negate same-target, → 100 partial)

Picked the negate cluster next. The clean, fully-correct win: **OP09-097** — "[Counter] negate up to 1 opponent Leader/Character AND give THAT card −4000." The negate already binds the chosen target to var `t`; the fix is to target the follow-on `addPower` at `ref: 'previous'` (var `t`) instead of a second free selection, so both hit the same card. New test `negateSameTargetDebuffFamily.test.ts` (2): −4000 lands only on the negated Character (the other is untouched); no negate → no debuff. Backlog **101 → 100**.

Two siblings are *not* clean one-liners and stay deferred: **OP06-074** ("negate, then if that Character has ≤5000 power K.O. it") needs a per-target power gate on `ref: 'previous'` (only a cost-based `ifPreviousMovedAnyCostAtLeast` exists, no power equivalent); **OP09-093** ("negate up to 1 opponent **Leader**, then negate a Character and stop it attacking") needs an *optional* single-Leader negate (group `leader` produces no skip choice) — the preventAttack-same-target half is trivial, but the leader-only-optional half needs a small primitive.

## Progress update — 2026-07-18 (dynamic-scaling recheck + one more stale leftover)

Examined the dynamic-scaling cluster. Most of it is genuinely hard (variable-count selection driving a scaled buff, or bespoke reactive windows). One more stale leftover was closable with an existing op:

- **ST13-015** — "draw 1 and **trash 1 from the top of your Life**" was marked "needs a controller-Life-to-trash op (deferred)", but `moveCards` from `{ zone: 'life', position: 'top', player: 'controller' }` to `{ zone: 'trash' }` already compiles to `trashLife(controller, top)`. Added the mandatory Life-top trash after the draw, both gated on `selfLife ≥ 1`. No engine change.

Partial count 108 → **107**.

### Dynamic scaling — OP06-095 done with existing verbs (no engine change)

It turned out the pieces were all there. `ko` on a `characters` group binds the K.O.'d set to var `t` (via `targetOps`), `chooseTargets` treats a **negative `max` as "all candidates"** (interpreter L~1405, so `maxTargets: -1` = "any number"), and `addPower` already threads `countVar` + `amountPer` (scales by `count(t)`). So OP06-095 ("K.O. any number of your {Thriller Bark} cost ≤2; Leader gains +1000 **plus an additional +1000 for every** Character K.O.'d") is expressed as: base `addPower` leader +1000 → `ko` (maxTargets −1, binds `t`) → `addPower` leader `countVar: 't'`, `amountPer: 1000`. New test `scaledKoBuffFamily.test.ts` (2) verifies K.O. 2 → leader +3000, K.O. 0 → +1000, and that the off-filter Character is excluded from the "any number" candidates. Partial 107 → **106**.

**P-059 — done via a small new op `copyVar` / fn `captureCount`.** "Return any number of Characters; a *chosen* Leader/Character gains +2000 for every returned." The blocker was that both the return and the buff-target choice bind var `t`, so the second selection clobbered the return count. Fix: one tiny non-suspending op `copyVar { from, into }` (interpreter mutates `workingBindings` directly, leaves `__lastMoved`/`__lastSelected` intact) exposed as `captureCount { into }`. The sequence is: `moveCards` return any number (binds `t`) → `captureCount into: 'returned'` (snapshot) → `addPower` on the chosen Leader/Character with `countVar: 'returned'`, `amountPer: 2000` (the buff's own `chooseTargets` rebinds `t`, but `returned` survives). New test `captureCountScaledBuffFamily.test.ts` (2): return 2 → chosen leader +4000 (count survives the second choice), return 0 → no buff. `copyVar` is generic — it unlocks any "do a variable-count thing, then scale a separately-chosen buff by it." Partial 106 → **105**.

### Session tally (final)

Partial cards closed: **36** (…, OP04-024, OP04-081, OP04-094, OP15-039, OP14-115), backlog **115 → 79** (~97.3% of cards-with-text fully curated). New **`restLeader` ability cost** ("You may rest your Leader:" / "rest this Leader:") — added to `AbilityCost`, validated + paid in `abilityCost.ts`, with unit test `restLeaderCost.test.ts`; closed OP04-081, OP04-094, OP15-039. OP14-115's "you take 1 damage" modeled as top-of-Life → hand. OP04-024's deferred "[Opponent's Turn] when your opponent plays a Character" trigger maps to the existing `onOpponentCharacterPlayedFromHand` reactive timing (dispatched from playCharacter.ts + interpreter.ts) — added as an OPT ability with the Donquixote leader gate + rest-self. OP08-105 and OP11-041's deferred "when a card leaves [opponent's] Life" draw triggers both map to the existing `onLifeDamageDealt` reactive timing (you dealing Life damage during your turn), added as OPT abilities — no new timing hook needed. Genuinely-reactive "your Life removed by an effect" and compound two-event triggers (OP12-099 with its cannot-draw rider, OP13-002 take-damage-or-KO) remain deferred.

**Alternate-name / `aliasNames` capability (unlocks the last three).** "Also treat this card's name as [X] according to the rules" (2-1) is now a real feature: `normalizeCardPrinting` extracts alias names from card text into `CardDefinition.aliasNames`, and a new `nameMatches(def, name)` helper (matches printed name OR any alias) replaces every *positive* card-name comparison across `gates.ts`, `interpreter.ts` (selector name filters + search filter), `koAttempt.ts`, and `power.ts`. Behavior is identical for the 2,551 cards without aliases (`nameMatches` reduces to `===`); the 7 aliased cards (EB02-016, EB02-024, EB04-038, OP01-121, OP02-042, OP03-122, OP04-099) now satisfy name gates/filters under either name. The committed catalog JSON was patched with `aliasNames` so it is live immediately; a normal `build:assets` reproduces it. Test: `gates.test.ts` "matches an alias name in selfControlsNamed". Negative name checks (`excludeName`) intentionally still match printed name only. ST29-016 used the existing `unblockable` keyword grant on the Leader (gated on the Luffy leader name). Latest: OP07-051 (cost≤1 bottom-deck placement added to the preventAttack), OP11-023 (existing `addCostAuraSameCardInHand` + new `opponentRestedCardCount` gate, tested). Reusable gate additions this session now include `selfControlsNamed.rested`, `selfTypedCharacterCount.color`, `selfFewerCharactersThanOpponent`, `selfCharacterCostCount.atMost`, and `opponentRestedCardCount`. OP09-051 used the existing `moveSelfToBottomDeck` fn plus a new `atMost` on the `selfCharacterCostCount` gate ("if you do NOT have 5 Characters cost 5+"), with a gate test. Latest two added small reusable gate capabilities: a `color` filter on `selfTypedCharacterCount` (P-081, "3+ blue {Cross Guild}") and a new `selfFewerCharactersThanOpponent` gate (EB04-059), each with a gate test. Latest three: ST22-016 (`revealTopThen` for the reveal-conditional Counter buff), OP08-001/OP04-004 (multi-target `giveDon` — `count` DON to *each* selected Character, via `maxTargets` with `-1` = "each"). Latest two added small reusable capabilities: a `rested?` flag on the `selfControlsNamed` gate ("if you have a rested [X]", ST16-005) and a `trash` destination on `searchTopDeck` ("look N, trash up to M", OP03-083). New tests this session: `revealTopLifePlayFamily` (3), `scaledKoBuffFamily` (2), `captureCountScaledBuffFamily` (2), `negateSameTargetDebuffFamily` (2), a `searchTopDeck` trash case, a `selfControlsNamed` rested gate case, plus a `costAura` color case. The last wave were more stale leftovers reusing existing verbs: ST13-017/018 (`lookLifeAndReorder` + `selfLife atMost 0` draw gate + Life↔hand swap), ST17-001 (hand→deck-top `moveToTopDeck` inside a reveal-then branch), PRB02-010 (the `opponentDonFieldCount ≥6` gate already existed — only a stale `// PARTIAL` comment remained).

Note on the metric: `partialCurated` is driven by (a) the assignment covering all abilities **and** (b) the absence of a `PARTIAL:`/`NOTE:` marker comment in the source. Every closure above added real functionality; the comment removal just reflects the now-complete curation. New/extended capabilities: `revealTopLifePlay` (+ `revealTopLife`/`playFromLife` ops + `playCharacterFromLife`), `anyOfColors` on `addCostAuraControllerCharacters`, and `copyVar`/`captureCount` (dual-selection scaling). New tests: `revealTopLifePlayFamily.test.ts` (3), `scaledKoBuffFamily.test.ts` (2), `captureCountScaledBuffFamily.test.ts` (2), and a color-filter case in `costAura.test.ts`; all other closures reuse already-tested primitives. No regressions across the partial-curation batch, assembler, match-integration, and adjacent Life/play/reveal/cost-aura/KO families.

Notable: **most of the "hard" scaling cluster was reachable with small pieces** — ST13-015 (`trashLife` existed), OP06-095 (`maxTargets:-1` + `countVar`/`amountPer`, zero code), and P-059 (one tiny `copyVar` op). The dynamic-scaling cluster is now largely cleared.

### Next recommended targets

- **Once-per-turn effect-KO shield** (OP10-118) — a consumable per-turn immunity in the KO-replacement/usage-tracking system.
- **Life reorder / face-toggle-with-gates** — the rest of the ST13/OP-Life cluster (`lookLifeAndReorder` exists; the gap is face-state gates and Life↔deck-top replacement rules).
- **Negate** (OP06-074, OP09-093/097, OP10-098) — stack-level effect cancellation.
- **Reactive custom windows** (OP05-098 on-life-becomes-zero, OP08-105 when-a-card-leaves-opp-Life) — new timing hooks.
- Tooling: the promised script that flags partial cards whose deferred clause matches an existing capability's `covers`, to auto-surface the remaining stale leftovers.

### Next recommended targets

- **Dynamic scaling** (P-059, OP06-095, …) — the focused template above; largest remaining group.
- True **once-per-turn effect-KO shield** (OP10-118) — a consumable per-turn immunity in the KO-replacement system.
- **Life reorder / face-toggle-with-gates** — rest of the ST13 Life cluster.
- **Negate** (OP06-074, OP09-093/097, OP10-098) — stack-level effect cancellation.
- Cheap-win tooling: a script flagging partial cards whose deferred clause text matches an existing capability's `covers` (would surface the remaining stale leftovers automatically).

_Source of truth: `effect-partial-curation.csv` (65 marker rows over 53 partially-curated cards) + `effect-coverage.csv`. Regenerate with `npm run scan:partials` / `npm run coverage`. Analysis date: 2026-07-18._

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
