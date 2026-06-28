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
import { useState } from 'react';
import type { GameAction } from '../../../engine/actions';
import { createActionId, useMatchStore } from '../../store/matchStore';
import type { CardView } from '../../../board/projection';

export type BoardZoneKind = 'hand' | 'leaderArea' | 'characterArea' | 'stageArea' | 'costArea' | 'trash';

export type BoardSelectionMode =
  | { kind: 'idle' }
  | { kind: 'payingCost'; handCardInstanceId: string; cardCategory: 'character' | 'stage' | 'event'; cost: number; selectedDonIds: string[] }
  | { kind: 'selectDonToGive' }
  | { kind: 'selectGiveDonTarget'; donInstanceId: string }
  | { kind: 'selectAttacker' }
  | { kind: 'selectAttackTarget'; attackerInstanceId: string }
  | { kind: 'selectBlocker' }
  | { kind: 'selectCounterCard' }
  | { kind: 'selectCounterBoostTarget'; handCardInstanceId: string };

const PLAY_ACTION_BY_CATEGORY: Record<'character' | 'stage' | 'event', GameAction['type']> = {
  character: 'PLAY_CHARACTER',
  stage: 'PLAY_STAGE',
  event: 'ACTIVATE_EVENT_MAIN',
};

export function useBoardSelection(actingPlayerId: string | null) {
  const dispatch = useMatchStore((s) => s.dispatch);
  const [mode, setMode] = useState<BoardSelectionMode>({ kind: 'idle' });
  const [lastError, setLastError] = useState<string[] | null>(null);

  const reset = (): void => setMode({ kind: 'idle' });

  function runDispatch(action: GameAction): void {
    const result = dispatch(action);
    if (!result.ok) {
      setLastError(result.reasons);
    } else {
      setLastError(null);
      reset();
    }
  }

  function withActingPlayer(build: (playerId: string) => GameAction): void {
    if (!actingPlayerId) return;
    runDispatch(build(actingPlayerId));
  }

  // --- Mode entry points, called from ActionBar's mode-switch buttons ---
  const beginGiveDon = (): void => { setMode({ kind: 'selectDonToGive' }); setLastError(null); };
  const beginDeclareAttack = (): void => { setMode({ kind: 'selectAttacker' }); setLastError(null); };
  const beginActivateBlocker = (): void => { setMode({ kind: 'selectBlocker' }); setLastError(null); };
  const beginActivateCounter = (): void => { setMode({ kind: 'selectCounterCard' }); setLastError(null); };
  const cancel = (): void => { reset(); setLastError(null); };

  // --- Confirm step for the one flow with a true multi-select sub-step ---
  function confirmPlayCard(): void {
    if (mode.kind !== 'payingCost' || mode.selectedDonIds.length !== mode.cost) return;
    withActingPlayer((playerId) => ({
      type: PLAY_ACTION_BY_CATEGORY[mode.cardCategory],
      actionId: createActionId(),
      playerId,
      handCardInstanceId: mode.handCardInstanceId,
      donInstanceIds: mode.selectedDonIds,
    }) as GameAction);
  }

  // --- Step-less actions ---
  const passStep = (): void => withActingPlayer((playerId) => ({ type: 'PASS_STEP', actionId: createActionId(), playerId }));
  const endMainPhase = (): void => withActingPlayer((playerId) => ({ type: 'END_MAIN_PHASE', actionId: createActionId(), playerId }));
  const concede = (): void => withActingPlayer((playerId) => ({ type: 'CONCEDE', actionId: createActionId(), playerId }));

  /** The single router every PlayerBoardPanel card tap calls into. ownerPlayerId is whose panel the tapped card lives in (not necessarily the acting player). */
  function handleCardTap(ownerPlayerId: string, zone: BoardZoneKind, card: CardView): void {
    if (!actingPlayerId) return;
    const isOwnCard = ownerPlayerId === actingPlayerId;

    switch (mode.kind) {
      case 'idle': {
        if (!isOwnCard || zone !== 'hand') return;
        if (card.category !== 'character' && card.category !== 'stage' && card.category !== 'event') return;
        const cost = card.cost ?? 0;
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
        setMode({ kind: 'payingCost', handCardInstanceId: card.instanceId, cardCategory: card.category, cost, selectedDonIds: [] });
        setLastError(null);
        return;
      }

      case 'payingCost': {
        if (!isOwnCard || zone !== 'costArea' || card.donRested) return;
        const already = mode.selectedDonIds.includes(card.instanceId);
        if (already) {
          setMode({ ...mode, selectedDonIds: mode.selectedDonIds.filter((id) => id !== card.instanceId) });
        } else if (mode.selectedDonIds.length < mode.cost) {
          setMode({ ...mode, selectedDonIds: [...mode.selectedDonIds, card.instanceId] });
        }
        return;
      }

      case 'selectDonToGive': {
        if (!isOwnCard || zone !== 'costArea' || card.donRested) return;
        setMode({ kind: 'selectGiveDonTarget', donInstanceId: card.instanceId });
        return;
      }

      case 'selectGiveDonTarget': {
        if (!isOwnCard || (zone !== 'leaderArea' && zone !== 'characterArea')) return;
        withActingPlayer((playerId) => ({
          type: 'GIVE_DON',
          actionId: createActionId(),
          playerId,
          donInstanceId: mode.donInstanceId,
          targetInstanceId: card.instanceId,
        }));
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
        if (!isOwnCard || zone !== 'hand' || card.category !== 'character') return;
        if (!card.counter || card.counter <= 0) return;
        setMode({ kind: 'selectCounterBoostTarget', handCardInstanceId: card.instanceId });
        return;
      }

      case 'selectCounterBoostTarget': {
        if (!isOwnCard || (zone !== 'leaderArea' && zone !== 'characterArea')) return;
        withActingPlayer((playerId) => ({
          type: 'ACTIVATE_COUNTER_CHARACTER',
          actionId: createActionId(),
          playerId,
          handCardInstanceId: mode.handCardInstanceId,
          boostTargetInstanceId: card.instanceId,
        }));
        return;
      }

      default:
        return;
    }
  }

  return {
    mode,
    lastError,
    cancel,
    beginGiveDon,
    beginDeclareAttack,
    beginActivateBlocker,
    beginActivateCounter,
    confirmPlayCard,
    passStep,
    endMainPhase,
    concede,
    handleCardTap,
  };
}
