import type { GameAction } from '../../engine/actions';
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import { computeCurrentCost, computeCurrentPower } from '../../engine/rules/shared/power';
import { getDefinition } from '../../engine/rules/shared/definitions';
import type { EffectTemplateRegistry } from '../../engine/effects';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import {
  threatPower,
} from '../heuristics/boardHeuristics';
import { scoreMulliganDecision } from '../planning/openingHandPlanner';
import {
  optionalHandTrashCandidates,
  scoreFieldActivation,
  type EffectScoreContext,
} from '../heuristics/effectValue';
import { opponentLifeCount, ownLifeCount } from '../visibility/playerView';
import { contextualPlayValue, contextualHandValue } from '../analysis/cardStrategicProfile';
import { gatePreservePenalty, gateReadinessBonus, projectCardGates } from '../analysis/gateProjection';
import { amplifiesHandAfterPlay, computeLeaderSynergy, handSynergyBonus } from '../analysis/synergyAnalyzer';
import { shouldPrioritizeLethal } from '../evaluation/lethalEstimator';
import { lifeSafetyUrgency } from '../evaluation/matchObjective';
import { topThreatUrgency } from '../analysis/threatAnalyzer';
import {
  analyzeLethalLine,
  attackLeaderLethalBonus,
  developDuringLethalPenalty,
  prematureEndMainPenalty,
} from '../planning/lethalLineAnalyzer';
import { evaluateSequencedLethalBonus, analyzeSequencedLethalInsight } from '../planning/lethalSequencePlanner';
import { analyzeAttackTrade, scoreAttackTrade } from './attackTradeEvaluator';
import {
  analyzeCounterNeed,
  printedCounterValue,
  scoreCharacterCounterUse,
  scorePassCounterStep,
} from './counterEfficiency';
import {
  analyzeCounterAwareLeaderAttack,
  scoreCounterAwareLeaderAttack,
  scoreCounterBaitAttack,
  scoreOverkillDonForLethal,
} from './counterAwareLethal';
import { estimateOpponentCounterCapacity } from './opponentCounterEstimate';
import { scoreStrategicChoice } from './choiceEvaluator';
import { shouldPreserveDefenses } from './survivalAnalyzer';
import {
  scoreLeaderOrCardActivation,
  unusedLeaderActivationEndPenalty,
} from '../planning/leaderActivationPlanner';
import { analyzeDonAttachment } from '../planning/donAttachmentPlanner';
import {
  scoreAttackTriggerSequencing,
  scoreOnBlockPayoff,
} from '../planning/attackTriggerPlanner';
import { scoreKoReactionForRemoval } from '../planning/koReactionPlanner';

function effectCtx(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  sourceInstanceId?: string,
): EffectScoreContext {
  const sourceCardDefinitionId = sourceInstanceId
    ? state.cardsById[sourceInstanceId]?.cardDefinitionId
    : undefined;
  return { state, playerId, defs, registry, sourceInstanceId, sourceCardDefinitionId };
}

