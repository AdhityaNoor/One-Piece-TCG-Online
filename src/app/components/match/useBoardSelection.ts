/**
 * Layer 4 (interaction layer) for the hotseat board. Owns the local,
 * UI-only "what is the player in the middle of selecting" state machine for
 * every multi-tap action flow (pay a cost with N DON!!, give DON!!, declare
 * an attack, activate a Blocker, activate a Counter Character).
 *
 * Deliberately local React state, NOT a new global zustand store: this is a
 * single-screen concern, and every transition here is just a UX head start
 * for tapping through engine/actions/action.ts's GameAction shapes one field
 * at a time — `useMatchStore.dispatch()` (Layer 1/2) is the only thing that
 * actually decides legality. A mistaken tap here produces, at worst, a
 * rejected dispatch with reasons shown to the player; it can never corrupt
 * GameState (project rule: "the UI must never directly mutate game state").
 *
 * Tap-to-select is the ONLY interaction model implemented this milestone —
 * drag-and-drop is a documented known limitation (see MatchScreen.tsx).
 */
import { useEffect, useRef, useState } from 'react';
import { validateAction, type GameAction } from '../../../engine/actions';
import { createActionId, useMatchStore } from '../../store/matchStore';
import type { CardView, PlayerBoardView } from '../../../board/projection';
import { findFirstAvailableDonId } from '../../../board/projection';
import { computeCurrentCost, computeCurrentPower } from '../../../engine/rules/shared/power';
import { getOpponentId } from '../../../engine/rules/shared';
import { canPayAbilityCost, donMinusCandidateIds, evaluateGates, requiredDonMinusCount } from '../../../engine/effects';
import type { Ability } from '../../../engine/effects/effectIr';
import type { CardInstance } from '../../../engine/state/card';
import { isDonReturnChoice } from './donChoiceUtils';
import { EFFECT_RUNTIME_MODE } from '../../config/effectRuntimeMode';
import { evaluateCondition_V2 } from '../../../engine/effects_V2/conditions_V2';
import type { EffectAbility_V2 } from '../../../cards/effectCompiler_V2/effectIr_V2';

export type BoardZoneKind = 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea' | 'attachedDon' | 'trash';

export type BoardSelectionMode =
  | { kind: 'idle' }
  | { kind: 'confirmPlayCost'; handCardInstanceId: string; cardCategory: 'character' | 'stage' | 'event'; cardName: string; cost: number; donInstanceIds: string[]; abilityCostDonInstanceIds?: string[] }
  | { kind: 'selectAttacker' }
  | { kind: 'selectAttackTarget'; attackerInstanceId: string }
  | { kind: 'selectBlocker' }
  /**
   * Counter Step, defending player. Entered automatically the moment
   * battle.step becomes 'counter' (see the useEffect below) rather than via
   * an explicit "Activate Counter" button — every eligible hand card is
   * directly tappable, any number of times in a row (7-1-3-2-1 places no
   * cap on successive Counter activations), so the player can stack up
   * several counters before deciding to PASS_STEP. Character counters
   * always boost the card currently under attack (battle.targetInstanceId)
   * — boosting a DIFFERENT own Leader/Character is technically legal per
   * 7-1-3-2-1 but is a rare enough tech play that it's out of scope for
   * this streamlined flow (documented limitation). Counter Events have
   * their normal play-cost DON!! auto-selected; DON!! -N ability costs enter
   * an explicit field-DON selection mode.
   */
  | { kind: 'selectCounterCard' }
  | { kind: 'payingCounterEventCost'; handCardInstanceId: string; cardName: string; cost: number; donInstanceIds: string[]; abilityCost: number; candidateInstanceIds: string[]; selectedDonIds: string[] }
  /**
   * A donMinus ability cost is asking which DON!! on the field to return to
   * the DON!! deck (see interpreter.ts's suspendOrPayAbilityCost — it always
   * raises this as a pending choice rather than auto-picking, so the player
   * chooses). Auto-entered the instant such a choice appears (see the
   * useEffect below), same pattern as 'selectCounterCard'. DON!! tokens have
   * no distinguishing art, so this is resolved by tapping the actual DON!!
   * on the field (a Cost Area chip, or one in a hovered/revealed
   * Leader/Character's attached-DON!! stack — see AttachedDonHoverStack)
   * rather than the generic card-gallery pending-choice modal.
   */
  | { kind: 'resolvingDonChoice'; choiceId: string; prompt: string; min: number; max: number; candidateInstanceIds: string[]; selectedDonIds: string[] }
  | { kind: 'selectActivateSource' }
  | { kind: 'payingActivateEffectCost'; sourceInstanceId: string; cost: number; selectedDonIds: string[] }
  | { kind: 'payingEventMainCost'; handCardInstanceId: string; cardName: string; cost: number; donInstanceIds: string[]; abilityCost: number; candidateInstanceIds: string[]; selectedDonIds: string[] }
  | { kind: 'selectOnOppAttackSource' }
  | { kind: 'payingOnOppAttackCost'; sourceInstanceId: string; cost: number; selectedDonIds: string[] };

const PLAY_ACTION_BY_CATEGORY: Record<'character' | 'stage' | 'event', GameAction['type']> = {
  character: 'PLAY_CHARACTER',
  stage: 'PLAY_STAGE',
  event: 'ACTIVATE_EVENT_MAIN',
};

function abilityConditionMet(ability: Ability, source: CardInstance, sourceInstanceId: string, state: NonNullable<ReturnType<typeof useMatchStore.getState>['state']>, defs: ReturnType<typeof useMatchStore.getState>['defs']): boolean {
  const condition = ability.condition;
  if (!condition) return true;
  if (condition.donAttachedAtLeast !== undefined && source.donAttached.length < condition.donAttachedAtLeast) return false;
  if (condition.turn !== undefined) {
    const isOwnersTurn = state.activePlayerId === source.ownerId;
    if (condition.turn === 'your' && !isOwnersTurn) return false;
    if (condition.turn === 'opponent' && isOwnersTurn) return false;
  }
  if (condition.gate && !evaluateGates(condition.gate, state, defs, source.controllerId, sourceInstanceId)) return false;
  return true;
}

function v2StandardAbility(cardNumber: string, timing: 'ACTIVATE_MAIN' | 'EVENT_MAIN' | 'EVENT_COUNTER' | 'ON_OPPONENT_ATTACK') {
  const runtime = useMatchStore.getState().v2EffectRuntime;
  if (EFFECT_RUNTIME_MODE !== 'v2' || !runtime) return undefined;
  return runtime.programsByCardNumber[cardNumber]?.abilities.find((ability) =>
    ability.timing.kind === 'STANDARD_TIMING' && ability.timing.timing === timing
  );
}

