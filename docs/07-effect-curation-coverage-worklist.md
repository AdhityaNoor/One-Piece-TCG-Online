# Effect Curation — Coverage Addition Worklist

## Curation rule — field Trash ≠ ko

Printed **Trash** of a Character (or Stage) from the field is **not** `fn: 'ko'`. Use `moveCards` → `trash` so the target's **[On K.O.]** does not fire (canonical: OP09-009). Printed **K.O.** of a Stage uses `fn: 'ko'` with `target.group: 'stages'`.

## Progress update — 2026-07-18 (P-set triage defer → 0)

Closed remaining **7** defer promo cards. Triage now: **expressible 0 / needsPrimitive 0 / defer 0**.

| Card | Closure |
| --- | --- |
| P-002 | `returnHandShuffleDraw` on Main + Trigger |
| P-005 | Activate Main DON!!−2 → `[Banish]` this turn |
| P-024 | Leader power scale `per: 'controllerCharacters'`; Trigger +1000 optional |
| P-039 | Printed Banish (card data) + DON!!×2 / 0 Life +2000 |
| P-046 | `returnHandShuffleDraw` `destination: 'bottom'` + `optional` |
| P-111 | `registerKoReplacementAura` field-removal + `restDon` |
| P-117 | `staticFlags.mustHaveType: 'East Blue'` + empty-deck win + Life-damage trash |

New reusable pieces:
- **`PowerScaleSource: 'controllerCharacters'`** — count of Characters in the owner's Character Area (P-024).
- **`returnHandShuffleDraw.destination: 'bottom' | 'shuffle'`** + **`optional`** — hand→bottom→draw-equal without shuffle; optional chooseOption (P-046). Known limitation: bottom path uses current hand order (no interactive "any order").
- **`staticFlags.mustHaveType`** — Leader deck-construction: every main-deck card must include the type (P-117), enforced in `validateDeckConstruction`.

## Progress update — 2026-07-18 (P-set triage → needsPrimitive 0)

Closed **23** promo cards. Triage then: **expressible 0 / needsPrimitive 0 / defer 7**.

| Cluster | Cards |
| --- | --- |
| Battle K.O. immunity by attribute | P-007, P-052, P-054 |
| Battle K.O. without attribute (`attackerWithoutAttribute`) | P-025 |
| Simple field/DON/Life moves | P-009, P-010, P-048, P-062, P-102 |
| Taunt / Blocker / preventBlockers | P-067, P-097, P-098, P-114 |
| On Play / On K.O. / When Attacking | P-071, P-072, P-091, P-092, P-099, P-100, P-106, P-115 |
| Field-removal lock | P-104 |
| onDonReturned + `setActiveControllerStage` | P-077 |

New reusable pieces:
- **`attackerWithoutAttribute`** on `koImmunitySelf` (battle)
- **`setActiveControllerStage`** (+ `controllerStages.color` filter)

### Remaining triage (resolved later same day)

Was **defer** (7); closed in the defer→0 update above.

## Progress update — 2026-07-18 (win / extra turn / DON-phase routing)

Closed **4** partials (**4 → 0**). New reusable pieces:

- **`replaceEmptyDeckDefeatWithWin`** — empty-deck defeat checkpoints + empty-deck draw attempts become a win (OP03-040).
- **`winGame`** — immediate card-effect victory (OP09-118).
- **`grantExtraTurn` / `pendingExtraTurnPlayerId`** — End Phase keeps the same active player for one extra turn (OP05-119).
- **`registerDonPhasePlacement` / `donPhasePlacement`** — if field already had DON!!, 1 newly placed DON!! attaches to Leader (OP13-003).
- **`moveAllCharactersToBottomDeck` filter** — `player` + `excludeSelf` for “all your Characters except this”.