export function scoreActionStrategic(
  state: GameState,
  action: GameAction,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  createActionId?: () => string,
): number {
  const baseObjective = strategic.objective.utility;
  const ctx = effectCtx(state, playerId, defs, registry);
  const weights = strategic.modeWeights;
  const survivalUrgency = lifeSafetyUrgency(strategic.survival);
  const preserveDefenses = shouldPreserveDefenses(strategic.survival);
  const lethalPriority = shouldPrioritizeLethal(strategic.victory, strategic.survival.immediateLossRisk);
  const threatUrgency = topThreatUrgency(strategic.opponentThreats);
  const lethalLine = analyzeLethalLine(state, playerId, defs);

  switch (action.type) {
    case 'END_MAIN_PHASE': {
      const endPenalty = prematureEndMainPenalty(lethalLine, strategic.mode, lethalPriority);
      const unusedLeader = unusedLeaderActivationEndPenalty(state, playerId, defs, registry, strategic);
      if (endPenalty > 0) return -endPenalty - unusedLeader + baseObjective * 0.02;
      // Only pressure ending turn when we still have attacks that can actually win.
      if (lethalLine.remainingActiveAttackers.length > 0 && lethalPriority) {
        return baseObjective * 0.02 - 20 - unusedLeader;
      }
      return baseObjective * 0.02 - 5 - unusedLeader;
    }

    case 'DECLARE_ATTACK': {
      const target = state.cardsById[action.targetInstanceId];
      const isLeader = target?.currentZone === 'leaderArea';
      const seqInsight = analyzeSequencedLethalInsight(state, playerId, defs, lethalLine);
      const trade = analyzeAttackTrade(state, defs, action.attackerInstanceId, action.targetInstanceId);
      const counterEstimate = estimateOpponentCounterCapacity(state, playerId, defs);

      let lethalBonus = 0;
      let counterAwareAdjust = 0;
      if (isLeader && !seqInsight.penalizeLeaderBeforeClear) {
        lethalBonus += 25 + (6 - opponentLifeCount(state, playerId)) * 6 * weights.lethal;
        lethalBonus += attackLeaderLethalBonus(lethalLine, true);
        if (lethalPriority) lethalBonus += 40;

        const aware = analyzeCounterAwareLeaderAttack(
          state,
          playerId,
          defs,
          action.attackerInstanceId,
          action.targetInstanceId,
          counterEstimate,
          lethalLine,
        );
        const isClosingLethal =
          lethalLine.oneAttackFromLethal ||
          lethalLine.canCloseThisTurn ||
          (lethalPriority && lethalLine.hasOpenLethalLine);
        counterAwareAdjust = scoreCounterAwareLeaderAttack(aware, { isClosingLethal });
      }

      let removalBonus = 0;
      if (!isLeader && trade.winsTrade) {
        removalBonus += trade.powerDelta / 1000 * 8 * weights.removal + 6;
        const threat = strategic.opponentThreats.find((t) => t.instanceId === action.targetInstanceId);
        if (threat) removalBonus += threat.removalUrgency * weights.removal * 0.3;

        removalBonus += scoreKoReactionForRemoval(
          state,
          playerId,
          defs,
          registry,
          strategic,
          action.targetInstanceId,
        );

        const oppLeaderId = state.players[getOpponentId(state, playerId)]?.leaderInstanceId;
        if (oppLeaderId) {
          const awareForBait = analyzeCounterAwareLeaderAttack(
            state,
            playerId,
            defs,
            action.attackerInstanceId,
            oppLeaderId,
            counterEstimate,
            lethalLine,
          );
          removalBonus += scoreCounterBaitAttack(awareForBait, action.targetInstanceId);
        }
      }

      const whenAttackingValue = scoreFieldActivation(
        effectCtx(state, playerId, defs, registry, action.attackerInstanceId),
        action.attackerInstanceId,
        'whenAttacking',
      );

      const triggerSeqBonus = scoreAttackTriggerSequencing(
        state,
        playerId,
        defs,
        registry,
        strategic,
        action.attackerInstanceId,
        action.targetInstanceId,
      );

      const sequencedBonus = createActionId
        ? evaluateSequencedLethalBonus(
            state,
            action,
            playerId,
            defs,
            registry,
            strategic,
            createActionId,
            lethalLine,
          )
        : 0;

      const score = scoreAttackTrade({
        trade,
        isLeaderTarget: isLeader,
        whenAttackingValue,
        lethalBonus,
        removalBonus,
        sequencedBonus: sequencedBonus + triggerSeqBonus,
      });

      const finalScore = score + counterAwareAdjust + baseObjective * 0.03;
      if (!trade.winsTrade) return Math.min(finalScore, -200);
      return finalScore;
    }

    case 'PLAY_CHARACTER':
    case 'PLAY_STAGE':
    case 'ACTIVATE_EVENT_MAIN': {
      const inst = state.cardsById[action.handCardInstanceId];
      if (!inst) return -100;
      const cost = computeCurrentCost(defs, state, action.handCardInstanceId);
      const localCtx = { ...ctx, sourceInstanceId: action.handCardInstanceId, sourceCardDefinitionId: inst.cardDefinitionId };
      const gates = projectCardGates(inst.cardDefinitionId, registry, localCtx);
      const preservePenalty = gatePreservePenalty(gates);
      const readinessBonus = gateReadinessBonus(gates);
      const leaderBonus = computeLeaderSynergy(strategic.leader, inst.cardDefinitionId, defs, state, action.handCardInstanceId) * weights.leaderSynergy;
      const synergyBonus = handSynergyBonus(strategic.handInteractions, inst.cardDefinitionId, true);
      const handBoost = amplifiesHandAfterPlay(localCtx, inst.cardDefinitionId, strategic.handInteractions);

      const playValue = contextualPlayValue(localCtx, action.handCardInstanceId, weights, leaderBonus + synergyBonus, preservePenalty > 0 ? 0.4 : 0);
      const holdValue = contextualHandValue(localCtx, action.handCardInstanceId, weights, leaderBonus) * weights.preserveHand;
      const def = getDefinition(defs, inst);
      const counter = def.counter ?? 0;

      let score = playValue + readinessBonus + handBoost - cost * 2.5;
      if (preservePenalty > playValue * 0.5 && strategic.mode !== 'lethal_search') {
        score -= preservePenalty;
      }
      if (action.type === 'ACTIVATE_EVENT_MAIN') score += 8;
      else score += 10;

      // Survival: develop blockers; keep Counter pieces in hand when crack-back is lethal.
      if (def.hasBlocker && (preserveDefenses || strategic.mode === 'defend' || strategic.mode === 'recovery')) {
        score += 18 + survivalUrgency * 0.25;
      }
      if (
        preserveDefenses &&
        counter >= 1000 &&
        action.type === 'PLAY_CHARACTER' &&
        strategic.mode !== 'lethal_search'
      ) {
        score -= 20 + counter / 150 + survivalUrgency * 0.15;
        score = Math.min(score, holdValue + 5);
      }

      if (strategic.mode === 'combo_setup' && preservePenalty > 8) {
        score = Math.max(score, holdValue * 0.9);
      }

      if (threatUrgency > 10 && playValue > holdValue) score += threatUrgency * 0.2;
      score -= developDuringLethalPenalty(lethalLine, strategic.mode);
      return score + baseObjective * 0.02;
    }

    case 'ACTIVATE_CARD_EFFECT':
      return scoreLeaderOrCardActivation(
        state,
        playerId,
        defs,
        registry,
        strategic,
        action.sourceInstanceId,
      );

    case 'ACTIVATE_ON_OPPONENTS_ATTACK': {
      const localCtx = effectCtx(state, playerId, defs, registry, action.sourceInstanceId);
      const effectScore = scoreFieldActivation(localCtx, action.sourceInstanceId, 'onOpponentsAttack');
      const inst = state.cardsById[action.sourceInstanceId];
      const program = inst ? registry[inst.cardDefinitionId] : undefined;
      const ability = program?.abilities.find((a) => a.timing === 'onOpponentsAttack');
      const trashables = optionalHandTrashCandidates(localCtx, ability);
      if (effectScore <= 0 && trashables.length === 0) return 8 + survivalUrgency * 0.1;
      if (trashables.length > 0) return effectScore + trashables.length * 6 + survivalUrgency * 0.15;
      return effectScore + 10 + survivalUrgency * 0.1;
    }

    case 'GIVE_DON': {
      const target = state.cardsById[action.targetInstanceId];
      if (!target) return -20;
      const power = computeCurrentPower(defs, state, action.targetInstanceId);
      const isLeader = target.currentZone === 'leaderArea';
      const futureAttack = scoreFieldActivation(ctx, action.targetInstanceId, 'whenAttacking') * 0.4;
      const canSwing =
        target.orientation === 'active' &&
        !target.summoningSick &&
        (target.currentZone === 'leaderArea' || target.currentZone === 'characterArea');

      const opponentId = Object.keys(state.players).find((id) => id !== playerId);
      const oppLeaderId = opponentId ? state.players[opponentId]?.leaderInstanceId : undefined;
      const oppLeaderPower = oppLeaderId ? computeCurrentPower(defs, state, oppLeaderId) : 0;
      // Attached DON!! grants +1000 on your turn (6-5-5-2).
      const powerAfterDon = power + 1000;
      const alreadyBeatsLeader = canSwing && power >= oppLeaderPower;
      const enablesLeaderHit = canSwing && !alreadyBeatsLeader && powerAfterDon >= oppLeaderPower;
      const stillShort = canSwing && powerAfterDon < oppLeaderPower;

      let score = (isLeader ? 10 : 14) + power / 2500 + target.donAttached.length * -2 + futureAttack * 0.5;
      const attach = analyzeDonAttachment(
        state,
        playerId,
        defs,
        registry,
        strategic,
        action.targetInstanceId,
      );
      score += attach.scoreBonus;

      if (enablesLeaderHit) {
        score += 45 + (lethalPriority ? 15 : 0);
      } else if (alreadyBeatsLeader) {
        // Buffer / overkill DON — modest by default; boost when Counters threaten lethal.
        score += 6;
        score += scoreOverkillDonForLethal(state, playerId, defs, action.targetInstanceId, lethalLine);
      } else if (stillShort) {
        // Power race fails — still allow DON that unlocks DON!! xN attack/removal effects.
        if (attach.unlocksDonCondition && attach.unlockedAbilityValue >= 10) {
          score -= 12;
        } else {
          score -= 40 + (oppLeaderPower - powerAfterDon) / 300;
        }
      }

      if (!canSwing) score -= 8;

      // Keep DON available when survival flags resource needs and this attach isn't lethal-critical.
      if (
        preserveDefenses &&
        strategic.survival.requiredResourcesToSurvive.includes('active_don') &&
        !enablesLeaderHit &&
        !lethalPriority
      ) {
        score -= 18 + survivalUrgency * 0.1;
      }

      return score;
    }

    case 'ACTIVATE_BLOCKER': {
      let score = 20 + threatPower(state, playerId, defs) / 1000 + survivalUrgency * 0.5;
      if (preserveDefenses || strategic.mode === 'defend' || strategic.mode === 'recovery') {
        score += 25 + strategic.survival.projectedLifeDamage * 8;
      }
      score += scoreOnBlockPayoff(state, playerId, defs, registry, action.blockerInstanceId);
      const battle = state.currentBattle;
      if (battle) {
        const atkPower = computeCurrentPower(defs, state, battle.attackerInstanceId);
        const blockerPower = computeCurrentPower(defs, state, action.blockerInstanceId);
        if (blockerPower >= atkPower) score += 15;
        else score -= 8;
      }
      return score;
    }
    case 'ACTIVATE_COUNTER_CHARACTER': {
      const life = ownLifeCount(state, playerId);
      const battle = state.currentBattle;
      const boostTargetId = action.boostTargetInstanceId;
      const need = battle
        ? analyzeCounterNeed(state, defs, battle.targetInstanceId)
        : null;
      const counterValue = printedCounterValue(state, defs, action.handCardInstanceId);
      const boostsBattleTarget = !!battle && boostTargetId === battle.targetInstanceId;

      if (!need) return 10;

      // Prefer boosting the card actually under attack; other targets only if that is the battle target.
      return scoreCharacterCounterUse({
        need,
        counterValue,
        boostsBattleTarget,
        life,
        survivalUrgency,
      });
    }

    case 'ACTIVATE_COUNTER_EVENT': {
      const life = ownLifeCount(state, playerId);
      const battle = state.currentBattle;
      const need = battle ? analyzeCounterNeed(state, defs, battle.targetInstanceId) : null;
      const counterScore = scoreFieldActivation(
        effectCtx(state, playerId, defs, registry, action.handCardInstanceId),
        action.handCardInstanceId,
        'counter',
      );

      if (!need) return 10 + counterScore * 0.2;

      if (need.alreadySafe) return -40 + counterScore * 0.15;

      // Events are harder to size; only use when life is threatened or deficit is large.
      if (need.lifeAtRisk && (life <= 2 || need.deficit >= 2000)) {
        return 40 + counterScore * 0.4 + survivalUrgency * 0.2 - need.deficit / 2000;
      }
      if (!need.lifeAtRisk && need.deficit >= 4000) return 20 + counterScore * 0.25;
      return 5 + counterScore * 0.1;
    }

    case 'PASS_STEP':
      if (state.currentBattle?.step === 'counter') {
        const life = ownLifeCount(state, playerId);
        const need = analyzeCounterNeed(state, defs, state.currentBattle.targetInstanceId);
        return scorePassCounterStep({ need, life, survivalUrgency });
      }
      return 25;

    case 'MULLIGAN_DECISION':
      return scoreMulliganDecision(
        state,
        playerId,
        defs,
        registry,
        strategic,
        action.redraw,
      );

    case 'CHOOSE_GOING_FIRST':
      return action.goingFirst ? 55 : 35;

    case 'RESOLVE_PENDING_CHOICE': {
      const choice = state.pendingChoices.find((c) => c.id === action.choiceId);
      if (!choice) return 10;
      return scoreStrategicChoice(
        state,
        playerId,
        defs,
        registry,
        strategic,
        choice,
        action.response,
      );
    }

    default:
      return 0;
  }
}
