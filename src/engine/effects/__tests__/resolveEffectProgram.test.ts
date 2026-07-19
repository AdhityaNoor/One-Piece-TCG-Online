/**
 * Unit coverage for the cardDefinitionId → cardNumber fallback used by
 * match UI / AI legalActions / engine firing when deck snapshots key
 * definitions by a stable id other than the printed set number.
 */
import { describe, expect, it } from 'vitest';
import type { EffectProgram } from '../effectIr';
import { resolveEffectProgram } from '../fireTiming';
import { makeLeaderDef } from '../../rules/shared/__tests__/testRig';

const stubProgram = (cardNumber: string): EffectProgram => ({
  cardNumber,
  abilities: [{ timing: 'onOpponentsAttack', functions: [] }],
});

describe('resolveEffectProgram', () => {
  it('returns the program keyed by cardDefinitionId when present', () => {
    const def = makeLeaderDef({
      cardDefinitionId: 'OP09-001_snapshot',
      cardNumber: 'OP09-001',
      name: 'Shanks',
    });
    const program = stubProgram('OP09-001');
    const registry = { [def.cardDefinitionId]: program };
    expect(resolveEffectProgram(registry, { [def.cardDefinitionId]: def }, def.cardDefinitionId)).toBe(program);
  });

  it('falls back to printed cardNumber when definition id is absent from registry', () => {
    const def = makeLeaderDef({
      cardDefinitionId: 'OP09-001_snapshot',
      cardNumber: 'OP09-001',
      name: 'Shanks',
    });
    const program = stubProgram('OP09-001');
    const registry = { 'OP09-001': program };
    expect(resolveEffectProgram(registry, { [def.cardDefinitionId]: def }, def.cardDefinitionId)).toBe(program);
  });

  it('returns undefined when neither key matches', () => {
    expect(resolveEffectProgram({}, {}, 'missing')).toBeUndefined();
  });
});
