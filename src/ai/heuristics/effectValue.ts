/**
 * Estimates strategic value of curated effect IR without simulating execution.
 * Used by the CPU to weigh card effects on hand and in play, not just stats.
 */
import type { GameState } from '../../engine/state/game';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { computeCurrentCost, computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import { getOpponentId } from '../../engine/rules/shared';
import type { EffectTemplateRegistry } from '../../engine/effects';
import { evaluateGates } from '../../engine/effects/gates';
import type { Ability, EffectOp, EffectProgram, IrTiming, Selector } from '../../engine/effects/effectIr';
import type { PendingChoice } from '../../engine/events/pendingChoice';
import { opponentPublicCardIds, ownHandIds } from '../visibility/playerView';

export interface EffectScoreContext {
  state: GameState;
  playerId: string;
  defs: CardDefinitionLookup;
  registry: EffectTemplateRegistry;
  sourceInstanceId?: string;
  sourceCardDefinitionId?: string;
}

function opponentId(ctx: EffectScoreContext): string {
  return getOpponentId(ctx.state, ctx.playerId);
}

function controllerIdForSelector(sel: Selector, ctx: EffectScoreContext): 'self' | 'opponent' | 'either' {
  if ('sel' in sel) {
    switch (sel.sel) {
      case 'self':
      case 'controllerLeader':
      case 'controllerCharacters':
      case 'controllerLeaderOrCharacters':
      case 'controllerLeaderOrStage':
      case 'controllerHand':
      case 'controllerRestedDon':
      case 'controllerActiveDon':
      case 'controllerFieldDon':
      case 'controllerAttachedDon':
      case 'controllerLifeTop':
      case 'controllerDeckTop':
      case 'controllerTrash':
      case 'controllerStages':
        return 'self';
      case 'opponentLeader':
      case 'opponentLeaderOrCharacters':
      case 'opponentCharacters':
      case 'opponentFieldDon':
      case 'opponentActiveDon':
      case 'opponentRestedDon':
      case 'opponentUnattachedDon':
      case 'opponentHand':
      case 'opponentLifeTop':
      case 'opponentTrash':
      case 'opponentStages':
      case 'battleOpponent':
        return 'opponent';
      case 'allCharacters':
      case 'allStages':
        return 'either';
      default:
        return 'self';
    }
  }
  return 'self';
}

function bestOpponentTargetValue(ctx: EffectScoreContext, filter?: { maxCost?: number; maxPower?: number; rested?: boolean }): number {
  let best = 0;
  for (const id of opponentPublicCardIds(ctx.state, ctx.playerId)) {
    const inst = ctx.state.cardsById[id];
    if (!inst) continue;
    const def = getDefinition(ctx.defs, inst);
    if (filter?.rested && inst.orientation !== 'rested') continue;
    if (filter?.maxCost !== undefined && (def.baseCost ?? 0) > filter.maxCost) continue;
    const power = computeCurrentPower(ctx.defs, ctx.state, id);
    if (filter?.maxPower !== undefined && power > filter.maxPower) continue;
    best = Math.max(best, power / 1000 + (def.baseCost ?? 0) * 0.8);
  }
  return best;
}

function scoreSelectorImpact(ctx: EffectScoreContext, target: Selector, kind: 'harm' | 'help' | 'neutral'): number {
  const side = controllerIdForSelector(target, ctx);
  const sign = kind === 'harm' ? (side === 'opponent' ? 1 : side === 'self' ? -1 : 0.5) : kind === 'help' ? (side === 'self' ? 1 : side === 'opponent' ? -1 : 0.5) : 0;
  if (sign === 0) return 0;

  if ('sel' in target) {
    if (target.sel === 'opponentCharacters' || target.sel === 'allCharacters') {
      return sign * (8 + bestOpponentTargetValue(ctx, target) * (kind === 'harm' ? 1.4 : 0.6));
    }
    if (target.sel === 'opponentLeader') {
      const leaderId = ctx.state.players[opponentId(ctx)]?.leaderInstanceId;
      if (!leaderId) return sign * 6;
      return sign * (10 + computeCurrentPower(ctx.defs, ctx.state, leaderId) / 1200);
    }
    if (target.sel === 'controllerLeaderOrCharacters' || target.sel === 'controllerLeader') {
      const player = ctx.state.players[ctx.playerId];
      let val = 0;
      if (player?.leaderInstanceId) val = Math.max(val, computeCurrentPower(ctx.defs, ctx.state, player.leaderInstanceId) / 1500);
      for (const id of player?.characterArea.cardIds ?? []) {
        val = Math.max(val, computeCurrentPower(ctx.defs, ctx.state, id) / 1500);
      }
      return sign * (6 + val * 4);
    }
    if (target.sel === 'self' && ctx.sourceInstanceId) {
      return sign * (4 + computeCurrentPower(ctx.defs, ctx.state, ctx.sourceInstanceId) / 1500);
    }
    if (target.sel === 'battleOpponent') {
      const battle = ctx.state.currentBattle;
      if (!battle) return sign * 5;
      return sign * (6 + computeCurrentPower(ctx.defs, ctx.state, battle.attackerInstanceId) / 1200);
    }
  }
  return sign * 5;
}

function scoreEffectOp(ctx: EffectScoreContext, op: EffectOp, factor = 1): number {
  switch (op.op) {
    case 'draw':
      return factor * (op.player === 'opponent' ? -7 * op.amount : 7 * op.amount);
    case 'drawUntilHandCount':
      return factor * 10;
    case 'addDonFromDeck':
      return factor * (op.rested ? 5 : 9) * op.count;
    case 'giveDon':
      return factor * (6 * op.count + scoreSelectorImpact(ctx, op.target, 'help') * 0.5);
    case 'ko':
      return factor * (14 + scoreSelectorImpact(ctx, op.target, 'harm') * 2);
    case 'koAllCharacters':
      return factor * (10 + bestOpponentTargetValue(ctx) * 3);
    case 'rest':
      return factor * (8 + scoreSelectorImpact(ctx, op.target, 'harm') * 1.2);
    case 'setActive':
      return factor * (6 + scoreSelectorImpact(ctx, op.target, 'help'));
    case 'addPower': {
      const amount = op.amountPer ? op.amountPer * 2 : op.amount;
      const magnitude = Math.abs(amount) / 450;
      return factor * magnitude * (amount >= 0 ? scoreSelectorImpact(ctx, op.target, 'help') || 1 : scoreSelectorImpact(ctx, op.target, 'harm') || 1);
    }
    case 'addPowerSelf':
      return factor * (Math.abs(op.amount) / 400 + 4);
    case 'addPowerAura':
    case 'addKeywordAura':
    case 'setBasePowerAura':
    case 'addCostAura':
      return factor * 8;
    case 'addKeyword': {
      const kw = op.keyword;
      let bonus = 4;
      if (kw === 'blocker') bonus = 7;
      if (kw === 'rush') bonus = 6;
      if (kw === 'doubleAttack') bonus = 10;
      if (kw === 'banish') bonus = 8;
      return factor * (bonus + scoreSelectorImpact(ctx, op.target, 'help') * 0.3);
    }
    case 'returnToHand':
    case 'moveToBottomDeck':
      return factor * (10 + scoreSelectorImpact(ctx, op.target, 'harm') * 1.5);
    case 'moveToHand':
      return factor * (8 + scoreSelectorImpact(ctx, op.target, 'help'));
    case 'moveToLifeTop':
      return factor * 9;
    case 'trashCards':
      return factor * scoreSelectorImpact(ctx, op.target, 'harm') * 1.2;
    case 'trashLife':
      return factor * (op.player === 'opponent' ? 12 : -8) * (op.count ?? 1);
    case 'trashTopDeck':
      return factor * (op.count <= 2 ? 2 : -2);
    case 'playFromHand':
    case 'playFromTrash':
    case 'playFromDeck':
      return factor * (12 + scoreCardTimings(ctx, ctx.sourceCardDefinitionId ?? '', ['onPlay', 'onEnterPlay'], 0.8));
    case 'searchTopDeck':
    case 'searchDeck':
      return factor * (6 + op.pick * 4);
    case 'chooseOption': {
      let best = 0;
      for (const option of op.options) {
        best = Math.max(best, scoreEffectOps(ctx, option.ops, factor));
      }
      return best;
    }
    case 'chooseTargets':
      return factor * 4;
    case 'optionalTrashFromHand':
      return 0;
    case 'registerKoReplacement':
    case 'addKoImmunity':
    case 'addKoImmunityAura':
      return factor * 9;
    case 'preventAttack':
    case 'preventAttackController':
    case 'setForcedAttackTarget':
    case 'redirectAttackTarget':
      return factor * 8;
    case 'preventBlockers':
    case 'suppressBlockerActivation':
      return factor * 7;
    case 'negateEffect':
    case 'negateControllerEffects':
      return factor * 9;
    case 'returnHandShuffleDraw':
      return factor * (op.player === 'opponent' ? -10 : 12);
  }
  return 0;
}

function scoreEffectOps(ctx: EffectScoreContext, ops: EffectOp[], factor = 1): number {
  let total = 0;
  for (const op of ops) {
    const gateFactor = op.ifPrevious || op.ifGate ? factor * 0.55 : factor;
    total += scoreEffectOp(ctx, op, gateFactor);
  }
  return total;
}

function abilityGateMet(ctx: EffectScoreContext, ability: Ability): boolean {
  if (!ability.gate?.length) return true;
  return evaluateGates(ability.gate, ctx.state, ctx.defs, ctx.playerId, ctx.sourceInstanceId);
}

function scoreAbilityCost(ability: Ability): number {
  if (!ability.cost?.length) return 0;
  let penalty = 0;
  for (const cost of ability.cost) {
    if (cost.kind === 'donMinus') penalty += cost.count * 4;
    if (cost.kind === 'restDon') penalty += cost.count * 3;
    if (cost.kind === 'restThis') penalty += 3;
    if (cost.kind === 'trashThis') penalty += 5;
  }
  return penalty;
}

export function scoreAbility(ctx: EffectScoreContext, ability: Ability, timingWeight = 1): number {
  if (!abilityGateMet(ctx, ability)) return 0;
  const trashables = optionalHandTrashCandidates(ctx, ability);
  const needsTrashForFollowUp = ability.ops.some(
    (op) => (op.ifPrevious === 'previousMovedAny' || op.ifPrevious === 'previousSelectedAny') &&
      ability.ops.some((lead) => lead.op === 'chooseTargets' && lead.from?.sel === 'controllerHand' && lead.min === 0),
  );
  if (needsTrashForFollowUp && trashables.length === 0) return 0;
  const body = scoreEffectOps(ctx, ability.ops, ability.optionalActivate ? 0.65 : 1);
  return Math.max(0, body * timingWeight - scoreAbilityCost(ability));
}

export function scoreCardTimings(
  ctx: EffectScoreContext,
  cardDefinitionId: string,
  timings: IrTiming[],
  weight = 1,
): number {
  const program: EffectProgram | undefined = ctx.registry[cardDefinitionId];
  if (!program) return 0;
  let total = 0;
  for (const timing of timings) {
    for (const ability of program.abilities.filter((a) => a.timing === timing)) {
      total += scoreAbility(ctx, ability, weight);
    }
  }
  return total;
}

export function scoreHandCardPlay(ctx: EffectScoreContext, handInstanceId: string): number {
  const inst = ctx.state.cardsById[handInstanceId];
  if (!inst) return 0;
  const cardDefinitionId = inst.cardDefinitionId;
  const localCtx = { ...ctx, sourceCardDefinitionId: cardDefinitionId, sourceInstanceId: handInstanceId };
  const def = getDefinition(ctx.defs, inst);

  if (def.category === 'character') {
    return (
      scoreCardTimings(localCtx, cardDefinitionId, ['onPlay', 'onEnterPlay'], 1) +
      scoreCardTimings(localCtx, cardDefinitionId, ['activateMain'], 0.55) +
      scoreCardTimings(localCtx, cardDefinitionId, ['whenAttacking', 'onOpponentsAttack'], 0.45)
    );
  }
  if (def.category === 'stage') {
    return scoreCardTimings(localCtx, cardDefinitionId, ['onEnterPlay', 'activateMain'], 1);
  }
  if (def.category === 'event') {
    return scoreCardTimings(localCtx, cardDefinitionId, ['activateMain', 'counter', 'lifeTrigger'], 1);
  }
  return 0;
}

export function scoreFieldActivation(ctx: EffectScoreContext, sourceInstanceId: string, timing: IrTiming): number {
  const inst = ctx.state.cardsById[sourceInstanceId];
  if (!inst) return 0;
  const localCtx = { ...ctx, sourceInstanceId, sourceCardDefinitionId: inst.cardDefinitionId };
  return scoreCardTimings(localCtx, inst.cardDefinitionId, [timing], 1);
}

export function scoreInstanceAsTarget(
  ctx: EffectScoreContext,
  instanceId: string,
  intent: 'ko' | 'rest' | 'trash' | 'buff' | 'bounce',
): number {
  const inst = ctx.state.cardsById[instanceId];
  if (!inst) return -20;
  const def = getDefinition(ctx.defs, inst);
  const power = computeCurrentPower(ctx.defs, ctx.state, instanceId);
  const isOpp = inst.ownerId !== ctx.playerId;

  if (intent === 'ko' || intent === 'bounce') {
    return isOpp ? 12 + power / 800 + (def.baseCost ?? 0) : -(10 + power / 800);
  }
  if (intent === 'rest') {
    return isOpp && inst.orientation === 'active' ? 10 + power / 1000 : isOpp ? 3 : -6;
  }
  if (intent === 'trash') {
    if (def.category === 'event' || def.category === 'stage') return isOpp ? 4 : 12;
    return isOpp ? 6 : -(8 + power / 1000);
  }
  if (intent === 'buff') {
    return isOpp ? -(6 + power / 1000) : 10 + power / 800;
  }
  return 0;
}

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

function targetIntentForOp(op: EffectOp | undefined): 'ko' | 'rest' | 'trash' | 'buff' | 'bounce' {
  if (!op) return 'buff';
  if (op.op === 'ko') return 'ko';
  if (op.op === 'rest') return 'rest';
  if (op.op === 'trashCards') return 'trash';
  if (op.op === 'returnToHand') return 'bounce';
  if (op.op === 'addPower' && op.amount < 0) return 'rest';
  if (op.op === 'addPower' && op.amount > 0) return 'buff';
  return 'buff';
}

export function scoreChoiceResponse(
  ctx: EffectScoreContext,
  choice: PendingChoice,
  response: unknown,
): number {
  if (choice.kind === 'YES_NO') {
    return response === true ? 36 : 12;
  }
  if (choice.kind === 'SELECT_OPTION' && typeof response === 'number') {
    const inst = choice.sourceInstanceId ? ctx.state.cardsById[choice.sourceInstanceId] : undefined;
    const program = inst ? ctx.registry[inst.cardDefinitionId] : undefined;
    const ability = program?.abilities[choice.resumeState?.abilityIndex ?? 0];
    const choose = ability?.ops[choice.resumeState?.opIndex ?? 0];
    if (choose?.op === 'chooseOption') {
      const branch = choose.options[response];
      if (branch) {
        const localCtx = inst
          ? { ...ctx, sourceInstanceId: inst.instanceId, sourceCardDefinitionId: inst.cardDefinitionId }
          : ctx;
        return 20 + scoreEffectOps(localCtx, branch.ops);
      }
    }
    return 20;
  }
  if (choice.kind === 'SELECT_CARDS' && Array.isArray(response)) {
    const suspended = suspendedOpForChoice(ctx, choice);
    const intent = targetIntentForOp(suspended);
    const candidates = new Set(choice.constraints.candidateInstanceIds ?? []);
    let score = choice.constraints.min === 0 ? 16 : 28;
    if (response.length === 0) return choice.constraints.min === 0 ? score : -40;
    for (const id of response) {
      if (candidates.size > 0 && !candidates.has(id)) return -50;
      score += scoreInstanceAsTarget(ctx, id, intent);
    }
    return score;
  }
  if (typeof response === 'boolean') return response ? 40 : 15;
  return 20;
}

export function optionalHandTrashCandidates(
  ctx: EffectScoreContext,
  ability: Ability | undefined,
): string[] {
  const chooseOp = ability?.ops.find((op) => op.op === 'chooseTargets' && op.from?.sel === 'controllerHand' && op.min === 0);
  if (!chooseOp || chooseOp.op !== 'chooseTargets') return [];
  const filter = chooseOp.from.filter;
  return ownHandIds(ctx.state, ctx.playerId).filter((id) => {
    const inst = ctx.state.cardsById[id];
    if (!inst) return false;
    const def = getDefinition(ctx.defs, inst);
    if (filter?.anyOf) {
      return filter.anyOf.some((clause) => !clause.category || def.category === clause.category);
    }
    if (filter?.category) return def.category === filter.category;
    return true;
  });
}

export function scoreHandCardValue(
  ctx: EffectScoreContext,
  handInstanceId: string,
): number {
  const inst = ctx.state.cardsById[handInstanceId];
  if (!inst) return 0;
  const def = getDefinition(ctx.defs, inst);
  const cost = computeCurrentCost(ctx.defs, ctx.state, handInstanceId);
  let score = 0;
  if (def.category === 'character') {
    score += (def.basePower ?? 0) / 1000 + 6;
    if (def.hasBlocker) score += 4;
    if (def.hasRush) score += 3;
    if ((def.counter ?? 0) > 0) score += def.counter! / 1000 + 2;
  }
  if (def.category === 'event') score += 5;
  if (def.category === 'stage') score += 6;
  score -= cost * 1.5;
  score += scoreHandCardPlay(ctx, handInstanceId);
  return score;
}
