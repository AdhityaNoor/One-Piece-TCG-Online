/**
 * Effect IR: the curated runtime representation for card effects.
 *
 * A card's behavior is data, not code: reviewed templates in /src/cards build
 * EffectProgram objects, and one engine interpreter executes them for every
 * card. Raw API/scraped text is reference text only, never executable logic.
 * Everything here is JSON-serializable.
 *
 * The op vocabulary is the interpreter's instruction set; it maps 1:1 onto the
 * EffectContext primitives. Grow the vocabulary (new ops) rather than adding
 * bespoke card logic.
 */
import type { ContinuousEffectDuration, ContinuousKeyword, ContinuousPowerCondition, KoImmunityAuraGroup, KoReplacementAction, KoReplacementAuraGroup, PowerAuraGroup, PowerScale, SourceStateCondition } from '../state/game';
import type { Attribute, CardCategory, Color } from '../state/card';

export type RemovedFromFieldDestination = 'hand' | 'deck' | 'trash' | 'life';

/** Resolves to a set of CardInstance ids at run time. Pure data. */
export type Selector =
  | { sel: 'self' } // the source card
  | { sel: 'eventPlayedCharacter' } // the Character instance from the current played-character event
  | { sel: 'controllerLeader' }
  | { sel: 'controllerActiveLeader' }
  | ({ sel: 'controllerCharacters' } & CharacterMoveFilter)
  | { sel: 'controllerLeaderOrCharacters'; minCost?: number; maxCost?: number; exactCost?: number; typeIncludes?: string; anyOfTypes?: string[]; name?: string; excludeSelf?: boolean; excludeCardNames?: string[]; minPower?: number; maxPower?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; color?: Color; typeFilterCharactersOnly?: boolean }
  | { sel: 'opponentLeader'; rested?: boolean }
  | { sel: 'controllerLeaderOrStage'; typeIncludes?: string; name?: string } // controller's Leader + Stage cards (for 'rest 1 of your {X} Leader or Stage' costs)
  | { sel: 'opponentLeaderOrCharacters'; minCost?: number; maxCost?: number; exactCost?: number; minPower?: number; maxPower?: number; maxBaseCost?: number; minBaseCost?: number; exactBaseCost?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; maxCostFromOpponentLife?: boolean; maxCostFromCombinedLife?: boolean; maxCostFromSelfLife?: boolean; maxCostFromOpponentDon?: boolean; maxCostFromSelfDon?: boolean; excludeName?: string; excludeCardNames?: string[]; restedLeader?: boolean }
  | { sel: 'controllerRestedDon' } // the controller's own rested, un-attached DON!! in the cost area
  | { sel: 'controllerActiveDon' } // the controller's active, un-attached DON!! in the cost area (rest targets)
  | { sel: 'controllerFieldDon' } // the controller's DON!! on field (cost area + attached)
  | { sel: 'opponentFieldDon' } // opponent's DON!! on field (cost area + attached), for opponent-chosen returns
  | { sel: 'opponentActiveDon' } // the opponent's active, un-attached DON!! in the cost area (rest targets)
  | { sel: 'opponentRestedDon' } // the opponent's rested, un-attached DON!! in the cost area
  | { sel: 'opponentUnattachedDon' } // the opponent's un-attached DON!! in the cost area, any orientation
  | { sel: 'ownerLeaderOrCharactersOfVar'; varName: string } // Leader + Characters of the owner of the first id in `varName`
  | { sel: 'battleOpponent'; maxCost?: number } // the opponent Character the source is currently battling (in currentBattle), if still in play
  | { sel: 'controllerLifeTop' } // the top card of the controller's own Life (for "add 1 from the top of your Life")
  | { sel: 'controllerLifeTopN'; count: number } // the top N cards of the controller's own Life, in Life order
  | { sel: 'opponentLifeTop' } // the top card of the opponent's Life
  | { sel: 'controllerLifeTopBottom' } // top and bottom Life cards, de-duplicated for 1-card Life
  | { sel: 'controllerOrOpponentLifeTop' } // top Life card from either player, de-duplicated only by absent zones
  | { sel: 'controllerDeckTop' }
  | { sel: 'allCharacters'; minCost?: number; maxCost?: number; minPower?: number; maxPower?: number; maxBaseCost?: number; minBaseCost?: number; exactBaseCost?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; rested?: boolean; excludeSelf?: boolean; excludeCardNames?: string[] } // any player's Characters
  | { sel: 'opponentCharacters'; minCost?: number; maxCost?: number; exactCost?: number; minPower?: number; maxPower?: number; maxBaseCost?: number; minBaseCost?: number; exactBaseCost?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; rested?: boolean; hasBlocker?: boolean; hasTrigger?: boolean; minDonAttached?: number; maxCostFromOpponentLife?: boolean; maxCostFromCombinedLife?: boolean; maxCostFromSelfLife?: boolean; maxCostFromOpponentDon?: boolean; maxCostFromSelfDon?: boolean; noBaseEffect?: boolean; excludeName?: string; excludeCardNames?: string[]; attribute?: Attribute } // optional cost/power (current) + base cost/power + rested/blocker/trigger/given-DON!!/attribute filters
  | { sel: 'controllerAttachedDon' } // DON!! instance ids currently given to the controller's Leader/Characters/Stages
  | { sel: 'controllerHand'; filter?: SearchFilter; excludeSelf?: boolean } // controller's hand cards matching a filter (for play-from-hand); excludeSelf matters when the source card itself is sitting in hand at resolution time (e.g. a Life [Trigger] "trash 1 -> play this" ability — the source shouldn't be a legal cost for its own "play this" clause)
  | { sel: 'opponentHand'; filter?: SearchFilter } // opponent's hand cards, optionally filtered for effects where the opponent chooses/trashes/plays
  | { sel: 'controllerTrash'; filter?: SearchFilter } // controller's trash cards matching a filter (for recover-to-hand)
  | { sel: 'opponentTrash'; filter?: SearchFilter } // opponent's trash cards matching a filter
  | { sel: 'controllerDeck'; filter?: SearchFilter } // controller's deck cards matching a filter (for play-from-deck)
  | { sel: 'allStages'; rested?: boolean } // any player's Stage in the stage area
  | { sel: 'controllerStages'; maxCost?: number; exactCost?: number; rested?: boolean } // controller's Stage in the stage area
  | { sel: 'controllerActiveStages'; maxCost?: number; exactCost?: number } // active controller Stages in the stage area
  | { sel: 'opponentStages'; maxCost?: number; exactCost?: number; rested?: boolean } // opponent's Stage in the stage area
  | { sel: 'var'; name: string } // ids bound by a prior chooseTargets op
  // Order-preserving union of member selectors, de-duplicated. Lets "X or Y" targets
  // (e.g. "opponent's DON!! or Characters cost ≤3") compose already-filtered primitives
  // instead of introducing a bespoke combined selector per pairing.
  | { sel: 'union'; members: Selector[] };

