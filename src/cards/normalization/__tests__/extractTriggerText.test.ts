import { describe, expect, it } from 'vitest';
import { extractTriggerText } from '../extractTriggerText';
import type { NormalizationWarning } from '../warnings';

describe('extractTriggerText', () => {
  it('returns undefined and emits no warning when "[Trigger]" is absent', () => {
    const warnings: NormalizationWarning[] = [];
    const result = extractTriggerText('[On Play] Draw 1 card.', 'OP00-000', warnings);
    expect(result).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it('extracts to end of string when no further bracketed keyword follows [Trigger]', () => {
    const warnings: NormalizationWarning[] = [];
    const result = extractTriggerText(
      '[Counter] Gain +4000 power. [Trigger] Add up to 1 DON!! card from your DON!! deck and set it as active.  This card has been officially errata\'d.',
      'OP01-119',
      warnings,
    );
    expect(result).toBe("Add up to 1 DON!! card from your DON!! deck and set it as active.  This card has been officially errata'd.");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe('trigger-text-best-effort');
    expect(warnings[0].cardNumber).toBe('OP01-119');
  });

  it('stops at the next bracketed keyword after [Trigger], not the whole remainder', () => {
    const warnings: NormalizationWarning[] = [];
    const result = extractTriggerText('[Trigger] Draw 1 card. [On K.O.] Do something else.', 'OP00-001', warnings);
    expect(result).toBe('Draw 1 card.');
    expect(warnings).toHaveLength(1);
  });

  it('returns undefined (and no warning) when [Trigger] has no trailing text at all', () => {
    const warnings: NormalizationWarning[] = [];
    const result = extractTriggerText('Some setup text. [Trigger]', 'OP00-002', warnings);
    expect(result).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it('ignores bracketed keywords that appear BEFORE [Trigger]', () => {
    const warnings: NormalizationWarning[] = [];
    const result = extractTriggerText('[On Play] Look at 1 card. [Trigger] K.O. up to 1 of your opponent\'s Characters with 3000 power or less.', 'OP00-003', warnings);
    expect(result).toBe("K.O. up to 1 of your opponent's Characters with 3000 power or less.");
  });
});
