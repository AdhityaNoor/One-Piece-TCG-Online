# Extension: Effect-Aware Strategic Planning and Long-Horizon CPU Decision Making

Extend the previously defined VS CPU architecture.

The CPU must not evaluate cards only from:

* printed cost
* printed power
* counter value
* number of cards on board
* immediate turn value

The CPU must understand and evaluate the strategic meaning of card abilities represented by the existing typed capability/effect registry.

The objective is for the CPU to reason about questions such as:

* Which Character should I play now?
* Which Character should I preserve in hand?
* Is an expensive Character actually better than two synergistic cheaper Characters?
* Does this Character create value immediately through `[On Play]`?
* Does another Character become more valuable if played first?
* Should I establish an engine piece now for value over several future turns?
* Should I preserve a combo piece until its gate becomes active?
* Should I spend DON!! aggressively now or preserve the board state required for a stronger future turn?
* Does playing this Character make cards already in hand stronger?
* Does this effect create a future lethal line?
* Is immediate removal better than developing a long-term value engine?
* Which sequence of plays produces the highest expected chance of winning?

The CPU must reason from the existing structured ability representation.

Do not create card-ID-specific strategy logic unless explicitly designated as an exceptional curated strategic hint.

---

# Core Requirement

Create an **Effect-Aware Strategic Evaluator**.

The CPU must understand a card as:

```text
Card
 ├─ Base Stats
 ├─ Abilities
 │   ├─ Timing
 │   ├─ Gates
 │   ├─ Conditions
 │   ├─ Costs
 │   ├─ Sequenced Functions
 │   ├─ Durations
 │   └─ Keywords
 ├─ Current Contextual Value
 ├─ Future Strategic Value
 ├─ Synergy Value
 └─ Opportunity Cost
```

A Character's value must therefore be contextual.

The same card can have dramatically different values depending on:

* current DON!!
* current board
* opponent board
* current Life totals
* hand composition
* trash composition
* known revealed information
* Leader identity and type
* card types and names already controlled
* future gate activation potential
* remaining cards in deck where legally known or statistically inferred
* whether the CPU is ahead or behind
* estimated lethal horizon
* expected survival duration of the Character
* available follow-up cards
* ability sequencing opportunities

Do not assign cards a single static strategic score.

---

# 1. Ability Semantic Analysis Layer

Create a module such as:

```text
src/ai/analysis/
    abilityAnalyzer.ts
    cardStrategicProfile.ts
    synergyAnalyzer.ts
    comboGraph.ts
    futureValueEstimator.ts
    threatAnalyzer.ts
```

Transform each card's typed abilities into an AI-readable strategic profile.

Example:

```ts
interface CardStrategicProfile {
    immediateValue: number
    boardDevelopment: number
    cardAdvantage: number
    removalValue: number
    tempoValue: number
    defensiveValue: number
    offensiveValue: number
    resourceAcceleration: number
    resourceDenial: number
    recursionValue: number
    searchValue: number
    comboPotential: number
    engineValue: number
    finisherValue: number
    futureValue: number

    setupTags: StrategicTag[]
    payoffTags: StrategicTag[]
    synergyRequirements: SynergyRequirement[]
    enables: StrategicInteraction[]
}
```

The profile must be generated from ability semantics, not hardcoded manually for every card.

For example:

```text
draw
→ card advantage

searchTopDeck
→ card selection + consistency + combo access

searchDeck
→ high consistency + specific combo access

ko
→ removal + tempo + threat neutralization

rest
→ attack enablement + temporary control

preventRefresh
→ delayed control value

playFromHand
→ board development + DON efficiency

playFromDeck
→ board development + deck tutoring

playFromTrash
→ recursion + card advantage + board development

addDonFromDeck
→ resource acceleration

setActiveControllerDon
→ effective resource generation

addPowerAuraControllerCharacters
→ board-wide scaling engine

registerKoReplacementAura
→ resilience engine

preventBlockers
→ lethal enabling

doubleAttack
→ life pressure multiplier

banish
→ life and Trigger denial

blocker
→ defensive resource

rush
→ immediate offensive tempo
```

