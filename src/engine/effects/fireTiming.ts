/**
 * Firing helpers the action handlers / phase steps call into. Each looks up the
 * card's curated EffectProgram in the injected registry and runs it through the
 * generic interpreter. No-op when the card has no curated program, so a firing
 * point is always safe to wire in.
 */
import type { GameState } from '../state/game';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { getOpponentId } from '../rules/shared/players';
import { runTimings, resumeProgram } from './interpreter';
import { evaluateGates, type GateEvalContext } from './gates';
import { autoSelectDonMinusIds, canPayAbilityCost, payAbilityCost } from './abilityCost';
import { recordEventActivation } from './eventActivationHistory';
import type { Ability, IrTiming, RemovedFromFieldDestination } from './effectIr';
import type { EffectTemplateRegistry } from './effectTemplate';

/** Per-instance once-per-turn key for a triggered [On Battle] ability. Cleared in the Refresh Phase. */
const ON_BATTLE_OPT_KEY = 'onBattle';
/** Per-instance once-per-turn key for [When DON!! is returned] abilities. Cleared in the Refresh Phase. */
const ON_DON_RETURNED_OPT_KEY = 'onDonReturned';
const ON_DON_GIVEN_OPT_KEY = 'onDonGiven';
/** Per-instance once-per-turn keys for reactive timings. Cleared in the Refresh Phase. */
const REACTIVE_ONCE_PER_TURN_KEYS: Partial<Record<IrTiming, string>> = {
  onOpponentEventActivated: 'onOpponentEventActivated',
  onYouEventActivated: 'onYouEventActivated',
  onOpponentBlockerActivated: 'onOpponentBlockerActivated',
  onLifeDamageDealt: 'onLifeDamageDealt',
  onDrawOutsideDrawPhase: 'onDrawOutsideDrawPhase',
  onLifeToHand: 'onLifeToHand',
  onTriggerActivated: 'onTriggerActivated',
  onCharacterKoed: 'onCharacterKoed',
  onRemovedFromField: 'onRemovedFromField',
  onCharacterPlayedFromTrash: 'onCharacterPlayedFromTrash',
  onHandTrashed: 'onHandTrashed',
};

function mergeResults(a: ActionExecuteResult, b: ActionExecuteResult): ActionExecuteResult {
  return { state: b.state, log: [...a.log, ...b.log], pendingChoices: [...a.pendingChoices, ...b.pendingChoices] };
}

function fireReactiveAbilitiesForPlayer(
  state: GameState,
  observerPlayerId: string,
  timing: IrTiming,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
  eventContext?: GateEvalContext,
  opts?: { onlyInstanceId?: string },
): ActionExecuteResult {
  const optKey = REACTIVE_ONCE_PER_TURN_KEYS[timing];
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, observerPlayerId)) {
    if (opts?.onlyInstanceId && id !== opts.onlyInstanceId) continue;
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === timing)) continue;
    for (const ability of program.abilities.filter((a) => a.timing === timing)) {
      if (optKey && ability.oncePerTurn && inst.oncePerTurnUsed.includes(optKey)) continue;
      if (!triggeredAbilityWouldFire(ability, inst, working, defs, eventContext)) continue;
      const fired = runTimings(program, [timing], working, id, defs, actionId, registry, false, eventContext);
      working = fired.state;
      log = [...log, ...fired.log];
      if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
      if (optKey && ability.oncePerTurn) {
        const updated = working.cardsById[id];
        if (updated) {
          working = {
            ...working,
            cardsById: { ...working.cardsById, [id]: { ...updated, oncePerTurnUsed: [...updated.oncePerTurnUsed, optKey] } },
          };
        }
      }
    }
  }
  return { state: working, log, pendingChoices: [] };
}

