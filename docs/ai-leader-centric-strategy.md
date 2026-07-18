# Extension: Leader-Centric Strategy, Survival, and Victory Objective

Extend the CPU architecture so that the Leader ability becomes one of the primary strategic foundations of the AI's decision-making.

The CPU must understand that the fundamental game objective is:

```text
PRIMARY VICTORY OBJECTIVE

Drive opponent Life to -1

while

Prevent own Life from reaching -1
```

Every strategic decision must ultimately be evaluated against these two objectives.

The CPU is not trying to:

* maximize board score
* maximize card advantage
* maximize hand size
* maximize DON!! usage
* maximize Character count
* activate as many effects as possible

Those are intermediate strategic resources.

The actual optimization target is:

```text
maximize probability of opponent Life reaching -1

while

minimizing probability of own Life reaching -1
```

Therefore:

```text
Board Advantage
Card Advantage
Tempo
DON!! Advantage
Removal
Character Development
Counter Preservation
Leader Effects
Combo Execution
Life Pressure

are means to victory,

not victory conditions themselves.
```

---

# 1. Global AI Objective Function

Introduce a top-level strategic objective function.

Conceptually:

```ts
interface MatchObjectiveEvaluation {
    winProbability: number
    lossProbability: number

    opponentLifePressure: number
    ownLifeSafety: number

    turnsToEstimatedVictory: number | null
    turnsToEstimatedDefeat: number | null

    currentLethalProbability: number
    opponentLethalProbability: number

    strategicPositionValue: number
}
```

The CPU's root evaluation should conceptually optimize:

```text
Utility =
    WinProbability
  - LossProbability
  + OpponentLifePressure
  + OwnLifeSafety
  + StrategicPositionValue
```

The exact implementation does not need to use these literal numeric formulas, but all lower-level evaluations must eventually contribute toward the actual match objective.

Do not allow the CPU to prefer a beautiful board state over a guaranteed victory.

Do not allow the CPU to sacrifice survival merely to gain short-term value unless the resulting line produces a sufficiently strong winning probability.

---

# 2. Terminal States Must Dominate All Heuristics

Terminal game states override every heuristic score.

Use effectively infinite priority.

Conceptually:

```text
Opponent Life reaches -1
→ WIN
→ highest possible evaluation
```

```text
Own Life reaches -1
→ LOSS
→ lowest possible evaluation
```

Therefore:

```ts
if (state.opponent.life <= -1) {
    return POSITIVE_TERMINAL_SCORE
}

if (state.self.life <= -1) {
    return NEGATIVE_TERMINAL_SCORE
}
```

Adapt this to the actual engine's canonical terminal-state API rather than duplicating victory-condition logic inside the AI.

The AI must query or simulate through the existing engine.

The AI must not independently implement conflicting game-over rules.

---

# 3. Leader-Centric Strategic Planning

The CPU must analyze its own Leader before evaluating individual plays.

Create:

```text
Leader Strategic Profile
        ↓
Deck Strategic Identity
        ↓
Current Match Plan
        ↓
Turn Plan
        ↓
Action Sequence
```

Suggested module:

```text
src/ai/strategy/
    leaderStrategyAnalyzer.ts
    strategicObjective.ts
    matchPlan.ts
    strategicModeSelector.ts
```

Suggested model:

```ts
interface LeaderStrategicProfile {
    preferredGamePlan: StrategicGamePlan[]

    resourceEngine: ResourceEngineProfile
    offensivePlan: OffensiveProfile
    defensivePlan: DefensiveProfile
    boardPlan: BoardProfile
    comboRequirements: SynergyRequirement[]

    preferredStateConditions: DesiredStateCondition[]
    requiredResources: StrategicResource[]
    payoffConditions: StrategicCondition[]

    activationPatterns: LeaderActivationPattern[]
}
```

The Leader profile must primarily be inferred from the Leader's structured ability semantics.

Avoid card-ID-specific logic where generic semantic analysis is possible.

---

# 4. The Leader Effect Defines Strategic Context

The CPU must ask:

```text
What does my Leader reward me for doing?
```

Then:

```text
What board state makes my Leader strongest?
```

Then:

```text
What sequence of plays moves the game toward that state?
```

Then:

```text
How does that strategic state help me reach the actual victory objective?
```