This mapping must remain generic and extensible.

---

# 2. Evaluate Effects in Hand Before Playing the Card

The CPU must analyze the abilities of every playable Character while the card is still in hand.

Do not wait until the Character enters play before reasoning about its effects.

For every candidate play action, calculate:

```text
PlayCandidateValue =
    body value
  + immediate ability value
  + triggered synergy value
  + future engine value
  + combo setup value
  + board interaction value
  + lethal contribution
  + defensive contribution
  + resource efficiency
  - opportunity cost
  - vulnerability risk
  - sequencing penalty
  - future option loss
```

For example, before playing a Character with:

```text
[On Play]
Draw 2 cards.
```

the CPU should understand that its effective value is not merely the body.

It produces:

* body development
* immediate card advantage
* increased future action options
* potentially increased Counter availability
* additional probability of finding combo pieces
* possible activation of hand-count gates
* possible triggering of `onDrawOutsideDrawPhase` effects

Likewise, a Character with:

```text
[On Play]
Play up to 1 matching Character from your hand.
```

must be evaluated as a possible sequence:

```text
Play A
→ A On Play
→ Play B
→ B On Play
→ reactive abilities trigger
→ resulting board state
→ remaining DON!!
→ possible attacks
→ future opponent pressure
```

Do not score A independently from B.

---

# 3. Ability Chain and Sequence Planning

The CPU must reason about ability chains.

The existing ability model contains sequential functions and conditional progression such as:

```text
function A
→ ifPrevious
→ function B
→ ifGate
→ function C
```

The AI planner must evaluate the complete resulting sequence.

Example:

```text
trash card from hand
→ if successful
→ K.O. opponent Character
→ if target removed
→ draw card
```

The CPU must calculate:

```text
cost of discarded card

versus

value of removed threat
+ tempo gained
+ replacement card value
+ downstream triggers
```

The CPU must not simply score each primitive independently and add them without context.

Sequence-dependent effects require sequence-dependent evaluation.

---

# 4. Combo and Synergy Graph

Build a dynamic synergy graph from ability semantics.

Example:

```text
Card A:
playFromHand(type = Straw Hat Crew)

Card B:
type = Straw Hat Crew

A → enables B
```

Another example:

```text
Card A:
addCost(target opponent, -2)

Card B:
ko(target maxCost = 4)

A → expands valid targets for B
```

Another:

```text
Card A:
rest opponent Character

Card B:
can attack rested Character efficiently

A → enables B
```

Another:

```text
Card A:
playFromTrash

Card B:
On K.O. effect

Card C:
trashSelf

B/C → graveyard setup
A → recursion payoff
```

Represent such relationships generically.

Suggested abstraction:

```ts
interface StrategicInteraction {
    source: CardDefinitionId
    target?: CardDefinitionId
    relationship:
        | 'enables'
        | 'amplifies'
        | 'searches'
        | 'recurs'
        | 'protects'
        | 'discounts'
        | 'setsUp'
        | 'paysOff'
        | 'extends'
        | 'finishes'
}
```

However, the interaction should preferably be inferred from capability compatibility rather than maintained as a giant manually curated table.

---

# 5. Setup, Bridge, Engine, and Payoff Recognition

The CPU should classify cards contextually into strategic roles.

Possible roles:

```text
SETUP

BRIDGE

ENGINE

INTERACTION

PROTECTION

TEMPO

PAYOFF

FINISHER
```

A card may have more than one role.

Examples:

### Setup

Creates conditions required later:

* fills trash
* increases Character count
* establishes a required type
* manipulates Life
* creates rested Characters
* returns DON!!
* increases hand count
* reduces enemy cost

### Bridge

Connects setup to another resource or play:

* search effects
* draw effects
* tutor effects
* cost discounts
* play-from-hand effects
* play-from-deck effects

