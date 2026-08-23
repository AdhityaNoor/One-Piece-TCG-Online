/**
 * OP17 ("The World's Strongest Warriors") curation guards.
 *
 * This file is the landing spot for per-card OP17 effect tests. Until the set is
 * scraped and curated it holds the structural invariants that must be true of
 * OP17_ASSIGNMENTS at every size, so the scaffold cannot rot:
 *
 *   - every entry is an OP17 card number (no cross-set entries leak in);
 *   - no duplicate card numbers (the assembler warns + last-one-wins otherwise);
 *   - every assignment compiles through the assembler into >= 1 ability;
 *   - every compiled program stays JSON-serializable (engine state must
 *     round-trip as JSON — docs/01-rules-engine-blueprint.md);
 *   - OP17 is actually wired into OP_ASSIGNMENTS / ALL_ASSIGNMENTS.
 *
 * Add one `describe('OP17-0xx …')` block per curated card below, following the
 * pattern in op16CrocodileReturnPlay.test.ts (build a filtered registry, drive
 * it with the shared test rig, assert the rule).
 */
import { describe, expect, it } from 'vitest';
import { runTimings } from '../../../engine/effects/interpreter';
import { computeCurrentPower, hasContinuousKeyword } from '../../../engine/rules/shared';
import { buildBaseRig, makeCharacterDef, makeLeaderDef, putCharacterInPlay } from '../../../engine/rules/shared/__tests__/testRig';
import { validateAction } from '../../../engine/actions/dispatch';
import { buildRegistryFromAssignments } from '../assembler';
import { ALL_ASSIGNMENTS } from '../assignments';
import { OP_ASSIGNMENTS } from '../assignments/OP';
import { OP17_ASSIGNMENTS } from '../assignments/OP17';

const OP17_CARD_NUMBER = /^OP17-\d{3}$/;

function programFor(cardNumber: string) {
  const entry = OP17_ASSIGNMENTS.find((a) => a.cardNumber === cardNumber);
  if (!entry) throw new Error(`no OP17 assignment for ${cardNumber}`);
  return buildRegistryFromAssignments([entry])[cardNumber];
}

describe('OP17 assignment scaffold', () => {
  it('only contains OP17 card numbers', () => {
    const foreign = OP17_ASSIGNMENTS.map((a) => a.cardNumber).filter((n) => !OP17_CARD_NUMBER.test(n));
    expect(foreign).toEqual([]);
  });

  it('has no duplicate card numbers', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const a of OP17_ASSIGNMENTS) {
      if (seen.has(a.cardNumber)) dupes.push(a.cardNumber);
      seen.add(a.cardNumber);
    }
    expect(dupes).toEqual([]);
  });

  it('compiles every assignment into at least one ability', () => {
    const registry = buildRegistryFromAssignments(OP17_ASSIGNMENTS);
    expect(Object.keys(registry)).toHaveLength(new Set(OP17_ASSIGNMENTS.map((a) => a.cardNumber)).size);
    for (const [cardNumber, program] of Object.entries(registry)) {
      expect(program.cardNumber, `${cardNumber} program cardNumber`).toBe(cardNumber);
      expect(program.abilities.length, `${cardNumber} ability count`).toBeGreaterThan(0);
    }
  });

  it('produces JSON-serializable programs', () => {
    const registry = buildRegistryFromAssignments(OP17_ASSIGNMENTS);
    expect(() => JSON.parse(JSON.stringify(registry))).not.toThrow();
    expect(JSON.parse(JSON.stringify(registry))).toEqual(registry);
  });

  it('is wired into the aggregated assignment lists', () => {
    for (const a of OP17_ASSIGNMENTS) {
      expect(OP_ASSIGNMENTS, `${a.cardNumber} in OP_ASSIGNMENTS`).toContain(a);
      expect(ALL_ASSIGNMENTS, `${a.cardNumber} in ALL_ASSIGNMENTS`).toContain(a);
    }
    // Aggregation is a spread of the per-set arrays, so the OP17 array must be
    // reachable even while empty — assert the wiring by identity of the module.
    expect(Array.isArray(OP17_ASSIGNMENTS)).toBe(true);
    expect(OP_ASSIGNMENTS.length).toBeGreaterThanOrEqual(OP17_ASSIGNMENTS.length);
  });
});

