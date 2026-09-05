/**
 * The scenario registry — the tutorial's table of contents.
 *
 * Each entry is a self-contained lesson: its own two decks, its own stacked
 * deal, its own beats, and its own answer to "do card effects fire?". The
 * orchestration in TutorialManager knows nothing about content beyond this
 * shape, which is what let the tutorial grow from the official Teaching
 * App's first scenario to all three without touching the runner.
 */
import type { TutorialBeat, TutorialChapterId, TutorialScenarioDef, TutorialScenarioId } from '../types';
import { BASIC_GAME_FLOW } from './basicGameFlow';
import { CARD_EFFECTS_1 } from './cardEffects1';
import { CARD_EFFECTS_2 } from './cardEffects2';

/** In teaching order — each scenario assumes the previous one's vocabulary. */
export const TUTORIAL_SCENARIOS: readonly TutorialScenarioDef[] = [BASIC_GAME_FLOW, CARD_EFFECTS_1, CARD_EFFECTS_2];

export const DEFAULT_TUTORIAL_SCENARIO_ID: TutorialScenarioId = 'basicGameFlow';

export function getTutorialScenario(id: TutorialScenarioId): TutorialScenarioDef {
  const found = TUTORIAL_SCENARIOS.find((scenario) => scenario.id === id);
  if (!found) throw new Error(`Tutorial: no scenario with id '${id}'.`);
  return found;
}

/** Index into the scenario's beats of the first beat of a chapter, or -1. */
export function firstBeatIndexOfChapter(scenario: TutorialScenarioDef, chapter: TutorialChapterId): number {
  return scenario.beats.findIndex((beat) => beat.chapter === chapter);
}

export function beatsForChapter(scenario: TutorialScenarioDef, chapter: TutorialChapterId): TutorialBeat[] {
  return scenario.beats.filter((beat) => beat.chapter === chapter);
}

export { BASIC_GAME_FLOW, CARD_EFFECTS_1, CARD_EFFECTS_2 };
