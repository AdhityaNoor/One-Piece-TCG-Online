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
import type { CardCategory, Color } from '../state/card';

/** Resolves to a set of CardInstance ids at run time. Pure data. */
export type Selector =
  | { sel: 'self' } // the source card
  | { sel: 'controllerLeader' }
  | ({ sel: 'controllerCharacters' } & CharacterMoveFilter)
  | { sel: 'controllerLeaderOrCharacters'; typeIncludes?: string; name?: string; excludeSelf?: boolean; minPower?: number }
  | { sel: 'opponentLeader'; rested?: boolean }
  | { sel: 'controllerLeaderOrStage'; typeIncludes?: string } // controller's Leader + Stage cards (for 'rest 1 of your {X} Leader or Stage' costs)
  | { sel: 'opponentLeaderOrCharacters' }
  | { sel: 'controllerRestedDon' } // the controller's own rested, un-attached DON!! in the cost area
  | { sel: 'opponentActiveDon' } // the opponent's active, un-attached DON!! in the cost area (rest targets)
  | { sel: 'opponentRestedDon' } // the opponent's rested, un-attached DON!! in the cost area
  | { sel: 'ownerLeaderOrCharactersOfVar'; varName: string } // Leader + Characters of the owner of the first id in `varName`
  | { sel: 'battleOpponent' } // the opponent Character the source is currently battling (in currentBattle), if still in play
  | { sel: 'controllerLifeTop' } // the top card of the controller's own Life (for "add 1 from the top of your Life")
  | { sel: 'controllerLifeTopBottom' } // top and bottom Life cards, de-duplicated for 1-card Life
  | { sel: 'controllerOrOpponentLifeTop' } // top Life card from either player, de-duplicated only by absent zones
  | { sel: 'controllerDeckTop' }
  | { sel: 'allCharacters'; minCost?: number; maxCost?: number; maxPower?: number; maxBaseCost?: number; minBaseCost?: number; exactBaseCost?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number } // any player's Characters
  | { sel: 'opponentCharacters'; minCost?: number; maxCost?: number; exactCost?: number; maxPower?: number; maxBaseCost?: number; minBaseCost?: number; exactBaseCost?: number; maxBasePower?: number; minBasePower?: number; exactBasePower?: number; rested?: boolean; hasBlocker?: boolean; minDonAttached?: number; maxCostFromOpponentLife?: boolean; maxCostFromCombinedLife?: boolean; noBaseEffect?: boolean; excludeName?: string } // optional cost/power (current) + base cost/power + rested/blocker/given-DON!! filters
  | { sel: 'controllerAttachedDon' } // DON!! instance ids currently given to the controller's Leader/Characters/Stages
  | { sel: 'controllerHand'; filter?: SearchFilter } // controller's hand cards matching a filter (for play-from-hand)
  | { sel: 'opponentHand' } // opponent's hand cards, for effects where the opponent chooses/trashes
  | { sel: 'controllerTrash'; filter?: SearchFilter } // controller's trash cards matching a filter (for recover-to-hand)
  | { sel: 'opponentTrash'; filter?: SearchFilter } // opponent's trash cards matching a filter
  | { sel: 'controllerDeck'; filter?: SearchFilter } // controller's deck cards matching a filter (for play-from-deck)
  | { sel: 'allStages' } // any player's Stage in the stage area
  | { sel: 'controllerStages'; maxCost?: number } // controller's Stage in the stage area
  | { sel: 'opponentStages'; maxCost?: number } // opponent's Stage in the stage area
  | { sel: 'var'; name: string }; // ids bound by a prior chooseTargets op

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
  /** Card category gate (2-2), e.g. "reveal up to 1 Character card". */
  category?: Exclude<CardCategory, 'don'>;
  /** Card color gate (2-3), e.g. "red Event". */
  color?: Color;
  /** Exact card name (2-1), e.g. "play up to 1 [Gaimon]". */
  name?: string;
  maxCost?: number;
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
}