/**
 * The Elbaph package (OP17-082/083/087/090/093) keys every static buff off
 * "If there is a Character with a cost of 12 or more" — a board state that
 * changes DURING the game. The gate therefore belongs on the continuous
 * modifier (re-read on every power/keyword read), never on the ability's
 * firing: a cost-12 Character is almost never on the field at the moment these
 * 2-to-5 cost Characters enter play, so an ability-level gate would silently
 * register nothing. This is the same trap documented in
 * staticConditionalSelfBuff.test.ts.
 */
describe('OP17 Elbaph cost-12 package', () => {
  const SANJI = makeCharacterDef({ cardDefinitionId: 'OP17-082', cardNumber: 'OP17-082', name: 'Sanji', baseCost: 4, basePower: 5000 });
  const GIANT = makeCharacterDef({ cardDefinitionId: 'OP17-GIANT', cardNumber: 'OP17-GIANT', name: 'Giant', baseCost: 12, basePower: 12000 });

  /** Enter play with no cost-12 Character out, then optionally add one and read live. */
  function enterThenMaybeAddGiant(cardNumber: string, withGiant: boolean) {
    const program = programFor(cardNumber);
    const registry = { [cardNumber]: program };
    const base = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 3 });
    const { rig, instanceId } = putCharacterInPlay(base, 'p1', SANJI, { summoningSick: false });
    let state = runTimings(program, ['onEnterPlay'], rig.state, instanceId, rig.defs, null, registry).state;
    let defs = rig.defs;
    if (withGiant) {
      const withGiantRig = putCharacterInPlay({ ...rig, state }, 'p1', GIANT, { summoningSick: false });
      state = withGiantRig.rig.state;
      defs = withGiantRig.rig.defs;
    }
    return { state, instanceId, defs };
  }

  it('puts the cost-12 gate on the modifier, not on the ability', () => {
    const program = programFor('OP17-082');
    const staticAbility = program.abilities.find((a) => a.timing === 'onEnterPlay')!;
    // No ability-level gate — it must fire unconditionally so the modifier registers.
    expect(staticAbility.gate).toBeUndefined();
    expect(staticAbility.ops[0]).toMatchObject({
      op: 'addPower',
      condition: { gate: [{ kind: 'anyCharacterCostAtLeast', atLeast: 12 }] },
    });
  });

  it('OP17-082 Sanji gains +3000 only while a cost-12+ Character is on the field', () => {
    const without = enterThenMaybeAddGiant('OP17-082', false);
    expect(computeCurrentPower(without.defs, without.state, without.instanceId)).toBe(5000);

    const withGiant = enterThenMaybeAddGiant('OP17-082', true);
    expect(computeCurrentPower(withGiant.defs, withGiant.state, withGiant.instanceId)).toBe(8000);
  });

  it('OP17-083 Jinbe gains [Blocker] only while a cost-12+ Character is on the field', () => {
    const without = enterThenMaybeAddGiant('OP17-083', false);
    expect(hasContinuousKeyword(without.defs, without.state, without.instanceId, 'blocker')).toBe(false);

    const withGiant = enterThenMaybeAddGiant('OP17-083', true);
    expect(hasContinuousKeyword(withGiant.defs, withGiant.state, withGiant.instanceId, 'blocker')).toBe(true);
  });
});

/**
 * OP17-079 Monkey.D.Luffy (Leader): "All of your Characters with a cost of 12 or
 * more gain [Blocker]" is an AURA over the controller's Characters filtered by
 * CURRENT cost, so a Character that crosses the threshold later (OP17-081/094
 * give themselves +12 cost) picks the keyword up without re-firing anything.
 */
