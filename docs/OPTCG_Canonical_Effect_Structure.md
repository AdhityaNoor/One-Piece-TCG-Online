# Canonical OPTCG Effect Structure

This structure separates **official effect categories**, activation timing, conditions, costs, resolution flow, selectors, actions, durations, and runtime state.

---

## 1. Complete Effect Definition

```ts
EffectDefinition {
    id: EffectId

    source: EffectSource

    category:
        AUTO
        | ACTIVATE
        | PERMANENT
        | REPLACEMENT

    applicationMode:
        ONE_SHOT
        | CONTINUOUS
        | DELAYED

    activationZones: Zone[]

    timing?: TimingExpression

    conditions?: ConditionExpression

    usageLimit?: UsageLimit

    optionality:
        MANDATORY
        | OPTIONAL

    activationCost?: ActivationCost

    resolution: ResolutionNode

    duration?: Duration

    ruleModifier?: RuleModifier

    metadata?: {
        sourceCardNumber: string
        effectIndex: number
        printedText: string
        normalizedText?: string
        parserVersion?: string
    }
}
```

---

## 2. Effect Source

```ts
EffectSource {
    objectRef:
        THIS_CARD
        | CARD_OBJECT_ID
        | RULE_OBJECT
        | GENERATED_EFFECT

    objectId?: CardObjectId

    physicalCardId?: PhysicalCardId

    owner:
        PLAYER
        | OPPONENT

    controller:
        PLAYER
        | OPPONENT

    sourceZone: Zone

    effectIndex?: number
}
```

### Object Identity

```ts
CardObjectIdentity {
    physicalCardId: string
    objectId: string
    zoneChangeVersion: number
}
```

When a Character or Stage moves from its area to another area, it becomes a new game object. Temporary effects, usage state, and modifiers should therefore be tracked by `objectId`, not only by card number.

---

# 3. Effect Categories

```ts
EffectCategory =
    AUTO
    | ACTIVATE
    | PERMANENT
    | REPLACEMENT
```

## Auto

Automatically becomes eligible when an activation event occurs.

```text
[On Play]
[When Attacking]
[On Block]
[On K.O.]
[On Your Opponent's Attack]
[End of Your Turn]
[End of Your Opponent's Turn]
When this Character becomes rested
When a card is added to your Life
```

## Activate

Explicitly activated by a player.

```text
[Activate: Main]
Event [Main]
Event [Counter]
```

## Permanent

Continuously valid while its source and conditions remain valid.

```text
[Your Turn] This Character gains +1000 power.
This Character cannot be K.O.'d by effects.
If you have 5 or more cards in your hand, this Character gains [Blocker].
```

## Replacement

Replaces an event with another event.

```text
If this Character would be K.O.'d, trash 1 card from your hand instead.
If you would take damage, ...
... is trashed instead of being added to your hand.
```

---

# 4. Rule Modifier

`Under the rules of this game` is treated as a special form of **Permanent effect**.

```ts
RuleModifier {
    scope:
        DECK_CONSTRUCTION
        | CARD_NAME
        | CARD_COLOR
        | CARD_TYPE
        | CARD_ATTRIBUTE
        | STARTING_LIFE
        | STARTING_HAND
        | STARTING_DON
        | DON_DECK_SIZE
        | MAIN_DECK_SIZE
        | CHARACTER_AREA_CAPACITY
        | STAGE_AREA_CAPACITY
        | DEFEAT_CONDITION
        | VICTORY_CONDITION
        | PLAY_PERMISSION
        | ATTACK_PERMISSION
        | GAME_SETUP
        | GENERAL_RULE

    validFrom:
        DECK_REGISTRATION
        | PRE_GAME
        | GAME_SETUP
        | GAME_START
        | ALWAYS

    modifier: ModifierExpression
}
```

Example:

```ts
{
    category: PERMANENT,
    ruleModifier: {
        scope: CARD_NAME,
        validFrom: ALWAYS,
        modifier: TREAT_NAME_AS("Kouzuki Oden")
    }
}
```

---

# 5. Application Mode

```ts
EffectApplicationMode =
    ONE_SHOT
    | CONTINUOUS
    | DELAYED
```

```text
ONE_SHOT
    Resolves immediately and finishes.

CONTINUOUS
    Creates a modifier that remains valid for a duration.

DELAYED
    Creates an effect that resolves when a future timing occurs.
```

---

# 6. Official Keyword Effects

```ts
KeywordEffect =
    RUSH
    | RUSH_CHARACTER
    | DOUBLE_ATTACK
    | BANISH
    | BLOCKER
    | TRIGGER
    | UNBLOCKABLE
```

## Keyword Behavior

```text
RUSH
    Can attack on the turn this Character was played.

RUSH_CHARACTER
    Can attack opposing Characters on the turn this Character was played.
    Does not independently allow attacking the opposing Leader.

DOUBLE_ATTACK
    Deals 2 Life damage instead of 1.

BANISH
    Life damaged by this attack is trashed instead of added to hand.
    Trigger is not activated.

BLOCKER
    Can rest during the Block Step to replace the attack target.

TRIGGER
    Can be activated while processing damage instead of adding
    that Life card to hand.

UNBLOCKABLE
    Prevents the opponent from activating Blocker against this attack.
```

---

# 7. Card-Text Markers

These are not all keyword effects.

```ts
EffectMarker =
    ACTIVATE_MAIN
    | EVENT_MAIN
    | EVENT_COUNTER

    | ON_PLAY
    | WHEN_ATTACKING
    | ON_BLOCK
    | ON_KO
    | ON_OPPONENT_ATTACK
    | END_OF_YOUR_TURN
    | END_OF_OPPONENT_TURN

    | YOUR_TURN
    | OPPONENT_TURN

    | DON_ATTACHED_THRESHOLD
    | DON_MINUS

    | ONCE_PER_TURN
    | TRASH_INSTRUCTION
```

Categorization:

```text
ACTIVATE_MAIN       → manual timing
EVENT_MAIN          → Event activation timing
EVENT_COUNTER       → Event activation timing

ON_PLAY             → auto timing
WHEN_ATTACKING      → auto timing
ON_BLOCK            → auto timing
ON_KO               → auto timing
ON_OPPONENT_ATTACK  → auto timing

YOUR_TURN           → condition
OPPONENT_TURN       → condition
DON!! xN            → condition
DON!! −N            → activation requirement/payment
ONCE_PER_TURN       → usage limit
```

---

# 8. Game State

