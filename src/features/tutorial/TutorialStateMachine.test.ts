/**
 * Unit tests for the battle-chapter completion evaluators — pure
 * (GameState) -> boolean checks, so a minimal structural stand-in state is
 * enough (only the fields each evaluator reads are populated; the cast is
 * confined to the helper below).
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../engine/state/game';
import { evaluateCompletion } from './TutorialStateMachine';
import { TUTORIAL_STEPS } from './tutorialSteps';

interface FakePlayer {
  leaderInstanceId?: string;
  lifeArea?: { cardIds: string[] };
  characterArea?: { cardIds: string[] };
}

function fakeState(input: { players: Record<string, FakePlayer>; currentBattle?: object | null; gameOver?: { winnerId: string | null } | null; cardsById?: Record<string, { donAttached: string[] }> }): GameState {
  return {
    currentBattle: input.currentBattle ?? null,
    gameOver: input.gameOver ?? null,
    cardsById: input.cardsById ?? {},
    players: input.players,
  } as unknown as GameState;
}

const life = (n: number) => ({ cardIds: Array.from({ length: n }, (_, i) => `life-${i}`) });
const chars = (n: number) => ({ cardIds: Array.from({ length: n }, (_, i) => `char-${i}`) });

describe('battle-chapter completion evaluators', () => {
  it('opponentLifeAtMost: true once a Leader hit landed', () => {
    const before = fakeState({ players: { a: { lifeArea: life(5) }, b: { lifeArea: life(5) } } });
    const after = fakeState({ players: { a: { lifeArea: life(5) }, b: { lifeArea: life(4) } } });
    expect(evaluateCompletion(before, 'a', { kind: 'opponentLifeAtMost', count: 4 })).toBe(false);
    expect(evaluateCompletion(after, 'a', { kind: 'opponentLifeAtMost', count: 4 })).toBe(true);
  });

  it('playerCharactersAtLeast: true once a Character is in play', () => {
    const empty = fakeState({ players: { a: { characterArea: chars(0) }, b: {} } });
    const played = fakeState({ players: { a: { characterArea: chars(1) }, b: {} } });
    expect(evaluateCompletion(empty, 'a', { kind: 'playerCharactersAtLeast', count: 1 })).toBe(false);
    expect(evaluateCompletion(played, 'a', { kind: 'playerCharactersAtLeast', count: 1 })).toBe(true);
  });

  it('opponentCharactersAtMost: true once the target is K.O.’d', () => {
    const before = fakeState({ players: { a: {}, b: { characterArea: chars(1) } } });
    const after = fakeState({ players: { a: {}, b: { characterArea: chars(0) } } });
    expect(evaluateCompletion(before, 'a', { kind: 'opponentCharactersAtMost', count: 0 })).toBe(false);
    expect(evaluateCompletion(after, 'a', { kind: 'opponentCharactersAtMost', count: 0 })).toBe(true);
  });

  it('attackRepelledKeepingLife: requires the battle to be over AND Life preserved', () => {
    const midBattle = fakeState({ players: { a: { lifeArea: life(5) }, b: {} }, currentBattle: { step: 'counter' } });
    const repelled = fakeState({ players: { a: { lifeArea: life(5) }, b: {} }, currentBattle: null });
    const tookTheHit = fakeState({ players: { a: { lifeArea: life(4) }, b: {} }, currentBattle: null });
    expect(evaluateCompletion(midBattle, 'a', { kind: 'attackRepelledKeepingLife', count: 5 })).toBe(false);
    expect(evaluateCompletion(repelled, 'a', { kind: 'attackRepelledKeepingLife', count: 5 })).toBe(true);
    expect(evaluateCompletion(tookTheHit, 'a', { kind: 'attackRepelledKeepingLife', count: 5 })).toBe(false);
  });

  it('gameWon: only when the studying player is the winner', () => {
    const won = fakeState({ players: { a: {}, b: {} }, gameOver: { winnerId: 'a' } });
    const lost = fakeState({ players: { a: {}, b: {} }, gameOver: { winnerId: 'b' } });
    const running = fakeState({ players: { a: {}, b: {} } });
    expect(evaluateCompletion(won, 'a', { kind: 'gameWon' })).toBe(true);
    expect(evaluateCompletion(lost, 'a', { kind: 'gameWon' })).toBe(false);
    expect(evaluateCompletion(running, 'a', { kind: 'gameWon' })).toBe(false);
    expect(evaluateCompletion(null, 'a', { kind: 'gameWon' })).toBe(false);
  });
});

describe('chapter wiring status', () => {
  it('only Events and Triggers remain content-only', () => {
    const unwired = TUTORIAL_STEPS.filter((step) => !step.isEngineWired).map((step) => step.id);
    expect(unwired.sort()).toEqual(['events', 'triggers']);
    for (const step of TUTORIAL_STEPS) {
      expect(step.isEngineWired).toBe(step.completionCondition.kind !== 'needsEngineHookup');
    }
  });

  it('multi-zone objectives run with freeInteraction so nothing physically blocks the flow', () => {
    for (const id of ['leaderAttacks', 'playingCharacters', 'characterAttacks', 'counterStep', 'blockers', 'winningTheGame'] as const) {
      const step = TUTORIAL_STEPS.find((entry) => entry.id === id);
      expect(step?.freeInteraction, id).toBe(true);
    }
  });

  it('defense chapters allow PASS_STEP so the player can end their own Counter Step', () => {
    for (const id of ['counterStep', 'blockers'] as const) {
      const step = TUTORIAL_STEPS.find((entry) => entry.id === id);
      expect(step?.allowedActions, id).toContain('PASS_STEP');
    }
  });
});
