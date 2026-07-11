/**
 * Strategic pending-choice evaluation (guide §18).
 * Scores search / discard / KO / rest / DON / revive / modal picks from
 * StrategicContext — never "first legal" or raw highest power alone.
 */
import type { EffectOp, EffectTemplateRegistry } from '../../engine/effects';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import {
  scoreChoiceResponse,
  scoreHandCardPlay,
  type EffectScoreContext,
} from '../heuristics/effectValue';
import {
  buildCardStrategicProfile,
  contextualHandValue,
  scoreProfileForMode,
} from '../analysis/cardStrategicProfile';
import { computeLeaderSynergy, handSynergyBonus } from '../analysis/synergyAnalyzer';
import { lifeSafetyUrgency } from './matchObjective';
import { printedCounterValue } from './counterEfficiency';
import {
  scoreKoReactionForRemoval,
  scoreOwnSacrificeWithOnKo,
} from '../planning/koReactionPlanner';
import {
  scoreOptionalSelectResponse,
  scoreOptionalYesNoResponse,
} from './optionalCostEvaluator';
import { scoreSearchTargetForPlan } from '../planning/openingHandPlanner';

export type SelectionIntent =
  | 'ko'
  | 'rest'
  | 'bounce'
  | 'debuff'
  | 'buff'
  | 'giveDon'
  | 'discard'
  | 'trashOwnField'
  | 'search'
  | 'playFromZone'
  | 'revive'
  | 'payDon'
  | 'reorder'
  | 'unknown';

function suspendedOpForChoice(ctx: EffectScoreContext, choice: PendingChoice): EffectOp | undefined {
  if (choice.sourceEffectId !== 'ir' || !choice.resumeState || !choice.sourceInstanceId) return undefined;
  const inst = ctx.state.cardsById[choice.sourceInstanceId];
  if (!inst) return undefined;
  const program = ctx.registry[inst.cardDefinitionId];
  if (!program) return undefined;
  const ability = program.abilities[choice.resumeState.abilityIndex];
  if (!ability) return undefined;
  const parent = ability.ops[choice.resumeState.opIndex];
  if (parent?.op === 'chooseOption' && choice.resumeState.branchIndex !== undefined) {
    return parent.options[choice.resumeState.branchIndex]?.ops[choice.resumeState.branchOpIndex ?? 0];
  }
  return ability.ops[choice.resumeState.branchOpIndex ?? choice.resumeState.opIndex];
}

function abilityOpsAfterSuspend(ctx: EffectScoreContext, choice: PendingChoice): EffectOp[] {
  if (choice.sourceEffectId !== 'ir' || !choice.resumeState || !choice.sourceInstanceId) return [];
  const inst = ctx.state.cardsById[choice.sourceInstanceId];
  if (!inst) return [];
  const program = ctx.registry[inst.cardDefinitionId];
  if (!program) return [];
  const ability = program.abilities[choice.resumeState.abilityIndex];
  if (!ability) return [];

  if (choice.resumeState.branchIndex !== undefined) {
    const parent = ability.ops[choice.resumeState.opIndex];
    if (parent?.op !== 'chooseOption') return [];
    const branch = parent.options[choice.resumeState.branchIndex]?.ops ?? [];
    const start = (choice.resumeState.branchOpIndex ?? 0) + 1;
    return branch.slice(start);
  }

  const start = choice.resumeState.opIndex + 1;
  return ability.ops.slice(start);
}

function usesVar(target: unknown, varName: string): boolean {
  if (!target || typeof target !== 'object') return false;
  const t = target as { sel?: string; name?: string };
  return t.sel === 'var' && t.name === varName;
}

function intentFromFollowUpOps(ops: EffectOp[], varName: string): SelectionIntent | null {
  for (const op of ops) {
    if ('target' in op && usesVar(op.target, varName)) {
      if (op.op === 'ko') return 'ko';
      if (op.op === 'rest') return 'rest';
      if (op.op === 'returnToHand') return 'bounce';
      if (op.op === 'giveDon') return 'giveDon';
      if (op.op === 'playFromTrash') return 'revive';
      if (op.op === 'playFromHand') return 'playFromZone';
      if (op.op === 'addPower') return op.amount < 0 ? 'debuff' : 'buff';
      if (op.op === 'trashCards') return 'discard';
    }
    if (op.op === 'trashCards' && 'from' in op && usesVar((op as { from?: unknown }).from, varName)) {
      return 'discard';
    }
  }
  return null;
}

