/**
 * The generic effect interpreter (VM).
 *
 * ONE function set executes every card's curated EffectProgram (effectIr.ts)
 * against game state, via the EffectContext instruction set. There is no
 * per-card code anywhere. A `chooseTargets` op suspends the program by emitting
 * a PendingChoice that carries a serializable resume point; RESOLVE_PENDING_-
 * CHOICE later calls resumeProgram to continue from exactly that op with the
 * player's selection bound.
 */
import type { GameState } from '../state/game';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import type { PendingChoice } from '../events/pendingChoice';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { cardHasNoBaseEffect } from './cardHasNoBaseEffect';
import { nameMatches } from '../state/card';
import { computeCurrentPower } from '../rules/shared/power';
import { buildKoReplacementConfirmChoice, findKoReplacementRecord, resolveKoReplacementStep, findRestReplacementRecord, buildRestReplacementConfirmChoice, buildRestReplacementPayChoice, applyRestReplacementCost } from '../rules/shared/koAttempt';
import type { KoReplacementTrigger } from '../state/game';
import { EffectContextImpl } from './effectContext';
import { evaluateGates, countSelfTypedCharacters } from './gates';
import { canPayAbilityCost, donMinusCandidateIds, fieldDonIds, payAbilityCost, requiredDonMinusCount } from './abilityCost';
import { afterAbilityCostPaid, fireOnKO, fireRestTransitions, fireCharacterRestedReactions, fireDrawOutsideDrawPhaseReactions, fireDonGivenReactions, fireRemovedFromFieldReactions, fireNestedEventActivation, fireCharacterPlayedFromTrashReactions, fireCharacterPlayedFromHandReactions, fireOpponentCharacterPlayedFromHandReactions, fireHandTrashedReactions, fireLifeDamageDealtReactions, fireLifeToHandReactions } from './fireTiming';
import { dealLifeDamage } from '../rules/shared/dealLifeDamage';
import { isAbilityNegated } from './effectNegation';
import type { GateEvalContext } from './gates';
import type { EffectTemplateRegistry } from './effectTemplate';
import type { Ability, EffectOp, EffectProgram, IrCondition, IrTiming, NonSuspendingEffectOp, SearchFilter, SearchPickDestination, SearchRemainderDestination, Selector } from './effectIr';

interface OpResult {
  selectedIds: string[];
  movedIds: string[];
}

const EMPTY_RESULT: OpResult = { selectedIds: [], movedIds: [] };

function boolBinding(value: boolean): string[] {
  return [value ? 'true' : 'false'];
}

function conditionMet(op: EffectOp, bindings: Record<string, string[]>, ctx: EffectContextImpl, defs: CardDefinitionLookup): boolean {
  if (op.ifPrevious === 'previousSelectedAny' && bindings.__lastSelected?.[0] !== 'true') return false;
  if (op.ifPrevious === 'previousMovedAny' && bindings.__lastMoved?.[0] !== 'true') return false;
  if (op.ifPrevious === 'previousRevealMatched' && bindings.__lastRevealMatched?.[0] !== 'true') return false;
  if (op.ifPreviousMovedAnyCostAtLeast !== undefined) {
    const ids = bindings.__lastMovedIds ?? [];
    const matched = ids.some((id) => {
      const inst = ctx.state().cardsById[id];
      return (inst ? defs[inst.cardDefinitionId]?.baseCost ?? -1 : -1) >= op.ifPreviousMovedAnyCostAtLeast!;
    });
    if (!matched) return false;
  }
  if (op.ifPreviousSelectedPowerAtMost !== undefined) {
    const ids = bindings.t ?? [];
    const matched = ids.some((id) => computeCurrentPower(defs, ctx.state(), id) <= op.ifPreviousSelectedPowerAtMost!);
    if (!matched) return false;
  }
  if (op.ifGate?.length && !evaluateGates(op.ifGate, ctx.state(), defs, ctx.controllerId, ctx.sourceInstanceId, { bindings })) return false;
  return true;
}

function withResultBindings(bindings: Record<string, string[]>, result: OpResult): Record<string, string[]> {
  const movedInstanceIds = result.movedIds.filter((id) => !id.startsWith('__'));
  return {
    ...bindings,
    __lastSelected: boolBinding(result.selectedIds.length > 0),
    __lastMoved: boolBinding(result.movedIds.length > 0),
    __lastMovedIds: movedInstanceIds,
  };
}

/**
 * After a resolution finishes WITHOUT suspending, fire [On K.O.] (10-2-17) for
 * every Character it K.O.'d, in order — a card K.O.'d by an effect triggers its
 * own onKO, which may itself K.O. more (chained). Each onKO runs as its own
 * source. If an onKO suspends on a choice, we stop and return it (its resume,
 * via resumeChoice→resumeProgram, runs that program's own cascade); any not-yet-
 * processed K.O.s after a suspending onKO are not cascaded (rare edge).
 */
function finishWithCascade(
  ctx: EffectContextImpl,
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  const first = ctx.finish();
  // Suspended (a choice is outstanding): the K.O.s, if any, cascade after resume.
  if (first.pendingChoices.length > 0) return first;

  let working = first.state;
  let log = [...first.log];
  const queue = ctx.takeKoed();
  let guard = 0;
  while (queue.length > 0 && guard++ < 200) {
    const event = queue.shift()!;
    const inst = working.cardsById[event.targetInstanceId];
    const program = inst ? registry[inst.cardDefinitionId] : undefined;
    if (!program?.abilities.some((a) => a.timing === 'onKO')) continue;
    const eventContext: GateEvalContext = {
      koCause: event.cause,
      koSourceInstanceId: event.sourceInstanceId,
    };
    const subRes = runTimings(program, ['onKO'], working, event.targetInstanceId, defs, actionId, registry, true, eventContext);
    working = subRes.state;
    log = [...log, ...subRes.log];
    if (subRes.pendingChoices.length > 0) return { state: working, log, pendingChoices: subRes.pendingChoices };
  }

  const restedQueue = ctx.takeRested();
  guard = 0;
  while (restedQueue.length > 0 && guard++ < 200) {
    const event = restedQueue.shift()!;
    const eventContext: GateEvalContext = {
      restCause: event.cause,
      restSourceInstanceId: event.sourceInstanceId,
    };
    const inst = working.cardsById[event.targetInstanceId];
    const program = inst ? registry[inst.cardDefinitionId] : undefined;
    if (program?.abilities.some((a) => a.timing === 'onRested')) {
      // Pay costs (DON!! −N / trashThis / …) the same as onKO cascade — many onRested texts are "you may pay …".
      const subRes = runTimings(program, ['onRested'], working, event.targetInstanceId, defs, actionId, registry, true, eventContext);
      working = subRes.state;
      log = [...log, ...subRes.log];
      if (subRes.pendingChoices.length > 0) return { state: working, log, pendingChoices: subRes.pendingChoices };
    }
    // Board-wide "If a Character is rested by your effect" watchers (OP07-031 / OP10-036).
    const board = fireCharacterRestedReactions(working, event, registry, defs, actionId);
    working = board.state;
    log = [...log, ...board.log];
    if (board.pendingChoices.length > 0) return { state: working, log, pendingChoices: board.pendingChoices };
  }

  const donGivenQueue = ctx.takeDonGiven();
  guard = 0;
  while (donGivenQueue.length > 0 && guard++ < 200) {
    const event = donGivenQueue.shift()!;
    const target = working.cardsById[event.targetInstanceId];
    if (!target) continue;
    const fired = fireDonGivenReactions(working, target.controllerId, event.targetInstanceId, event.count, registry, defs, actionId);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }

  const removalQueue = ctx.takeFieldRemovals();
  guard = 0;
  while (removalQueue.length > 0 && guard++ < 200) {
    const event = removalQueue.shift()!;
    const removed = fireRemovedFromFieldReactions(working, event, registry, defs, actionId);
    working = removed.state;
    log = [...log, ...removed.log];
    if (removed.pendingChoices.length > 0) return { state: working, log, pendingChoices: removed.pendingChoices };
  }

  const eventQueue = ctx.takePendingEventActivations();
  guard = 0;
  while (eventQueue.length > 0 && guard++ < 200) {
    const eventId = eventQueue.shift()!;
    const inst = working.cardsById[eventId];
    if (!inst) continue;
    const fired = fireNestedEventActivation(working, eventId, inst.controllerId, registry, defs, actionId);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }

  const playedCharacterQueue = ctx.takePlayedCharacters();
  const playedCharacterEntryQueue = [...playedCharacterQueue];
  guard = 0;
  while (playedCharacterEntryQueue.length > 0 && guard++ < 200) {
    const event = playedCharacterEntryQueue.shift()!;
    const inst = working.cardsById[event.instanceId];
    const program = inst ? registry[inst.cardDefinitionId] : undefined;
    if (!program?.abilities.some((a) => a.timing === 'onEnterPlay' || a.timing === 'onPlay')) continue;
    const fired = runTimings(program, ['onEnterPlay', 'onPlay'], working, event.instanceId, defs, actionId, registry);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) {
      // This card's On Play suspended for input. Any characters that entered
      // play alongside it (same effect, e.g. OP13-082's 5 cards) still owe
      // their own entry triggers — persist them on state so they aren't lost
      // across the client round-trip. settleEntryTriggers (dispatch.ts) fires
      // them, in order, once this card's choice chain resolves.
      const remaining = playedCharacterEntryQueue.map((e) => e.instanceId);
      const deferred =
        remaining.length > 0
          ? { ...working, pendingEntryTriggers: [...(working.pendingEntryTriggers ?? []), ...remaining] }
          : working;
      return { state: deferred, log, pendingChoices: fired.pendingChoices };
    }
  }

  const playedFromTrashQueue = ctx.takePlayedFromTrash();
  guard = 0;
  while (playedFromTrashQueue.length > 0 && guard++ < 200) {
    const id = playedFromTrashQueue.shift()!;
    const inst = working.cardsById[id];
    if (!inst) continue;
    const fired = fireCharacterPlayedFromTrashReactions(working, inst.controllerId, id, registry, defs, actionId);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }

  const handTrashedQueue = ctx.takeHandTrashed();
  guard = 0;
  while (handTrashedQueue.length > 0 && guard++ < 200) {
    const event = handTrashedQueue.shift()!;
    const fired = fireHandTrashedReactions(working, event, registry, defs, actionId);
    working = fired.state;
    log = [...log, ...fired.log];
    if (fired.pendingChoices.length > 0) return { state: working, log, pendingChoices: fired.pendingChoices };
  }

  const playedCharacterReactionQueue = [...playedCharacterQueue];
  guard = 0;
  while (playedCharacterReactionQueue.length > 0 && guard++ < 200) {
    const event = playedCharacterReactionQueue.shift()!;
    const samePlayer = fireCharacterPlayedFromHandReactions(working, event.controllerId, event.instanceId, registry, defs, actionId);
    working = samePlayer.state;
    log = [...log, ...samePlayer.log];
    if (samePlayer.pendingChoices.length > 0) return { state: working, log, pendingChoices: samePlayer.pendingChoices };
    const opponent = fireOpponentCharacterPlayedFromHandReactions(
      working,
      event.controllerId,
      event.instanceId,
      event.fromCharacterEffect,
      registry,
      defs,
      actionId,
    );
    working = opponent.state;
    log = [...log, ...opponent.log];
    if (opponent.pendingChoices.length > 0) return { state: working, log, pendingChoices: opponent.pendingChoices };
  }

  return { state: working, log, pendingChoices: [] };
}

/** From a set of card instance ids, those whose definition satisfies a filter (all present fields ANDed). */
function hasType(defTypes: string[], required: string): boolean {
  const normalized = required.toLowerCase();
  return defTypes.some((type) =>
    type
      .split(/[\/,]+/)
      .map((part) => part.trim().toLowerCase())
      .some((part) => part.includes(normalized))
  );
}

function matchesSearchFilter(id: string, filter: SearchFilter, ctx: EffectContextImpl, bindings: Record<string, string[]> = {}): boolean {
  const def = ctx.definitionOf(id);
  if (!def) return false;
  if (filter.anyOf !== undefined && !filter.anyOf.some((child) => matchesSearchFilter(id, child, ctx, bindings))) return false;
  const selfName = ctx.definitionOf(ctx.sourceInstanceId)?.name;
  if (filter.typeIncludes && !hasType(def.types, filter.typeIncludes)) return false;
  if (filter.excludeSelfName && selfName !== undefined && nameMatches(def, selfName)) return false;
  if (filter.excludeCardNames?.includes(def.name)) return false;
  if (filter.category && def.category !== filter.category) return false;
  if (filter.color && !def.colors.includes(filter.color)) return false;
  if (filter.excludeColorsOfPreviousMove) {
    const movedIds = bindings.__lastMovedIds ?? [];
    const excludedColors = new Set(
      movedIds.flatMap((movedId) => ctx.definitionOf(movedId)?.colors ?? []),
    );
    if (excludedColors.size > 0 && def.colors.some((c) => excludedColors.has(c))) return false;
  }
  if (filter.nameMatchesPreviousMove) {
    const movedIds = bindings.__lastMovedIds ?? [];
    const movedNames = movedIds
      .map((movedId) => ctx.definitionOf(movedId)?.name)
      .filter((n): n is string => !!n);
    if (movedNames.length === 0 || !movedNames.some((n) => nameMatches(def, n))) return false;
  }
  if (filter.excludeIdsFromVar !== undefined) {
    const exclude = new Set(bindings[filter.excludeIdsFromVar] ?? []);
    if (exclude.has(id)) return false;
  }
  if (filter.attribute && !def.attributes?.includes(filter.attribute)) return false;
  if (filter.name && !nameMatches(def, filter.name)) return false;
  const maxCost = effectiveMaxCost(filter, ctx);
  if (maxCost !== undefined && (def.baseCost ?? Infinity) > maxCost) return false;
  if (filter.minCost !== undefined && (def.baseCost ?? -Infinity) < filter.minCost) return false;
  if (filter.exactCost !== undefined && (def.baseCost ?? -1) !== filter.exactCost) return false;
  if (filter.maxPower !== undefined && (def.basePower ?? Infinity) > filter.maxPower) return false;
  if (filter.minPower !== undefined && (def.basePower ?? -Infinity) < filter.minPower) return false;
  if (filter.exactPower !== undefined && (def.basePower ?? -1) !== filter.exactPower) return false;
  if (filter.maxBasePower !== undefined && (def.basePower ?? Infinity) > filter.maxBasePower) return false;
  if (filter.minBasePower !== undefined && (def.basePower ?? -Infinity) < filter.minBasePower) return false;
  if (filter.exactBasePower !== undefined && (def.basePower ?? -1) !== filter.exactBasePower) return false;
  if (filter.hasTrigger !== undefined && !!def.hasTrigger !== filter.hasTrigger) return false;
  if (filter.noBaseEffect === true && !cardHasNoBaseEffect(def)) return false;
  return true;
}