### Engine

Generates repeated future value:

* permanent auras
* recurring Activate: Main
* recurring DON!! manipulation
* recurring card draw
* defensive replacement effects
* continuous buffs
* trigger engines

### Payoff

Becomes powerful after conditions are established:

* gates based on typed Character count
* trash count requirements
* low-Life conditions
* high DON!! conditions
* Character cost requirements
* board-count gates

### Finisher

Strongly contributes to ending the game:

* Rush
* Double Attack
* Banish
* Unblockable
* blocker suppression
* leader power amplification
* multiple active attackers
* attack reactivation

The CPU must recognize that a lower immediate-value setup card can be the strategically correct play when it enables a significantly stronger future payoff.

---

# 6. Gate-Aware Future Planning

The ability registry contains board-state gates.

The CPU must reason about both:

```text
gate currently satisfied
```

and:

```text
gate can reasonably be satisfied soon
```

For each gate, evaluate distance-to-activation.

Example:

```text
selfTypedCharacterCount:
    typeIncludes: Straw Hat Crew
    atLeast: 3
```

Current state:

```text
2 matching Characters on field
1 matching Character in hand
```

The CPU should recognize the gate as highly achievable.

It should assign strategic value to playing the matching Character.

Suggested abstraction:

```ts
interface GateProjection {
    currentlySatisfied: boolean
    turnsToSatisfy: number | null
    actionsToSatisfy: PlannedAction[]
    opportunityCost: number
    expectedPayoff: number
    probabilityOfSurvival: number
}
```

The CPU should not treat gates only as booleans.

They are planning objectives.

---

# 7. Timing-Aware Valuation

The CPU must value effects differently based on timing.

For example:

```text
onPlay
```

Immediate and usually guaranteed upon successful play.

```text
whenAttacking
```

Requires the Character to survive and become capable of attacking.

```text
activateMain
```

May produce repeated future value depending on cost and survival.

```text
onKO
```

May reduce the downside of losing the Character and can create sacrifice synergy.

```text
onEnterPlay
```

May establish permanent or conditional continuous effects.

```text
onBlock
```

Has defensive conditional value.

```text
onOpponentsAttack
```

Can change opponent combat calculations.

```text
endOfTurn
```

May require sequencing around delayed value.

The AI must apply a realization probability.

For example:

```text
ExpectedAbilityValue =
RawAbilityValue
× ActivationProbability
× ExpectedActivationCount
```

Therefore:

* `[On Play]` effects generally have high realization probability.
* `[When Attacking]` value depends on survival probability.
* reusable `[Activate: Main]` effects depend on expected board lifespan.
* reactive effects depend on opponent behavior and board context.

---

# 8. Long-Horizon Planning

The CPU must optimize toward winning the match, not simply maximizing the current board score.

Support strategic planning over a configurable horizon.

At minimum:

```text
Current action
→ remainder of current turn
→ projected opponent response
→ next CPU turn
```

For stronger difficulty levels:

```text
Turn N
→ Opponent Turn N
→ Turn N+1
→ Opponent Turn N+1
→ Turn N+2
```

The planner does not need to exhaustively search all states.

Use:

* action pruning
* beam search
* top-K candidate expansion
* transposition caching
* heuristic evaluation
* state hashing
* deterministic seeded tie-breaking

Suggested design:

```text
Strategic Planner
    ↓
Generate candidate action sequences
    ↓
Simulate resulting states
    ↓
Estimate opponent responses
    ↓
Evaluate future states
    ↓
Retain top-K lines
    ↓
Continue search to configured depth
```

---

# 9. Preserve Future Combo Pieces

The CPU must understand that cards in hand have option value.

A card should not automatically be:

* played immediately
* discarded for a cost
* used as Counter

only because doing so produces short-term positive value.

Before consuming a card from hand, calculate:

```text
Current Use Value

versus

Expected Future Strategic Value
```

Example:

