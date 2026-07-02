import { describe, expect, it } from 'vitest';
import { isStaticEngineKeywordOnly } from '../staticKeywordOnly';

describe('isStaticEngineKeywordOnly', () => {
  it('accepts bare engine-backed keyword reminder text', () => {
    expect(isStaticEngineKeywordOnly('[Blocker] (After your opponent declares an attack, you may rest this card.)')).toBe(true);
    expect(isStaticEngineKeywordOnly('[Rush] (This card can attack on the turn in which it is played.)')).toBe(true);
  });

  it('rejects conditional or granted keyword effects', () => {
    expect(isStaticEngineKeywordOnly('If you have a [Sarfunkel], this Character gains [Blocker].')).toBe(false);
    expect(isStaticEngineKeywordOnly('[On Play] This Character gains [Rush] during this turn.')).toBe(false);
  });

  it('accepts Banish once backed by the damage step', () => {
    expect(isStaticEngineKeywordOnly('[Banish] (When this card deals damage, the target card is trashed.)')).toBe(true);
  });
});