function searchEligible(ids: string[], filter: SearchFilter | undefined, ctx: EffectContextImpl, bindings: Record<string, string[]> = {}): string[] {
  if (!filter) return ids;
  return ids.filter((id) => matchesSearchFilter(id, filter, ctx, bindings));
}

/**
 * BASE (printed) cost/power filters — the card's original values, ignoring buffs/debuffs. These are
 * distinct from the maxCost/maxPower filters, which use CURRENT (live) cost/power via ctx.costOf/powerOf.
 * Only card text that literally says "base cost" / "base power" should use these.
 */
interface BaseFilterFields {
  maxBaseCost?: number;
  minBaseCost?: number;
  exactBaseCost?: number;
  maxBasePower?: number;
  minBasePower?: number;
  exactBasePower?: number;
}
function applyBaseFilters(ids: string[], sel: BaseFilterFields, ctx: EffectContextImpl): string[] {
  const baseCost = (id: string) => ctx.definitionOf(id)?.baseCost;
  const basePower = (id: string) => ctx.definitionOf(id)?.basePower;
  let out = ids;
  if (sel.maxBaseCost !== undefined) out = out.filter((id) => (baseCost(id) ?? Infinity) <= sel.maxBaseCost!);
  if (sel.minBaseCost !== undefined) out = out.filter((id) => (baseCost(id) ?? -Infinity) >= sel.minBaseCost!);
  if (sel.exactBaseCost !== undefined) out = out.filter((id) => (baseCost(id) ?? -1) === sel.exactBaseCost);
  if (sel.maxBasePower !== undefined) out = out.filter((id) => (basePower(id) ?? Infinity) <= sel.maxBasePower!);
  if (sel.minBasePower !== undefined) out = out.filter((id) => (basePower(id) ?? -Infinity) >= sel.minBasePower!);
  if (sel.exactBasePower !== undefined) out = out.filter((id) => (basePower(id) ?? -1) === sel.exactBasePower);
  return out;
}

function lifePositionOptions(
  ctx: EffectContextImpl,
  position: 'top' | 'topOrBottom',
  optional: boolean,
  player: 'controller' | 'opponent' = 'controller',
): { label: string; position: 'decline' | 'top' | 'bottom' }[] {
  const playerId = player === 'opponent' ? ctx.opponentId : ctx.controllerId;
  const life = ctx.state().players[playerId]?.lifeArea.cardIds ?? [];
  if (life.length === 0) return optional ? [{ label: 'Do not add a Life card.', position: 'decline' }] : [];
  const options: { label: string; position: 'decline' | 'top' | 'bottom' }[] = [];
  if (optional) options.push({ label: 'Do not add a Life card.', position: 'decline' });
  options.push({ label: 'Top Life card', position: 'top' });
  if (position === 'topOrBottom' && life.length > 1) options.push({ label: 'Bottom Life card', position: 'bottom' });
  return options;
}

function resolveLifePositionToHand(
  ctx: EffectContextImpl,
  position: 'top' | 'topOrBottom',
  optional: boolean,
  selectedIndex: number,
  player: 'controller' | 'opponent' = 'controller',
): OpResult {
  const options = lifePositionOptions(ctx, position, optional, player);
  const selected = options[selectedIndex];
  if (!selected || selected.position === 'decline') return EMPTY_RESULT;
  const playerId = player === 'opponent' ? ctx.opponentId : ctx.controllerId;
  const life = ctx.state().players[playerId]?.lifeArea.cardIds ?? [];
  const id = selected.position === 'top' ? life[0] : life[life.length - 1];
  if (!id) return EMPTY_RESULT;
  ctx.moveToHand(id);
  return { selectedIds: [id], movedIds: [id] };
}

function resolveLifePositionToTrash(
  ctx: EffectContextImpl,
  position: 'top' | 'topOrBottom',
  optional: boolean,
  selectedIndex: number,
  player: 'controller' | 'opponent' = 'controller',
): OpResult {
  const options = lifePositionOptions(ctx, position, optional, player);
  const selected = options[selectedIndex];
  if (!selected || selected.position === 'decline') return EMPTY_RESULT;
  const playerId = player === 'opponent' ? ctx.opponentId : ctx.controllerId;
  const life = ctx.state().players[playerId]?.lifeArea.cardIds ?? [];
  const id = selected.position === 'top' ? life[0] : life[life.length - 1];
  if (!id) return EMPTY_RESULT;
  ctx.trashCard(id);
  return { selectedIds: [id], movedIds: [id] };
}

function noop(state: GameState): ActionExecuteResult {
  return { state, log: [], pendingChoices: [] };
}

function evalCondition(cond: IrCondition | undefined, ctx: EffectContextImpl): boolean {
  if (!cond) return true;
  const state = ctx.state();
  const inst = state.cardsById[ctx.sourceInstanceId];
  if (!inst) return false;
  if (cond.donAttachedAtLeast !== undefined && inst.donAttached.length < cond.donAttachedAtLeast) return false;
  if (cond.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === inst.ownerId;
    if (cond.turn === 'your' && !isOwnersTurn) return false;
    if (cond.turn === 'opponent' && isOwnersTurn) return false;
  }
  return true;
}

function applyDonAttachedFilter(ids: string[], minDonAttached: number | undefined, state: GameState): string[] {
  if (minDonAttached === undefined) return ids;
  return ids.filter((id) => (state.cardsById[id]?.donAttached.length ?? 0) >= minDonAttached);
}

function applyCostEqualsDonAttachedFilter(
  ids: string[],
  costEqualsDonAttached: boolean | undefined,
  ctx: EffectContextImpl,
): string[] {
  if (costEqualsDonAttached !== true) return ids;
  return ids.filter((id) => ctx.costOf(id) === (ctx.state().cardsById[id]?.donAttached.length ?? 0));
}

function effectiveMaxCost(
  sel: {
    maxCost?: number;
    maxCostFromOpponentLife?: boolean;
    maxCostFromCombinedLife?: boolean;
    maxCostFromSelfLife?: boolean;
    maxCostFromOpponentDon?: boolean;
    maxCostFromSelfDon?: boolean;
  },
  ctx: EffectContextImpl,
): number | undefined {
  if (sel.maxCostFromCombinedLife) {
    const state = ctx.state();
    return state.players[ctx.controllerId].lifeArea.cardIds.length + state.players[ctx.opponentId].lifeArea.cardIds.length;
  }
  if (sel.maxCostFromOpponentLife) return ctx.state().players[ctx.opponentId].lifeArea.cardIds.length;
  if (sel.maxCostFromSelfLife) return ctx.state().players[ctx.controllerId].lifeArea.cardIds.length;
  if (sel.maxCostFromOpponentDon) return fieldDonIds(ctx.state(), ctx.opponentId).length;
  if (sel.maxCostFromSelfDon) return fieldDonIds(ctx.state(), ctx.controllerId).length;
  return sel.maxCost;
}

