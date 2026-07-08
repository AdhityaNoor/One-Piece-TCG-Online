import { describe, expect, it } from 'vitest';
import { cardAbilityDisplayText, cardEffectTextToHtml, splitTriggerText } from '../cardEffectTextHtml';

describe('cardEffectTextToHtml', () => {
  it('styles timing and condition tags as blue chips', () => {
    const html = cardEffectTextToHtml('[On Play] [Your Turn] Draw 1 card.');
    expect(html).toContain('op-chip blue-ability');
    expect(html).toContain('On Play');
    expect(html).toContain('Your Turn');
  });

  it('styles keyword and DON tags with their chip colors', () => {
    const html = cardEffectTextToHtml('[Blocker] [DON!! x2] [Once Per Turn] [Counter]');
    expect(html).toContain('orange-ability');
    expect(html).toContain('black-ability');
    expect(html).toContain('pink-ability');
    expect(html).toContain('red-ability');
  });

  it('highlights quoted card names in square brackets as blue', () => {
    const html = cardEffectTextToHtml('When [Cavendish] attacks, draw 1 card.');
    expect(html).toContain('<span class="effect-card-name">[Cavendish]</span>');
    expect(html).not.toContain('op-chip');
  });

  it('highlights type trait references in curly braces as green', () => {
    const html = cardEffectTextToHtml('If your Leader has the {Land of Wano} type, draw 1.');
    expect(html).toContain('<span class="effect-type-identifier">{Land of Wano}</span>');
  });
});

describe('splitTriggerText', () => {
  it('splits ability and trigger portions', () => {
    expect(splitTriggerText('[On Play] Draw 1. [Trigger] Play this card.')).toEqual({
      ability: '[On Play] Draw 1.',
      trigger: 'Play this card.',
    });
  });
});

describe('cardAbilityDisplayText', () => {
  it('returns full text when there is no trigger', () => {
    expect(cardAbilityDisplayText('[On Play] Draw 1.', false)).toBe('[On Play] Draw 1.');
  });

  it('strips the trigger clause for preview when hasTrigger is true', () => {
    const text = '[On Play] Draw 1. [Trigger] Play this card.';
    expect(cardAbilityDisplayText(text, true, 'Play this card.')).toBe('[On Play] Draw 1.');
  });
});
