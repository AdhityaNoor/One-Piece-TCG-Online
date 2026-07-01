/**
 * The generic effect interpreter (VM).
 *
 * ONE function set executes every card's compiled EffectProgram (effectIr.ts)
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
import { EffectContextImpl } from './effectContext';
import { evaluateGates } from './gates';
import type { EffectTemplateRegistry } from './effectTemplate';
import type { Ability, EffectOp, EffectProgram, IrCondition, IrTrigger, SearchFilter, Selector } from './effectIr';

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
    const idx = program.abilities.findIndex((a) => a.trigger === 'onKO');
    if (idx < 0) continue;
    const sub = new EffectContextImpl(working, id, defs, actionId);
    const suspended = runOps(program.abilities[idx], idx, 0, {}, sub);
    const subRes = sub.finish();
    working = subRes.state;
    log = [...log, ...subRes.log];
    queue.push(...sub.takeKoed());
    if (suspended) return { state: working, log, pendingChoices: subRes.pendingChoices };
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
      .includes(normalized)
  );
}

function searchEligible(ids: string[], filter: SearchFilter | undefined, ctx: EffectContextImpl): string[] {
  if (!filter) return ids;
  const selfName = ctx.definitionOf(ctx.sourceInstanceId)?.name;
  return ids.filter((id) => {
    const def = ctx.definitionOf(id);
    if (!def) return false;
    if (filter.typeIncludes && !hasType(def.types, filter.typeIncludes)) return false;
    if (filter.excludeSelfName && selfName !== undefined && def.name === selfName) return false;
    if (filter.category && def.category !== filter.category) return false;
    if (filter.name && def.name !== filter.name) return false;
    if (filter.maxCost !== undefined && (def.baseCost ?? Infinity) > filter.maxCost) return false;
    if (filter.minCost !== undefined && (def.baseCost ?? -Infinity) < filter.minCost) return false;
    if (filter.exactCost !== undefined && (def.baseCost ?? -1) !== filter.exactCost) return false;
    if (filter.maxPower !== undefined && (def.basePower ?? Infinity) > filter.maxPower) return false;
    return true;
  });
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

function resolveSelector(sel: Selector, ctx: EffectContextImpl, bindings: Record<string, string[]>): string[] {
  switch (sel.sel) {
    case 'self':
      return [ctx.sourceInstanceId];
    case 'controllerLeader':
      return [ctx.controllerLeaderId()];
    case 'controllerCharacters':
      return ctx.controllerCharacterIds();
    case 'controllerLeaderOrCharacters':
      return [ctx.controllerLeaderId(), ...ctx.controllerCharacterIds()];
    case 'opponentLeaderOrCharacters':
      return [ctx.state().players[ctx.opponentId].leaderInstanceId, ...ctx.opponentCharacterIds()];
    case 'opponentCharacters': {
      let ids = ctx.opponentCharacterIds();
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      return ids;
    }
    case 'controllerHand':
      return searchEligible(ctx.controllerHandIds(), sel.filter, ctx);
    case 'controllerTrash':
      return searchEligible(ctx.controllerTrashIds(), sel.filter, ctx);
    case 'var':
      return bindings[sel.name] ?? [];
  }
}

function applyOp(op: Exclude<EffectOp, { op: 'chooseTargets' } | { op: 'searchTopDeck' }>, ctx: EffectContextImpl, bindings: Record<string, string[]>): void {
  switch (op.op) {
    case 'draw':
      ctx.draw(ctx.controllerId, op.amount);
      return;
    case 'addPower':
      for (const id of resolveSelector(op.target, ctx, bindings)) {
        ctx.addContinuousPower({ appliesToInstanceId: id, amount: op.amount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
      }
      return;
    case 'addCost':
      for (const id of resolveSelector(op.target, ctx, bindings)) {
        ctx.addContinuousCost({ appliesToInstanceId: id, amount: op.amount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
      }
      return;
    case 'giveDon':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.giveDon(id, op.count);
      return;
    case 'ko':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.ko(id);
      return;
    case 'rest':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.rest(id);
      return;
    case 'returnToHand':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.returnToHand(id);
      return;
    case 'playFromHand':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.playCharacterFromHand(id);
      return;
    case 'moveToHand':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.moveToHand(id);
      return;
    case 'trashCards':
      for (const id of resolveSelector(op.target, ctx, bindings)) ctx.trashCard(id);
      return;
    case 'trashTopDeck':
      ctx.trashTopOfDeck(ctx.controllerId, op.count);
      return;
    case 'addDonFromDeck':
      ctx.addDonFromDeck(ctx.controllerId, op.count, op.rested);
      return;
  }
}

/** Runs ops from `startOp`. Returns true if it suspended on a chooseTargets op. */
function runOps(
  ability: Ability,
  abilityIndex: number,
  startOp: number,
  bindings: Record<string, string[]>,
  ctx: EffectContextImpl,
): boolean {
  for (let i = startOp; i < ability.ops.length; i++) {
    const op = ability.ops[i];
    if (op.op === 'chooseTargets') {
      const candidates = resolveSelector(op.from, ctx, bindings);
      const choice: PendingChoice = {
        id: `${ctx.sourceInstanceId}__ir-${abilityIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min: op.min, max: op.max, candidateInstanceIds: candidates },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        resumeState: { abilityIndex, opIndex: i, bindings },
      };
      ctx.emitChoice(choice);
      return true;
    }
    if (op.op === 'searchTopDeck') {
      const looked = ctx.topOfDeck(ctx.controllerId, op.look);
      if (looked.length === 0) continue; // empty deck — nothing to look at, skip
      const eligible = searchEligible(looked, op.filter, ctx);
      const choice: PendingChoice = {
        id: `${ctx.sourceInstanceId}__ir-${abilityIndex}-${i}`,
        playerId: ctx.controllerId,
        kind: 'SELECT_CARDS',
        prompt: op.prompt,
        constraints: { min: 0, max: op.pick, candidateInstanceIds: eligible },
        sourceInstanceId: ctx.sourceInstanceId,
        sourceEffectId: 'ir',
        // Stash the full looked-at set on the resume point so resolveSearch can
        // send the non-chosen remainder to the bottom of the deck.
        resumeState: { abilityIndex, opIndex: i, bindings: { ...bindings, __looked: looked } },
      };
      ctx.emitChoice(choice);
      return true;
    }
    applyOp(op, ctx, bindings);
  }
  return false;
}

/** Fire all abilities whose trigger is in `triggers`, in program order, until one suspends. */
export function runTriggers(
  program: EffectProgram,
  triggers: IrTrigger[],
  state: GameState,
  sourceInstanceId: string,
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const matching = program.abilities
    .map((ability, index) => ({ ability, index }))
    .filter(({ ability }) => triggers.includes(ability.trigger));
  if (matching.length === 0) return noop(state);

  const ctx = new EffectContextImpl(state, sourceInstanceId, defs, actionId);
  for (const { ability, index } of matching) {
    if (!evalCondition(ability.condition, ctx)) continue;
    // "If …" board-state gate: an unmet precondition means the ability does nothing.
    if (ability.gate?.length && !evaluateGates(ability.gate, ctx.state(), defs, ctx.controllerId)) continue;
    const suspended = runOps(ability, index, 0, {}, ctx);
    if (suspended) break; // wait for the choice before any further ability runs
  }
  return finishWithCascade(ctx, defs, actionId, registry);
}

/** Resume a program suspended on a chooseTargets op, binding the player's selection. */
export function resumeProgram(
  program: EffectProgram,
  state: GameState,
  choice: PendingChoice,
  selection: string[],
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const rs = choice.resumeState;
  if (!rs || !choice.sourceInstanceId) return noop(state);
  const ability = program.abilities[rs.abilityIndex];
  const op = ability?.ops[rs.opIndex];
  if (!ability || !op || (op.op !== 'chooseTargets' && op.op !== 'searchTopDeck')) return noop(state);

  const stateWithoutChoice: GameState = { ...state, pendingChoices: state.pendingChoices.filter((c) => c.id !== choice.id) };
  const ctx = new EffectContextImpl(stateWithoutChoice, choice.sourceInstanceId, defs, actionId);

  if (op.op === 'searchTopDeck') {
    // The chosen subset goes to hand; resolveSearch sends the looked remainder
    // to the bottom. `__looked` was stashed at suspend time (see runOps).
    const looked = rs.bindings.__looked ?? [];
    const chosen = rs.bindings.__searchChosen ?? selection;
    if (!rs.bindings.__searchChosen) {
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
          resumeState: { abilityIndex: rs.abilityIndex, opIndex: rs.opIndex, bindings: { ...rs.bindings, __searchChosen: selection } },
        };
        ctx.emitChoice(bottomOrderChoice);
        return ctx.finish();
      }
    }
    ctx.searchResolve(ctx.controllerId, looked, chosen, rs.bindings.__searchChosen ? selection : undefined);
    runOps(ability, rs.abilityIndex, rs.opIndex + 1, rs.bindings, ctx);
    return finishWithCascade(ctx, defs, actionId, registry);
  }

  const bindings: Record<string, string[]> = { ...rs.bindings, [op.var]: selection };
  runOps(ability, rs.abilityIndex, rs.opIndex + 1, bindings, ctx);
  return finishWithCascade(ctx, defs, actionId, registry);
}