```ts
GameState {
    gameId: string

    players: {
        player: PlayerState
        opponent: PlayerState
    }

    startingPlayer: PlayerId
    turnPlayer: PlayerId
    nonTurnPlayer: PlayerId

    turnNumber: number

    playerTurnNumber: {
        player: number
        opponent: number
    }

    phase: GamePhase

    battle?: BattleState

    resolutionQueue: EffectInstance[]

    pendingAutoEffects: EffectInstance[]

    pendingRuleProcessing: RuleProcess[]

    continuousModifiers: ContinuousModifier[]

    replacementEffects: ReplacementEffectInstance[]

    delayedEffects: DelayedEffectInstance[]

    eventHistory: GameEvent[]

    currentResolution?: ResolutionContext
}
```

## Game Phases

```ts
GamePhase =
    GAME_SETUP
    | REFRESH_PHASE
    | DRAW_PHASE
    | DON_PHASE
    | MAIN_PHASE
    | END_PHASE
```

## Battle Steps

```ts
BattleStep =
    ATTACK_STEP
    | BLOCK_STEP
    | COUNTER_STEP
    | DAMAGE_STEP
    | END_OF_BATTLE
```

---

# 9. Player State

```ts
PlayerState {
    playerId: PlayerId

    leader: LeaderState

    deck: OrderedCardZone
    hand: CardZone
    trash: CardZone
    life: OrderedCardZone

    donDeck: OrderedDonZone
    costArea: DonZone

    characterArea: CharacterState[]
    stageArea?: StageState

    limits: {
        maxCharacters: number
        maxStages: number
        mainDeckSize: number
        donDeckSize: number
    }

    turnState: PlayerTurnState

    usageTrackers: UsageTracker[]
}
```

## Derived Player Properties

These should normally be calculated rather than stored independently.

```ts
DerivedPlayerState {
    currentLifeCount: number
    handCount: number
    deckCount: number
    trashCount: number

    donDeckCount: number
    activeDonCount: number
    restedDonCount: number
    attachedDonCount: number

    characterCount: number
    stageCount: number
}
```

---

# 10. Leader State

```ts
LeaderState {
    objectId: CardObjectId
    cardNumber: string

    printedName: string
    effectiveNames: string[]

    printedColors: Color[]
    effectiveColors: Color[]

    printedTypes: string[]
    effectiveTypes: string[]

    printedAttributes: Attribute[]
    effectiveAttributes: Attribute[]

    printedLife: number
    startingLife: number
    currentLifeCount: number

    basePower: number
    currentPower: number

    state:
        ACTIVE
        | RESTED

    attachedDon: DonObjectId[]

    baseEffects: EffectDefinition[]
    gainedEffects: EffectInstance[]
    invalidatedEffects: EffectId[]

    temporaryModifiers: ModifierInstance[]

    attackCountThisTurn: number
    usageTrackers: UsageTracker[]
}
```

Life distinctions:

```text
printedLife
    Life printed on the Leader.

startingLife
    Life used during setup after rule modifiers.

currentLifeCount
    Current number of cards in the Life area.
```

---

# 11. Card Definition and Runtime State

## Printed Card Definition

```ts
CardDefinition {
    cardNumber: string
    cardCategory:
        LEADER
        | CHARACTER
        | EVENT
        | STAGE
        | DON

    printedName: string

    colors: Color[]
    types: string[]
    attributes: Attribute[]

    printedCost?: number
    printedPower?: number
    printedCounter?: number
    printedLife?: number

    blockNumber?: number

    baseEffects: EffectDefinition[]
}
```

## Runtime Card Object

```ts
CardState {
    physicalCardId: PhysicalCardId
    objectId: CardObjectId
    zoneChangeVersion: number

    definition: CardDefinition

    owner: PlayerId
    controller: PlayerId

    zone: Zone

    state?:
        ACTIVE
        | RESTED

    face:
        FACE_UP
        | FACE_DOWN

    effectiveProperties: {
        names: string[]
        colors: Color[]
        types: string[]
        attributes: Attribute[]

        cost?: number
        power?: number
        counter?: number
        life?: number
    }

    attachedDon: DonObjectId[]

    gainedEffects: EffectInstance[]
    invalidatedEffects: EffectId[]

    temporaryModifiers: ModifierInstance[]

    enteredCurrentZoneAt: GameEventId

    playedTurn?: number
    attackCountThisTurn: number

    usageTrackers: UsageTracker[]
}
```

---

# 12. Zones

```ts
Zone =
    LEADER_AREA
    | CHARACTER_AREA
    | STAGE_AREA
    | COST_AREA
    | ATTACHED_DON

    | HAND
    | DECK
    | TRASH
    | LIFE
    | DON_DECK

    | RESOLVING_TRIGGER
    | RESOLUTION_LIMBO
    | NONE
```

Virtual selector zones:

```ts
VirtualZone =
    FIELD
    | OWN_FIELD
    | OPPONENT_FIELD
    | ALL_AREAS
    | OPEN_AREAS
    | SECRET_AREAS
```

Visibility:

```ts
ZoneVisibility =
    OPEN
    | SECRET
    | CONDITIONALLY_OPEN
```

---

# 13. Battle State

```ts
BattleState {
    battleId: string

    attackingPlayer: PlayerId

    attacker: CardObjectId

    originalTarget: CardObjectId
    currentTarget: CardObjectId

    blocker?: CardObjectId

    step: BattleStep

    attackerPower: number
    targetPower: number

    baseDamage: number
    currentDamage: number

    attackProperties: {
        canAttackLeader: boolean
        canAttackActiveCharacters: boolean
        canAttackRestedCharacters: boolean
        unblockable: boolean
        banish: boolean
    }

    counterPowerAdded: number

    battleEvents: GameEventId[]
}
```

---

# 14. Timing

```ts
TimingExpression =
    STANDARD_TIMING(StandardTiming)
    | CUSTOM_EVENT(EventPattern)
    | MANUAL_WINDOW(ManualTiming)
    | REPLACEMENT_WINDOW(ReplacementPattern)
    | AND(TimingExpression[])
    | OR(TimingExpression[])
```

## Standard Timing

```ts
StandardTiming =
    ON_PLAY
    | WHEN_ATTACKING
    | ON_OPPONENT_ATTACK
    | ON_BLOCK
    | ON_KO

    | END_OF_YOUR_TURN
    | END_OF_OPPONENT_TURN

    | ACTIVATE_MAIN
    | EVENT_MAIN
    | EVENT_COUNTER

    | TRIGGER
```

## Manual Timing

```ts
ManualTiming {
    phase:
        MAIN_PHASE
        | COUNTER_STEP
        | TRIGGER_RESOLUTION

    controller:
        PLAYER
        | OPPONENT

    battleRestriction:
        OUTSIDE_BATTLE
        | DURING_BATTLE
        | ANY
}
```

## Custom Event Timing

```ts
EventPattern {
    type: GameEventType

    subject?: Selector

    actor?:
        PLAYER
        | OPPONENT
        | ANY

    cause?: EventCause

    fromZone?: Zone
    toZone?: Zone

    conditions?: ConditionExpression
}
```

