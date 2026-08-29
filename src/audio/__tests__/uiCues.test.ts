import { describe, expect, it } from 'vitest';
import { resolveClickCue, resolveHoverCue, type CueElementLike } from '../uiCues';

/** Stand-in for a DOM element: `attrs` is the element, `ancestors` answers closest(). */
function el(attrs: Record<string, string> = {}, ancestors: Record<string, CueElementLike> = {}): CueElementLike {
  const node: CueElementLike = {
    getAttribute: (name) => attrs[name] ?? null,
    closest: (selector) => {
      if (ancestors[selector]) return ancestors[selector];
      // An element is its own nearest match when it satisfies the selector.
      const wanted = selector.split(',').map((s) => s.trim());
      for (const part of wanted) {
        const match = /^\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(part);
        if (!match) continue;
        const [, name, value] = match;
        if (attrs[name] !== undefined && (value === undefined || attrs[name] === value)) return node;
      }
      return null;
    },
  };
  return node;
}

describe('resolveClickCue', () => {
  it('defaults to the primary press', () => {
    expect(resolveClickCue(el())).toBe('ui.click');
  });

  it('lets a component name its own cue', () => {
    expect(resolveClickCue(el({ 'data-sfx': 'ui.deck.save' }))).toBe('ui.deck.save');
  });

  it('lets a component opt out entirely', () => {
    expect(resolveClickCue(el({ 'data-sfx': 'none' }))).toBeNull();
  });

  it('ignores a misspelled cue rather than going silent', () => {
    expect(resolveClickCue(el({ 'data-sfx': 'ui.clickk' }))).toBe('ui.click');
  });

  it('maps roles without naming a cue', () => {
    expect(resolveClickCue(el({ 'data-sfx-role': 'back' }))).toBe('ui.back');
    expect(resolveClickCue(el({ 'data-sfx-role': 'destructive' }))).toBe('ui.deck.remove');
  });

  it('reads a switch as where it is going, not where it has been', () => {
    expect(resolveClickCue(el({ role: 'switch', 'aria-checked': 'false' }))).toBe('ui.toggle.on');
    expect(resolveClickCue(el({ role: 'switch', 'aria-checked': 'true' }))).toBe('ui.toggle.off');
  });

  it('falls back to the accessible label for back-ish controls', () => {
    expect(resolveClickCue(el({ 'aria-label': 'Close settings' }))).toBe('ui.back');
    expect(resolveClickCue(el({ 'aria-label': 'Start match' }))).toBe('ui.click');
  });
});

describe('resolveHoverCue', () => {
  it('is the quiet default', () => {
    expect(resolveHoverCue(el())).toBe('ui.hover');
  });

  it('uses the card variant on card tiles', () => {
    expect(resolveHoverCue(el({ 'data-sfx-role': 'card' }))).toBe('ui.card.hover');
  });

  it('can be silenced per element', () => {
    expect(resolveHoverCue(el({ 'data-sfx-hover': 'none' }))).toBeNull();
  });
});
