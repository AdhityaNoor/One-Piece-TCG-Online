/**
 * "Only valid actions are enabled" (project spec), enforced at the DISPATCH
 * boundary, not just visually. This is the one place the tutorial is allowed
 * to say no to a GameAction before it ever reaches the real engine's
 * validateAction/executeAction — it never second-guesses what the engine
 * decides IS legal, it only narrows WHICH legal action types are reachable
 * while a given chapter is active. See TutorialManager's `installDispatchGuard`
 * for where this wraps matchStore's dispatch.
 *
 * Pass-through actions: RESOLVE_PENDING_CHOICE / CONCEDE / TIMEOUT_LOSS are
 * always allowed regardless of the active chapter's `allowedActions` — the
 * same pending-choice gate exception the engine's own dispatch.ts documents
 * (a suspended PendingChoice must always be resolvable, and conceding/timing
 * out must always be possible, or the player could get stuck with no way
 * out — the one thing this project's tutorial spec explicitly forbids:
 * "Players should never become stuck").
 */
import type { GameAction, GameActionType } from '../../engine/actions';
import type { TutorialStepConfig } from './types';

const ALWAYS_ALLOWED: GameActionType[] = ['RESOLVE_PENDING_CHOICE', 'CONCEDE', 'TIMEOUT_LOSS'];

export interface TutorialActionDecision {
  allowed: boolean;
  reason?: string;
}

export function isActionAllowedForStep(step: TutorialStepConfig, action: GameAction): TutorialActionDecision {
  if (ALWAYS_ALLOWED.includes(action.type)) return { allowed: true };
  if (step.allowedActions.includes(action.type)) return { allowed: true };
  return {
    allowed: false,
    reason: `"${action.type}" isn't part of this chapter yet — follow the highlighted objective: ${step.objective}`,
  };
}