## Event Types

```ts
GameEventType =
    TURN_STARTED
    | PHASE_STARTED
    | PHASE_ENDED

    | CARD_PLAYED
    | CARD_ACTIVATED
    | EFFECT_ACTIVATED
    | EFFECT_RESOLVED

    | CARD_MOVED
    | CARD_ADDED_TO_HAND
    | CARD_ADDED_TO_LIFE
    | CARD_TRASHED
    | CARD_RETURNED_TO_DECK

    | CHARACTER_KOD
    | CHARACTER_REMOVED_FROM_FIELD

    | CARD_BECAME_ACTIVE
    | CARD_BECAME_RESTED

    | ATTACK_DECLARED
    | ATTACK_TARGET_SELECTED
    | BLOCKER_ACTIVATED
    | DAMAGE_DEALT
    | DAMAGE_TAKEN
    | BATTLE_ENDED

    | DON_GIVEN
    | DON_DETACHED
    | DON_RESTED
    | DON_SET_ACTIVE
    | DON_RETURNED_TO_DON_DECK

    | LIFE_REVEALED
    | TRIGGER_ACTIVATED
```

## Event Cause

```ts
EventCause =
    RULE
    | BATTLE
    | DAMAGE
    | CARD_PLAY_COST
    | CARD_ACTIVATION
    | ACTIVATION_COST
    | EFFECT
    | REPLACEMENT_EFFECT
    | REFRESH_PHASE
    | DEFEAT_PROCESSING
```

---

# 15. Conditions

```ts
ConditionExpression =
    TRUE
    | FALSE

    | PREDICATE(ConditionPredicate)

    | AND(ConditionExpression[])
    | OR(ConditionExpression[])
    | NOT(ConditionExpression)

    | ALL(Selector, ConditionExpression)
    | ANY(Selector, ConditionExpression)
```

## Predicate

```ts
ConditionPredicate {
    left: ValueExpression

    operator:
        EQUAL
        | NOT_EQUAL
        | GREATER_THAN
        | GREATER_OR_EQUAL
        | LESS_THAN
        | LESS_OR_EQUAL
        | CONTAINS
        | EXISTS
        | NOT_EXISTS
        | MATCHES

    right?: ValueExpression
}
```

## Standard Conditions

```ts
ConditionType =
    TURN_IS
    | PHASE_IS
    | BATTLE_STEP_IS

    | SOURCE_IS_ACTIVE
    | SOURCE_IS_RESTED
    | SOURCE_IS_ATTACKING
    | SOURCE_WAS_PLAYED_THIS_TURN

    | DON_ATTACHED_COUNT
    | DON_ON_FIELD_COUNT
    | ACTIVE_DON_COUNT
    | RESTED_DON_COUNT

    | LIFE_COUNT
    | HAND_COUNT
    | DECK_COUNT
    | TRASH_COUNT
    | CHARACTER_COUNT

    | CARD_EXISTS
    | CARD_COUNT
    | ALL_CARDS_MATCH
    | NO_CARD_MATCHES

    | LEADER_MATCHES
    | SOURCE_MATCHES

    | EVENT_OCCURRED
    | EVENT_OCCURRED_THIS_TURN
    | EVENT_OCCURRED_THIS_BATTLE

    | EFFECT_HAS_RESOLVED
    | ACTION_SUCCEEDED

    | PLAYER_TURN_NUMBER
    | GAME_TURN_NUMBER
```

## Examples

```ts
// [Your Turn]
PREDICATE({
    left: CURRENT_TURN_PLAYER,
    operator: EQUAL,
    right: EFFECT_OWNER
})
```

```ts
// [DON!! x2]
PREDICATE({
    left: ATTACHED_DON_COUNT(THIS_CARD),
    operator: GREATER_OR_EQUAL,
    right: 2
})
```

```ts
// If you have 5 or fewer cards in your hand
PREDICATE({
    left: COUNT(HAND_OF(PLAYER)),
    operator: LESS_OR_EQUAL,
    right: 5
})
```

```ts
// If your opponent's Character was K.O.'d this turn
EVENT_OCCURRED_THIS_TURN({
    type: CHARACTER_KOD,
    subject: {
        controller: OPPONENT,
        cardCategories: [CHARACTER]
    }
})
```

---

# 16. Value Expressions

```ts
ValueExpression =
    NUMBER(number)
    | BOOLEAN(boolean)
    | STRING(string)

    | PROPERTY(ObjectReference, PropertyName)

    | COUNT(Selector)

    | PREVIOUS_RESULT(ResultReference)

    | ADD(ValueExpression[])
    | SUBTRACT(ValueExpression, ValueExpression)
    | MULTIPLY(ValueExpression[])
    | DIVIDE(ValueExpression, ValueExpression)

    | MIN(ValueExpression[])
    | MAX(ValueExpression[])

    | CLAMP(ValueExpression, min, max)
```

Examples:

```ts
COUNT({
    controller: PLAYER,
    zones: [TRASH],
    cardCategories: [CHARACTER]
})
```

```ts
MULTIPLY([
    COUNT(SELECTED_CARDS),
    NUMBER(1000)
])
```

---

# 17. Usage Limit

```ts
UsageLimit {
    maximumUses: number

    period:
        PER_TURN
        | PER_BATTLE
        | PER_GAME
        | WHILE_IN_CURRENT_ZONE
        | CUSTOM

    trackerScope:
        EFFECT_INSTANCE
        | CARD_OBJECT
        | PHYSICAL_CARD
        | PLAYER
        | CARD_NAME

    resetsAt?: TimingExpression

    consumeWhen:
        ACTIVATED
        | COST_PAYMENT_STARTED
        | COST_PAID
        | RESOLVED
}
```

Standard `[Once Per Turn]`:

```ts
{
    maximumUses: 1,
    period: PER_TURN,
    trackerScope: CARD_OBJECT,
    consumeWhen: ACTIVATED
}
```

---

# 18. Activation Cost

Everything before `:` belongs to the activation-cost section.

```ts
ActivationCost {
    preconditions?: ConditionExpression

    payments: CostAction[]

    optionalPayment:
        REQUIRED_TO_ACTIVATE
        | PLAYER_MAY_DECLINE

    executionPolicy:
        VERIFY_ALL_THEN_PAY_IN_ORDER
}
```

## Cost Actions

