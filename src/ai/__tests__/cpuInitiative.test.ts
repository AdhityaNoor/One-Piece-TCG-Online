/**
 * The CPU must not pass a turn it can use.
 *
 * Two defects made "end the turn, do nothing" the top-ranked action on a board
 * full of options:
 *
 *  1. evaluateMatchObjective scored UNREALIZED damage (expectedSuccessfulLife-
 *     Damage, currentTurnLethalProbability) almost as highly as damage already
 *     dealt, and both were derived from ACTIVE bodies — so attacking, which
 *     rests the attacker, always looked like a loss of value.
 *  2. GIVE_DON was enumerated once per (DON!!, target) pair. DON!! cards are
 *     fungible, so the extra candidates were pure duplicates that crowded the
 *     8-slot lookahead budget and starved PLAY_CHARACTER of any simulation.
 */
import { describe, expect, it } from 'vitest';
import {
  buildBaseRig,
  makeCharacterDef,
  putCharacterInPlay,
  putDeckCards,
  putDon,
  putInHand,
  putLifeCards,
  type Rig,
} from '../../engine/rules/shared/__tests__/testRig';
import { chooseAction } from '../cpuPlayer';
import { generateLegalActions } from '../utilities/legalActions';
import { evaluateMatchObjective } from '../evaluation/matchObjective';
import type { GameState } from '../../engine/state/game';
import type { CpuDifficulty } from '../types';

const filler = makeCharacterDef({ cardNumber: 'FILL', baseCost: 1, basePower: 2000 });
const lifeCard = makeCharacterDef({ cardNumber: 'LIFE', baseCost: 0, basePower: 1000 });
const playable = makeCharacterDef({ cardNumber: 'PLAY', baseCost: 2, basePower: 4000 });

/** Turn-6 board whose Leader is the ONLY attacker, with castable cards in hand. */
function soloLeaderBoard(): { state: GameState; rig: Rig } {
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
  rig = putDeckCards(rig, 'p1', filler, 20).rig;
  rig = putDeckCards(rig, 'p2', filler, 20).rig;
  rig = putLifeCards(rig, 'p1', [lifeCard, lifeCard, lifeCard, lifeCard]).rig;
  rig = putLifeCards(rig, 'p2', [lifeCard, lifeCard, lifeCard, lifeCard]).rig;
  rig = putDon(rig, 'p1', 4).rig;
  rig = putInHand(rig, 'p1', playable).rig;
  rig = putInHand(rig, 'p1', { ...playable, cardDefinitionId: 'PLAY-2', cardNumber: 'PLAY-2' }).rig;

  return { rig, state: { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] } };
}

/** Turn-6 board: 4 DON!!, two castable Characters in hand, an active attacker. */
function busyBoard(): { state: GameState; rig: Rig } {
  let rig = buildBaseRig({ activePlayerId: 'p1', phase: 'main', turnNumber: 6 });
  rig = putDeckCards(rig, 'p1', filler, 20).rig;
  rig = putDeckCards(rig, 'p2', filler, 20).rig;
  rig = putLifeCards(rig, 'p1', [lifeCard, lifeCard, lifeCard, lifeCard]).rig;
  rig = putLifeCards(rig, 'p2', [lifeCard, lifeCard, lifeCard, lifeCard]).rig;
  rig = putDon(rig, 'p1', 4).rig;
  rig = putInHand(rig, 'p1', playable).rig;
  rig = putInHand(rig, 'p1', { ...playable, cardDefinitionId: 'PLAY-2', cardNumber: 'PLAY-2' }).rig;
  rig = putCharacterInPlay(rig, 'p1', makeCharacterDef({
    cardNumber: 'ATK', baseCost: 3, basePower: 6000,
  }), { summoningSick: false }).rig;

  return { rig, state: { ...rig.state, setupState: null, currentBattle: null, pendingChoices: [] } };
}

function decide(state: GameState, rig: Rig, difficulty: CpuDifficulty) {
  let n = 0;
  return chooseAction({
    state,
    playerId: 'p1',
    defs: rig.defs,
    registry: {},
    config: { difficulty, seed: 'initiative-seed' },
    createActionId: () => `act-${++n}`,
  });
}

