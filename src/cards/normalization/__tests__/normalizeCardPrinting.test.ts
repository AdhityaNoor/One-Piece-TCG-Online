import { describe, expect, it } from 'vitest';
import { normalizeCardPrintings, normalizeDonCard } from '../normalizeCardPrinting';
import type { CardPrintingDto } from '../../api/types';
import {
  sampleCharacterPrintings,
  sampleDonCard,
  sampleEventPrinting,
  sampleLeaderPrintings,
  samplePromoPrintingWithMissingImage,
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

  it('has every keyword flag false when none of the keywords appear in text', () => {
    expect(definition.hasRush).toBe(false);
    expect(definition.hasBlocker).toBe(false);
    expect(definition.hasDoubleAttack).toBe(false);
    expect(definition.isUnblockable).toBe(false);
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

describe('normalizeCardPrintings - multicolor leader color parsing', () => {
  it('parses live API space-separated colors, e.g. OP01-061 Kaido "Blue Purple"', () => {
    const kaido: CardPrintingDto = {
      ...sampleLeaderPrintings[0],
      card_name: 'Kaido (061)',
      card_set_id: 'OP01-061',
      card_image_id: 'OP01-061',
      card_color: 'Blue Purple',
      life: '4',
      sub_types: 'Animal Kingdom Pirates The Four Emperors',
      attribute: 'Strike',
    };

    const { definition, warnings } = normalizeCardPrintings([kaido]);

    expect(definition.colors).toEqual(['blue', 'purple']);
    expect(warnings.some((warning) => warning.code === 'unrecognized-color')).toBe(false);
  });
});

describe('normalizeCardPrintings - local catalog type cleanup', () => {
  it('splits explicit slash-delimited type lists into separate type tags', () => {
    const teach: CardPrintingDto = {
      ...sampleLeaderPrintings[0],
      card_name: 'Marshall.D.Teach',
      card_set_id: 'OP09-081',
      card_image_id: 'OP09-081',
      sub_types: 'The Four Emperors / Blackbeard Pirates',
    };

    const { definition } = normalizeCardPrintings([teach]);

    expect(definition.types).toEqual(['The Four Emperors', 'Blackbeard Pirates']);
  });

  it('repairs known corrupted OP09 Blackbeard Pirates local catalog type rows', () => {
    const laffitte: CardPrintingDto = {
      ...sampleCharacterPrintings[0],
      card_name: 'Laffitte',
      card_set_id: 'OP09-095',
      card_image_id: 'OP09-095',
      sub_types: 'Suzume Muraichi',
    };

    const { definition } = normalizeCardPrintings([laffitte]);

    expect(definition.types).toEqual(['Blackbeard Pirates']);
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

  it('has every keyword flag false (DON!! cards never carry battle keywords)', () => {
    expect(definition.hasTrigger).toBe(false);
    expect(definition.hasRush).toBe(false);
    expect(definition.hasBlocker).toBe(false);
    expect(definition.hasDoubleAttack).toBe(false);
    expect(definition.isUnblockable).toBe(false);
  });
});

describe('normalizeCardPrintings — battle keyword detection (10-1, 10-2)', () => {
  it('detects [Rush] presence (real API row, P-001 Egghead promo)', () => {
    const { definition } = normalizeCardPrintings([samplePromoPrintingWithMissingImage]);
    expect(definition.hasRush).toBe(true);
    expect(definition.hasBlocker).toBe(false);
    expect(definition.hasDoubleAttack).toBe(false);
    expect(definition.isUnblockable).toBe(false);
  });

  function withText(card_text: string): CardPrintingDto {
    return { ...sampleCharacterPrintings[0], card_text };
  }

  it('detects [Rush: Character] as hasRush too', () => {
    const { definition } = normalizeCardPrintings([withText('[Rush: Character] This card can attack the turn it is played.')]);
    expect(definition.hasRush).toBe(true);
  });

  it('detects [Blocker] presence', () => {
    const { definition } = normalizeCardPrintings([withText('[Blocker]')]);
    expect(definition.hasBlocker).toBe(true);
    expect(definition.hasRush).toBe(false);
  });

  it('detects [Double Attack] presence', () => {
    const { definition } = normalizeCardPrintings([withText('[Double Attack]')]);
    expect(definition.hasDoubleAttack).toBe(true);
  });

  it('detects [Unblockable] presence', () => {
    const { definition } = normalizeCardPrintings([withText('[Unblockable]')]);
    expect(definition.isUnblockable).toBe(true);
  });
});
