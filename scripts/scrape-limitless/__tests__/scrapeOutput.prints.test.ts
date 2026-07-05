/**
 * Tests for the prints assembly in scrapeOutput: variantId recovery from real
 * CDN filenames, buildPrint (base vs alternate art), and that buildLimitlessCard
 * emits a prints[] array with the base first and alternate arts flagged.
 */
import { describe, expect, it } from 'vitest';
import { buildLimitlessCard, buildPrint, variantIdFromImageUrl, type PrintInput } from '../scrapeOutput';
import type { ParsedCardPage } from '../types';

function parsed(overrides: Partial<ParsedCardPage>): ParsedCardPage {
  return {
    cardNumber: 'OP01-016',
    name: 'Nami',
    category: 'character',
    colors: ['red'],
    attributes: ['special'],
    legality: {},
    effectText: '[On Play] Draw 1.',
    types: ['Straw Hat Crew'],
    cost: 1,
    power: 2000,
    counter: 1000,
    ogImage: null,
    printLabel: null,
    printKind: null,
    illustrator: null,
    variantParams: [],
    warnings: [],
    ...overrides,
  };
}

describe('variantIdFromImageUrl', () => {
  it('returns "" for a base image and "pN" for alternate arts', () => {
    expect(variantIdFromImageUrl('https://cdn/one-piece/OP01/OP01-016_EN.webp', 'OP01-016')).toBe('');
    expect(variantIdFromImageUrl('https://cdn/one-piece/OP01/OP01-016_p1_EN.webp', 'OP01-016')).toBe('p1');
    expect(variantIdFromImageUrl('https://cdn/one-piece/OP01/OP01-016_p12_JP.webp', 'OP01-016')).toBe('p12');
    expect(variantIdFromImageUrl(null, 'OP01-016')).toBeNull();
  });
});

describe('buildPrint', () => {
  it('builds a base print (variantParam 0) as not-alternate with variantId ""', () => {
    const input: PrintInput = {
      variantParam: 0,
      enParse: parsed({ ogImage: 'https://cdn/OP01/OP01-016_EN.webp', printLabel: 'Romance Dawn (OP01) Rare', printKind: 'Rare' }),
      jpParse: null,
      enImage: { status: 'downloaded', file: 'images/OP01/OP01-016_EN.webp' },
    };
    const print = buildPrint('OP01-016', 'OP01', input);
    expect(print.isAlternateArt).toBe(false);
    expect(print.variantId).toBe('');
    expect(print.printKind).toBe('Rare');
    expect(print.en.imageUrl).toBe('https://cdn/OP01/OP01-016_EN.webp');
    expect(print.en.imageFile).toBe('images/OP01/OP01-016_EN.webp');
  });

  it('builds an alternate art (variantParam 1) with variantId from the real filename', () => {
    const input: PrintInput = {
      variantParam: 1,
      enParse: parsed({ ogImage: 'https://cdn/OP01/OP01-016_p1_EN.webp', printLabel: 'Romance Dawn (OP01) Alternate Art', printKind: 'Alternate Art', illustrator: 'Sunohara' }),
      jpParse: null,
      enImage: { status: 'downloaded', file: 'images/OP01/OP01-016_p1_EN.webp' },
    };
    const print = buildPrint('OP01-016', 'OP01', input);
    expect(print.isAlternateArt).toBe(true);
    expect(print.variantId).toBe('p1');
    expect(print.printKind).toBe('Alternate Art');
    expect(print.illustrator).toBe('Sunohara');
    expect(print.en.pageUrl).toContain('?v=1');
  });
});

describe('buildLimitlessCard prints[]', () => {
  const base: PrintInput = {
    variantParam: 0,
    enParse: parsed({ ogImage: 'https://cdn/OP01/OP01-016_EN.webp' }),
    jpParse: parsed({ name: 'ナミ', ogImage: 'https://cdn/OP01/OP01-016_JP.webp' }),
    enImage: { status: 'downloaded', file: 'images/OP01/OP01-016_EN.webp' },
    jpImage: { status: 'downloaded', file: 'images/OP01/OP01-016_JP.webp' },
  };
  const alt: PrintInput = {
    variantParam: 1,
    enParse: parsed({ ogImage: 'https://cdn/OP01/OP01-016_p1_EN.webp', printKind: 'Alternate Art' }),
    jpParse: null,
    enImage: { status: 'downloaded', file: 'images/OP01/OP01-016_p1_EN.webp' },
  };

  it('emits base-first prints with alt arts flagged, and keeps base en/jp images', () => {
    // Deliberately pass alt before base to prove ordering by variantParam.
    const card = buildLimitlessCard('OP01-016', base.enParse!, base.enParse, base.jpParse, '2026-07-05T00:00:00Z', [alt, base]);
    expect(card.prints.map((p) => p.variantId)).toEqual(['', 'p1']);
    expect(card.prints[0].isAlternateArt).toBe(false);
    expect(card.prints[1].isAlternateArt).toBe(true);
    // Base en/jp block still resolves to the base print's art.
    expect(card.en.imageUrl).toBe('https://cdn/OP01/OP01-016_EN.webp');
    expect(card.en.name).toBe('Nami');
    expect(card.jp.name).toBe('ナミ');
  });
});
