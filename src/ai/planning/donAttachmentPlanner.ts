/**
 * DON!! attachment recipient selection (guide §14 DON Give → Trigger,
 * leader guide “Leader rewards attaching DON!!”).
 *
 * Prefers recipients that unlock DON!! xN conditions or fire onDonGiven
 * payoffs over dumping power on already-enabled bodies.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import type { Ability, EffectTemplateRegistry } from '../../engine/effects';
import type { EffectOp } from '../../engine/effects/effectIr';
import type { GameState } from '../../engine/state/game';
import type { StrategicContext } from '../strategy/types';
import { analyzeAbility, profileScalar } from '../analysis/abilityAnalyzer';
import { ownFieldCardIds } from '../visibility/playerView';

function scoreOpsRough(ops: EffectOp[]): number {
  let total = 0;
  for (const op of ops) {
    if (op.op === 'ko' || op.op === 'koAllCharacters') total += 14;
    else if (op.op === 'rest') total += 8;
    else if (op.op === 'addCost') total += 7;
    else if (op.op === 'addPower' || op.op === 'addPowerSelf') total += 6;
    else if (op.op === 'draw') total += 7;
    else if (op.op === 'returnToHand' || op.op === 'moveToHand') total += 9;
    else if (op.op === 'chooseTargets') total += 3;
    else total += 2;
  }
  return total;
}

export interface DonAttachmentAnalysis {
  targetInstanceId: string;
  /** This attach crosses a donAttachedAtLeast threshold on the target. */
  unlocksDonCondition: boolean;
  /** Value of abilities newly enabled by this attach. */
  unlockedAbilityValue: number;
  /** onDonGiven payoff on the recipient and watching field cards (e.g. Leader). */
  onDonGivenValue: number;
  /** Soft preference to spread onto unlock targets rather than stack. */
  preferSpreadOntoTarget: boolean;
  scoreBonus: number;
}

function requiredDonAttached(ability: Ability): number | undefined {
  return ability.condition?.donAttachedAtLeast;
}

function abilityUnlockValue(ability: Ability, gatesMet: boolean): number {
  const profile = analyzeAbility(ability, gatesMet);
  let value = profileScalar(profile) + scoreOpsRough(ability.ops) * 0.55;
  // Attack-time unlocks are especially valuable this turn.
  if (ability.timing === 'whenAttacking') value *= 1.35;
  if (ability.timing === 'activateMain') value *= 1.15;
  if (ability.timing === 'onBlock') value *= 1.1;
  return value;
}

/**
 * Value of abilities on `target` that become newly (or further) enabled by +1 DON!!.
 */
export function scoreDonConditionUnlock(
  state: GameState,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  targetInstanceId: string,
): { unlocks: boolean; value: number } {
  const inst = state.cardsById[targetInstanceId];
  if (!inst) return { unlocks: false, value: 0 };
  const program = registry[inst.cardDefinitionId];
  if (!program) return { unlocks: false, value: 0 };

  const current = inst.donAttached.length;
  let unlocks = false;
  let value = 0;

  for (const ability of program.abilities) {
    const need = requiredDonAttached(ability);
    if (need === undefined) continue;
    if (current >= need) continue; // already enabled

    if (current + 1 >= need) {
      unlocks = true;
      value += abilityUnlockValue(ability, true);
    } else {
      // Partial progress toward a higher threshold (e.g. 0→1 when need is 2).
      value += abilityUnlockValue(ability, false) * ((current + 1) / need) * 0.45;
    }
  }

  // Continuous / aura ops that gate on sourceCondition or condition.donAttachedAtLeast.
  for (const ability of program.abilities) {
    for (const op of ability.ops) {
      const needs: number[] = [];
      if ('condition' in op && op.condition && typeof op.condition === 'object' && 'donAttachedAtLeast' in op.condition) {
        const n = (op.condition as { donAttachedAtLeast?: number }).donAttachedAtLeast;
        if (typeof n === 'number') needs.push(n);
      }
      if (
        'sourceCondition' in op &&
        op.sourceCondition &&
        typeof op.sourceCondition === 'object' &&
        'donAttachedAtLeast' in op.sourceCondition
      ) {
        const n = (op.sourceCondition as { donAttachedAtLeast?: number }).donAttachedAtLeast;
        if (typeof n === 'number') needs.push(n);
      }
      for (const need of needs) {
        if (current >= need) continue;
        if (current + 1 >= need) {
          unlocks = true;
          value += 6;
        } else {
          value += 2.5 * ((current + 1) / need);
        }
      }
    }
  }

  return { unlocks, value };
}