```ts
CostAction =
    REST_DON_COST {
        count: ValueExpression
    }

    | DON_MINUS_COST {
        count: ValueExpression
        selectableZones: [
            LEADER_AREA,
            CHARACTER_AREA,
            COST_AREA
        ]
    }

    | REST_CARD_COST {
        selector: Selector
    }

    | TRASH_CARD_COST {
        selector: Selector
    }

    | KO_CARD_COST {
        selector: Selector
    }

    | RETURN_CARD_TO_HAND_COST {
        selector: Selector
    }

    | RETURN_CARD_TO_DECK_COST {
        selector: Selector
        placement: DeckPlacement
    }

    | RETURN_DON_TO_DON_DECK_COST {
        selector: Selector
    }

    | ADD_LIFE_TO_HAND_COST {
        selector: Selector
    }

    | TRASH_LIFE_COST {
        selector: Selector
    }

    | REVEAL_CARD_COST {
        selector: Selector
    }
```

Examples:

```ts
// ①
REST_DON_COST {
    count: 1
}
```

```ts
// DON!! −2
DON_MINUS_COST {
    count: 2,
    selectableZones: [
        LEADER_AREA,
        CHARACTER_AREA,
        COST_AREA
    ]
}
```

```ts
// You may rest this Character:
REST_CARD_COST {
    selector: THIS_CARD
}
```

```ts
// You may trash 1 card from your hand:
TRASH_CARD_COST {
    selector: {
        controller: PLAYER,
        zones: [HAND],
        quantity: EXACTLY(1)
    }
}
```

---

# 19. Resolution Structure

```ts
ResolutionNode =
    ACTION(Action)

    | SEQUENCE(ResolutionNode[])

    | OPTIONAL {
        node: ResolutionNode
    }

    | IF {
        condition: ConditionExpression
        then: ResolutionNode
        else?: ResolutionNode
    }

    | IF_ACTION_SUCCEEDED {
        actionResult: ResultReference
        then: ResolutionNode
        else?: ResolutionNode
    }

    | CHOOSE {
        chooser: PlayerReference
        options: ResolutionNode[]
        minimumChoices: number
        maximumChoices: number
    }

    | FOR_EACH {
        items: Selector
        node: ResolutionNode
    }

    | REPEAT {
        count: ValueExpression
        node: ResolutionNode
    }

    | REPLACEMENT {
        event: ReplacementPattern
        replacement: ResolutionNode
    }

    | DELAY {
        timing: TimingExpression
        node: ResolutionNode
        expiration?: Duration
    }

    | CREATE_CONTINUOUS_EFFECT {
        modifier: ModifierExpression
        duration: Duration
    }

    | NO_OP
```

---

# 20. Text Connectors

```text
Then
    SEQUENCE

And then
    SEQUENCE

If
    CONDITIONAL_BRANCH

If you do
    ACTION_RESULT_DEPENDENCY

If you did
    ACTION_RESULT_DEPENDENCY

Otherwise
    ELSE_BRANCH

Instead
    REPLACEMENT

You may
    OPTIONAL

Up to N
    OPTIONAL_QUANTITY_SELECTION

Choose one
    CHOICE

For each
    LOOP_OVER_SELECTION

For every N
    CALCULATED_VALUE

In any order
    PLAYER_ORDERED_RESULT
```

## Then

```text
Trash 1 card from your hand.
Then, draw 1 card.
```

```ts
SEQUENCE([
    ACTION(TRASH_CARD(...)),
    ACTION(DRAW_CARD(...))
])
```

The second action is attempted independently after the first.

## If You Do

```text
You may trash 1 card from your hand.
If you do, draw 2 cards.
```

```ts
SEQUENCE([
    OPTIONAL(
        ACTION({
            id: "trash-step",
            type: TRASH_CARD,
            ...
        })
    ),

    IF_ACTION_SUCCEEDED({
        actionResult: RESULT_OF("trash-step"),
        then: ACTION(DRAW_CARD({
            player: PLAYER,
            count: 2
        }))
    })
])
```

---

# 21. Action Result

Every action should produce a result.

```ts
ActionResult {
    actionId: ActionId

    attempted: boolean
    succeeded: boolean

    selectedObjects: ObjectId[]
    affectedObjects: ObjectId[]

    requestedAmount?: number
    completedAmount?: number

    previousZones?: Zone[]
    resultingZones?: Zone[]

    prevented: boolean
    replaced: boolean

    replacementEffectId?: EffectId

    generatedEvents: GameEventId[]
}
```

This powers:

```text
If you do
If that card was played
If a Character was K.O.'d by this effect
For each card returned this way
```

---

# 22. Atomic Actions

```ts
Action =
    CardAction
    | LifeAction
    | StateAction
    | DonAction
    | StatAction
    | InformationAction
    | EffectAction
    | PermissionAction
    | BattleAction
    | PlayerAction
    | RuleAction
```

---

## 22.1 Card Movement Actions

```ts
CardAction =
    DRAW_CARD
    | MOVE_CARD
    | PLAY_CARD
    | ACTIVATE_EVENT
    | TRASH_CARD
    | KO_CARD
    | RETURN_CARD
    | ADD_CARD_TO_HAND
    | PLACE_CARD_IN_DECK
    | REVEAL_CARD
    | LOOK_AT_CARDS
    | SELECT_CARD
    | REORDER_CARDS
    | SHUFFLE_ZONE
```

## Generic Movement

```ts
MOVE_CARD {
    selector: Selector

    from: Zone
    to: Zone

    placement?: {
        TOP
        | BOTTOM
        | TOP_OR_BOTTOM
        | ANY_POSITION
        | RANDOM
        | NOT_APPLICABLE
    }

    order?: {
        PRESERVE_ORDER
        | OWNER_CHOOSES
        | EFFECT_PLAYER_CHOOSES
        | RANDOM
    }

    face?: {
        FACE_UP
        | FACE_DOWN
        | PRESERVE
    }

    cause:
        DRAW
        | PLAY
        | KO
        | TRASH
        | RETURN
        | DAMAGE
        | COST
        | EFFECT
        | RULE
}
```

## Dedicated Semantic Actions

```ts
DRAW_CARD {
    player: PlayerReference
    count: ValueExpression
}
```

```ts
PLAY_CARD {
    selector: Selector

    destination:
        CHARACTER_AREA
        | STAGE_AREA

    controller: PlayerReference

    state:
        ACTIVE
        | RESTED

    triggerOnPlay:
        ENABLED
        | DISABLED

    costPolicy:
        PAY_NORMAL_COST
        | PLAY_WITHOUT_PAYING_COST
        | PAY_ALTERNATIVE_COST
}
```

```ts
KO_CARD {
    selector: Selector

    cause:
        EFFECT
        | BATTLE
        | COST
}
```

```ts
TRASH_CARD {
    selector: Selector

    cause:
        EFFECT
        | COST
        | RULE

    treatedAsKO: false
}
```

```ts
ADD_CARD_TO_HAND {
    selector: Selector

    from:
        DECK
        | TRASH
        | LIFE
        | CHARACTER_AREA
        | STAGE_AREA

    triggerPolicy:
        DO_NOT_CHECK_TRIGGER
}
```