export type IrCondition = ContinuousPowerCondition; // { donAttachedAtLeast?, turn? }
export type IrDuration = ContinuousEffectDuration;

/**
 * Predicate for the "searcher" pattern (look at top N, add a matching card to
 * hand). All present fields are ANDed against the looked-at card's definition.
 * Pure data — the interpreter evaluates it against CardDefinitions via defs.
 */
export interface SearchFilter {
  /** OR branch: a card matches when it satisfies any child filter, plus any sibling gates on this filter. */
  anyOf?: readonly SearchFilter[];
  /** A free-text tribal type the card must carry (2-4), e.g. "Straw Hat Crew". */
  typeIncludes?: string;
  /** "other than [SelfName]" — exclude cards sharing the source card's name. */
  excludeSelfName?: boolean;
  /** Exclude cards with any of these exact printed names ("other than [X]"). */
  excludeCardNames?: string[];
  /** Card category gate (2-2), e.g. "reveal up to 1 Character card". */
  category?: Exclude<CardCategory, 'don'>;
  /** Card color gate (2-3), e.g. "red Event". */
  color?: Color;
  /** Leader/Character attribute gate (2-5), e.g. "<Slash> attribute card". */
  attribute?: Attribute;
  /** Exact card name (2-1), e.g. "play up to 1 [Gaimon]". */
  name?: string;
  maxCost?: number;
  /** Resolve maxCost as the controller's current Life count at selection time. */
  maxCostFromSelfLife?: boolean;
  /** Resolve maxCost as the opponent's current Life count at selection time. */
  maxCostFromOpponentLife?: boolean;
  /** Resolve maxCost as both players' combined Life count at selection time. */
  maxCostFromCombinedLife?: boolean;
  /** Resolve maxCost as the controller's DON!! cards on field at selection time. */
  maxCostFromSelfDon?: boolean;
  /** Resolve maxCost as the opponent's DON!! cards on field at selection time. */
  maxCostFromOpponentDon?: boolean;
  minCost?: number;
  /** Exact cost (2-7), e.g. "with a cost of 6" (no "or less"). */
  exactCost?: number;
  maxPower?: number;
  minPower?: number;
  exactPower?: number;
  maxBasePower?: number;
  minBasePower?: number;
  exactBasePower?: number;
  /** [Trigger] presence gate (2-11): the card must (true) or must not (false) carry a [Trigger]. */
  hasTrigger?: boolean;
  /** Vanilla / no base effect (2-8-5): no effect text other than static keywords, and no [Trigger]. */
  noBaseEffect?: boolean;
  /** After a prior moveCards in the same sequence, exclude hand cards sharing any color with the moved card(s). */
  excludeColorsOfPreviousMove?: boolean;
}

/** Filters for moveCards when the source zone is the character field. */
export interface CharacterMoveFilter {
  minCost?: number;
  maxCost?: number;
  exactCost?: number;
  maxPower?: number;
  minPower?: number;
  maxBaseCost?: number;
  minBaseCost?: number;
  exactBaseCost?: number;
  maxBasePower?: number;
  minBasePower?: number;
  exactBasePower?: number;
  rested?: boolean;
  typeIncludes?: string;
  anyOfTypes?: string[];
  minDonAttached?: number;
  maxCostFromSelfLife?: boolean;
  maxCostFromOpponentLife?: boolean;
  maxCostFromCombinedLife?: boolean;
  maxCostFromSelfDon?: boolean;
  maxCostFromOpponentDon?: boolean;
  noBaseEffect?: boolean;
  hasTrigger?: boolean;
  color?: Color;
  name?: string;
  /** Leader/Character attribute gate (2-5), e.g. "<Slash> attribute Character". */
  attribute?: Attribute;
  /** Exclude the source card instance (other than this Character). */
  excludeSelf?: boolean;
  /** Exclude cards sharing the source card's printed name. */
  excludeSelfName?: boolean;
  /** Exclude cards with any of these exact printed names ("other than [X]"). */
  excludeCardNames?: string[];
}

export type SearchRemainderDestination = 'bottom' | 'trash' | 'deckTopOrBottom';
export type SearchPickDestination = 'hand' | 'lifeTop' | 'deckTopOrBottom' | 'play';
export type SequenceCondition = 'previousSelectedAny' | 'previousMovedAny' | 'previousRevealMatched';

export interface EffectOpSequenceGate {
  /**
   * Optional sequencing gate for text like "If you do" after an optional
   * function. Plain "Then" does not use this; choosing 0 for an "up to" effect
   * still counts as resolving the prior function.
   */
  ifPrevious?: SequenceCondition;
  /** Gate on any instance moved by the immediately previous op having printed cost >= N. */
  ifPreviousMovedAnyCostAtLeast?: number;
  /** Optional board-state gate checked at this exact sequence point. */
  ifGate?: AbilityGate[];
}

/**
 * One instruction. `chooseTargets`, `searchTopDeck`, and `searchDeck` suspend the program
 * via a PendingChoice; `chooseTargets` binds the player's selection to `var`
 * (later ops reference it via { sel: 'var', name }), while `searchTopDeck`
 * resolves its own deck movement on resume.
 */