/** Fires [When your opponent activates an Event] for all in-play cards controlled by the opponent of `activatorPlayerId`. */
export function fireOpponentEventActivatedReactions(
  state: GameState,
  activatorPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const observerId = Object.keys(state.players).find((id) => id !== activatorPlayerId);
  if (!observerId) return noop(state);
  return fireReactiveAbilitiesForPlayer(state, observerId, 'onOpponentEventActivated', registry, defs, actionId);
}

/** Fires [When you activate an Event] for all in-play cards controlled by `activatorPlayerId`. */
export function fireYouEventActivatedReactions(
  state: GameState,
  activatorPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  return fireReactiveAbilitiesForPlayer(state, activatorPlayerId, 'onYouEventActivated', registry, defs, actionId);
}

/** Fires [When your opponent activates a Blocker] for the attacking player's in-play cards. */
export function fireOpponentBlockerActivatedReactions(
  state: GameState,
  attackerPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  return fireReactiveAbilitiesForPlayer(state, attackerPlayerId, 'onOpponentBlockerActivated', registry, defs, actionId);
}

/** Fires [When you deal damage to opponent's Life] for dealer's in-play cards. */
export function fireLifeDamageDealtReactions(
  state: GameState,
  dealerPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  return fireReactiveAbilitiesForPlayer(state, dealerPlayerId, 'onLifeDamageDealt', registry, defs, actionId);
}

/** Fires [When a card is added to your hand from your Life] for `playerId`'s in-play cards. */
export function fireLifeToHandReactions(
  state: GameState,
  playerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  return fireReactiveAbilitiesForPlayer(state, playerId, 'onLifeToHand', registry, defs, actionId);
}

/** Fires [When a [Trigger] activates] for every in-play card (all controllers). */
export function fireTriggerActivatedReactions(
  state: GameState,
  activatorPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const observerId of Object.keys(state.players)) {
    const fired = fireReactiveAbilitiesForPlayer(working, observerId, 'onTriggerActivated', registry, defs, actionId);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }
  return { state: working, log, pendingChoices: [] };
}

/** Fires [When you draw outside your Draw Phase] for `drawerPlayerId`'s in-play cards. */
export function fireDrawOutsideDrawPhaseReactions(
  state: GameState,
  drawerPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  if (state.currentPhase === 'draw') return noop(state);
  return fireReactiveAbilitiesForPlayer(state, drawerPlayerId, 'onDrawOutsideDrawPhase', registry, defs, actionId);
}

/** Fires leader/field reactions when a Character is played from hand. */
export function fireCharacterPlayedFromHandReactions(
  state: GameState,
  playerId: string,
  playedInstanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const eventContext: GateEvalContext = { playedCharacterInstanceId: playedInstanceId };
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, playerId)) {
    if (id === playedInstanceId) continue;
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onCharacterPlayedFromHand')) continue;
    const fired = runTimings(program, ['onCharacterPlayedFromHand'], working, id, defs, actionId, registry, false, eventContext);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }
  return { state: working, log, pendingChoices: [] };
}

/** True when the current battle's attacker is an opponent Character with the given attribute. */
export function battleAttackerIsCharacterWithAttribute(
  state: GameState,
  defs: CardDefinitionLookup,
  attribute: string,
): boolean {
  const battle = state.currentBattle;
  if (!battle) return false;
  const attacker = state.cardsById[battle.attackerInstanceId];
  const def = attacker ? defs[attacker.cardDefinitionId] : undefined;
  if (!attacker || attacker.currentZone !== 'characterArea' || def?.category !== 'character') return false;
  const needle = attribute.toLowerCase();
  return (def.attributes ?? []).some((a) => a.toLowerCase() === needle);
}