A 2000 Counter card may also be:

* a required combo payoff
* searchable only through limited effects
* the only remaining removal tool
* part of a next-turn lethal line
* required to satisfy a Character-type gate

The CPU should consider preserving it.

---

# 10. Opportunity-Cost Reasoning

DON!! expenditure must consider future sequencing.

For example, given:

```text
10 active DON!!
```

Options might be:

```text
Play one 10-cost Character
```

or:

```text
Play 4-cost setup
→ trigger On Play
→ play 3-cost Character from effect
→ play another 3-cost Character
→ trigger reactive abilities
→ create 3 attackers for next turn
```

The CPU must compare resulting state trajectories rather than assuming the highest-cost play is strongest.

Evaluate:

```text
DON Efficiency =
Immediate value created
+ future value created
+ options preserved
```

---

# 11. Threat Evaluation from Abilities

Opponent Characters must also be evaluated by their ability semantics.

Threat value must include more than printed power and cost.

A low-power Character can be the highest-priority removal target if it provides:

* recurring draw
* cost reduction
* search
* DON!! acceleration
* board-wide aura
* K.O. replacement
* recurring Activate: Main
* combo enabling
* future lethal support

Create:

```ts
interface ThreatProfile {
    immediateThreat: number
    recurringValue: number
    synergyCentrality: number
    lethalContribution: number
    removalUrgency: number
}
```

Use this profile when selecting:

* K.O. targets
* bounce targets
* bottom-deck targets
* rest targets
* negate targets
* attack targets

---

# 12. Interaction Centrality

Use the combo graph to identify strategically central cards.

Example:

```text
Card X enables:
    Card A
    Card B
    Card C
    Card D
```

Card X may deserve higher strategic value than a larger standalone Character.

Likewise, an opponent's engine piece that enables multiple cards should receive increased removal priority.

Consider implementing:

```text
SynergyCentralityScore
```

based on the number and importance of currently available and reasonably expected interactions.

---

# 13. Aura and Continuous Effect Evaluation

Permanent and conditional effects must be evaluated across their expected lifetime.

For example:

```text
all your matching Characters gain +1000 power
```

must consider:

```text
current beneficiaries
+ expected future beneficiaries
× expected source survival
× expected useful turns
```

Similarly:

```text
your Characters cannot be K.O.'d by effects
```

must be evaluated relative to:

* opponent's visible removal tools
* known archetype tendencies
* current board value being protected
* projected future board development

Do not assign every aura a fixed number.

---

# 14. Effect Interaction Examples the CPU Must Understand

The evaluator must reason about patterns including, but not limited to:

### Cost Reduction → Removal

```text
reduce opponent Character cost
→ K.O. Character with cost threshold
```

### Rest → Attack

```text
rest enemy Character
→ attack rested Character
```

### Search → Combo Access

```text
search top deck
→ select card required by current or future combo
```

The CPU must choose the searched card based on strategy, not static card score.

### Play Chain

```text
play Character A
→ On Play plays Character B
→ B's On Play searches Character C
```

Evaluate the full chain.

### Trash Setup → Recursion

```text
trash card
→ later playFromTrash
```

Trashing the card may have positive setup value rather than being pure resource loss.

### DON!! Return → Trigger

```text
DON!! −N
→ onDonReturned ability activates
```

Evaluate both the cost and triggered payoff.

### DON!! Give → Trigger

```text
give DON!!
→ onDonGiven activates
```

The AI must consider trigger activation when choosing DON!! recipients.

### Removal → Reactive Trigger

```text
remove own or opposing Character
→ onRemovedFromField
→ secondary payoff
```

Removal must account for both beneficial and harmful downstream triggers.

### K.O. → On K.O.

Before K.O.-ing an opponent Character, evaluate whether its `[On K.O.]` effect makes the removal unfavorable.

Before sacrificing its own Character, evaluate whether `[On K.O.]` creates net positive value.

---

# 15. Strategic Modes Based on Match State