describe('OP17-079 leader blocker aura', () => {
  it('grants [Blocker] to cost-12+ Characters only', () => {
    const program = programFor('OP17-079');
    const registry = { 'OP17-079': program };
    const leaderDef = makeLeaderDef({ cardDefinitionId: 'OP17-079', cardNumber: 'OP17-079', name: 'Monkey.D.Luffy' });
    const base = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 3, p1Leader: leaderDef });

    const small = makeCharacterDef({ cardDefinitionId: 'SMALL', cardNumber: 'SMALL', baseCost: 4, basePower: 5000 });
    const giant = makeCharacterDef({ cardDefinitionId: 'GIANT', cardNumber: 'GIANT', baseCost: 12, basePower: 12000 });
    const a = putCharacterInPlay(base, 'p1', small, { summoningSick: false });
    const b = putCharacterInPlay(a.rig, 'p1', giant, { summoningSick: false });

    const leaderId = b.rig.state.players.p1.leaderCardId!;
    const state = runTimings(program, ['onEnterPlay'], b.rig.state, leaderId, b.rig.defs, null, registry).state;

    expect(hasContinuousKeyword(b.rig.defs, state, a.instanceId, 'blocker')).toBe(false);
    expect(hasContinuousKeyword(b.rig.defs, state, b.instanceId, 'blocker')).toBe(true);
  });
});

/**
 * Structural guards for the two OP17 shapes most likely to be mis-wired on a
 * later edit: the hand-trash payment idiom, and opponent-chosen modes.
 */
