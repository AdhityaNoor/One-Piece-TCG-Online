import { describe, expect, it } from 'vitest';
import { parseClipboardDeckList } from '../clipboardImport';

describe('parseClipboardDeckList', () => {
  it('parses every example from the spec: variant with letter+digit, variant, and no variant', () => {
    const input = '1xOP09-081_p2\n4xOP09-083_r1\n3xOP09-093';
    const result = parseClipboardDeckList(input);

    expect(result.invalidLines).toEqual([]);
    expect(result.entries).toEqual([
      { cardId: 'OP09-081', variant: 'p2', quantity: 1, sourceLines: ['1xOP09-081_p2'] },
      { cardId: 'OP09-083', variant: 'r1', quantity: 4, sourceLines: ['4xOP09-083_r1'] },
      { cardId: 'OP09-093', variant: null, quantity: 3, sourceLines: ['3xOP09-093'] },
    ]);
    expect(result.totalQuantity).toBe(8);
    expect(result.totalQuantityByCardId).toEqual({
      'OP09-081': 1,
      'OP09-083': 4,
      'OP09-093': 3,
    });
  });

  it('preserves the raw input verbatim, including whitespace, on the result', () => {
    const input = '  1xOP09-093  \n\n4xOP09-083_r1';
    const result = parseClipboardDeckList(input);
    expect(result.rawInput).toBe(input);
  });

  it('ignores blank/whitespace-only lines without reporting them as invalid', () => {
    const input = '1xOP09-093\n\n   \n4xOP09-083_r1\n';
    const result = parseClipboardDeckList(input);
    expect(result.invalidLines).toEqual([]);
    expect(result.entries).toHaveLength(2);
  });

  it('reports an unparseable line but keeps parsing the valid lines around it', () => {
    const input = '1xOP09-093\nthis is not a card line\n4xOP09-083_r1';
    const result = parseClipboardDeckList(input);

    expect(result.entries).toHaveLength(2);
    expect(result.invalidLines).toHaveLength(1);
    expect(result.invalidLines[0]).toMatchObject({
      lineNumber: 2,
      raw: 'this is not a card line',
    });
    expect(result.invalidLines[0].reason).toMatch(/Unrecognized format/);
  });

  it('gives a specific reason when a line looks like a bare card id missing its quantity prefix', () => {
    const result = parseClipboardDeckList('OP09-093');
    expect(result.invalidLines).toHaveLength(1);
    expect(result.invalidLines[0].reason).toBe('Missing quantity prefix — expected something like "1xOP09-093".');
  });

  it('rejects a zero quantity with a specific reason, distinct from a generic format error', () => {
    const result = parseClipboardDeckList('0xOP09-093');
    expect(result.entries).toEqual([]);
    expect(result.invalidLines).toHaveLength(1);
    expect(result.invalidLines[0].reason).toBe('Quantity must be at least 1 (got "0").');
  });

  it('aggregates duplicate lines (same cardId + same variant) into one entry, summing quantity and recording every source line', () => {
    const input = '2xOP09-083_r1\n2xOP09-083_r1';
    const result = parseClipboardDeckList(input);

    expect(result.entries).toEqual([
      { cardId: 'OP09-083', variant: 'r1', quantity: 4, sourceLines: ['2xOP09-083_r1', '2xOP09-083_r1'] },
    ]);
  });

  it('keeps different variants of the same cardId as separate entries, but sums them in totalQuantityByCardId', () => {
    const input = '2xOP09-083_r1\n1xOP09-083_p1\n1xOP09-083';
    const result = parseClipboardDeckList(input);

    expect(result.entries).toHaveLength(3);
    expect(result.totalQuantityByCardId).toEqual({ 'OP09-083': 4 });
  });

  it('uppercases cardId for consistent matching, without altering variant casing', () => {
    const result = parseClipboardDeckList('2xop09-083_r1');
    expect(result.entries[0].cardId).toBe('OP09-083');
    expect(result.entries[0].variant).toBe('r1');
  });

  it('tolerates whitespace around the x separator', () => {
    const result = parseClipboardDeckList('1 x OP09-093');
    expect(result.invalidLines).toEqual([]);
    expect(result.entries[0]).toMatchObject({ cardId: 'OP09-093', variant: null, quantity: 1 });
  });

  it('handles CRLF line endings the same as LF', () => {
    const result = parseClipboardDeckList('1xOP09-093\r\n4xOP09-083_r1\r\n');
    expect(result.invalidLines).toEqual([]);
    expect(result.entries).toHaveLength(2);
  });

  it('numbers invalid lines by their 1-based position in the original input, counting blank lines', () => {
    const input = '1xOP09-093\n\nnot a card\n4xOP09-083_r1';
    const result = parseClipboardDeckList(input);
    expect(result.invalidLines[0].lineNumber).toBe(3);
  });

  it('returns empty entries/invalidLines for an empty or whitespace-only input', () => {
    const result = parseClipboardDeckList('   \n  \n');
    expect(result.entries).toEqual([]);
    expect(result.invalidLines).toEqual([]);
    expect(result.totalQuantity).toBe(0);
  });
});
