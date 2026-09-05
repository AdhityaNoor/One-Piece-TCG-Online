/**
 * "Only valid actions are enabled" (project spec), enforced at the DISPATCH
 * boundary, not just visually. This is the one place the tutorial is allowed
 * to say no to a GameAction before it ever reaches the real engine's
 * validateAction/executeAction — it never second-guesses what the engine
 * decides IS legal, it only narrows which actions are reachable while a
 * given beat is waiting on the player.
 *
 * WHAT CHANGED FROM v1. Chapters used to carry a hand-written
 * `allowedActions: GameActionType[]`, which drifted from what the chapter's
 * text actually asked for. The gate is now derived from the beat's own
 * scripted action (tutorialScriptRunner's allowedActionTypes + matchesBeat),
 * so "what the tutorial tells you to do" and "what the tutorial will let you
 * do" are the same object and cannot disagree.
 *
 * Pass-through actions: RESOLVE_PENDING_CHOICE / CONCEDE / TIMEOUT_LOSS are
 * always allowed — the same pending-choice gate exception the engine's own
 * dispatch.ts documents (a suspended PendingChoice must always be
 * resolvable, and conceding must always be possible, or the player could get
 * stuck with no way out: the one thing this project's tutorial spec
 * explicitly forbids, "Players should never become stuck").
 */
import type { GameAction, GameActionType } from '../../engine/actions';
import type { GameState } from '../../engine/state/game';
import type { CardDefinition } from '../../engine/state/card';
import type { TutorialBeat } from './types';
import { allowedActionTypes, matchesBeat } from './tutorialScriptRunner';

const ALWAYS_ALLOWED: GameActionType[] = ['RESOLVE_PENDING_CHOICE', 'CONCEDE', 'TIMEOUT_LOSS'];

export interface TutorialActionDecision {
  allowed: boolean;
  reason?: string;
  /**
   * True only when this action IS the beat's scripted action. The
   * pass-throughs below are `allowed` but not `satisfiesBeat`: counting them
   * as progress let a beat complete without its action ever running, so the
   * script advanced while the board stood still — and the next scripted step
   * then failed against a board several actions behind it.
   */
  satisfiesBeat: boolean;
}

export interface TutorialGateContext {
  state: GameState | null;
  defs: Record<string, CardDefinition>;
  /** The beat currently waiting on the player, or null while narration/the Instructor is acting. */
  beat: TutorialBeat | null;
  studyingPlayerId: string;
}

export function isActionAllowed(context: TutorialGateContext, action: GameAction): TutorialActionDecision {
  const { beat, state, defs, studyingPlayerId } = context;

  // A beat whose whole lesson IS answering a prompt must count that answer as
  // progress, so the pass-through below cannot swallow it.
  const beatIsTheChoice = beat?.actor === 'player' && beat.action?.kind === 'resolveChoice' && action.type === 'RESOLVE_PENDING_CHOICE';
  if (!beatIsTheChoice && ALWAYS_ALLOWED.includes(action.type)) return { allowed: true, satisfiesBeat: false };
  if (!beat || !beat.action || beat.actor !== 'player') {
    return { allowed: false, satisfiesBeat: false, reason: 'Read along — the Instructor is speaking. Use Continue to carry on.' };
  }
  if (!allowedActionTypes(beat.action).includes(action.type)) {
    return { allowed: false, satisfiesBeat: false, reason: `Not this time — ${beat.objective ?? 'follow the highlighted objective.'}` };
  }
  if (!state) return { allowed: false, satisfiesBeat: false, reason: 'The board is still loading.' };

  // Right TYPE, wrong card or target: say so specifically, because "play a
  // Character" and "play THIS Character" are different lessons.
  try {
    if (!matchesBeat(state, defs, beat, studyingPlayerId, action)) {
      return { allowed: false, satisfiesBeat: false, reason: beat.objective ?? 'Follow the highlighted objective.' };
    }
  } catch {
    // resolveCardRef throws when the script and the board have diverged;
    // never trap the player behind it — let the engine be the judge.
    return { allowed: true, satisfiesBeat: true };
  }
  return { allowed: true, satisfiesBeat: true };
}