| Card | Closure |
| --- | --- |
| OP03-040 | startOfGame win-replacement + existing Life-damage trash |
| OP05-119 | On Play DON!!−10 bottom-deck allies + extra turn + existing Activate Main |
| OP09-118 | Rush + onOpponentBlockerActivated winGame when either Life is 0 |
| OP13-003 | startOfGame DON-phase routing + existing −2000 when field DON ≤9 |

### Remaining assigned PARTIALs

None (scan should report **0**).

## Progress update — 2026-07-18 (OP13-079 + OP12-099)

Closed **2** partials (**6 → 4**). New reusable pieces:

- **`staticFlags.cannotIncludeCategoryCostOrMore`** — Leader deck-construction forbid enforced in `validateDeckConstruction` (OP13-079 Events cost ≥2).
- **`onLifeRemoved`** — board-wide reactive timing when any Life card leaves (any destination).
- **`preventEffectDraw`** — continuous lock on effect-sourced draws (Draw Phase unaffected).

| Card | Closure |
| --- | --- |
| OP13-079 | staticFlags Events cost≥2 + existing startOfGame / Activate Main |
| OP12-099 | onLifeRemoved → draw 1 → preventEffectDraw this turn |

### Remaining assigned PARTIALs (4) — hard defer

- OP03-040 — empty-deck → win instead of lose
- OP05-119 — extra turn (+ DON!!−10 bottom-deck allies)
- OP09-118 — win on Blocker at 0 Life
- OP13-003 — DON-phase placement routing to Leader

## Progress update — 2026-07-18 (OP15-093 addAttribute)

Closed **1** partial (**7 → 6**). New reusable piece:

- **`addAttribute`** — continuous attribute grant (mirror of `addKeyword`); read via `getEffectiveAttributes` / `hasContinuousAttribute` in selectors, gates, power, and battle attribute checks.

| Card | Closure |
| --- | --- |
| OP15-093 | Activate Main: [Rush: Character] + `<Slash>` this turn on up to 1 Monkey.D.Luffy |

### Next recommended targets

- Hard defer: extra turn, win conditions, deck construction, DON-phase routing, Life-removal + cannot-draw.
- Remaining assigned PARTIALs (6): OP03-040, OP05-119, OP09-118, OP12-099, OP13-003, OP13-079.

## Progress update — 2026-07-18 (ST13-003 face-up Life → deck bottom)

Closed **1** partial (**8 → 7**). New reusable pieces:

- **`redirectFaceUpLifeToDeckBottom`** — continuous replacement: face-up Life leaving for hand goes to deck bottom instead (battle damage + effect `moveToHand`); face-down Life still to hand; Banish still trashes; Triggers suppressed on redirect.
- **`resolveLifeLeaveDestination` / `isFaceUpLifeRedirectedToDeckBottom`** — shared Life-leave routing used by `damageStep`, `dealLifeDamage`, and effect context.

| Card | Closure |
| --- | --- |
| ST13-003 | startOfGame redirect + existing Activate Main trash→Life refill |

### Next recommended targets

- Hard defer: extra turn, win conditions, deck construction, DON-phase routing, attribute grant, Life-removal + cannot-draw.
- Remaining assigned PARTIALs (7): OP03-040, OP05-119, OP09-118, OP12-099, OP13-003, OP13-079, OP15-093.

## Progress update — 2026-07-18 (EB01-001 + OP16-118 counter auras)

Closed **2** partials (**10 → 8**). New reusable piece:

- **`addCounterAuraControllerCharactersInHand`** — continuous Counter ADD/`setValue` on hand Characters; consumed by `computeEffectiveCounter` → `ACTIVATE_COUNTER_CHARACTER` (+ hand UI projection).
- **`selfTypedCharacterCount.minCost`** — typed Character cost floor (Oden’s cost ≥5 gate).

| Card | Closure |
| --- | --- |
| EB01-001 | startOfGame +1000 Counter for Land of Wano without printed Counter; When Attacking if typed cost≥5 |
| OP16-118 | onEnterPlay Counter becomes +2000 for 8000-power Characters in hand (+ existing look-5) |