Example reasoning patterns:

---

## Leader rewards having many Characters of a specific type

Then the CPU should infer:

```text
preferred strategy:
wide board development

prioritize:
matching types
cheap efficient bodies
effects that play multiple Characters
search for matching Characters
protection effects
board-wide auras

avoid:
unnecessary self-sacrifice
poor-value trades
overcommitting Characters that do not support synergy
```

But only when this remains consistent with:

```text
opponent Life pressure
and
own survival
```

---

## Leader rewards returning DON!!

Then the CPU should understand:

```text
DON!! return is not purely a resource loss
```

It may be:

```text
activation cost
→ Leader payoff
→ secondary trigger
→ tempo gain
→ future advantage
```

The AI must evaluate:

```text
returned DON!! cost

versus

Leader effect value
+ triggered synergies
+ resulting board advantage
+ Life pressure created
+ survival impact
```

---

## Leader rewards attaching DON!!

Then the CPU should consider:

* which card should receive DON!!
* whether Leader attack power matters more
* whether DON!! attachment activates Character abilities
* whether attached DON!! should be preserved for later sequencing
* whether the Leader effect itself changes attack sequencing

---

## Leader rewards low Life

The CPU must understand the difference between:

```text
Life as survival resource
```

and:

```text
Life as strategic activation threshold
```

It may intentionally accept damage when:

```text
damage taken
→ activates Leader strategy
→ increases future value
→ does not create unacceptable lethal risk
```

However, the CPU must never blindly reduce its own Life merely because low-Life effects exist.

The AI must evaluate:

```text
LowLifePayoff
-
IncreasedLethalRisk
```

---

## Leader gains value from attacking

Then attack sequencing should account for:

```text
Leader attack
→ Leader effect
→ changed board state
→ Character attacks
→ additional effects
```

The CPU must not use generic attack ordering when the Leader's effect creates sequencing dependencies.

---

## Leader modifies Character costs

The CPU should understand:

```text
Leader effect
→ cost modification
→ expanded removal targets
→ removal effect
→ board opening
→ attacks toward opponent Life
```

The complete chain must be considered.

---

## Leader plays Characters through an effect

The CPU should understand the Leader as a resource conversion engine.

For example:

```text
Leader activation cost
→ play Character A
→ A On Play
→ Character B becomes playable
→ board development
→ future attack pressure
```

The value of the Leader effect must include downstream Character abilities.

---

# 5. Leader Ability Semantic Interpretation

The AI should analyze Leader abilities using the same semantic system used for Characters.

The Leader analyzer must inspect:

```text
timing

gate

condition

activation cost

effect functions

effect sequence

duration

keywords

targets

resource movement

downstream interactions
```

For example:

```text
Leader:
[Activate: Main]
[Once Per Turn]
Return 2 DON!!
Play a Character with a specific condition
```

The AI should infer:

```text
Strategic Identity:
resource conversion / board development

Activation Cost:
temporary DON!! economy loss

Immediate Payoff:
Character board presence

Secondary Value:
played Character On Play abilities

Long-Term Value:
additional attacker
additional defensive body
tribal synergy
future combo potential
```

The AI should then evaluate whether activation is beneficial in the current state.

Do not implement:

```text
Leader effect available
→ always activate
```

Instead:

```text
Leader effect available
→ generate activation lines
→ simulate outcomes
→ compare against non-activation lines
```

---

# 6. Derive a Match Plan from the Leader

At the beginning of the match, generate an initial strategic plan.

Example:

```ts
interface MatchPlan {
    primaryPlan: StrategicGamePlan
    secondaryPlan: StrategicGamePlan

    earlyGameObjectives: StrategicObjective[]
    midGameObjectives: StrategicObjective[]
    lateGameObjectives: StrategicObjective[]

    keyResourcesToPreserve: ResourcePolicy[]
    preferredBoardState: DesiredStateCondition[]
    lethalPattern: LethalPattern[]
}
```

Example conceptual result:

```text
Leader Strategy Analysis

Primary Plan:
Develop typed Characters efficiently and create repeated board pressure.

Early Game:
Search combo pieces.
Develop setup Characters.
Avoid unnecessary Counter expenditure.

Mid Game:
Activate Leader effect every profitable cycle.
Maintain required board gates.
Protect engine Character.

Late Game:
Convert board width into multiple Life attacks.
Remove blockers.
Create lethal through attack sequencing.
```

