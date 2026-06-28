import { describe, expect, it } from 'vitest';
import { normalizeCardPrintings, normalizeDonCard } from '../normalizeCardPrinting';
import {
  sampleCharacterPrintings,
  sampleDonCard,
  sampleEventPrinting,
  sampleLeaderPrintings,
} from '../../api/__fixtures__/sampleApiResponses';

describe('normalizeCardPrintings — Leader (OP01-001)', () => {
  const { definition, warnings } = normalizeCardPrintings(sampleLeaderPrintings);

  it('maps identity and category fields', () => {
    expect(definition.cardDefinitionId).toBe('OP01-001');
    expect(definition.cardNumber).toBe('OP01-001');
    expect(definition.category).toBe('leader');
    expect(definition.name).toBe('Roronoa Zoro (001)');
  });

  it('coerces string-encoded numeric fields to real numbers', () => {
    expect(definition.basePower).toBe(5000);
    expect(definition.life).toBe(5);
  });

  it('leaves Leader-only-null fields (cost, counter) undefined rather than 0', () => {
    expect(definition.baseCost).toBeUndefined();
    expect(definition.counter).toBeUndefined();
  });

  it('maps color and attribute', () => {
    expect(definition.colors).toEqual(['red']);
    expect(definition.attributes).toEqual(['slash']);
  });

  it('preserves raw card text verbatim, including the [DON!! xX] tag as plain text', () => {
    expect(definition.text).toBe('[DON!! x1] [Your Turn] All of your Characters gain +1000 power.');
  });

  it('has no triggerText when hasTrigger is false', () => {
    expect(definition.hasTrigger).toBe(false);
    expect(definition.triggerText).toBeUndefined();
  });

  it('produces no text-mismatch warning when both printings agree (still warns about unsplit sub_types, which is unrelated)', () => {
    expect(warnings.some((w) => w.code === 'inconsistent-text-across-printings')).toBe(false);
  });
});

describe('normalizeCardPrintings — Character (OP01-016, disagreeing printings)', () => {
  const { definition, alternatePrintingImageIds, warnings } = normalizeCardPrintings(sampleCharacterPrintings);

  it('uses the base printing card_text, not an SP/Parallel variant', () => {
    expect(definition.text).toContain('"Straw Hat Crew" type Character card');
  });

  it('normalizes counter_amount (a real number) directly, distinct from cost/power strings', () => {
    expect(definition.counter).toBe(2000);
  });

  it('detects [Trigger]/hasTrigger correctly as false when absent', () => {
    expect(definition.hasTrigger).toBe(false);
  });

  it('lists every non-canonical printing as an alternate image id', () => {
    expect(alternatePrintingImageIds.sort()).toEqual(['OP01-016_p1', 'OP01-016_p2', 'OP01-016_p8']);
  });

  it('surfaces the cross-printing text mismatch as a warning, not a silent choice', () => {
    expect(warnings.some((w) => w.code === 'inconsistent-text-across-printings')).toBe(true);
  });
});

describe('normalizeCardPrintings — Event with ambiguous multi-word sub_types (OP01-119)', () => {
  const { definition, warnings } = normalizeCardPrintings([sampleEventPrinting]);

  it('has no power/life and a numeric cost', () => {
    expect(definition.basePower).toBeUndefined();
    expect(definition.life).toBeUndefined();
    expect(definition.baseCost).toBe(2);
  });

  it('detects [Trigger] presence in card text', () => {
    expect(definition.hasTrigger).toBe(true);
  });

  it('extracts triggerText as a best-effort substring and flags it with a warning', () => {
    expect(definition.triggerText).toBe("Add up to 1 DON!! card from your DON!! deck and set it as active.  This card has been officially errata'd.");
    expect(warnings.some((w) => w.code === 'trigger-text-best-effort')).toBe(true);
  });

  it('preserves the unsplit sub_types string as a single type tag', () => {
    expect(definition.types).toEqual(['Animal Kingdom Pirates The Four Emperors']);
  });

  it('warns that the type tag was not split', () => {
    expect(warnings.some((w) => w.code === 'unsplit-sub-types')).toBe(true);
  });

  it('has no attribute (null in source) and no counter (Event, not Character)', () => {
    expect(definition.attributes).toBeUndefined();
    expect(definition.counter).toBeUndefined();
  });
});

describe('normalizeDonCard', () => {
  const { definition } = normalizeDonCard(sampleDonCard);

  it('maps to category "don" with no power/cost/color', () => {
    expect(definition.category).toBe('don');
    expect(definition.colors).toEqual([]);
    expect(definition.basePower).toBeUndefined();
  });

  it('uses card_image_id as the stable identifier since DON!! rows have no card_set_id', () => {
    expect(definition.cardDefinitionId).toBe('don_166');
  });
});
