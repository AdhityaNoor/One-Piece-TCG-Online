/**
 * Pure chapter-progression logic. No React, no stores, no engine imports
 * beyond the GameState type it reads — every function here is a plain
 * (inputs) -> output computation, so it's trivially unit-testable and can
 * never itself mutate GameState (project rule: "the UI must never directly
 * mutate game state" extends to this module too — it only ever READS state
 * to decide whether a chapter's objective is satisfied).
 */
import type { GameState } from '../../engine/state/game';
import { TUTORIAL_STEPS } from './tutorialSteps';
import type { TutorialChapterId, TutorialCompletionCondition, TutorialProgressSnapshot, TutorialStepConfig } from './types';

export function chapterIndexOf(id: TutorialChapterId): number {
  return TUTORIAL_STEPS.findIndex((step) => step.id === id);
}

export function stepAt(index: number): TutorialStepConfig {
  const clamped = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, index));
  return TUTORIAL_STEPS[clamped];
}

export function nextChapterId(id: TutorialChapterId): TutorialChapterId | null {
  const index = chapterIndexOf(id);
  const next = TUTORIAL_STEPS[index + 1];
  return next ? next.id : null;
}

export function previousChapterId(id: TutorialChapterId): TutorialChapterId | null {
  const index = chapterIndexOf(id);
  const prev = TUTORIAL_STEPS[index - 1];
  return prev ? prev.id : null;
}

/**
 * Evaluates ONE completion condition against a live GameState. Only the
 * variants chapters 1-3 actually use this milestone do a real check;
 * 'needsEngineHookup' always reads as incomplete (there's nothing live to
 * check yet — see tutorialSteps.ts doc comment) and 'manualAdvance' is
 * always "complete" the instant the player has seen the dialogue, since its
 * only gate is clicking Next.
 */
/** The one player in `state.players` who is NOT the studying player (tutorial games are strictly 1v1). */
function opponentOf(state: GameState, studyingPlayerId: string) {
  const opponentId = Object.keys(state.players).find((id) => id !== studyingPlayerId);
  return opponentId ? state.players[opponentId] : undefined;
}

export function evaluateCompletion(state: GameState | null, studyingPlayerId: string, condition: TutorialCompletionCondition): boolean {
  switch (condition.kind) {
    case 'manualAdvance':
      return true;
    case 'needsEngineHookup':
      return false;
    case 'leaderDonAttachedAtLeast': {
      if (!state) return false;
      const player = state.players[studyingPlayerId];
      if (!player) return false;
      const leader = state.cardsById[player.leaderInstanceId];
      return (leader?.donAttached.length ?? 0) >= condition.count;
    }
    case 'opponentLifeAtMost': {
      if (!state) return false;
      const opponent = opponentOf(state, studyingPlayerId);
      return opponent !== undefined && opponent.lifeArea.cardIds.length <= condition.count;
    }
    case 'playerCharactersAtLeast': {
      if (!state) return false;
      const player = state.players[studyingPlayerId];
      return player !== undefined && player.characterArea.cardIds.length >= condition.count;
    }
    case 'opponentCharactersAtMost': {
      if (!state) return false;
      const opponent = opponentOf(state, studyingPlayerId);
      return opponent !== undefined && opponent.characterArea.cardIds.length <= condition.count;
    }
    case 'attackRepelledKeepingLife': {
      // Only meaningful for scenarios that START mid-battle (see types.ts):
      // complete when that battle is fully over and Life was preserved.
      if (!state || state.currentBattle !== null) return false;
      const player = state.players[studyingPlayerId];
      return player !== undefined && player.lifeArea.cardIds.length >= condition.count;
    }
    case 'gameWon':
      return state?.gameOver?.winnerId === studyingPlayerId;
    default: {
      const exhaustive: never = condition;
      return exhaustive;
    }
  }
}

export function buildProgressSnapshot(chapterId: TutorialChapterId, state: GameState | null, studyingPlayerId: string): TutorialProgressSnapshot {
  const index = chapterIndexOf(chapterId);
  const step = stepAt(index);
  return {
    chapterIndex: index,
    chapterCount: TUTORIAL_STEPS.length,
    step,
    isComplete: evaluateCompletion(state, studyingPlayerId, step.completionCondition),
    isLastChapter: index === TUTORIAL_STEPS.length - 1,
  };
}