/** Fires leader/field reactions when the opponent plays a Character from hand/effect. */
export function fireOpponentCharacterPlayedFromHandReactions(
  state: GameState,
  playingPlayerId: string,
  playedInstanceId: string,
  fromCharacterEffect: boolean,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  let defendingPlayerId: string;
  try {
    defendingPlayerId = getOpponentId(state, playingPlayerId);
  } catch {
    return noop(state);
  }
  const eventContext: GateEvalContext = {
    playedCharacterInstanceId: playedInstanceId,
    playedFromCharacterEffect: fromCharacterEffect,
  };
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, defendingPlayerId)) {
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onOpponentCharacterPlayedFromHand')) continue;
    const fired = runTimings(program, ['onOpponentCharacterPlayedFromHand'], working, id, defs, actionId, registry, false, eventContext);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }
  return { state: working, log, pendingChoices: [] };
}

/** Fires leader/field reactions when a Character is played from trash. */
export function fireCharacterPlayedFromTrashReactions(
  state: GameState,
  playerId: string,
  playedInstanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const eventContext: GateEvalContext = { playedCharacterInstanceId: playedInstanceId };
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, playerId)) {
    if (id === playedInstanceId) continue;
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onCharacterPlayedFromTrash')) continue;
    const fired = runTimings(program, ['onCharacterPlayedFromTrash'], working, id, defs, actionId, registry, false, eventContext);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }
  return { state: working, log, pendingChoices: [] };
}

/** After an Event resolves, fire both observer and activator reactive windows. */
export function fireEventActivatedReactions(
  state: GameState,
  activatorPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  const you = fireYouEventActivatedReactions(working, activatorPlayerId, registry, defs, actionId);
  working = you.state;
  log = [...log, ...you.log];
  if (you.pendingChoices.length > 0) return { state: working, log, pendingChoices: you.pendingChoices };
  const opp = fireOpponentEventActivatedReactions(working, activatorPlayerId, registry, defs, actionId);
  return mergeResults({ state: working, log, pendingChoices: [] }, opp);
}

/**
 * Resolve a nested "activate the [Main] effect of an Event" without paying its
 * play cost. Used by effects like Sabo (hand) and Reiju (trash). Skips when the
 * Event's own [Main] ability cost cannot be auto-paid.
 */
export function fireNestedEventActivation(
  state: GameState,
  eventInstanceId: string,
  activatorPlayerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[eventInstanceId];
  if (!instance) return noop(state);
  const def = defs[instance.cardDefinitionId];
  if (!def || def.category !== 'event') return noop(state);
  const program = registry[instance.cardDefinitionId];
  const ability = program?.abilities.find((a) => a.timing === 'activateMain');
  if (!ability) return noop(state);

  const costs = ability.cost ?? [];
  const selectedDonMinus = autoSelectDonMinusIds(state, activatorPlayerId, costs);
  const reasons = canPayAbilityCost(state, eventInstanceId, activatorPlayerId, costs, selectedDonMinus);
  if (reasons.length > 0) return noop(state);

  let working = state;
  let log: ActionExecuteResult['log'] = [];
  if (costs.length > 0) {
    const paid = payAbilityCost(working, eventInstanceId, activatorPlayerId, costs, actionId, selectedDonMinus);
    working = paid.state;
    log = [...paid.log];
    if (paid.restedInstanceIds.length > 0 || paid.returnedDonCount > 0) {
      const cascaded = afterAbilityCostPaid(working, activatorPlayerId, paid, registry, defs, actionId);
      working = cascaded.state;
      log = [...log, ...cascaded.log];
      if (cascaded.pendingChoices.length > 0) {
        return { state: working, log, pendingChoices: cascaded.pendingChoices };
      }
    }
  }

  working = recordEventActivation(working, activatorPlayerId, eventInstanceId, defs);

  const fired = fireActivate(working, eventInstanceId, registry, defs, actionId);
  working = fired.state;
  log = [...log, ...fired.log];
  if (fired.pendingChoices.length > 0) {
    return { state: working, log, pendingChoices: fired.pendingChoices };
  }
  const reactive = fireEventActivatedReactions(working, activatorPlayerId, registry, defs, actionId);
  return mergeResults({ state: working, log, pendingChoices: [] }, reactive);
}