```ts
RETURN_CARD {
    selector: Selector

    destination:
        HAND
        | DECK

    deckPlacement?:
        TOP
        | BOTTOM
        | TOP_OR_BOTTOM

    owner:
        CARD_OWNER
}
```

---

## 22.2 Search and Look Actions

`Search` is a composite operation, not one atomic action.

```ts
SEARCH {
    look: LOOK_AT_CARDS
    select: SELECT_CARD
    moveSelected: MOVE_CARD
    processRemainder: MOVE_CARD | REORDER_CARDS
}
```

Atomic form:

```ts
LOOK_AT_CARDS {
    player: PlayerReference

    zone:
        DECK
        LIFE
        HAND

    position:
        TOP
        BOTTOM
        ALL

    count: ValueExpression

    visibility:
        EFFECT_PLAYER_ONLY
        OWNER_ONLY
        BOTH_PLAYERS
}
```

```ts
SELECT_CARD {
    pool: ResultReference
    selector: Selector
}
```

```ts
REVEAL_CARD {
    selector: Selector
    viewers:
        BOTH_PLAYERS
        PLAYER
        OPPONENT
}
```

```ts
REORDER_CARDS {
    cards: ResultReference

    destination:
        TOP_OF_DECK
        BOTTOM_OF_DECK
        LIFE

    orderChooser:
        PLAYER
        OPPONENT
        OWNER
        RANDOM
}
```

Example:

```text
Look at 5 cards from the top of your deck;
reveal up to 1 {Straw Hat Crew} type card and add it to your hand.
Then, place the rest at the bottom of your deck in any order.
```

```ts
SEQUENCE([
    ACTION({
        id: "look",
        type: LOOK_AT_CARDS,
        zone: DECK,
        position: TOP,
        count: 5
    }),

    ACTION({
        id: "pick",
        type: SELECT_CARD,
        pool: RESULT_OF("look"),
        selector: {
            types: [HAS_TYPE("Straw Hat Crew")],
            quantity: UP_TO(1)
        }
    }),

    ACTION({
        type: ADD_CARD_TO_HAND,
        selector: RESULT_OF("pick")
    }),

    ACTION({
        type: REORDER_CARDS,
        cards: REMAINDER_OF("look", "pick"),
        destination: BOTTOM_OF_DECK,
        orderChooser: PLAYER
    })
])
```

---

## 22.3 Life Actions

```ts
LifeAction =
    ADD_CARD_TO_LIFE
    | TAKE_LIFE_TO_HAND
    | TRASH_LIFE
    | TAKE_DAMAGE
    | REVEAL_LIFE
    | LOOK_AT_LIFE
    | REORDER_LIFE
    | TURN_LIFE_FACE_UP
    | TURN_LIFE_FACE_DOWN
```

```ts
ADD_CARD_TO_LIFE {
    selector: Selector

    position:
        TOP
        BOTTOM

    face:
        FACE_UP
        FACE_DOWN
}
```

```ts
TAKE_LIFE_TO_HAND {
    player: PlayerReference

    position:
        TOP
        BOTTOM

    count: ValueExpression

    triggerPolicy:
        DO_NOT_CHECK_TRIGGER
}
```

```ts
TAKE_DAMAGE {
    targetPlayer: PlayerReference
    amount: ValueExpression

    lifeProcessing:
        CHECK_TRIGGER
        | BANISH
        | CUSTOM
}
```

```ts
TRASH_LIFE {
    player: PlayerReference

    position:
        TOP
        BOTTOM

    count: ValueExpression

    activateTrigger: false
}
```

---

## 22.4 Card State Actions

Do not use a toggle-style `ChangeState`.

```ts
StateAction =
    REST_CARD
    | SET_CARD_ACTIVE
    | TURN_CARD_FACE_UP
    | TURN_CARD_FACE_DOWN
```

```ts
REST_CARD {
    selector: Selector
}
```

```ts
SET_CARD_ACTIVE {
    selector: Selector
}
```

Incorrect:

```ts
CHANGE_STATE(card)
```

Correct:

```text
Rest        → REST_CARD
Set active  → SET_CARD_ACTIVE
```

---

## 22.5 DON!! Actions

```ts
DonAction =
    ADD_DON_FROM_DON_DECK
    | GIVE_DON
    | DETACH_DON
    | REST_DON
    | SET_DON_ACTIVE
    | RETURN_DON_TO_DON_DECK
    | MOVE_DON_TO_COST_AREA
```

```ts
DonState =
    IN_DON_DECK
    | ACTIVE
    | RESTED
    | ATTACHED
```

```ts
ADD_DON_FROM_DON_DECK {
    player: PlayerReference

    count: ValueExpression

    destination: COST_AREA

    state:
        ACTIVE
        | RESTED
}
```

```ts
GIVE_DON {
    donSelector: Selector

    target: Selector
}
```

```ts
DETACH_DON {
    sourceCard: Selector

    count: ValueExpression

    destination: COST_AREA

    state:
        RESTED
        | ACTIVE
}
```

```ts
RETURN_DON_TO_DON_DECK {
    selector: Selector
}
```

---

## 22.6 Stat Modification

```ts
StatAction =
    MODIFY_POWER
    | MODIFY_COST
    | MODIFY_COUNTER
    | MODIFY_LIFE_VALUE
    | MODIFY_DAMAGE
```

```ts
ModifyStatAction {
    selector: Selector

    stat:
        POWER
        | COST
        | COUNTER
        | LIFE_VALUE
        | DAMAGE

    propertyLayer:
        CURRENT_VALUE
        | BASE_VALUE
        | PRINTED_VALUE

    operation:
        ADD
        | SUBTRACT
        | SET
        | COPY
        | SET_TO_ZERO

    value: ValueExpression

    duration: Duration
}
```

Examples:

```ts
MODIFY_POWER({
    selector: THIS_CARD,
    operation: ADD,
    value: 2000,
    duration: THIS_TURN
})
```

```ts
MODIFY_COST({
    selector: OPPONENT_CHARACTER,
    operation: SUBTRACT,
    value: 3,
    duration: THIS_TURN
})
```

```ts
MODIFY_POWER({
    selector: THIS_CARD,
    propertyLayer: BASE_VALUE,
    operation: SET,
    value: 0,
    duration: THIS_TURN
})
```

---

## 22.7 Card Information Modification

```ts
InformationAction =
    MODIFY_NAME
    | MODIFY_COLOR
    | MODIFY_TYPE
    | MODIFY_ATTRIBUTE
    | MODIFY_BASE_EFFECT_STATUS
```

```ts
MODIFY_NAME {
    selector: Selector

    operation:
        ADD_NAME
        | REPLACE_NAMES
        | TREAT_AS_ADDITIONAL_NAME

    names: string[]

    duration: Duration
}
```

