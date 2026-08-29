/**
 * Regression family: `ifPrevious: 'previousMovedAny'` placed after an op that
 * NEVER reports moved cards — an always-false gate that silently deletes the
 * rest of the ability.
 *
 * `previousMovedAny` reads the `__lastMoved` binding, which the interpreter
 * rewrites after EVERY op from that op's `movedIds`. A large family of ops
 * returns `movedIds: []` unconditionally — `rest`, `addKeyword`, `dealDamage`,
 * and any op with no interpreter case (`shuffleDeck`). Gating the next step on
 * one of those means the step can never run. `copyVar` / `bindMatchingCards`
 * are the opposite case: they leave the binding untouched on purpose, so a gate
 * behind one still reads the action before it (see TRANSPARENT_TO_IF_PREVIOUS).
 *
 * ST06-012 is the sharpest instance: "You may trash 1 card from your hand and
 * rest this Character: K.O. up to 1 of your opponent's Characters with a cost of
 * 4 or less." The K.O. is the entire payoff, and it was gated on the `rest` op.
 *
 * The fix is the same as the shared-payment family: gate on the PAYMENT, either
 * by keeping the gate on the op immediately after the paying move, or by
 * capturing the payment into a var and using ifGate + boundVarsTotalCount.
 */
import { describe, expect, it } from 'vitest';
import { runTimings, resumeProgram } from '../../../engine/effects/interpreter';
import { buildBaseRig, makeCharacterDef, putCharacterInPlay, putInHand } from '../../../engine/rules/shared/__tests__/testRig';
import { buildRegistryFromAssignments } from '../assembler';
import { ALL_ASSIGNMENTS } from '../assignments';
import { ST06_ASSIGNMENTS } from '../assignments/ST06';

/**
 * Ops whose interpreter case returns `movedIds: []` unconditionally (or that have
 * no case at all and fall through to EMPTY_RESULT). An `ifPrevious:
 * 'previousMovedAny'` immediately after any of these can never be satisfied.
 * Keep in sync with interpreter.ts if new non-moving ops are added.
 */
const NEVER_REPORTS_MOVED = [
  'rest', 'restAllCharacters', 'addKeyword', 'addCounterAura', 'dealDamage',
  'shuffleDeck', 'negateEffect', 'preventAttack', 'preventRefresh',
  'preventRest', 'preventBlockers', 'setBasePower', 'addCost',
];

/**
 * TRANSPARENT ops are pure bookkeeping: they `continue` WITHOUT rewriting
 * __lastMoved / __lastSelected (interpreter.ts, `copyVar` and
 * `bindMatchingCards`), precisely so a following `ifPrevious` still reads the
 * real prior action. They are neither moving nor non-moving — look straight
 * through them to the op before. This is the `captureCount` pattern:
 *   trash any number from hand -> captureCount -> addPower ifPrevious:previousMovedAny
 */
const TRANSPARENT_TO_IF_PREVIOUS = ['copyVar', 'bindMatchingCards'];

/** The op an `ifPrevious` at index `i` actually reads, skipping bookkeeping ops. */
function precedingActionOp(ops: Array<Record<string, unknown>>, i: number): { op: string } | undefined {
  for (let j = i - 1; j >= 0; j -= 1) {
    const candidate = ops[j] as { op: string };
    if (!TRANSPARENT_TO_IF_PREVIOUS.includes(candidate.op)) return candidate;
  }
  return undefined;
}

const registry = buildRegistryFromAssignments(
  ST06_ASSIGNMENTS.filter((a) => a.cardNumber === 'ST06-012'),
);

describe('ST06-012 — pay-then-K.O. must actually reach the K.O.', () => {
  it('K.O.s an opponent Character cost<=4 after the hand trash + self rest are paid', () => {
    const source = makeCharacterDef({ cardDefinitionId: 'ST06-012', cardNumber: 'ST06-012', name: 'Source', baseCost: 3, basePower: 5000 });
    const victim = makeCharacterDef({ cardDefinitionId: 'VICTIM', cardNumber: 'VICTIM', name: 'Victim', baseCost: 4, basePower: 4000 });
    const fodder = makeCharacterDef({ cardDefinitionId: 'FODDER', cardNumber: 'FODDER', name: 'Fodder', baseCost: 1, basePower: 1000 });

    let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3 });
    let sourceId: string;
    let victimId: string;
    ({ rig, instanceId: sourceId } = putCharacterInPlay(rig, 'p1', source, { summoningSick: false }));
    ({ rig, instanceId: victimId } = putCharacterInPlay(rig, 'p2', victim));
    const inHand = putInHand(rig, 'p1', fodder);
    rig = inHand.rig;

    // Step 1: activate — the first choice is the hand-trash payment.
    const fired = runTimings(registry['ST06-012'], ['activateMain'], rig.state, sourceId, rig.defs, null, registry);
    const trashChoice = fired.state.pendingChoices[0];
    expect(trashChoice, 'ability opens with the hand-trash payment').toBeDefined();

    // Step 2: pay it.
    const afterTrash = resumeProgram(registry['ST06-012'], fired.state, trashChoice, [inHand.instanceId], rig.defs, null, registry);

    // Step 3: the K.O. target choice MUST be offered. Before the fix the ability
    // ended here — the card was rested, the hand card was gone, and nothing else
    // happened, because the K.O.'s gate read the non-moving `rest` op.
    const koChoice = afterTrash.state.pendingChoices[0];
    expect(koChoice, 'K.O. target choice is offered after the payment').toBeDefined();
    expect(koChoice.constraints.candidateInstanceIds).toContain(victimId);

    // Step 4: the K.O. actually resolves.
    const afterKo = resumeProgram(registry['ST06-012'], afterTrash.state, koChoice, [victimId], rig.defs, null, registry).state;
    expect(afterKo.players.p2.characterArea.cardIds).not.toContain(victimId);
    // And the payment really was taken.
    expect(afterKo.players.p1.hand.cardIds).not.toContain(inHand.instanceId);
    expect(afterKo.cardsById[sourceId].orientation).toBe('rested');
  });
});

describe('catalog guard: no ifPrevious gate sits behind a non-moving op', () => {
  it('finds zero always-false previousMovedAny gates across every curated card', () => {
    const registry = buildRegistryFromAssignments(ALL_ASSIGNMENTS);
    const dead: string[] = [];
    const seen = new Set<string>();

    const walk = (cardNumber: string, timing: string, ops: Array<Record<string, unknown>>): void => {
      ops.forEach((op, i) => {
        if (op.ifPrevious === 'previousMovedAny' && i > 0) {
          const prev = precedingActionOp(ops, i);
          if (prev && NEVER_REPORTS_MOVED.includes(prev.op)) {
            dead.push(`${cardNumber} [${timing}] op${i} '${String(op.op)}' gated on non-moving '${prev.op}'`);
          }
        }
        if (op.op === 'chooseOption') {
          for (const branch of (op.options as Array<{ ops?: Array<Record<string, unknown>> }>) ?? []) {
            walk(cardNumber, timing, branch.ops ?? []);
          }
        }
      });
    };

    for (const [key, program] of Object.entries(registry)) {
      // The registry is double-keyed (cardNumber + cardDefinitionId); visit each card once.
      if (!/^[A-Z]/.test(key) || seen.has(program.cardNumber)) continue;
      seen.add(program.cardNumber);
      for (const ability of program.abilities) {
        walk(program.cardNumber, ability.timing, ability.ops as Array<Record<string, unknown>>);
      }
    }

    expect(dead, `always-false ifPrevious gates:\n${dead.join('\n')}`).toEqual([]);
  });
});
