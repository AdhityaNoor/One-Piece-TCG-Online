# Official onboarding reference (Play Guide + Teaching App)

Captured 2026-09-03 from Bandai's two official beginner surfaces, so the
tutorial module can be checked against them without re-scraping.

**Scope note (IP):** this file records the *structure*, the *rule facts*, and
the *vocabulary* those pages teach. It deliberately does not reprint the
Teaching App's narration wholesale — see `docs/legal/RISK-MEMO.md` for why the
project keeps its distance from Bandai-authored assets and copy. Our tutorial
restates these rules in its own voice; only short factual rule statements from
the Play Guide are mirrored closely, because they are functional rules text.

---

## 1. Play Guide — https://asia-en.onepiece-cardgame.com/play-guide/

Six sections, in this order. This ordering is what
`src/features/tutorial/tutorialSteps.ts` now mirrors.

| # | Section | Facts it states | Our chapter |
|---|---|---|---|
| 1 | What You Need to Play the Game | 1 Leader card, a 50-card deck, 10 DON!! cards. The deck holds 3 card types (Character/Event/Stage). Deck must match the Leader's color. Up to 4 copies of any one card number. | `cardBasics`, slide `whatYouNeed` |
| 2 | Card Types | Five: Leader (sets deck direction, Life value printed lower-right, varies by Leader), DON!! (pay costs, or give for power; 2 gained per turn, up to 10, first player gets 1 on turn 1), Character (played from hand for their cost; power + effects; attacks Leader or Characters), Event (one-time effect for its DON!! cost; some usable during the opponent's attack), Stage (played with DON!!, one per player at a time, ongoing effect). | `cardBasics`, slide `cardTypes` |
| 3 | Playmat & Card Zones | Eight numbered zones: 1 Character Area (max 5), 2 Leader Card, 3 Stage Card (one per player), 4 Deck, 5 Trash (K.O.'d Characters + used cards), 6 Cost Area, 7 DON!! Deck (exactly 10), 8 Life Cards. | `battlefieldOverview` tour, in this numbering |
| 4 | How to Start a Game | (1) Shuffle deck; place Leader face-up, deck and DON!! deck in their zones. (2) Rock-paper-scissors; winner chooses first or second. (3) Draw 5; one mulligan allowed. (4) Place Life cards equal to the Leader's Life value, face-down, from the top of the deck. (5) The player going first starts. | `gameSetup` — runs the engine's live Section 5 flow |
| 5 | Victory Conditions | (1) Win a battle against the opponent's Leader while they have 0 Life cards. (2) The opponent has no cards left in their deck. | `basicRules`, slide `victoryConditions` |
| 6 | Turn Flow | Refresh (set rested cards active, return given DON!! to the cost area) → Draw (draw 1) → DON!! (place 2 from the DON!! deck) → Main (play cards, attack with Leader or Characters) → End (turn passes). Always this order. | `basicRules`, slide `turnFlow` |

The page also links a Teaching App, a Rule Manual and a Q&A section.

---

## 2. Teaching App — https://tutorial.onepiece-cardgame.com/en/tutorial

A scripted, non-interactive walkthrough (you press Next through a fixed
match). Three scenarios ship, each ~130-190 steps:

| id | Title | Teaches |
|---|---|---|
| `basic_battle1` | Basic Game Flow | setup, phases, playing Characters, attacking, Life, K.O.'ing rested Characters, Counter, giving DON!! for power, the finishing blow |
| `basic_battle2` | Mastering Card Effects (Part 1) | [On Play], [End of Your Turn], [Rush], [Activate: Main], [DON!! ×1], [Once Per Turn], multi-card Counter |
| `basic_battle3` | Mastering Card Effects (Part 2) | Stage cards, [Trigger], [Banish], [Double Attack], [Blocker], Counter **Events**, cost-reduction effects |

Five quiz scenarios (`Q1`–`Q5`) and one long advanced scenario also exist.

### Structural patterns worth stealing

1. **Chapter = one turn.** Every scenario is chaptered as
   `Preparing for Battle`, then alternating `Going First … Turn` /
   `Going Second … Turn`. Steps inside a chapter are labelled by phase.
2. **A persistent Turn History sidebar** lists every step of the whole match
   up front, with the current one highlighted — the player always knows where
   they are and what is coming. We have `TutorialProgress` (chapter counter)
   but no equivalent step list.
3. **Tappable glossary terms.** Teaching text marks terms in yellow; tapping
   one opens a full explanation, with a searchable A–Z term list behind it.
   The very first instruction in every scenario is "Tap on any yellow text in
   order to view detailed explanations."
4. **Repetition is deliberate.** The same three sentences ("an attack succeeds
   if power is greater than or equal to…", "the card that declares an attack is
   rested", "a successful attack on the Leader removes 1 Life card") are
   repeated verbatim at *every* attack, not just the first.
5. **Explicit simplifications are called out in red** — e.g. "Note: During this
   battle, we will ignore card effects that activate when a card is played."
   This is the same convention as our `isEngineWired: false` banner.

### The official glossary (38 terms)

The vocabulary the official onboarding considers load-bearing. Useful as a
coverage checklist for tutorial content — terms our chapters never introduce
are gaps.

| # | Term | # | Term | # | Term |
|---|---|---|---|---|---|
| 1 | Rest | 14 | Active | 27 | DON!! ×1 |
| 2 | Deck | 15 | Counter | 28 | Rush |
| 3 | DON!! Deck | 16 | Block | 29 | The 5 Phases |
| 4 | Leader Card | 17 | Main Phase | 30 | Type |
| 5 | Redrawing a Hand | 18 | Character Cards | 31 | End of Your Turn |
| 6 | Life Cards | 19 | K.O. | 32 | Once Per Turn |
| 7 | Attack | 20 | Trash | 33 | Trigger |
| 8 | DON!! Phase | 21 | Giving DON!! Cards | 34 | When Attacking |
| 9 | Cost | 22 | Victory Conditions | 35 | Stage Card |
| 10 | Draw Phase | 23 | Power | 36 | Banish |
| 11 | DON!! Cards | 24 | Playing Character Cards | 37 | Event Cards |
| 12 | First Turn: Going First and Going Second | 25 | On Play | 38 | Double Attack |
| 13 | Refresh Phase | 26 | Activate: Main | | |

### Coverage vs. our tutorial (updated)

Our tutorial now ships all three of the official beginner scenarios, as
`src/features/tutorial/scenarios/*`:

| ours | mirrors | effects | teaches |
|---|---|---|---|
| `basicGameFlow` | `basic_battle1` | OFF (empty registry, like the official app's printed caveat) | setup, the 5 phases, playing Characters, attacking, Life, K.O., Counter, giving DON!! |
| `cardEffects1` | `basic_battle2` | ON (curated registry) | [On Play], [When Attacking], [Activate: Main], [Once Per Turn], [DON!! x1], [End of Your Turn], [Rush], stacking Counters |
| `cardEffects2` | `basic_battle3` | ON (curated registry) | Stage cards, [Trigger], [Blocker], [Banish], [Double Attack], [Counter] Events |

Glossary terms still not introduced anywhere: **cost reduction** effects, and
the quiz scenarios (`Q1`-`Q5`), which are a different format (a question with
a right answer) rather than a scripted match.

Two things are worth recording about building the effect scenarios, because
both cost real debugging time:

1. **Turning effects on changes the Life stacks into a hazard.** A successful
   attack on a Leader reveals a Life card, and a [Trigger] on it stops the game
   to ask the defender whether to use it (10-1-5-2). Scenario 2 pins both Life
   stacks to Trigger-free cards for exactly this reason; scenario 3 pins a
   Trigger card into the slot its [Banish] lesson needs and keeps the rest
   Trigger-free.
2. **Life is taken from the LAST slot the deal fills.** `stackDeck` writes deck
   depths [5..9] into the Life area in order, and damage reveals them from the
   other end — so the card a lesson wants revealed first goes in the last
   pinned slot. `tutorialScript.e2e.test.ts` asserts the lesson fires, which is
   what keeps this pinned down rather than leaving it to a comment.