function fieldInstanceIds(state: GameState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) return [];
  return [
    player.leaderInstanceId,
    ...player.characterArea.cardIds,
    ...(player.stageArea?.cardIds ?? []),
  ].filter((id): id is string => !!id);
}

function noop(state: GameState): ActionExecuteResult {
  return { state, log: [], pendingChoices: [] };
}

/**
 * Whether a triggered ability's [DON!! xN] / [Your Turn] / "If <board state>"
 * gate holds right now, evaluated against `source`. Mirrors the interpreter's
 * own condition/gate checks so once-per-turn is only consumed when the ability
 * would actually resolve.
 */
function triggeredAbilityWouldFire(
  ability: Ability,
  source: { donAttached: string[]; ownerId: string; controllerId: string },
  state: GameState,
  defs: CardDefinitionLookup,
  eventContext?: GateEvalContext,
): boolean {
  const c = ability.condition;
  if (c) {
    if (c.donAttachedAtLeast !== undefined && source.donAttached.length < c.donAttachedAtLeast) return false;
    if (c.turn !== undefined) {
      const isOwnersTurn = state.activePlayerId === source.ownerId;
      if (c.turn === 'your' && !isOwnersTurn) return false;
      if (c.turn === 'opponent' && isOwnersTurn) return false;
    }
    if (c.gate && !evaluateGates(c.gate, state, defs, source.controllerId, undefined, eventContext)) return false;
  }
  if (ability.gate?.length && !evaluateGates(ability.gate, state, defs, source.controllerId, undefined, eventContext)) return false;
  return true;
}

/**
 * Fires a card's entry-time abilities (onEnterPlay statics then onPlay
 * triggers, 8-1-3-3 / 8-1-3-1). Call AFTER the card resolves into play.
 */
export function fireOnPlay(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['onEnterPlay', 'onPlay'], state, instanceId, defs, actionId, registry);
}

/**
 * Fires a card's [Activate: Main] ability (8-1-3-2). Called by the
 * ACTIVATE_CARD_EFFECT handler after its structural validation passes.
 */
export function fireActivate(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['activateMain'], state, instanceId, defs, actionId, registry, false);
}

/**
 * Fires a card's [When Attacking] ability (8-1-3, timing whenAttacking). Call
 * from DECLARE_ATTACK once the Battle is set up, with the attacker as source.
 */
export function fireWhenAttacking(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['whenAttacking'], state, instanceId, defs, actionId, registry);
}

/**
 * Fires a card's [On Block] ability. Call after a Character successfully
 * activates [Blocker] and becomes the battle target.
 */
export function fireOnBlock(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['onBlock'], state, instanceId, defs, actionId, registry);
}

/**
 * Fires a card's [On Your Opponent's Attack] ability (timing 'onOpponentsAttack').
 * Called from the ACTIVATE_ON_OPPONENTS_ATTACK handler after the ability's cost is
 * paid, during the defending player's Block-Step window.
 */
export function fireOnOpponentsAttack(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  const ability = program.abilities.find((a) => a.timing === 'onOpponentsAttack');
  if (ability?.battlingOpponentAttribute && !battleAttackerIsCharacterWithAttribute(state, defs, ability.battlingOpponentAttribute)) {
    return noop(state);
  }
  return runTimings(program, ['onOpponentsAttack'], state, instanceId, defs, actionId, registry, false);
}

/**
 * Fires a card's [On K.O.] ability (10-2-17, timing onKO). Call AFTER the card
 * has been moved to the trash, with the K.O.'d card as source.
 */
export function fireOnKO(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
  koContext?: { cause: 'battle' | 'effect'; sourceInstanceId?: string },
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  const eventContext: GateEvalContext | undefined = koContext
    ? { koCause: koContext.cause, koSourceInstanceId: koContext.sourceInstanceId }
    : undefined;
  return runTimings(program, ['onKO'], state, instanceId, defs, actionId, registry, true, eventContext);
}

