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
import type { Ability, EffectOp, EffectProgram, IrCondition, IrTrigger, Selector } from './effectIr';

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
    case 'opponentCharacters': {
      let ids = ctx.opponentCharacterIds();
      if (sel.maxCost !== undefined) ids = ids.filter((id) => ctx.costOf(id) <= sel.maxCost!);
      if (sel.maxPower !== undefined) ids = ids.filter((id) => ctx.powerOf(id) <= sel.maxPower!);
      return ids;
    }
    case 'var':
      return bindings[sel.name] ?? [];
  }
}

function applyOp(op: Exclude<EffectOp, { op: 'chooseTargets' }>, ctx: EffectContextImpl, bindings: Record<string, string[]>): void {
  switch (op.op) {
    case 'draw':
      ctx.draw(ctx.controllerId, op.amount);
      return;
    case 'addPower':
      for (const id of resolveSelector(op.target, ctx, bindings)) {
        ctx.addContinuousPower({ appliesToInstanceId: id, amount: op.amount, duration: op.duration, ...(op.condition ? { condition: op.condition } : {}) });
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
): ActionExecuteResult {
  const matching = program.abilities
    .map((ability, index) => ({ ability, index }))
    .filter(({ ability }) => triggers.includes(ability.trigger));
  if (matching.length === 0) return noop(state);

  const ctx = new EffectContextImpl(state, sourceInstanceId, defs, actionId);
  for (const { ability, index } of matching) {
    if (!evalCondition(ability.condition, ctx)) continue;
    const suspended = runOps(ability, index, 0, {}, ctx);
    if (suspended) break; // wait for the choice before any further ability runs
  }
  return ctx.finish();
}

/** Resume a program suspended on a chooseTargets op, binding the player's selection. */
export function resumeProgram(
  program: EffectProgram,
  state: GameState,
  choice: PendingChoice,
  selection: string[],
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const rs = choice.resumeState;
  if (!rs || !choice.sourceInstanceId) return noop(state);
  const ability = program.abilities[rs.abilityIndex];
  const op = ability?.ops[rs.opIndex];
  if (!ability || !op || op.op !== 'chooseTargets') return noop(state);

  const stateWithoutChoice: GameState = { ...state, pendingChoices: state.pendingChoices.filter((c) => c.id !== choice.id) };
  const ctx = new EffectContextImpl(stateWithoutChoice, choice.sourceInstanceId, defs, actionId);
  const bindings: Record<string, string[]> = { ...rs.bindings, [op.var]: selection };
  runOps(ability, rs.abilityIndex, rs.opIndex + 1, bindings, ctx);
  return ctx.finish();
}