function intentFromFromSelector(from: { sel?: string } | undefined): SelectionIntent | null {
  if (!from?.sel) return null;
  switch (from.sel) {
    case 'controllerHand':
      return 'discard'; // overridden by follow-up when play/buff ops bind the var
    case 'controllerTrash':
      return 'revive';
    case 'controllerActiveDon':
    case 'controllerRestedDon':
    case 'controllerFieldDon':
    case 'controllerAttachedDon':
      return 'payDon';
    case 'opponentCharacters':
    case 'opponentLeaderOrCharacters':
    case 'allCharacters':
      return 'ko';
    case 'controllerCharacters':
    case 'controllerLeaderOrCharacters':
      return 'buff';
    default:
      return null;
  }
}

export function inferSelectionIntent(ctx: EffectScoreContext, choice: PendingChoice): SelectionIntent {
  if (choice.sourceEffectId === 'rule:characterAreaOverflow') return 'trashOwnField';

  const prompt = choice.prompt.toLowerCase();
  if (prompt.includes('bottom') && prompt.includes('order')) return 'reorder';
  if (prompt.includes('top of your deck') && prompt.includes('order')) return 'reorder';

  const op = suspendedOpForChoice(ctx, choice);
  if (!op) {
    if (choice.constraints.visibleInstanceIds?.length) return 'search';
    if (choice.constraints.zoneId === 'characterArea') return 'trashOwnField';
    // Prompt-only fallbacks for rule/UI choices without IR resume state.
    if (prompt.includes('k.o') || prompt.includes('ko')) return 'ko';
    if (prompt.includes('rest')) return 'rest';
    if (prompt.includes('trash') || prompt.includes('discard')) {
      return choice.constraints.zoneId === 'characterArea' ? 'trashOwnField' : 'discard';
    }
    if (prompt.includes('don')) return 'giveDon';
    if (prompt.includes('add') && prompt.includes('hand')) return 'search';
    return 'unknown';
  }

  if (op.op === 'searchTopDeck' || op.op === 'searchDeck') return 'search';
  if (op.op === 'playFromDeck') return 'playFromZone';
  if (op.op === 'trashFromHandByCountVar') return 'discard';
  if (op.op === 'chooseLifeToHand') return 'search';
  if (op.op === 'chooseLifeToTrash') return 'discard';

  if (op.op === 'chooseTargets') {
    const follow = intentFromFollowUpOps(abilityOpsAfterSuspend(ctx, choice), op.var);
    if (follow) return follow;
    const fromIntent = intentFromFromSelector(op.from as { sel?: string });
    if (fromIntent) return fromIntent;
    if (prompt.includes('don')) return 'giveDon';
    if (prompt.includes('trash') || prompt.includes('discard')) return 'discard';
    if (prompt.includes('rest')) return 'rest';
    if (prompt.includes('k.o') || prompt.includes('ko')) return 'ko';
  }

  if (choice.constraints.visibleInstanceIds?.length) return 'search';
  return 'unknown';
}

function ownCardValue(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
): number {
  const inst = ctx.state.cardsById[instanceId];
  if (!inst) return 0;
  const def = getDefinition(ctx.defs, inst);
  const leaderBonus = computeLeaderSynergy(
    strategic.leader,
    inst.cardDefinitionId,
    ctx.defs,
    ctx.state,
    instanceId,
  );
  const synergy = handSynergyBonus(strategic.handInteractions, inst.cardDefinitionId, true);
  const profile = buildCardStrategicProfile(inst.cardDefinitionId, ctx.registry, {
    ...ctx,
    sourceInstanceId: instanceId,
    sourceCardDefinitionId: inst.cardDefinitionId,
  });
  let value = scoreProfileForMode(profile, strategic.modeWeights) + leaderBonus + synergy;

  if (inst.currentZone === 'hand') {
    value += contextualHandValue(ctx, instanceId, strategic.modeWeights, leaderBonus) * 0.35;
    value += (def.counter ?? 0) / 400;
  } else if (inst.currentZone === 'characterArea' || inst.currentZone === 'leaderArea') {
    value += computeCurrentPower(ctx.defs, ctx.state, instanceId) / 900;
    if (def.hasBlocker) value += 6 * strategic.modeWeights.survival;
  } else if (inst.currentZone === 'trash' || inst.currentZone === 'deck') {
    value += scoreHandCardPlay(ctx, instanceId) * 0.5;
    value += (def.basePower ?? 0) / 1200;
  }

  value -= (def.baseCost ?? 0) * 0.4;
  return value;
}