/** Filters for moveCards when the source zone is the character field. */
export interface CharacterMoveFilter {
  minCost?: number;
  maxCost?: number;
  exactCost?: number;
  maxPower?: number;
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
  noBaseEffect?: boolean;
  color?: Color;
  name?: string;
  /** Exclude the source card instance (other than this Character). */
  excludeSelf?: boolean;
  /** Exclude cards sharing the source card's printed name. */
  excludeSelfName?: boolean;
}

export type SearchRemainderDestination = 'bottom' | 'trash';
export type SearchPickDestination = 'hand' | 'lifeTop' | 'deckTopOrBottom';
export type SequenceCondition = 'previousSelectedAny' | 'previousMovedAny' | 'previousRevealMatched';

export interface EffectOpSequenceGate {
  /**
   * Optional sequencing gate for text like "If you do" after an optional
   * function. Plain "Then" does not use this; choosing 0 for an "up to" effect
   * still counts as resolving the prior function.
   */
  ifPrevious?: SequenceCondition;
  /** Optional board-state gate checked at this exact sequence point. */
  ifGate?: AbilityGate[];
}

/**
 * One instruction. `chooseTargets` and `searchTopDeck` both suspend the program
 * via a PendingChoice; `chooseTargets` binds the player's selection to `var`
 * (later ops reference it via { sel: 'var', name }), while `searchTopDeck`
 * resolves its own deck movement on resume.
 */
