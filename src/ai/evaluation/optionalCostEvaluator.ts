/**
 * Optional cost / YES_NO evaluation (guide §18).
 * Accept optional activates and optional trash/DON costs only when
 * projected payoff clears opportunity cost.
 */
import type { Ability, EffectOp, EffectTemplateRegistry } from '../../engine/effects';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { analyzeAbility, profileScalar } from '../analysis/abilityAnalyzer';
import {
  scoreHandCardPlay,
  type EffectScoreContext,
} from '../heuristics/effectValue';
import { lifeSafetyUrgency } from './matchObjective';
import { printedCounterValue } from './counterEfficiency';

export interface OptionalDecisionAnalysis {
  costValue: number;
  payoffValue: number;
  netValue: number;
  preferAccept: boolean;
  reason: string;
}

function scoreOpsRough(ops: EffectOp[]): number {
  let total = 0;
  for (const op of ops) {
    if (op.op === 'draw' || op.op === 'drawUntilHandCount') total += 10;
    else if (op.op === 'ko') total += 14;
    else if (op.op === 'rest') total += 8;
    else if (op.op === 'addPower') {
      const amount = 'amount' in op ? Math.abs(op.amount) : 1000;
      const per = 'amountPer' in op && op.amountPer ? Math.abs(op.amountPer) : 0;
      total += Math.max(4, amount / 400) + (per > 0 ? per / 350 + 6 : 0);
    } else if (op.op === 'addKeyword') total += 7;
    else if (op.op === 'playFromHand' || op.op === 'playFromTrash' || op.op === 'playFromDeck') total += 12;
    else if (op.op === 'searchTopDeck' || op.op === 'searchDeck') total += 9;
    else if (op.op === 'addDonFromDeck' || op.op === 'giveDon') total += 10;
    else if (op.op === 'chooseTargets') total += 3;
    else total += 2;
  }
  return total;
}

function abilityCostValue(ability: Ability | undefined): number {
  if (!ability?.cost?.length) return 0;
  let total = 0;
  for (const c of ability.cost) {
    if (c.kind === 'donMinus') total += c.count * 5;
    else if (c.kind === 'restDon') total += c.count * 4;
    else if (c.kind === 'restThis') total += 6;
    else if (c.kind === 'trashThis') total += 12;
  }
  return total;
}

function handCardOpportunityCost(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  instanceId: string,
  strategic: StrategicContext,
): number {
  const inst = state.cardsById[instanceId];
  if (!inst) return 8;
  const def = getDefinition(defs, inst);
  const counter = printedCounterValue(state, defs, instanceId);
  const survival = lifeSafetyUrgency(strategic.survival);
  const play = scoreHandCardPlay(
    { state, playerId, defs, registry, sourceInstanceId: instanceId, sourceCardDefinitionId: inst.cardDefinitionId },
    instanceId,
  );
  let cost = 6 + play * 0.35 + (def.baseCost ?? 0) * 0.8;
  if (counter > 0 && survival >= 20) cost += counter / 100 + survival * 0.12;
  if (strategic.mode === 'combo_setup' && play >= 14) cost += 8;
  return cost;
}

function resolveAbility(
  ctx: EffectScoreContext,
  choice: PendingChoice,
): Ability | undefined {
  if (!choice.resumeState || !choice.sourceInstanceId) return undefined;
  const inst = ctx.state.cardsById[choice.sourceInstanceId];
  if (!inst) return undefined;
  const program = ctx.registry[inst.cardDefinitionId];
  return program?.abilities[choice.resumeState.abilityIndex];
}

function suspendedOp(ctx: EffectScoreContext, choice: PendingChoice): EffectOp | undefined {
  if (choice.sourceEffectId !== 'ir' || !choice.resumeState || !choice.sourceInstanceId) return undefined;
  const ability = resolveAbility(ctx, choice);
  if (!ability) return undefined;
  const idx = choice.resumeState.opIndex;
  if (idx < 0) return undefined;
  const parent = ability.ops[idx];
  if (parent?.op === 'chooseOption' && choice.resumeState.branchIndex !== undefined) {
    return parent.options[choice.resumeState.branchIndex]?.ops[choice.resumeState.branchOpIndex ?? 0];
  }
  return ability.ops[choice.resumeState.branchOpIndex ?? idx];
}

function followUpOps(ctx: EffectScoreContext, choice: PendingChoice): EffectOp[] {
  const ability = resolveAbility(ctx, choice);
  if (!ability || !choice.resumeState) return [];
  if (choice.resumeState.opIndex < 0) {
    // Optional activate of the whole ability.
    return ability.ops;
  }
  if (choice.resumeState.branchIndex !== undefined) {
    const parent = ability.ops[choice.resumeState.opIndex];
    if (parent?.op !== 'chooseOption') return [];
    const branch = parent.options[choice.resumeState.branchIndex]?.ops ?? [];
    const start = (choice.resumeState.branchOpIndex ?? 0) + 1;
    return branch.slice(start);
  }
  return ability.ops.slice(choice.resumeState.opIndex + 1);
}

function gatedFollowUpPayoff(ops: EffectOp[]): number {
  const gated = ops.filter((op) => !!op.ifPrevious || !!op.ifGate);
  const ungated = ops.filter((op) => !op.ifPrevious && !op.ifGate);
  // Paying the optional cost primarily unlocks gated follow-ups.
  const primary = gated.length > 0 ? gated : ungated;
  return scoreOpsRough(primary) * 1.15;
}

/**
 * Analyze a YES_NO optional activate / optional effect prompt.
 */
