import { describe, expect, it } from 'vitest';
import { cardTypeIncludes } from '../typeMatching';

describe('cardTypeIncludes', () => {
  it('matches slash and compacted spacing variants', () => {
    expect(cardTypeIncludes(['The Seven Warlords of the Sea/BlackbeardPirates'], 'Blackbeard Pirates')).toBe(true);
    expect(cardTypeIncludes(['The Seven Warlords of the Sea', 'Blackbeard Pirates'], 'Blackbeard Pirates')).toBe(true);
  });

  it('matches conservative localized aliases from saved snapshots', () => {
    expect(cardTypeIncludes(['\u738B\u4E0B\u4E03\u6B66\u6D77', '\u9ED2\u3072\u3052\u6D77\u8CCA\u56E3'], 'Blackbeard Pirates')).toBe(true);
  });

  it('does not match unrelated pirate crews', () => {
    expect(cardTypeIncludes(['Whitebeard Pirates'], 'Blackbeard Pirates')).toBe(false);
  });
});