```ts
MODIFY_TYPE {
    selector: Selector

    operation:
        ADD_TYPE
        | REMOVE_TYPE
        | REPLACE_TYPES

    types: string[]

    duration: Duration
}
```

---

## 22.8 Effect Modification

```ts
EffectAction =
    GRANT_KEYWORD
    | REMOVE_KEYWORD
    | ADD_EFFECT
    | REMOVE_GAINED_EFFECT
    | INVALIDATE_EFFECTS
    | VALIDATE_EFFECTS
    | COPY_EFFECT
    | CREATE_DELAYED_EFFECT
    | CREATE_REPLACEMENT_EFFECT
```

```ts
GRANT_KEYWORD {
    selector: Selector
    keyword: KeywordEffect
    duration: Duration
}
```

```ts
REMOVE_KEYWORD {
    selector: Selector
    keyword: KeywordEffect
    duration: Duration
}
```

```ts
ADD_EFFECT {
    selector: Selector
    effect: EffectDefinition
    duration: Duration
}
```

```ts
INVALIDATE_EFFECTS {
    selector: Selector

    effectFilter:
        ALL_EFFECTS
        | AUTO_EFFECTS
        | ACTIVATE_EFFECTS
        | PERMANENT_EFFECTS
        | KEYWORD_EFFECTS
        | MATCHING_EFFECT

    duration: Duration
}
```

---

## 22.9 Permission and Prevention Actions

```ts
PermissionAction =
    PREVENT_ACTION
    | ALLOW_ACTION
    | PREVENT_SELECTION
    | PREVENT_ZONE_CHANGE
    | MODIFY_VALID_TARGETS
    | MODIFY_PLAY_PERMISSION
```

```ts
PreventableAction =
    DECLARE_ATTACK
    | ATTACK_LEADER
    | ATTACK_CHARACTER
    | ATTACK_ACTIVE_CHARACTER

    | ACTIVATE_BLOCKER
    | ACTIVATE_EFFECT

    | PLAY_CARD
    | ACTIVATE_EVENT

    | REST_CARD
    | SET_CARD_ACTIVE

    | KO_CARD
    | TRASH_CARD
    | RETURN_TO_HAND
    | RETURN_TO_DECK
    | REMOVE_FROM_FIELD

    | SELECT_AS_EFFECT_TARGET
    | DEAL_DAMAGE
```

```ts
PREVENT_ACTION {
    selector: Selector
    action: PreventableAction

    causeFilter?:
        EFFECT
        | BATTLE
        | RULE
        | OPPONENT_EFFECT
        | OWN_EFFECT
        | ANY

    duration: Duration
}
```

```ts
ALLOW_ACTION {
    selector: Selector
    action: PreventableAction
    duration: Duration
}
```

Examples:

```ts
// Cannot attack
PREVENT_ACTION({
    selector: THIS_CARD,
    action: DECLARE_ATTACK,
    duration: THIS_TURN
})
```

```ts
// Can also attack active Characters
ALLOW_ACTION({
    selector: THIS_CARD,
    action: ATTACK_ACTIVE_CHARACTER,
    duration: THIS_TURN
})
```

```ts
// Cannot be K.O.'d by effects
PREVENT_ACTION({
    selector: THIS_CARD,
    action: KO_CARD,
    causeFilter: EFFECT,
    duration: WHILE_SOURCE_VALID
})
```

```ts
// Cannot activate Blocker
PREVENT_ACTION({
    selector: OPPONENT_CARDS,
    action: ACTIVATE_BLOCKER,
    duration: THIS_BATTLE
})
```

---

## 22.10 Freeze

`Freeze` should remain a parser or UI alias, not a fundamental primitive.

```ts
FREEZE(selector, refreshOwner)
```

Normalizes to:

```ts
PREVENT_ACTION {
    selector: selector

    action: SET_CARD_ACTIVE

    causeFilter: REFRESH_PHASE

    duration: UNTIL_NEXT_REFRESH_PHASE(refreshOwner)
}
```

This is different from:

```text
Cannot be set as active by effects.
Cannot become active.
Cannot be set as active during the next Refresh Phase.
```

Each needs an appropriate cause filter and duration.

---

## 22.11 Battle Actions

```ts
BattleAction =
    DECLARE_ATTACK
    | CHANGE_ATTACK_TARGET
    | ACTIVATE_BLOCKER
    | CANCEL_ATTACK
    | END_BATTLE
    | DEAL_DAMAGE
    | SET_DAMAGE
    | MODIFY_DAMAGE
    | SKIP_BATTLE_STEP
```

```ts
DECLARE_ATTACK {
    attacker: Selector
    target: Selector
}
```

```ts
CHANGE_ATTACK_TARGET {
    newTarget: Selector
}
```

```ts
DEAL_DAMAGE {
    source: Selector
    targetPlayer: PlayerReference
    amount: ValueExpression
}
```

```ts
CANCEL_ATTACK {
    battle: CURRENT_BATTLE
}
```

---

## 22.12 Player and Rule Actions

```ts
PlayerAction =
    PLAYER_WINS
    | PLAYER_LOSES
    | OPPONENT_CHOOSES
    | PLAYER_CHOOSES
```

```ts
RuleAction =
    MODIFY_DEFEAT_CONDITION
    | MODIFY_VICTORY_CONDITION
    | MODIFY_DECK_CONSTRUCTION
    | MODIFY_STARTING_SETUP
    | MODIFY_AREA_CAPACITY
    | MODIFY_RULE_PERMISSION
```

---

# 23. Duration

```ts
Duration =
    INSTANT

    | THIS_BATTLE
    | THIS_TURN

    | UNTIL_END_OF_CURRENT_TURN

    | UNTIL_START_OF_NEXT_TURN(PlayerReference)
    | UNTIL_END_OF_NEXT_TURN(PlayerReference)

    | UNTIL_NEXT_REFRESH_PHASE(PlayerReference)
    | UNTIL_END_OF_NEXT_END_PHASE(PlayerReference)

    | WHILE_SOURCE_VALID
    | WHILE_SOURCE_IN_ZONE(Zone)
    | WHILE_SOURCE_STATE(CardStateValue)
    | WHILE_CONDITION(ConditionExpression)

    | UNTIL_EVENT(EventPattern)

    | PERMANENT
```

Examples:

```ts
THIS_BATTLE
```

```ts
UNTIL_END_OF_NEXT_TURN(OPPONENT)
```

```ts
UNTIL_NEXT_REFRESH_PHASE(OPPONENT)
```

```ts
WHILE_SOURCE_STATE(RESTED)
```

`ThisCardState(Active | Rested)` is not a duration itself. It becomes:

```ts
WHILE_CONDITION(
    SOURCE_STATE_IS(RESTED)
)
```