export function analyzeOptionalYesNo(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  choice: PendingChoice,
): OptionalDecisionAnalysis {
  const ability = resolveAbility(ctx, choice);
  const survival = lifeSafetyUrgency(strategic.survival);
  const prompt = choice.prompt.toLowerCase();

  // Whole-ability optional activate (start of turn uses opIndex -2).
  if (choice.resumeState && choice.resumeState.opIndex < 0 && ability) {
    const payoff =
      profileScalar(analyzeAbility(ability, true)) +
      scoreOpsRough(ability.ops) * 0.7 +
      strategic.modeWeights.engine * 3;
    const cost = abilityCostValue(ability);
    const net = payoff - cost;
    return {
      costValue: cost,
      payoffValue: payoff,
      netValue: net,
      preferAccept: net >= 4,
      reason: 'optional_activate',
    };
  }

  const followUps = followUpOps(ctx, choice);
  const op = suspendedOp(ctx, choice);
  let payoff = gatedFollowUpPayoff(followUps);
  if (payoff <= 0 && ability) {
    payoff = scoreOpsRough(ability.ops) * 0.45;
  }

  // Prompt cues for battle optionals.
  if (prompt.includes('blocker')) {
    payoff += 12 + survival * 0.2;
  }
  if (prompt.includes('trigger')) {
    payoff += 10 + strategic.modeWeights.engine * 2;
  }

  let cost = abilityCostValue(ability);
  if (op?.op === 'chooseTargets' && op.from?.sel === 'controllerHand') {
    // Approximate: will need to trash something — use average weak hand cost.
    const candidates = choice.constraints.candidateInstanceIds ?? [];
    if (candidates.length > 0) {
      cost = Math.min(
        ...candidates.map((id) =>
          handCardOpportunityCost(ctx.state, ctx.playerId, ctx.defs, ctx.registry, id, strategic),
        ),
      );
    } else {
      cost = 10;
    }
  }

  const modeBias =
    strategic.mode === 'defend' || strategic.mode === 'recovery'
      ? -3
      : strategic.mode === 'lethal_search' || strategic.mode === 'pressure'
        ? 3
        : 0;

  const net = payoff - cost + modeBias;
  return {
    costValue: cost,
    payoffValue: payoff,
    netValue: net,
    preferAccept: net >= 5,
    reason: 'optional_yes_no',
  };
}

/**
 * Analyze skipping vs paying an optional SELECT_CARDS (min 0) cost.
 * `selectedIds` empty = skip; non-empty = pay those cards as cost.
 */
export function analyzeOptionalSelectCost(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  choice: PendingChoice,
  selectedIds: string[],
): OptionalDecisionAnalysis {
  const followUps = followUpOps(ctx, choice);
  const payoff = gatedFollowUpPayoff(followUps) * strategic.modeWeights.engine;

  if (selectedIds.length === 0) {
    // Skip: keep resources, forgo gated payoff.
    return {
      costValue: 0,
      payoffValue: 0,
      netValue: 0,
      preferAccept: payoff < 8, // prefer skip when payoff is weak
      reason: 'optional_skip',
    };
  }

  let cost = 0;
  for (const id of selectedIds) {
    cost += handCardOpportunityCost(ctx.state, ctx.playerId, ctx.defs, ctx.registry, id, strategic);
  }
  // Paying unlocks gated follow-ups (scale mildly with how many trashed for per-trash effects).
  const scaledPayoff = payoff * (1 + Math.min(2, selectedIds.length - 1) * 0.35);
  const net = scaledPayoff - cost;
  return {
    costValue: cost,
    payoffValue: scaledPayoff,
    netValue: net,
    preferAccept: net >= 4,
    reason: 'optional_pay',
  };
}

export function scoreOptionalYesNoResponse(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  choice: PendingChoice,
  accept: boolean,
): number {
  const analysis = analyzeOptionalYesNo(ctx, strategic, choice);
  if (accept) {
    return analysis.preferAccept
      ? 30 + analysis.netValue
      : 8 + analysis.netValue; // accepting a bad deal
  }
  // Decline
  return analysis.preferAccept
    ? 10 - analysis.netValue * 0.4
    : 28 - Math.min(12, analysis.payoffValue * 0.2);
}

/**
 * Extra score for optional SELECT_CARDS responses (including empty skip).
 */
export function scoreOptionalSelectResponse(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  choice: PendingChoice,
  selectedIds: string[],
): number {
  if (choice.constraints.min !== 0) return 0;
  const potential =
    gatedFollowUpPayoff(followUpOps(ctx, choice)) *
    Math.max(0.85, strategic.modeWeights.engine);
  const analysis = analyzeOptionalSelectCost(ctx, strategic, choice, selectedIds);

  if (selectedIds.length === 0) {
    const candidates = choice.constraints.candidateInstanceIds ?? [];
    if (candidates.length === 0) return 32;
    const cheapest = Math.min(
      ...candidates.map((id) =>
        handCardOpportunityCost(ctx.state, ctx.playerId, ctx.defs, ctx.registry, id, strategic),
      ),
    );
    const wouldNet = potential - cheapest;
    // Skip is attractive only when paying the cheapest card is still a bad deal.
    if (wouldNet >= 5) return 6 - wouldNet * 0.5;
    return 34 + Math.min(18, cheapest - potential);
  }

  // Recompute with actual selection cost vs potential payoff.
  const net = potential * (1 + Math.min(2, selectedIds.length - 1) * 0.35) - analysis.costValue;
  if (net >= 4) return 16 + net;
  return net - 8;
}
