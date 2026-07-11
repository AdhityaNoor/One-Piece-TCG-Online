/**
 * K.O. → On K.O. / removal-reactive evaluation (guide §14).
 * Penalize K.O.ing opponent pieces whose [On K.O.] pays them off;
 * reward sacrificing own pieces when [On K.O.] is net-positive.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { Ability, EffectTemplateRegistry } from '../../engine/effects';
import type { EffectOp } from '../../engine/effects/effectIr';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { analyzeAbility, profileScalar } from '../analysis/abilityAnalyzer';
import { ownFieldCardIds } from '../visibility/playerView';

export interface KoReactionAnalysis {
  targetInstanceId: string;
  hasOnKo: boolean;
  /** Raw [On K.O.] / watcher payoff magnitude (controller-centric). */
  reactionMagnitude: number;
  /**
   * Adjustment for the acting player:
   * negative when K.O.ing an opponent with a strong [On K.O.];
   * positive when sacrificing own with a strong [On K.O.].
   */
  scoreAdjust: number;
  /** True when opponent [On K.O.] is strong enough to prefer another target. */
  preferAvoidKo: boolean;
  /** True when own [On K.O.] makes sacrifice attractive. */
  preferSacrifice: boolean;
}

function scoreOpsRough(ops: EffectOp[]): number {
  let total = 0;
  for (const op of ops) {
    if (op.op === 'draw' || op.op === 'drawUntilHandCount') total += 10;
    else if (op.op === 'playFromHand' || op.op === 'playFromTrash' || op.op === 'playFromDeck') total += 14;
    else if (op.op === 'addDonFromDeck' || op.op === 'giveDon') total += 11;
    else if (op.op === 'searchTopDeck' || op.op === 'searchDeck') total += 9;
    else if (op.op === 'ko') total += 12;
    else if (op.op === 'rest') total += 7;
    else if (op.op === 'addPower') {
      const amount = 'amount' in op ? op.amount : 0;
      total += amount < 0 ? 8 : 6;
    } else if (op.op === 'addCost') total += 7;
    else if (op.op === 'moveToHand' || op.op === 'returnToHand') total += 8;
    else if (op.op === 'trashTopDeck' || op.op === 'trashCards') total += 4;
    else if (op.op === 'chooseTargets') total += 3;
    else total += 2;
  }
  return total;
}

function abilityConditionLikelyMet(
  ability: Ability,
  state: GameState,
  sourceInstanceId: string,
): boolean {
  const source = state.cardsById[sourceInstanceId];
  if (!source) return false;
  const condition = ability.condition;
  if (!condition) return true;
  if (condition.donAttachedAtLeast !== undefined && source.donAttached.length < condition.donAttachedAtLeast) {
    return false;
  }
  if (condition.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === source.ownerId;
    if (condition.turn === 'your' && !isOwnersTurn) return false;
    if (condition.turn === 'opponent' && isOwnersTurn) return false;
  }
  return true;
}

function abilityPayoffMagnitude(ability: Ability, enabled: boolean): number {
  const profile = analyzeAbility(ability, enabled);
  const ops = scoreOpsRough(ability.ops);
  let value = profileScalar(profile) + ops * 0.65;
  if (ability.timing === 'onKO') value += 4 + ops * 0.25;
  if (!enabled) value *= 0.35;
  return value;
}

/**
 * Controller-centric magnitude of [On K.O.] on the dying card plus
 * onCharacterKoed / onRemovedFromField watchers on that controller's field.
 */
export function scoreKoReactionMagnitude(
  state: GameState,
  _defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  targetInstanceId: string,
): number {
  const target = state.cardsById[targetInstanceId];
  if (!target) return 0;
  const controllerId = target.controllerId;
  let total = 0;

  const program = registry[target.cardDefinitionId];
  const onKo = program?.abilities.find((a) => a.timing === 'onKO');
  if (onKo) {
    total += abilityPayoffMagnitude(onKo, abilityConditionLikelyMet(onKo, state, targetInstanceId));
  }

  // Field watchers that care about a Character being K.O.'d / leaving.
  for (const sourceId of ownFieldCardIds(state, controllerId)) {
    if (sourceId === targetInstanceId) continue;
    const inst = state.cardsById[sourceId];
    if (!inst) continue;
    const watchProgram = registry[inst.cardDefinitionId];
    if (!watchProgram) continue;
    for (const ability of watchProgram.abilities) {
      if (ability.timing !== 'onCharacterKoed' && ability.timing !== 'onRemovedFromField') continue;
      if (!abilityConditionLikelyMet(ability, state, sourceId)) continue;
      total += abilityPayoffMagnitude(ability, true) * 0.55;
    }
  }

  return total;
}

export function analyzeKoReaction(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  targetInstanceId: string,
): KoReactionAnalysis {
  const target = state.cardsById[targetInstanceId];
  const empty: KoReactionAnalysis = {
    targetInstanceId,
    hasOnKo: false,
    reactionMagnitude: 0,
    scoreAdjust: 0,
    preferAvoidKo: false,
    preferSacrifice: false,
  };
  if (!target || target.currentZone !== 'characterArea') return empty;

  const program = registry[target.cardDefinitionId];
  const hasOnKo = !!program?.abilities.some((a) => a.timing === 'onKO');
  const reactionMagnitude = scoreKoReactionMagnitude(state, defs, registry, targetInstanceId);
  const isOpponent = target.controllerId !== playerId;

  let scoreAdjust = 0;
  if (isOpponent) {
    // Their payoff is our problem.
    scoreAdjust = -reactionMagnitude * 0.9 * strategic.modeWeights.removal;
    // Still remove high-urgency engines even with onKO — soften the penalty.
    const threat = strategic.opponentThreats.find((t) => t.instanceId === targetInstanceId);
    if ((threat?.removalUrgency ?? 0) >= 18) scoreAdjust *= 0.45;
    if (strategic.mode === 'lethal_search') scoreAdjust *= 0.55;
  } else {
    // Own sacrifice: onKO can offset losing the body.
    scoreAdjust = reactionMagnitude * 0.85 * strategic.modeWeights.engine - 6;
    if (strategic.mode === 'combo_setup') scoreAdjust += reactionMagnitude * 0.15;
  }

  return {
    targetInstanceId,
    hasOnKo,
    reactionMagnitude,
    scoreAdjust,
    preferAvoidKo: isOpponent && reactionMagnitude >= 8 && scoreAdjust <= -6,
    preferSacrifice: !isOpponent && reactionMagnitude >= 8 && scoreAdjust >= 4,
  };
}

/** Score adjust when K.O.ing (or trading into) a character. */
export function scoreKoReactionForRemoval(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  targetInstanceId: string,
): number {
  return analyzeKoReaction(state, playerId, defs, registry, strategic, targetInstanceId).scoreAdjust;
}

/** Score adjust when choosing to trash/sacrifice own field character. */
export function scoreOwnSacrificeWithOnKo(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  targetInstanceId: string,
): number {
  const target = state.cardsById[targetInstanceId];
  if (!target || target.controllerId !== playerId) return 0;
  return analyzeKoReaction(state, playerId, defs, registry, strategic, targetInstanceId).scoreAdjust;
}
