/**
 * Config-invariant tests for the tutorial chapter list — because the steps
 * are data (project rule: "store every tutorial step as configuration"),
 * the correctness of the feature's structure is testable without any DOM:
 * ordering, the opening introduction block (card introduction → board
 * introduction → basic rules introduction), and the per-line slide/
 * highlight mappings all live here.
 */
import { describe, expect, it } from 'vitest';
import { TUTORIAL_STEPS, getTutorialStep } from './tutorialSteps';
import { INTRO_SLIDES } from './tutorialIntroContent';
import { buildProgressSnapshot, evaluateCompletion, nextChapterId, previousChapterId } from './TutorialStateMachine';

describe('TUTORIAL_STEPS list shape', () => {
  it('has unique chapter ids', () => {
    const ids = TUTORIAL_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('orders are contiguous 1..N and match array position', () => {
    TUTORIAL_STEPS.forEach((step, index) => {
      expect(step.order).toBe(index + 1);
    });
  });

  it('every chapter has dialogue, a title, and a success line', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.dialogue.length).toBeGreaterThan(0);
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.successLine.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('opening introduction block', () => {
  it('begins with card introduction, board introduction, then basic rules introduction', () => {
    expect(TUTORIAL_STEPS[0].id).toBe('cardBasics');
    expect(TUTORIAL_STEPS[1].id).toBe('battlefieldOverview');
    expect(TUTORIAL_STEPS[2].id).toBe('basicRules');
  });

  it('intro chapters are pure narration: manualAdvance, no dispatchable actions, engine-wired', () => {
    for (const id of ['cardBasics', 'battlefieldOverview', 'basicRules'] as const) {
      const step = getTutorialStep(id);
      expect(step).toBeDefined();
      expect(step?.completionCondition).toEqual({ kind: 'manualAdvance' });
      expect(step?.allowedActions).toEqual([]);
      expect(step?.isEngineWired).toBe(true);
    }
  });

  it('intro-panel chapters map every dialogue line to a valid slide', () => {
    for (const step of TUTORIAL_STEPS) {
      if (!step.introPanel) continue;
      // Panel chapters teach via the panel, not a board spotlight.
      expect(step.highlight).toBe('none');
      const slides = INTRO_SLIDES[step.introPanel];
      expect(step.dialogueSlides).toBeDefined();
      expect(step.dialogueSlides).toHaveLength(step.dialogue.length);
      for (const slideIndex of step.dialogueSlides ?? []) {
        expect(slideIndex).toBeGreaterThanOrEqual(0);
        expect(slideIndex).toBeLessThan(slides.length);
      }
    }
  });

  it('intro panels cover all their slides (no drafted-but-unreachable slide)', () => {
    for (const step of TUTORIAL_STEPS) {
      if (!step.introPanel || !step.dialogueSlides) continue;
      const reached = new Set(step.dialogueSlides);
      expect(reached.size).toBe(INTRO_SLIDES[step.introPanel].length);
    }
  });

  it('board tour highlights every dialogue line', () => {
    const tour = getTutorialStep('battlefieldOverview');
    expect(tour?.dialogueHighlights).toHaveLength(tour?.dialogue.length ?? -1);
  });
});

describe('TutorialStateMachine navigation over the new list', () => {
  it('walks forward through every chapter exactly once', () => {
    let id = TUTORIAL_STEPS[0].id;
    const visited = [id];
    for (;;) {
      const next = nextChapterId(id);
      if (!next) break;
      visited.push(next);
      id = next;
    }
    expect(visited).toEqual(TUTORIAL_STEPS.map((step) => step.id));
  });

  it('previousChapterId inverts nextChapterId', () => {
    for (let i = 1; i < TUTORIAL_STEPS.length; i++) {
      expect(previousChapterId(TUTORIAL_STEPS[i].id)).toBe(TUTORIAL_STEPS[i - 1].id);
    }
    expect(previousChapterId(TUTORIAL_STEPS[0].id)).toBeNull();
  });

  it('manualAdvance chapters read complete with no GameState; needsEngineHookup never does', () => {
    expect(evaluateCompletion(null, 'p1', { kind: 'manualAdvance' })).toBe(true);
    expect(evaluateCompletion(null, 'p1', { kind: 'needsEngineHookup' })).toBe(false);
  });

  it('progress snapshot counts the expanded chapter list', () => {
    const snapshot = buildProgressSnapshot('cardBasics', null, 'p1');
    expect(snapshot.chapterIndex).toBe(0);
    expect(snapshot.chapterCount).toBe(TUTORIAL_STEPS.length);
    expect(snapshot.isLastChapter).toBe(false);
    expect(snapshot.isComplete).toBe(true); // manualAdvance
  });
});