describe('OP17 idiom guards', () => {
  it('gates the payload of every "trash N from hand:" ability on the payment actually happening', () => {
    // "You may trash N cards from your hand:" is not an AbilityCost — it compiles to
    // chooseTargets(controllerHand) + trashCards. If the op that follows is not gated
    // on that payment, the payload resolves for free even when nothing was trashed.
    // Derived from the assignments rather than hard-coded, so new OP17 entries are covered.
    let checked = 0;
    for (const { cardNumber } of OP17_ASSIGNMENTS) {
      for (const ability of programFor(cardNumber).abilities) {
        // min: 0 is what makes it a "You may trash …:" PAYMENT. A mandatory hand
        // trash (min >= 1, e.g. drawAndTrash on OP17-066/082) is an effect, not a
        // payment, and has nothing to gate.
        const payIndex = ability.ops.findIndex((op, i) => {
          if (op.op !== 'trashCards' || i === 0) return false;
          const prior = ability.ops[i - 1] as { op: string; min?: number; from?: { sel?: string } };
          return prior.op === 'chooseTargets' && prior.from?.sel === 'controllerHand' && prior.min === 0;
        });
        if (payIndex < 0) continue;
        const payload = ability.ops[payIndex + 1];
        expect(payload, `${cardNumber} (${ability.timing}) has a payload op after the hand-trash payment`).toBeDefined();
        expect(payload, `${cardNumber} (${ability.timing}) payload is gated on the payment`).toMatchObject({
          ifPrevious: 'previousMovedAny',
        });
        checked += 1;
      }
    }
    expect(checked, 'found hand-trash payment abilities to check').toBeGreaterThan(8);
  });

  it('lets the OPPONENT pick the mode on both Charlotte Linlin cards', () => {
    for (const cardNumber of ['OP17-049', 'OP17-099']) {
      const program = programFor(cardNumber);
      const chooseOp = program.abilities.flatMap((a) => a.ops).find((op) => op.op === 'chooseOption');
      expect(chooseOp, `${cardNumber} has a chooseOption op`).toBeDefined();
      expect(chooseOp).toMatchObject({ chooser: 'opponent' });
    }
  });

  it('OP17-020 gates its payload on the chosen cost branch actually being paid', () => {
    // "trash 1 from hand OR rest 1 DON!!:" — a choice of COSTS, so it lives in a chooseOne
    // rather than cost[]. The DON!! branch compiles to min: 0 (restControllerDon hard-codes
    // it), so without the gate a player could pick that branch, decline, and still shut off
    // an opponent's Refresh for free.
    const ability = programFor('OP17-020').abilities[0];
    const [choose, select, apply] = ability.ops as Array<Record<string, unknown>>;

    expect(choose).toMatchObject({ op: 'chooseOption' });
    const options = (choose as { options: Array<{ ops: Array<{ min?: number }> }> }).options;
    // Trash branch is mandatory once chosen — the "You may" is the decision to activate.
    expect(options[0].ops[0].min).toBe(1);
    // DON!! branch is declinable, which is exactly why the payload needs the gate.
    expect(options[1].ops[0].min).toBe(0);

    // The payload's target selection is gated on __lastSelected, which the branch ops write.
    expect(select).toMatchObject({ op: 'chooseTargets', ifPrevious: 'previousSelectedAny' });
    expect(apply).toMatchObject({ op: 'preventRefresh' });
  });

  it('never ships a play-restriction drawback without the play that pays for it', () => {
    // OP17-085/092 read "play [Brogy]/[Dorry] from hand or trash. THEN, you cannot play
    // Character cards this turn." While the play was uncurated the restriction had to be
    // absent — a drawback with no benefit is worse than nothing. Now that the play is wired,
    // the invariant is the pairing itself: any ability that imposes the restriction must also
    // contain the play, in the same ability.
    for (const { cardNumber } of OP17_ASSIGNMENTS) {
      for (const ability of programFor(cardNumber).abilities) {
        const hasDrawback = ability.ops.some((op) => op.op === 'preventControllerCharacterPlay');
        if (!hasDrawback) continue;
        const grantsPlay = JSON.stringify(ability.ops).includes('"op":"playFrom');
        expect(grantsPlay, `${cardNumber} pairs its play-restriction with an actual play`).toBe(true);
      }
    }
    // And the two giants still carry their +12 cost, which is independent of the [On Play].
    for (const cardNumber of ['OP17-085', 'OP17-092']) {
      const ops = programFor(cardNumber).abilities.flatMap((a) => a.ops);
      expect(ops.some((op) => op.op === 'addCost'), `${cardNumber} still grants +12 cost`).toBe(true);
    }
  });

  it('caps OP17-119 and OP17-118 by COMBINED cost, not per-card cost', () => {
    // "a total cost of N or less" is a sum across the selection. Emitting a per-card
    // maxCost filter instead would be a silently different (and far more permissive) card.
    const loki = programFor('OP17-119').abilities.flatMap((a) => a.ops).find((op) => op.op === 'chooseTargets');
    expect(loki).toMatchObject({ maxCombinedCost: 4, max: 4, min: 0 });
    expect(JSON.stringify(loki)).not.toContain('"maxCost"');

    const xebec = programFor('OP17-118').abilities.flatMap((a) => a.ops).find((op) => op.op === 'chooseTargets');
    expect(xebec).toMatchObject({ maxCombinedCost: 9, max: 2, distinctNames: true });
    expect(JSON.stringify(xebec)).not.toContain('"maxCost"');
  });

  it('gates OP17-034 on the OPPONENT Leader, and scopes the Leader-type check to the base-power op', () => {
    const ability = programFor('OP17-034').abilities[0];
    expect(ability.gate).toEqual([{ kind: 'opponentLeaderPowerAtLeast', power: 6000 }]);

    // The DON!! refresh is NOT gated on the controller's Leader type — only the
    // base-power clause names "{Red-Haired Pirates} type Leader".
    const ops = ability.ops as Array<Record<string, unknown>>;
    const setActive = ops.find((op) => op.op === 'setActive');
    const basePower = ops.find((op) => op.op === 'setBasePower');
    expect(setActive).toBeDefined();
    expect(setActive).not.toHaveProperty('ifGate');
    expect(basePower).toMatchObject({ ifGate: [{ kind: 'leaderType', type: 'Red-Haired Pirates' }] });
  });

  it('offers OP17-085/092 the partner giant from EITHER hand or trash, and charges the drawback regardless', () => {
    for (const [cardNumber, partner] of [['OP17-085', 'Brogy'], ['OP17-092', 'Dorry']] as const) {
      const onPlay = programFor(cardNumber).abilities.find((a) => a.timing === 'onPlay')!;
      const choose = onPlay.ops[0] as { op: string; options: Array<{ label: string; ops: Array<Record<string, unknown>> }> };
      expect(choose.op).toBe('chooseOption');

      // One branch per zone, each filtered to the partner giant — not to this card itself.
      const zones = choose.options.map((o) => JSON.stringify(o.ops));
      expect(zones[0]).toContain('controllerHand');
      expect(zones[1]).toContain('controllerTrash');
      for (const z of zones) expect(z).toContain(partner);

      // "Then, you cannot play Character cards this turn" is a plain Then: it applies even when
      // the player declines the "up to 1" play, so it must NOT carry a gate.
      const drawback = onPlay.ops.find((op) => op.op === 'preventControllerCharacterPlay')!;
      expect(drawback).toBeDefined();
      expect(drawback).not.toHaveProperty('ifPrevious');
      expect(drawback).not.toHaveProperty('ifGate');
    }
  });

  it('fires OP17-117\'s [Trigger] K.O. on the DECLINE path, not the pay path', () => {
    const trigger = programFor('OP17-117').abilities.find((a) => a.timing === 'lifeTrigger')!;
    const [choose, select, ko] = trigger.ops as Array<Record<string, unknown>>;

    // The opponent owns the decision.
    expect(choose).toMatchObject({ op: 'chooseOption', chooser: 'opponent' });
    const options = (choose as { options: Array<{ label: string; ops: Array<Record<string, unknown>> }> }).options;
    // Paying is a mandatory 3 once chosen; declining does nothing at all.
    expect(options[0].ops[0]).toMatchObject({ min: 3, max: 3 });
    expect(options[1].ops).toEqual([]);
    // The pay branch records how much was actually trashed.
    expect(options[0].ops[2]).toMatchObject({ op: 'copyVar', from: '__lastMovedIds' });

    // The K.O. is gated INVERSELY — it runs unless a full 3 were trashed. atMost must be 2,
    // not 0: an opponent who trashes 1 or 2 via the softlock escape has not trashed 3, so by
    // the card's wording they still eat the K.O.
    expect(select).toMatchObject({
      op: 'chooseTargets',
      ifGate: [{ kind: 'boundVarsTotalCount', varNames: ['op17117OppPaid'], atMost: 2 }],
    });
    expect(ko).toMatchObject({ op: 'ko' });
  });

  it('K.O.s by BASE power where the card says "base power" (OP17-009/014/016)', () => {
    for (const cardNumber of ['OP17-009', 'OP17-014', 'OP17-016']) {
      const program = programFor(cardNumber);
      const koOp = program.abilities.flatMap((a) => a.ops).find((op) => op.op === 'chooseTargets');
      expect(koOp, `${cardNumber} selects K.O. targets`).toBeDefined();
      expect(JSON.stringify(koOp)).toContain('maxBasePower');
      expect(JSON.stringify(koOp)).not.toContain('"maxPower"');
    }
  });
});

