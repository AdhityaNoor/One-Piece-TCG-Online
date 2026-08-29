import { describe, expect, it } from 'vitest';
import { formatSetLibraryOptionLabel, resolveSetDisplayName } from '../setDisplayNames';

describe('setDisplayNames', () => {
  it('resolves known set codes to display names', () => {
    expect(resolveSetDisplayName('OP01')).toBe('Romance Dawn');
    expect(resolveSetDisplayName('ST01')).toBe('Straw Hat Crew');
    expect(resolveSetDisplayName('EB04')).toBe('Egghead Crisis');
  });

  it('names the ST31-ST36 starter decks (catalog shipped them as bare codes)', () => {
    expect(resolveSetDisplayName('ST31')).toBe('RED Monkey.D.Luffy');
    expect(resolveSetDisplayName('ST33')).toBe('BLUE Kuzan');
    expect(resolveSetDisplayName('ST35')).toBe('RED/BLACK Sabo');
    expect(formatSetLibraryOptionLabel('ST36')).toBe('YELLOW Eustass"Captain"Kid (ST36)');
  });

  it('falls back to the provided name or code when unknown', () => {
    expect(resolveSetDisplayName('ZZ99', 'Custom Name')).toBe('Custom Name');
    expect(resolveSetDisplayName('ZZ99')).toBe('ZZ99');
  });

  it('formats dropdown labels as "Name (CODE)"', () => {
    expect(formatSetLibraryOptionLabel('OP01')).toBe('Romance Dawn (OP01)');
    expect(formatSetLibraryOptionLabel('all')).toBe('All Sets');
  });
});
