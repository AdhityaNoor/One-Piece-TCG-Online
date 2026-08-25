/**
 * Semantic family: ONE optional payment gating SEVERAL downstream clauses.
 *
 * Cards shaped like "you may trash 1 card from your hand: do A. Then, do B."
 * have a single payment that both A and B hang off. The obvious wiring —
 * `ifPrevious: 'previousMovedAny'` on each clause in turn — is WRONG for
 * anything past the first clause, because ifPrevious reads the sequence-local
 * `__lastMoved` binding, and every intervening move op overwrites it. Clause B
 * then silently gates on "did clause A move something?" instead of "was the
 * payment made?".
 *
 * effectIr.ts states the rule this violates: a plain "Then" is not an
 * ifPrevious gate, and choosing 0 for an "up to" effect still counts as
 * resolving the prior function.
 *
 * The correct shape captures the payment into a sequence-local var
 * (`captureCount` from `__lastMovedIds`) and gates every dependent clause on
 * that var via `ifGate` + `boundVarsTotalCount`.
 *
 * Regression origin: ST34-004, where declining the "up to 1" Life move — or
 * simply having an empty deck — swallowed the base-power-to-0 rider that the
 * player had already paid a card for.
 */
import { describe, expect, it } from 'vitest';
import { buildRegistryFromAssignments, type CardEffectAssignment } from '../assembler';
import { ST34_ASSIGNMENTS } from '../assignments/ST34';

type Op = Record<string, unknown> & { op: string };

function opsOf(assignments: CardEffectAssignment[], cardNumber: string): Op[] {
  const entry = assignments.find((a) => a.cardNumber === cardNumber);
  if (!entry) throw new Error(`no assignment for ${cardNumber}`);
  const program = buildRegistryFromAssignments([entry])[cardNumber];
  return program.abilities.flatMap((a) => a.ops) as Op[];
}

/** Index of the optional hand-trash payment ("You may trash N…" → min 0). */
function paymentIndex(ops: Op[]): number {
  return ops.findIndex((op, i) => {
    if (op.op !== 'trashCards' || i === 0) return false;
    const prior = ops[i - 1] as { op: string; min?: number; from?: { sel?: string } };
    return prior.op === 'chooseTargets' && prior.from?.sel === 'controllerHand' && prior.min === 0;
  });
}

describe('semantic family: one optional payment gating several clauses', () => {
  const ops = opsOf(ST34_ASSIGNMENTS as CardEffectAssignment[], 'ST34-004');

  it('captures the payment into a sequence-local var immediately after it', () => {
    const payIdx = paymentIndex(ops);
    expect(payIdx).toBeGreaterThan(-1);
    // The capture must read what was actually MOVED (trashed), not the selection —
    // that is what makes it a proof of payment.
    expect(ops[payIdx + 1]).toMatchObject({ op: 'copyVar', from: '__lastMovedIds' });
  });

  it('gates BOTH dependent clauses on the captured payment, not on each other', () => {
    const payIdx = paymentIndex(ops);
    const capturedVar = (ops[payIdx + 1] as { into: string }).into;

    // The "add up to 1 card from the top of your deck" clause compiles to a
    // two-option prompt (the deck's top card must not be shown before the player
    // decides), so its move op lives inside a branch rather than at the top level.
    const flat = ops.flatMap((op) => (
      op.op === 'chooseOption'
        ? [op, ...((op as unknown as { options: { ops: Op[] }[] }).options.flatMap((o) => o.ops))]
        : [op]
    ));
    const lifeMove = flat.find((op) => op.op === 'moveToLifeTop');
    const basePower = flat.find((op) => op.op === 'setBasePower');
    expect(lifeMove).toBeDefined();
    expect(basePower).toBeDefined();

    // Each clause's own target selection carries the gate (the gate rides the
    // chooseTargets that precedes the apply op).
    const gated = ops.filter(
      (op) => Array.isArray(op.ifGate)
        && JSON.stringify(op.ifGate).includes(capturedVar),
    );
    expect(gated.length).toBe(2);
    for (const op of gated) {
      expect(op.ifGate).toEqual([{ kind: 'boundVarsTotalCount', varNames: [capturedVar], atLeast: 1 }]);
    }
  });

  it('never chains ifPrevious past the payment — the bug this family exists to prevent', () => {
    const payIdx = paymentIndex(ops);
    // Ops AFTER the payment must not gate on __lastMoved, which the Life move clobbers.
    for (const op of ops.slice(payIdx + 1)) {
      expect(op.ifPrevious, `${op.op} must not chain ifPrevious past the payment`).toBeUndefined();
    }
  });
});
