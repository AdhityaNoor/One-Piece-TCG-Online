/**
 * Printed static-keyword derivation, and a guard that the shipped catalog agrees with it.
 *
 * The flags decide gameplay directly and BEFORE any curated ability: `def.hasBlocker` makes a
 * card a legal blocker with no condition attached, `def.hasRush` makes it non-summoning-sick the
 * turn it is played. They used to come from `text.includes('[Blocker]')`, which also matched a
 * conditional grant, a grant to another card, and a negation — 211 cards carried a keyword the
 * card only mentions.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { derivePrintedKeywordFlags, hasPrintedKeyword, leadingBracketTags } from '../printedKeywords';

describe('leadingBracketTags', () => {
  it('reads the opening tag run', () => {
    expect(leadingBracketTags('[Blocker][On Play] Draw 1 card.')).toEqual(['[Blocker]', '[On Play]']);
  });

  it('steps over reminder text so a second keyword still counts', () => {
    expect(leadingBracketTags('[Rush] (This card can attack on the turn in which it is played.) [Double Attack] (…)'))
      .toEqual(['[Rush]', '[Double Attack]']);
  });

  it('stops at the first non-tag prose', () => {
    expect(leadingBracketTags('If you have 1 or less Life cards, this Character gains [Blocker].')).toEqual([]);
  });
});

describe('hasPrintedKeyword', () => {
  it('counts a leading keyword tag', () => {
    expect(hasPrintedKeyword('[Blocker] (After your opponent declares an attack…)', 'Blocker')).toBe(true);
  });

  it('counts a keyword clause that follows a completed sentence', () => {
    expect(hasPrintedKeyword('Give this card in your hand −5 cost.[Blocker] (After your opponent…)', 'Blocker')).toBe(true);
  });

  it('does NOT count a conditional self-grant', () => {
    expect(hasPrintedKeyword('If you have 1 or less Life cards, this Character gains [Blocker].', 'Blocker')).toBe(false);
  });

  it('does NOT count a grant to another card', () => {
    expect(hasPrintedKeyword('Your [Blugori] gains [Blocker].', 'Blocker')).toBe(false);
    expect(hasPrintedKeyword('[On Play] Up to 1 of your Characters gains [Double Attack] during this turn.', 'Double Attack')).toBe(false);
  });

  it('does NOT count a negation or a target description', () => {
    expect(hasPrintedKeyword('[When Attacking] Your opponent cannot activate [Blocker] during this battle.', 'Blocker')).toBe(false);
    expect(hasPrintedKeyword('[When Attacking] Rest up to 1 of your opponent\'s [Blocker] Characters.', 'Blocker')).toBe(false);
  });

  it('never reads [Rush: Character] as [Rush]', () => {
    // A DIFFERENT keyword: attacks Characters on the turn it is played, never the Leader.
    expect(hasPrintedKeyword('[Rush: Character][When Attacking] …', 'Rush')).toBe(false);
  });
});

describe('the shipped catalog agrees with the derivation', () => {
  const SETS_DIR = resolve(__dirname, '../../../../public/cards/sets');
  type CatalogCard = {
    cardNumber: string;
    en?: { effectText?: string };
    definition?: Record<string, unknown>;
  };
  const catalog: CatalogCard[] = readdirSync(SETS_DIR)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => JSON.parse(readFileSync(resolve(SETS_DIR, f), 'utf8')) as CatalogCard[]);

  it('loaded the catalog at all', () => {
    expect(catalog.length).toBeGreaterThan(2000);
  });

  it('every stored flag matches what the card text says', () => {
    const mismatches: string[] = [];
    for (const card of catalog) {
      const def = card.definition;
      if (!def) continue;
      const derived = derivePrintedKeywordFlags(card.en?.effectText ?? (def.text as string) ?? '');
      for (const [flag, value] of Object.entries(derived)) {
        if (!(flag in def)) continue;
        if (Boolean(def[flag]) !== value) mismatches.push(`${card.cardNumber} ${flag}: stored=${String(def[flag])} derived=${value}`);
      }
    }
    expect(mismatches, `catalog flags out of sync with the card text:\n${mismatches.slice(0, 40).join('\n')}`).toEqual([]);
  });
});
