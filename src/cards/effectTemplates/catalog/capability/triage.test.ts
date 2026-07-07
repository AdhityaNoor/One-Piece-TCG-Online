import { describe, expect, it } from 'vitest';
import type { ParsedEffect } from '../../../effectParser/types';
import { PARSER_OP_TO_CAPABILITY, classifyTriage } from './triage';

/** Build a minimal ParsedEffect from a list of parser ops (enum fields cast — this test only exercises bucketing). */
function parsed(ops: string[]): ParsedEffect {
  return {
    cardNumber: 'TEST-001',
    abilities: [
      {
        id: 'TEST-001#0',
        category: 'onPlay' as never,
        timing: 'onPlay' as never,
        conditions: [],
        tags: [],
        oncePerTurn: false,
        isTrigger: false,
        cost: null,
        actions: ops.map((op) => ({ op }) as never),
        needsTemplate: true,
        rawText: '',
      },
    ],
    warnings: [],
    needsReview: true,
  };
}

describe('classifyTriage', () => {
  it('maps recognized ops to catalog capabilities and buckets as expressible', () => {
    const v = classifyTriage(parsed(['draw', 'modifyPower']), 'Draw 1 card. This Character gains +2000 power.');
    expect(v.bucket).toBe('expressible');
    expect(v.capabilities).toContain('draw');
    expect(v.capabilities).toContain('addPower');
    expect(v.unmappedOps).toEqual([]);
  });

  it('buckets unrecognized clauses as needsPrimitive and records the unmapped op', () => {
    const v = classifyTriage(parsed(['unrecognized']), 'Some brand new mechanic with no recognizer.');
    expect(v.bucket).toBe('needsPrimitive');
    expect(v.unmappedOps).toContain('unrecognized');
  });

  it('defers replacement effects', () => {
    const v = classifyTriage(parsed(['ko']), "If this Character would be K.O.'d, you may trash 1 card from your hand instead.");
    expect(v.bucket).toBe('defer');
    expect(v.reasons).toContain('replacement-effect');
  });

  it('defers dynamic base-power/scaling text', () => {
    const v = classifyTriage(parsed(['modifyPower']), "This Character's base power becomes the same as your opponent's Leader.");
    expect(v.bucket).toBe('defer');
    expect(v.reasons).toContain('dynamic-scaling');
  });

  it('flags a small missing primitive for combined-total gates', () => {
    const v = classifyTriage(parsed(['ko']), 'K.O. up to 2 of your opponent\u2019s Characters with a total power of 4000 or less.');
    expect(v.bucket).toBe('needsPrimitive');
    expect(v.reasons).toContain('combined-total-gate');
  });

  it('has a capability mapping for every parser op', () => {
    for (const [op, cap] of Object.entries(PARSER_OP_TO_CAPABILITY)) {
      // null is allowed (unrecognized); otherwise it must be a non-empty string
      expect(cap === null || (typeof cap === 'string' && cap.length > 0), `bad mapping for ${op}`).toBe(true);
    }
  });
});