/**
 * OP17-044 Captain John: "If your Leader's type includes 'Rocks Pirates' and
 * this Character is rested, your opponent cannot attack any card other than the
 * Character [Captain John]."
 *
 * This is a target NARROWING, not an attack lock. The distinction is the whole
 * card: the opponent must still be able to attack John himself. Reported as
 * "the opponent cannot attack at all" — which was the board offering the Leader
 * and every rested Character, then failing validation on tap.
 */
describe('OP17-044 forces attacks onto Captain John without blocking them', () => {
  function rigWithJohn(johnOrientation: 'rested' | 'active') {
    const registry = buildRegistryFromAssignments(OP17_ASSIGNMENTS.filter((a) => a.cardNumber === 'OP17-044'));
    const john = makeCharacterDef({ cardDefinitionId: 'OP17-044', cardNumber: 'OP17-044', name: 'Captain John', baseCost: 3, basePower: 5000, types: ['Rocks Pirates'] });
    const other = makeCharacterDef({ cardDefinitionId: 'OTHER', cardNumber: 'OTHER', name: 'Other', baseCost: 2, basePower: 3000 });
    const attacker = makeCharacterDef({ cardDefinitionId: 'ATK', cardNumber: 'ATK', name: 'Attacker', basePower: 6000 });

    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main', turnNumber: 4, leaderOverridesP1: { types: ['Rocks Pirates'] } });
    let johnId: string;
    let otherId: string;
    let attackerId: string;
    ({ rig, instanceId: johnId } = putCharacterInPlay(rig, 'p1', john, { orientation: johnOrientation }));
    ({ rig, instanceId: otherId } = putCharacterInPlay(rig, 'p1', other, { orientation: 'rested' }));
    ({ rig, instanceId: attackerId } = putCharacterInPlay(rig, 'p2', attacker, { summoningSick: false }));

    const state = runTimings(registry['OP17-044'], ['onEnterPlay'], rig.state, johnId, rig.defs, null, registry).state;
    return { state, defs: rig.defs, registry, johnId, otherId, attackerId, leaderId: rig.state.players.p1.leaderInstanceId! };
  }

  const attack = (attackerId: string, targetId: string) =>
    ({ type: 'DECLARE_ATTACK', actionId: 'test-attack', playerId: 'p2', attackerInstanceId: attackerId, targetInstanceId: targetId }) as const;

  it('still allows the opponent to attack Captain John himself', () => {
    const { state, defs, registry, johnId, attackerId } = rigWithJohn('rested');
    const result = validateAction(state, attack(attackerId, johnId), defs, registry);
    expect(result.legal, `attacking Captain John must stay legal: ${result.reasons.join(' ')}`).toBe(true);
  });

  it('refuses the Leader and other Characters while he is rested', () => {
    const { state, defs, registry, otherId, attackerId, leaderId } = rigWithJohn('rested');
    expect(validateAction(state, attack(attackerId, leaderId), defs, registry).legal).toBe(false);
    expect(validateAction(state, attack(attackerId, otherId), defs, registry).legal).toBe(false);
  });

  it('leaves at least one legal attack available — the "cannot select an attacker" regression', () => {
    // The board gates attack mode on a legality PROBE. That probe used to test a
    // single stand-in target (the opponent's Leader), which Captain John makes
    // illegal — so every attacker reported "cannot attack" and the player could
    // not even begin an attack. The probe must consider the whole legal target
    // set: Leader PLUS rested Characters.
    const { state, defs, registry, johnId, attackerId } = rigWithJohn('rested');
    const leaderId = state.players.p1.leaderInstanceId!;
    const restedOpponentCharacters = state.players.p1.characterArea.cardIds
      .filter((id) => state.cardsById[id]?.orientation === 'rested');

    const leaderOnlyProbe = [leaderId]
      .some((t) => validateAction(state, attack(attackerId, t), defs, registry).legal);
    const fullProbe = [leaderId, ...restedOpponentCharacters]
      .some((t) => validateAction(state, attack(attackerId, t), defs, registry).legal);

    // Documents WHY the narrow probe was wrong, so nobody reinstates it.
    expect(leaderOnlyProbe).toBe(false);
    expect(fullProbe).toBe(true);
    expect(restedOpponentCharacters).toContain(johnId);
  });

  it('lifts entirely once he is ACTIVE — the restriction is re-read, not latched at enter-play', () => {
    const { state, defs, registry, attackerId, leaderId } = rigWithJohn('active');
    expect(validateAction(state, attack(attackerId, leaderId), defs, registry).legal).toBe(true);
  });
});
