import { describe, expect, it } from 'vitest';
import { getGlowPlayerId } from '../actingPlayer';
import type { GameState } from '../../../engine/state/game';

/**
 * A GameState stub carrying only the four fields getGlowPlayerId and
 * getActingPlayerId read. Casting keeps the test honest about that: if either
 * ever starts reading something else, this fails loudly instead of quietly
 * passing on a hand-built object that no longer resembles a real state.
 */
function state(partial: {
  activePlayerId: string;
  pendingChoices?: { playerId: string }[];
  battleStep?: 'block' | 'counter' | 'damage';
}): GameState {
  return {
    activePlayerId: partial.activePlayerId,
    pendingChoices: partial.pendingChoices ?? [],
    currentBattle: partial.battleStep ? { step: partial.battleStep } : null,
    players: { p1: {}, p2: {} },
  } as unknown as GameState;
}

const P1 = 'p1';
const P2 = 'p2';

describe('getGlowPlayerId', () => {
  describe('pinned board (Casual / VS CPU)', () => {
    it('lights the turn player', () => {
      expect(getGlowPlayerId(state({ activePlayerId: P1 }), P1)).toBe(P1);
      expect(getGlowPlayerId(state({ activePlayerId: P2 }), P1)).toBe(P2);
    });

    it('stays put while the defender is asked to Block or Counter', () => {
      // The whole reason this is keyed to the turn player: the light must not
      // cross the Battle Line mid-attack.
      for (const step of ['block', 'counter'] as const) {
        expect(getGlowPlayerId(state({ activePlayerId: P1, battleStep: step }), P1)).toBe(P1);
      }
    });

    it('stays put while the opponent resolves a pending choice', () => {
      expect(
        getGlowPlayerId(state({ activePlayerId: P1, pendingChoices: [{ playerId: P2 }] }), P1),
      ).toBe(P1);
    });
  });

  describe('flipping board (hotseat)', () => {
    it('lights the turn player when nobody else owes an input', () => {
      expect(getGlowPlayerId(state({ activePlayerId: P1 }), null)).toBe(P1);
    });

    it('crosses to the defender for Block and Counter', () => {
      // This is the case the pinned board deliberately suppresses, and the
      // only thing that makes the light move at all in hotseat — where the
      // bottom seat is the turn player by definition.
      for (const step of ['block', 'counter'] as const) {
        expect(getGlowPlayerId(state({ activePlayerId: P1, battleStep: step }), null)).toBe(P2);
      }
    });

    it('does not cross during the damage step', () => {
      expect(getGlowPlayerId(state({ activePlayerId: P1, battleStep: 'damage' }), null)).toBe(P1);
    });

    it('follows whoever owes a pending choice', () => {
      expect(
        getGlowPlayerId(state({ activePlayerId: P1, pendingChoices: [{ playerId: P2 }] }), null),
      ).toBe(P2);
    });
  });

  it('never lights both mats: exactly one seat is ever named', () => {
    const cases: GameState[] = [
      state({ activePlayerId: P1 }),
      state({ activePlayerId: P2, battleStep: 'block' }),
      state({ activePlayerId: P1, pendingChoices: [{ playerId: P2 }] }),
    ];
    for (const local of [null, P1, P2]) {
      for (const s of cases) {
        expect([P1, P2]).toContain(getGlowPlayerId(s, local));
      }
    }
  });
});
