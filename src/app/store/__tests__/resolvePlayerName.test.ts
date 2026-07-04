import { describe, expect, it } from 'vitest';
import { resolvePlayerName } from '../matchStore';

describe('resolvePlayerName', () => {
  it('returns the username when one is mapped for the seat', () => {
    expect(resolvePlayerName('p1', { p1: 'StrawHatLuffy', p2: 'RoronoaZoro' })).toBe('StrawHatLuffy');
  });

  it('falls back to the raw engine id when unmapped (hotseat shows p1/p2)', () => {
    expect(resolvePlayerName('p2', {})).toBe('p2');
    expect(resolvePlayerName('p2', { p1: 'OnlyPlayerOne' })).toBe('p2');
  });
});