function resolveSelector(sel: Selector, ctx: EffectContextImpl, bindings: Record<string, string[]>): string[] {
  switch (sel.sel) {
    case 'self':
      return [ctx.sourceInstanceId];
    case 'eventPlayedCharacter':
      return bindings.__eventPlayedCharacter ?? [];
    case 'controllerLeader':
      return [ctx.controllerLeaderId()];
    case 'controllerActiveLeader': {
      const leaderId = ctx.controllerLeaderId();
      return ctx.state().cardsById[leaderId]?.orientation === 'active' ? [leaderId] : [];
    }
    case 'controllerCharacters': {
      let ids = ctx.controllerCharacterIds();
      if (sel.minCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) >= sel.minCost!);
      const maxCost = effectiveMaxCost(sel, ctx);
      if (maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= maxCost);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      if (sel.minPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) >= sel.minPower!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      ids = applyBaseFilters(ids, sel, ctx);
      if (sel.color !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.colors.includes(sel.color!) === true);
      if (sel.name !== undefined) { const name = sel.name; ids = ids.filter((id) => nameMatches(ctx.definitionOf(id), name)); }
      if (sel.excludeCardNames !== undefined) ids = ids.filter((id) => !sel.excludeCardNames!.includes(ctx.definitionOf(id)?.name ?? ''));
      if (sel.rested !== undefined) ids = ids.filter((id) => (ctx.state().cardsById[id]?.orientation === 'rested') === sel.rested);
      if (sel.typeIncludes !== undefined) ids = ids.filter((id) => hasType(ctx.definitionOf(id)?.types ?? [], sel.typeIncludes!));
      if (sel.anyOfTypes !== undefined) ids = ids.filter((id) => sel.anyOfTypes!.some((t) => hasType(ctx.definitionOf(id)?.types ?? [], t)));
      if (sel.hasTrigger !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.hasTrigger === true) === sel.hasTrigger);
      if (sel.noBaseEffect === true) ids = ids.filter((id) => { const def = ctx.definitionOf(id); return !!def && cardHasNoBaseEffect(def); });
      if (sel.attribute !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.attributes?.includes(sel.attribute!) === true);
      if (sel.excludeSelf) ids = ids.filter((id) => id !== ctx.sourceInstanceId);
      if (sel.excludeSelfName) {
        const selfName = ctx.definitionOf(ctx.sourceInstanceId)?.name;
        if (selfName !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.name !== selfName);
      }
      ids = applyDonAttachedFilter(ids, sel.minDonAttached, ctx.state());
      ids = applyCostEqualsDonAttachedFilter(ids, sel.costEqualsDonAttached, ctx);
      return ids;
    }
    case 'controllerLeaderOrCharacters': {
      let ids = [ctx.controllerLeaderId(), ...ctx.controllerCharacterIds()];
      const leaderId = ctx.controllerLeaderId();
      if (sel.typeIncludes !== undefined) {
        const type = sel.typeIncludes;
        ids = ids.filter((id) => (sel.typeFilterCharactersOnly && id === leaderId) || hasType(ctx.definitionOf(id)?.types ?? [], type));
      }
      if (sel.anyOfTypes !== undefined) {
        ids = ids.filter((id) => (sel.typeFilterCharactersOnly && id === leaderId) || sel.anyOfTypes!.some((t) => hasType(ctx.definitionOf(id)?.types ?? [], t)));
      }
      if (sel.name !== undefined) { const name = sel.name; ids = ids.filter((id) => nameMatches(ctx.definitionOf(id), name)); }
      if (sel.minCost !== undefined) ids = ids.filter((id) => id === leaderId || ctx.costOf(id) >= sel.minCost!);
      const maxCost = effectiveMaxCost(sel, ctx);
      if (maxCost !== undefined) ids = ids.filter((id) => id === leaderId || ctx.costOf(id) <= maxCost);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => id === leaderId || ctx.costOf(id) === sel.exactCost);
      if (sel.minPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) >= sel.minPower!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      if (sel.maxBasePower !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.basePower ?? Infinity) <= sel.maxBasePower!);
      if (sel.minBasePower !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.basePower ?? -Infinity) >= sel.minBasePower!);
      if (sel.exactBasePower !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.basePower ?? -1) === sel.exactBasePower);
      if (sel.color !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.colors.includes(sel.color!) === true);
      if (sel.excludeSelf) ids = ids.filter((id) => id !== ctx.sourceInstanceId);
      if (sel.excludeCardNames !== undefined) ids = ids.filter((id) => !sel.excludeCardNames!.includes(ctx.definitionOf(id)?.name ?? ''));
      return ids;
    }
    case 'opponentLeaderOrCharacters': {
      const state = ctx.state();
      const opponentId = ctx.opponentId;
      let ids: string[] = [];
      const leaderId = state.players[opponentId].leaderInstanceId;
      const leader = state.cardsById[leaderId];
      const leaderDef = ctx.definitionOf(leaderId);
      let includeLeader = true;
      if (sel.restedLeader !== undefined) {
        includeLeader = (leader?.orientation === 'rested') === sel.restedLeader;
      }
      if (sel.typeIncludes !== undefined && !hasType(leaderDef?.types ?? [], sel.typeIncludes)) includeLeader = false;
      if (sel.anyOfTypes !== undefined && !sel.anyOfTypes.some((t) => hasType(leaderDef?.types ?? [], t))) includeLeader = false;
      if (sel.attribute !== undefined && leaderDef?.attributes?.includes(sel.attribute) !== true) includeLeader = false;
      if (includeLeader) ids.push(leaderId);
      let charIds = ctx.opponentCharacterIds();
      if (sel.minCost !== undefined) charIds = charIds.filter((id) => ctx.costOf(id) >= sel.minCost!);
      const maxCost = effectiveMaxCost(sel, ctx);
      if (maxCost !== undefined) charIds = charIds.filter((id) => ctx.costOf(id) <= maxCost);
      if (sel.exactCost !== undefined) charIds = charIds.filter((id) => ctx.costOf(id) === sel.exactCost);
      if (sel.minPower !== undefined) charIds = charIds.filter((id) => ctx.powerOf(id) >= sel.minPower!);
      if (sel.maxPower !== undefined) charIds = charIds.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      charIds = applyBaseFilters(charIds, sel, ctx);
      if (sel.typeIncludes !== undefined) charIds = charIds.filter((id) => hasType(ctx.definitionOf(id)?.types ?? [], sel.typeIncludes!));
      if (sel.anyOfTypes !== undefined) charIds = charIds.filter((id) => sel.anyOfTypes!.some((t) => hasType(ctx.definitionOf(id)?.types ?? [], t)));
      if (sel.attribute !== undefined) charIds = charIds.filter((id) => ctx.definitionOf(id)?.attributes?.includes(sel.attribute!) === true);
      if (sel.excludeName !== undefined) charIds = charIds.filter((id) => ctx.definitionOf(id)?.name !== sel.excludeName);
      if (sel.excludeCardNames !== undefined) charIds = charIds.filter((id) => !sel.excludeCardNames!.includes(ctx.definitionOf(id)?.name ?? ''));
      return [...ids, ...charIds];
    }
    case 'opponentLeader': {
      const leaderId = ctx.state().players[ctx.opponentId].leaderInstanceId;
      const leader = ctx.state().cardsById[leaderId];
      if (sel.rested !== undefined && (leader?.orientation === 'rested') !== sel.rested) return [];
      return [leaderId];
    }
    case 'controllerLeaderOrStage': {
      const p = ctx.state().players[ctx.controllerId];
      let ids = [p.leaderInstanceId, ...p.stageArea.cardIds];
      if (sel.typeIncludes !== undefined) ids = ids.filter((id) => hasType(ctx.definitionOf(id)?.types ?? [], sel.typeIncludes!));
      if (sel.name !== undefined) { const name = sel.name; ids = ids.filter((id) => nameMatches(ctx.definitionOf(id), name)); }
      return ids;
    }
    case 'controllerRestedDon': {
      const state = ctx.state();
      const player = state.players[ctx.controllerId];
      const attached = new Set<string>();
      for (const id of Object.keys(state.cardsById)) for (const d of state.cardsById[id].donAttached) attached.add(d);
      return player.costArea.cardIds.filter((id) => !attached.has(id) && state.cardsById[id]?.donRested === true);
    }
    case 'controllerActiveDon': {
      const state = ctx.state();
      const player = state.players[ctx.controllerId];
      const attached = new Set<string>();
      for (const id of Object.keys(state.cardsById)) for (const d of state.cardsById[id].donAttached) attached.add(d);
      return player.costArea.cardIds.filter((id) => !attached.has(id) && state.cardsById[id]?.donRested === false);
    }
    case 'controllerFieldDon':
      return fieldDonIds(ctx.state(), ctx.controllerId);
    case 'opponentFieldDon':
      return fieldDonIds(ctx.state(), ctx.opponentId);
    case 'opponentActiveDon': {
      const state = ctx.state();
      const player = state.players[ctx.opponentId];
      const attached = new Set<string>();
      for (const id of Object.keys(state.cardsById)) for (const d of state.cardsById[id].donAttached) attached.add(d);
      return player.costArea.cardIds.filter((id) => !attached.has(id) && state.cardsById[id]?.donRested === false);
    }
    case 'opponentRestedDon': {
      const state = ctx.state();
      const player = state.players[ctx.opponentId];
      const attached = new Set<string>();
      for (const id of Object.keys(state.cardsById)) for (const d of state.cardsById[id].donAttached) attached.add(d);
      return player.costArea.cardIds.filter((id) => !attached.has(id) && state.cardsById[id]?.donRested === true);
    }
    case 'ownerLeaderOrCharactersOfVar': {
      const refId = bindings[sel.varName]?.[0];
      if (!refId) return [];
      const ownerId = ctx.state().cardsById[refId]?.ownerId;
      if (!ownerId) return [];
      const p = ctx.state().players[ownerId];
      return [p.leaderInstanceId, ...p.characterArea.cardIds].filter((id): id is string => id != null);
    }
    case 'controllerAttachedDon': {
      const state = ctx.state();
      const player = state.players[ctx.controllerId];
      const hostIds = [player.leaderInstanceId, ...player.characterArea.cardIds, ...player.stageArea.cardIds].filter((id): id is string => id != null);
      const donIds: string[] = [];
      for (const hostId of hostIds) {
        for (const donId of state.cardsById[hostId]?.donAttached ?? []) donIds.push(donId);
      }
      return donIds;
    }
    case 'controllerLifeTop': {
      const life = ctx.state().players[ctx.controllerId].lifeArea.cardIds;
      return life.length > 0 ? [life[0]] : [];
    }
    case 'controllerLifeTopN': {
      const life = ctx.state().players[ctx.controllerId].lifeArea.cardIds;
      return life.slice(0, sel.count);
    }
    case 'opponentLifeTop':
      return ctx.opponentLifeTopIds();
    case 'battleOpponent': {
      const battle = ctx.state().currentBattle;
      if (!battle) return [];
      const opposingId =
        battle.attackerInstanceId === ctx.sourceInstanceId ? battle.targetInstanceId
        : battle.targetInstanceId === ctx.sourceInstanceId ? battle.attackerInstanceId
        : null;
      if (!opposingId) return [];
      const inst = ctx.state().cardsById[opposingId];
      // Only an opponent Character still in play (already-K.O.'d = nothing to K.O.).
      if (!inst || inst.currentZone !== 'characterArea' || inst.controllerId === ctx.controllerId) return [];
      if (sel.maxCost !== undefined && ctx.costOf(opposingId) > sel.maxCost) return [];
      return [opposingId];
    }
    case 'controllerLifeTopBottom':
      return ctx.controllerLifeTopBottomIds();
    case 'controllerFaceUpLife': {
      const life = ctx.state().players[ctx.controllerId].lifeArea.cardIds;
      return life.filter((id) => ctx.state().cardsById[id]?.faceState === 'faceUp');
    }
    case 'controllerOrOpponentLifeTop':
      return ctx.controllerOrOpponentLifeTopIds();
    case 'controllerDeckTop':
      return ctx.controllerDeckTopIds();
    case 'allCharacters': {
      let ids = [...ctx.controllerCharacterIds(), ...ctx.opponentCharacterIds()];
      if (sel.minCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) >= sel.minCost!);
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.minPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) >= sel.minPower!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      ids = applyBaseFilters(ids, sel, ctx);
      if (sel.rested !== undefined) ids = ids.filter((id) => (ctx.state().cardsById[id]?.orientation === 'rested') === sel.rested);
      if (sel.excludeSelf) ids = ids.filter((id) => id !== ctx.sourceInstanceId);
      if (sel.excludeCardNames !== undefined) ids = ids.filter((id) => !sel.excludeCardNames!.includes(ctx.definitionOf(id)?.name ?? ''));
      return ids;
    }
    case 'opponentCharacters': {
      let ids = ctx.opponentCharacterIds();
      if (sel.minCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) >= sel.minCost!);
      const maxCost = effectiveMaxCost(sel, ctx);
      if (maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= maxCost);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      if (sel.minPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) >= sel.minPower!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      ids = applyBaseFilters(ids, sel, ctx);
      if (sel.rested !== undefined) ids = ids.filter((id) => (ctx.state().cardsById[id]?.orientation === 'rested') === sel.rested);
      if (sel.hasBlocker !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.hasBlocker === true) === sel.hasBlocker);
      if (sel.hasTrigger !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.hasTrigger === true) === sel.hasTrigger);
      if (sel.noBaseEffect === true) ids = ids.filter((id) => { const def = ctx.definitionOf(id); return !!def && cardHasNoBaseEffect(def); });
      if (sel.attribute !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.attributes?.includes(sel.attribute!) === true);
      if (sel.excludeName !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.name !== sel.excludeName);
      if (sel.excludeCardNames !== undefined) ids = ids.filter((id) => !sel.excludeCardNames!.includes(ctx.definitionOf(id)?.name ?? ''));
      ids = applyDonAttachedFilter(ids, sel.minDonAttached, ctx.state());
      ids = applyCostEqualsDonAttachedFilter(ids, sel.costEqualsDonAttached, ctx);
      if (sel.excludeIdsFromVar !== undefined) {
        const exclude = new Set(bindings[sel.excludeIdsFromVar] ?? []);
        ids = ids.filter((id) => !exclude.has(id));
      }
      return ids;
    }
    case 'opponentUnattachedDon': {
      const state = ctx.state();
      const player = state.players[ctx.opponentId];
      const attached = new Set<string>();
      for (const id of Object.keys(state.cardsById)) for (const d of state.cardsById[id].donAttached) attached.add(d);
      return player.costArea.cardIds.filter((id) => !attached.has(id));
    }
    case 'union': {
      const seen = new Set<string>();
      let out: string[] = [];
      for (const member of sel.members) {
        for (const id of resolveSelector(member, ctx, bindings)) {
          if (!seen.has(id)) {
            seen.add(id);
            out.push(id);
          }
        }
      }
      if (sel.excludeIdsFromVar !== undefined) {
        const exclude = new Set(bindings[sel.excludeIdsFromVar] ?? []);
        out = out.filter((id) => !exclude.has(id));
      }
      return out;
    }
    case 'allStages': {
      const state = ctx.state();
      let ids = [...state.players.p1.stageArea.cardIds, ...state.players.p2.stageArea.cardIds];
      if (sel.rested !== undefined) ids = ids.filter((id) => ctx.state().cardsById[id]?.orientation === (sel.rested ? 'rested' : 'active'));
      return ids;
    }
    case 'controllerStages': {
      let ids = ctx.state().players[ctx.controllerId]?.stageArea.cardIds ?? [];
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      if (sel.rested !== undefined) ids = ids.filter((id) => ctx.state().cardsById[id]?.orientation === (sel.rested ? 'rested' : 'active'));
      return ids;
    }
    case 'controllerActiveStages': {
      let ids = ctx.state().players[ctx.controllerId]?.stageArea.cardIds ?? [];
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      return ids.filter((id) => ctx.state().cardsById[id]?.orientation === 'active');
    }
    case 'opponentStages': {
      let ids = ctx.state().players[ctx.opponentId]?.stageArea.cardIds ?? [];
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      if (sel.rested !== undefined) ids = ids.filter((id) => ctx.state().cardsById[id]?.orientation === (sel.rested ? 'rested' : 'active'));
      return ids;
    }
    case 'controllerHand': {
      let ids = searchEligible(ctx.controllerHandIds(), sel.filter, ctx, bindings);
      if (sel.excludeSelf) ids = ids.filter((id) => id !== ctx.sourceInstanceId);
      return ids;
    }
    case 'opponentHand':
      return searchEligible(ctx.opponentHandIds(), sel.filter, ctx, bindings);
    case 'controllerTrash':
      return searchEligible(ctx.controllerTrashIds(), sel.filter, ctx, bindings);
    case 'opponentTrash':
      return searchEligible(ctx.opponentTrashIds(), sel.filter, ctx, bindings);
    case 'controllerDeck':
      return searchEligible(ctx.controllerDeckIds(), sel.filter, ctx, bindings);
    case 'var': {
      let ids = bindings[sel.name] ?? [];
      if (sel.excludeIdsFromVar !== undefined) {
        const exclude = new Set(bindings[sel.excludeIdsFromVar] ?? []);
        ids = ids.filter((id) => !exclude.has(id));
      }
      if (sel.filter) ids = searchEligible(ids, sel.filter, ctx, bindings);
      return ids;
    }
  }
  return [];
}

function initialBindings(eventContext?: GateEvalContext): Record<string, string[]> {
  const bindings: Record<string, string[]> = {};
  if (eventContext?.playedCharacterInstanceId) bindings.__eventPlayedCharacter = [eventContext.playedCharacterInstanceId];
  if (eventContext?.handTrashedCount !== undefined) bindings.__eventHandTrashedCount = [String(eventContext.handTrashedCount)];
  return bindings;
}

