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
import { buildKoReplacementConfirmChoice, findKoReplacementRecord, resolveKoReplacementStep } from '../rules/shared/koAttempt';
import { EffectContextImpl } from './effectContext';
import { evaluateGates } from './gates';
import { canPayAbilityCost, fieldDonIds, payAbilityCost, requiredDonMinusCount } from './abilityCost';
import { fireOnKO, fireRestTransitions } from './fireTiming';
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
  if (op.ifGate?.length && !evaluateGates(op.ifGate, ctx.state(), defs, ctx.controllerId, ctx.sourceInstanceId)) return false;
  return true;
}

function withResultBindings(bindings: Record<string, string[]>, result: OpResult): Record<string, string[]> {
  return {
    ...bindings,
    __lastSelected: boolBinding(result.selectedIds.length > 0),
    __lastMoved: boolBinding(result.movedIds.length > 0),
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
    const id = queue.shift()!;
    const inst = working.cardsById[id];
    const program = inst ? registry[inst.cardDefinitionId] : undefined;
    if (!program) continue;
    const idx = program.abilities.findIndex((a) => a.timing === 'onKO');
    if (idx < 0) continue;
    const sub = new EffectContextImpl(working, id, defs, actionId);
    const suspended = runOps(program.abilities[idx], idx, 0, {}, sub, defs);
    const subRes = sub.finish();
    working = subRes.state;
    log = [...log, ...subRes.log];
    queue.push(...sub.takeKoed());
    if (suspended) return { state: working, log, pendingChoices: subRes.pendingChoices };
  }

  const restedQueue = ctx.takeRested();
  guard = 0;
  while (restedQueue.length > 0 && guard++ < 200) {
    const id = restedQueue.shift()!;
    const inst = working.cardsById[id];
    const program = inst ? registry[inst.cardDefinitionId] : undefined;
    if (!program?.abilities.some((a) => a.timing === 'onRested')) continue;
    const subRes = runTimings(program, ['onRested'], working, id, defs, actionId, registry, false);
    working = subRes.state;
    log = [...log, ...subRes.log];
    if (subRes.pendingChoices.length > 0) return { state: working, log, pendingChoices: subRes.pendingChoices };
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

function matchesSearchFilter(id: string, filter: SearchFilter, ctx: EffectContextImpl): boolean {
  const def = ctx.definitionOf(id);
  if (!def) return false;
  if (filter.anyOf !== undefined && !filter.anyOf.some((child) => matchesSearchFilter(id, child, ctx))) return false;
  const selfName = ctx.definitionOf(ctx.sourceInstanceId)?.name;
  if (filter.typeIncludes && !hasType(def.types, filter.typeIncludes)) return false;
  if (filter.excludeSelfName && selfName !== undefined && def.name === selfName) return false;
  if (filter.category && def.category !== filter.category) return false;
  if (filter.color && !def.colors.includes(filter.color)) return false;
  if (filter.name && def.name !== filter.name) return false;
  if (filter.maxCost !== undefined && (def.baseCost ?? Infinity) > filter.maxCost) return false;
  if (filter.minCost !== undefined && (def.baseCost ?? -Infinity) < filter.minCost) return false;
  if (filter.exactCost !== undefined && (def.baseCost ?? -1) !== filter.exactCost) return false;
  if (filter.maxPower !== undefined && (def.basePower ?? Infinity) > filter.maxPower) return false;
  if (filter.minPower !== undefined && (def.basePower ?? -Infinity) < filter.minPower) return false;
  if (filter.exactPower !== undefined && (def.basePower ?? -1) !== filter.exactPower) return false;
  if (filter.hasTrigger !== undefined && !!def.hasTrigger !== filter.hasTrigger) return false;
  return true;
}

function searchEligible(ids: string[], filter: SearchFilter | undefined, ctx: EffectContextImpl): string[] {
  if (!filter) return ids;
  return ids.filter((id) => matchesSearchFilter(id, filter, ctx));
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

function lifePositionOptions(ctx: EffectContextImpl, position: 'top' | 'topOrBottom', optional: boolean): { label: string; position: 'decline' | 'top' | 'bottom' }[] {
  const life = ctx.state().players[ctx.controllerId]?.lifeArea.cardIds ?? [];
  if (life.length === 0) return optional ? [{ label: 'Do not add a Life card.', position: 'decline' }] : [];
  const options: { label: string; position: 'decline' | 'top' | 'bottom' }[] = [];
  if (optional) options.push({ label: 'Do not add a Life card.', position: 'decline' });
  options.push({ label: 'Top Life card', position: 'top' });
  if (position === 'topOrBottom' && life.length > 1) options.push({ label: 'Bottom Life card', position: 'bottom' });
  return options;
}

function resolveLifePositionToHand(ctx: EffectContextImpl, position: 'top' | 'topOrBottom', optional: boolean, selectedIndex: number): OpResult {
  const options = lifePositionOptions(ctx, position, optional);
  const selected = options[selectedIndex];
  if (!selected || selected.position === 'decline') return EMPTY_RESULT;
  const life = ctx.state().players[ctx.controllerId]?.lifeArea.cardIds ?? [];
  const id = selected.position === 'top' ? life[0] : life[life.length - 1];
  if (!id) return EMPTY_RESULT;
  ctx.moveToHand(id);
  return { selectedIds: [id], movedIds: [id] };
}

function resolveLifePositionToTrash(ctx: EffectContextImpl, position: 'top' | 'topOrBottom', optional: boolean, selectedIndex: number): OpResult {
  const options = lifePositionOptions(ctx, position, optional);
  const selected = options[selectedIndex];
  if (!selected || selected.position === 'decline') return EMPTY_RESULT;
  const life = ctx.state().players[ctx.controllerId]?.lifeArea.cardIds ?? [];
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

function effectiveMaxCost(sel: { maxCost?: number; maxCostFromOpponentLife?: boolean }, ctx: EffectContextImpl): number | undefined {
  if (sel.maxCostFromOpponentLife) return ctx.state().players[ctx.opponentId].lifeArea.cardIds.length;
  return sel.maxCost;
}

function resolveSelector(sel: Selector, ctx: EffectContextImpl, bindings: Record<string, string[]>): string[] {
  switch (sel.sel) {
    case 'self':
      return [ctx.sourceInstanceId];
    case 'controllerLeader':
      return [ctx.controllerLeaderId()];
    case 'controllerCharacters': {
      let ids = ctx.controllerCharacterIds();
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      ids = applyBaseFilters(ids, sel, ctx);
      if (sel.color !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.colors.includes(sel.color!) === true);
      if (sel.rested !== undefined) ids = ids.filter((id) => (ctx.state().cardsById[id]?.orientation === 'rested') === sel.rested);
      if (sel.typeIncludes !== undefined) ids = ids.filter((id) => hasType(ctx.definitionOf(id)?.types ?? [], sel.typeIncludes!));
      if (sel.anyOfTypes !== undefined) ids = ids.filter((id) => sel.anyOfTypes!.some((t) => hasType(ctx.definitionOf(id)?.types ?? [], t)));
      ids = applyDonAttachedFilter(ids, sel.minDonAttached, ctx.state());
      return ids;
    }
    case 'controllerLeaderOrCharacters': {
      let ids = [ctx.controllerLeaderId(), ...ctx.controllerCharacterIds()];
      if (sel.typeIncludes !== undefined) ids = ids.filter((id) => hasType(ctx.definitionOf(id)?.types ?? [], sel.typeIncludes!));
      if (sel.name !== undefined) ids = ids.filter((id) => ctx.definitionOf(id)?.name === sel.name);
      if (sel.excludeSelf) ids = ids.filter((id) => id !== ctx.sourceInstanceId);
      return ids;
    }
    case 'opponentLeaderOrCharacters':
      return [ctx.state().players[ctx.opponentId].leaderInstanceId, ...ctx.opponentCharacterIds()];
    case 'controllerLeaderOrStage': {
      const p = ctx.state().players[ctx.controllerId];
      let ids = [p.leaderInstanceId, ...p.stageArea.cardIds];
      if (sel.typeIncludes !== undefined) ids = ids.filter((id) => hasType(ctx.definitionOf(id)?.types ?? [], sel.typeIncludes!));
      return ids;
    }
    case 'controllerRestedDon': {
      const state = ctx.state();
      const player = state.players[ctx.controllerId];
      const attached = new Set<string>();
      for (const id of Object.keys(state.cardsById)) for (const d of state.cardsById[id].donAttached) attached.add(d);
      return player.costArea.cardIds.filter((id) => !attached.has(id) && state.cardsById[id]?.donRested === true);
    }
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
    case 'controllerLifeTop': {
      const life = ctx.state().players[ctx.controllerId].lifeArea.cardIds;
      return life.length > 0 ? [life[0]] : [];
    }
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
      return [opposingId];
    }
    case 'controllerLifeTopBottom':
      return ctx.controllerLifeTopBottomIds();
    case 'controllerOrOpponentLifeTop':
      return ctx.controllerOrOpponentLifeTopIds();
    case 'controllerDeckTop':
      return ctx.controllerDeckTopIds();
    case 'allCharacters': {
      let ids = [...ctx.controllerCharacterIds(), ...ctx.opponentCharacterIds()];
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      ids = applyBaseFilters(ids, sel, ctx);
      return ids;
    }
    case 'opponentCharacters': {
      let ids = ctx.opponentCharacterIds();
      const maxCost = effectiveMaxCost(sel, ctx);
      if (maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= maxCost);
      if (sel.exactCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) === sel.exactCost);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      ids = applyBaseFilters(ids, sel, ctx);
      if (sel.rested !== undefined) ids = ids.filter((id) => (ctx.state().cardsById[id]?.orientation === 'rested') === sel.rested);
      if (sel.hasBlocker !== undefined) ids = ids.filter((id) => (ctx.definitionOf(id)?.hasBlocker === true) === sel.hasBlocker);
      ids = applyDonAttachedFilter(ids, sel.minDonAttached, ctx.state());
      return ids;
    }
    case 'allStages': {
      const state = ctx.state();
      return [...state.players.p1.stageArea.cardIds, ...state.players.p2.stageArea.cardIds];
    }
    case 'controllerHand':
      return searchEligible(ctx.controllerHandIds(), sel.filter, ctx);
    case 'opponentHand':
      return ctx.opponentHandIds();
    case 'controllerTrash':
      return searchEligible(ctx.controllerTrashIds(), sel.filter, ctx);
    case 'opponentTrash':
      return searchEligible(ctx.opponentTrashIds(), sel.filter, ctx);
    case 'controllerDeck':
      return searchEligible(ctx.controllerDeckIds(), sel.filter, ctx);
    case 'var':
      return bindings[sel.name] ?? [];
  }
}

function applyOp(op: NonSuspendingEffectOp, ctx: EffectContextImpl, bindings: Record<string, string[]>): OpResult {
  switch (op.op) {
    case 'draw':
      ctx.draw(ctx.controllerId, op.amount);
      return { selectedIds: [], movedIds: op.amount > 0 ? ['__draw'] : [] };
    case 'addPower': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.addContinuousPower({ appliesToInstanceId: id, amount: op.amount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}), ...(op.scale ? { scale: op.scale } : {}) });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'addPowerAura': {
      ctx.addContinuousPowerAura({ group: op.group, amount: op.amount, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'setBasePowerAura': {
      ctx.setContinuousBasePowerAura({ group: op.group, value: op.value, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'addCostAura': {
      ctx.addContinuousCostAura({ group: op.group, amount: op.amount, duration: op.duration, ...(op.sourceCondition ? { sourceCondition: op.sourceCondition } : {}), ...(op.condition ? { condition: op.condition } : {}) });
      return { selectedIds: [], movedIds: [] };
    }
    case 'addCost': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.addContinuousCost({ appliesToInstanceId: id, amount: op.amount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
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
        ctx.addContinuousKoImmunity({ appliesToInstanceId: id, scope: op.scope, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}), ...(op.attackerCategory ? { attackerCategory: op.attackerCategory } : {}) });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventBlockers': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) {
        ctx.preventBlockers({
          appliesToAttackerInstanceId: id,
          duration: op.duration,
          ...(op.blockerPowerAtLeast !== undefined ? { blockerPowerAtLeast: op.blockerPowerAtLeast } : {}),
        });
      }
      return { selectedIds: ids, movedIds: [] };
    }
    case 'preventAttack': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.preventAttack({ appliesToInstanceId: id, duration: op.duration });
      return { selectedIds: ids, movedIds: [] };
    }
    case 'giveDon': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.giveDon(id, op.count);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'giveDonFromCostArea': {
      const ids = resolveSelector(op.target, ctx, bindings);
      let donOwnerId = ctx.controllerId;
      if (op.donOwner === 'opponent') donOwnerId = ctx.opponentId;
      else if (typeof op.donOwner === 'object') {
        const refId = bindings[op.donOwner.fromVar]?.[0];
        donOwnerId = refId ? (ctx.state().cardsById[refId]?.ownerId ?? ctx.controllerId) : ctx.controllerId;
      }
      for (const id of ids) ctx.giveDonFromCostArea(id, op.count, donOwnerId, op.restedOnly === true);
      return { selectedIds: ids, movedIds: ids };
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
    case 'preventRefresh': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.preventNextRefresh(id);
      return { selectedIds: ids, movedIds: [] };
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
      for (const id of ids) ctx.playCharacterFromHand(id);
      return { selectedIds: ids, movedIds: ids };
    }
    case 'playFromTrash': {
      const ids = resolveSelector(op.target, ctx, bindings);
      for (const id of ids) ctx.playCharacterFromTrash(id, op.rested === true);
      return { selectedIds: ids, movedIds: ids };
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
    case 'trashTopDeck':
      ctx.trashTopOfDeck(ctx.controllerId, op.count);
      return { selectedIds: [], movedIds: op.count > 0 ? ['__trashTopDeck'] : [] };
    case 'trashLife': {
      const playerId = op.player === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.trashLife(playerId, op.count);
      return { selectedIds: [], movedIds: op.count > 0 ? ['__trashLife'] : [] };
    }
    case 'addDonFromDeck':
      ctx.addDonFromDeck(ctx.controllerId, op.count, op.rested);
      return { selectedIds: [], movedIds: op.count > 0 ? ['__addDonFromDeck'] : [] };
    case 'revealTopDeck':
      // Handled specially in runOps (it must set the __lastRevealMatched binding);
      // this branch keeps the switch exhaustive and is never reached at runtime.
      return { selectedIds: [], movedIds: [] };
  }
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
): { suspended: boolean; bindings: Record<string, string[]> } {
  let workingBindings = bindings;
  for (let i = startOpIndex; i < ops.length; i++) {
    const op = ops[i];
    if (!conditionMet(op, workingBindings, ctx, defs)) continue;
    if (op.op === 'chooseTargets') {
      const candidates = resolveSelector(op.from, ctx, workingBindings);
      const chooserId = op.chooser === 'opponent' ? ctx.opponentId : ctx.controllerId;
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: chooserId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min: op.min, max: op.max, candidateInstanceIds: candidates },
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
      ctx.emitChoice({
        id: `${ctx.sourceInstanceId}__ir-${coords.abilityIndex}-${coords.opIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min: 0, max, candidateInstanceIds: eligible, visibleInstanceIds: looked },
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
        constraints: { min: 0, max: op.pick, candidateInstanceIds: eligible, visibleInstanceIds: deckIds },
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
      const options = lifePositionOptions(ctx, op.position, op.optional);
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
    if (op.op === 'ko') {
      const ids = resolveSelector(op.target, ctx, workingBindings);
      for (let ki = 0; ki < ids.length; ki++) {
        const id = ids[ki];
        const record = findKoReplacementRecord(ctx.state(), id, 'effect', defs);
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
    );
    if (branchResult.suspended) return finishWithCascade(ctx, defs, actionId, registry);
    const mainSuspended = runOps(ability, rs.abilityIndex, rs.opIndex + 1, branchResult.bindings, ctx, defs);
    if (!mainSuspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }
  const suspended = runOps(ability, rs.abilityIndex, rs.opIndex + 1, nextBindings, ctx, defs);
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
): boolean {
  return runOpList(ability.ops, { abilityIndex, opIndex: startOp }, startOp, bindings, ctx, defs).suspended;
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
): boolean {
  for (let i = startAbilityIndex; i < program.abilities.length; i += 1) {
    const ability = program.abilities[i];
    if (ability.timing !== timing) continue;
    if (!evalCondition(ability.condition, ctx)) continue;
    if (ability.gate?.length && !evaluateGates(ability.gate, ctx.state(), defs, ctx.controllerId, ctx.sourceInstanceId)) continue;
    if (payCosts && suspendOrPayAbilityCost(ability, i, ctx, actionId, defs, registry)) return true;
    const suspended = runOps(ability, i, 0, {}, ctx, defs);
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
    const candidates = fieldDonIds(ctx.state(), ctx.controllerId);
    if (candidates.length < requiredDon) return false;
    ctx.emitChoice({
      id: `${ctx.sourceInstanceId}__ir-cost-${abilityIndex}`,
      playerId: ctx.controllerId,
      kind: 'SELECT_CARDS',
      prompt: `Choose ${requiredDon} DON!! on your field to return to your DON!! deck.`,
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
  if (paid.restedInstanceIds.length > 0) {
    const rested = fireRestTransitions(paid.state, paid.restedInstanceIds, registry, defs, actionId);
    if (ctx.absorbActionResult(rested)) return true;
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
): ActionExecuteResult {
  const matching = program.abilities
    .map((ability, index) => ({ ability, index }))
    .filter(({ ability }) => timings.includes(ability.timing));
  if (matching.length === 0) return noop(state);

  const ctx = new EffectContextImpl(state, sourceInstanceId, defs, actionId);
  for (const { ability, index } of matching) {
    if (!evalCondition(ability.condition, ctx)) continue;
    // "If …" board-state gate: an unmet precondition means the ability does nothing.
    if (ability.gate?.length && !evaluateGates(ability.gate, ctx.state(), defs, ctx.controllerId, ctx.sourceInstanceId)) continue;
    if (payCosts && suspendOrPayAbilityCost(ability, index, ctx, actionId, defs, registry)) break;
    const suspended = runOps(ability, index, 0, {}, ctx, defs);
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
      const fired = fireOnKO(working, step.declinedEffectKoTargetId, registry, defs, actionId);
      working = fired.state;
      log = [...log, ...fired.log];
      if (fired.pendingChoices.length > 0) {
        return { state: working, log, pendingChoices: fired.pendingChoices };
      }
    }
    if (step.resumeKr) {
      const continued = continueKoOpAfterReplacement(working, step.resumeKr, defs, actionId, registry);
      return { state: continued.state, log: [...log, ...continued.log], pendingChoices: continued.pendingChoices };
    }
    return { state: working, log, pendingChoices: [] };
  }

  const ability = program.abilities[rs.abilityIndex];
  if (!ability) return noop(state);
  if (rs.opIndex === -1) {
    if (!ability.cost?.length) return noop(stateWithoutChoice);
    const selection = Array.isArray(response) ? response : [];
    const reasons = canPayAbilityCost(stateWithoutChoice, choice.sourceInstanceId, choice.playerId, ability.cost, selection);
    if (reasons.length > 0) return noop(stateWithoutChoice);
    const paid = payAbilityCost(stateWithoutChoice, choice.sourceInstanceId, choice.playerId, ability.cost, actionId, selection);
    const ctx = new EffectContextImpl(paid.state, choice.sourceInstanceId, defs, actionId);
    if (paid.restedInstanceIds.length > 0) {
      const rested = fireRestTransitions(paid.state, paid.restedInstanceIds, registry, defs, actionId);
      ctx.absorbActionResult(rested);
      if (rested.pendingChoices.length > 0) {
        const finished = finishWithCascade(ctx, defs, actionId, registry);
        return { state: finished.state, log: [...paid.log, ...rested.log, ...finished.log], pendingChoices: finished.pendingChoices };
      }
    }
    const suspended = runOps(ability, rs.abilityIndex, 0, rs.bindings, ctx, defs);
    if (!suspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    const finished = finishWithCascade(ctx, defs, actionId, registry);
    return { state: finished.state, log: [...paid.log, ...finished.log], pendingChoices: finished.pendingChoices };
  }

  const ctx = new EffectContextImpl(stateWithoutChoice, choice.sourceInstanceId, defs, actionId);
  const op = suspendedOpAt(ability, rs);
  if (!op || (op.op !== 'chooseTargets' && op.op !== 'searchTopDeck' && op.op !== 'playFromDeck' && op.op !== 'peekLifeThenPlace' && op.op !== 'chooseLifeToHand' && op.op !== 'chooseLifeToTrash' && op.op !== 'chooseOption')) return noop(stateWithoutChoice);

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
      const topOrder = rs.bindings.__searchTopOrder ?? selection;
      if (!rs.bindings.__searchTopOrder) {
        const topSet = new Set(selection);
        const rest = looked.filter((id) => !topSet.has(id));
        if (rest.length > 1) {
          const bottomOrderChoice: PendingChoice = {
            id: `${choice.sourceInstanceId}__ir-${rs.abilityIndex}-${rs.opIndex}-bottom-order`,
            playerId: ctx.controllerId,
            kind: 'SELECT_CARDS',
            prompt: 'Choose the order to place the remaining looked cards at the bottom of your deck. First selected is placed first; last selected becomes the bottom card.',
            constraints: { min: rest.length, max: rest.length, candidateInstanceIds: rest },
            sourceInstanceId: choice.sourceInstanceId,
            sourceEffectId: 'ir',
            resumeState: preserveBranch({ ...rs.bindings, __searchTopOrder: selection }),
          };
          ctx.emitChoice(bottomOrderChoice);
          return ctx.finish();
        }
        ctx.searchResolveTopOrBottom(ctx.controllerId, looked, selection, rest);
      } else {
        ctx.searchResolveTopOrBottom(ctx.controllerId, looked, topOrder, selection);
      }
      const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: topOrder, movedIds: looked });
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
    ctx.searchResolve(ctx.controllerId, looked, chosen, remainder, reveal, destination, rs.bindings.__searchChosen ? selection : undefined);
    const afterSearchBindings = withResultBindings(rs.bindings, { selectedIds: chosen, movedIds: chosen });
    return continueAfterResolvedOp(program, ability, rs, afterSearchBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'playFromDeck') {
    const selection = Array.isArray(response) ? response : [];
    for (const id of selection) ctx.playCharacterFromDeck(id);
    ctx.shuffleDeck(ctx.controllerId);
    const afterPlayBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterPlayBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'peekLifeThenPlace') {
    const selection = Array.isArray(response) ? response : [];
    for (const id of selection) ctx.moveLifeToBottom(id);
    const afterPeekBindings = withResultBindings(rs.bindings, { selectedIds: selection, movedIds: selection });
    return continueAfterResolvedOp(program, ability, rs, afterPeekBindings, ctx, defs, actionId, registry);
  }

  if (op.op === 'chooseLifeToHand') {
    const selectedIndex = typeof response === 'number' ? response : -1;
    const afterLifeBindings = withResultBindings(rs.bindings, resolveLifePositionToHand(ctx, op.position, op.optional, selectedIndex));
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
    );
    if (branchResult.suspended) return finishWithCascade(ctx, defs, actionId, registry);
    const mainSuspended = runOps(ability, rs.abilityIndex, rs.opIndex + 1, branchResult.bindings, ctx, defs);
    if (!mainSuspended) runFollowingAbilities(program, ability.timing, rs.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }

  const selection = Array.isArray(response) ? response : [];
  const bindings: Record<string, string[]> = { ...rs.bindings, [op.var]: selection };
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

  const ctx = new EffectContextImpl(state, ir.sourceInstanceId, defs, actionId);
  const pendingKoIds = [...(ir.remainingKoTargetIds ?? [])];
  for (let ki = 0; ki < pendingKoIds.length; ki++) {
    const id = pendingKoIds[ki];
    const record = findKoReplacementRecord(ctx.state(), id, 'effect', defs);
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
    );
    if (branchResult.suspended) return finishWithCascade(ctx, defs, actionId, registry);
    const mainSuspended = runOps(ability, ir.abilityIndex, ir.opIndex + 1, branchResult.bindings, ctx, defs);
    if (!mainSuspended) runFollowingAbilities(program, ability.timing, ir.abilityIndex + 1, ctx, defs, actionId, true, registry);
    return finishWithCascade(ctx, defs, actionId, registry);
  }

  const suspended = runOps(ability, ir.abilityIndex, ir.opIndex + 1, ir.bindings, ctx, defs);
  if (!suspended) runFollowingAbilities(program, ability.timing, ir.abilityIndex + 1, ctx, defs, actionId, true, registry);
  return finishWithCascade(ctx, defs, actionId, registry);
}
