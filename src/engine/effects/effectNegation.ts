/**
 * Effect negation — "negate the effect of [target]" / "your [On Play] effects are negated".
 * Evaluated when triggered/activated abilities fire (runTimings).
 */
import type { GameState } from '../state/game';
import type { IrTiming } from './effectIr';

export function isAbilityNegated(
  state: GameState,
  sourceInstanceId: string,
  timing: IrTiming,
): boolean {
  const inst = state.cardsById[sourceInstanceId];
  if (!inst) return false;

  for (const ce of state.continuousEffects) {
    const neg = ce.effectNegation;
    if (!neg) continue;

    const timings = neg.negatedTimings;
    const timingBlocked = !timings || timings.length === 0 || timings.includes(timing);
    if (!timingBlocked) continue;

    if (neg.appliesToInstanceId === sourceInstanceId) return true;
    if (neg.appliesToControllerId === inst.controllerId) return true;
  }
  return false;
}