export type EffectOp =
  | ({ op: 'draw'; amount: number; player?: 'controller' | 'opponent' } & EffectOpSequenceGate)
  | ({ op: 'drawUntilHandCount'; targetCount: number; player?: 'controller' | 'opponent' } & EffectOpSequenceGate)
  | ({ op: 'addPower'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition; scale?: PowerScale; amountPerVar?: string; amountPer?: number; amountPerStep?: number } & EffectOpSequenceGate)
  // Register an "aura"/anthem power modifier over a dynamic target group (e.g. "your
  // {Supernovas} Leaders and Characters gain +1000"), optionally gated on source state.
  | ({ op: 'addPowerAura'; group: PowerAuraGroup; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition; scale?: PowerScale } & EffectOpSequenceGate)
  // Register a "base power becomes N" aura over a dynamic target group (e.g. "[Opponent's Turn]
  // all of your [Shura] cards' base power become 6000"), optionally gated on source state.
  | ({ op: 'setBasePowerAura'; group: PowerAuraGroup; value: number; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition } & EffectOpSequenceGate)
  | ({ op: 'addCost'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition; scale?: PowerScale } & EffectOpSequenceGate)
  // Register a continuous cost "aura" over a dynamic target group (e.g. "all of your {Navy}
  // Characters gain +2 cost", "give all of your opponent's Characters −1 cost").
  | ({ op: 'addCostAura'; group: PowerAuraGroup; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition; scale?: PowerScale; usesRemaining?: number } & EffectOpSequenceGate)
  | ({ op: 'setBasePower'; target: Selector; value: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate) // "base power BECOMES N" (2-6): overwrite base; additive modifiers still stack on top
  | ({ op: 'setBasePowerFromLeader'; target: Selector; duration: IrDuration; condition?: IrCondition; sourceCondition?: SourceStateCondition } & EffectOpSequenceGate) // "base power becomes the same as your Leader's base power"
  | ({ op: 'setBasePowerFromSource'; target: Selector; source: Selector; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate) // "base power becomes the same as [source]'s current power"
  | ({ op: 'setBaseCost'; target: Selector; value: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate) // "base cost BECOMES N" (2-7): overwrite base cost
  | ({ op: 'addKeyword'; target: Selector; keyword: ContinuousKeyword; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate)
  // Register a continuous keyword grant over a dynamic target group (e.g. "all of your [Shura]
  // cards gain [Unblockable]"), optionally gated on source state.
  | ({ op: 'addKeywordAura'; group: PowerAuraGroup; keyword: ContinuousKeyword; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition } & EffectOpSequenceGate)
  // Grant "cannot be K.O.'d" to the target. scope 'battle' = battle K.O. only (7-1-4-2); 'any' = any source.
  // `attackerCategory` optionally restricts a battle immunity to a given attacker category ("by Leaders").
  | ({ op: 'addKoImmunity'; target: Selector; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; attackerCategory?: 'leader' | 'character'; attackerAttribute?: string; effectSourceController?: 'opponent' | 'controller'; effectSourceMaxBasePower?: number; effectSourceCategory?: 'leader' | 'character'; effectSourceWithoutAttribute?: string } & EffectOpSequenceGate)
  | ({ op: 'addKoImmunityAura'; group: KoImmunityAuraGroup; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; sourceCondition?: SourceStateCondition; effectSourceController?: 'opponent' | 'controller'; effectSourceMaxBasePower?: number; effectSourceCategory?: 'leader' | 'character'; effectSourceWithoutAttribute?: string } & EffectOpSequenceGate)
  // Register optional K.O. replacement on enter play ("would be K.O.'d … instead").
  | ({ op: 'registerKoReplacement'; appliesTo: 'self' | 'aura'; appliesToInstanceId?: string; group?: KoReplacementAuraGroup; scope: 'battle' | 'effect' | 'any'; oncePerTurn?: boolean; action: KoReplacementAction; condition?: IrCondition; sourceCondition?: SourceStateCondition; replacementTriggers?: import('../state/game').KoReplacementTrigger[]; effectSourceController?: 'opponent' | 'controller'; effectSourceCategory?: 'leader' | 'character'; activationGate?: AbilityGate[]; duration: IrDuration } & EffectOpSequenceGate)
  | ({ op: 'registerRestReplacement'; appliesToInstanceId?: string; oncePerTurn?: boolean; action: { kind: 'restCharacter'; count: number }; sourceCondition?: SourceStateCondition; effectSourceController?: 'opponent' | 'controller'; effectSourceCategory?: 'leader' | 'character'; duration: IrDuration } & EffectOpSequenceGate)
  | ({ op: 'preventBlockers'; target: Selector; duration: IrDuration; blockerPowerAtLeast?: number; blockerPowerAtMost?: number; blockerMaxCost?: number } & EffectOpSequenceGate)
  | ({ op: 'suppressBlockerActivation'; target: Selector; duration: IrDuration } & EffectOpSequenceGate)
  // Prevent the target Leader/Character from declaring an attack (7-1-1-1) while active.
  | ({ op: 'preventAttack'; target: Selector; duration: IrDuration; forbiddenTarget?: 'leader'; forbiddenTargetFilter?: import('../state/game').ForbiddenAttackTargetFilter; whileSummoningSick?: boolean; attackUnlessGate?: AbilityGate[]; condition?: IrCondition } & EffectOpSequenceGate)
  // Prevent all of a player's Leaders/Characters from attacking (optionally only barring Leader targets).
  | ({ op: 'preventAttackController'; player: 'controller' | 'opponent'; duration: IrDuration; forbiddenTarget?: 'leader' } & EffectOpSequenceGate)
  // While active, the opponent may only attack this Character (taunt).
  | ({ op: 'setForcedAttackTarget'; target: Selector; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition } & EffectOpSequenceGate)
  // During an in-progress battle, retarget the current attack onto a chosen defender (7-1-2-1-style redirect, not taunt).
  | ({ op: 'redirectAttackTarget'; target: Selector } & EffectOpSequenceGate)
  // Crosswise swap printed base power between exactly two prior chooseTargets selections.
  | ({ op: 'swapBasePower'; var: string; duration: IrDuration; mustIncludeControllerLeader?: boolean } & EffectOpSequenceGate)
  // Prevent effect-driven rest on the target Leader/Character for the duration.
  | ({ op: 'preventRest'; target: Selector; duration: IrDuration; effectSourceController?: 'opponent' | 'controller'; condition?: IrCondition } & EffectOpSequenceGate)
  // Prevent the target Character/Stage from being removed from the field (effect K.O., return to
  // hand, or bottom-of-deck) for the duration. Never blocks battle K.O.
  | ({ op: 'preventFieldRemoval'; target: Selector; duration: IrDuration; effectSourceController?: 'opponent' | 'controller'; condition?: IrCondition } & EffectOpSequenceGate)
  // Prevent matching cards in a dynamic aura group from being removed from the field.
  | ({ op: 'preventFieldRemovalAura'; group: PowerAuraGroup; duration: IrDuration; effectSourceController?: 'opponent' | 'controller'; condition?: IrCondition } & EffectOpSequenceGate)
  // Negate all (or selected timings of) abilities on the target Leader/Character/Stage.
  | ({ op: 'negateEffect'; target: Selector; duration: IrDuration; negatedTimings?: IrTiming[] } & EffectOpSequenceGate)
  // Negate abilities on all cards controlled by a player (e.g. "your [On Play] effects are negated").
  | ({ op: 'negateControllerEffects'; player: 'controller' | 'opponent'; duration: IrDuration; negatedTimings?: IrTiming[]; appliesToCategories?: Exclude<CardCategory, 'don'>[]; exceptTypeIncludes?: string } & EffectOpSequenceGate)
  // "You cannot add Life cards to your hand using your own effects" for the controller.
  | ({ op: 'preventControllerLifeToHand'; player: 'controller' | 'opponent'; duration: IrDuration } & EffectOpSequenceGate)
  // "You cannot play Character cards [matching filter] this turn" for the controller.
  | ({ op: 'preventControllerCharacterPlay'; player?: 'controller' | 'opponent'; duration: IrDuration; minBaseCost?: number; maxBaseCost?: number } & EffectOpSequenceGate)
  | ({ op: 'preventControllerHandPlay'; player?: 'controller' | 'opponent'; duration: IrDuration } & EffectOpSequenceGate)
  | ({ op: 'preventControllerCharacterSetActiveDon'; player?: 'controller' | 'opponent'; duration: IrDuration } & EffectOpSequenceGate)
  | ({ op: 'giveDon'; target: Selector; count: number } & EffectOpSequenceGate)
  // Reassign up to N DON!! cards already given on the controller's field onto a chosen Character.
  | ({ op: 'giveGivenDon'; donTarget: Selector; characterTarget: Selector } & EffectOpSequenceGate)
  // Attach DON!! from a player's cost area (controller, opponent, or owner of a prior chosen card).
  | ({ op: 'giveDonFromCostArea'; target: Selector; count: number; donOwner: 'controller' | 'opponent' | { fromVar: string }; restedOnly?: boolean; activeOnly?: boolean } & EffectOpSequenceGate)
  | ({ op: 'ko'; target: Selector } & EffectOpSequenceGate)
  | ({ op: 'rest'; target: Selector } & EffectOpSequenceGate)
  | ({ op: 'setActive'; target: Selector } & EffectOpSequenceGate) // set a card as active — the inverse of `rest` (2-4-3 active/rested). Works on Leader/Character (orientation) and DON!! (donRested).
  | ({ op: 'scheduleSetActiveControllerDonAtEndOfTurn'; maxTargets: number } & EffectOpSequenceGate)
  | ({ op: 'scheduleRestOpponentDonAtStartOfNextMain'; maxTargets: number } & EffectOpSequenceGate)
  | ({ op: 'scheduleTrashSourceAtEndOfTurn' } & EffectOpSequenceGate)
  | ({ op: 'scheduleMoveSourceToBottomDeckAtEndOfBattle' } & EffectOpSequenceGate)
  | ({ op: 'scheduleMoveInstanceToBottomDeckAtEndOfBattle'; fromVar?: string; index?: number } & EffectOpSequenceGate)
  | ({ op: 'scheduleMoveInstanceToBottomDeckAtEndOfTurn'; fromVar?: string; index?: number } & EffectOpSequenceGate)
  | ({ op: 'scheduleTrashControllerCharacterAtEndOfTurn'; typeIncludes?: string } & EffectOpSequenceGate)
  | ({ op: 'scheduleReturnDonToMatchOpponentAtEndOfTurn' } & EffectOpSequenceGate)
  | ({ op: 'scheduleMoveDeckTopToLifeAtEndOfTurn'; requiresLeaderType?: string } & EffectOpSequenceGate)
  | ({ op: 'trashHandDownTo'; handSize: number } & EffectOpSequenceGate)
  | ({ op: 'trashFaceUpLife' } & EffectOpSequenceGate)
  | ({ op: 'scheduleReturnSourceToHandAtEndOfTurn' } & EffectOpSequenceGate)
  | ({ op: 'schedulePreventRefreshOnCharacterAtEndOfTurn'; fromVar?: string; minDonAttached: number; requireRested?: boolean } & EffectOpSequenceGate)
  | ({ op: 'returnDonToDonDeck'; target: Selector } & EffectOpSequenceGate) // return DON!! on field to its owner's DON!! deck
  | ({ op: 'preventRefresh'; target: Selector; maxCost?: number } & EffectOpSequenceGate) // "will not become active in its controller's next Refresh Phase"
  | ({ op: 'addRefreshCostRestriction'; maxCost: number; scope?: 'bothPlayers'; activationGate?: AbilityGate[] } & EffectOpSequenceGate)
  | ({ op: 'returnToHand'; target: Selector } & EffectOpSequenceGate) // bounce a Character to its owner's hand
  | ({ op: 'moveToBottomDeck'; target: Selector } & EffectOpSequenceGate) // move chosen cards to the bottom of their owner's deck
  | ({ op: 'moveToTopDeck'; target: Selector } & EffectOpSequenceGate) // move chosen cards to the top of their owner's deck
  | ({ op: 'moveToLifeTop'; target: Selector; faceUp?: boolean } & EffectOpSequenceGate) // move chosen cards to the top of their owner's Life
  | ({ op: 'moveToLifeBottom'; target: Selector; faceUp?: boolean } & EffectOpSequenceGate) // move chosen cards to the bottom of their owner's Life
  | ({ op: 'turnLifeFace'; target: Selector; faceUp: boolean } & EffectOpSequenceGate) // flip chosen Life cards face-up/face-down in place
  | ({ op: 'turnAllLifeFace'; player: 'controller' | 'opponent'; faceUp: boolean } & EffectOpSequenceGate)
  | ({ op: 'lookLifeAndReorder'; player: 'controller' | 'opponent'; moveOneToDeckTop?: boolean; prompt: string } & EffectOpSequenceGate)
  | ({ op: 'peekLifeThenPlace'; from: Extract<Selector, { sel: 'controllerOrOpponentLifeTop' }>; prompt: string } & EffectOpSequenceGate) // privately look at a top Life card, then optionally place it at bottom
  | ({ op: 'chooseLifeToHand'; position: 'top' | 'topOrBottom'; optional: boolean; prompt: string; player?: 'controller' | 'opponent' } & EffectOpSequenceGate) // choose hidden Life by position, then add it to hand
  | ({ op: 'moveLifeTopToHand'; player: 'controller' | 'opponent'; count?: number } & EffectOpSequenceGate) // mandatory top Life → hand (no choice)
  | ({ op: 'chooseLifeToTrash'; position: 'top' | 'topOrBottom'; optional: boolean; prompt: string } & EffectOpSequenceGate) // choose hidden Life by position, then trash it
  | ({ op: 'playSelf' } & EffectOpSequenceGate) // play the source Character itself, e.g. "[Trigger] Play this card"
  | ({ op: 'playFromHand'; target: Selector; rested?: boolean } & EffectOpSequenceGate) // put a chosen card from hand into play (no cost); Character or Stage
  | ({ op: 'activateEventFromHand'; target: Selector } & EffectOpSequenceGate) // activate [Main] of a chosen Event from hand (no play cost)
  | ({ op: 'activateEventFromTrash'; target: Selector } & EffectOpSequenceGate) // activate [Main] of a chosen Event in trash
  | ({ op: 'playFromTrash'; target: Selector; rested?: boolean } & EffectOpSequenceGate) // put a chosen Character from trash into play (no cost); `rested` plays it rested
  | ({ op: 'playFromDeck'; pick: number; filter: SearchFilter; prompt: string; rested?: boolean } & EffectOpSequenceGate) // search deck, play up to N matching Characters, then shuffle
  | ({ op: 'playStageFromDeck'; pick: number; filter: SearchFilter; prompt: string } & EffectOpSequenceGate) // search deck, play up to N matching Stages (replacing any existing Stage), then shuffle
  | ({ op: 'moveToHand'; target: Selector } & EffectOpSequenceGate) // move a chosen card (e.g. from the trash) to its owner's hand
  | ({ op: 'trashCards'; target: Selector } & EffectOpSequenceGate) // move chosen cards (e.g. from the hand) to their owner's trash
  | ({ op: 'chooseTargets'; var: string; from: Selector; min: number; max: number; prompt: string; chooser?: 'controller' | 'opponent'; maxCombinedPower?: number; distinctNames?: boolean; mustIncludeControllerLeader?: boolean } & EffectOpSequenceGate)
  | ({ op: 'chooseCost'; min: number; max: number; prompt?: string } & EffectOpSequenceGate)
  | ({ op: 'chooseOption'; prompt: string; chooser?: 'controller' | 'opponent'; options: { label: string; ops: EffectOp[] }[] } & EffectOpSequenceGate)
  // Look at top `look` cards; player adds up to `pick` filter-matching cards to
  // `destination`; `reveal` means the added card identity is public ("reveal up to N").
  // Without that text, the added card remains secret to the controller.
  // The rest go to the configured destination (bottom by default).
  | ({ op: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter?: SearchFilter; remainder?: SearchRemainderDestination; prompt: string; rested?: boolean } & EffectOpSequenceGate)
  // Search the controller's full deck, choose up to `pick` matching cards, move
  // them to `destination`, then shuffle the deck. `reveal` controls whether the
  // chosen card identity is public.
  | ({ op: 'searchDeck'; pick: number; reveal: boolean; destination: Extract<SearchPickDestination, 'hand'>; filter?: SearchFilter; prompt: string } & EffectOpSequenceGate)
  // Reveal the top card of the controller's own deck (public), test it against an
  // optional predicate, and record whether it matched via the __lastRevealMatched
  // binding. Non-suspending: the card stays on top; the conditional "then" branch
  // is expressed as following ops gated on `ifPrevious: 'previousRevealMatched'`.
  | ({ op: 'revealTopDeck'; filter?: SearchFilter } & EffectOpSequenceGate)
  // Reveal the top card of the opponent's deck and record cost-match against __chosenCost.
  | ({ op: 'revealOpponentDeckTop' } & EffectOpSequenceGate)
  | ({ op: 'revealCards'; target: Selector } & EffectOpSequenceGate)
  // Trash the top `count` cards of the controller's own deck (self-mill).
  | ({ op: 'trashTopDeck'; count: number } & EffectOpSequenceGate)
  // Trash the top `count` Life cards of a player (e.g. "Trash up to 1 of your opponent's Life cards").
  | ({ op: 'trashLife'; player: 'opponent' | 'controller'; count?: number; untilLife?: number } & EffectOpSequenceGate)
  // Add `count` DON!! from the DON!! deck to the cost area, active or rested (DON!! ramp).
  | ({ op: 'addDonFromDeck'; count: number; rested: boolean } & EffectOpSequenceGate)
  // Draw N where N = count of controller's in-play Characters with a matching type.
  | ({ op: 'drawByTypedCharacterCount'; typeIncludes: string } & EffectOpSequenceGate)
  | ({ op: 'drawByEventCount'; countField: 'handTrashedCount' } & EffectOpSequenceGate)
  // Shuffle a player's main deck without moving cards itself.
  | ({ op: 'shuffleDeck'; player?: 'controller' | 'opponent' } & EffectOpSequenceGate)
  // Return all hand cards to deck, shuffle, then draw (equal to returned count unless drawAmount is set).
  | ({ op: 'returnHandShuffleDraw'; player?: 'controller' | 'opponent'; drawAmount?: number } & EffectOpSequenceGate)
  // Suspending: trash N from hand where N is read from bindings[countVar] (set by drawByTypedCharacterCount).
  | ({ op: 'trashFromHandByCountVar'; countVar: string; prompt?: string } & EffectOpSequenceGate);

export type NonSuspendingEffectOp = Exclude<
  EffectOp,
  | { op: 'chooseTargets' }
  | { op: 'chooseCost' }
  | { op: 'searchTopDeck' }
  | { op: 'playFromDeck' }
  | { op: 'playStageFromDeck' }
  | { op: 'lookLifeAndReorder' }
  | { op: 'peekLifeThenPlace' }
  | { op: 'chooseLifeToHand' }
  | { op: 'chooseLifeToTrash' }
  | { op: 'chooseOption' }
  | { op: 'trashFromHandByCountVar' }
  | { op: 'searchDeck' }
  | { op: 'drawByEventCount' }
  | { op: 'drawByTypedCharacterCount' }
>;

/**
 * When the ability is exposed/fires (mirrors EffectTimingKeyword).
 *   onBattle    — [When this Character battles ...]: fires when the source is the
 *                 attacker and the battle's target is an opponent Character.
 *   endOfTurn   — [End of Your Turn]: fires during the source controller's End Phase.
 */
export type IrTiming =
  | 'onEnterPlay'
  | 'onPlay'
  | 'whenAttacking'
  | 'onBlock'
  | 'onOpponentsAttack'
  | 'onBattle'
  | 'activateMain'
  | 'onKO'
  | 'onCharacterKoed'
  | 'onRested'
  | 'onDonReturned'
  | 'onDonGiven'
  | 'onRemovedFromField'
  | 'onOpponentEventActivated'
  | 'onYouEventActivated'
  | 'onOpponentBlockerActivated'
  | 'onLifeDamageDealt'
  | 'onDrawOutsideDrawPhase'
  | 'onLifeToHand'
  | 'onTriggerActivated'
  | 'onCharacterPlayedFromHand'
  | 'onOpponentCharacterPlayedFromHand'
  | 'onCharacterPlayedFromTrash'
  | 'onStartOfTurn'
  | 'onHandTrashed'
  | 'counter'
  | 'lifeTrigger'
  | 'endOfTurn'
  // 5-2-1-5-1: "at the start of the game" Leader effects, fired once per player
  // from setup/advanceStartOfGameEffects.ts (before opening hands are dealt) —
  // never fired via the normal card-play/battle cascade paths.
  | 'startOfGame';

/**
 * An activation cost that must be PAID before an activated ability resolves
 * (8-3-1-5). Pure data; the ACTIVATE_CARD_EFFECT handler pays it. Only fully
 * mechanical costs are modeled. Ambiguous costs stay out of curated runtime
 * templates until reviewed rather than resolving for free.
 */
export type AbilityCost =
  | { kind: 'donMinus'; count: number; activeOnly?: boolean } // return N DON!! from the field to the DON!! deck; activeOnly restricts to active cost-area DON!!
  | { kind: 'restThis' } // rest the source card
  | { kind: 'trashThis' } // trash the source card (not a K.O.; does not fire [On K.O.])
  | { kind: 'restDon'; count: number }; // rest N of your active DON!! cards

/**
 * A board-state precondition on an "If …, <effect>" ability (checked once when
 * the ability would fire/activate). Pure data — evaluated by evaluateGates.
 */
export type AbilityGate =
  | { kind: 'leaderName'; name: string } // "If your Leader is [X]"
  | { kind: 'leaderNameIncludes'; name: string } // "If your Leader's card name includes X"
  | { kind: 'leaderType'; type: string } // "If your Leader has the {Y} type"
  | { kind: 'leaderMulticolor' } // "If your Leader is multicolored"
  | { kind: 'leaderColor'; color: Color } // "If your Leader's colors include {color}"
  | { kind: 'leaderActive' } // "If your Leader is active" / "your 1 active Leader"
  | { kind: 'leaderRested' } // "If your Leader is rested"
  | { kind: 'selfCharacterCount'; atLeast?: number; atMost?: number } // "If you have N or more/less Characters"
  | { kind: 'selfRestedCharacterCount'; atLeast?: number; atMost?: number } // "If you have N or more rested Characters"
  | { kind: 'selfRestedCardCount'; atLeast?: number; atMost?: number } // "If you have N or more rested cards" (Leader/Characters/Stage/rested cost-area DON!!)
  | { kind: 'opponentCharacterCount'; atLeast?: number; atMost?: number } // "If your opponent has N or less Characters"
  | { kind: 'selfDonFieldCount'; atLeast?: number; atMost?: number } // "If you have N or less DON!! cards on your field"
  | { kind: 'selfAllFieldDonRested' } // "If all of your DON!! cards are rested" (field DON: cost area + attached; requires at least one)
  | { kind: 'selfActiveDonCount'; atLeast?: number; atMost?: number } // "If you have N or more active DON!! cards" (unattached in cost area)
  | { kind: 'selfRestedDonCount'; atLeast?: number; atMost?: number } // "rested DON!! cards" available in cost area and not already attached
  | { kind: 'selfLife'; atLeast?: number; atMost?: number } // "If you have N or less Life cards"
  | { kind: 'selfHasFaceUpLife' } // "If you have a face-up Life card"
  | { kind: 'opponentLife'; atLeast?: number; atMost?: number } // "If your opponent has N or less Life cards"
  | { kind: 'combinedLifeTotal'; atLeast?: number; atMost?: number } // "you and your opponent have a total of N or less Life cards"
  | { kind: 'selfLifeLessThanOpponent' } // "If you have less Life cards than your opponent"
  | { kind: 'selfLifeAtMostOpponent' } // "If your Life cards are equal to or less than your opponent's"
  | { kind: 'selfHand'; atLeast?: number; atMost?: number } // "If you have N or less cards in your hand"
  | { kind: 'selfHandAtLeastLessThanOpponent'; count: number } // "If your hand count is at least N less than your opponent's"
  | { kind: 'anyCharacterExactCost'; exactCost: number } // "If there is a Character with a cost of N"
  | { kind: 'selfHasCharacterCostAtLeast'; atLeast: number } // "If you have a Character with a cost of N or more"
  | { kind: 'selfCharacterCostCount'; minCost: number; atLeast: number } // "If you have N or more Characters with a cost of M or more"
  | { kind: 'selfCharacterBaseCostCount'; minBaseCost: number; atLeast: number } // "If you have N or more Characters with a base cost of M or more"
  | { kind: 'anyCharacterCostCount'; minCost: number; atLeast: number } // "If there are N or more Characters with a cost of M or more"
  | { kind: 'selfHasCharacterBasePowerAtLeast'; power: number } // "If you have a Character with a base power of N or more"
  | { kind: 'opponentDonMoreThanSelf' } // "If your opponent has more DON!! cards on their field than you"
  | { kind: 'opponentDonFieldCount'; atLeast?: number; atMost?: number } // "If your opponent has N or more/less DON!! cards on their field"
  | { kind: 'selfDonAtMostOpponent' } // "If the number of DON!! on your field is equal to or less than your opponent's"
  | { kind: 'selfDonAtLeastLessThanOpponent'; count: number } // "If your DON!! is at least N less than your opponent's"
  | { kind: 'selfControlsNamed'; name: string } // "If you have [X]" — you control a Character named X
  | { kind: 'selfDoesNotControlNamed'; name: string } // "If you don't have [X]"
  | { kind: 'selfNamedCardCount'; name: string; atLeast?: number; atMost?: number } // "If you have N or more [X] cards" (Leader/Characters/Stage)
  | { kind: 'selfHandMatching'; atLeast: number; typeIncludes?: string; category?: Exclude<CardCategory, 'don'>; exactPower?: number; minPower?: number } // "reveal N {type}/Event/power cards from your hand"
  | { kind: 'opponentHand'; atLeast?: number; atMost?: number } // "If your opponent has N or more/less cards in their hand"
  // "If this Character was played on this turn" (self-referential; needs the source instance id).
  | { kind: 'selfPlayedThisTurn' }
  // "If this Leader/Character battled your opponent's Character during this turn."
  | { kind: 'selfBattledOpponentCharacterThisTurn' }
  // "If your Leader has the <X> attribute."
  | { kind: 'leaderAttribute'; attribute: string }
  // "If your opponent's Leader has the <X> attribute."
  | { kind: 'opponentLeaderAttribute'; attribute: string }
  | { kind: 'selfTrashCount'; atLeast?: number; atMost?: number } // "N or more/less cards in your trash"
  | { kind: 'selfDeckCount'; atLeast?: number; atMost?: number } // "N or less cards in your deck"
  | { kind: 'selfTypedCharacterCount'; typeIncludes: string; atLeast?: number; atMost?: number; rested?: boolean } // "if you have N or more {type} Characters"
  | { kind: 'selfTypedCharacterDistinctNameCount'; typeIncludes: string; atLeast: number } // "if you have N {type} Characters with different card names"
  | { kind: 'selfAnyTypedCharacterCount'; anyOfTypes: string[]; atLeast?: number; atMost?: number; rested?: boolean } // "if you have N or more {A} or {B} type Characters"
  | { kind: 'selfAllCharactersTyped'; typeIncludes: string } // "if the only Characters on your field are {type} type Characters"
  | { kind: 'selfControlsNamedWithPowerAtLeast'; name: string; power: number } // "If you have [X] with N power or more"
  | { kind: 'selfControlsNamedCharacterBasePower'; name: string; power: number; mode?: 'exact' | 'atLeast' } // "If you have [X] Character with N base power"
  | { kind: 'selfTypedCharacterPowerAtLeast'; typeIncludes: string; power: number } // "If you have a {type} Character with N power or more"
  | { kind: 'selfCharacterCurrentPowerCount'; power: number; atLeast?: number; atMost?: number } // "if you have N Characters with M power or more"
  | { kind: 'selfCharacterBasePowerCount'; power: number; mode?: 'exact' | 'atLeast'; atLeast?: number; atMost?: number } // "if you have N Characters with M base power"
  | { kind: 'selfOtherCharacterPowerAtLeast'; power: number } // "If you have another Character with N power or more" (excludes source)
  | { kind: 'selfLeaderPowerAtMost'; power: number } // "If your Leader has N power or less"
  | { kind: 'selfLeaderPowerAtLeast'; power: number } // "If your Leader has N power or more"
  | { kind: 'selfTurnCount'; atLeast?: number; atMost?: number } // "If it is your Nth turn or later" for the controller
  | { kind: 'selfInstancePowerAtLeast'; power: number } // "If this Character/Leader has N power or more" (needs sourceInstanceId)
  | { kind: 'selfOtherNamedCharacterCount'; name: string; atMost?: number; atLeast?: number } // "no other [X] Characters" (excludes source)
  | { kind: 'selfTrashMatching'; atLeast?: number; atMost?: number; category?: Exclude<CardCategory, 'don'>; typeIncludes?: string; name?: string } // "N or more named/Events/{type} cards in your trash"
  | { kind: 'opponentRestedCharacterCount'; atLeast?: number; atMost?: number } // "opponent has N or more rested Characters"
  | { kind: 'selfGivenDonCount'; atLeast?: number; atMost?: number } // "you have N or more given DON!!" (DON attached to your Leader/Characters)
  | { kind: 'opponentGivenDonCount'; atLeast?: number; atMost?: number } // "opponent has N or more given DON!!"
  | { kind: 'opponentHasCharacterBasePowerAtLeast'; power: number } // "opponent has a Leader or Character with base power N or more"
  | { kind: 'opponentCharacterBasePowerCount'; power: number; atLeast?: number; atMost?: number } // "opponent has N Characters with base power M or more"
  | { kind: 'opponentCharacterCurrentPowerCount'; power: number; atLeast?: number; atMost?: number } // "opponent has N Characters with M current power or more"
  | { kind: 'selfCharactersTotalCostAtLeast'; atLeast: number } // "total cost of your Characters is N or more"
  | { kind: 'anyCharacterCostAtLeast'; atLeast: number } // "if there is a Character with a cost of N or more"
  | { kind: 'anyCharacterBasePowerAtLeast'; power: number } // "if there is a Character with a base power of N or more"
  | { kind: 'opponentHasCharacterExactCost'; exactCost: number } // "if your opponent has a Character with a cost of N"
  | { kind: 'selfDonReturnedThisAction'; atLeast?: number; atMost?: number } // "When N or more DON!! cards on your field are returned …"
  | { kind: 'selfActivatedEventBaseCostThisTurn'; atLeast?: number; atMost?: number } // "If you have activated an Event with a base cost of N or more this turn"
  | { kind: 'donGivenTargetLeaderOrCharacter' } // onDonGiven: the card that received DON is your Leader or a Character
  | { kind: 'donGivenTargetIsSelf' } // onDonGiven: this card/Leader was the DON recipient
  | { kind: 'selfDonGivenThisAction'; atLeast?: number; atMost?: number } // onDonGiven: N+ DON!! were given to this card this event
  | { kind: 'playedCharacterNoBaseEffect' } // onCharacterPlayedFromHand: the just-played Character has no base effect
  | { kind: 'playedCharacterTypeIncludes'; typeIncludes: string } // onCharacterPlayed*: the just-played Character carries this type
  | { kind: 'playedCharacterHasTrigger' } // onCharacterPlayed*: the just-played Character has printed [Trigger]
  | { kind: 'playedCharacterBaseCostAtLeast'; atLeast: number } // reactive: just-played Character base cost >= N
  | { kind: 'playedFromCharacterEffect' } // reactive: Character was played via another Character's effect
  // onCharacterKoed only: filter the reactive window by whose Character was K.O.'d.
  // 'opponent' = "When your opponent's Character is K.O.'d"; 'controller' = "When your Character is K.O.'d".
  | { kind: 'koedCharacterController'; player: 'opponent' | 'controller' }
  // onKO only: the Character was K.O.'d by an opponent-controlled effect (not battle damage).
  | { kind: 'koByOpponentEffect' }
  // onKO only: the Character was K.O.'d by any effect (not battle damage).
  | { kind: 'koByEffect' }
  | { kind: 'removedFromFieldController'; player: 'opponent' | 'controller' } // onRemovedFromField: whose card left the field
  | { kind: 'removedByEffectController'; player: 'opponent' | 'controller' } // onRemovedFromField: whose effect caused the removal
  | { kind: 'removedFromFieldCategory'; category: Exclude<CardCategory, 'don'> } // onRemovedFromField: removed card category
  | { kind: 'removedFromFieldTypeIncludes'; typeIncludes: string } // onRemovedFromField: removed card carries this type
  | { kind: 'removedToZone'; zone: RemovedFromFieldDestination } // onRemovedFromField: destination zone of the field removal
  | { kind: 'effectSourceTypeIncludes'; typeIncludes: string } // reactive: effect source carries this type
  | { kind: 'anyOf'; gates: AbilityGate[] }; // OR: satisfied if any sub-gate holds ("if Leader is X or Y")

export interface Ability {
  timing: IrTiming;
  /** Gate for whether a TRIGGERED ability fires at all ([DON!! xN] / [Your/Opponent's Turn]). */
  condition?: IrCondition;
  /** "If …" board-state preconditions (all must hold) — checked once at fire/activate time. */
  gate?: AbilityGate[];
  /** 10-2-13 [Once Per Turn] — an activated ability may only be used once per turn per source. */
  oncePerTurn?: boolean;
  /** onStartOfTurn only: player may decline before the ability resolves. */
  optionalActivate?: boolean;
  /** Activation cost(s) paid on use (8-3-1-5); [Activate: Main] and [Counter] handlers pay these before resolution. */
  cost?: AbilityCost[];
  /**
   * [When this Character battles ...] / [On Your Opponent's Attack] attribute filter:
   * the opposing attacker must be a Character whose attributes include this value.
   * Checked in fireOnBattle / fireOnOpponentsAttack / runTimings.
   */
  battlingOpponentAttribute?: string;
  /** whenAttacking only: battle target must be the opponent's Leader. */
  battleTargetIsOpponentLeader?: boolean;
  /**
   * onBattle only: defer firing until the Damage Step after this card K.O.'s an
   * opponent Character in battle (OP02-094 Isuka). Checked in fireOnBattleKoedOpponent.
   */
  requiresOpponentKoed?: boolean;
  ops: EffectOp[];
}

/** A whole card's curated runtime effect program. */
export interface EffectProgram {
  cardNumber: string;
  abilities: Ability[];
}

/** Serializable resume point stored on a PendingChoice for an interpreter-suspended program. */
export interface EffectResumeState {
  abilityIndex: number;
  /** Index of the chooseTargets op that suspended; resume continues after it. */
  opIndex: number;
  /** Variables bound so far (var name -> selected instance ids). */
  bindings: Record<string, string[]>;
}