### Next recommended targets

- Hard defer: extra turn, win conditions, deck construction, DON-phase routing, face-up Life→deck, attribute grant, Life-removal + cannot-draw.
- Remaining assigned PARTIALs (8).

## Progress update — 2026-07-18 (OP12-036 + OP15-008 + OP15-119)

Closed **3** partials (**13 → 10**). New reusable pieces:

- **`staticFlags.cannotBePlayedByEffects`** — EffectProgram flag; blocks effect `playFromHand` (OP12-036).
- **`PowerScale.per: 'targetDonAttached'`** — −N per DON!! on the modified card (OP15-008).
- **`revealTopLifeAddPowerPerCost`** — reveal top Life → +amountPer × printed cost (OP15-119).

| Card | Closure |
| --- | --- |
| OP12-036 | static cannot-be-played-by-effects + Slash Leader KO immunity / +1000 |
| OP15-008 | onPlay DON+Rush; Activate if played this turn: opp Char −1000×DON |
| OP15-119 | Rush if ≥6 DON; opp Event/Blocker → reveal Life cost power |

### Next recommended targets

- Hard defer: counter auras, extra turn, win conditions, deck construction, DON-phase routing, face-up Life→deck.
- Remaining assigned PARTIALs (10).

## Progress update — 2026-07-18 (EB02-039 + OP09-022 + OP08-043)

Closed **3** partials (**16 → 13**). New reusable pieces:

- **`SearchFilter.nameMatchesPreviousMove`** — "same card name as the trashed card" (EB02-039).
- **`forceCharactersPlayedRested`** — Characters enter play rested (OP09-022).
- **`attackUnlessTrashFromHand`** on `preventAttackAll` — declare-attack trash tax via `rule:attackTrashTax` PendingChoice (OP08-043).

| Card | Closure |
| --- | --- |
| EB02-039 | trash GERMA ≤4000 → play same-name 5000–7000 from trash |
| OP09-022 | onEnterPlay `forceCharactersPlayedRested` + mapped Activate |
| OP08-043 | opp Characters cannot attack unless trash 2 (until end of opp next turn) |

### Next recommended targets

- Hard defer: counter auras, extra turn, win conditions, deck construction.
- Remaining assigned PARTIALs (13).

## Progress update — 2026-07-18 (OP05-098 + OP10-118)

Closed **2** partials (**18 → 16**). New reusable pieces:

- **damageStep Life-hit commit** — commit Life→hand before reactions so `onLifeToHand` deck→Life mutations are not wiped.
- **`koImmunitySelf.oncePerTurn`** — consumable effect/battle K.O. shield via `oncePerTurnUsed` (`koImmunity:<recordId>`).

| Card | Closure |
| --- | --- |
| OP05-098 | Opp-turn OPT `onLifeToHand` + `selfLife ≤0` → top deck to Life, trash 1 hand (not Banish Life→trash) |
| OP10-118 | OPT `koImmunitySelf` effect + `effectSourceController: 'opponent'` |

### Next recommended targets

- Hard defer: counter auras (OP16-118 / EB01-001), extra turn (OP05-119), win conditions.
- Scan remaining assigned PARTIALs (16).

## Progress update — 2026-07-18 (P-084 + ST28-004)

Closed **2** partials (**20 → 18**). New reusable pieces:

- **`preventAttackAll`** — `player: 'both'`, `charactersOnly`, cost `condition` (P-084 Buggy aura).
- **`returnGivenDon`** AbilityCost — return attached DON!! to cost area (default rested).

| Card | Closure |
| --- | --- |
| P-084 | self cannot-attack + both-sides cost 3–4 aura if Leader Buggy + onPlay Cross Guild ≤6 |
| ST28-004 | Activate cost `returnGivenDon` ×2 rested → Rush +1000 |

### Next recommended targets

