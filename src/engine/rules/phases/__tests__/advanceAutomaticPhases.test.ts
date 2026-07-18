import { describe, expect, it } from 'vitest';
import { advanceAutomaticPhases } from '../advanceAutomaticPhases';
import { buildBaseRig, putDeckCards, putDonDeckCards, makeCharacterDef } from '../../shared/__tests__/testRig';

describe('advanceAutomaticPhases', () => {
  it('is a no-op when currentPhase is already "main"', () => {
    const { state } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });

    const result = advanceAutomaticPhases(state);

    expect(result.state).toBe(state);
    expect(result.log).toHaveLength(0);
  });

  it('is a no-op when currentPhase is "setup"', () => {
    const base = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const setupState = { ...base.state, currentPhase: 'setup' as const };

    const result = advanceAutomaticPhases(setupState);

    expect(result.state).toBe(setupState);
    expect(result.log).toHaveLength(0);
  });

  it('runs Refresh -> Draw -> DON!! -> Main and stops, for the same active player', () => {
    const base = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1', turnNumber: 3 });
    const { rig: r1, deckIds } = putDeckCards(base, 'p1', makeCharacterDef(), 5);
    const { rig } = putDonDeckCards(r1, 'p1', 10);

    const result = advanceAutomaticPhases(rig.state);

    expect(result.state.currentPhase).toBe('main');
    expect(result.state.activePlayerId).toBe('p1');
    expect(result.state.turnNumber).toBe(3);
    expect(result.state.players.p1.hand.cardIds).toContain(deckIds[0]);
    expect(result.state.players.p1.costArea.cardIds).toHaveLength(2);
    const types = result.log.map((e) => e.type);
    // Trailing PHASE_CHANGED is runDonPhase's own "DON!! Phase" marker (pushed after
    // CARD_MOVED so runDonPhase.test.ts's log[0]-is-CARD_MOVED assertions stay valid) —
    // it's what lets PhaseTransitionBanner (MatchScreen.tsx) announce DON!! Phase the
    // same way it does Refresh/Draw.
    expect(types).toEqual(['PHASE_CHANGED', 'CARD_DRAWN', 'CARD_MOVED', 'PHASE_CHANGED']);
  });

  it('runs End -> handoff -> Refresh -> Draw -> DON!! -> Main, landing on the new active player', () => {
    const base = buildBaseRig({ phase: 'end', activePlayerId: 'p1', turnNumber: 3 });
    const { rig: r1, deckIds } = putDeckCards(base, 'p2', makeCharacterDef(), 5);
    const { rig } = putDonDeckCards(r1, 'p2', 10);

    const result = advanceAutomaticPhases(rig.state);

    expect(result.state.currentPhase).toBe('main');
    expect(result.state.activePlayerId).toBe('p2');
    expect(result.state.turnNumber).toBe(4);
    expect(result.state.players.p2.hand.cardIds).toContain(deckIds[0]);
    expect(result.state.players.p2.costArea.cardIds).toHaveLength(2);
    const types = result.log.map((e) => e.type);
    expect(types).toEqual(['PHASE_CHANGED', 'TURN_PASSED', 'PHASE_CHANGED', 'CARD_DRAWN', 'CARD_MOVED', 'PHASE_CHANGED']);
  });

  it('stops immediately once gameOver is set mid-cascade (decking out during the Draw Phase)', () => {
    // p1's deck is empty by default in buildBaseRig, so the cascade should
    // run Refresh successfully, then lose on Draw — never reaching DON!!/Main.
    const { state } = buildBaseRig({ phase: 'refresh', activePlayerId: 'p1', turnNumber: 3 });

    const result = advanceAutomaticPhases(state);

    expect(result.state.gameOver).toEqual({ winnerId: 'p2', reason: 'deckedOut' });
    expect(result.state.currentPhase).toBe('draw');
    expect(result.log.some((e) => e.type === 'GAME_OVER')).toBe(true);
    expect(result.log.some((e) => e.type === 'CARD_MOVED')).toBe(false);
  });
});