/**
 * onDonGiven value from the recipient and any watching field cards (Leader, etc.).
 * Don-given gates need event context the static evaluator lacks, so score from IR
 * semantics rather than evaluateGates.
 */
export function scoreOnDonGivenTriggers(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  targetInstanceId: string,
): number {
  let total = 0;

  for (const sourceId of ownFieldCardIds(state, playerId)) {
    const inst = state.cardsById[sourceId];
    if (!inst) continue;
    const program = registry[inst.cardDefinitionId];
    const ability = program?.abilities.find((a) => a.timing === 'onDonGiven');
    if (!ability) continue;

    // Self-only triggers only count when this card is the recipient.
    const selfOnly = ability.gate?.some((g) => g.kind === 'donGivenTargetIsSelf');
    if (selfOnly && sourceId !== targetInstanceId) continue;

    // Leader/character watcher: only when giving to own leader or character.
    const watchesAny = ability.gate?.some((g) => g.kind === 'donGivenTargetLeaderOrCharacter');
    if (watchesAny) {
      const target = state.cardsById[targetInstanceId];
      if (
        !target ||
        target.controllerId !== playerId ||
        (target.currentZone !== 'leaderArea' && target.currentZone !== 'characterArea')
      ) {
        continue;
      }
    }

    const profile = analyzeAbility(ability, true);
    total += profileScalar(profile) * 0.85 + scoreOpsRough(ability.ops) * 0.65 + 6;
  }

  return total;
}

export function analyzeDonAttachment(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  targetInstanceId: string,
): DonAttachmentAnalysis {
  const unlock = scoreDonConditionUnlock(state, defs, registry, targetInstanceId);
  const onDonGivenValue = scoreOnDonGivenTriggers(state, playerId, defs, registry, targetInstanceId);
  const inst = state.cardsById[targetInstanceId];
  const alreadyStacked = (inst?.donAttached.length ?? 0) >= 2;

  // Prefer spreading onto unlock targets; discourage stacking when nothing new unlocks.
  const preferSpreadOntoTarget = unlock.unlocks || (onDonGivenValue > 0 && !alreadyStacked);

  let scoreBonus =
    unlock.value * 0.9 * strategic.modeWeights.engine +
    onDonGivenValue * 0.75 * strategic.modeWeights.leaderSynergy;

  if (unlock.unlocks) scoreBonus += 16 + strategic.modeWeights.removal * 3;
  if (onDonGivenValue >= 8) scoreBonus += 10 * strategic.modeWeights.leaderSynergy;

  if (!unlock.unlocks && alreadyStacked && onDonGivenValue < 4) {
    scoreBonus -= 8; // dumping extra DON with no new unlock
  }

  // Leader that rewards attaching DON!! — slight bias toward any attach that fires watchers.
  if (strategic.leader.resourceEngine >= 8 && onDonGivenValue > 0) {
    scoreBonus += 4;
  }

  return {
    targetInstanceId,
    unlocksDonCondition: unlock.unlocks,
    unlockedAbilityValue: unlock.value,
    onDonGivenValue,
    preferSpreadOntoTarget,
    scoreBonus,
  };
}

export function scoreDonAttachmentRecipient(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry,
  strategic: StrategicContext,
  targetInstanceId: string,
): number {
  return analyzeDonAttachment(state, playerId, defs, registry, strategic, targetInstanceId).scoreBonus;
}