function applyOp(op: NonSuspendingEffectOp, ctx: EffectContextImpl, bindings: Record<string, string[]>): OpResult {
  switch (op.op) {
    case 'draw':
      ctx.draw(op.player === 'opponent' ? ctx.opponentId : ctx.controllerId, op.amount);
      return { selectedIds: [], movedIds: op.amount > 0 ? ['__draw'] : [] };
    case 'drawUntilHandCount': {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const handCount = playerId === ctx.controllerId ? ctx.controllerHandIds().length : ctx.opponentHandIds().length;
      const amount = Math.max(0, op.targetCount - handCount);
      ctx.draw(playerId, amount);
      return { selectedIds: [], movedIds: amount > 0 ? ['__draw'] : [] };
    }
    case 'revealCards': {
      const ids = resolveSelector(op.target, ctx, bindings);
      ctx.revealCards(ids);
      return { selectedIds: ids, movedIds: ids.length > 0 ? ['__reveal'] : [] };
    }
    case 'addPower': {
      const ids = resolveSelector(op.target, ctx, bindings);
      const scaledAmount =
        op.amountPerVar && op.amountPer
          ? op.amountPer * Math.floor((bindings[op.amountPerVar]?.length ?? 0) / (op.amountPerStep ?? 1))
          : op.amount;
      for (const id of ids) {
        ctx.addContinuousPower({ appliesToInstanceId: id, amount: scaledAmount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}), ...(op.scale ? { scale: op.scale } : {}) });
      }
      return { selectedIds: ids, movedIds: scaledAmount !== 0 ? ids : [] };
    }
    case 'addPowerAura': {
      ctx.addContinuousPowerAura({ group: op.group, amount: op.amount, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}), ...(op.scale ? { scale: op.scale } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'setBasePowerAura': {
      ctx.setContinuousBasePowerAura({ group: op.group, value: op.value, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'addCostAura': {
      ctx.addContinuousCostAura({ group: op.group, amount: op.amount, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}), ...(op.scale ? { scale: op.scale } : {}), ...(op.usesRemaining !== undefined ? { usesRemaining: op.usesRemaining } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'addCost': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.addContinuousCost({ appliesToInstanceId: id, amount: op.amount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}), ...(op.scale ? { scale: op.scale } : {}) });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'setBasePower': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.setContinuousBasePower({ appliesToInstanceId: id, value: op.value, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'setBasePowerFromLeader': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.setContinuousBasePowerFromLeader({
          appliesToInstanceId: id,
          duration: op.duration,
          ...(op.condition ? { condition: op.condition } : {}),
          ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'setBasePowerFromSource': {
      const sourceId = resolveSelector(op.source, ctx, bindings)[0];
      if (!sourceId) return EMPTY_RESULT;
      const value = ctx.powerOf(sourceId);
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.setContinuousBasePower({
          appliesToInstanceId: id,
          value,
          duration: op.duration,
          ...(op.condition ? { condition: op.condition } : {}),
          description: `base power becomes ${value}`,
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'setBaseCost': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.setContinuousBaseCost({ appliesToInstanceId: id, value: op.value, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'addKeyword': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.addContinuousKeyword({ appliesToInstanceId: id, keyword: op.keyword, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'addKeywordAura': {
      ctx.addContinuousKeywordAura({ group: op.group, keyword: op.keyword, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'addKoImmunity': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.addContinuousKoImmunity({
          appliesToInstanceId: id,
          scope: op.scope,
          duration: op.duration,
          ...(op.oncePerTurn ? { oncePerTurn: true } : {}),
          ...(op.condition ? { condition: op.condition } : {}),
          ...(op.attackerCategory ? { attackerCategory: op.attackerCategory } : {}),
          ...(op.attackerAttribute ? { attackerAttribute: op.attackerAttribute } : {}),
          ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
          ...(op.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: op.effectSourceMaxBasePower } : {}),
          ...(op.effectSourceCategory ? { effectSourceCategory: op.effectSourceCategory } : {}),
          ...(op.effectSourceWithoutAttribute ? { effectSourceWithoutAttribute: op.effectSourceWithoutAttribute } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'addKoImmunityAura': {
      ctx.addContinuousKoImmunityAura({
        group: op.group,
        scope: op.scope,
        duration: op.duration,
        ...(op.condition ? { condition: op.condition } : {}),
        ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}),
        ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
        ...(op.effectSourceMaxBasePower !== undefined ? { effectSourceMaxBasePower: op.effectSourceMaxBasePower } : {}),
        ...(op.effectSourceCategory ? { effectSourceCategory: op.effectSourceCategory } : {}),
        ...(op.effectSourceWithoutAttribute ? { effectSourceWithoutAttribute: op.effectSourceWithoutAttribute } : {}),
      });
      return { selectedIds: [], movedIds: [] };
    }
    case 'preventBlockers': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.preventBlockers({
          appliesToAttackerInstanceId: id,
          duration: op.duration,
          ...(op.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: op.blockerPowerAtLeast } : {}),
          ...(op.blockerPowerAtMost !== undefined ? { blockerPowerAtMost: op.blockerPowerAtMost } : {}),
          ...(op.blockerMaxCost !== undefined ? { blockerMaxCost: op.blockerMaxCost } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'suppressBlockerActivation': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.suppressBlockerActivation({ appliesToBlockerInstanceId: id, duration: op.duration });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventAttack': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.preventAttack({
          appliesToInstanceId: id,
          duration: op.duration,
          ...(op.forbiddenTarget ? { forbiddenTarget: op.forbiddenTarget } : {}),
          ...(op.forbiddenTargetFilter ? { forbiddenTargetFilter: op.forbiddenTargetFilter } : {}),
          ...(op.whileSummoningSick ? { whileSummoningSick: true } : {}),
          ...(op.attackUnlessGate?.length ? { attackUnlessGate: op.attackUnlessGate } : {}),
          ...(op.condition ? { condition: op.condition } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventAttackController': {
      const targetPlayerId = op.player === 'controller' ? ctx.controllerId : ctx.opponentId;
      ctx.preventAttackController({
        appliesToControllerId: targetPlayerId,
        duration: op.duration,
        ...(op.forbiddenTarget ? { forbiddenTarget: op.forbiddenTarget } : {}),
        ...(op.charactersOnly ? { charactersOnly: true } : {}),
        ...(op.condition ? { condition: op.condition } : {}),
        ...(op.attackUnlessTrashFromHand !== undefined ? { attackUnlessTrashFromHand: op.attackUnlessTrashFromHand } : {}),
      });
      return EMPTY_RESULT;
    }
    case 'forceCharactersPlayedRested': {
      ctx.forceCharactersPlayedRested({ duration: op.duration });
      return EMPTY_RESULT;
    }
    case 'setForcedAttackTarget': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.setForcedAttackTarget({
          appliesToInstanceId: id,
          duration: op.duration,
          ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}),
          ...(op.condition ? { condition: op.condition } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'redirectAttackTarget': {
      const ids = resolveSelector(op.target, ctx, bindings);
      const newTarget = ids[0];
      if (newTarget) ctx.redirectAttackTarget(newTarget);
      return { selectedIds: newTarget ? [newTarget] : [], movedIds: [] };
    }
    case 'swapBasePower': {
      const ids = bindings[op.var] ?? [];
      if (ids.length !== 2) return EMPTY_RESULT;
      if (op.mustIncludeControllerLeader && !ids.includes(ctx.controllerLeaderId())) return EMPTY_RESULT;
      const [a, b] = ids;
      const powerA = ctx.definitionOf(a)?.basePower ?? 0;
      const powerB = ctx.definitionOf(b)?.basePower ?? 0;
      ctx.setContinuousBasePower({ appliesToInstanceId: a, value: powerB, duration: op.duration, description: `base power becomes ${powerB} (swapped)` });
      ctx.setContinuousBasePower({ appliesToInstanceId: b, value: powerA, duration: op.duration, description: `base power becomes ${powerA} (swapped)` });
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventRest': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.preventRest({
          appliesToInstanceId: id,
          duration: op.duration,
          ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
          ...(op.condition ? { condition: op.condition } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventFieldRemoval': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.preventFieldRemoval({
          appliesToInstanceId: id,
          duration: op.duration,
          ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
          ...(op.condition ? { condition: op.condition } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventFieldRemovalAura': {
      ctx.preventFieldRemoval({
        appliesToGroup: op.group,
        duration: op.duration,
        ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
        ...(op.condition ? { condition: op.condition } : {}),
      });
      return { selectedIds: [], movedIds: [] };
    }
    case 'negateEffect': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.negateEffect({
          appliesToInstanceId: id,
          duration: op.duration,
          ...(op.negatedTimings?.length ? { negatedTimings: op.negatedTimings } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'negateControllerEffects': {
      const targetPlayerId = op.player === 'controller' ? ctx.controllerId : ctx.opponentId;
      ctx.negateControllerEffects({
        appliesToControllerId: targetPlayerId,
        duration: op.duration,
        ...(op.negatedTimings?.length ? { negatedTimings: op.negatedTimings } : {}),
        ...(op.appliesToCategories?.length ? { appliesToCategories: op.appliesToCategories } : {}),
        ...(op.exceptTypeIncludes ? { exceptTypeIncludes: op.exceptTypeIncludes } : {}),
      });
      return EMPTY_RESULT;
    }
    case 'preventControllerLifeToHand': {
      const targetPlayerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.preventControllerLifeToHand({ appliesToControllerId: targetPlayerId, duration: op.duration });
      return EMPTY_RESULT;
    }
    case 'preventControllerCharacterPlay': {
      const targetPlayerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.preventControllerCharacterPlay({
        appliesToControllerId: targetPlayerId,
        duration: op.duration,
        ...(op.minBaseCost !== undefined ? { minBaseCost: op.minBaseCost } : {}),
        ...(op.maxBaseCost !== undefined ? { maxBaseCost: op.maxBaseCost } : {}),
      });
      return EMPTY_RESULT;
    }
    case 'preventControllerHandPlay': {
      const targetPlayerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.preventControllerHandPlay({ appliesToControllerId: targetPlayerId, duration: op.duration });
      return EMPTY_RESULT;
    }
    case 'deferEmptyDeckDefeatToEndOfTurn': {
      ctx.deferEmptyDeckDefeatToEndOfTurn({ appliesToControllerId: ctx.controllerId, duration: op.duration });
      return EMPTY_RESULT;
    }
    case 'preventControllerCharacterSetActiveDon': {
      const targetPlayerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.preventControllerCharacterSetActiveDon({ appliesToControllerId: targetPlayerId, duration: op.duration });
      return EMPTY_RESULT;
    }
    case 'giveDon': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.giveDon(id, op.count);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'giveGivenDon': {
      const donIds = resolveSelector(op.donTarget, ctx, bindings);
      const charIds = resolveSelector(op.characterTarget, ctx, bindings);
      if (donIds[0] && charIds[0]) ctx.giveGivenDon(donIds[0], charIds[0]);
      return { selectedIds: [...donIds, ...charIds], movedIds: charIds };
    }
    case 'giveDonFromCostArea': {
      const ids = resolveSelector(op.target, ctx, bindings);
      let donOwnerId = ctx.controllerId;
      if (op.donOwner === 'opponent') donOwnerId = ctx.opponentId;
      else if (typeof op.donOwner === 'object') {
        const refId = bindings[op.donOwner.fromVar]?.[0];
        donOwnerId = refId ? (ctx.state().cardsById[refId]?.ownerId ?? ctx.controllerId) : ctx.controllerId;
      }
      const moved: string[] = [];
      for (const id of ids) {
        const attached = ctx.giveDonFromCostArea(id, op.count, donOwnerId, {
          ...(op.restedOnly === true ? { restedOnly: true } : {}),
          ...(op.activeOnly === true ? { activeOnly: true } : {}),
        });
        if (attached > 0) moved.push(id);
      }
      return { selectedIds: ids, movedIds: moved };
    }
    case 'ko': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.koApply(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'registerKoReplacement': {
      ctx.addContinuousKoReplacement({
        ...(op.appliesTo === 'self'
          ? { appliesToInstanceId: op.appliesToInstanceId ?? ctx.sourceInstanceId }
          : { appliesToGroup: op.group }),
        modifier: {
          scope: op.scope,
          ...(op.oncePerTurn ? { oncePerTurn: true } : {}),
          ...(op.condition ? { condition: op.condition } : {}),
          ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}),
          ...(op.replacementTriggers ? { replacementTriggers: op.replacementTriggers } : {}),
          ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
          ...(op.effectSourceCategory ? { effectSourceCategory: op.effectSourceCategory } : {}),
          ...(op.activationGate ? { activationGate: op.activationGate } : {}),
          action: op.action,
        },
        duration: op.duration,
      });
      return { selectedIds: [], movedIds: [] };
    }
    case 'registerRestReplacement': {
      ctx.addContinuousRestReplacement({
        appliesToInstanceId: op.appliesToInstanceId ?? ctx.sourceInstanceId,
        modifier: {
          ...(op.oncePerTurn ? { oncePerTurn: true } : {}),
          ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}),
          ...(op.effectSourceController ? { effectSourceController: op.effectSourceController } : {}),
          ...(op.effectSourceCategory ? { effectSourceCategory: op.effectSourceCategory } : {}),
          action: op.action,
        },
        duration: op.duration,
      });
      return { selectedIds: [], movedIds: [] };
    }
    case 'rest': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.rest(id);
      return { selectedIds: ids, movedIds: [] };
    }
    case 'setActive': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.setActive(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'turnAllLifeFace': {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const ids = ctx.lifeIds(playerId);
      ctx.turnAllLifeFace(playerId, op.faceUp);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'scheduleSetActiveControllerDonAtEndOfTurn': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:set-active-don:eot:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'setActiveControllerDonAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
        maxTargets: op.maxTargets,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleRestOpponentDonAtStartOfNextMain': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:rest-opponent-don:next-main:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'restOpponentDonAtStartOfMain',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.opponentId,
        maxTargets: op.maxTargets,
        triggerTurnNumber: ctx.state().turnNumber + 1,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleTrashSourceAtEndOfTurn': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:trash-self:eot:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'trashSourceAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleMoveSourceToBottomDeckAtEndOfBattle': {
      const battleAttackerId = ctx.state().currentBattle?.attackerInstanceId ?? ctx.sourceInstanceId;
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:bottom-deck:eob:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'moveSourceToBottomDeckAtEndOfBattle',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        battleAttackerInstanceId: battleAttackerId,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleMoveInstanceToBottomDeckAtEndOfBattle': {
      const varName = op.fromVar ?? '__lastMovedIds';
      const ids = bindings[varName] ?? [];
      const targetId = ids[op.index ?? 0];
      if (!targetId) return EMPTY_RESULT;
      const battleAttackerId = ctx.state().currentBattle?.attackerInstanceId ?? ctx.sourceInstanceId;
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:bottom-deck:eob:${targetId}:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'moveInstanceToBottomDeckAtEndOfBattle',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        battleAttackerInstanceId: battleAttackerId,
        targetInstanceId: targetId,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleMoveInstanceToBottomDeckAtEndOfTurn': {
      const varName = op.fromVar ?? '__lastMovedIds';
      const ids = bindings[varName] ?? [];
      const targetId = ids[op.index ?? 0];
      if (!targetId) return EMPTY_RESULT;
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:bottom-deck:eot:${targetId}:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'moveInstanceToBottomDeckAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
        targetInstanceId: targetId,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleTrashControllerCharacterAtEndOfTurn': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:trash-char:eot:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'trashControllerCharacterAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
        ...(op.typeIncludes ? { typeIncludes: op.typeIncludes } : {}),
      });
      return EMPTY_RESULT;
    }
    case 'scheduleReturnDonToMatchOpponentAtEndOfTurn': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:return-don-match:eot:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'returnDonToMatchOpponentAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
      });
      return EMPTY_RESULT;
    }
    case 'scheduleMoveDeckTopToLifeAtEndOfTurn': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:deck-to-life:eot:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'moveDeckTopToLifeAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
        ...(op.requiresLeaderType ? { requiresLeaderType: op.requiresLeaderType } : {}),
      });
      return EMPTY_RESULT;
    }
    case 'scheduleReturnSourceToHandAtEndOfTurn': {
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:return-hand:eot:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'returnSourceToHandAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
      });
      return EMPTY_RESULT;
    }
    case 'schedulePreventRefreshOnCharacterAtEndOfTurn': {
      const varName = op.fromVar ?? '__lastMovedIds';
      const targetId = (bindings[varName] ?? [])[0];
      if (!targetId) return EMPTY_RESULT;
      ctx.scheduleDelayedEffect({
        id: `${ctx.sourceInstanceId}:prevent-refresh:eot:${targetId}:${ctx.state().turnNumber}:${ctx.state().delayedEffects?.length ?? 0}`,
        kind: 'preventRefreshOnCharacterAtEndOfTurn',
        sourceInstanceId: ctx.sourceInstanceId,
        ownerId: ctx.controllerId,
        triggerPlayerId: ctx.controllerId,
        targetInstanceId: targetId,
        minDonAttached: op.minDonAttached,
        requireRested: op.requireRested !== false,
      });
      return EMPTY_RESULT;
    }
    case 'trashHandDownTo': {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.trashHandDownTo(op.handSize, playerId);
      return { selectedIds: [], movedIds: ['__trashHandDownTo'] };
    }
    case 'trashFaceUpLife': {
      const player = ctx.state().players[ctx.controllerId];
      const faceUpIds = player?.lifeArea.cardIds.filter((id) => ctx.state().cardsById[id]?.faceState === 'faceUp') ?? [];
      ctx.trashFaceUpLife();
      return { selectedIds: faceUpIds, movedIds: faceUpIds };
    }
    case 'returnDonToDonDeck': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.returnDonToDonDeck(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'preventRefresh': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        if (op.maxCost !== undefined && ctx.costOf(id) > op.maxCost) continue;
        ctx.preventNextRefresh(id);
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'addRefreshCostRestriction': {
      ctx.addRefreshCostRestriction({
        maxCost: op.maxCost,
        scope: op.scope,
        ...(op.activationGate?.length ? { activationGate: op.activationGate } : {}),
      });
      return EMPTY_RESULT;
    }
    case 'returnToHand': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.returnToHand(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'moveToBottomDeck': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.moveToBottomDeck(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'moveToTopDeck': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.moveToTopDeck(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'moveToLifeTop': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.moveToLifeTop(id, op.faceUp);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'moveToLifeBottom': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.moveToLifeBottom(id, op.faceUp);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'turnLifeFace': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.turnLifeFace(id, op.faceUp);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'playSelf':
      ctx.playSelf();
      return { selectedIds: [ctx.sourceInstanceId], movedIds: [ctx.sourceInstanceId] };
    case 'playFromHand': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.playFromHand(id, op.rested === true);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'activateEventFromHand': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.queueEventActivationFromHand(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'activateEventFromTrash': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.queueEventActivationFromTrash(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'playFromTrash': {
      const ids = resolveSelector(op.target, ctx, bindings);
      const movedIds: string[] = [];
      for (const id of ids) {
        const playedId = ctx.playCharacterFromTrash(id, op.rested === true);
        if (playedId) movedIds.push(playedId);
      }
      return { selectedIds: ids, movedIds };
    }
    case 'playFromLife': {
      const ids = resolveSelector(op.target, ctx, bindings);
      const movedIds: string[] = [];
      for (const id of ids) {
        const playedId = ctx.playCharacterFromLife(id, op.rested === true);
        if (playedId) movedIds.push(playedId);
      }
      return { selectedIds: ids, movedIds };
    }
    case 'moveToHand': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.moveToHand(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'trashCards': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.trashCard(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'trashTopDeck': {
      const count = op.countVar !== undefined
        ? (bindings[op.countVar]?.length ?? 0)
        : (op.count ?? 0);
      if (count <= 0) return { selectedIds: [], movedIds: [] };
      const moving = ctx.topOfDeck(ctx.controllerId, count);
      ctx.trashTopOfDeck(ctx.controllerId, count);
      return { selectedIds: [], movedIds: moving };
    }
    case 'trashLife': {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const lifeCount = ctx.state().players[playerId]?.lifeArea.cardIds.length ?? 0;
      const n = op.untilLife !== undefined ? Math.max(0, lifeCount - op.untilLife) : (op.count ?? 0);
      ctx.trashLife(playerId, n);
      return { selectedIds: [], movedIds: n > 0 ? ['__trashLife'] : [] };
    }
    case 'moveLifeTopToHand': {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const life = ctx.state().players[playerId]?.lifeArea.cardIds ?? [];
      const n = Math.min(op.count ?? 1, life.length);
      const moved: string[] = [];
      for (let i = 0; i < n; i++) {
        const id = life[i];
        if (!id) break;
        ctx.moveToHand(id);
        moved.push(id);
      }
      return { selectedIds: moved, movedIds: moved };
    }
    case 'addDonFromDeck':
      ctx.addDonFromDeck(op.player === 'opponent' ? ctx.opponentId : ctx.controllerId, op.count, op.rested);
      return { selectedIds: [], movedIds: op.count > 0 ? ['__addDonFromDeck'] : [] };
    case 'revealTopDeck':
    case 'revealTopLife':
    case 'copyVar':
      // Handled specially in runOps (they mutate workingBindings directly);
      // this branch keeps the switch exhaustive and is never reached at runtime.
      return { selectedIds: [], movedIds: [] };
    case 'revealOpponentDeckTop':
      // Handled specially in runOps (it records the cost-match binding);
      // this branch keeps the switch exhaustive and is never reached at runtime.
      return { selectedIds: [], movedIds: [] };
    case 'returnHandShuffleDraw':
      // Handled specially in runOpList (draw-outside-draw-phase reactions need registry);
      // this branch keeps the switch exhaustive and is never reached at runtime.
      return { selectedIds: [], movedIds: [] };
    case 'dealDamage':
      // Handled specially in runOpList (Trigger window + life reactions need registry).
      return { selectedIds: [], movedIds: [] };
  }
  return EMPTY_RESULT;
}

/** Coordinates for resuming a suspended op list (main ability ops or a chooseOption branch). */
interface OpRunCoords {
  abilityIndex: number;
  /** chooseOption index in ability.ops when in a branch; otherwise unused for suspend coords. */
  opIndex: number;
  branchIndex?: number;
}

function resumeStateForSuspend(coords: OpRunCoords, branchOpIndex: number, bindings: Record<string, string[]>): PendingChoice['resumeState'] {
  if (coords.branchIndex !== undefined) {
    return { abilityIndex: coords.abilityIndex, opIndex: coords.opIndex, branchIndex: coords.branchIndex, branchOpIndex, bindings };
  }
  return { abilityIndex: coords.abilityIndex, opIndex: branchOpIndex, bindings };
}

function suspendedOpAt(ability: Ability, rs: NonNullable<PendingChoice['resumeState']>): EffectOp | undefined {
  const parent = ability.ops[rs.opIndex];
  if (rs.branchIndex !== undefined && parent?.op === 'chooseOption') {
    return parent.options[rs.branchIndex]?.ops[rs.branchOpIndex ?? 0];
  }
  return ability.ops[rs.opIndex];
}

/** Runs an op list; returns whether it suspended and the latest bindings. */
function runOpList(
  ops: EffectOp[],
  coords: OpRunCoords,
  startOpIndex: number,
  bindings: Record<string, string[]>,
  ctx: EffectContextImpl,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
  actionId: string | null = null,
): { suspended: boolean; bindings: Record<string, string[]> } {
  let workingBindings = bindings;
  for (let i = startOpIndex; i < ops.length; i++) {
    const op = ops[i];
    if (!conditionMet(op, workingBindings, ctx, defs)) continue;
    if (op.op === 'trashFromHandByCountVar') {
      const count = Number(workingBindings[op.countVar]?.[0] ?? '0');
      if (count <= 0) continue;
      const candidates = resolveSelector({ sel: 'controllerHand' }, ctx, workingBindings);
      // Softlock guard: never emit a hand-trash choice the player cannot satisfy.
      if (candidates.length === 0) {
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      const trashCount = Math.min(count, candidates.length);
      const prompt = op.prompt ?? `Trash ${trashCount} card${trashCount === 1 ? '' : 's'} from your hand.`;
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt,
        constraints: { min: trashCount, max: trashCount, candidateInstanceIds: candidates },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'chooseTargets') {
      const candidates = resolveSelector(op.from, ctx, workingBindings);
      // Softlock guard: required targets with zero eligible cards → bind empty and continue.
      if (candidates.length === 0 && op.min > 0) {
        workingBindings = {
          ...workingBindings,
          [op.var]: [],
          __lastSelected: boolBinding(false),
        };
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      const clampedMax = op.max < 0 ? candidates.length : Math.min(op.max, candidates.length);
      const clampedMin = Math.min(op.min, candidates.length);
      // If nothing can be chosen and the choice is optional, skip the prompt.
      if (candidates.length === 0 && clampedMin === 0 && clampedMax === 0) {
        workingBindings = {
          ...workingBindings,
          [op.var]: [],
          __lastSelected: boolBinding(false),
        };
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      const chooserId = op.chooser === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: chooserId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: {
          min: clampedMin,
          max: clampedMax,
          candidateInstanceIds: candidates,
          ...(op.maxCombinedPower !== undefined ? { maxCombinedPower: op.maxCombinedPower } : {}),
          ...(op.distinctNames ? { distinctNames: true } : {}),
        },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'chooseCost') {
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_NUMBER',
        prompt: op.prompt ?? 'Choose a cost.',
        constraints: { min: 1, max: 1, numberMin: op.min, numberMax: op.max },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'searchTopDeck') {
      const looked = ctx.topOfDeck(ctx.controllerId, op.look);
      if (looked.length === 0) continue;
      const eligible = op.destination === 'deckTopOrBottom' ? looked : searchEligible(looked, op.filter, ctx);
      const remainder = op.remainder ?? 'bottom';
      const max = op.destination === 'deckTopOrBottom' ? looked.length : op.pick;
      const min = op.destination === 'deckTopOrBottom' ? looked.length : 0;
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min, max, candidateInstanceIds: eligible, visibleInstanceIds: looked },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, {
          ...workingBindings,
          __looked: looked,
          __remainder: [remainder],
          __reveal: [op.reveal ? 'true' : 'false'],
          __destination: [op.destination],
        }),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'playFromDeck') {
      const deckIds = ctx.controllerDeckIds();
      if (deckIds.length === 0) continue;
      const eligible = searchEligible(deckIds, op.filter, ctx);
      if (eligible.length === 0) {
        ctx.shuffleDeck(ctx.controllerId);
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        // visibleInstanceIds intentionally stays the full deck (log/AI-evaluator
        // contract — see searchDeckFamily.test.ts); uiShowOnlyCandidates tells
        // the picker to render only `eligible` instead of all 40+ deck cards.
        constraints: { min: 0, max: op.pick, candidateInstanceIds: eligible, visibleInstanceIds: deckIds, uiShowOnlyCandidates: true },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'playStageFromDeck') {
      const deckIds = ctx.controllerDeckIds();
      if (deckIds.length === 0) continue;
      const eligible = searchEligible(deckIds, op.filter, ctx);
      if (eligible.length === 0) {
        ctx.shuffleDeck(ctx.controllerId);
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        // visibleInstanceIds intentionally stays the full deck (log/AI-evaluator
        // contract — see searchDeckFamily.test.ts); uiShowOnlyCandidates tells
        // the picker to render only `eligible` instead of all 40+ deck cards.
        constraints: { min: 0, max: op.pick, candidateInstanceIds: eligible, visibleInstanceIds: deckIds, uiShowOnlyCandidates: true },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'searchDeck') {
      const deckIds = ctx.controllerDeckIds();
      if (deckIds.length === 0) continue;
      const eligible = searchEligible(deckIds, op.filter, ctx);
      if (eligible.length === 0) {
        ctx.shuffleDeck(ctx.controllerId);
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        // visibleInstanceIds intentionally stays the full deck (log/AI-evaluator
        // contract — see searchDeckFamily.test.ts); uiShowOnlyCandidates tells
        // the picker to render only `eligible` instead of all 40+ deck cards.
        constraints: { min: 0, max: op.pick, candidateInstanceIds: eligible, visibleInstanceIds: deckIds, uiShowOnlyCandidates: true },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'lookLifeAndReorder') {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const ids = ctx.lifeIds(playerId);
      if (ids.length === 0 || (op.moveOneToDeckTop === true && ids.length < 1)) {
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min: ids.length, max: ids.length, candidateInstanceIds: ids, visibleInstanceIds: ids },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'peekLifeThenPlace') {
      const candidates = resolveSelector(op.from, ctx, workingBindings);
      if (candidates.length === 0) {
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min: 0, max: 1, candidateInstanceIds: candidates, visibleInstanceIds: candidates },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'chooseLifeToHand' || op.op === 'chooseLifeToTrash') {
      const options = lifePositionOptions(ctx, op.position, op.optional, op.op === 'chooseLifeToHand' ? (op.player ?? 'controller') : 'controller');
      if (options.length === 0) {
        workingBindings = withResultBindings(workingBindings, EMPTY_RESULT);
        continue;
      }
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_OPTION',
        prompt: op.prompt,
        constraints: { min: 1, max: 1, options: options.map(({ label }) => ({ label })) },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'chooseOption') {
      const chooserId = op.chooser === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: chooserId,
        kind: 'SELECT_OPTION',
        prompt: op.prompt,
        constraints: { min: 1, max: 1, options: op.options.map((option) => ({ label: option.label })) },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: resumeStateForSuspend(coords, i, workingBindings),
      });
      return { suspended: true, bindings: workingBindings };
    }
    if (op.op === 'revealTopDeck') {
      const [topId] = ctx.topOfDeck(ctx.controllerId, 1);
      let matched = false;
      if (topId) {
        ctx.revealCard(topId);
        matched = op.filter ? matchesSearchFilter(topId, op.filter, ctx) : true;
      }
      workingBindings = { ...withResultBindings(workingBindings, EMPTY_RESULT), __lastRevealMatched: boolBinding(matched) };
      continue;
    }
    if (op.op === 'copyVar') {
      // Snapshot `from` into `into` without disturbing __lastMoved/__lastSelected
      // (a following ifPrevious must still see the prior action's result).
      workingBindings = { ...workingBindings, [op.into]: workingBindings[op.from] ?? [] };
      continue;
    }
    if (op.op === 'revealTopLife') {
      const [topId] = ctx.lifeIds(ctx.controllerId);
      let matched = false;
      let costUnits: string[] = [];
      if (topId) {
        ctx.revealLifeCard(topId);
        matched = op.filter ? matchesSearchFilter(topId, op.filter, ctx) : true;
        const printedCost = Math.max(0, ctx.definitionOf(topId)?.baseCost ?? 0);
        costUnits = Array.from({ length: printedCost }, (_, i) => String(i));
      }
      workingBindings = {
        ...withResultBindings(workingBindings, EMPTY_RESULT),
        __lastRevealMatched: boolBinding(matched),
        __lastRevealedCostUnits: costUnits,
      };
      continue;
    }
    if (op.op === 'revealOpponentDeckTop') {
      const [topId] = ctx.topOfDeck(ctx.opponentId, 1);
      let matched = false;
      if (topId) {
        ctx.revealCard(topId);
        const chosen = parseInt(workingBindings.__chosenCost?.[0] ?? '-1', 10);
        const printedCost = ctx.definitionOf(topId)?.baseCost ?? -1;
        matched = chosen >= 0 && printedCost === chosen;
      }
      workingBindings = { ...withResultBindings(workingBindings, EMPTY_RESULT), __lastRevealMatched: boolBinding(matched) };
      continue;
    }
    if (op.op === 'ko') {
      const ids = resolveSelector(op.target, ctx, workingBindings);
      for (let ki = 0; ki < ids.length; ki++) {
        const id = ids[ki];
        const record = findKoReplacementRecord(ctx.state(), id, 'effect', defs, {
          removalTrigger: 'ko',
          effectSourceInstanceId: ctx.sourceInstanceId,
        });
        if (record) {
          const suspendOpIndex = coords.branchIndex !== undefined ? coords.opIndex : i;
          const irResume = {
            sourceInstanceId: ctx.sourceInstanceId,
            abilityIndex: coords.abilityIndex,
            opIndex: suspendOpIndex,
            bindings: workingBindings,
            ...(coords.branchIndex !== undefined ? { branchIndex: coords.branchIndex, branchOpIndex: i } : {}),
            remainingKoTargetIds: ids.slice(ki + 1),
          };
          ctx.emitChoice(
            buildKoReplacementConfirmChoice(ctx.state(), id, record, `${ctx.sourceInstanceId}__ko-${coords.abilityIndex}-${i}-${id}`, {
              abilityIndex: coords.abilityIndex,
              opIndex: suspendOpIndex,
              bindings: workingBindings,
              ...(coords.branchIndex !== undefined ? { branchIndex: coords.branchIndex, branchOpIndex: i } : {}),
              koReplacement: {
                phase: 'confirm',
                targetInstanceId: id,
                recordId: record.id,
                cause: 'effect',
                actorPlayerId: ctx.controllerId,
                removalTrigger: 'ko',
                ir: irResume,
              },
            }),
          );
          return { suspended: true, bindings: workingBindings };
        }
        ctx.koApply(id);
      }
      workingBindings = withResultBindings(workingBindings, { selectedIds: ids, movedIds: ids });
      continue;
    }
    if (op.op === 'returnToHand' || op.op === 'moveToBottomDeck') {
      const removalTrigger: KoReplacementTrigger = op.op === 'returnToHand' ? 'returnToHand' : 'bottomDeck';
      const ids = resolveSelector(op.target, ctx, workingBindings);
      for (let ri = 0; ri < ids.length; ri++) {
        const id = ids[ri];
        const record = findKoReplacementRecord(ctx.state(), id, 'effect', defs, {
          removalTrigger,
          effectSourceInstanceId: ctx.sourceInstanceId,
        });
        if (record) {
          const suspendOpIndex = coords.branchIndex !== undefined ? coords.opIndex : i;
          const irResume = {
            sourceInstanceId: ctx.sourceInstanceId,
            abilityIndex: coords.abilityIndex,
            opIndex: suspendOpIndex,
            bindings: workingBindings,
            ...(coords.branchIndex !== undefined ? { branchIndex: coords.branchIndex, branchOpIndex: i } : {}),
            remainingRemovalTargetIds: ids.slice(ri + 1),
            suspendedRemovalOp: op.op,
          };
          ctx.emitChoice(
            buildKoReplacementConfirmChoice(ctx.state(), id, record, `${ctx.sourceInstanceId}__removal-${coords.abilityIndex}-${i}-${id}`, {
              abilityIndex: coords.abilityIndex,
              opIndex: suspendOpIndex,
              bindings: workingBindings,
              ...(coords.branchIndex !== undefined ? { branchIndex: coords.branchIndex, branchOpIndex: i } : {}),
              koReplacement: {
                phase: 'confirm',
                targetInstanceId: id,
                recordId: record.id,
                cause: 'effect',
                actorPlayerId: ctx.controllerId,
                removalTrigger,
                ir: irResume,
              },
            }),
          );
          return { suspended: true, bindings: workingBindings };
        }
        if (op.op === 'returnToHand') ctx.returnToHand(id);
        else ctx.moveToBottomDeck(id);
      }
      workingBindings = withResultBindings(workingBindings, { selectedIds: ids, movedIds: ids });
      continue;
    }
    if (op.op === 'rest') {
      const ids = resolveSelector(op.target, ctx, workingBindings);
      for (let ri = 0; ri < ids.length; ri++) {
        const id = ids[ri];
        const record = findRestReplacementRecord(ctx.state(), id, defs, ctx.sourceInstanceId);
        if (record) {
          const suspendOpIndex = coords.branchIndex !== undefined ? coords.opIndex : i;
          const irResume = {
            sourceInstanceId: ctx.sourceInstanceId,
            abilityIndex: coords.abilityIndex,
            opIndex: suspendOpIndex,
            bindings: workingBindings,
            ...(coords.branchIndex !== undefined ? { branchIndex: coords.branchIndex, branchOpIndex: i } : {}),
            remainingRemovalTargetIds: ids.slice(ri + 1),
          };
          ctx.emitChoice(
            buildRestReplacementConfirmChoice(ctx.state(), id, record, `${ctx.sourceInstanceId}__rest-${coords.abilityIndex}-${i}-${id}`, {
              abilityIndex: coords.abilityIndex,
              opIndex: suspendOpIndex,
              bindings: workingBindings,
              ...(coords.branchIndex !== undefined ? { branchIndex: coords.branchIndex, branchOpIndex: i } : {}),
              koReplacement: {
                phase: 'confirm',
                targetInstanceId: id,
                recordId: record.id,
                cause: 'effect',
                actorPlayerId: ctx.controllerId,
                ir: irResume,
              },
            }),
          );
          return { suspended: true, bindings: workingBindings };
        }
        ctx.rest(id);
      }
      workingBindings = withResultBindings(workingBindings, { selectedIds: ids, movedIds: [] });
      continue;
    }
    if (op.op === 'drawByEventCount') {
      const count = parseInt(workingBindings.__eventHandTrashedCount?.[0] ?? '0', 10);
      ctx.draw(ctx.controllerId, count);
      if (count > 0 && ctx.state().currentPhase !== 'draw') {
        const reactive = fireDrawOutsideDrawPhaseReactions(ctx.state(), ctx.controllerId, registry, defs, actionId);
        if (reactive.pendingChoices.length > 0) {
          ctx.absorbActionResult(reactive);
          return { suspended: true, bindings: workingBindings };
        }
        ctx.replaceState(reactive.state, reactive.log);
      }
      workingBindings = withResultBindings(workingBindings, { selectedIds: [], movedIds: count > 0 ? ['__draw'] : [] });
      continue;
    }
    if (op.op === 'shuffleDeck') {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.shuffleDeck(playerId);
      workingBindings = withResultBindings(workingBindings, { selectedIds: [], movedIds: ['__shuffleDeck'] });
      continue;
    }
    if (op.op === 'returnHandShuffleDraw') {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const returned = ctx.returnHandShuffleDraw(playerId, op.drawAmount);
      const drawCount = op.drawAmount ?? returned;
      if (drawCount > 0 && ctx.state().currentPhase !== 'draw') {
        const reactive = fireDrawOutsideDrawPhaseReactions(ctx.state(), playerId, registry, defs, actionId);
        if (reactive.pendingChoices.length > 0) {
          ctx.absorbActionResult(reactive);
          return { suspended: true, bindings: workingBindings };
        }
        ctx.replaceState(reactive.state, reactive.log);
      }
      workingBindings = withResultBindings(workingBindings, {
        selectedIds: [],
        movedIds: returned > 0 || drawCount > 0 ? ['__returnHandShuffleDraw'] : [],
      });
      continue;
    }
    if (op.op === 'dealDamage') {
      const targetPlayerId = op.player === 'controller' ? ctx.controllerId : ctx.opponentId;
      const damaged = dealLifeDamage({
        state: ctx.state(),
        defs,
        registry,
        actorPlayerId: ctx.controllerId,
        targetPlayerId,
        amount: op.amount,
        actionId,
        sourceInstanceId: ctx.sourceInstanceId,
      });
      ctx.replaceState(damaged.state, damaged.log);
      for (const choice of damaged.pendingChoices) ctx.emitChoice(choice);

      if (damaged.hitsResolved > 0 && !ctx.state().gameOver) {
        const lifeToHand = fireLifeToHandReactions(ctx.state(), targetPlayerId, registry, defs, actionId);
        if (ctx.absorbActionResult(lifeToHand)) {
          workingBindings = withResultBindings(workingBindings, {
            selectedIds: [],
            movedIds: ['__dealDamage'],
          });
          return { suspended: true, bindings: workingBindings };
        }
        const lifeDamage = fireLifeDamageDealtReactions(ctx.state(), ctx.controllerId, registry, defs, actionId);
        if (ctx.absorbActionResult(lifeDamage)) {
          workingBindings = withResultBindings(workingBindings, {
            selectedIds: [],
            movedIds: ['__dealDamage'],
          });
          return { suspended: true, bindings: workingBindings };
        }
      }

      if (damaged.pendingChoices.length > 0) {
        workingBindings = withResultBindings(workingBindings, {
          selectedIds: [],
          movedIds: damaged.hitsResolved > 0 ? ['__dealDamage'] : [],
        });
        return { suspended: true, bindings: workingBindings };
      }

      workingBindings = withResultBindings(workingBindings, {
        selectedIds: [],
        movedIds: damaged.hitsResolved > 0 ? ['__dealDamage'] : [],
      });
      continue;
    }
    if (op.op === 'drawByTypedCharacterCount') {
      const count = countSelfTypedCharacters(ctx.state(), defs, ctx.controllerId, op.typeIncludes);
      ctx.draw(ctx.controllerId, count);
      if (count > 0 && ctx.state().currentPhase !== 'draw') {
        const reactive = fireDrawOutsideDrawPhaseReactions(ctx.state(), ctx.controllerId, registry, defs, actionId);
        if (reactive.pendingChoices.length > 0) {
          ctx.absorbActionResult(reactive);
          return { suspended: true, bindings: workingBindings };
        }
        ctx.replaceState(reactive.state, reactive.log);
      }
      workingBindings = {
        ...withResultBindings(workingBindings, { selectedIds: [], movedIds: count > 0 ? ['__draw'] : [] }),
        __lastDrawCount: [String(count)],
      };
      continue;
    }
    if (op.op === 'draw') {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.draw(playerId, op.amount);
      if (op.amount > 0 && ctx.state().currentPhase !== 'draw') {
        const reactive = fireDrawOutsideDrawPhaseReactions(ctx.state(), playerId, registry, defs, actionId);
        if (reactive.pendingChoices.length > 0) {
          ctx.absorbActionResult(reactive);
          return { suspended: true, bindings: workingBindings };
        }
        ctx.replaceState(reactive.state, reactive.log);
      }
      workingBindings = withResultBindings(workingBindings, { selectedIds: [], movedIds: op.amount > 0 ? ['__draw'] : [] });
      continue;
    }
    if (op.op === 'drawUntilHandCount') {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      const handCount = playerId === ctx.controllerId ? ctx.controllerHandIds().length : ctx.opponentHandIds().length;
      const amount = Math.max(0, op.targetCount - handCount);
      ctx.draw(playerId, amount);
      if (amount > 0 && ctx.state().currentPhase !== 'draw') {
        const reactive = fireDrawOutsideDrawPhaseReactions(ctx.state(), playerId, registry, defs, actionId);
        if (reactive.pendingChoices.length > 0) {
          ctx.absorbActionResult(reactive);
          return { suspended: true, bindings: workingBindings };
        }
        ctx.replaceState(reactive.state, reactive.log);
      }
      workingBindings = withResultBindings(workingBindings, { selectedIds: [], movedIds: amount > 0 ? ['__draw'] : [] });
      continue;
    }
    workingBindings = withResultBindings(workingBindings, applyOp(op, ctx, workingBindings));
  }
  return { suspended: false, bindings: workingBindings };
}

function continueAfterResolvedOp(
  program: EffectProgram,
  ability: Ability,
  rs: NonNullable<PendingChoice['resumeState']>,
  nextBindings: Record<string, string[]>,
  ctx: EffectContextImpl,
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  if (rs.branchIndex !== undefined) {
    const chooseOp = ability.ops[rs.opIndex];
    if (chooseOp?.op !== 'chooseOption') return ctx.finish();
    const branch = chooseOp.options[rs.branchIndex];
    if (!branch) return ctx.finish();
    const branchResult = runOpList(
      branch.ops,
      { abilityIndex: rs.abilityIndex, opIndex: rs.opIndex, branchIndex: rs.branchIndex },
      (rs.branchOpIndex ?? 0) + 1,
      nextBindings,
      ctx,
      defs,
      registry,
      actionId,
    );
    if (branchResult.suspended) return finishWithCascade(ctx, defs, actionId, registry);
    const mainSuspended = runOps(ability, rs.abilityIndex, rs.opIndex + 1, branchResult.bindings, ctx, defs, registry, actionId);
    if (!mainSuspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }
  const suspended = runOps(ability, rs.abilityIndex, rs.opIndex + 1, nextBindings, ctx, defs, registry, actionId);
  if (!suspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
  return finishWithCascade(ctx, defs, actionId, registry);
}

/** Runs ops from `startOp`. Returns true if it suspended on a chooseTargets op. */
function runOps(
  ability: Ability,
  abilityIndex: number,
  startOp: number,
  bindings: Record<string, string[]>,
  ctx: EffectContextImpl,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
  actionId: string | null = null,
): boolean {
  return runOpList(ability.ops, { abilityIndex, opIndex: startOp }, startOp, bindings, ctx, defs, registry, actionId).suspended;
}

function runFollowingAbilities(
  program: EffectProgram,
  timing: IrTiming,
  startAbilityIndex: number,
  ctx: EffectContextImpl,
  defs: CardDefinitionLookup,
  actionId: string | null,
  payCosts: boolean,
  registry: EffectTemplateRegistry,
  eventContext?: GateEvalContext,
): boolean {
  for (let i = startAbilityIndex; i < program.abilities.length; i += 1) {
    const ability = program.abilities[i];
    if (ability.timing !== timing) continue;
    if (isAbilityNegated(ctx.state(), ctx.sourceInstanceId, ability.timing, defs)) continue;
    if (!evalCondition(ability.condition, ctx)) continue;
    if (ability.gate?.length && !evaluateGates(ability.gate, ctx.state(), defs, ctx.controllerId, ctx.sourceInstanceId, eventContext)) continue;
    if (payCosts && suspendOrPayAbilityCost(ability, i, ctx, actionId, defs, registry)) return true;
    const suspended = runOps(ability, i, 0, initialBindings(eventContext), ctx, defs, registry, actionId);
    if (suspended) return true;
  }
  return false;
}

function suspendOrPayAbilityCost(
  ability: Ability,
  abilityIndex: number,
  ctx: EffectContextImpl,
  actionId: string | null,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
): boolean {
  if (!ability.cost?.length) return false;

  const requiredDon = requiredDonMinusCount(ability.cost);
  if (requiredDon > 0) {
    const activeOnly = ability.cost.some((c) => c.kind === 'donMinus' && c.activeOnly);
    const candidates = donMinusCandidateIds(ctx.state(), ctx.controllerId, ability.cost);
    if (candidates.length < requiredDon) return false;
    ctx.emitChoice({
      id: `${ctx.sourceInstanceId}__ir-cost-${abilityIndex}`,
      playerId: ctx.controllerId,
      kind: 'SELECT_CARDS',
      prompt: `Choose ${requiredDon} ${activeOnly ? 'active ' : ''}DON!! on your field to return to your DON!! deck.`,
      constraints: { min: requiredDon, max: requiredDon, candidateInstanceIds: candidates },
      sourceInstanceId: ctx.sourceInstanceId,
      sourceEffectId: 'ir',
      resumeState: { abilityIndex, opIndex: -1, bindings: {} },
    });
    return true;
  }

  if (canPayAbilityCost(ctx.state(), ctx.sourceInstanceId, ctx.controllerId, ability.cost, []).length > 0) return false;
  const paid = payAbilityCost(ctx.state(), ctx.sourceInstanceId, ctx.controllerId, ability.cost, actionId, []);
  ctx.replaceState(paid.state, paid.log);
  if (paid.restedInstanceIds.length > 0 || paid.returnedDonCount > 0) {
    const cascaded = afterAbilityCostPaid(paid.state, ctx.controllerId, paid, registry, defs, actionId);
    if (ctx.absorbActionResult(cascaded)) return true;
  }
  return false;
}

/** Fire all abilities whose timing is in `timings`, in program order, until one suspends. */
export function runTimings(
  program: EffectProgram,
  timings: IrTiming[],
  state: GameState,
  sourceInstanceId: string,
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry = {},
  payCosts = true,
  eventContext?: GateEvalContext,
): ActionExecuteResult {
  const matching = program.abilities
    .map((ability, index) => ({ ability, index }))
    .filter(({ ability }) => timings.includes(ability.timing));
  if (matching.length === 0) return noop(state);

  const ctx = new EffectContextImpl(state, sourceInstanceId, defs, actionId, registry);
  for (const { ability, index } of matching) {
    if (isAbilityNegated(ctx.state(), ctx.sourceInstanceId, ability.timing, defs)) continue;
    if (!evalCondition(ability.condition, ctx)) continue;
    // "If …" board-state gate: an unmet precondition means the ability does nothing.
    if (ability.gate?.length && !evaluateGates(ability.gate, ctx.state(), defs, ctx.controllerId, ctx.sourceInstanceId, eventContext)) continue;
    if (ability.battleTargetIsOpponentLeader) {
      const battle = ctx.state().currentBattle;
      const target = battle ? ctx.state().cardsById[battle.targetInstanceId] : undefined;
      if (!target || target.currentZone !== 'leaderArea' || target.ownerId !== ctx.opponentId) continue;
    }
    if (payCosts && suspendOrPayAbilityCost(ability, index, ctx, actionId, defs, registry)) break;
    const suspended = runOps(ability, index, 0, initialBindings(eventContext), ctx, defs, registry, actionId);
    if (suspended) break; // wait for the choice before any further ability runs
  }
  return finishWithCascade(ctx, defs, actionId, registry);
}

/** Resume a program suspended on a chooseTargets op, binding the player's selection. */
export function resumeProgram(
  program: EffectProgram,
  state: GameState,
  choice: PendingChoice,
  response: string[] | number | boolean,
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const rs = choice.resumeState;
  if (!rs || !choice.sourceInstanceId) return noop(state);

  const stateWithoutChoice: GameState = { ...state, pendingChoices: state.pendingChoices.filter((c) => c.id !== choice.id) };

  if (rs.koReplacement) {
    const step = resolveKoReplacementStep(state, choice, response, defs, actionId);
    if (step.pendingChoices.length > 0) {
      return { state: { ...step.state, pendingChoices: [...step.state.pendingChoices, ...step.pendingChoices] }, log: step.log, pendingChoices: step.pendingChoices };
    }
    let working = step.state;
    let log = step.log;
    if (step.declinedEffectKoTargetId) {
      const fired = fireOnKO(working, step.declinedEffectKoTargetId, registry, defs, actionId, {
        cause: 'effect',
        sourceInstanceId: step.resumeKr?.ir?.sourceInstanceId,
      });
      working = fired.state;
      log = [...log, ...fired.log];
      if (fired.pendingChoices.length > 0) {
        return { state: working, log, pendingChoices: fired.pendingChoices };
      }
    }
    if (step.declinedRemoval) {
      const declineCtx = new EffectContextImpl(working, step.resumeKr?.ir?.sourceInstanceId ?? choice.sourceInstanceId ?? '', defs, actionId, registry);
      if (step.declinedRemoval.kind === 'returnToHand') declineCtx.returnToHand(step.declinedRemoval.targetInstanceId);
      else declineCtx.moveToBottomDeck(step.declinedRemoval.targetInstanceId);
      const declined = declineCtx.finish();
      working = declined.state;
      log = [...log, ...declined.log];
    }
    if (step.resumeKr) {
      const continued = continueKoOpAfterReplacement(working, step.resumeKr, defs, actionId, registry);
      return { state: continued.state, log: [...log, ...continued.log], pendingChoices: continued.pendingChoices };
    }
    return { state: working, log, pendingChoices: [] };
  }

  if (rs.opIndex === -2) {
    if (response !== true) return noop(stateWithoutChoice);
    const ability = program.abilities[rs.abilityIndex];
    if (!ability) return noop(stateWithoutChoice);
    const ctx = new EffectContextImpl(stateWithoutChoice, choice.sourceInstanceId, defs, actionId, registry);
    const suspended = runOps(ability, rs.abilityIndex, 0, rs.bindings, ctx, defs, registry, actionId);
    if (suspended) return finishWithCascade(ctx, defs, actionId, registry);
    runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }

  const ability = program.abilities[rs.abilityIndex];
  if (!ability) return noop(state);
  if (rs.opIndex === -1) {
    if (!ability.cost?.length) return noop(stateWithoutChoice);
    const selection = Array.isArray(response) ? response : [];
    const reasons = canPayAbilityCost(stateWithoutChoice, choice.sourceInstanceId, choice.playerId, ability.cost, selection);
    if (reasons.length > 0) return noop(stateWithoutChoice);
    const paid = payAbilityCost(stateWithoutChoice, choice.sourceInstanceId, choice.playerId, ability.cost, actionId, selection);
    const ctx = new EffectContextImpl(paid.state, choice.sourceInstanceId, defs, actionId, registry);
    if (paid.restedInstanceIds.length > 0 || paid.returnedDonCount > 0) {
      const cascaded = afterAbilityCostPaid(paid.state, choice.playerId, paid, registry, defs, actionId);
      ctx.absorbActionResult(cascaded);
      if (cascaded.pendingChoices.length > 0) {
        const finished = finishWithCascade(ctx, defs, actionId, registry);
        return { state: finished.state, log: [...paid.log, ...cascaded.log, ...finished.log], pendingChoices: finished.pendingChoices };
      }
    }
    const suspended = runOps(ability, rs.abilityIndex, 0, rs.bindings, ctx, defs, registry, actionId);
    if (!suspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    const finished = finishWithCascade(ctx, defs, actionId, registry);
    return { state: finished.state, log: [...paid.log, ...finished.log], pendingChoices: finished.pendingChoices };
  }

  const ctx = new EffectContextImpl(stateWithoutChoice, choice.sourceInstanceId, defs, actionId, registry);
  const op = suspendedOpAt(ability, rs);
  if (!op || (op.op !== 'chooseTargets' && op.op !== 'chooseCost' && op.op !== 'searchTopDeck' && op.op !== 'searchDeck' && op.op !== 'playFromDeck' && op.op !== 'playStageFromDeck' && op.op !== 'lookLifeAndReorder' && op.op !== 'peekLifeThenPlace' && op.op !== 'chooseLifeToHand' && op.op !== 'chooseLifeToTrash' && op.op !== 'chooseOption' && op.op !== 'trashFromHandByCountVar')) return noop(stateWithoutChoice);

  const preserveBranch = (bindings: Record<string, string[]>): PendingChoice['resumeState'] => ({
    abilityIndex: rs.abilityIndex,
    opIndex: rs.opIndex,
    ...(rs.branchIndex !== undefined ? { branchIndex: rs.branchIndex, branchOpIndex: rs.branchOpIndex } : {}),
    bindings,
  });

  if (op.op === 'searchTopDeck') {
    const selection = Array.isArray(response) ? response : [];
    // The chosen subset goes to hand; resolveSearch sends the looked remainder
    // to the bottom. `__looked` was stashed at suspend time (see runOps).
    const looked = rs.bindings.__looked ?? [];
    const remainder = (rs.bindings.__remainder?.[0] ?? op.remainder ?? 'bottom') as SearchRemainderDestination;
    const reveal = (rs.bindings.__reveal?.[0] ?? (op.reveal ? 'true' : 'false')) === 'true';
    const destination = (rs.bindings.__destination?.[0] ?? op.destination) as SearchPickDestination;
    const chosen = rs.bindings.__searchChosen ?? selection;
    if (destination === 'deckTopOrBottom') {
      const ordered = rs.bindings.__searchOrdered ?? selection;
      if (!rs.bindings.__searchOrdered) {
        const placementChoice: PendingChoice = {
          id: `${choice.sourceInstanceId}__ir-${rs.abilityIndex}-${rs.opIndex}-top-or-bottom`,
          playerId: ctx.controllerId,
          kind: 'SELECT_OPTION',
          prompt: 'Place the ordered looked cards on the top or bottom of your deck?',
          constraints: { min: 1, max: 1, options: [{ label: 'Top of deck' }, { label: 'Bottom of deck' }] },
          sourceInstanceId: choice.sourceInstanceId,
          sourceEffectId: 'ir',
          resumeState: preserveBranch({ ...rs.bindings, __searchOrdered: selection }),
        };
        ctx.emitChoice(placementChoice);
        return ctx.finish();
      }
      const placeOnTop = typeof response === 'number' ? response === 0 : true;
      ctx.searchResolveTopOrBottom(ctx.controllerId, looked, placeOnTop ? ordered : [], placeOnTop ? [] : ordered);
      const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: ordered, movedIds: looked });
      return continueAfterResolvedOp(program, ability, rs, afterSearchBindings, ctx, defs, actionId, registry);
    }
    if (remainder === 'deckTopOrBottom' && (destination === 'hand' || destination === 'play')) {
      const looked = rs.bindings.__looked ?? [];
      const pickChosen = rs.bindings.__searchPickChosen ?? selection;
      const restAfterPick = looked.filter((id) => !new Set(pickChosen).has(id));
      if (!rs.bindings.__searchPickChosen) {
        if (restAfterPick.length === 0) {
          if (destination === 'play') {
            ctx.searchPlayResolveWithTopOrBottomRemainder(ctx.controllerId, looked, pickChosen, [], [], op.rested === true);
          } else {
            ctx.searchResolveHandWithTopOrBottomRemainder(ctx.controllerId, looked, pickChosen, [], [], reveal);
          }
          const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: pickChosen, movedIds: pickChosen });
          return continueAfterResolvedOp(program, ability, rs, afterSearchBindings, ctx, defs, actionId, registry);
        }
        const orderChoice: PendingChoice = {
          id: `${choice.sourceInstanceId}__ir-${rs.abilityIndex}-${rs.opIndex}-remainder-order`,
          playerId: ctx.controllerId,
          kind: 'SELECT_CARDS',
          prompt: 'Choose the order for the remaining looked card(s). You will choose top or bottom next.',
          constraints: { min: restAfterPick.length, max: restAfterPick.length, candidateInstanceIds: restAfterPick },
          sourceInstanceId: choice.sourceInstanceId,
          sourceEffectId: 'ir',
          resumeState: preserveBranch({ ...rs.bindings, __searchPickChosen: pickChosen }),
        };
        ctx.emitChoice(orderChoice);
        return ctx.finish();
      }
      const orderedRest = rs.bindings.__searchOrderedRemainder ?? selection;
      if (!rs.bindings.__searchOrderedRemainder) {
        const placementChoice: PendingChoice = {
          id: `${choice.sourceInstanceId}__ir-${rs.abilityIndex}-${rs.opIndex}-remainder-top-or-bottom`,
          playerId: ctx.controllerId,
          kind: 'SELECT_OPTION',
          prompt: 'Place the ordered remaining looked card(s) on the top or bottom of your deck?',
          constraints: { min: 1, max: 1, options: [{ label: 'Top of deck' }, { label: 'Bottom of deck' }] },
          sourceInstanceId: choice.sourceInstanceId,
          sourceEffectId: 'ir',
          resumeState: preserveBranch({ ...rs.bindings, __searchOrderedRemainder: selection }),
        };
        ctx.emitChoice(placementChoice);
        return ctx.finish();
      }
      const placeOnTop = typeof response === 'number' ? response === 0 : true;
      if (destination === 'play') {
        ctx.searchPlayResolveWithTopOrBottomRemainder(
          ctx.controllerId,
          looked,
          pickChosen,
          placeOnTop ? orderedRest : [],
          placeOnTop ? [] : orderedRest,
          op.rested === true,
        );
      } else {
        ctx.searchResolveHandWithTopOrBottomRemainder(
          ctx.controllerId,
          looked,
          pickChosen,
          placeOnTop ? orderedRest : [],
          placeOnTop ? [] : orderedRest,
          reveal,
        );
      }
      const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: pickChosen, movedIds: pickChosen });
      return continueAfterResolvedOp(program, ability, rs, afterSearchBindings, ctx, defs, actionId, registry);
    }
    if (remainder === 'bottom' && !rs.bindings.__searchChosen) {
      const chosenSet = new Set(selection);
      const rest = looked.filter((id) => !chosenSet.has(id));
      if (rest.length > 1) {
        const bottomOrderChoice: PendingChoice = {
          id: `${choice.sourceInstanceId}__ir-${rs.abilityIndex}-${rs.opIndex}-bottom-order`,
          playerId: ctx.controllerId,
          kind: 'SELECT_CARDS',
          prompt: 'Choose the order to place the remaining looked cards at the bottom of your deck. First selected is placed first; last selected becomes the bottom card.',
          constraints: { min: rest.length, max: rest.length, candidateInstanceIds: rest },
          sourceInstanceId: choice.sourceInstanceId,
          sourceEffectId: 'ir',
            resumeState: preserveBranch({ ...rs.bindings, __searchChosen: selection }),
        };
        ctx.emitChoice(bottomOrderChoice);
        return ctx.finish();
      }
    }
    if (destination === 'play') {
      ctx.searchPlayResolve(ctx.controllerId, looked, chosen, remainder, op.rested === true, rs.bindings.__searchChosen ? selection : undefined);
    } else {
      ctx.searchResolve(ctx.controllerId, looked, chosen, remainder, reveal, destination, rs.bindings.__searchChosen ? selection : undefined);
    }
    const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: chosen, movedIds: chosen });
    return continueAfterResolvedOp(program, ability, rs, afterSearchBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'playFromDeck') {
    const selection = Array.isArray(response) ? response : [];
    for (const id of selection) ctx.playCharacterFromDeck(id, op.rested === true);
    ctx.shuffleDeck(ctx.controllerId);
    const afterPlayBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterPlayBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'playStageFromDeck') {
    const selection = Array.isArray(response) ? response : [];
    for (const id of selection) ctx.playStageFromDeck(id);
    ctx.shuffleDeck(ctx.controllerId);
    const afterPlayBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterPlayBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'searchDeck') {
    const selection = Array.isArray(response) ? response : [];
    ctx.searchDeckResolve(ctx.controllerId, selection, op.reveal);
    const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterSearchBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'lookLifeAndReorder') {
    const selection = Array.isArray(response) ? response : [];
    const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
    const deckTopId = op.moveOneToDeckTop === true ? selection[0] : undefined;
    const lifeOrder = op.moveOneToDeckTop === true ? selection.slice(1) : selection;
    ctx.reorderLife(playerId, lifeOrder, deckTopId);
    const afterLifeBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterLifeBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'peekLifeThenPlace') {
    const selection = Array.isArray(response) ? response : [];
    for (const id of selection) ctx.moveLifeToBottom(id);
    const afterPeekBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterPeekBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'chooseLifeToHand') {
    const selectedIndex = typeof response === 'number' ? response : -1;
    const afterLifeBindings = withResultBindings(rs.bindings, resolveLifePositionToHand(ctx, op.position, op.optional, selectedIndex, op.player ?? 'controller'));
    return continueAfterResolvedOp(program, ability, rs, afterLifeBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'chooseLifeToTrash') {
    const selectedIndex = typeof response === 'number' ? response : -1;
    const afterLifeBindings = withResultBindings(rs.bindings, resolveLifePositionToTrash(ctx, op.position, op.optional, selectedIndex));
    return continueAfterResolvedOp(program, ability, rs, afterLifeBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'chooseOption') {
    const selectedIndex = typeof response === 'number' ? response : -1;
    const branch = op.options[selectedIndex];
    if (!branch) return noop(stateWithoutChoice);
    const branchResult = runOpList(
      branch.ops,
      { abilityIndex: rs.abilityIndex, opIndex: rs.opIndex, branchIndex: selectedIndex },
      0,
      rs.bindings,
      ctx,
      defs,
      registry,
      actionId,
    );
    if (branchResult.suspended) return finishWithCascade(ctx, defs, actionId, registry);
    const mainSuspended = runOps(ability, rs.abilityIndex, rs.opIndex + 1, branchResult.bindings, ctx, defs, registry, actionId);
    if (!mainSuspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }

  if (op.op === 'chooseCost') {
    const cost = typeof response === 'number' ? response : -1;
    const bindings: Record<string, string[]> = { ...rs.bindings, __chosenCost: [String(cost)] };
    return continueAfterResolvedOp(program, ability, rs, bindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'trashFromHandByCountVar') {
    const selection = Array.isArray(response) ? response : [];
    for (const id of selection) ctx.trashCard(id);
    const afterTrashBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterTrashBindings, ctx, defs, actionId, registry);
  }

  const selection = Array.isArray(response) ? response : [];
  const bindings: Record<string, string[]> = {
    ...rs.bindings,
    [op.var]: selection,
    __lastSelected: boolBinding(selection.length > 0),
  };
  return continueAfterResolvedOp(program, ability, rs, bindings, ctx, defs, actionId, registry);
}

/** Continue a suspended `ko` op after replacement (or declined K.O.) resolves. */
function continueKoOpAfterReplacement(
  state: GameState,
  kr: NonNullable<PendingChoice['resumeState']>['koReplacement'],
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  const ir = kr?.ir;
  if (!ir) return { state, log: [], pendingChoices: [] };
  const defId = state.cardsById[ir.sourceInstanceId]?.cardDefinitionId ?? '';
  const program = registry[defId];
  if (!program) return { state, log: [], pendingChoices: [] };

  const ctx = new EffectContextImpl(state, ir.sourceInstanceId, defs, actionId, registry);
  const pendingRemovalIds = [...(ir.remainingRemovalTargetIds ?? [])];
  const suspendedRemovalOp = ir.suspendedRemovalOp;
  if (suspendedRemovalOp && pendingRemovalIds.length >= 0) {
    const removalTrigger: KoReplacementTrigger = suspendedRemovalOp === 'returnToHand' ? 'returnToHand' : 'bottomDeck';
    for (let ri = 0; ri < pendingRemovalIds.length; ri++) {
      const id = pendingRemovalIds[ri];
      const record = findKoReplacementRecord(ctx.state(), id, 'effect', defs, {
        removalTrigger,
        effectSourceInstanceId: ir.sourceInstanceId,
      });
      if (record) {
        ctx.emitChoice(
          buildKoReplacementConfirmChoice(ctx.state(), id, record, `${ir.sourceInstanceId}__removal-resume-${id}`, {
            abilityIndex: ir.abilityIndex,
            opIndex: ir.opIndex,
            bindings: ir.bindings,
            ...(ir.branchIndex !== undefined ? { branchIndex: ir.branchIndex, branchOpIndex: ir.branchOpIndex } : {}),
            koReplacement: {
              phase: 'confirm',
              targetInstanceId: id,
              recordId: record.id,
              cause: 'effect',
              actorPlayerId: ctx.controllerId,
              removalTrigger,
              ir: { ...ir, remainingRemovalTargetIds: pendingRemovalIds.slice(ri + 1) },
            },
          }),
        );
        return finishWithCascade(ctx, defs, actionId, registry);
      }
      if (suspendedRemovalOp === 'returnToHand') ctx.returnToHand(id);
      else ctx.moveToBottomDeck(id);
    }
  }

  const pendingRestIds = ir.suspendedRemovalOp ? [] : [...(ir.remainingRemovalTargetIds ?? [])];
  for (let ri = 0; ri < pendingRestIds.length; ri++) {
    const id = pendingRestIds[ri];
    const record = findRestReplacementRecord(ctx.state(), id, defs, ir.sourceInstanceId);
    if (record) {
      ctx.emitChoice(
        buildRestReplacementConfirmChoice(ctx.state(), id, record, `${ir.sourceInstanceId}__rest-resume-${id}`, {
          abilityIndex: ir.abilityIndex,
          opIndex: ir.opIndex,
          bindings: ir.bindings,
          ...(ir.branchIndex !== undefined ? { branchIndex: ir.branchIndex, branchOpIndex: ir.branchOpIndex } : {}),
          koReplacement: {
            phase: 'confirm',
            targetInstanceId: id,
            recordId: record.id,
            cause: 'effect',
            actorPlayerId: ctx.controllerId,
            ir: { ...ir, remainingRemovalTargetIds: pendingRestIds.slice(ri + 1) },
          },
        }),
      );
      return finishWithCascade(ctx, defs, actionId, registry);
    }
    ctx.rest(id);
  }

  const pendingKoIds = [...(ir.remainingKoTargetIds ?? [])];
  for (let ki = 0; ki < pendingKoIds.length; ki++) {
    const id = pendingKoIds[ki];
    const record = findKoReplacementRecord(ctx.state(), id, 'effect', defs, {
      removalTrigger: 'ko',
      effectSourceInstanceId: ir.sourceInstanceId,
    });
    if (record) {
      const suspendOpIndex = ir.branchIndex !== undefined ? ir.opIndex : ir.opIndex;
      ctx.emitChoice(
        buildKoReplacementConfirmChoice(ctx.state(), id, record, `${ir.sourceInstanceId}__ko-resume-${id}`, {
          abilityIndex: ir.abilityIndex,
          opIndex: suspendOpIndex,
          bindings: ir.bindings,
          ...(ir.branchIndex !== undefined ? { branchIndex: ir.branchIndex, branchOpIndex: ir.branchOpIndex } : {}),
          koReplacement: {
            phase: 'confirm',
            targetInstanceId: id,
            recordId: record.id,
            cause: 'effect',
            actorPlayerId: ctx.controllerId,
            ir: { ...ir, remainingKoTargetIds: pendingKoIds.slice(ki + 1) },
          },
        }),
      );
      return finishWithCascade(ctx, defs, actionId, registry);
    }
    ctx.koApply(id);
  }

  const ability = program.abilities[ir.abilityIndex];
  if (!ability) return ctx.finish();

  if (ir.branchIndex !== undefined) {
    const chooseOp = ability.ops[ir.opIndex];
    if (chooseOp?.op !== 'chooseOption') return ctx.finish();
    const branch = chooseOp.options[ir.branchIndex];
    if (!branch) return ctx.finish();
    const branchResult = runOpList(
      branch.ops,
      { abilityIndex: ir.abilityIndex, opIndex: ir.opIndex, branchIndex: ir.branchIndex },
      (ir.branchOpIndex ?? 0) + 1,
      ir.bindings,
      ctx,
      defs,
      registry,
      actionId,
    );
    if (branchResult.suspended) return finishWithCascade(ctx, defs, actionId, registry);
    const mainSuspended = runOps(ability, ir.abilityIndex, ir.opIndex + 1, branchResult.bindings, ctx, defs, registry, actionId);
    if (!mainSuspended) runFollowingAbilities(program, ability.timing, ir.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }

  const suspended = runOps(ability, ir.abilityIndex, ir.opIndex + 1, ir.bindings, ctx, defs, registry, actionId);
  if (!suspended) runFollowingAbilities(program, ability.timing, ir.abilityIndex + 1, ctx, defs, actionId, true, registry);
  return finishWithCascade(ctx, defs, actionId, registry);
}