export type EffectOp =
  | ({ op: 'draw'; amount: number } & EffectOpSequenceGate)
  | ({ op: 'addPower'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition; scale?: PowerScale } & EffectOpSequenceGate)
  // Register an "aura"/anthem power modifier over a dynamic target group (e.g. "your
  // {Supernovas} Leaders and Characters gain +1000"), optionally gated on source state.
  | ({ op: 'addPowerAura'; group: PowerAuraGroup; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition } & EffectOpSequenceGate)
  // Register a "base power becomes N" aura over a dynamic target group (e.g. "[Opponent's Turn]
  // all of your [Shura] cards' base power become 6000"), optionally gated on source state.
  | ({ op: 'setBasePowerAura'; group: PowerAuraGroup; value: number; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition } & EffectOpSequenceGate)
  | ({ op: 'addCost'; target: Selector; amount: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate)
  // Register a continuous cost "aura" over a dynamic target group (e.g. "all of your {Navy}
  // Characters gain +2 cost", "give all of your opponent's Characters −1 cost").
  | ({ op: 'addCostAura'; group: PowerAuraGroup; amount: number; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition; usesRemaining?: number } & EffectOpSequenceGate)
  | ({ op: 'setBasePower'; target: Selector; value: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate) // "base power BECOMES N" (2-6): overwrite base; additive modifiers still stack on top
  | ({ op: 'setBaseCost'; target: Selector; value: number; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate) // "base cost BECOMES N" (2-7): overwrite base cost
  | ({ op: 'addKeyword'; target: Selector; keyword: ContinuousKeyword; duration: IrDuration; condition?: IrCondition } & EffectOpSequenceGate)
  // Register a continuous keyword grant over a dynamic target group (e.g. "all of your [Shura]
  // cards gain [Unblockable]"), optionally gated on source state.
  | ({ op: 'addKeywordAura'; group: PowerAuraGroup; keyword: ContinuousKeyword; duration: IrDuration; sourceCondition?: SourceStateCondition; condition?: IrCondition } & EffectOpSequenceGate)
  // Grant "cannot be K.O.'d" to the target. scope 'battle' = battle K.O. only (7-1-4-2); 'any' = any source.
  // `attackerCategory` optionally restricts a battle immunity to a given attacker category ("by Leaders").
  | ({ op: 'addKoImmunity'; target: Selector; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; attackerCategory?: 'leader' | 'character'; effectSourceController?: 'opponent' | 'controller'; effectSourceMaxBasePower?: number; effectSourceCategory?: 'leader' | 'character' } & EffectOpSequenceGate)
  | ({ op: 'addKoImmunityAura'; group: KoImmunityAuraGroup; scope: 'battle' | 'effect' | 'any'; duration: IrDuration; condition?: IrCondition; sourceCondition?: SourceStateCondition; effectSourceController?: 'opponent' | 'controller'; effectSourceMaxBasePower?: number; effectSourceCategory?: 'leader' | 'character' } & EffectOpSequenceGate)
  // Register optional K.O. replacement on enter play ("would be K.O.'d … instead").
  | ({ op: 'registerKoReplacement'; appliesTo: 'self' | 'aura'; appliesToInstanceId?: string; group?: KoReplacementAuraGroup; scope: 'battle' | 'effect' | 'any'; oncePerTurn?: boolean; action: KoReplacementAction; condition?: IrCondition; sourceCondition?: SourceStateCondition; duration: IrDuration } & EffectOpSequenceGate)
  | ({ op: 'preventBlockers'; target: Selector; duration: IrDuration; blockerPowerAtLeast?: number } & EffectOpSequenceGate)
  | ({ op: 'suppressBlockerActivation'; target: Selector; duration: IrDuration } & EffectOpSequenceGate)
  // Prevent the target Leader/Character from declaring an attack (7-1-1-1) while active.
  | ({ op: 'preventAttack'; target: Selector; duration: IrDuration; forbiddenTarget?: 'leader'; whileSummoningSick?: boolean } & EffectOpSequenceGate)
  // Negate all (or selected timings of) abilities on the target Leader/Character/Stage.
  | ({ op: 'negateEffect'; target: Selector; duration: IrDuration; negatedTimings?: IrTiming[] } & EffectOpSequenceGate)
  // Negate abilities on all cards controlled by a player (e.g. "your [On Play] effects are negated").
  | ({ op: 'negateControllerEffects'; player: 'controller' | 'opponent'; duration: IrDuration; negatedTimings?: IrTiming[] } & EffectOpSequenceGate)
  | ({ op: 'giveDon'; target: Selector; count: number } & EffectOpSequenceGate)
  // Reassign up to N DON!! cards already given on the controller's field onto a chosen Character.
  | ({ op: 'giveGivenDon'; donTarget: Selector; characterTarget: Selector } & EffectOpSequenceGate)
  // Attach DON!! from a player's cost area (controller, opponent, or owner of a prior chosen card).
  | ({ op: 'giveDonFromCostArea'; target: Selector; count: number; donOwner: 'controller' | 'opponent' | { fromVar: string }; restedOnly?: boolean; activeOnly?: boolean } & EffectOpSequenceGate)
  | ({ op: 'ko'; target: Selector } & EffectOpSequenceGate)
  | ({ op: 'rest'; target: Selector } & EffectOpSequenceGate)
  | ({ op: 'setActive'; target: Selector } & EffectOpSequenceGate) // set a card as active — the inverse of `rest` (2-4-3 active/rested). Works on Leader/Character (orientation) and DON!! (donRested).
  | ({ op: 'preventRefresh'; target: Selector } & EffectOpSequenceGate) // "will not become active in its controller's next Refresh Phase"
  | ({ op: 'returnToHand'; target: Selector } & EffectOpSequenceGate) // bounce a Character to its owner's hand
  | ({ op: 'moveToBottomDeck'; target: Selector } & EffectOpSequenceGate) // move chosen cards to the bottom of their owner's deck
  | ({ op: 'moveToLifeTop'; target: Selector; faceUp?: boolean } & EffectOpSequenceGate) // move chosen cards to the top of their owner's Life
  | ({ op: 'moveToLifeBottom'; target: Selector; faceUp?: boolean } & EffectOpSequenceGate) // move chosen cards to the bottom of their owner's Life
  | ({ op: 'turnLifeFace'; target: Selector; faceUp: boolean } & EffectOpSequenceGate) // flip chosen Life cards face-up/face-down in place
  | ({ op: 'peekLifeThenPlace'; from: Extract<Selector, { sel: 'controllerOrOpponentLifeTop' }>; prompt: string } & EffectOpSequenceGate) // privately look at a top Life card, then optionally place it at bottom
  | ({ op: 'chooseLifeToHand'; position: 'top' | 'topOrBottom'; optional: boolean; prompt: string } & EffectOpSequenceGate) // choose hidden Life by position, then add it to hand
  | ({ op: 'chooseLifeToTrash'; position: 'top' | 'topOrBottom'; optional: boolean; prompt: string } & EffectOpSequenceGate) // choose hidden Life by position, then trash it
  | ({ op: 'playSelf' } & EffectOpSequenceGate) // play the source Character itself, e.g. "[Trigger] Play this card"
  | ({ op: 'playFromHand'; target: Selector } & EffectOpSequenceGate) // put a chosen Character from hand into play (no cost)
  | ({ op: 'playFromTrash'; target: Selector; rested?: boolean } & EffectOpSequenceGate) // put a chosen Character from trash into play (no cost); `rested` plays it rested
  | ({ op: 'playFromDeck'; pick: number; filter: SearchFilter; prompt: string } & EffectOpSequenceGate) // search deck, play up to N matching Characters, then shuffle
  | ({ op: 'moveToHand'; target: Selector } & EffectOpSequenceGate) // move a chosen card (e.g. from the trash) to its owner's hand
  | ({ op: 'trashCards'; target: Selector } & EffectOpSequenceGate) // move chosen cards (e.g. from the hand) to their owner's trash
  | ({ op: 'chooseTargets'; var: string; from: Selector; min: number; max: number; prompt: string; chooser?: 'controller' | 'opponent' } & EffectOpSequenceGate)
  | ({ op: 'chooseOption'; prompt: string; chooser?: 'controller' | 'opponent'; options: { label: string; ops: EffectOp[] }[] } & EffectOpSequenceGate)
  // Look at top `look` cards; player adds up to `pick` filter-matching cards to
  // `destination`; `reveal` means the added card identity is public ("reveal up to N").
  // Without that text, the added card remains secret to the controller.
  // The rest go to the configured destination (bottom by default).
  | ({ op: 'searchTopDeck'; look: number; pick: number; reveal: boolean; destination: SearchPickDestination; filter?: SearchFilter; remainder?: SearchRemainderDestination; prompt: string } & EffectOpSequenceGate)
  // Reveal the top card of the controller's own deck (public), test it against an
  // optional predicate, and record whether it matched via the __lastRevealMatched
  // binding. Non-suspending: the card stays on top; the conditional "then" branch
  // is expressed as following ops gated on `ifPrevious: 'previousRevealMatched'`.
  | ({ op: 'revealTopDeck'; filter?: SearchFilter } & EffectOpSequenceGate)
  // Trash the top `count` cards of the controller's own deck (self-mill).
  | ({ op: 'trashTopDeck'; count: number } & EffectOpSequenceGate)
  // Trash the top `count` Life cards of a player (e.g. "Trash up to 1 of your opponent's Life cards").
  | ({ op: 'trashLife'; player: 'opponent' | 'controller'; count?: number; untilLife?: number } & EffectOpSequenceGate)
  // Add `count` DON!! from the DON!! deck to the cost area, active or rested (DON!! ramp).
  | ({ op: 'addDonFromDeck'; count: number; rested: boolean } & EffectOpSequenceGate);

export type NonSuspendingEffectOp = Exclude<
  EffectOp,
  | { op: 'chooseTargets' }
  | { op: 'searchTopDeck' }
  | { op: 'playFromDeck' }
  | { op: 'peekLifeThenPlace' }
  | { op: 'chooseLifeToHand' }
  | { op: 'chooseLifeToTrash' }
  | { op: 'chooseOption' }
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
  | 'onOpponentEventActivated'
  | 'onYouEventActivated'
  | 'onOpponentBlockerActivated'
  | 'onLifeDamageDealt'
  | 'onDrawOutsideDrawPhase'
  | 'onLifeToHand'
  | 'onCharacterPlayedFromHand'
  | 'counter'
  | 'lifeTrigger'
  | 'endOfTurn';

/**
 * An activation cost that must be PAID before an activated ability resolves
 * (8-3-1-5). Pure data; the ACTIVATE_CARD_EFFECT handler pays it. Only fully
 * mechanical costs are modeled. Ambiguous costs stay out of curated runtime
 * templates until reviewed rather than resolving for free.
 */
export type AbilityCost =
  | { kind: 'donMinus'; count: number } // return N DON!! from the field to the DON!! deck
  | { kind: 'restThis' } // rest the source card
  | { kind: 'trashThis' } // trash the source card (not a K.O.; does not fire [On K.O.])
  | { kind: 'restDon'; count: number }; // rest N of your active DON!! cards

/**
 * A board-state precondition on an "If …, <effect>" ability (checked once when
 * the ability would fire/activate). Pure data — evaluated by evaluateGates.
 */
export type AbilityGate =
  | { kind: 'leaderName'; name: string } // "If your Leader is [X]"
  | { kind: 'leaderType'; type: string } // "If your Leader has the {Y} type"
  | { kind: 'leaderMulticolor' } // "If your Leader is multicolored"
  | { kind: 'selfCharacterCount'; atLeast?: number; atMost?: number } // "If you have N or more/less Characters"
  | { kind: 'selfRestedCharacterCount'; atLeast?: number; atMost?: number } // "If you have N or more rested Characters"
  | { kind: 'opponentCharacterCount'; atLeast?: number; atMost?: number } // "If your opponent has N or less Characters"
  | { kind: 'selfDonFieldCount'; atLeast?: number; atMost?: number } // "If you have N or less DON!! cards on your field"
  | { kind: 'selfRestedDonCount'; atLeast?: number; atMost?: number } // "rested DON!! cards" available in cost area and not already attached
  | { kind: 'selfLife'; atLeast?: number; atMost?: number } // "If you have N or less Life cards"
  | { kind: 'opponentLife'; atLeast?: number; atMost?: number } // "If your opponent has N or less Life cards"
  | { kind: 'combinedLifeTotal'; atLeast?: number; atMost?: number } // "you and your opponent have a total of N or less Life cards"
  | { kind: 'selfLifeLessThanOpponent' } // "If you have less Life cards than your opponent"
  | { kind: 'selfHand'; atLeast?: number; atMost?: number } // "If you have N or less cards in your hand"
  | { kind: 'anyCharacterExactCost'; exactCost: number } // "If there is a Character with a cost of N"
  | { kind: 'selfHasCharacterCostAtLeast'; atLeast: number } // "If you have a Character with a cost of N or more"
  | { kind: 'selfHasCharacterBasePowerAtLeast'; power: number } // "If you have a Character with a base power of N or more"
  | { kind: 'opponentDonMoreThanSelf' } // "If your opponent has more DON!! cards on their field than you"
  | { kind: 'selfDonAtMostOpponent' } // "If the number of DON!! on your field is equal to or less than your opponent's"
  | { kind: 'selfControlsNamed'; name: string } // "If you have [X]" — you control a Character named X
  | { kind: 'selfDoesNotControlNamed'; name: string } // "If you don't have [X]"
  | { kind: 'selfHandMatching'; atLeast: number; typeIncludes?: string; category?: Exclude<CardCategory, 'don'>; exactPower?: number; minPower?: number } // "reveal N {type}/Event/power cards from your hand"
  | { kind: 'opponentHand'; atLeast?: number; atMost?: number } // "If your opponent has N or more/less cards in their hand"
  // "If this Character was played on this turn" (self-referential; needs the source instance id).
  | { kind: 'selfPlayedThisTurn' }
  | { kind: 'selfTrashCount'; atLeast?: number; atMost?: number } // "N or more/less cards in your trash"
  | { kind: 'selfDeckCount'; atLeast?: number; atMost?: number } // "N or less cards in your deck"
  | { kind: 'selfTypedCharacterCount'; typeIncludes: string; atLeast?: number; atMost?: number; rested?: boolean } // "if you have N or more {type} Characters"
  | { kind: 'selfAllCharactersTyped'; typeIncludes: string } // "if the only Characters on your field are {type} type Characters"
  | { kind: 'selfControlsNamedWithPowerAtLeast'; name: string; power: number } // "If you have [X] with N power or more"
  | { kind: 'selfTypedCharacterPowerAtLeast'; typeIncludes: string; power: number } // "If you have a {type} Character with N power or more"
  | { kind: 'selfCharacterCurrentPowerCount'; power: number; atLeast?: number; atMost?: number } // "if you have N Characters with M power or more"
  | { kind: 'selfLeaderPowerAtMost'; power: number } // "If your Leader has N power or less"
  | { kind: 'selfInstancePowerAtLeast'; power: number } // "If this Character/Leader has N power or more" (needs sourceInstanceId)
  | { kind: 'selfOtherNamedCharacterCount'; name: string; atMost?: number; atLeast?: number } // "no other [X] Characters" (excludes source)
  | { kind: 'selfTrashMatching'; atLeast?: number; atMost?: number; category?: Exclude<CardCategory, 'don'>; typeIncludes?: string } // "N or more Events/{type} cards in your trash"
  | { kind: 'opponentRestedCharacterCount'; atLeast?: number; atMost?: number } // "opponent has N or more rested Characters"
  | { kind: 'selfGivenDonCount'; atLeast?: number; atMost?: number } // "you have N or more given DON!!" (DON attached to your Leader/Characters)
  | { kind: 'opponentGivenDonCount'; atLeast?: number; atMost?: number } // "opponent has N or more given DON!!"
  | { kind: 'opponentHasCharacterBasePowerAtLeast'; power: number } // "opponent has a Leader or Character with base power N or more"
  | { kind: 'anyCharacterCostAtLeast'; atLeast: number } // "if there is a Character with a cost of N or more"
  | { kind: 'opponentHasCharacterExactCost'; exactCost: number } // "if your opponent has a Character with a cost of N"
  | { kind: 'selfDonReturnedThisAction'; atLeast?: number; atMost?: number } // "When N or more DON!! cards on your field are returned …"
  | { kind: 'playedCharacterNoBaseEffect' } // onCharacterPlayedFromHand: the just-played Character has no base effect
  | { kind: 'anyOf'; gates: AbilityGate[] }; // OR: satisfied if any sub-gate holds ("if Leader is X or Y")

export interface Ability {
  timing: IrTiming;
  /** Gate for whether a TRIGGERED ability fires at all ([DON!! xN] / [Your/Opponent's Turn]). */
  condition?: IrCondition;
  /** "If …" board-state preconditions (all must hold) — checked once at fire/activate time. */
  gate?: AbilityGate[];
  /** 10-2-13 [Once Per Turn] — an activated ability may only be used once per turn per source. */
  oncePerTurn?: boolean;
  /** Activation cost(s) paid on use (8-3-1-5); [Activate: Main] and [Counter] handlers pay these before resolution. */
  cost?: AbilityCost[];
  /**
   * [When this Character battles ...] attribute filter (onBattle only): the card
   * this one is battling (attacker<->defender) must be a Character whose attributes
   * include this value, e.g. ST05-010 Zephyr ("battles ＜Strike＞ Characters"). Checked in fireOnBattle.
   */
  battlingOpponentAttribute?: string;
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
