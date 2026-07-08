import { describe, expect, it } from 'vitest';
import { formatSetLibraryOptionLabel, resolveSetDisplayName } from '../setDisplayNames';

describe('setDisplayNames', () => {
  it('resolves known set codes to display names', () => {
    expect(resolveSetDisplayName('OP01')).toBe('Romance Dawn');
    expect(resolveSetDisplayName('ST01')).toBe('Straw Hat Crew');
    expect(resolveSetDisplayName('EB04')).toBe('Egghead Crisis');
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
