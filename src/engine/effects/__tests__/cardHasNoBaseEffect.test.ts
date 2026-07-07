import { describe, expect, it } from 'vitest';
import { cardHasNoBaseEffect } from '../cardHasNoBaseEffect';

describe('cardHasNoBaseEffect', () => {
  it('is true for empty text without trigger', () => {
    expect(cardHasNoBaseEffect({ text: '', hasTrigger: false })).toBe(true);
  });

  it('is true for keyword-only text without trigger', () => {
    expect(cardHasNoBaseEffect({ text: '[Blocker] (After your opponent declares an attack...)', hasTrigger: false })).toBe(true);
  });

  it('is false when card has a trigger', () => {
    expect(cardHasNoBaseEffect({ text: '[Trigger] Draw 1 card.', hasTrigger: true })).toBe(false);
  });

  it('is false when card has non-keyword effect text', () => {
    expect(cardHasNoBaseEffect({ text: '[On Play] Draw 1 card.', hasTrigger: false })).toBe(false);
  });
});
