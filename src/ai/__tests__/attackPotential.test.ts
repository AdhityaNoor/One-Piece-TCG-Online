/**
 * Life damage is counted in ATTACKS (7-1-4 / 10-1-3), never in summed power.
 *
 * Regression guard for the defect that made the CPU pass its turns: the old
 * estimateVictory compared total board power to `opponentLife * 1000`, so a
 * single 5000-power Leader read as lethal-with-four-damage against 4 Life.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putLifeCards,
} from '../../engine/rules/shared/__tests__/testRig';
import { damagePotential } from '../evaluation/attackPotential';
import { estimateVictory } from '../evaluation/lethalEstimator';
import { lethalPressure } from '../heuristics/boardHeuristics';

const lifeCard = makeCharacterDef({ cardNumber: 'LIFE', baseCost: 0, basePower: 1000 });

function rigWithOpponentLife(count: number, opts: Parameters<typeof buildBaseRig>[0] = {}) {
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6, ...opts });
  rig = putLifeCards(rig, 'p2', Array.from({ length: count }, () => lifeCard)).rig;
  return rig;
}

function settle(rig: ReturnType<typeof buildBaseRig>) {
  return { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] };
}

describe('damagePotential', () => {
  it('counts one Life card per connecting attack, not power/1000', () => {
    // Leader alone (5000 power) against 4 Life. Power-summing said "4 damage".
    const rig = rigWithOpponentLife(4);
    const now = damagePotential(settle(rig), 'p1', rig.defs, 'thisTurn');

    expect(now.attackers).toHaveLength(1);
    expect(now.lifeDamage).toBe(1);
    expect(now.rawLifeDamage).toBe(1);
  });

  it('gives [Double Attack] two Life cards', () => {
    let rig = rigWithOpponentLife(4);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'DA-1',
      baseCost: 4,
      basePower: 6000,
      hasDoubleAttack: true,
    }), { summoningSick: false }).rig;

    const now = damagePotential(settle(rig), 'p1', rig.defs, 'thisTurn');
    // Leader (1) + Double Attack Character (2).
    expect(now.rawLifeDamage).toBe(3);
  });

  it('ignores attackers that lose the 7-1-4 power comparison', () => {
    let rig = rigWithOpponentLife(4, { leaderOverridesP2: { basePower: 6000 } });
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'WEAK',
      baseCost: 1,
      basePower: 2000,
    }), { summoningSick: false }).rig;

    const now = damagePotential(settle(rig), 'p1', rig.defs, 'thisTurn');
    // 5000 Leader and 2000 Character both lose to a 6000 Leader.
    expect(now.attackers).toHaveLength(0);
    expect(now.lifeDamage).toBe(0);
  });

  it('caps damage at the opponent Life total', () => {
    let rig = rigWithOpponentLife(1);
    for (const n of ['A', 'B', 'C']) {
      rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
        cardNumber: `BIG-${n}`,
        baseCost: 5,
        basePower: 7000,
      }), { summoningSick: false }).rig;
    }
    const now = damagePotential(settle(rig), 'p1', rig.defs, 'thisTurn');
    expect(now.rawLifeDamage).toBe(4);
    expect(now.lifeDamage).toBe(1);
  });

  it("lets the opponent's active [Blocker] absorb an attack", () => {
    let rig = rigWithOpponentLife(4);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'ATK', baseCost: 3, basePower: 6000,
    }), { summoningSick: false }).rig;

    const noBlocker = damagePotential(settle(rig), 'p1', rig.defs, 'thisTurn');

    rig = putCharacterInPlay(rig, 'p2', makeCharacterDef({
      cardNumber: 'BLK', baseCost: 2, basePower: 3000, hasBlocker: true,
    }), { orientation: 'active' }).rig;
    const withBlocker = damagePotential(settle(rig), 'p1', rig.defs, 'thisTurn');

    expect(withBlocker.blockedAttacks).toBe(1);
    expect(withBlocker.rawLifeDamage).toBe(noBlocker.rawLifeDamage - 1);
  });

  it('measures the NEXT turn on the refreshed board, so resting costs nothing', () => {
    let rig = rigWithOpponentLife(4);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'RESTED', baseCost: 3, basePower: 6000,
    }), { orientation: 'rested', summoningSick: false }).rig;
    const state = settle(rig);

    // Rested: cannot attack now, but the Refresh Phase (6-1) sets it active.
    expect(damagePotential(state, 'p1', rig.defs, 'thisTurn').attackers).toHaveLength(1);
    expect(damagePotential(state, 'p1', rig.defs, 'nextTurn').attackers).toHaveLength(2);
  });

  it('counts a summoning-sick Character next turn but not this turn', () => {
    let rig = rigWithOpponentLife(4);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'SICK', baseCost: 3, basePower: 6000,
    }), { summoningSick: true }).rig;
    const state = settle(rig);

    expect(damagePotential(state, 'p1', rig.defs, 'thisTurn').attackers).toHaveLength(1);
    expect(damagePotential(state, 'p1', rig.defs, 'nextTurn').attackers).toHaveLength(2);
  });
});

describe('estimateVictory', () => {
  it('does not call a lone Leader lethal against 4 Life', () => {
    const rig = rigWithOpponentLife(4);
    const victory = estimateVictory(settle(rig), 'p1', rig.defs);

    expect(victory.expectedSuccessfulLifeDamage).toBe(1);
    expect(victory.currentTurnLethalProbability).toBeLessThan(50);
  });

  it('calls it lethal when the attacks really do cover the remaining Life', () => {
    let rig = rigWithOpponentLife(2);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'FIN', baseCost: 5, basePower: 7000,
    }), { summoningSick: false }).rig;

    const victory = estimateVictory(settle(rig), 'p1', rig.defs);
    expect(victory.currentTurnLethalProbability).toBeGreaterThanOrEqual(90);
  });

  it('keeps board equity visible after this turn’s attackers have rested', () => {
    let rig = rigWithOpponentLife(4);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'SPENT', baseCost: 5, basePower: 7000,
    }), { orientation: 'rested', summoningSick: false }).rig;

    const victory = estimateVictory(settle(rig), 'p1', rig.defs);
    // Nothing can attack profitably right now beyond the Leader, but the board
    // is intact — the next-turn horizon must not report zero.
    expect(victory.nextTurnLifeDamagePotential).toBeGreaterThan(0);
    expect(victory.boardAttackers).toBe(2);
    expect(victory.nextTurnLethalProbability).toBeGreaterThan(0);
  });
});

describe('lethalPressure (drives strategic mode selection)', () => {
  it('does not report maximum pressure for a lone Leader at full opponent Life', () => {
    // The bug that pinned the CPU in 'lethal_search' all game: total power
    // 5000 >= 5 Life x 1000 returned a flat 100 on turn one, and that mode
    // weights survival at 0.7 and development at 0.5 — the AI was told to stop
    // defending and stop developing while "closing out" a distant win.
    const rig = rigWithOpponentLife(5);
    expect(lethalPressure(settle(rig), 'p1', rig.defs)).toBeLessThan(80);
  });

  it('reports maximum pressure only when the swings really cover the Life', () => {
    let rig = rigWithOpponentLife(2);
    rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
      cardNumber: 'CLOSER', baseCost: 5, basePower: 7000,
    }), { summoningSick: false }).rig;

    expect(lethalPressure(settle(rig), 'p1', rig.defs)).toBe(100);
  });

  it('rises as the opponent Life falls', () => {
    const fullRig = rigWithOpponentLife(5);
    const atFullLife = lethalPressure(settle(fullRig), 'p1', fullRig.defs);
    const lowRig = rigWithOpponentLife(2);
    const atLowLife = lethalPressure(settle(lowRig), 'p1', lowRig.defs);
    expect(atLowLife).toBeGreaterThan(atFullLife);
  });
});