describe('CPU initiative', () => {
  it.each<CpuDifficulty>(['easy', 'normal', 'hard'])(
    'does not end the turn with DON!!, a hand and an attacker available (%s)',
    (difficulty) => {
      const { state, rig } = busyBoard();
      const decision = decide(state, rig, difficulty);

      expect(decision).not.toBeNull();
      expect(decision?.action.type).not.toBe('END_MAIN_PHASE');
    },
  );

  it.each<CpuDifficulty>(['easy', 'normal', 'hard'])(
    'does not end the turn when the Leader is its only attacker (%s)',
    (difficulty) => {
      const { state, rig } = soloLeaderBoard();
      const decision = decide(state, rig, difficulty);

      expect(decision).not.toBeNull();
      expect(decision?.action.type).not.toBe('END_MAIN_PHASE');
    },
  );

  it('taking a Life card scores higher than merely being able to take one', () => {
    // The heart of the "do nothing" bug: potential must be worth less than the
    // damage it converts into, or holding an unrealized threat wins forever.
    const { state, rig } = busyBoard();
    const withPotential = evaluateMatchObjective(state, 'p1', rig.defs, {});

    // Same board, but one Life card has already been taken off the opponent.
    const p2 = state.players.p2;
    const damaged: GameState = {
      ...state,
      players: {
        ...state.players,
        p2: { ...p2, lifeArea: { ...p2.lifeArea, cardIds: p2.lifeArea.cardIds.slice(1) } },
      },
    };
    const withDamage = evaluateMatchObjective(damaged, 'p1', rig.defs, {});

    expect(withDamage.opponentLifePressure).toBeGreaterThan(withPotential.opponentLifePressure);
    expect(withDamage.utility).toBeGreaterThan(withPotential.utility);
  });

  it('scores a connected attack above holding the LAST attacker back', () => {
    // The precise shape of the bug. With the Leader as the only attacker, the
    // old model read the board as "0.95 lethal, 4 damage" (total power 5000 vs
    // 4 Life x 1000). Attacking rests the Leader, so both numbers fell to zero
    // and the utility dropped by ~90 — far more than the Life card was worth.
    // Ending the turn untouched therefore beat every line that attacked.
    const { state, rig } = soloLeaderBoard();
    const held = evaluateMatchObjective(state, 'p1', rig.defs, {});

    const leaderId = state.players.p1.leaderInstanceId!;
    const p2 = state.players.p2;
    const afterAttack: GameState = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [leaderId]: { ...state.cardsById[leaderId], orientation: 'rested' },
      },
      players: {
        ...state.players,
        p2: { ...p2, lifeArea: { ...p2.lifeArea, cardIds: p2.lifeArea.cardIds.slice(1) } },
      },
    };
    const swung = evaluateMatchObjective(afterAttack, 'p1', rig.defs, {});

    expect(swung.utility).toBeGreaterThan(held.utility);
  });

  it('scores a connected attack above holding one of several attackers back', () => {
    // The exact comparison the turn planner makes: "attack, then end" versus
    // "just end". Attacking rests the attacker and takes one Life card. The old
    // evaluator derived its whole win estimate from ACTIVE bodies, so resting
    // the attacker wiped out more value than the Life card gained and every
    // simulated attack lost to passing the turn.
    const { state, rig } = busyBoard();
    const held = evaluateMatchObjective(state, 'p1', rig.defs, {});

    const attackerId = state.players.p1.characterArea.cardIds[0];
    const p2 = state.players.p2;
    const afterAttack: GameState = {
      ...state,
      cardsById: {
        ...state.cardsById,
        [attackerId]: { ...state.cardsById[attackerId], orientation: 'rested' },
      },
      players: {
        ...state.players,
        p2: { ...p2, lifeArea: { ...p2.lifeArea, cardIds: p2.lifeArea.cardIds.slice(1) } },
      },
    };
    const swung = evaluateMatchObjective(afterAttack, 'p1', rig.defs, {});

    expect(swung.utility).toBeGreaterThan(held.utility);
  });

  it('enumerates one GIVE_DON per target, not one per DON!! card', () => {
    const { state, rig } = busyBoard();
    const actions = generateLegalActions({
      state,
      playerId: 'p1',
      defs: rig.defs,
      registry: {},
      createActionId: () => 'give-don',
    });

    const giveDon = actions.filter((a) => a.type === 'GIVE_DON');
    const targets = new Set(giveDon.map((a) => (a as { targetInstanceId: string }).targetInstanceId));
    // p1 controls a Leader and one Character; 4 active DON!! must not produce 8.
    expect(giveDon).toHaveLength(targets.size);
    expect(targets.size).toBe(2);
  });
});