/**
 * Fires a card's [Counter] ability (7-1-3, timing counter). Call from the
 * ACTIVATE_COUNTER_EVENT handler after the event is paid for and trashed.
 */
export function fireCounter(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['counter'], state, instanceId, defs, actionId, registry, false);
}

/**
 * Fires a Life card's [Trigger] ability (10-1-5-2, timing 'lifeTrigger'). Called
 * when the defending player chooses to activate a revealed [Trigger] Life card.
 */
export function fireLifeTrigger(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['lifeTrigger'], state, instanceId, defs, actionId, registry);
}

/**
 * Fires a card's [When this Character battles ...] ability (timing 'onBattle').
 * Call from the Damage Step with the ATTACKER as source, only when the battle's
 * target is an opponent Character. Enforces [Once Per Turn] (10-2-13) itself,
 * since this is a triggered ability (no ACTIVATE handler to track it).
 */
export function fireOnBattle(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  const ability = program.abilities.find((a) => a.timing === 'onBattle' && !a.requiresOpponentKoed);
  if (!ability) return noop(state);
  // [When this Character battles <attribute> Characters]: the OTHER battler (attacker<->defender
  // relative to this source) must be a Character carrying the required attribute.
  if (ability.battlingOpponentAttribute) {
    const battle = state.currentBattle;
    if (!battle) return noop(state);
    const opposingId = battle.attackerInstanceId === instanceId ? battle.targetInstanceId : battle.attackerInstanceId;
    const oppInst = state.cardsById[opposingId];
    const oppDef = oppInst ? defs[oppInst.cardDefinitionId] : undefined;
    const needle = ability.battlingOpponentAttribute.toLowerCase();
    const isOpposingCharacter = oppInst?.currentZone === 'characterArea' && oppDef?.category === 'character';
    if (!isOpposingCharacter || !(oppDef?.attributes ?? []).some((a) => a.toLowerCase() === needle)) return noop(state);
  }
  // Gate + once-per-turn are checked here so the flag is only consumed on a real fire.
  if (!triggeredAbilityWouldFire(ability, instance, state, defs)) return noop(state);
  if (ability.oncePerTurn && instance.oncePerTurnUsed.includes(ON_BATTLE_OPT_KEY)) return noop(state);

  const result = runTimings(program, ['onBattle'], state, instanceId, defs, actionId, registry);
  if (!ability.oncePerTurn) return result;
  const fired = result.state.cardsById[instanceId];
  if (!fired) return result;
  return {
    ...result,
    state: { ...result.state, cardsById: { ...result.state.cardsById, [instanceId]: { ...fired, oncePerTurnUsed: [...fired.oncePerTurnUsed, ON_BATTLE_OPT_KEY] } } },
  };
}

/**
 * Fires a card's deferred [When this Character battles and K.O.'s ...] ability
 * (timing 'onBattle' + requiresOpponentKoed). Call from the Damage Step after an
 * opponent Character is K.O.'d, with the battler who scored the K.O. as source.
 */
export function fireOnBattleKoedOpponent(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance || instance.currentZone !== 'characterArea') return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  const ability = program.abilities.find((a) => a.timing === 'onBattle' && a.requiresOpponentKoed);
  if (!ability) return noop(state);
  if (!triggeredAbilityWouldFire(ability, instance, state, defs)) return noop(state);
  if (ability.oncePerTurn && instance.oncePerTurnUsed.includes(ON_BATTLE_OPT_KEY)) return noop(state);

  const result = runTimings(program, ['onBattle'], state, instanceId, defs, actionId, registry);
  if (!ability.oncePerTurn) return result;
  const fired = result.state.cardsById[instanceId];
  if (!fired) return result;
  return {
    ...result,
    state: { ...result.state, cardsById: { ...result.state.cardsById, [instanceId]: { ...fired, oncePerTurnUsed: [...fired.oncePerTurnUsed, ON_BATTLE_OPT_KEY] } } },
  };
}