---

# 24. Selector

```ts
Selector {
    subject:
        CARD
        | DON
        | PLAYER
        | EFFECT
        | EVENT
        | ACTION_RESULT

    owner?:
        PLAYER
        | OPPONENT
        | ANY

    controller?:
        PLAYER
        | OPPONENT
        | ANY

    zones?: Zone[]

    cardCategories?: CardCategory[]

    names?: NameFilter[]

    cardNumbers?: string[]

    colors?: ColorFilter

    types?: TypeFilter

    attributes?: AttributeFilter

    cost?: NumericPropertyFilter
    power?: NumericPropertyFilter
    counter?: NumericPropertyFilter
    life?: NumericPropertyFilter

    states?: CardStateValue[]

    face?: FaceState[]

    keywords?: KeywordFilter

    effects?: EffectFilter

    baseEffectStatus?:
        ANY
        | HAS_BASE_EFFECT
        | NO_BASE_EFFECT

    relations?: RelationFilter[]

    history?: HistoryFilter[]

    quantity: Quantity

    chooser:
        EFFECT_OWNER
        | OPPONENT
        | CARD_OWNER
        | CARD_CONTROLLER
        | RANDOM

    distinctBy?:
        NONE
        | CARD_OBJECT
        | CARD_NUMBER
        | CARD_NAME

    ordering?: OrderingRule
}
```

---

## 24.1 Card Categories

```ts
CardCategory =
    LEADER
    | CHARACTER
    | EVENT
    | STAGE
    | DON
```

---

## 24.2 Name Filters

```ts
NameFilter =
    NAME_EXACT(string)
    | NAME_CONTAINS(string)
    | NAME_STARTS_WITH(string)
    | NAME_NOT(string)
    | NAME_EQUALS_REFERENCE(ObjectReference)
```

---

## 24.3 Color Filters

```ts
ColorFilter =
    HAS_COLOR(Color)
    | HAS_ANY_COLOR(Color[])
    | HAS_ALL_COLORS(Color[])
    | ONLY_COLORS(Color[])
    | DOES_NOT_HAVE_COLOR(Color)
```

```ts
Color =
    RED
    | GREEN
    | BLUE
    | PURPLE
    | BLACK
    | YELLOW
```

---

## 24.4 Type Filters

```ts
TypeFilter =
    HAS_TYPE(string)
    | TYPE_INCLUDES_TEXT(string)
    | HAS_ANY_TYPE(string[])
    | HAS_ALL_TYPES(string[])
    | DOES_NOT_HAVE_TYPE(string)
```

This supports both:

```text
a {Straw Hat Crew} type card
a card with a type including "CP"
```

---

## 24.5 Attributes

```ts
Attribute =
    SLASH
    | STRIKE
    | RANGED
    | SPECIAL
    | WISDOM
```

```ts
AttributeFilter =
    HAS_ATTRIBUTE(Attribute)
    | HAS_ANY_ATTRIBUTE(Attribute[])
    | HAS_ALL_ATTRIBUTES(Attribute[])
    | DOES_NOT_HAVE_ATTRIBUTE(Attribute)
```

---

## 24.6 Numeric Properties

```ts
NumericPropertyFilter {
    propertyLayer:
        PRINTED
        | BASE
        | CURRENT

    comparison:
        EQUAL
        | NOT_EQUAL
        | AT_LEAST
        | AT_MOST
        | GREATER_THAN
        | LESS_THAN
        | BETWEEN

    value?: ValueExpression

    minimum?: ValueExpression
    maximum?: ValueExpression
}
```

Examples:

```ts
cost: {
    propertyLayer: BASE,
    comparison: AT_MOST,
    value: 5
}
```

```ts
power: {
    propertyLayer: CURRENT,
    comparison: AT_LEAST,
    value: 7000
}
```

---

## 24.7 Card State

```ts
CardStateValue =
    ACTIVE
    | RESTED
    | ATTACKING
    | BLOCKING
    | PLAYED_THIS_TURN
```

DON state should use the separate `DonState` enum.

---

## 24.8 Effect Filter

```ts
EffectFilter =
    HAS_KEYWORD(KeywordEffect)
    | DOES_NOT_HAVE_KEYWORD(KeywordEffect)

    | HAS_TIMING(StandardTiming)
    | DOES_NOT_HAVE_TIMING(StandardTiming)

    | HAS_EFFECT_CATEGORY(EffectCategory)

    | HAS_BASE_EFFECT
    | HAS_NO_BASE_EFFECT

    | EFFECT_TEXT_MATCHES(string)
```

---

## 24.9 Relations

```ts
RelationFilter =
    THIS_CARD
    | OTHER_THAN_THIS_CARD

    | THIS_LEADER
    | THIS_CHARACTER
    | THIS_STAGE

    | ATTACKING_CARD
    | ORIGINAL_ATTACK_TARGET
    | CURRENT_ATTACK_TARGET
    | BLOCKING_CARD

    | EFFECT_SOURCE
    | EFFECT_OWNER_LEADER

    | SELECTED_BY(ResultReference)
    | PLAYED_BY(ResultReference)
    | KOD_BY(ResultReference)
    | TRASHED_BY(ResultReference)
    | RETURNED_BY(ResultReference)

    | CARD_THAT_TRIGGERED_THIS_EFFECT

    | SAME_NAME_AS(ObjectReference)
    | DIFFERENT_NAME_FROM(ObjectReference)

    | ATTACHED_TO(ObjectReference)
    | HAS_ATTACHED_DON

    | CONTROLLED_BY_SAME_PLAYER_AS(ObjectReference)
    | OWNED_BY_SAME_PLAYER_AS(ObjectReference)
```

---

## 24.10 History Filters

```ts
HistoryFilter =
    PLAYED_THIS_TURN
    | PLAYED_BY_EFFECT
    | ATTACKED_THIS_TURN
    | BECAME_RESTED_THIS_TURN
    | KOD_THIS_TURN
    | RETURNED_TO_HAND_THIS_TURN
    | SELECTED_PREVIOUSLY
```

---

## 24.11 Quantity

```ts
Quantity =
    EXACTLY(ValueExpression)
    | UP_TO(ValueExpression)
    | AT_LEAST(ValueExpression)
    | ALL
    | ANY_NUMBER
```

```text
"1 card"       → EXACTLY(1)
"up to 1"      → UP_TO(1)
"all"          → ALL
"any number"   → ANY_NUMBER
```

---

## 24.12 Ordering

```ts
OrderingRule =
    FIELD_ORDER
    | DECK_ORDER
    | PLAYER_CHOOSES_ORDER
    | OWNER_CHOOSES_ORDER
    | OPPONENT_CHOOSES_ORDER
    | RANDOM_ORDER
```

---

# 25. Composite Selectors

