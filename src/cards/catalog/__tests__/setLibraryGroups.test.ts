import { describe, expect, it } from 'vitest';
import type { SetSummaryDto } from '../../api/types';
import { buildSetLibraryDropdownSections, classifySetLibraryGroup } from '../setLibraryGroups';

function row(id: string): SetSummaryDto {
  return { set_id: id, set_name: id };
}

describe('classifySetLibraryGroup', () => {
  it('maps set code prefixes to product sections', () => {
    expect(classifySetLibraryGroup('ST01')).toBe('structureDeck');
    expect(classifySetLibraryGroup('OP16')).toBe('set');
    expect(classifySetLibraryGroup('EB04')).toBe('extraBooster');
    expect(classifySetLibraryGroup('PRB02')).toBe('premiumBooster');
    expect(classifySetLibraryGroup('P')).toBe('promotional');
  });
});

describe('buildSetLibraryDropdownSections', () => {
  it('groups sets into labeled sections and keeps All Sets separate', () => {
    const sections = buildSetLibraryDropdownSections([
      row('all'),
      row('OP16'),
      row('ST30'),
      row('EB04'),
      row('PRB02'),
      row('P'),
    ]);

    expect(sections.allSets?.set_id).toBe('all');
    expect(sections.groups.map((g) => g.label)).toEqual([
      'Sets',
      'Structure Decks',
      'Extra Booster',
      'Premium Booster',
      'Promo',
    ]);
    expect(sections.groups.find((g) => g.id === 'set')?.sets.map((s) => s.set_id)).toEqual(['OP16']);
  });

  it('omits empty sections', () => {
    const sections = buildSetLibraryDropdownSections([row('all'), row('OP01')]);
    expect(sections.groups.map((g) => g.id)).toEqual(['set']);
  });
});