/**
 * Fires every [End of Your Turn] ability (timing 'endOfTurn') for the cards
 * `playerId` controls, in board order, during their End Phase.
 *
 * KNOWN LIMITATION: the automatic phase cascade cannot pause for input, so an
 * end-of-turn effect that emits a PendingChoice is left on state.pendingChoices
 * but not interactively resolved mid-handoff. No current card needs a choice
 * here (ST02-013 is a no-choice self set-active).
 */
export function fireEndOfTurn(
  state: GameState,
  playerId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const player = state.players[playerId];
  if (!player) return noop(state);
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  let pendingChoices: ActionExecuteResult['pendingChoices'] = [];
  const ids = [player.leaderInstanceId, ...player.characterArea.cardIds, ...player.stageArea.cardIds];
  for (const id of ids) {
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program || !program.abilities.some((a) => a.timing === 'endOfTurn')) continue;
    const res = runTimings(program, ['endOfTurn'], working, id, defs, actionId, registry);
    working = res.state;
    log = [...log, ...res.log];
    pendingChoices = [...pendingChoices, ...res.pendingChoices];
  }
  return { state: working, log, pendingChoices };
}

/**
 * Characters that were in play in `before` and are now in the trash in `after`
 * (i.e. K.O.'d this action), tagged with their pre-K.O. controller so reactive
 * windows can ask "was it YOUR opponent's Character?".
 */
function charactersKoedBetween(before: GameState, after: GameState): { controllerId: string }[] {
  const out: { controllerId: string }[] = [];
  for (const playerId of Object.keys(before.players)) {
    for (const id of before.players[playerId].characterArea.cardIds) {
      if (after.cardsById[id]?.currentZone === 'trash') {
        out.push({ controllerId: before.cardsById[id]?.controllerId ?? playerId });
      }
    }
  }
  return out;
}

/**
 * Fires reactive [When a Character is K.O.'d] abilities (timing 'onCharacterKoed'),
 * once per Character K.O.'d over the course of an action (battle OR effect). Called
 * from the dispatcher with the pre-action and post-action states so a single choke
 * point catches every K.O. source. Each card's own [Your Turn]/gate condition still
 * filters whether it actually resolves (e.g. ST08-001 fires only on its owner's turn,
 * OP01-061 only when the K.O.'d Character was the opponent's via koedCharacterController).
 * [Once Per Turn] is enforced so a card fires at most once even if several Characters
 * are K.O.'d in the same action.
 */
export function fireCharacterKoedReactions(
  before: GameState,
  after: GameState,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const koed = charactersKoedBetween(before, after);
  if (koed.length === 0) return noop(after);
  let working = after;
  let log: ActionExecuteResult['log'] = [];
  for (const { controllerId } of koed) {
    const eventContext: GateEvalContext = { koedCharacterControllerId: controllerId };
    for (const observerId of Object.keys(working.players)) {
      const res = fireReactiveAbilitiesForPlayer(working, observerId, 'onCharacterKoed', registry, defs, actionId, eventContext);
      working = res.state;
      log = [...log, ...res.log];
      if (res.pendingChoices.length > 0) return { state: working, log, pendingChoices: res.pendingChoices };
    }
  }
  return { state: working, log, pendingChoices: [] };
}

/**
 * Fires [When this Character becomes rested] abilities (timing onRested) for each
 * instance that just transitioned active→rested. Called after attack declaration,
 * activation costs, and from finishWithCascade when rest() ops resolve.
 */
export function fireRestTransitions(
  state: GameState,
  restedInstanceIds: readonly string[],
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  if (restedInstanceIds.length === 0) return noop(state);
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  const seen = new Set<string>();
  for (const id of restedInstanceIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const inst = working.cardsById[id];
    if (!inst || inst.orientation !== 'rested') continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onRested')) continue;
    const fired = runTimings(program, ['onRested'], working, id, defs, actionId, registry, false);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }
  return { state: working, log, pendingChoices: [] };
}