- OP05-098 — `onLifeBecomesZero` (or damageStep sync + `onLifeToHand` approx).
- OP10-118 — OPT `koImmunitySelf`.
- Hard defer: counter auras, extra turn, win conditions.

## Progress update — 2026-07-18 (OP14-079 + OP05-001)

Closed **2** partials (**22 → 20**). New reusable pieces:

- **`preventFieldRemovalAuraOpponentCharacters`** — factory for opp Character field-removal lock (“cannot be removed by your effects”).
- **`giveTargetPowerPenalty`** — KO replacement gives −N to the protected ally (“that Character”), not the aura source.
- **`ContinuousPowerCondition.minPower`** — current-power gate for replacement targets (Sabo 5000+).

| Card | Closure |
| --- | --- |
| OP14-079 | onEnterPlay preventFieldRemovalAuraOpponentCharacters + mapped Activate |
| OP05-001 | registerKoReplacementAura + giveTargetPowerPenalty (−1000 on ally) |

### Next recommended targets

- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118 / EB01-001, extra turn OP05-119.
- Remaining OP05: OP05-098 (`onLifeBecomesZero`).

## Progress update — 2026-07-18 (expressible partial batch)

Closed **6** partials (**28 → 22**). New reusable piece:

- **`anyNamedCharacter`** — “If there is a [X] Character” across either field (used for OP05-100 Luffy negation).

| Card | Closure |
| --- | --- |
| OP05-030 | Stale PARTIAL removed — `registerKoReplacementAura` already exact |
| OP06-009 | `setBasePowerFromSource` on whenAttacking / onBlock (shared OPT key) |
| OP07-097 | Activate Main: chooseOne play-or-Life {Egghead} ≤5 |
| OP13-002 | Shared OPT draw via `onLifeToHand` + `onCharacterKoed` (min base 6000) |
| ST07-009 | lifeTrigger trash 1 → `triggerPlaySelf` |
| OP05-100 | leave-field `registerKoReplacementSelf` + trash top Life; negated by `anyNamedCharacter` Luffy |

### Next recommended targets

- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118 / EB01-001.
- Scan remaining OP05 / OP15 / OP12 partials for assignment-only closures.

## Progress update — 2026-07-18 (onCharacterRested watcher)

Closed **2** partials (**30 → 28**). New reusable pieces:

- **`onCharacterRested`** — board-wide reactive when a Character is effect-rested (cascade from `ctx.rest()`).
- **`restedByControllerEffect`** — gate for “rested by your effect”.

| Card | Closure |
| --- | --- |
| OP07-031 | [Your Turn] OPT: onCharacterRested + restedByControllerEffect → drawAndTrash |
| OP10-036 | [Your Turn] OPT: onCharacterRested + restedByControllerEffect → setActiveControllerDon |

### Next recommended targets

- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118.
- Scan remaining expressible partials in OP05 / OP13 clusters.

## Progress update — 2026-07-18 (rest-cause gates)

Closed **2** partials (**32 → 30**). New reusable pieces:

- **`restedByOpponentEffect` / `restedByEffect` / `restedByEffectSourceCategory`** — onRested gates using effect-rest attribution (`ctx.rest()` → cascade with `restCause` / `restSourceInstanceId`).
- Effect-rest cascade now **pays ability costs** (aligned with onKO); attack/cost rests via `fireRestTransitions` still omit restCause so opponent-effect gates fail closed.

| Card | Closure |
| --- | --- |
| OP14-070 | onRested: opponent Character effect → DON!! −1 → setActiveSelf; [Blocker] |
| PRB02-009 | onRested: opponent effect → trashThis → draw 2; [Blocker] |

### Next recommended targets

- See onCharacterRested update above.

## Progress update — 2026-07-18 (Batch A + dealDamage)

Closed **7** partials (**39 → 32**). New reusable piece:

- **`dealDamage`** — effect Life damage (Life→hand + curated Trigger offer + 0-Life loss). Shared helper `dealLifeDamage.ts`.

