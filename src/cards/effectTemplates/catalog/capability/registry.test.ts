/**
 * Guards that the capability registry stays in sync with reality:
 *   1. Every `fn` used across ALL_ASSIGNMENTS has an EFFECT_PRIMITIVES entry.
 *   2. Every gate/cost `kind` used has a GATES or COSTS entry.
 *   3. Every spec is well-formed (non-empty summary + covers), and every
 *      example points at a capability id that matches its own table key.
 *
 * The `Record<Union, Spec>` typing already forces compile-time completeness of
 * the tables themselves; this test guards the reverse direction (nothing in the
 * curated data references a capability the registry forgot to describe).
 */
import { describe, expect, it } from 'vitest';
import { ALL_ASSIGNMENTS } from '../../assignments';
import { COSTS, EFFECT_PRIMITIVES, GATES, type CapabilitySpec } from './registry';

type AnyRecord = Record<string, unknown>;

function bindings(a: AnyRecord): AnyRecord[] {
  return 'templates' in a ? (a.templates as AnyRecord[]) : [a];
}

/** Deep-walk a value, collecting all `fn` names and all `kind` names it contains. */
function collect(value: unknown, fns: Set<string>, kinds: Set<string>): void {
  if (Array.isArray(value)) {
    for (const v of value) collect(v, fns, kinds);
    return;
  }
  if (value && typeof value === 'object') {
    const obj = value as AnyRecord;
    if (typeof obj.fn === 'string') fns.add(obj.fn);
    if (typeof obj.kind === 'string') kinds.add(obj.kind);
    for (const v of Object.values(obj)) collect(v, fns, kinds);
  }
}

const usedFns = new Set<string>();
const usedKinds = new Set<string>();
for (const assignment of ALL_ASSIGNMENTS) {
  for (const b of bindings(assignment as unknown as AnyRecord)) {
    collect((b as AnyRecord).params, usedFns, usedKinds);
  }
}

describe('capability registry coverage', () => {
  it('describes every effect fn used in the curated assignments', () => {
    const missing = [...usedFns].filter((fn) => !(fn in EFFECT_PRIMITIVES)).sort();
    expect(missing, `EFFECT_PRIMITIVES is missing specs for: ${missing.join(', ')}`).toEqual([]);
  });

  it('describes every gate/cost kind used in the curated assignments', () => {
    const missing = [...usedKinds].filter((kind) => !(kind in GATES) && !(kind in COSTS)).sort();
    expect(missing, `GATES/COSTS are missing specs for: ${missing.join(', ')}`).toEqual([]);
  });

  it('has well-formed specs whose id matches the table key', () => {
    const tables: Record<string, Record<string, CapabilitySpec>> = { EFFECT_PRIMITIVES, GATES, COSTS };
    for (const [tableName, table] of Object.entries(tables)) {
      for (const [key, spec] of Object.entries(table)) {
        expect(spec.id, `${tableName}.${key} id mismatch`).toBe(key);
        expect(spec.summary.length, `${tableName}.${key} empty summary`).toBeGreaterThan(0);
        expect(spec.covers.length, `${tableName}.${key} has no covers[]`).toBeGreaterThan(0);
        expect(spec.examples.length, `${tableName}.${key} has no examples[]`).toBeGreaterThan(0);
      }
    }
  });
});
