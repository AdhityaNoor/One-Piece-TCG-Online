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
import { canPayAbilityCost, evaluateGates, fieldDonIds, requiredDonMinusCount } from '../../../engine/effects';
import type { Ability } from '../../../engine/effects/effectIr';
import type { CardInstance } from '../../../engine/state/card';

export type BoardZoneKind = 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea' | 'attachedDon' | 'trash';

export type BoardSelectionMode =
  | { kind: 'idle' }
  | { kind: 'confirmPlayCost'; handCardInstanceId: string; cardCategory: 'character' | 'stage' | 'event'; cardName: string; cost: number; donInstanceIds: string[] }
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
   * their DON!! cost auto-selected (first N active cost-area DON!!, see
   * autoSelectCounterEventDon) rather than making the player click
   * individual DON!! cards, matching how playHandCard already auto-selects.
   */
  | { kind: 'selectCounterCard' }
  | { kind: 'selectActivateSource' }
  | { kind: 'payingActivateEffectCost'; sourceInstanceId: string; cost: number; selectedDonIds: string[] }
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

export function useBoardSelection(actingPlayerId: string | null) {
  const dispatch = useMatchStore((s) => s.dispatch);
  const state = useMatchStore((s) => s.state);
  const localPlayerId = useMatchStore((s) => s.localPlayerId);
  const defs = useMatchStore((s) => s.defs);
  const registry = useMatchStore((s) => s.registry);
  const [mode, setMode] = useState<BoardSelectionMode>({ kind: 'idle' });
  const [lastError, setLastError] = useState<string[] | null>(null);

  const reset = (): void => setMode({ kind: 'idle' });

  // Auto-enter the Counter Step's multi-select mode the instant the battle
  // reaches it — no "Activate Counter" button to click through first (see
  // BoardSelectionMode's 'selectCounterCard' doc comment). Only fires from
  // 'idle' so it never clobbers an unrelated in-progress selection.
  useEffect(() => {
    if (state?.currentBattle?.step === 'counter' && mode.kind === 'idle') {
      setMode({ kind: 'selectCounterCard' });
    }
  }, [state?.currentBattle?.step, mode.kind]);

  /** True if the card's curated program exposes an [Activate: Main] ability (8-1-3-2). */
  const hasActivateMain = (card: CardView): boolean => {
    if (!state) return false;
    if (!actingPlayerId) return false;
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
      const selectedDon = requiredDon > 0 ? fieldDonIds(state, actingPlayerId).slice(0, requiredDon) : [];
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
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'activateMain');
    if (!ability) return false;
    return !ability.oncePerTurn || !card.oncePerTurnUsed.includes('activateMain');
  };

  /** True if the card's curated program exposes a [Counter] ability (7-1-3). */
  const hasCounter = (card: CardView): boolean =>
    !!registry[card.cardDefinitionId]?.abilities.some((ability) => ability.timing === 'counter');

  const activateMainDonMinusCost = (card: CardView): number => {
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
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'onOpponentsAttack');
    if (!ability) return false;
    const inst = state.cardsById[card.instanceId];
    if (!inst || inst.controllerId !== actingPlayerId || (inst.currentZone !== 'leaderArea' && inst.currentZone !== 'characterArea' && inst.currentZone !== 'stageArea')) return false;
    if (ability.oncePerTurn && card.oncePerTurnUsed.includes('onOpponentsAttack')) return false;
    if (ability.gate?.length && !evaluateGates(ability.gate, state, defs, actingPlayerId, card.instanceId)) return false;
    if (!abilityConditionMet(ability, inst, card.instanceId, state, defs)) return false;
    if (ability.cost?.length) {
      const requiredDon = requiredDonMinusCount(ability.cost);
      const selectedDon = requiredDon > 0 ? fieldDonIds(state, actingPlayerId).slice(0, requiredDon) : [];
      return canPayAbilityCost(state, card.instanceId, actingPlayerId, ability.cost, selectedDon).length === 0;
    }
    return validateAction(
      state,
      { type: 'ACTIVATE_ON_OPPONENTS_ATTACK', actionId: 'ui-preview', playerId: actingPlayerId, sourceInstanceId: card.instanceId, effectId: 'onOpponentsAttack', donInstanceIds: [] },
      defs,
      registry,
    ).legal;
  };

  const onOppAttackDonMinusCost = (card: CardView): number => {
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
    const ability = registry[card.cardDefinitionId]?.abilities.find((entry) => entry.timing === 'counter');
    const donMinus = ability?.cost?.filter((cost) => cost.kind === 'donMinus').reduce((sum, cost) => sum + cost.count, 0) ?? 0;
    return { cost: currentCostOf(card), donMinus, available: activeCostAreaDonIds(actingPlayerId).length };
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
  const autoSelectCounterEventDon = (card: CardView): { donInstanceIds: string[]; abilityCostDonInstanceIds: string[] } | null => {
    if (!state || !actingPlayerId) return null;
    const info = counterEventDonInfo(card);
    if (!info) return null;
    const pool = activeCostAreaDonIds(actingPlayerId);
    if (pool.length < info.cost + info.donMinus) return null;
    return { donInstanceIds: pool.slice(0, info.cost), abilityCostDonInstanceIds: pool.slice(info.cost, info.cost + info.donMinus) };
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
    if (card.category === 'event' && hasCounter(card)) return autoSelectCounterEventDon(card) !== null;
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
   * targetPower > attackerPower, i.e. at least (attackerPower - startPower
   * + 1) more. `selected` is how much has already been added this step
   * (the live delta since the snapshot above) — together these render as
   * the "3000/5000" progress readout.
   */
  const counterProgress: { selected: number; needed: number } | null = (() => {
    if (!state || !counterBaselineRef.current || state.currentBattle?.step !== 'counter') return null;
    const baseline = counterBaselineRef.current;
    const targetPowerNow = computeCurrentPower(defs, state, state.currentBattle.targetInstanceId);
    return {
      selected: Math.max(0, targetPowerNow - baseline.targetPowerAtStart),
      needed: Math.max(0, baseline.attackerPower - baseline.targetPowerAtStart + 1),
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
    const donInstanceIds = activeCostAreaDonIds(actingPlayerId).slice(0, cost);
    if (donInstanceIds.length < cost) {
      setLastError([`${card.name} costs ${cost} DON!!, but only ${donInstanceIds.length} active DON!! are available.`]);
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
    const donInstanceIds = activeCostAreaDonIds(actingPlayerId).slice(0, cost);
    if (donInstanceIds.length < cost) return false;

    return validateAction(
      state,
      {
        type: PLAY_ACTION_BY_CATEGORY[card.category],
        actionId: 'ui-preview',
        playerId: actingPlayerId,
        handCardInstanceId: card.instanceId,
        donInstanceIds,
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
    const donMinusCost = activateMainDonMinusCost(card);
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
    const donMinusCost = onOppAttackDonMinusCost(card);
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
        if (cost === 0) {
          withActingPlayer((playerId) => ({
            type: PLAY_ACTION_BY_CATEGORY[card.category as 'character' | 'stage' | 'event'],
            actionId: createActionId(),
            playerId,
            handCardInstanceId: card.instanceId,
            donInstanceIds: [],
          }) as GameAction);
          return;
        }
        const donInstanceIds = activeCostAreaDonIds(actingPlayerId).slice(0, cost);
        if (donInstanceIds.length < cost) {
          setLastError([`${card.name} costs ${cost} DON!!, but only ${donInstanceIds.length} active DON!! are available.`]);
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
          const picked = autoSelectCounterEventDon(card);
          if (!picked) return; // shouldn't happen — isCounterCardApplicable already checked this
          runCounterDispatch({
            type: 'ACTIVATE_COUNTER_EVENT',
            actionId: createActionId(),
            playerId: actingPlayerId,
            handCardInstanceId: card.instanceId,
            donInstanceIds: picked.donInstanceIds,
            abilityCostDonInstanceIds: picked.abilityCostDonInstanceIds,
          });
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

  function handleAttachedDonLabelTap(ownerPlayerId: string, card: CardView): void {
    if (!actingPlayerId || ownerPlayerId !== actingPlayerId) return;
    if (mode.kind !== 'payingActivateEffectCost' && mode.kind !== 'payingOnOppAttackCost') return;
    if (card.donAttachedIds.length === 0) return;

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
    canDeclareAttackWith,
    canGiveDonOnCard,
    giveDonToCard,
    returnGivenDonFromCard,
    confirmPlayCard,
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