function scoreRemovalTarget(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
  intent: 'ko' | 'rest' | 'bounce' | 'debuff',
): number {
  const inst = ctx.state.cardsById[instanceId];
  if (!inst) return -30;
  const isOpp = inst.ownerId !== ctx.playerId;
  if (!isOpp) return -25 - ownCardValue(ctx, strategic, instanceId) * 0.5;

  const threat = strategic.opponentThreats.find((t) => t.instanceId === instanceId);
  const power = computeCurrentPower(ctx.defs, ctx.state, instanceId);
  const def = getDefinition(ctx.defs, inst);
  let score =
    (threat?.removalUrgency ?? power / 1000) * strategic.modeWeights.removal * 4 +
    (threat?.recurringValue ?? 0) * 2 +
    (threat?.synergyCentrality ?? 0) * 1.5 +
    (def.baseCost ?? 0) * 1.2;

  if (intent === 'rest') {
    score += inst.orientation === 'active' ? 8 : -4;
    if (def.hasBlocker && inst.orientation === 'active') score += 10;
  }
  if (intent === 'bounce') score += 4; // tempo + replay cost
  if (intent === 'debuff') score += inst.orientation === 'active' ? 5 : 2;

  // Prefer removing engines even when printed power is low.
  if ((threat?.recurringValue ?? 0) >= 4 && power <= 4000) score += 12;

  // K.O. fires [On K.O.]; bounce/rest usually do not.
  if (intent === 'ko') {
    score += scoreKoReactionForRemoval(
      ctx.state,
      ctx.playerId,
      ctx.defs,
      ctx.registry,
      strategic,
      instanceId,
    );
  }

  return score;
}

function scoreBuffOrDonTarget(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
  intent: 'buff' | 'giveDon',
): number {
  const inst = ctx.state.cardsById[instanceId];
  if (!inst) return -20;
  if (inst.ownerId !== ctx.playerId) return -30;

  const power = computeCurrentPower(ctx.defs, ctx.state, instanceId);
  const canSwing =
    (inst.currentZone === 'characterArea' || inst.currentZone === 'leaderArea') &&
    inst.orientation === 'active' &&
    !inst.summoningSick;

  let score = ownCardValue(ctx, strategic, instanceId) * 0.35 + power / 1200;
  if (canSwing) score += 10 + strategic.modeWeights.lethal * 4;
  if (inst.currentZone === 'leaderArea') score += strategic.leader.offensivePlan * 0.4;
  if (intent === 'giveDon') score += Math.max(0, 3 - inst.donAttached.length) * 2;
  return score;
}

function scoreDiscardTarget(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
): number {
  // Higher score = better to discard. Prefer low strategic value.
  const value = ownCardValue(ctx, strategic, instanceId);
  const counter = printedCounterValue(ctx.state, ctx.defs, instanceId);
  const survival = lifeSafetyUrgency(strategic.survival);
  let score = 40 - value;

  // Keep Counters when survival is threatened.
  if (counter > 0 && survival >= 25) score -= counter / 80 + survival * 0.15;
  // Prefer discarding vanilla / low-synergy events over combo pieces.
  const inst = ctx.state.cardsById[instanceId];
  if (inst) {
    const def = getDefinition(ctx.defs, inst);
    if (def.category === 'event' && value < 12) score += 6;
    if (strategic.mode === 'combo_setup' && value >= 18) score -= 15;
  }
  return score;
}

function scoreTrashOwnField(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
): number {
  const inst = ctx.state.cardsById[instanceId];
  if (!inst || inst.ownerId !== ctx.playerId) return -40;
  const power = computeCurrentPower(ctx.defs, ctx.state, instanceId);
  const def = getDefinition(ctx.defs, inst);
  const value = ownCardValue(ctx, strategic, instanceId);
  let score = 50 - value - power / 800;
  if (def.hasBlocker && lifeSafetyUrgency(strategic.survival) >= 20) score -= 18;
  if (inst.summoningSick) score += 4; // prefer trashing sick bodies
  score += scoreOwnSacrificeWithOnKo(
    ctx.state,
    ctx.playerId,
    ctx.defs,
    ctx.registry,
    strategic,
    instanceId,
  );
  return score;
}

