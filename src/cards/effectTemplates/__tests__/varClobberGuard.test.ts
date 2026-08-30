/**
 * Regression family: a scaled op counts a variable that a LATER `chooseTargets` has already
 * rebound, so the scale silently reads 1 instead of the real count.
 *
 * `addPower { amountPer }` defaults its counting variable to `t`, and a TARGETED addPower emits
 * its own `chooseTargets var: 't'` for the recipient — so "for every DON!! rested, this Leader
 * gains +2000" multiplied by the number of RECIPIENTS (always 1), not by the number of DON!!
 * (OP13-001, reported in play as a flat +2000).
 *
 * The tell is intent-free and machine-checkable: if the var an `amountPer` / `countVar` reads was
 * last bound by a `chooseTargets` whose `max` is 1, the scale can only ever be 0 or 1 — a scaled
 * op that can never scale is a mistake by construction. The fix is `captureCount` (`copyVar`)
 * before the recipient picker, with `countVar` pointing at the snapshot.
 */
import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments } from '../assembler';
import { ALL_ASSIGNMENTS } from '../assignments';

type AnyOp = Record<string, unknown> & { op: string };

/** Every (op, varName) pair where the op uses a binding as a COUNT. */
function countVarReads(op: AnyOp): string[] {
  const reads: string[] = [];
  if (typeof op.amountPerVar === 'string' && op.amountPer !== undefined) reads.push(op.amountPerVar);
  if (typeof op.countVar === 'string') reads.push(op.countVar);
  return reads;
}

/** The var a binding op writes, if any. */
function boundVar(op: AnyOp): string | undefined {
  if (op.op === 'chooseTargets' && typeof op.var === 'string') return op.var;
  if (op.op === 'copyVar' && typeof op.into === 'string') return op.into;
  if (op.op === 'bindMatchingCards' && typeof op.var === 'string') return op.var;
  return undefined;
}

describe('catalog guard: no scaled op counts a var a target picker has clobbered', () => {
  it('finds zero amountPer/countVar reads bound by a max-1 chooseTargets', () => {
    const registry = buildRegistryFromAssignments(ALL_ASSIGNMENTS);
    const broken: string[] = [];
    const seen = new Set<string>();

    const walk = (cardNumber: string, timing: string, ops: AnyOp[]): void => {
      // varName -> the op that last bound it, walking this op list in order.
      const binders = new Map<string, AnyOp>();
      ops.forEach((op, i) => {
        for (const varName of countVarReads(op)) {
          const binder = binders.get(varName);
          if (binder?.op === 'chooseTargets' && binder.max === 1) {
            broken.push(
              `${cardNumber} [${timing}] op${i} '${op.op}' counts '${varName}', but a max-1 chooseTargets rebound it — the scale is always 1`,
            );
          }
        }
        const written = boundVar(op);
        if (written) binders.set(written, op);
        if (op.op === 'chooseOption') {
          for (const branch of (op.options as { ops?: AnyOp[] }[]) ?? []) walk(cardNumber, timing, branch.ops ?? []);
        }
      });
    };

    for (const [key, program] of Object.entries(registry)) {
      if (!/^[A-Z]/.test(key) || seen.has(program.cardNumber)) continue;
      seen.add(program.cardNumber);
      for (const ability of program.abilities) walk(program.cardNumber, ability.timing, ability.ops as AnyOp[]);
    }

    expect(broken, `scaled ops counting a clobbered var:\n${broken.join('\n')}`).toEqual([]);
  });
});