```ts
CompositeSelector =
    SELECTOR(Selector)

    | AND(CompositeSelector[])
    | OR(CompositeSelector[])
    | NOT(CompositeSelector)

    | UNION(CompositeSelector[])
    | INTERSECTION(CompositeSelector[])
    | EXCLUDE(
        source: CompositeSelector,
        excluded: CompositeSelector
    )
```

Example:

```text
Up to 1 of your opponent's rested Characters
with a base cost of 5 or less
other than [Monkey.D.Luffy].
```

```ts
{
    subject: CARD,

    controller: OPPONENT,

    zones: [CHARACTER_AREA],

    cardCategories: [CHARACTER],

    states: [RESTED],

    cost: {
        propertyLayer: BASE,
        comparison: AT_MOST,
        value: 5
    },

    names: [
        NAME_NOT("Monkey.D.Luffy")
    ],

    quantity: UP_TO(1),

    chooser: EFFECT_OWNER
}
```

---

# 26. Modifier Structure

```ts
ModifierExpression =
    STAT_MODIFIER
    | PROPERTY_MODIFIER
    | EFFECT_MODIFIER
    | PERMISSION_MODIFIER
    | RULE_MODIFIER
```

```ts
ModifierInstance {
    id: ModifierId

    sourceEffectId: EffectId
    sourceObjectId?: CardObjectId

    target: Selector

    modifier: ModifierExpression

    duration: Duration

    createdAt: GameEventId

    layer:
        RULE
        | PRINTED_INFORMATION
        | BASE_INFORMATION
        | CURRENT_INFORMATION
        | POWER
        | COST
        | EFFECT
        | PERMISSION
        | REPLACEMENT

    priority?: number
}
```

---

# 27. Event Structure

```ts
GameEvent {
    id: GameEventId

    type: GameEventType

    actor?: PlayerId

    sourceObject?: ObjectId
    subjectObjects: ObjectId[]

    sourceEffect?: EffectId

    cause: EventCause

    fromZone?: Zone
    toZone?: Zone

    amount?: number

    parentEvent?: GameEventId

    replacedBy?: EffectId
    preventedBy?: EffectId

    timestamp: ResolutionTimestamp
}
```

---

# 28. Runtime Effect Instance

```ts
EffectInstance {
    instanceId: EffectInstanceId

    definition: EffectDefinition

    sourceSnapshot: EffectSourceSnapshot

    controller: PlayerId

    activationEvent?: GameEventId

    status:
        PENDING
        ACTIVATING
        PAYING_COST
        RESOLVING
        RESOLVED
        CANCELLED
        INVALID

    selectedObjects: Map<SelectionId, ObjectId[]>

    actionResults: Map<ActionId, ActionResult>

    createdModifiers: ModifierId[]

    createdDelayedEffects: EffectInstanceId[]
}
```

---

# 29. Important Engine Aliases

These may remain parser conveniences but should normalize into lower-level primitives.

```text
Change State
    Not valid as an atomic primitive.

    Normalize into:
        REST_CARD
        SET_CARD_ACTIVE
```

```text
Freeze
    Normalize into:
        PREVENT_ACTION(SET_CARD_ACTIVE, REFRESH_PHASE, duration)
```

```text
Search
    Normalize into:
        LOOK
        SELECT
        REVEAL
        MOVE
        PROCESS_REMAINDER
```

```text
Add card to hand
    Normalize into:
        MOVE_CARD(..., cause = EFFECT)

    Does not automatically process Trigger.
```

```text
Take damage
    Normalize into:
        DAMAGE_PROCESSING
        CHECK_TRIGGER
        ADD_TO_HAND or TRASH through Banish
```

```text
Give DON!!
    Normalize into:
        MOVE_DON(COST_AREA → ATTACHED_DON)
```

```text
Passive
    Normalize into:
        PERMANENT
```

```text
Under the rules of this game
    Normalize into:
        PERMANENT + RuleModifier
```

---

# 30. Final Top-Level Taxonomy

```text
EFFECT
├── Source
├── Category
│   ├── Auto
│   ├── Activate
│   ├── Permanent
│   └── Replacement
├── Application Mode
│   ├── One-Shot
│   ├── Continuous
│   └── Delayed
├── Activation Zone
├── Timing
├── Conditions
├── Usage Limit
├── Optionality
├── Activation Cost
├── Resolution
│   ├── Action
│   ├── Sequence / Then
│   ├── Optional / May
│   ├── Conditional / If
│   ├── Result Dependency / If You Do
│   ├── Alternative / Otherwise
│   ├── Choice
│   ├── Loop / For Each
│   ├── Replacement / Instead
│   └── Delayed Resolution
├── Duration
└── Rule Modifier

ACTION
├── Draw
├── Look
├── Reveal
├── Select
├── Move
├── Play
├── Activate Event
├── Trash
├── K.O.
├── Return
├── Life Manipulation
├── Rest
├── Set Active
├── DON!! Manipulation
├── Stat Modification
├── Card Information Modification
├── Effect Modification
├── Permission / Prevention
├── Battle Manipulation
├── Damage
├── Player Result
└── Rule Modification

SELECTOR
├── Subject
├── Owner
├── Controller
├── Zone
├── Card Category
├── Name
├── Card Number
├── Color
├── Type
├── Attribute
├── Cost
├── Power
├── Counter
├── Life
├── State
├── Keyword
├── Effect
├── Base Effect Status
├── Relation
├── History
├── Quantity
├── Chooser
├── Distinctness
└── Ordering
```

---

# 31. Main Corrections to the Original Structure

```text
Passive
    → Permanent

Rule Modifier
    → Permanent + RuleModifier metadata

Rush: Character
    → Added as a separate keyword effect

Trigger
    → Keyword effect and activation context

Activate: Main
    → Manual activation timing

Main
    → Event activation timing

Counter
    → Event activation timing

Your Turn / Opponent's Turn
    → Conditions

DON!! xN
    → Attached-DON condition

DON!! −N
    → Activation requirement/payment

Once Per Turn
    → Usage limit

Then
    → Unconditional sequence

If you do
    → Action-result-dependent branch

Instead
    → Replacement effect

Change State
    → Split into Rest and Set Active

Freeze
    → Prevent Set Active during a specific Refresh Phase

K.O.
    → Distinct from generic Trash

Draw
    → Distinct semantic movement event

Play
    → Distinct semantic movement event that can trigger On Play

Take damage
    → Distinct damage-processing operation that checks Trigger

Life to hand by effect
    → Movement without Trigger processing

Base Life
    → Split into Printed Life, Starting Life, and Current Life

Base Cost / Power
    → Separate from Current Cost / Power

Card identity
    → Changes when a Character or Stage changes areas

Effect resolution
    → Stores action results for "if you do", "this way", and similar references
```
