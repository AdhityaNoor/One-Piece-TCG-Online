/**
 * Content-integrity tests for the intro-panel slide data. The teaching
 * content is plain data with rule citations (project rule: "Reference the
 * rule section from the PDF when possible"), so a test can prove every
 * teaching point carries a citation and every card-anatomy callout names a
 * real CardDefinition field — the same guarantee the engine's own
 * rule-referencing convention gives reviewers.
 */
import { describe, expect, it } from 'vitest';
import type { CardDefinition } from '../../engine/state/card';
import { INTRO_SLIDES, introSlideAt } from './tutorialIntroContent';

/** A fully-populated definition, used to prove anatomy callouts reference real fields. */
const SAMPLE_DEF: CardDefinition = {
  cardDefinitionId: 'test-def',
  name: 'Test Character',
  category: 'character',
  colors: ['red'],
  types: ['Straw Hat Crew'],
  attributes: ['slash'],
  basePower: 5000,
  baseCost: 3,
  text: '[On Play] Do a test thing.',
  counter: 1000,
  hasTrigger: false,
  hasRush: false,
  hasBlocker: false,
  hasDoubleAttack: false,
  isUnblockable: false,
  cardNumber: 'TEST-001',
};

describe('intro slide data', () => {
  it('both panel kinds have at least one slide', () => {
    expect(INTRO_SLIDES.cardAnatomy.length).toBeGreaterThan(0);
    expect(INTRO_SLIDES.basicRules.length).toBeGreaterThan(0);
  });

  it('every teaching point carries a rule reference', () => {
    for (const slides of Object.values(INTRO_SLIDES)) {
      for (const slide of slides) {
        const refs =
          slide.content.kind === 'cardAnatomy'
            ? slide.content.callouts.map((c) => c.ruleRef)
            : slide.content.kind === 'cardCategories'
              ? slide.content.categories.map((c) => c.ruleRef)
              : slide.content.kind === 'rulePoints'
                ? slide.content.points.map((p) => p.ruleRef)
                : slide.content.phases.map((p) => p.ruleRef);
        expect(refs.length).toBeGreaterThan(0);
        for (const ref of refs) expect(ref).toMatch(/\d/);
      }
    }
  });

  it('card-anatomy callouts name real CardDefinition fields', () => {
    for (const slide of INTRO_SLIDES.cardAnatomy) {
      if (slide.content.kind !== 'cardAnatomy') continue;
      for (const callout of slide.content.callouts) {
        expect(callout.field in SAMPLE_DEF).toBe(true);
      }
    }
  });

  it('card categories cover all five CardCategory values exactly once', () => {
    const categorySlide = INTRO_SLIDES.cardAnatomy.find((slide) => slide.content.kind === 'cardCategories');
    expect(categorySlide).toBeDefined();
    if (categorySlide?.content.kind !== 'cardCategories') return;
    const categories = categorySlide.content.categories.map((c) => c.category);
    expect([...categories].sort()).toEqual(['character', 'don', 'event', 'leader', 'stage']);
  });

  it('turn-structure slide lists the five phases in rule order 6-2..6-6', () => {
    const phaseSlide = INTRO_SLIDES.basicRules.find((slide) => slide.content.kind === 'phaseFlow');
    expect(phaseSlide).toBeDefined();
    if (phaseSlide?.content.kind !== 'phaseFlow') return;
    expect(phaseSlide.content.phases.map((p) => p.name)).toEqual(['Refresh', 'Draw', 'DON!!', 'Main', 'End']);
    expect(phaseSlide.content.phases.map((p) => p.ruleRef)).toEqual(['6-2', '6-3', '6-4', '6-5', '6-6']);
  });

  it('introSlideAt clamps out-of-range indexes instead of blanking', () => {
    expect(introSlideAt('cardAnatomy', -5)).toBe(INTRO_SLIDES.cardAnatomy[0]);
    expect(introSlideAt('cardAnatomy', 99)).toBe(INTRO_SLIDES.cardAnatomy[INTRO_SLIDES.cardAnatomy.length - 1]);
    expect(introSlideAt('basicRules', 1)).toBe(INTRO_SLIDES.basicRules[1]);
  });
});