The CPU should dynamically shift evaluation weights.

Possible strategic modes:

```text
DEVELOP

CONTROL

DEFEND

PRESSURE

COMBO_SETUP

LETHAL_SEARCH

RECOVERY
```

Example:

### DEVELOP

Prioritize:

* efficient Characters
* search
* draw
* resource acceleration
* engine establishment

### CONTROL

Prioritize:

* removal
* denial
* favorable trades
* threat neutralization

### PRESSURE

Prioritize:

* active attackers
* efficient attack thresholds
* hand pressure
* Life reduction

### LETHAL_SEARCH

Prioritize:

* Rush
* Double Attack
* Unblockable
* blocker suppression
* power amplification
* attack sequencing
* removing blockers

### RECOVERY

Prioritize:

* blockers
* Counter preservation
* board stabilization
* draw
* removal of immediate attackers

The mode must emerge from game-state analysis.

Do not script turns.

---

# 16. Lethal Horizon

Create a lethal-horizon estimator.

Estimate:

```text
Can win this turn?

If not:
Can establish probable lethal next turn?

If not:
What sequence maximizes future winning probability?
```

Before choosing a development play, compare it against possible lethal lines.

The CPU must not miss victory because a board-development heuristic gave a higher generic score.

Likewise, the CPU must not force a low-probability lethal attack when a stable winning position is stronger.

---

# 17. Opponent Modeling Without Cheating

The CPU may estimate opponent possibilities based on public information.

Allowed:

* cards already revealed
* cards in trash
* Leader identity
* public board
* deck archetype knowledge if such metadata exists
* hand size
* previously played cards
* known search reveals
* common effect capabilities

Forbidden:

* reading actual hidden hand contents
* reading hidden Life
* reading deck order

Represent uncertainty probabilistically.

Example:

```text
Opponent has 7 cards in hand.

Possible defensive capacity:
low / medium / high confidence range
```

Hard difficulty may estimate Counter ranges.

It must never inspect actual hidden cards to obtain that estimate.

---

# 18. Selection Decisions Must Also Be Strategic

The intelligence layer must control not only which action to initiate, but all choices produced during resolution.

Examples:

* which card to search
* which card to discard
* which Character to K.O.
* which Character to rest
* which card to return to hand
* which Character receives DON!!
* which Character receives a power buff
* which card to play from hand
* which card to revive from trash
* which modal `chooseOne` branch to select
* whether an optional cost is worth paying

Every selection should use projected strategic value.

Do not use:

```text
first legal target
```

or:

```text
highest power target
```

as the default strategy.

---

# 19. Sequence Search Must Include Full Turn Plans

Do not evaluate only individual actions.

Generate meaningful turn-plan candidates such as:

```text
Plan A:
Attack
→ Attack
→ Play Character
→ Resolve On Play
→ End Turn
```

```text
Plan B:
Play setup Character
→ Resolve On Play
→ Activate Main
→ Attach DON!!
→ Attack Leader
→ End Turn
```

```text
Plan C:
Cost reduction
→ removal
→ attack exposed Leader
→ develop blocker
```

Compare complete plans where computationally feasible.

This is particularly important because play order can change:

* legal targets
* gates
* available DON!!
* triggered effects
* board slots
* attack opportunities
* future card value

---

# 20. No Card-ID Strategy Explosion

Do not implement strategy like:

```ts
if (card.id === 'OPXX-YYY') {
    score += 500
}
```

The primary AI must reason from structured ability semantics.

Card-specific knowledge is permitted only through a clearly separate optional layer:

```text
src/ai/knowledge/
```

and only for:

* exceptional interactions impossible to infer generically
* archetype plans
* curated opening priorities
* deck-specific strategic hints

The generic AI must remain capable of playing newly supported cards without requiring new CPU code.

---

# 21. Explainable Decision Traces

Add development-only strategic logging.

Example:

