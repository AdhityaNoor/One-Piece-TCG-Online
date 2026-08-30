/**
 * A Counter that cannot reach the attacker's power buys NOTHING.
 *
 * 7-1-4: the battle is decided by comparing power. Adding 2000 against a 3000
 * deficit still loses the battle, the Life card is still taken, and the card
 * spent is simply gone. So a partial Counter is only ever correct as a step
 * toward a total that DOES cover.
 *
 * The CPU used to get this wrong specifically when it mattered most. The
 * low-Life urgency bonuses in scoreCharacterCounterUse (+35 at 1 Life, +18 at
 * 2) are there to make it fight for its life, and they were applied AFTER the
 * partial-Counter branch — large enough to push a hopeless Counter above
 * passing. At 1-2 Life the CPU would trash a 2000 into a 3000 deficit and take
 * the Life anyway, and with 1000+1000 in hand it burned both.
 */
import { describe, expect, it } from 'vitest';
import {
  availableCounterPower,
  scoreCharacterCounterUse,
  scorePassCounterStep,
  type CounterNeedAnalysis,
} from '../evaluation/counterEfficiency';
import {
  buildBaseRig,
  makeCharacterDef,
  makeEventDef,
  putDon,
  putInHand,
} from '../../engine/rules/shared/__tests__/testRig';

const need = (deficit: number, lifeAtRisk = true): CounterNeedAnalysis => ({
  attackerPower: 5000 + deficit,
  defenderPower: 5000,
  deficit,
  alreadySafe: false,
  lifeAtRisk,
});

function play(counterValue: number, life: number, available: number, deficit = 3000) {
  return scoreCharacterCounterUse({
    need: need(deficit), counterValue, boostsBattleTarget: true, life, survivalUrgency: 25,
    availableCounterPower: available,
  });
}
function pass(life: number, available: number, deficit = 3000) {
  return scorePassCounterStep({ need: need(deficit), life, survivalUrgency: 25, availableCounterPower: available });
}

describe('hopeless counters', () => {
  it.each([4, 3, 2, 1])('passes rather than throw a 2000 at a 3000 deficit (%i Life)', (life) => {
    // The whole hand is 2000. Countering cannot save the battle at any Life total.
    expect(play(2000, life, 2000)).toBeLessThan(pass(life, 2000));
  });

  it('will not burn 1000 + 1000 into a 3000 deficit', () => {
    for (const life of [2, 1]) {
      expect(play(1000, life, 2000)).toBeLessThan(pass(life, 2000));
    }
  });

  it('low-Life desperation must not fund a hopeless battle', () => {
    // The exact regression: at 1 Life the urgency bonus previously lifted a
    // hopeless partial to +54 against a pass of -80.
    expect(play(2000, 1, 2000)).toBeLessThan(0);
    expect(play(2000, 2, 2000)).toBeLessThan(0);
  });

  it('still spends when the deficit IS reachable across two cards', () => {
    // 2000 + 2000 against 3000: the first card is a down payment, not a donation.
    for (const life of [2, 1]) {
      expect(play(2000, life, 4000)).toBeGreaterThan(pass(life, 4000));
    }
  });

  it('still plays a single Counter that covers on its own', () => {
    expect(play(3000, 3, 3000)).toBeGreaterThan(pass(3, 3000));
  });

  it('never counters a battle it is already winning', () => {
    const safe: CounterNeedAnalysis = { attackerPower: 4000, defenderPower: 5000, deficit: 0, alreadySafe: true, lifeAtRisk: true };
    const score = scoreCharacterCounterUse({
      need: safe, counterValue: 2000, boostsBattleTarget: true, life: 1, survivalUrgency: 25,
      availableCounterPower: 8000,
    });
    expect(score).toBeLessThan(scorePassCounterStep({ need: safe, life: 1, survivalUrgency: 25, availableCounterPower: 8000 }));
  });
});

describe('availableCounterPower', () => {
  it('sums printed Counter values across the hand', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    rig = putInHand(rig, 'p1', makeCharacterDef({ cardNumber: 'C1', baseCost: 2, counter: 2000 })).rig;
    rig = putInHand(rig, 'p1', makeCharacterDef({ cardNumber: 'C2', baseCost: 1, counter: 1000 })).rig;
    // A Character with no printed Counter contributes nothing.
    rig = putInHand(rig, 'p1', makeCharacterDef({ cardNumber: 'C3', baseCost: 3, counter: 0 })).rig;

    expect(availableCounterPower(rig.state, rig.defs, 'p1')).toBe(3000);
  });

  it('counts a [Counter] Event the player can actually pay for', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    const event = makeEventDef({ cardNumber: 'EV', baseCost: 1 });
    const placed = putInHand(rig, 'p1', event);
    rig = placed.rig;
    rig = putDon(rig, 'p1', 2).rig;

    const registry = {
      [event.cardNumber]: {
        cardNumber: event.cardNumber,
        abilities: [{ timing: 'counter' as const, ops: [{ op: 'addPower', target: { sel: 'self' }, amount: 4000, duration: 'battle' } as never] }],
      },
    };
    expect(availableCounterPower(rig.state, rig.defs, 'p1', registry as never)).toBe(4000);
  });

  it('ignores a [Counter] Event it cannot pay for', () => {
    let rig = buildBaseRig({ activePlayerId: 'p2', phase: 'main' });
    const event = makeEventDef({ cardNumber: 'EV-EXPENSIVE', baseCost: 4 });
    rig = putInHand(rig, 'p1', event).rig;
    rig = putDon(rig, 'p1', 1).rig; // only 1 active DON!!

    const registry = {
      [event.cardNumber]: {
        cardNumber: event.cardNumber,
        abilities: [{ timing: 'counter' as const, ops: [{ op: 'addPower', target: { sel: 'self' }, amount: 4000, duration: 'battle' } as never] }],
      },
    };
    // Counting an unaffordable Event would make the CPU start a battle it
    // cannot finish — the same bug in a different costume.
    expect(availableCounterPower(rig.state, rig.defs, 'p1', registry as never)).toBe(0);
  });
});