This should be generated dynamically from:

```text
Leader effect
+
hand
+
deck composition if available
+
current board
+
opponent strategy
```

The plan must change during the match.

---

# 7. Life Must Be Evaluated as Both Resource and Victory State

Create a dedicated Life evaluator.

Suggested module:

```text
src/ai/evaluation/lifeEvaluator.ts
```

The CPU must distinguish between:

```text
taking acceptable damage
```

and:

```text
entering unacceptable lethal risk
```

A simplistic policy such as:

```text
always protect Life
```

is incorrect.

Likewise:

```text
always take Life until 0
```

is incorrect.

Evaluate:

```text
ValueOfTakingDamage =
    card gained from Life if applicable
  + low-Life gate activation
  + Counter cards preserved
  + future strategic options

minus

    increased lethal risk
  + reduced defensive margin
  + opponent finisher potential
```

The CPU should sometimes intentionally take Life.

The CPU should sometimes Counter aggressively.

The correct choice depends on expected future states.

---

# 8. Own-Life Survival Model

Before every major action sequence, estimate:

```text
Can the opponent reduce my Life to -1 before my next meaningful opportunity?
```

Estimate:

* number of potential attackers
* visible power
* available DON!!
* Rush possibilities inferred from public knowledge
* unblockable possibilities
* Double Attack threats
* blocker suppression
* current blockers
* hand Counter estimate
* Leader defensive effects
* board removal risk

Create:

```ts
interface SurvivalProjection {
    immediateLossRisk: number
    nextTurnLossRisk: number
    projectedIncomingAttacks: number
    estimatedDefensiveCapacity: number
    requiredResourcesToSurvive: StrategicResource[]
}
```

The AI should preserve sufficient:

* Counter cards
* blockers
* DON!!
* defensive activations
* removal

when survival requires them.

---

# 9. Opponent-Life Pressure Model

Likewise, estimate progress toward victory.

Create:

```ts
interface VictoryProjection {
    opponentCurrentLife: number

    currentTurnLethalProbability: number
    nextTurnLethalProbability: number

    expectedSuccessfulLifeDamage: number
    availableAttackers: number
    futureAttackers: number

    blockerRemovalOptions: PlannedAction[]
    powerBoostOptions: PlannedAction[]
    defensiveHandPressure: number
}
```

The CPU must understand that attacks serve different purposes.

Examples:

```text
Attack intended to damage Life
```

```text
Attack intended to consume Counter
```

```text
Attack intended to rest or expose resources
```

```text
Attack intended to remove Character
```

```text
Attack intended to set up later lethal
```

Attack valuation must consider the match objective.

---

# 10. Pressure and Survival Must Be Balanced Dynamically

The AI needs a dynamic risk profile.

Suggested conceptual metric:

```text
StrategicUrgency =
    ownDefeatProximity
    versus
    opponentDefeatProximity
```

Example:

```text
Opponent Life: 0
Own Life: 4

Likely strategic mode:
LETHAL_SEARCH
```

The CPU should heavily prioritize winning lines.

---

Example:

```text
Opponent Life: 4
Own Life: 0
Opponent has strong board

Likely strategic mode:
SURVIVAL / CONTROL
```

The CPU should prioritize:

* removal
* blockers
* Counter preservation
* preventing additional attackers

---

Example:

```text
Opponent Life: 1
Own Life: 1
```

The AI should evaluate:

```text
race probability
```

not merely generic board advantage.

It may be correct to:

* ignore an opponent Character
* remove a blocker instead
* spend all DON!! offensively
* create multiple attack thresholds

if the simulated line has the highest chance of reaching opponent Life -1 before the opponent can do the same.

---

# 11. Leader Effect and Hand Evaluation Must Be Connected

Cards in hand must be evaluated relative to the Leader.

Example:

```text
Card A:
generic score = 60
Leader synergy = 5

Card B:
generic score = 45
Leader synergy = 40
```

The CPU may correctly prioritize Card B.

Suggested:

```text
ContextualCardValue =
    GenericCardValue
  + LeaderSynergyValue
  + CurrentStateValue
  + FuturePlanValue
```

Leader synergy can come from:

