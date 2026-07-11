import { useEffect, useRef } from 'react';
import { chooseAction, generateLegalActions } from '../../ai';
import type { GameAction } from '../../engine/actions';
import { getActingPlayerId } from '../../board/projection';
import { createActionId, useMatchStore } from '../store/matchStore';

const CPU_THINK_MS = 320;

function fallbackProgressAction(state: NonNullable<ReturnType<typeof useMatchStore.getState>['state']>, playerId: string): GameAction | null {
  const legal = generateLegalActions({
    state,
    playerId,
    defs: useMatchStore.getState().defs,
    registry: useMatchStore.getState().registry,
    createActionId,
  });
  const endMain = legal.find((a) => a.type === 'END_MAIN_PHASE');
  if (endMain) return endMain;
  const pass = legal.find((a) => a.type === 'PASS_STEP');
  if (pass) return pass;
  const resolve = legal.find((a) => a.type === 'RESOLVE_PENDING_CHOICE');
  if (resolve) return resolve;
  return legal[0] ?? null;
}

/**
 * Drives CPU seats through the same matchStore.dispatch() path as humans.
 */
export function useCpuTurnController(enabled: boolean): { thinking: boolean } {
  const state = useMatchStore((s) => s.state);
  const defs = useMatchStore((s) => s.defs);
  const registry = useMatchStore((s) => s.registry);
  const dispatch = useMatchStore((s) => s.dispatch);
  const cpuPlayerIds = useMatchStore((s) => s.cpuPlayerIds);
  const cpuDifficulty = useMatchStore((s) => s.cpuDifficulty);
  const cpuDebug = useMatchStore((s) => s.cpuDebug);
  const busyRef = useRef(false);
  const stuckTicksRef = useRef(0);

  useEffect(() => {
    if (!enabled || !state || state.gameOver || cpuPlayerIds.length === 0) return undefined;

    const actingPlayerId = getActingPlayerId(state);
    if (!cpuPlayerIds.includes(actingPlayerId)) {
      stuckTicksRef.current = 0;
      return undefined;
    }

    let cancelled = false;

    const timer = window.setTimeout(() => {
      if (cancelled || busyRef.current) return;
      busyRef.current = true;
      try {
        const latest = useMatchStore.getState();
        const liveState = latest.state;
        if (!liveState || liveState.gameOver) return;

        const liveActing = getActingPlayerId(liveState);
        if (!latest.cpuPlayerIds.includes(liveActing)) return;

        let decision = null as ReturnType<typeof chooseAction>;
        try {
          decision = chooseAction({
            state: liveState,
            playerId: liveActing,
            defs: latest.defs,
            registry: latest.registry,
            config: {
              difficulty: latest.cpuDifficulty,
              debug: latest.cpuDebug,
              seed: liveState.rng.seed,
            },
            createActionId,
          });
        } catch (err) {
          if (latest.cpuDebug) console.warn('[CPU] chooseAction threw:', err);
        }

        let action = decision?.action ?? null;
        if (!action) {
          action = fallbackProgressAction(liveState, liveActing);
          if (latest.cpuDebug) {
            console.warn('[CPU] no scored action for', liveActing, '— using fallback', action?.type);
          }
        }

        if (!action) {
          stuckTicksRef.current += 1;
          if (latest.cpuDebug) {
            console.warn('[CPU] softlock: no legal action for', liveActing, {
              phase: liveState.currentPhase,
              battle: liveState.currentBattle?.step,
              pending: liveState.pendingChoices[0],
              hand: liveState.players[liveActing]?.hand.cardIds.length,
              stuckTicks: stuckTicksRef.current,
            });
          }
          return;
        }

        const result = latest.dispatch(action);
        if (!result.ok) {
          stuckTicksRef.current += 1;
          if (latest.cpuDebug) {
            console.warn('[CPU] dispatch rejected:', result.reasons, action);
          }
          // Try a safe progress action once if the chosen line was illegal.
          const fallback = fallbackProgressAction(useMatchStore.getState().state ?? liveState, liveActing);
          if (fallback && fallback.type !== action.type) {
            const retry = latest.dispatch(fallback);
            if (retry.ok) stuckTicksRef.current = 0;
          }
        } else {
          stuckTicksRef.current = 0;
        }
      } finally {
        busyRef.current = false;
      }
    }, CPU_THINK_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, state, defs, registry, dispatch, cpuPlayerIds, cpuDifficulty, cpuDebug]);

  const actingPlayerId = state ? getActingPlayerId(state) : null;
  const thinking = !!actingPlayerId && cpuPlayerIds.includes(actingPlayerId) && enabled && !state?.gameOver;
  return { thinking };
}
