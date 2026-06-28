import { describe, expect, it } from 'vitest';
import { pickCanonicalPrinting } from '../canonicalPrinting';
import {
  sampleCharacterPrintings,
  sampleEventPrinting,
  sampleLeaderPrintings,
} from '../../api/__fixtures__/sampleApiResponses';

describe('pickCanonicalPrinting', () => {
  it('picks the printing whose card_image_id matches card_set_id exactly', () => {
    const { canonical } = pickCanonicalPrinting(sampleCharacterPrintings);
    expect(canonical.card_image_id).toBe('OP01-016');
  });

  it('returns every other printing as alternates, none duplicated', () => {
    const { canonical, alternates } = pickCanonicalPrinting(sampleCharacterPrintings);
    expect(alternates).toHaveLength(sampleCharacterPrintings.length - 1);
    expect(alternates.some((p) => p.card_image_id === canonical.card_image_id)).toBe(false);
  });

  it('warns when printings disagree on card_text (real API behavior, OP01-016 SP variant)', () => {
    const { warnings } = pickCanonicalPrinting(sampleCharacterPrintings);
    expect(warnings.some((w) => w.code === 'inconsistent-text-across-printings')).toBe(true);
  });

  it('does not warn about text mismatch when all printings agree (OP01-001 Leader)', () => {
    const { warnings } = pickCanonicalPrinting(sampleLeaderPrintings);
    expect(warnings.some((w) => w.code === 'inconsistent-text-across-printings')).toBe(false);
  });

  it('handles a single-printing array without ambiguity warnings', () => {
    const { canonical, alternates, warnings } = pickCanonicalPrinting([sampleEventPrinting]);
    expect(canonical.card_set_id).toBe('OP01-119');
    expect(alternates).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('throws on an empty array rather than fabricating a result', () => {
    expect(() => pickCanonicalPrinting([])).toThrow();
  });
});