* type compatibility
* name compatibility
* effect timing
* DON!! interaction
* Life interaction
* cost interaction
* trash interaction
* board-count gates
* attack triggers
* Leader power conditions
* effect chaining

---

# 12. Leader Activation Must Be Included in Full Turn Search

The planner must not decide Leader actions separately from Character actions.

Example candidate plans:

```text
Plan A

Leader Attack
→ activate Leader When Attacking
→ play Character A
→ A On Play rests blocker
→ Character B attacks Leader
```

```text
Plan B

Play Character C first
→ C On Play searches Character D
→ activate Leader effect
→ play D
→ trigger synergy
→ attack sequence
```

```text
Plan C

Do not activate Leader
→ preserve DON!!
→ play defensive Character
→ attack conservatively
```

Evaluate the complete state trajectory.

---

# 13. Leader-Based Combo Detection

Add Leader abilities as nodes in the combo graph.

Previously:

```text
Card A
→ Card B
```

Now support:

```text
Leader Effect
→ Card A
→ Card B
→ Board Gate
→ Card C Payoff
```

For example:

```text
Leader returns DON!!
→ onDonReturned Character triggers
→ draw card
→ Character in hand becomes available
→ activate play effect
```

Or:

```text
Leader reduces cost
→ Character effect can remove target
→ attacker reaches Leader
→ opponent Life pressure increases
```

The synergy graph must treat Leader abilities as first-class strategic effects.

---

# 14. Leader Effect Opportunity Cost

Leader abilities often have costs.

Examples:

* rest Leader
* attach DON!!
* return DON!!
* rest DON!!
* trash cards
* return Characters
* manipulate Life
* consume once-per-turn activation

The CPU must evaluate:

```text
LeaderActivationNetValue =
    immediate payoff
  + downstream synergy
  + future strategic value
  + victory pressure
  + survival value

minus

    activation cost
  + lost alternative action value
  + future option loss
  + survival risk
```

Never activate Leader effects mechanically.

---

# 15. Once-Per-Turn Resource Planning

Once-per-turn Leader effects are strategic resources.

The CPU must consider:

```text
activate now

versus

delay until later in turn
```

Example:

Activating before attacking may create value.

But attacking first might:

* force Counter cards
* reveal defensive commitment
* change target availability
* trigger Leader When Attacking effect
* create better Leader activation targets

Therefore once-per-turn effects must participate in sequence planning.

---

# 16. Long-Term Leader Engine Value

Some Leaders provide repeated value every turn.

The AI must evaluate preserving the conditions necessary for repeated activation.

Example:

```text
Leader requires:
specific Character type
+
DON!! cost
+
board gate
```

The CPU may choose a slightly weaker immediate action if it preserves:

```text
3 future Leader activations
```

Expected Leader engine value:

```text
ExpectedLeaderValue =
ValuePerActivation
× ExpectedFutureActivations
× ProbabilityActivationConditionsRemainAvailable
```

This connects Leader strategy with long-horizon planning.

---

# 17. Strategic Deviations Are Allowed

The CPU must not become trapped by its Leader strategy.

Example:

Leader prefers wide board development.

But current state contains guaranteed lethal through a direct attack line.

Then:

```text
take lethal line
```

not:

```text
play more Characters because Leader strategy prefers wide boards
```

Similarly, a Leader may prefer aggressive play, but survival may require defensive deviation.

Leader strategy is:

```text
strategic guidance
```

not:

```text
hardcoded behavior
```

The priority hierarchy should be:

```text
1. Secure immediate victory
2. Prevent immediate defeat
3. Maximize future win probability
4. Follow Leader strategic plan
5. Improve generic state value
```

---

# 18. Victory-Oriented State Evaluation

Update the state evaluator so every state is interpreted in relation to victory.

Do not use:

```text
StateScore =
Board
+ Hand
+ DON!!
```

Use something conceptually closer to:

```text
StateScore =
    VictoryProbability
  - DefeatProbability

  + OpponentLifePressure
  + OwnLifeSafety

  + LethalSetupValue
  - OpponentLethalThreat

  + LeaderPlanProgress
  + BoardAdvantage
  + ResourceAdvantage
  + CardAdvantage
```

The exact weights should be tunable.

Near terminal states, Life and lethal metrics should dominate.

Earlier in the game, long-term strategic resources may have higher relative value.