/**
 * Fires [When DON!! on your field is returned to your DON!! deck] abilities
 * (timing onDonReturned) for each in-play card controlled by `playerId`.
 * Called after effect-sourced DON!! −N costs resolve.
 */
export function fireDonReturnedReactions(
  state: GameState,
  playerId: string,
  returnedDonCount: number,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  if (returnedDonCount <= 0) return noop(state);
  const eventContext: GateEvalContext = { donReturnedCount: returnedDonCount };
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, playerId)) {
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onDonReturned')) continue;
    const abilities = program.abilities.filter((a) => a.timing === 'onDonReturned');
    for (const ability of abilities) {
      if (ability.oncePerTurn && inst.oncePerTurnUsed.includes(ON_DON_RETURNED_OPT_KEY)) continue;
      if (!triggeredAbilityWouldFire(ability, inst, working, defs, eventContext)) continue;
      const fired = runTimings(program, ['onDonReturned'], working, id, defs, actionId, registry, false, eventContext);
      working = fired.state;
      log = [...log, ...fired.log];
      if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
      if (ability.oncePerTurn) {
        const updated = working.cardsById[id];
        if (updated) {
          working = {
            ...working,
            cardsById: {
              ...working.cardsById,
              [id]: { ...updated, oncePerTurnUsed: [...updated.oncePerTurnUsed, ON_DON_RETURNED_OPT_KEY] },
            },
          };
        }
      }
    }
  }
  return { state: working, log, pendingChoices: [] };
}

/**
 * Fires [When … is given a DON!! card] abilities (timing onDonGiven) for each
 * in-play card controlled by `playerId` after DON!! is given to `targetInstanceId`.
 */
export function fireDonGivenReactions(
  state: GameState,
  playerId: string,
  targetInstanceId: string,
  donGivenCount: number,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  if (donGivenCount <= 0) return noop(state);
  const eventContext: GateEvalContext = { donGivenTargetInstanceId: targetInstanceId, donGivenCount };
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, playerId)) {
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onDonGiven')) continue;
    const abilities = program.abilities.filter((a) => a.timing === 'onDonGiven');
    for (const ability of abilities) {
      if (ability.oncePerTurn && inst.oncePerTurnUsed.includes(ON_DON_GIVEN_OPT_KEY)) continue;
      if (!triggeredAbilityWouldFire(ability, inst, working, defs, eventContext)) continue;
      const fired = runTimings(program, ['onDonGiven'], working, id, defs, actionId, registry, false, eventContext);
      working = fired.state;
      log = [...log, ...fired.log];
      if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
      if (ability.oncePerTurn) {
        const updated = working.cardsById[id];
        if (updated) {
          working = {
            ...working,
            cardsById: {
              ...working.cardsById,
              [id]: { ...updated, oncePerTurnUsed: [...updated.oncePerTurnUsed, ON_DON_GIVEN_OPT_KEY] },
            },
          };
        }
      }
    }
  }
  return { state: working, log, pendingChoices: [] };
}

export interface FieldRemovalEvent {
  targetInstanceId: string;
  removedControllerId: string;
  effectControllerId: string;
  removedToZone: RemovedFromFieldDestination;
}

/**
 * Fires [When a Character is removed from the field by an effect] abilities
 * (timing onRemovedFromField) for every in-play card that can observe the event.
 */
export function fireRemovedFromFieldReactions(
  state: GameState,
  event: FieldRemovalEvent,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const eventContext: GateEvalContext = {
    removedFromFieldInstanceId: event.targetInstanceId,
    removedFromFieldControllerId: event.removedControllerId,
    removedByEffectControllerId: event.effectControllerId,
    removedToZone: event.removedToZone,
  };
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const observerId of Object.keys(working.players)) {
    const res = fireReactiveAbilitiesForPlayer(working, observerId, 'onRemovedFromField', registry, defs, actionId, eventContext);
    working = res.state;
    log = [...log, ...res.log];
    if (res.pendingChoices.length > 0) return { state: working, log, pendingChoices: res.pendingChoices };
  }
  return { state: working, log, pendingChoices: [] };
}