function scoreSearchOrPlayTarget(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
): number {
  return scoreSearchTargetForPlan(ctx, strategic, instanceId);
}

function scoreSelectedCard(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  instanceId: string,
  intent: SelectionIntent,
): number {
  switch (intent) {
    case 'ko':
    case 'rest':
    case 'bounce':
    case 'debuff':
      return scoreRemovalTarget(ctx, strategic, instanceId, intent);
    case 'buff':
    case 'giveDon':
      return scoreBuffOrDonTarget(ctx, strategic, instanceId, intent);
    case 'discard':
      return scoreDiscardTarget(ctx, strategic, instanceId);
    case 'trashOwnField':
      return scoreTrashOwnField(ctx, strategic, instanceId);
    case 'search':
    case 'playFromZone':
    case 'revive':
      return scoreSearchOrPlayTarget(ctx, strategic, instanceId);
    case 'payDon':
      return 5;
    case 'reorder':
      return 3;
    default:
      return ownCardValue(ctx, strategic, instanceId) * 0.2;
  }
}

function scoreYesNo(
  ctx: EffectScoreContext,
  strategic: StrategicContext,
  choice: PendingChoice,
  accept: boolean,
): number {
  return scoreOptionalYesNoResponse(ctx, strategic, choice, accept);
}

/**
 * Strategic score for a RESOLVE_PENDING_CHOICE response.
 */
export function scoreStrategicChoice(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  choice: PendingChoice,
  response: unknown,
): number {
  const ctx: EffectScoreContext = { state, playerId, defs, registry };

  if (choice.kind === 'YES_NO') {
    return scoreYesNo(ctx, strategic, choice, response === true);
  }

  if (choice.kind === 'SELECT_OPTION' && typeof response === 'number') {
    const base = scoreChoiceResponse(ctx, choice, response);
    // Bias modal picks toward current mode weights already baked into scoreEffectOps;
    // add a small mode-aligned nudge from objective.
    return base + strategic.objective.utility * 0.02 + strategic.modeWeights.removal;
  }

  if (choice.kind === 'SELECT_CARDS' && Array.isArray(response)) {
    const intent = inferSelectionIntent(ctx, choice);
    const candidates = new Set(choice.constraints.candidateInstanceIds ?? []);
    const selected = response as string[];
    const isOptionalCost =
      choice.constraints.min === 0 && (intent === 'discard' || intent === 'payDon');

    if (selected.length === 0) {
      if (choice.constraints.min === 0) {
        const optionalSkip = scoreOptionalSelectResponse(ctx, strategic, choice, []);
        if (isOptionalCost) return optionalSkip;
        if (intent === 'search') return Math.min(optionalSkip, 18);
        return optionalSkip;
      }
      return -50;
    }

    // Optional trash/DON costs: score as payoff − opportunity cost, not "happy to pitch".
    if (isOptionalCost) {
      let score = 14 + scoreOptionalSelectResponse(ctx, strategic, choice, selected);
      for (const id of selected) {
        if (candidates.size > 0 && !candidates.has(id)) return -60;
        // Prefer paying with the cheapest / least strategic card.
        score += scoreSelectedCard(ctx, strategic, id, intent) * 0.25;
      }
      return score;
    }

    let score = 24;
    for (const id of selected) {
      if (candidates.size > 0 && !candidates.has(id)) return -60;
      score += scoreSelectedCard(ctx, strategic, id, intent);
    }

    // Prefer efficient picks: don't over-select on "up to" searches unless cards are strong.
    if (choice.constraints.min === 0 && intent === 'search') {
      const avg = score / selected.length;
      if (avg < 30) score -= selected.length * 4;
    }

    return score;
  }

  if (choice.kind === 'SELECT_NUMBER' && typeof response === 'number') {
    // Prefer mid-to-high costs when paying for stronger effects; otherwise keep low.
    const min = choice.constraints.numberMin ?? choice.constraints.min;
    const max = choice.constraints.numberMax ?? choice.constraints.max;
    const span = Math.max(1, max - min);
    const normalized = (response - min) / span;
    if (strategic.mode === 'lethal_search' || strategic.mode === 'pressure') {
      return 20 + normalized * 25;
    }
    return 28 - Math.abs(normalized - 0.35) * 20;
  }

  // Fallback to primitive heuristic for exotic kinds.
  return scoreChoiceResponse(ctx, choice, response);
}
