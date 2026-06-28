import { describe, expect, it } from 'vitest';
import { filterCardLibraryEntries } from '../filterCardLibraryEntries';
import type { CardLibraryEntry } from '../cardPrintingSummary';
import type { CardDefinition } from '../../../engine/state/card';

function makeEntry(definitionOverrides: Partial<CardDefinition>): CardLibraryEntry {
  const definition: CardDefinition = {
    cardDefinitionId: definitionOverrides.cardNumber ?? 'OP01-001',
    name: 'Monkey D. Luffy',
    category: 'character',
    colors: ['red'],
    types: ['Straw Hat Crew'],
    text: '',
    hasTrigger: false,
    hasRush: false,
    hasBlocker: false,
    hasDoubleAttack: false,
    isUnblockable: false,
    cardNumber: 'OP01-001',
    ...definitionOverrides,
  };
  return { cardNumber: definition.cardNumber, definition, printings: [], rawPrintings: [], warnings: [] };
}

describe('filterCardLibraryEntries', () => {
  const luffy = makeEntry({ name: 'Monkey D. Luffy', cardNumber: 'OP01-001', colors: ['red'], category: 'character' });
  const zoro = makeEntry({ name: 'Roronoa Zoro', cardNumber: 'OP01-002', colors: ['green'], category: 'character' });
  const leader = makeEntry({ name: 'Monkey D. Luffy', cardNumber: 'OP01-099', colors: ['red'], category: 'leader' });
  const entries = [luffy, zoro, leader];

  it('returns everything when the filter is empty', () => {
    expect(filterCardLibraryEntries(entries, {})).toEqual(entries);
  });

  it('matches query against name, case-insensitively', () => {
    expect(filterCardLibraryEntries(entries, { query: 'luffy' })).toEqual([luffy, leader]);
  });

  it('matches query against card number', () => {
    expect(filterCardLibraryEntries(entries, { query: 'op01-002' })).toEqual([zoro]);
  });

  it('filters by color (OR across the provided list)', () => {
    expect(filterCardLibraryEntries(entries, { colors: ['green'] })).toEqual([zoro]);
  });

  it('filters by category', () => {
    expect(filterCardLibraryEntries(entries, { categories: ['leader'] })).toEqual([leader]);
  });

  it('combines query and facet filters with AND', () => {
    expect(filterCardLibraryEntries(entries, { query: 'luffy', categories: ['character'] })).toEqual([luffy]);
  });
});
