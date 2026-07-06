/**
 * Firing helpers the action handlers / phase steps call into. Each looks up the
 * card's curated EffectProgram in the injected registry and runs it through the
 * generic interpreter. No-op when the card has no curated program, so a firing
 * point is always safe to wire in.
 */
import type { GameState } from '../state/game';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { runTimings, resumeProgram } from './interpreter';
import { evaluateGates } from './gates';
import type { Ability } from './effectIr';
import type { EffectTemplateRegistry } from './effectTemplate';

/** Per-instance once-per-turn key for a triggered [On Battle] ability. Cleared in the Refresh Phase. */
const ON_BATTLE_OPT_KEY = 'onBattle';

function noop(state: GameState): ActionExecuteResult {
  return { state, log: [], pendingChoices: [] };
}

/**
 * Whether a triggered ability's [DON!! xN] / [Your Turn] / "If <board state>"
 * gate holds right now, evaluated against `source`. Mirrors the interpreter's
 * own condition/gate checks so once-per-turn is only consumed when the ability
 * would actually resolve.
 */
function triggeredAbilityWouldFire(ability: Ability, source: { donAttached: string[]; ownerId: string; controllerId: string }, state: GameState, defs: CardDefinitionLookup): boolean {
  const c = ability.condition;
  if (c) {
    if (c.donAttachedAtLeast !== undefined && source.donAttached.length < c.donAttachedAtLeast) return false;
    if (c.turn !== undefined) {
      const isOwnersTurn = state.activePlayerId === source.ownerId;
      if (c.turn === 'your' && !isOwnersTurn) return false;
      if (c.turn === 'opponent' && isOwnersTurn) return false;
    }
    if (c.gate && !evaluateGates(c.gate, state, defs, source.controllerId)) return false;
  }
  if (ability.gate?.length && !evaluateGates(ability.gate, state, defs, source.controllerId)) return false;
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
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTimings(program, ['onKO'], state, instanceId, defs, actionId, registry);
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
  const ability = program.abilities.find((a) => a.timing === 'onBattle');
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

/** Count Characters that were in play in `before` and are now in the trash in `after` (i.e. K.O.'d this action). */
function charactersKoedBetween(before: GameState, after: GameState): number {
  let count = 0;
  for (const playerId of Object.keys(before.players)) {
    for (const id of before.players[playerId].characterArea.cardIds) {
      if (after.cardsById[id]?.currentZone === 'trash') count += 1;
    }
  }
  return count;
}

/**
 * Fires reactive [When a Character is K.O.'d] abilities (timing 'onCharacterKoed'),
 * once per Character K.O.'d over the course of an action (battle OR effect). Called
 * from the dispatcher with the pre-action and post-action states so a single choke
 * point catches every K.O. source. Each card's own [Your Turn]/gate condition still
 * filters whether it actually resolves (e.g. ST08-001 fires only on its owner's turn).
 */
export function fireCharacterKoedReactions(
  before: GameState,
  after: GameState,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const koCount = charactersKoedBetween(before, after);
  if (koCount === 0) return noop(after);
  let working = after;
  let log: ActionExecuteResult['log'] = [];
  let pendingChoices: ActionExecuteResult['pendingChoices'] = [];
  for (let i = 0; i < koCount; i += 1) {
    for (const playerId of Object.keys(working.players)) {
      const player = working.players[playerId];
      for (const id of [player.leaderInstanceId, ...player.characterArea.cardIds]) {
        const inst = working.cardsById[id];
        if (!inst) continue;
        const program = registry[inst.cardDefinitionId];
        if (!program || !program.abilities.some((a) => a.timing === 'onCharacterKoed')) continue;
        const res = runTimings(program, ['onCharacterKoed'], working, id, defs, actionId, registry);
        working = res.state;
        log = [...log, ...res.log];
        pendingChoices = [...pendingChoices, ...res.pendingChoices];
      }
    }
  }
  return { state: working, log, pendingChoices };
}

/**
 * Resumes a suspended EffectProgram after its PendingChoice (sourceEffectId
 * 'ir') is answered. Called by the generic RESOLVE_PENDING_CHOICE handler.
 */
export function resumeChoice(
  state: GameState,
  choiceId: string,
  response: string[] | number,
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