```text
CPU evaluating Character plays:

Candidate: Character A
Base body: +24
On Play removal: +42
Removes opponent engine piece: +31
Future board value: +18
Synergy with hand: +12
DON opportunity cost: -14

Total: 113


Candidate: Character B
Base body: +37
Permanent aura: +48
Expected survival: 0.72
Current beneficiaries: 2
Future synergy: +24
No immediate interaction: -10

Total: 99


Candidate: Character C
Base body: +18
Search effect: +22
Finds missing combo payoff: +38
Enables projected turn N+1 lethal: +45

Total: 123

Chosen:
Character C

Reason:
Highest projected long-horizon value and creates strongest next-turn victory line.
```

These traces should be available for:

* debugging
* AI tuning
* automated match analysis
* regression testing

They must be disabled in production builds.

---

# 22. Recommended Architecture

Suggested structure:

```text
src/ai/
    cpuPlayer.ts

    analysis/
        abilityAnalyzer.ts
        cardStrategicProfile.ts
        threatAnalyzer.ts
        synergyAnalyzer.ts
        gateProjection.ts
        lethalEstimator.ts

    planning/
        strategicPlanner.ts
        sequenceGenerator.ts
        actionPruner.ts
        futureStateEvaluator.ts
        opponentResponseModel.ts

    evaluation/
        stateEvaluator.ts
        actionEvaluator.ts
        abilityValueEvaluator.ts
        handValueEvaluator.ts
        resourceEvaluator.ts
        synergyEvaluator.ts

    knowledge/
        archetypeProfiles.ts
        strategicHints.ts

    debug/
        decisionTrace.ts
```

Do not duplicate game-rule logic inside AI modules.

Use the engine for:

* legal-action generation
* effect resolution
* gate validation
* target validation
* timing validation
* state transition simulation

The AI only:

```text
observes
evaluates
plans
chooses
```

---

# 23. Implementation Strategy

Do not attempt to perfectly model every capability immediately.

Build progressively.

### Phase 1

Semantic valuation for major categories:

* draw
* search
* removal
* rest
* power modification
* DON!! manipulation
* play from zones
* keywords
* blockers
* basic auras

### Phase 2

Add:

* gate projection
* combo detection
* ability chains
* recursive play effects
* graveyard synergy
* typed synergy
* cost-reduction interactions

### Phase 3

Add:

* multi-turn planning
* opponent response modeling
* expected activation count
* threat centrality
* lethal horizon

### Phase 4

Add:

* archetype strategy
* beam search
* MCTS-compatible evaluator
* CPU self-play testing
* automated weight tuning

However, design the interfaces correctly from the beginning so later phases do not require architecture replacement.

---

# Acceptance Criteria

The implementation is successful when the CPU can demonstrate behavior such as:

* chooses a lower-stat Character because its `[On Play]` creates superior value
* preserves a future payoff card instead of spending it as Counter unnecessarily
* plays setup before payoff
* recognizes search targets based on the current game plan
* recognizes cost-reduction + removal combinations
* sequences rest effects before attacks
* recognizes recursion value from trash setup
* values engine Characters based on expected future activations
* values aura Characters based on beneficiaries
* removes low-stat but strategically dangerous opponent engines
* preserves combo pieces for future turns
* evaluates optional costs before paying them
* considers triggered secondary effects before removing a Character
* changes strategic priorities when approaching lethal
* chooses complete action sequences rather than isolated locally optimal moves
* remains functional with newly added cards whose abilities use existing registry primitives
* never reads hidden information
* never bypasses the engine
* never duplicates rule logic
* remains deterministic under identical state and random seed

The final goal is not merely a CPU that knows how to perform legal actions.

The final goal is a CPU that can understand:

```text
what a card does

what that effect means in the current state

what the card enables later

what other cards make it stronger

what sequence produces the strongest future position

and whether that sequence moves the CPU closer to actually winning the game
```

Build the AI around **state transition value, synergy, timing, opportunity cost, and projected win probability**, rather than isolated card strength.