function v2DonSelectionCostCount(cardNumber: string, timing: 'ACTIVATE_MAIN' | 'EVENT_MAIN' | 'EVENT_COUNTER' | 'ON_OPPONENT_ATTACK'): number {
  const ability = v2StandardAbility(cardNumber, timing);
  return ability?.activationCost?.payments
    .filter((cost) => cost.type === 'DON_MINUS_COST' || cost.type === 'REST_DON_COST')
    .reduce((sum, cost) => sum + (cost.count.kind === 'NUMBER' ? cost.count.value : 0), 0) ?? 0;
}

export function useBoardSelection(actingPlayerId: string | null) {
  const dispatch = useMatchStore((s) => s.dispatch);
  const state = useMatchStore((s) => s.state);
  const localPlayerId = useMatchStore((s) => s.localPlayerId);
  const defs = useMatchStore((s) => s.defs);
  const registry = useMatchStore((s) => s.registry);
  const v2EffectRuntime = useMatchStore((s) => s.v2EffectRuntime);
  const [mode, setMode] = useState<BoardSelectionMode>({ kind: 'idle' });
  const [lastError, setLastError] = useState<string[] | null>(null);

  const reset = (): void => setMode({ kind: 'idle' });

  const v2AbilityConditionsMet = (ability: EffectAbility_V2, sourceInstanceId: string, controllerId: string): boolean => {
    if (!state || !ability.gates?.length || !v2EffectRuntime) return true;
    const ctx = {
      state,
      defs,
      sourceInstanceId,
      controllerId,
      runtime: v2EffectRuntime,
      currentTiming: ability.timing,
      bindings: { selectedObjects: {}, actionResults: {} },
    };
    return ability.gates.every((gate) => {
      if (gate.kind === 'CANONICAL_GATE_REF') return false;
      const result = evaluateCondition_V2(ctx, gate);
      return result.value && result.unsupportedReasons.length === 0;
    });
  };

  // Auto-enter the Counter Step's multi-select mode the instant the battle
  // reaches it — no "Activate Counter" button to click through first (see
  // BoardSelectionMode's 'selectCounterCard' doc comment). Only fires from
  // 'idle' so it never clobbers an unrelated in-progress selection.
  useEffect(() => {
    if (state?.currentBattle?.step === 'counter' && mode.kind === 'idle') {
      setMode({ kind: 'selectCounterCard' });
    }
  }, [state?.currentBattle?.step, mode.kind]);

  // Auto-enter (and auto-exit) 'resolvingDonChoice' the instant a donMinus
  // pending choice belonging to this player appears/resolves — takes
  // priority over whatever mode the UI was previously in (a pendingChoice
  // means the last action already suspended; nothing else is actionable
  // until it resolves, so overriding is always correct here, unlike the
  // idle-only guard above for the Counter Step).
  useEffect(() => {
    const choice = state?.pendingChoices[0];
    const isDonChoice = !!state && !!choice && choice.playerId === actingPlayerId && isDonReturnChoice(state, defs, choice);
    if (isDonChoice && choice && mode.kind !== 'resolvingDonChoice') {
      setMode({
        kind: 'resolvingDonChoice',
        choiceId: choice.id,
        prompt: choice.prompt,
        min: choice.constraints.min,
        max: choice.constraints.max,
        candidateInstanceIds: choice.constraints.candidateInstanceIds ?? [],
        selectedDonIds: [],
      });
    } else if (!isDonChoice && mode.kind === 'resolvingDonChoice') {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.pendingChoices, actingPlayerId, defs]);

  /** True if the card's curated program exposes an [Activate: Main] ability (8-1-3-2). */
  const hasActivateMain = (card: CardView): boolean => {
    if (!state) return false;
    if (!actingPlayerId) return false;
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const ability = v2EffectRuntime?.programsByCardNumber[card.cardNumber]?.abilities.find((entry) =>
        entry.timing.kind === 'STANDARD_TIMING' && entry.timing.timing === 'ACTIVATE_MAIN'
      );
      if (!ability) return false;
      const inst = state.cardsById[card.instanceId];
      if (!inst || inst.controllerId !== actingPlayerId) return false;
      if (state.currentPhase !== 'main' || actingPlayerId !== state.activePlayerId) return false;
      if (ability.oncePerTurn && inst.oncePerTurnUsed.includes(ability.abilityId)) return false;
      if (!v2AbilityConditionsMet(ability, card.instanceId, actingPlayerId)) return false;
      return true;
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'activateMain');
    if (!ability) return false;
    const inst = state.cardsById[card.instanceId];
    if (!inst || inst.controllerId !== actingPlayerId) return false;
    if (state.currentPhase !== 'main' || actingPlayerId !== state.activePlayerId) return false;
    if (ability.oncePerTurn && card.oncePerTurnUsed.includes('activateMain')) return false;
    if (ability.gate?.length && !evaluateGates(ability.gate, state, defs, actingPlayerId, card.instanceId)) return false;
    if (!abilityConditionMet(ability, inst, card.instanceId, state, defs)) return false;
    if (ability.cost?.length) {
      const requiredDon = requiredDonMinusCount(ability.cost);
      const selectedDon = requiredDon > 0 ? donMinusCandidateIds(state, actingPlayerId, ability.cost).slice(0, requiredDon) : [];
      return canPayAbilityCost(state, card.instanceId, actingPlayerId, ability.cost, selectedDon).length === 0;
    }
    return validateAction(
      state,
      {
        type: 'ACTIVATE_CARD_EFFECT',
        actionId: 'ui-preview',
        playerId: actingPlayerId,
        sourceInstanceId: card.instanceId,
        effectId: 'activateMain',
        donInstanceIds: [],
      },
      defs,
      registry,
    ).legal;
  };

  const hasUnusedActivateMain = (card: CardView): boolean => {
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const ability = v2EffectRuntime?.programsByCardNumber[card.cardNumber]?.abilities.find((entry) =>
        entry.timing.kind === 'STANDARD_TIMING' && entry.timing.timing === 'ACTIVATE_MAIN'
      );
      if (!ability) return false;
      return !ability.oncePerTurn || !card.oncePerTurnUsed.includes(ability.abilityId);
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'activateMain');
    if (!ability) return false;
    return !ability.oncePerTurn || !card.oncePerTurnUsed.includes('activateMain');
  };

  /** True if the card's curated program exposes a [Counter] ability (7-1-3). */
  const hasCounter = (card: CardView): boolean =>
    EFFECT_RUNTIME_MODE === 'v2'
      ? !!v2StandardAbility(card.cardNumber, 'EVENT_COUNTER')
      : !!registry[card.cardDefinitionId]?.abilities.some((ability) => ability.timing === 'counter');

  const activateMainDonSelectionCost = (card: CardView): number => {
    if (EFFECT_RUNTIME_MODE === 'v2') return v2DonSelectionCostCount(card.cardNumber, 'ACTIVATE_MAIN');
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'activateMain');
    return ability?.cost
      ?.filter((cost) => cost.kind === 'donMinus')
      .reduce((sum, cost) => sum + cost.count, 0) ?? 0;
  };

  /** True if the card's curated program exposes an [On Your Opponent's Attack] ability usable now
   *  (7-1-2 Block-Step window, defending player only). */
  const hasOnOpponentsAttack = (card: CardView): boolean => {
    if (!state || !actingPlayerId) return false;
    const battle = state.currentBattle;
    if (!battle || battle.step !== 'block') return false;
    if (actingPlayerId === state.activePlayerId) return false; // defender only
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const ability = v2StandardAbility(card.cardNumber, 'ON_OPPONENT_ATTACK');
      if (!ability) return false;
      const inst = state.cardsById[card.instanceId];
      if (!inst || inst.controllerId !== actingPlayerId || (inst.currentZone !== 'leaderArea' && inst.currentZone !== 'characterArea' && inst.currentZone !== 'stageArea')) return false;
      if (ability.oncePerTurn && inst.oncePerTurnUsed.includes(ability.abilityId)) return false;
      if (!v2AbilityConditionsMet(ability, card.instanceId, actingPlayerId)) return false;
      if (battle.onOpponentsAttackUsedInstanceIds?.includes(card.instanceId)) return false;
      return true;
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'onOpponentsAttack');
    if (!ability) return false;
    const inst = state.cardsById[card.instanceId];
    if (!inst || inst.controllerId !== actingPlayerId || (inst.currentZone !== 'leaderArea' && inst.currentZone !== 'characterArea' && inst.currentZone !== 'stageArea')) return false;
    if (ability.oncePerTurn && card.oncePerTurnUsed.includes('onOpponentsAttack')) return false;
    if (ability.gate?.length && !evaluateGates(ability.gate, state, defs, actingPlayerId, card.instanceId)) return false;
    if (!abilityConditionMet(ability, inst, card.instanceId, state, defs)) return false;
    if (ability.cost?.length) {
      const requiredDon = requiredDonMinusCount(ability.cost);
      const selectedDon = requiredDon > 0 ? donMinusCandidateIds(state, actingPlayerId, ability.cost).slice(0, requiredDon) : [];
      return canPayAbilityCost(state, card.instanceId, actingPlayerId, ability.cost, selectedDon).length === 0;
    }
    return validateAction(
      state,
      { type: 'ACTIVATE_ON_OPPONENTS_ATTACK', actionId: 'ui-preview', playerId: actingPlayerId, sourceInstanceId: card.instanceId, effectId: 'onOpponentsAttack', donInstanceIds: [] },
      defs,
      registry,
    ).legal;
  };

  const onOppAttackDonSelectionCost = (card: CardView): number => {
    if (EFFECT_RUNTIME_MODE === 'v2') return v2DonSelectionCostCount(card.cardNumber, 'ON_OPPONENT_ATTACK');
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'onOpponentsAttack');
    return ability?.cost
      ?.filter((cost) => cost.kind === 'donMinus')
      .reduce((sum, cost) => sum + cost.count, 0) ?? 0;
  };

  const canDeclareAttackWith = (card: CardView): boolean => {
    if (!state || state.currentPhase !== 'main' || state.turnNumber <= 2) return false;
    if (card.category !== 'leader' && card.category !== 'character') return false;
    if (!actingPlayerId) return false;
    const opponentId = getOpponentId(state, actingPlayerId);
    return validateAction(
      state,
      {
        type: 'DECLARE_ATTACK',
        actionId: 'ui-preview',
        playerId: actingPlayerId,
        attackerInstanceId: card.instanceId,
        targetInstanceId: state.players[opponentId]?.leaderInstanceId ?? '',
      },
      defs,
      registry,
    ).legal;
  };

  const currentCostOf = (card: CardView): number => {
    if (!state) return card.cost ?? 0;
    return computeCurrentCost(defs, state, card.instanceId);
  };

  const activeCostAreaDonIds = (playerId: string): string[] => {
    if (!state) return [];
    const player = state.players[playerId];
    if (!player) return [];
    return player.costArea.cardIds.filter((id) => {
      const instance = state.cardsById[id];
      return instance?.ownerId === playerId && instance.currentZone === 'costArea' && instance.donRested === false;
    });
  };

  // --- Counter Step (7-1-3) — multi-select, see BoardSelectionMode's
  // 'selectCounterCard' doc comment above for the overall UX. ---

  const mainEventDonInfo = (card: CardView): { cost: number; donMinus: number; available: number } | null => {
    if (!state || !actingPlayerId) return null;
    if (card.category !== 'event') return null;
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const ability = v2StandardAbility(card.cardNumber, 'EVENT_MAIN');
      if (!ability) return null;
      const cost = currentCostOf(card);
      const playCostDon = new Set(activeCostAreaDonIds(actingPlayerId).slice(0, cost));
      const donMinus = v2DonSelectionCostCount(card.cardNumber, 'EVENT_MAIN');
      return { cost, donMinus, available: activeCostAreaDonIds(actingPlayerId).length - playCostDon.size + playCostDon.size };
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'activateMain');
    if (!ability) return null;
    const cost = currentCostOf(card);
    const abilityCosts = ability.cost ?? [];
    const playCostDon = new Set(activeCostAreaDonIds(actingPlayerId).slice(0, cost));
    const abilityCostDon = donMinusCandidateIds(state, actingPlayerId, abilityCosts).filter((id) => !playCostDon.has(id));
    return {
      cost,
      donMinus: requiredDonMinusCount(abilityCosts),
      available: playCostDon.size + abilityCostDon.length,
    };
  };

  const mainEventDonPayment = (card: CardView): { donInstanceIds: string[]; abilityCost: number; candidateInstanceIds: string[] } | null => {
    if (!state || !actingPlayerId) return null;
    const info = mainEventDonInfo(card);
    if (!info) return null;
    const donInstanceIds = activeCostAreaDonIds(actingPlayerId).slice(0, info.cost);
    if (donInstanceIds.length < info.cost) return null;
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const requiredDon = v2DonSelectionCostCount(card.cardNumber, 'EVENT_MAIN');
      const candidateInstanceIds = activeCostAreaDonIds(actingPlayerId).filter((id) => !new Set(donInstanceIds).has(id));
      if (candidateInstanceIds.length < requiredDon) return null;
      return { donInstanceIds, abilityCost: requiredDon, candidateInstanceIds };
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'activateMain');
    if (!ability) return null;
    const abilityCosts = ability.cost ?? [];
    const requiredDon = requiredDonMinusCount(abilityCosts);
    const playCostDon = new Set(donInstanceIds);
    const candidateInstanceIds = requiredDon > 0
      ? donMinusCandidateIds(state, actingPlayerId, abilityCosts).filter((id) => !playCostDon.has(id))
      : [];
    if (candidateInstanceIds.length < requiredDon) return null;
    return { donInstanceIds, abilityCost: requiredDon, candidateInstanceIds };
  };

  /**
   * A Counter Event's DON!! picture: its own play cost (base cost, from
   * currentCostOf) plus any curated [Counter] ability DON!! -N cost
   * ("returned to the DON!! deck", tracked separately — see AbilityCost's
   * 'donMinus' kind), against how much active DON!! the player currently
   * has. Returns null for non-Counter-Event cards.
   */
  const counterEventDonInfo = (card: CardView): { cost: number; donMinus: number; available: number } | null => {
    if (!state || !actingPlayerId) return null;
    if (card.category !== 'event' || !hasCounter(card)) return null;
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const ability = v2StandardAbility(card.cardNumber, 'EVENT_COUNTER');
      if (!ability) return null;
      const cost = currentCostOf(card);
      const playCostDon = new Set(activeCostAreaDonIds(actingPlayerId).slice(0, cost));
      const donMinus = v2DonSelectionCostCount(card.cardNumber, 'EVENT_COUNTER');
      return { cost, donMinus, available: activeCostAreaDonIds(actingPlayerId).length - playCostDon.size + playCostDon.size };
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'counter');
    if (!ability) return null;
    const cost = currentCostOf(card);
    const abilityCosts = ability.cost ?? [];
    const playCostDon = new Set(activeCostAreaDonIds(actingPlayerId).slice(0, cost));
    const abilityCostDon = donMinusCandidateIds(state, actingPlayerId, abilityCosts).filter((id) => !playCostDon.has(id));
    return {
      cost,
      donMinus: requiredDonMinusCount(abilityCosts),
      available: playCostDon.size + abilityCostDon.length,
    };
  };

  /**
   * Auto-picks active cost-area DON!! for a Counter Event's base cost and,
   * if present, its [Counter] ability's DON!! -N cost — mirrors how
   * playHandCard already auto-selects rather than making the player click
   * individual DON!! cards. Both pools are drawn from the same active
   * cost-area DON!!; a 'donMinus' cost that specifically returns DON!!
   * attached elsewhere on the field (activeOnly: false) is a rarer curated
   * shape not covered by this auto-pick (documented limitation — such a
   * card is treated as inapplicable/dimmed here rather than silently
   * picking the wrong DON!!). Returns null if there isn't enough.
   */
  const counterEventDonPayment = (card: CardView): { donInstanceIds: string[]; abilityCost: number; candidateInstanceIds: string[] } | null => {
    if (!state || !actingPlayerId) return null;
    const info = counterEventDonInfo(card);
    if (!info) return null;
    const donInstanceIds = activeCostAreaDonIds(actingPlayerId).slice(0, info.cost);
    if (donInstanceIds.length < info.cost) return null;
    if (EFFECT_RUNTIME_MODE === 'v2') {
      const requiredDon = v2DonSelectionCostCount(card.cardNumber, 'EVENT_COUNTER');
      const candidateInstanceIds = activeCostAreaDonIds(actingPlayerId).filter((id) => !new Set(donInstanceIds).has(id));
      if (candidateInstanceIds.length < requiredDon) return null;
      return { donInstanceIds, abilityCost: requiredDon, candidateInstanceIds };
    }
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'counter');
    if (!ability) return null;
    const abilityCosts = ability.cost ?? [];
    const requiredDon = requiredDonMinusCount(abilityCosts);
    const playCostDon = new Set(donInstanceIds);
    const candidateInstanceIds = requiredDon > 0
      ? donMinusCandidateIds(state, actingPlayerId, abilityCosts).filter((id) => !playCostDon.has(id))
      : [];
    if (candidateInstanceIds.length < requiredDon) return null;
    return { donInstanceIds, abilityCost: requiredDon, candidateInstanceIds };
  };

  /**
   * True if the card is a usable Counter option right now — a Character
   * with a printed Counter value, or a [Counter] Event the player can
   * currently afford (base cost + any DON!! -N ability cost). Drives both
   * DockHand's `selectable` gate and its dimmed styling for cards that
   * aren't Counter options at all (project rule: dim, don't hide).
   */
  const isCounterCardApplicable = (card: CardView): boolean => {
    if (!state || !actingPlayerId || state.currentBattle?.step !== 'counter') return false;
    if (card.category === 'character') return !!card.counter && card.counter > 0;
    if (card.category === 'event' && hasCounter(card)) return counterEventDonPayment(card) !== null;
    return false;
  };

  // Snapshot of attacker/target power the instant the Counter Step began,
  // so the running total shown in the UI ("3000/5000") reflects counters
  // added THIS step, not the target's full power. Recomputed only when the
  // battle identity changes (new attacker/target pair) — mutating a ref
  // during render is safe here since the recomputation is idempotent for a
  // given battleKey (same inputs -> same outputs every time).
  const counterBaselineRef = useRef<{ battleKey: string; attackerPower: number; targetPowerAtStart: number } | null>(null);
  if (state?.currentBattle?.step === 'counter') {
    const battle = state.currentBattle;
    const battleKey = `${battle.attackerInstanceId}:${battle.targetInstanceId}`;
    if (counterBaselineRef.current?.battleKey !== battleKey) {
      counterBaselineRef.current = {
        battleKey,
        attackerPower: computeCurrentPower(defs, state, battle.attackerInstanceId),
        targetPowerAtStart: computeCurrentPower(defs, state, battle.targetInstanceId),
      };
    }
  } else {
    counterBaselineRef.current = null;
  }

  /**
   * `needed` (7-1-4): how much MORE power the defender needs, on top of
   * their power when the Counter Step began, to survive — the Damage Step
   * deals damage when attackerPower >= targetPower, so surviving requires
   * targetPower > attackerPower, i.e. strictly more than (attackerPower -
   * startPower) more. That raw threshold is only ever 1 power short of a
   * clean multiple of 1000 (attacker/target power, and every real Counter
   * value, are always multiples of 1000 — 3-2-2), so showing it as-is read
   * as "1 needed" when the true gap was a full 1000, or "1001" when it was
   * really 2000 (the next Counter value that actually clears the raw
   * threshold) — rounding up to the nearest 1000 shows the smallest
   * genuinely achievable target instead of a threshold no real counter can
   * land on exactly. `selected` is how much has already been added this
   * step (the live delta since the snapshot above) — together these render
   * as the "3000/5000" progress readout.
   */
  const counterProgress: { selected: number; needed: number } | null = (() => {
    if (!state || !counterBaselineRef.current || state.currentBattle?.step !== 'counter') return null;
    const baseline = counterBaselineRef.current;
    const targetPowerNow = computeCurrentPower(defs, state, state.currentBattle.targetInstanceId);
    const rawNeeded = Math.max(0, baseline.attackerPower - baseline.targetPowerAtStart + 1);
    return {
      selected: Math.max(0, targetPowerNow - baseline.targetPowerAtStart),
      needed: Math.ceil(rawNeeded / 1000) * 1000,
    };
  })();

  function runDispatch(action: GameAction): void {
    const result = dispatch(action);
    if (!result.ok) {
      setLastError(result.reasons);
    } else {
      setLastError(null);
      reset();
    }
  }

  /**
   * Like runDispatch, but for Counter Step actions specifically: on success,
   * stays in 'selectCounterCard' (instead of resetting to 'idle') as long as
   * the battle is still in the Counter Step and nothing else needs the
   * player's attention — so tapping one counter card leaves the rest of the
   * hand immediately tappable for the next one, satisfying "select several
   * before passing" without a re-click through an "Activate Counter" button.
   * Reads the store directly (not the `state` closed over by this render)
   * because dispatch() already applied the mutation synchronously.
   */
  function runCounterDispatch(action: GameAction): void {
    const result = dispatch(action);
    if (!result.ok) {
      setLastError(result.reasons);
      return;
    }
    setLastError(null);
    const latest = useMatchStore.getState().state;
    if (latest?.currentBattle?.step === 'counter' && latest.pendingChoices.length === 0) {
      setMode({ kind: 'selectCounterCard' });
    } else {
      reset();
    }
  }

  // --- Donmax choice (interpreter-suspended donMinus ability cost) ---

  /** True if `instanceId` is one of the current donMinus choice's candidates — gates both Cost Area chip taps and attached-DON!! stack taps. */
  const isDonChoiceCandidate = (instanceId: string): boolean =>
    mode.kind === 'resolvingDonChoice' && mode.candidateInstanceIds.includes(instanceId);

  /** `{selected, min, max, prompt}` for ActionBar's progress banner, or null outside this mode. */
  const donChoiceProgress: { selected: number; min: number; max: number; prompt: string } | null =
    mode.kind === 'resolvingDonChoice'
      ? { selected: mode.selectedDonIds.length, min: mode.min, max: mode.max, prompt: mode.prompt }
      : null;

  function submitDonChoice(response: string[]): void {
    if (mode.kind !== 'resolvingDonChoice' || !actingPlayerId) return;
    const result = dispatch({ type: 'RESOLVE_PENDING_CHOICE', actionId: createActionId(), playerId: actingPlayerId, choiceId: mode.choiceId, response });
    if (!result.ok) {
      // Keep the in-progress selection so the player can adjust rather than
      // losing their picks on a rejected response (shouldn't normally
      // happen — the candidate/min/max gating already mirrors the engine's
      // own validation — but a stale choiceId from a fast double-tap is
      // possible).
      setLastError(result.reasons);
      return;
    }
    setLastError(null);
    reset(); // the pendingChoice effect above re-enters if another donMinus choice is queued next
  }

  /** Tap a DON!! card (Cost Area or attached) while resolving a donMinus choice. Auto-submits the instant `max` is reached. */
  function toggleDonChoiceCard(instanceId: string): void {
    if (mode.kind !== 'resolvingDonChoice' || !mode.candidateInstanceIds.includes(instanceId)) return;
    if (mode.selectedDonIds.includes(instanceId)) {
      setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => id !== instanceId) });
      return;
    }
    if (mode.selectedDonIds.length >= mode.max) return;
    const next = [...mode.selectedDonIds, instanceId];
    if (next.length === mode.max) {
      submitDonChoice(next);
    } else {
      setMode({ ...mode, selectedDonIds: next });
    }
  }

  /** Manual confirm for "select at least min, up to max" donMinus choices where the player wants to stop before reaching max. */
  function confirmDonChoice(): void {
    if (mode.kind !== 'resolvingDonChoice' || mode.selectedDonIds.length < mode.min) return;
    submitDonChoice(mode.selectedDonIds);
  }

  function withActingPlayer(build: (playerId: string) => GameAction): void {
    if (!actingPlayerId) return;
    runDispatch(build(actingPlayerId));
  }

  function playHandCard(card: CardView): void {
    if (!actingPlayerId || !state || mode.kind !== 'idle') return;
    if (card.category !== 'character' && card.category !== 'stage' && card.category !== 'event') return;
    const instance = state.cardsById[card.instanceId];
    if (!instance || instance.ownerId !== actingPlayerId || instance.currentZone !== 'hand') return;

    const cost = currentCostOf(card);
    const eventPayment = card.category === 'event' ? mainEventDonPayment(card) : null;
    const donInstanceIds = eventPayment?.donInstanceIds ?? activeCostAreaDonIds(actingPlayerId).slice(0, cost);
    if (donInstanceIds.length < cost) {
      setLastError([`${card.name} costs ${cost} DON!!, but only ${donInstanceIds.length} active DON!! are available.`]);
      return;
    }
    if (card.category === 'event' && !eventPayment) {
      const info = mainEventDonInfo(card);
      if (info) {
        const required = info.cost + info.donMinus;
        setLastError([`${card.name} requires ${required} usable DON!! for its play cost and DON!! -N ability cost, but only ${info.available} are available.`]);
        return;
      }
    }

    if (card.category === 'event' && eventPayment && eventPayment.abilityCost > 0) {
      setMode({
        kind: 'payingEventMainCost',
        handCardInstanceId: card.instanceId,
        cardName: card.name,
        cost,
        donInstanceIds: eventPayment.donInstanceIds,
        abilityCost: eventPayment.abilityCost,
        candidateInstanceIds: eventPayment.candidateInstanceIds,
        selectedDonIds: [],
      });
      setLastError(null);
      return;
    }

    if (cost === 0) {
      runDispatch({
        type: PLAY_ACTION_BY_CATEGORY[card.category],
        actionId: createActionId(),
        playerId: actingPlayerId,
        handCardInstanceId: card.instanceId,
        donInstanceIds: [],
      } as GameAction);
      return;
    }

    setMode({ kind: 'confirmPlayCost', handCardInstanceId: card.instanceId, cardCategory: card.category, cardName: card.name, cost, donInstanceIds });
    setLastError(null);
  }

  function canPlayHandCard(card: CardView): boolean {
    if (!actingPlayerId || !state || mode.kind !== 'idle') return false;
    if (card.category !== 'character' && card.category !== 'stage' && card.category !== 'event') return false;
    const instance = state.cardsById[card.instanceId];
    if (!instance || instance.ownerId !== actingPlayerId || instance.currentZone !== 'hand') return false;

    const cost = currentCostOf(card);
    const eventPayment = card.category === 'event' ? mainEventDonPayment(card) : null;
    const donInstanceIds = eventPayment?.donInstanceIds ?? activeCostAreaDonIds(actingPlayerId).slice(0, cost);
    if (donInstanceIds.length < cost) return false;
    if (card.category === 'event' && !eventPayment) return false;
    const previewAbilityCostDon = eventPayment?.candidateInstanceIds.slice(0, eventPayment.abilityCost) ?? [];

    return validateAction(
      state,
      {
        type: PLAY_ACTION_BY_CATEGORY[card.category],
        actionId: 'ui-preview',
        playerId: actingPlayerId,
        handCardInstanceId: card.instanceId,
        donInstanceIds,
        ...(card.category === 'event' ? { abilityCostDonInstanceIds: previewAbilityCostDon } : {}),
      } as GameAction,
      defs,
      registry,
    ).legal;
  }

  // --- Mode entry points, called from ActionBar's mode-switch buttons ---
  const beginDeclareAttack = (): void => { setMode({ kind: 'selectAttacker' }); setLastError(null); };
  const beginActivateBlocker = (): void => { setMode({ kind: 'selectBlocker' }); setLastError(null); };
  const beginActivateMain = (): void => { setMode({ kind: 'selectActivateSource' }); setLastError(null); };
  const cancel = (): void => { reset(); setLastError(null); };

  // --- Confirm steps for flows that collect a cost before dispatching ---
  function confirmPlayCard(): void {
    if (mode.kind !== 'confirmPlayCost' || mode.donInstanceIds.length !== mode.cost) return;
    withActingPlayer((playerId) => ({
      type: PLAY_ACTION_BY_CATEGORY[mode.cardCategory],
      actionId: createActionId(),
      playerId,
      handCardInstanceId: mode.handCardInstanceId,
      donInstanceIds: mode.donInstanceIds,
    }) as GameAction);
  }

  function confirmEventMainCost(): void {
    if (mode.kind !== 'payingEventMainCost' || mode.selectedDonIds.length !== mode.abilityCost) return;
    withActingPlayer((playerId) => ({
      type: 'ACTIVATE_EVENT_MAIN',
      actionId: createActionId(),
      playerId,
      handCardInstanceId: mode.handCardInstanceId,
      donInstanceIds: mode.donInstanceIds,
      abilityCostDonInstanceIds: mode.selectedDonIds,
    }));
  }

  function confirmCounterEventCost(): void {
    if (mode.kind !== 'payingCounterEventCost' || mode.selectedDonIds.length !== mode.abilityCost || !actingPlayerId) return;
    runCounterDispatch({
      type: 'ACTIVATE_COUNTER_EVENT',
      actionId: createActionId(),
      playerId: actingPlayerId,
      handCardInstanceId: mode.handCardInstanceId,
      donInstanceIds: mode.donInstanceIds,
      abilityCostDonInstanceIds: mode.selectedDonIds,
    });
  }

  /** Confirm an [Activate: Main] effect after selecting its DON!! -N payment. */
  function confirmActivateMainCost(): void {
    if (mode.kind !== 'payingActivateEffectCost' || mode.selectedDonIds.length !== mode.cost) return;
    withActingPlayer((playerId) => ({
      type: 'ACTIVATE_CARD_EFFECT',
      actionId: createActionId(),
      playerId,
      sourceInstanceId: mode.sourceInstanceId,
      effectId: 'activateMain',
      donInstanceIds: mode.selectedDonIds,
    }));
  }

  function activateMainFromCard(card: CardView): void {
    const donMinusCost = activateMainDonSelectionCost(card);
    if (donMinusCost > 0) {
      setMode({ kind: 'payingActivateEffectCost', sourceInstanceId: card.instanceId, cost: donMinusCost, selectedDonIds: [] });
      setLastError(null);
      return;
    }
    withActingPlayer((playerId) => ({
      type: 'ACTIVATE_CARD_EFFECT',
      actionId: createActionId(),
      playerId,
      sourceInstanceId: card.instanceId,
      effectId: 'activateMain',
      donInstanceIds: [],
    }));
  }

  const beginActivateOnOppAttack = (): void => { setMode({ kind: 'selectOnOppAttackSource' }); setLastError(null); };

  function activateOnOppAttackFromCard(card: CardView): void {
    const donMinusCost = onOppAttackDonSelectionCost(card);
    if (donMinusCost > 0) {
      setMode({ kind: 'payingOnOppAttackCost', sourceInstanceId: card.instanceId, cost: donMinusCost, selectedDonIds: [] });
      setLastError(null);
      return;
    }
    withActingPlayer((playerId) => ({
      type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
      actionId: createActionId(),
      playerId,
      sourceInstanceId: card.instanceId,
      effectId: 'onOpponentsAttack',
      donInstanceIds: [],
    }));
  }

  function confirmOnOppAttackCost(): void {
    if (mode.kind !== 'payingOnOppAttackCost' || mode.selectedDonIds.length !== mode.cost) return;
    withActingPlayer((playerId) => ({
      type: 'ACTIVATE_ON_OPPONENTS_ATTACK',
      actionId: createActionId(),
      playerId,
      sourceInstanceId: mode.sourceInstanceId,
      effectId: 'onOpponentsAttack',
      donInstanceIds: mode.selectedDonIds,
    }));
  }

  function beginAttackWithCard(card: CardView): void {
    if (!canDeclareAttackWith(card)) return;
    setMode({ kind: 'selectAttackTarget', attackerInstanceId: card.instanceId });
    setLastError(null);
  }

  // --- Step-less actions ---
  const passStep = (): void => withActingPlayer((playerId) => ({ type: 'PASS_STEP', actionId: createActionId(), playerId }));
  const endMainPhase = (): void => withActingPlayer((playerId) => ({ type: 'END_MAIN_PHASE', actionId: createActionId(), playerId }));
  const concede = (): void => withActingPlayer((playerId) => ({ type: 'CONCEDE', actionId: createActionId(), playerId }));

  /** True when the card hover Give DON stepper should appear (Main Phase, idle, own Leader/Character). */
  const canGiveDonOnCard = (board: PlayerBoardView, card: CardView): boolean => {
    if (!state || !actingPlayerId || mode.kind !== 'idle') return false;
    if (state.currentPhase !== 'main' || actingPlayerId !== state.activePlayerId) return false;
    if (board.playerId !== actingPlayerId) return false;
    if (card.category !== 'leader' && card.category !== 'character') return false;
    const canReturn = localPlayerId === null && card.donAttachedCount > 0;
    return findFirstAvailableDonId(board) !== null || canReturn;
  };

  function giveDonToCard(board: PlayerBoardView, card: CardView): void {
    if (!actingPlayerId || !state) return;
    const donInstanceId = findFirstAvailableDonId(board);
    if (!donInstanceId) return;
    runDispatch({
      type: 'GIVE_DON',
      actionId: createActionId(),
      playerId: actingPlayerId,
      donInstanceId,
      targetInstanceId: card.instanceId,
    });
  }

  function returnGivenDonFromCard(card: CardView): void {
    if (localPlayerId !== null) return;
    if (!actingPlayerId) return;
    const donInstanceId = card.donAttachedIds[card.donAttachedIds.length - 1];
    if (!donInstanceId) return;
    runDispatch({
      type: 'RETURN_GIVEN_DON',
      actionId: createActionId(),
      playerId: actingPlayerId,
      donInstanceId,
      targetInstanceId: card.instanceId,
    });
  }

  /** The single router every PlayerBoardPanel card tap calls into. ownerPlayerId is whose panel the tapped card lives in (not necessarily the acting player). */
  function handleCardTap(ownerPlayerId: string, zone: BoardZoneKind, card: CardView): void {
    if (!actingPlayerId) return;
    const isOwnCard = ownerPlayerId === actingPlayerId;

    switch (mode.kind) {
      case 'idle': {
        // Direct [Activate: Main] from the board: tap an own in-play card that
        // has a curated activate ability (the ⚡ badge). The engine validates
        // phase/once-per-turn/cost; any target it needs becomes a PendingChoice.
        if (isOwnCard && (zone === 'leaderArea' || zone === 'characterArea' || zone === 'stageArea') && hasActivateMain(card)) {
          activateMainFromCard(card);
          return;
        }
        if (!isOwnCard || zone !== 'hand') return;
        if (card.category !== 'character' && card.category !== 'stage' && card.category !== 'event') return;
        const cost = currentCostOf(card);
        const eventPayment = card.category === 'event' ? mainEventDonPayment(card) : null;
        if (cost === 0) {
          if (card.category === 'event' && !eventPayment) {
            const info = mainEventDonInfo(card);
            if (info) {
              const required = info.cost + info.donMinus;
              setLastError([`${card.name} requires ${required} usable DON!! for its play cost and DON!! -N ability cost, but only ${info.available} are available.`]);
              return;
            }
          }
          if (card.category === 'event' && eventPayment && eventPayment.abilityCost > 0) {
            setMode({
              kind: 'payingEventMainCost',
              handCardInstanceId: card.instanceId,
              cardName: card.name,
              cost,
              donInstanceIds: eventPayment.donInstanceIds,
              abilityCost: eventPayment.abilityCost,
              candidateInstanceIds: eventPayment.candidateInstanceIds,
              selectedDonIds: [],
            });
            setLastError(null);
            return;
          }
          withActingPlayer((playerId) => ({
            type: PLAY_ACTION_BY_CATEGORY[card.category as 'character' | 'stage' | 'event'],
            actionId: createActionId(),
            playerId,
            handCardInstanceId: card.instanceId,
            donInstanceIds: [],
          }) as GameAction);
          return;
        }
        const donInstanceIds = eventPayment?.donInstanceIds ?? activeCostAreaDonIds(actingPlayerId).slice(0, cost);
        if (donInstanceIds.length < cost) {
          setLastError([`${card.name} costs ${cost} DON!!, but only ${donInstanceIds.length} active DON!! are available.`]);
          return;
        }
        if (card.category === 'event' && !eventPayment) {
          const info = mainEventDonInfo(card);
          if (info) {
            const required = info.cost + info.donMinus;
            setLastError([`${card.name} requires ${required} usable DON!! for its play cost and DON!! -N ability cost, but only ${info.available} are available.`]);
            return;
          }
        }
        if (card.category === 'event' && eventPayment && eventPayment.abilityCost > 0) {
          setMode({
            kind: 'payingEventMainCost',
            handCardInstanceId: card.instanceId,
            cardName: card.name,
            cost,
            donInstanceIds: eventPayment.donInstanceIds,
            abilityCost: eventPayment.abilityCost,
            candidateInstanceIds: eventPayment.candidateInstanceIds,
            selectedDonIds: [],
          });
          setLastError(null);
          return;
        }
        setMode({ kind: 'confirmPlayCost', handCardInstanceId: card.instanceId, cardCategory: card.category, cardName: card.name, cost, donInstanceIds });
        setLastError(null);
        return;
      }

      case 'confirmPlayCost': {
        return;
      }

      case 'selectAttacker': {
        if (!isOwnCard || (zone !== 'leaderArea' && zone !== 'characterArea')) return;
        if (card.orientation !== 'active' || card.summoningSick) return;
        setMode({ kind: 'selectAttackTarget', attackerInstanceId: card.instanceId });
        return;
      }

      case 'selectAttackTarget': {
        if (isOwnCard) return; // 7-1-1-2: must target the opponent
        if (zone === 'leaderArea') {
          withActingPlayer((playerId) => ({
            type: 'DECLARE_ATTACK',
            actionId: createActionId(),
            playerId,
            attackerInstanceId: mode.attackerInstanceId,
            targetInstanceId: card.instanceId,
          }));
        } else if (zone === 'characterArea' && card.orientation === 'rested') {
          withActingPlayer((playerId) => ({
            type: 'DECLARE_ATTACK',
            actionId: createActionId(),
            playerId,
            attackerInstanceId: mode.attackerInstanceId,
            targetInstanceId: card.instanceId,
          }));
        }
        return;
      }

      case 'selectBlocker': {
        if (!isOwnCard || zone !== 'characterArea') return;
        if (card.orientation !== 'active' || !card.hasBlocker) return;
        withActingPlayer((playerId) => ({ type: 'ACTIVATE_BLOCKER', actionId: createActionId(), playerId, blockerInstanceId: card.instanceId }));
        return;
      }

      case 'selectCounterCard': {
        if (!actingPlayerId || !state?.currentBattle) return;
        if (!isOwnCard || zone !== 'hand') return;
        if (!isCounterCardApplicable(card)) return; // dimmed/inapplicable — no-op, mirrors DockHand's `selectable` gate
        const targetInstanceId = state.currentBattle.targetInstanceId;

        // A Character with a printed Counter value: always boosts the card
        // currently under attack (see BoardSelectionMode doc comment for why
        // an explicit boost-target step was dropped from this flow).
        if (card.category === 'character' && card.counter && card.counter > 0) {
          runCounterDispatch({
            type: 'ACTIVATE_COUNTER_CHARACTER',
            actionId: createActionId(),
            playerId: actingPlayerId,
            handCardInstanceId: card.instanceId,
            boostTargetInstanceId: targetInstanceId,
          });
          return;
        }

        // A Counter Event (curated [Counter] ability): DON!! is auto-picked
        // (isCounterCardApplicable already confirmed enough is available).
        if (card.category === 'event' && hasCounter(card)) {
          const picked = counterEventDonPayment(card);
          if (!picked) return; // shouldn't happen — isCounterCardApplicable already checked this
          if (picked.abilityCost > 0) {
            setMode({
              kind: 'payingCounterEventCost',
              handCardInstanceId: card.instanceId,
              cardName: card.name,
              cost: picked.donInstanceIds.length,
              donInstanceIds: picked.donInstanceIds,
              abilityCost: picked.abilityCost,
              candidateInstanceIds: picked.candidateInstanceIds,
              selectedDonIds: [],
            });
            setLastError(null);
            return;
          }
          runCounterDispatch({
            type: 'ACTIVATE_COUNTER_EVENT',
            actionId: createActionId(),
            playerId: actingPlayerId,
            handCardInstanceId: card.instanceId,
            donInstanceIds: picked.donInstanceIds,
            abilityCostDonInstanceIds: [],
          });
        }
        return;
      }

      case 'resolvingDonChoice': {
        if (!isOwnCard || (zone !== 'costArea' && zone !== 'attachedDon')) return;
        toggleDonChoiceCard(card.instanceId);
        return;
      }

      case 'payingEventMainCost': {
        if (!isOwnCard || (zone !== 'costArea' && zone !== 'attachedDon')) return;
        if (!mode.candidateInstanceIds.includes(card.instanceId)) return;
        const already = mode.selectedDonIds.includes(card.instanceId);
        if (already) {
          setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => id !== card.instanceId) });
        } else if (mode.selectedDonIds.length < mode.abilityCost) {
          setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, card.instanceId] });
        }
        return;
      }

      case 'payingCounterEventCost': {
        if (!isOwnCard || (zone !== 'costArea' && zone !== 'attachedDon')) return;
        if (!mode.candidateInstanceIds.includes(card.instanceId)) return;
        const already = mode.selectedDonIds.includes(card.instanceId);
        if (already) {
          setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => id !== card.instanceId) });
        } else if (mode.selectedDonIds.length < mode.abilityCost) {
          setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, card.instanceId] });
        }
        return;
      }

      case 'payingActivateEffectCost': {
        if (!isOwnCard || (zone !== 'costArea' && zone !== 'attachedDon')) return;
        const already = mode.selectedDonIds.includes(card.instanceId);
        if (already) {
          setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => id !== card.instanceId) });
        } else if (mode.selectedDonIds.length < mode.cost) {
          setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, card.instanceId] });
        }
        return;
      }

      case 'selectActivateSource': {
        // 8-1-3-2: activate an in-play Leader/Character/Stage's [Activate: Main].
        // The engine validates legality (once-per-turn etc.); any chooseTargets
        // the ability needs surfaces as a PendingChoice the prompt resolves.
        if (!isOwnCard || (zone !== 'leaderArea' && zone !== 'characterArea' && zone !== 'stageArea')) return;
        if (!hasActivateMain(card)) return;
        activateMainFromCard(card);
        return;
      }

      case 'selectOnOppAttackSource': {
        // [On Your Opponent's Attack]: defender taps one of their Leader/Character/Stage cards with the ability.
        if (!isOwnCard || (zone !== 'leaderArea' && zone !== 'characterArea' && zone !== 'stageArea')) return;
        if (!hasOnOpponentsAttack(card)) return;
        activateOnOppAttackFromCard(card);
        return;
      }

      case 'payingOnOppAttackCost': {
        if (!isOwnCard || (zone !== 'costArea' && zone !== 'attachedDon')) return;
        const already = mode.selectedDonIds.includes(card.instanceId);
        if (already) {
          setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => id !== card.instanceId) });
        } else if (mode.selectedDonIds.length < mode.cost) {
          setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, card.instanceId] });
        }
        return;
      }

      default:
        return;
    }
  }

  /**
   * Bulk tap-to-select fallback for attached DON!! — no longer used by the
   * desktop board (PlayerBoardPanel.tsx now reveals a per-DON!! hover stack
   * for all three of these modes, see toggleAttachedDonStack/
   * AttachedDonHoverStack.tsx), but kept as the mobile path (MatchScreen.tsx's
   * MobileLeaderCharacterCard), which has no hover concept to reveal a stack
   * with. One tap toggles every one of this card's ELIGIBLE attached DON!! at
   * once, capped at the mode's DON!! budget.
   */
  function handleAttachedDonLabelTap(ownerPlayerId: string, card: CardView): void {
    if (!actingPlayerId || ownerPlayerId !== actingPlayerId) return;
    if (mode.kind !== 'payingActivateEffectCost' && mode.kind !== 'payingOnOppAttackCost' && mode.kind !== 'payingEventMainCost' && mode.kind !== 'payingCounterEventCost' && mode.kind !== 'resolvingDonChoice') return;
    if (card.donAttachedIds.length === 0) return;

    if (mode.kind === 'resolvingDonChoice') {
      const eligibleIds = card.donAttachedIds.filter((id) => mode.candidateInstanceIds.includes(id));
      if (eligibleIds.length === 0) return;
      const alreadySelected = eligibleIds.filter((id) => mode.selectedDonIds.includes(id));
      if (alreadySelected.length > 0) {
        setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => !eligibleIds.includes(id)) });
        return;
      }
      const remaining = mode.max - mode.selectedDonIds.length;
      if (remaining <= 0) return;
      const next = [...mode.selectedDonIds, ...eligibleIds.slice(0, remaining)];
      if (next.length === mode.max) {
        submitDonChoice(next);
      } else {
        setMode({ ...mode, selectedDonIds: next });
      }
      return;
    }

    if (mode.kind === 'payingEventMainCost') {
      const eligibleIds = card.donAttachedIds.filter((id) => mode.candidateInstanceIds.includes(id));
      if (eligibleIds.length === 0) return;
      const alreadySelected = eligibleIds.filter((id) => mode.selectedDonIds.includes(id));
      if (alreadySelected.length > 0) {
        setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => !eligibleIds.includes(id)) });
        return;
      }
      const remaining = mode.abilityCost - mode.selectedDonIds.length;
      if (remaining <= 0) return;
      setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, ...eligibleIds.slice(0, remaining)] });
      return;
    }

    if (mode.kind === 'payingCounterEventCost') {
      const eligibleIds = card.donAttachedIds.filter((id) => mode.candidateInstanceIds.includes(id));
      if (eligibleIds.length === 0) return;
      const alreadySelected = eligibleIds.filter((id) => mode.selectedDonIds.includes(id));
      if (alreadySelected.length > 0) {
        setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => !eligibleIds.includes(id)) });
        return;
      }
      const remaining = mode.abilityCost - mode.selectedDonIds.length;
      if (remaining <= 0) return;
      setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, ...eligibleIds.slice(0, remaining)] });
      return;
    }

    const selectedAttachedIds = card.donAttachedIds.filter((id) => mode.selectedDonIds.includes(id));
    if (selectedAttachedIds.length > 0) {
      setMode({
        ...mode,
        selectedDonIds: mode.selectedDonIds.filter((id) => !card.donAttachedIds.includes(id)),
      });
      return;
    }

    const remaining = mode.cost - mode.selectedDonIds.length;
    if (remaining <= 0) return;
    setMode({
      ...mode,
      selectedDonIds: [...mode.selectedDonIds, ...card.donAttachedIds.slice(0, remaining)],
    });
  }

  return {
    mode,
    lastError,
    cancel,
    beginDeclareAttack,
    beginActivateBlocker,
    beginActivateMain,
    beginActivateOnOppAttack,
    hasActivateMain,
    hasOnOpponentsAttack,
    hasUnusedActivateMain,
    hasCounter,
    isCounterCardApplicable,
    counterEventDonInfo,
    counterProgress,
    isDonChoiceCandidate,
    donChoiceProgress,
    confirmDonChoice,
    canDeclareAttackWith,
    canGiveDonOnCard,
    giveDonToCard,
    returnGivenDonFromCard,
    confirmPlayCard,
    confirmEventMainCost,
    confirmCounterEventCost,
    confirmActivateMainCost,
    confirmOnOppAttackCost,
    beginAttackWithCard,
    canPlayHandCard,
    playHandCard,
    passStep,
    endMainPhase,
    concede,
    handleCardTap,
    handleAttachedDonLabelTap,
  };
}