| Card | Closure |
| --- | --- |
| OP04-090 | Activate: return 7 trash → bottom, set active, preventRefresh |
| OP03-076 | onCharacterKoed: optional trash 2 → set Leader active |
| OP06-083 | Activate: KO own Thriller Bark → negate self this turn |
| OP11-031 | Activate: grant canAttackCharactersWhileSummoningSick to Fish-Man/Merfolk |
| OP14-056 | onHandTrashed → negateEffect self this turn |
| OP06-116 | chooseOne: KO ≤5 **or** dealDamage (opp Life = 1) then Life→hand |
| EB03-055 | [Opponent's Turn] [On K.O.] optional dealDamage 1 |

### Next recommended targets

- OP14-070 / PRB02-009 — `restedByOpponentEffect` (+ category) on `onRested`.
- OP07-031 / OP10-036 — broader “Character rested by your effect” watcher.
- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118.

## Progress update — 2026-07-18 (OP15-022 Brook empty-deck rules)

Closed **OP15-022** (**40 → 39**). Engine + catalog:

- **`deferEmptyDeckDefeatToEndOfTurn`** — permanent continuous: do not lose from empty deck; mark `deckBecameZeroThisTurn`; lose at End Phase via `cardEffect`.
- **9-2-1-2 checkpoint on `END_MAIN_PHASE`** — ending Main with deck at 0 loses immediately (unless deferred). Fixes “only lose on next Refresh/Draw”.
- Activate Main Then (`selfDeckCount` atMost 0 → set rested Character active) works with deck already at 0.

### Next recommended targets

- OP06-116 / EB03-055 — need real `dealDamage` (Life→hand + Trigger window).
- OP14-070 / PRB02-009 — rest-cause gates on `onRested`.
- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118.

## Progress update — 2026-07-18 (selectTargets binder + OP02 counter closures)

Closed **2** more partials (**42 → 40**). New reusable piece:

- **`selectTargets`** — choose into var `t` with no follow-up (replaces +0 `addPower` picker for `koImmunityChosen`).

| Card | Closure |
| --- | --- |
| OP02-089 | Counter DON!!−1: up to 2 opp Leader/Characters −3000; Trigger kept |
| OP02-118 | trash 1 → `selectTargets` Character → battle KO immunity |

### Next recommended targets

- OP06-116 / EB03-055 — need real `dealDamage` (Life→hand + Trigger window).
- OP14-070 / PRB02-009 — rest-cause gates on `onRested`.
- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118.

## Progress update — 2026-07-18 (character-deficit dual KO + opponent DON ramp + reveal-Event branch)

Closed **3** more partials (**45 → 42**). New reusable pieces:

- **`selfCharacterCountAtLeastLessThanOpponent`** — Character-count deficit gate (OP10-098).
- **`addDonFromDeck.player: 'opponent'`** — opponent may ramp from their DON!! deck (OP12-075).
- **`boundVarMatching`** — sequence gate on a prior binding's category (OP01-063 Event reveal).

| Card | Closure |
| --- | --- |
| OP10-098 | Main: ≥2 fewer Characters → KO base≤6 + different base≤4; Trigger negate kept |
| OP12-075 | KO ≤3, then opponent `chooseOne` add 1 active DON!! or decline |
| OP01-063 | reveal 1 opp hand → if Event, up to 1 opp Life top → deck bottom |

### Next recommended targets

- OP06-116 / EB03-055 — need real `dealDamage` (Life→hand + Trigger window).
- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118.

## Progress update — 2026-07-18 (Life↔hand Egghead, Ark Noah hand, reveal-giveDon, cost=DON KO)

Closed **4** more partials (**49 → 45**). New reusable piece:

- **`TargetFilter.costEqualsDonAttached`** — current cost equals DON!! given (OP15-031).

| Card | Closure |
| --- | --- |
| EB04-060 | Life top/bottom→hand → Egghead→Life face-up → −1000 (lifePaid via `boundVarsTotalCount`) |
| OP06-033 | chooseOne: Fish-Man hand / Ark Noah hand / Ark Noah field → KO rested |
| OP14-105 | reveal 3 Amazon Lily/Kuja → `giveDon` Leader+Characters `maxTargets: -1` |
| OP15-031 | KO rested with `costEqualsDonAttached` |

### Next recommended targets

- OP01-063 — Event-branch after hand reveal.
- Hard defer: ST28-004, EB02-039, Counter-aura OP16-118.

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

ST13-003 face-up Life→deck-bottom replacement later closed (see top progress update). Tests: assembler (deck topOrBottom, optional Leader negate, fromFaceUp), gates exactCost; partialCurationsBatch / revealTopLifePlayFamily green.

### Next recommended targets (historical)

- Remaining Life reorder / face-state cluster from the live backlog.
- Other expressible leftovers in `effect-partial-curation.csv`.

## Progress update — 2026-07-18 (koedCharacter filters + same-target power KO)

Closed **4** more partials (**71 → 67**). New reusable pieces:

- **`koedCharacterTypeIncludes` / `koedCharacterAnyOfTypes` / `koedCharacterMinBasePower`** — onCharacterKoed event context now carries `koedCharacterDefinitionId` from the pre-K.O. state.
- **`oncePerTurnKey`** on abilities — shared OPT bucket across reactive timings (OP10-042 removal + KO halves).
- **`ifPreviousSelectedPowerAtMost`** — gate follow-on ops on current power of var `t` (OP06-074).
- **`opponentLeaderOrCharacters`** filters Leader+Characters by `typeIncludes` / `anyOfTypes` / `attribute` where printed.

| Card | Closure |
| --- | --- |
| OP10-042 | Dressrosa cost aura + non-trash effect-removal draw + typed onCharacterKoed draw, shared OPT |
| OP14-041 | onCharacterKoed with Amazon Lily/Kuja + base power ≥5000 (replaced loose onRemovedFromField proxy) |
| ST12-016 | rest opp Leader/Char cost ≤4 on Main+Counter; Trigger = Main (no type/attribute filter) |
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

_Source of truth: `effect-partial-curation.csv` (8 marker rows — all `batchNote`) + `effect-coverage.csv`. Regenerate with `npm run scan:partials` / `npm run coverage`. Analysis date: 2026-07-18._

## Where coverage actually stands

`npm run scan:partials` now reports **0 assigned cards with incomplete clauses**. Remaining markers are informational `batchNote` triage headers only (OP10–OP16/ST30). The old `scripts/effect-triage/run.py` still returns `expressible=0 needsPrimitive=0 defer=0` because it only classifies `needsTemplate` cards.

Live marker breakdown:

| kind | count | meaning |
| --- | ---: | --- |
| partial | 0 | card curated, one clause approximated/deferred |
| dropped | 0 | a clause was silently dropped (usually a filter) |
| batchNote | 8 | per-set triage batch summary (not a single card) |
| deferred | 0 | whole sub-effect deferred, needs a real primitive |
| notImplemented | 0 | unassigned defer stubs |

### Progress update — 2026-07-18 (stale OP04 notImplemented cleanup)

Removed **4** orphaned `NOTE: not yet implemented` stubs in `OP04.ts` that the scanner counted as both `notImplemented` and `unassigned defer`. Each was leftover printed-text fragments after the referenced cards were already fully assigned:

| Orphan near | Actually covered by |
| --- | --- |
| after OP04-038 (`in any order`) | prior search-card leftover; no gap card |
| after OP04-046 (Plague Rounds / Ice Oni search) | OP04-046 `searchTopDeck` |
| after OP04-097 (deck → Life) | OP04-098 (assigned later in file) |
| after OP04-109 (+3000 Land of Wano) | OP04-109 `addPower` |

No new primitives or assignments needed. `batchNote` headers left untouched.

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