/** Cascade [When Becomes Rested] and [When DON!! Returned] after an ability cost is paid. */
export function afterAbilityCostPaid(
  state: GameState,
  playerId: string,
  paid: { restedInstanceIds: readonly string[]; returnedDonCount: number },
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  if (paid.restedInstanceIds.length > 0) {
    const rested = fireRestTransitions(state, paid.restedInstanceIds, registry, defs, actionId);
    if (rested.pendingChoices.length > 0) return rested;
    if (paid.returnedDonCount > 0) {
      const donReturned = fireDonReturnedReactions(rested.state, playerId, paid.returnedDonCount, registry, defs, actionId);
      return { state: donReturned.state, log: [...rested.log, ...donReturned.log], pendingChoices: donReturned.pendingChoices };
    }
    return rested;
  }
  return fireDonReturnedReactions(state, playerId, paid.returnedDonCount, registry, defs, actionId);
}

/** Fires [When a card is trashed from your hand by your card's effect] for the hand owner. */
export function fireHandTrashedReactions(
  state: GameState,
  event: { ownerId: string; count: number; effectSourceInstanceId: string },
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  if (event.count <= 0) return noop(state);
  const eventContext: GateEvalContext = {
    handTrashedCount: event.count,
    handTrashEffectSourceInstanceId: event.effectSourceInstanceId,
  };
  return fireReactiveAbilitiesForPlayer(state, event.ownerId, 'onHandTrashed', registry, defs, actionId, eventContext);
}

/** Fires optional [Start of your turn] activations for the active player's in-play cards. */
export function fireStartOfTurnReactions(
  state: GameState,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const playerId = state.activePlayerId;
  let working = state;
  let log: ActionExecuteResult['log'] = [];
  for (const id of fieldInstanceIds(working, playerId)) {
    const inst = working.cardsById[id];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    if (!program?.abilities.some((a) => a.timing === 'onStartOfTurn')) continue;
    for (const ability of program.abilities.filter((a) => a.timing === 'onStartOfTurn')) {
      if (!triggeredAbilityWouldFire(ability, inst, working, defs)) continue;
      if (ability.optionalActivate) {
        working = {
          ...working,
          pendingChoices: [
            ...working.pendingChoices,
            {
              id: `${id}:start-of-turn:${ability.timing}:${working.pendingChoices.length}`,
              playerId,
              kind: 'YES_NO',
              prompt: `Activate start-of-turn effect on ${id}?`,
              constraints: { min: 0, max: 1 },
              sourceInstanceId: id,
              sourceEffectId: 'ir',
              resumeState: {
                abilityIndex: program.abilities.indexOf(ability),
                opIndex: -2,
                bindings: {},
              },
            },
          ],
        };
        return { state: working, log, pendingChoices: working.pendingChoices.slice(-1) };
      }
      const fired = runTimings(program, ['onStartOfTurn'], working, id, defs, actionId, registry, false);
      working = fired.state;
      log = [...log, ...fired.log];
      if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
    }
  }
  return { state: working, log, pendingChoices: [] };
}

/**
 * Resumes a suspended EffectProgram after its PendingChoice (sourceEffectId
 * 'ir') is answered. Called by the generic RESOLVE_PENDING_CHOICE handler.
 */
export function resumeChoice(
  state: GameState,
  choiceId: string,
  response: string[] | number | boolean,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const choice = state.pendingChoices.find((c) => c.id === choiceId);
  if (!choice || choice.sourceEffectId !== 'ir' || !choice.sourceInstanceId) return noop(state);
  const instance = state.cardsById[choice.sourceInstanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return resumeProgram(program, state, choice, response, defs, actionId, registry);
}
