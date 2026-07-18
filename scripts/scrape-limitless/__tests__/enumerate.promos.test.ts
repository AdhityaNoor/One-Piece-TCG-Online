import { describe, expect, it } from 'vitest';
import { _internals } from '../enumerate';

const { extractSetSlugs, extractCardNumbers } = _internals;

describe('enumerate promo index', () => {
  it('extracts promo product slugs from /cards/promos-style HTML', () => {
    const html = `
      <a href="/cards/promos">Promos</a>
      <a href="/cards/advanced">Advanced</a>
      <a href="/cards/en/P-001">card</a>
      <a href="/cards/tournament-pack-12">Tournament Pack 2025 Vol.4</a>
      <a href="/cards/misc-promos">Misc. Promos</a>
      <a href="/cards/prize-cards">Prize Cards</a>
      <a href="/cards/welcome-pack-2026-1">Welcome Pack</a>
    `;
    const slugs = extractSetSlugs(html).sort();
    expect(slugs).toEqual([
      'misc-promos',
      'prize-cards',
      'tournament-pack-12',
      'welcome-pack-2026-1',
    ]);
  });

  it('still extracts booster set slugs from /cards-style HTML', () => {
    const html = `
      <a href="/cards/promos">Promos</a>
      <a href="/cards/op01-romance-dawn">OP01</a>
      <a href="/cards/st01-straw-hat-crew">ST01</a>
      <a href="/cards/OP01-016">card number path</a>
    `;
    expect(extractSetSlugs(html).sort()).toEqual(['op01-romance-dawn', 'st01-straw-hat-crew']);
  });

  it('extracts P-* card numbers from a promo product page', () => {
    const html = `
      <a href="/cards/P-001">P-001</a>
      <a href="/cards/en/P-042">EN</a>
      <a href="/cards/OP01-016">reprint</a>
      <a href="/cards/p-099">lower</a>
    `;
    expect(extractCardNumbers(html).sort()).toEqual(['OP01-016', 'P-001', 'P-042', 'P-099']);
  });
});
