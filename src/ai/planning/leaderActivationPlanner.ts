/**
 * Once-per-turn Leader activation sequencing (leader guide §12, §15).
 * Decides activate-now vs delay-until-later-in-turn vs preserve for next turn.
 */
import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { evaluateGates } from '../../engine/effects/gates';
import type { Ability, EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { scoreFieldActivation, type EffectScoreContext } from '../heuristics/effectValue';
import { analyzeAbility, profileScalar } from '../analysis/abilityAnalyzer';
import { projectCardGates } from '../analysis/gateProjection';
import { ownActiveDonIds, ownHandIds } from '../visibility/playerView';

export interface LeaderActivationAnalysis {
  leaderInstanceId: string | null;
  available: boolean;
  oncePerTurn: boolean;
  alreadyUsed: boolean;
  gatesMet: boolean;
  /** Approximate effect value if activated now. */
  activationValue: number;
  /** True when a hand play likely enables currently-failing Leader gates. */
  preferPlayBeforeActivate: boolean;
  /** True when activation is removal/rest that should precede attacks. */
  preferActivateBeforeAttack: boolean;
  /** True when DON cost is high relative to remaining active DON / lethal needs. */
  preferPreserveDon: boolean;
  donCost: number;
}

function leaderActivateAbility(
  state: GameState,
  registry: EffectTemplateRegistry,
  leaderInstanceId: string,
): Ability | undefined {
  const inst = state.cardsById[leaderInstanceId];
  if (!inst) return undefined;
  return registry[inst.cardDefinitionId]?.abilities.find((a) => a.timing === 'activateMain');
}

function abilityHasRemovalOps(ability: Ability | undefined): boolean {
  if (!ability) return false;
  const hasDirectRemoval = ability.ops.some(
    (op) =>
      op.op === 'ko' ||
      op.op === 'koAllCharacters' ||
      op.op === 'rest' ||
      op.op === 'returnToHand' ||
      op.op === 'moveToBottomDeck' ||
      op.op === 'trashCards',
  );
  if (hasDirectRemoval) return true;

  // Curated bounce often compiles to chooseTargets(characters) + moveToHand (owner).
  const choosesCharacter = ability.ops.some(
    (op) =>
      op.op === 'chooseTargets' &&
      (op.from.sel === 'allCharacters' ||
        op.from.sel === 'opponentCharacters' ||
        op.from.sel === 'controllerCharacters'),
  );
  const movesToHand = ability.ops.some((op) => op.op === 'moveToHand' || op.op === 'returnToHand');
  return choosesCharacter && movesToHand;
}

/** Extra value when Leader bounce/removal has a live opponent target. */
function liveRemovalTargetBonus(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  ability: Ability | undefined,
): number {
  if (!ability || !abilityHasRemovalOps(ability)) return 0;
  const choose = ability.ops.find(
    (op) =>
      op.op === 'chooseTargets' &&
      (op.from.sel === 'allCharacters' || op.from.sel === 'opponentCharacters'),
  );
  if (!choose || choose.op !== 'chooseTargets') return 8;

  const maxCost = 'maxCost' in choose.from ? choose.from.maxCost : undefined;
  let best = 0;
  for (const inst of Object.values(state.cardsById)) {
    if (inst.controllerId === playerId) continue;
    if (inst.currentZone !== 'characterArea') continue;
    const def = defs[inst.cardDefinitionId];
    const cost = def?.baseCost ?? 0;
    if (maxCost !== undefined && cost > maxCost) continue;
    const power = inst.currentPower ?? def?.basePower ?? 0;
    best = Math.max(best, 14 + power / 800 + cost);
  }
  return best;
}

function estimateDonCost(ability: Ability | undefined): number {
  if (!ability?.cost?.length) return 0;
  let total = 0;
  for (const c of ability.cost) {
    if (c.kind === 'donMinus' || c.kind === 'restDon') total += c.count ?? 1;
  }
  return total;
}

function abilityWantsBoardSetup(ability: Ability | undefined): boolean {
  if (!ability?.gate?.length) return false;
  return ability.gate.some(
    (g) =>
      g.kind === 'selfCharacterCount' ||
      g.kind === 'selfCharacterTypeCount' ||
      g.kind === 'leaderType' ||
      g.kind === 'controllerStage' ||
      g.kind === 'selfDonAttachedTotal',
  );
}

function abilityIsPreAttackSupport(ability: Ability | undefined): boolean {
  if (!ability) return false;
  if (abilityHasRemovalOps(ability)) return true;
  const profile = analyzeAbility(ability, true);
  return profile.removalValue >= 6 || profile.tempoValue >= 6 || profile.offensiveValue >= 8;
}

export function analyzeLeaderActivation(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic?: StrategicContext,
): LeaderActivationAnalysis {
  const leaderInstanceId = state.players[playerId]?.leaderInstanceId ?? null;
  const empty: LeaderActivationAnalysis = {
    leaderInstanceId,
    available: false,
    oncePerTurn: false,
    alreadyUsed: false,
    gatesMet: false,
    activationValue: 0,
    preferPlayBeforeActivate: false,
    preferActivateBeforeAttack: false,
    preferPreserveDon: false,
    donCost: 0,
  };
  if (!leaderInstanceId) return empty;

  const inst = state.cardsById[leaderInstanceId];
  if (!inst) return empty;
  const ability = leaderActivateAbility(state, registry, leaderInstanceId);
  if (!ability) return empty;

  const oncePerTurn = !!ability.oncePerTurn;
  const alreadyUsed = oncePerTurn && inst.oncePerTurnUsed.includes('activateMain');
  const gatesMet =
    !ability.gate?.length || evaluateGates(ability.gate, state, defs, playerId, leaderInstanceId);
  const donCost = estimateDonCost(ability);
  const activeDon = ownActiveDonIds(state, playerId).length;

  const ctx: EffectScoreContext = {
    state,
    playerId,
    defs,
    registry,
    sourceInstanceId: leaderInstanceId,
    sourceCardDefinitionId: inst.cardDefinitionId,
  };
  const effectScore = scoreFieldActivation(ctx, leaderInstanceId, 'activateMain');
  const profile = analyzeAbility(ability, gatesMet);
  const removalBonus = liveRemovalTargetBonus(state, playerId, defs, ability);
  const activationValue =
    effectScore +
    profileScalar(profile) * 0.4 +
    removalBonus * 0.85 +
    (strategic?.leader.activationValue ?? 0) * 0.15;

  // Delay activation when a hand play is needed to enable Leader gates / board setup.
  let preferPlayBeforeActivate = false;
  if (!gatesMet && abilityWantsBoardSetup(ability) && ownHandIds(state, playerId).length > 0) {
    preferPlayBeforeActivate = true;
  } else if (!gatesMet) {
    for (const handId of ownHandIds(state, playerId)) {
      const handInst = state.cardsById[handId];
      if (!handInst) continue;
      const gates = projectCardGates(handInst.cardDefinitionId, registry, {
        ...ctx,
        sourceInstanceId: handId,
        sourceCardDefinitionId: handInst.cardDefinitionId,
      });
      if (gates.some((g) => !g.currentlySatisfied && g.actionsToSatisfy <= 1 && g.expectedPayoff >= 10)) {
        preferPlayBeforeActivate = true;
        break;
      }
    }
  }

  const preferActivateBeforeAttack =
    gatesMet && !alreadyUsed && abilityIsPreAttackSupport(ability) && activationValue >= 10;

  const lethalMode = strategic?.mode === 'lethal_search' || strategic?.mode === 'pressure';
  // Preserve DON when the activation is weak / no target — not when bounce/removal is live.
  const preferPreserveDon =
    donCost >= 3 &&
    activeDon - donCost < (lethalMode ? 2 : 1) &&
    activationValue < 25 &&
    removalBonus < 12;

  const available = !alreadyUsed && gatesMet && activeDon >= donCost;

  return {
    leaderInstanceId,
    available,
    oncePerTurn,
    alreadyUsed,
    gatesMet,
    activationValue,
    preferPlayBeforeActivate,
    preferActivateBeforeAttack,
    preferPreserveDon,
    donCost,
  };
}

/**
 * Score activating the Leader (or any activateMain). Leader once-per-turn gets
 * sequencing adjustments: delay if setup play first, rush if pre-attack support.
 */
export function scoreLeaderOrCardActivation(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  sourceInstanceId: string,
): number {
  const analysis = analyzeLeaderActivation(state, playerId, defs, registry, strategic);
  const isLeader = sourceInstanceId === analysis.leaderInstanceId;
  const base =
    12 +
    scoreFieldActivation(
      {
        state,
        playerId,
        defs,
        registry,
        sourceInstanceId,
        sourceCardDefinitionId: state.cardsById[sourceInstanceId]?.cardDefinitionId,
      },
      sourceInstanceId,
      'activateMain',
    ) *
      strategic.modeWeights.engine;

  if (!isLeader) {
    return base + strategic.objective.utility * 0.02;
  }

  let score = base + analysis.activationValue * 0.35 + strategic.leader.activationValue * 0.1;

  if (analysis.alreadyUsed) return -40;
  if (!analysis.gatesMet) return score - 35;

  if (analysis.preferPreserveDon) score -= 22 + analysis.donCost * 3;
  if (analysis.preferPlayBeforeActivate) score -= 28;
  if (analysis.preferActivateBeforeAttack) score += 18 + strategic.modeWeights.removal * 4;

  // Once-per-turn: strong bias to use it this turn if available and valuable.
  if (analysis.oncePerTurn && analysis.available && analysis.activationValue >= 14) {
    if (!analysis.preferPlayBeforeActivate && !analysis.preferPreserveDon) {
      score += 16 * strategic.modeWeights.leaderSynergy;
    }
  }

  if (strategic.mode === 'lethal_search' && analysis.preferPreserveDon) score -= 10;
  if (strategic.mode === 'combo_setup' && analysis.preferPlayBeforeActivate) score -= 8;

  return score + strategic.objective.utility * 0.02;
}

/** Penalty for ending the turn with an unused valuable once-per-turn Leader activation. */
export function unusedLeaderActivationEndPenalty(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
): number {
  const analysis = analyzeLeaderActivation(state, playerId, defs, registry, strategic);
  if (!analysis.oncePerTurn || !analysis.available) return 0;
  if (analysis.preferPreserveDon) return 0;
  if (analysis.preferPlayBeforeActivate) return 8; // mild — maybe should have played first
  if (analysis.activationValue < 12) return 5;
  return 25 + Math.min(20, analysis.activationValue * 0.4);
}

export function isLeaderActivateAction(
  state: GameState,
  playerId: string,
  action: GameAction,
): boolean {
  if (action.type !== 'ACTIVATE_CARD_EFFECT') return false;
  return action.sourceInstanceId === state.players[playerId]?.leaderInstanceId;
}