---

# 19. Dynamic Evaluation Weighting by Game Phase

Weights should not remain constant.

Example:

## Early Game

Higher weight:

```text
Leader plan development
search consistency
resource development
engine setup
card advantage
```

## Mid Game

Higher weight:

```text
board control
Leader activation efficiency
combo progression
tempo
pressure
```

## Late Game

Higher weight:

```text
Life pressure
lethal probability
survival probability
blocker removal
attack sequencing
Counter preservation
```

The AI should infer phase from actual state rather than fixed turn number alone.

Consider:

* Life totals
* DON!! count
* board size
* hand size
* threat density
* lethal potential

---

# 20. Explainable Strategic Logs

Development logs should explain the Leader strategy.

Example:

```text
LEADER STRATEGY ANALYSIS

Leader Profile:
Board-development engine

Primary Reward:
Playing typed Characters through Leader effect

Current Strategic Goal:
Establish 3 matching Characters while preserving survival

Current Life:
2

Opponent Life:
3

Opponent Lethal Risk:
Low

Leader Activation Candidates:

A:
Return 2 DON!!
Play Character X
Trigger X On Play
Search Character Y

Immediate Value: 42
Future Value: 61
Life Pressure: 20
Survival Impact: +8

Total Strategic Value: 131


B:
Do not activate Leader
Play Character Z normally

Immediate Value: 53
Future Value: 18
Life Pressure: 14
Survival Impact: +4

Total Strategic Value: 89


Decision:
Activate Leader effect.

Reason:
Creates stronger long-term engine, preserves sufficient defensive capacity,
and improves projected victory probability over the next two turns.
```

Another example:

```text
LETHAL OVERRIDE

Leader Strategy Recommendation:
Develop board

Detected:
87% current-turn lethal line

Sequence:
Leader attack
→ Leader effect
→ remove blocker
→ Character attack
→ Character attack

Decision:
Ignore normal development plan and execute lethal sequence.
```

---

# 21. Required AI Reasoning Hierarchy

Implement the CPU reasoning hierarchy approximately as:

```text
MATCH OBJECTIVE

Reduce opponent Life to -1
Prevent own Life reaching -1

        ↓

LETHAL AND SURVIVAL ANALYSIS

Can I win now?
Can opponent win soon?
Who is winning the race?

        ↓

LEADER STRATEGY ANALYSIS

What does my Leader reward?
What state does my Leader want?
What resources enable the strategy?

        ↓

MATCH PLAN

Develop?
Control?
Defend?
Pressure?
Combo?
Search lethal?

        ↓

TURN PLAN

Which complete sequence best advances victory?

        ↓

ACTION DECISION

Attack
Play
Activate
Attach DON!!
Counter
Select target
Resolve choice
End turn
```

This hierarchy is important.

Do not invert it into:

```text
Find legal actions
→ assign arbitrary scores
→ choose highest number
```

The CPU should understand the strategic purpose behind the action.

---

# 22. Acceptance Criteria

The Leader-aware strategic implementation is successful when the CPU can demonstrate behavior such as:

* analyzes the Leader effect before forming a game plan
* recognizes what resources and board states activate the Leader strategy
* values cards differently depending on Leader synergy
* sequences Leader actions with Character On Play effects
* evaluates Leader effects before choosing cards to play
* preserves resources needed for future Leader activations
* recognizes when intentionally taking Life is strategically valid
* recognizes when taking Life creates unacceptable defeat risk
* protects own Life when the opponent has credible lethal
* prioritizes opponent Life pressure when a realistic lethal line exists
* abandons normal Leader strategy when immediate victory is available
* abandons aggressive Leader strategy when survival requires defense
* uses Leader effects as first-class nodes in the synergy and combo graph
* calculates opportunity cost before activating Leader effects
* evaluates complete turn sequences containing Leader and Character effects
* changes strategic mode dynamically based on Life states and lethal horizon
* always optimizes toward opponent Life reaching -1 before own Life reaches -1

The CPU should behave as though it understands:

```text
My Leader defines how I prefer to play.

My hand determines which plans are currently possible.

My board determines which plans are already established.

The opponent determines what must be answered.

Life determines who is approaching victory or defeat.

Every action must serve the ultimate objective:

reach opponent Life -1

before my own Life reaches -1.
```
