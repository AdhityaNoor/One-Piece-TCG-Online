import { describe, expect, it } from 'vitest';
import { validateAction, executeAction } from '../dispatch';
import type {
  EndMainPhaseAction,
  PlayCharacterAction,
  ResolvePendingChoiceAction,
  ConcedeAction,
  ChooseGoingFirstAction,
  MulliganDecisionAction,
} from '../action';
import type { PendingChoice } from '../../events/pendingChoice';
import { buildBaseRig, putDeckCards, putCharacterInPlay, makeCharacterDef, nextTestId } from '../../rules/shared/__tests__/testRig';

function endMainPhase(playerId: string): EndMainPhaseAction {
  return { type: 'END_MAIN_PHASE', actionId: nextTestId('action'), playerId };
}

function concede(playerId: string): ConcedeAction {
  return { type: 'CONCEDE', actionId: nextTestId('action'), playerId };
}

function fakePendingChoice(playerId: string, overrides: Partial<PendingChoice> = {}): PendingChoice {
  return {
    id: nextTestId('pending-choice'),
    playerId,
    kind: 'YES_NO',
    prompt: 'A fabricated pending choice, for gate testing only.',
    constraints: { min: 1, max: 1 },
    sourceInstanceId: null,
    sourceEffectId: null,
    ...overrides,
  };
}

describe('validateAction — gameOver short-circuit', () => {
  it('rejects every action once state.gameOver is set, regardless of type', () => {
    const { state, defs } = buildBaseRig();
    const overState = { ...state, gameOver: { winnerId: 'p1', reason: 'concession' as const } };

    const result = validateAction(overState, endMainPhase('p2'), defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/already ended/i);
  });

  it('executeAction throws once the game is over', () => {
    const { state, defs } = buildBaseRig();
    const overState = { ...state, gameOver: { winnerId: 'p1', reason: 'concession' as const } };
    expect(() => executeAction(overState, endMainPhase('p2'), defs)).toThrow();
  });
});

describe('validateAction — pending-choice gate (non-setup phases)', () => {
  it('blocks an unrelated action type while a PendingChoice is outstanding', () => {
    const { state, defs } = buildBaseRig({ phase: 'main' });
    const gated = { ...state, pendingChoices: [fakePendingChoice('p1')] };

    const playCharacterAction: PlayCharacterAction = {
      type: 'PLAY_CHARACTER',
      actionId: nextTestId('action'),
      playerId: 'p1',
      handCardInstanceId: 'does-not-matter',
      donInstanceIds: [],
    };
    const result = validateAction(gated, playCharacterAction, defs);
    expect(result.legal).toBe(false);
    expect(result.reasons.join(' ')).toMatch(/PendingChoice is outstanding/i);
  });

  it('blocks CHOOSE_GOING_FIRST / MULLIGAN_DECISION outside of setup, even with a PendingChoice outstanding', () => {
    const { state, defs } = buildBaseRig({ phase: 'main' });
    const gated = { ...state, pendingChoices: [fakePendingChoice('p1')] };

    const chooseGoingFirst: ChooseGoingFirstAction = { type: 'CHOOSE_GOING_FIRST', actionId: nextTestId('action'), playerId: 'p1', goingFirst: true };
    const mulligan: MulliganDecisionAction = { type: 'MULLIGAN_DECISION', actionId: nextTestId('action'), playerId: 'p1', redraw: false };

    expect(validateAction(gated, chooseGoingFirst, defs).legal).toBe(false);
    expect(validateAction(gated, mulligan, defs).legal).toBe(false);
  });

  it('lets RESOLVE_PENDING_CHOICE and CONCEDE through the gate (they reach their own per-type validators)', () => {
    const { state, defs } = buildBaseRig({ phase: 'main' });
    const { rig } = putCharacterInPlay({ state, defs }, 'p1', makeCharacterDef());
    const overflowChoice = fakePendingChoice('p1', { sourceEffectId: 'rule:characterAreaOverflow', constraints: { min: 1, max: 1, zoneId: 'characterArea' } });
    const gated = { ...rig.state, pendingChoices: [overflowChoice] };

    // CONCEDE is unconditionally legal even mid-choice.
    expect(validateAction(gated, concede('p1'), rig.defs).legal).toBe(true);

    // RESOLVE_PENDING_CHOICE passes the gate; whether it's ultimately legal is
    // up to resolvePendingChoice's own validator (covered in its own test file) —
    // here we only need to confirm the gate did NOT produce the rejection.
    const resolveAction: ResolvePendingChoiceAction = {
      type: 'RESOLVE_PENDING_CHOICE',
      actionId: nextTestId('action'),
      playerId: 'p1',
      choiceId: overflowChoice.id,
      response: ['not-a-real-card'],
    };
    const result = validateAction(gated, resolveAction, rig.defs);
    expect(result.reasons.join(' ')).not.toMatch(/PendingChoice is outstanding/i);
  });
});

describe('validateAction — pending-choice gate (setup phase exception)', () => {
  it('allows CHOOSE_GOING_FIRST through the gate during setup, and the per-type validator also accepts it', () => {
    const { state, defs } = buildBaseRig();
    const setupPhaseState = {
      ...state,
      currentPhase: 'setup' as const,
      setupState: { decidingPlayerId: 'p1', stage: 'awaitingGoingFirstChoice' as const },
      pendingChoices: [fakePendingChoice('p1', { id: 'p1__choose-going-first' })],
    };

    const action: ChooseGoingFirstAction = { type: 'CHOOSE_GOING_FIRST', actionId: nextTestId('action'), playerId: 'p1', goingFirst: true };
    const result = validateAction(setupPhaseState, action, defs);
    expect(result.legal).toBe(true);
  });

  it('allows MULLIGAN_DECISION through the gate during setup, and the per-type validator also accepts it', () => {
    const { state, defs } = buildBaseRig();
    const setupPhaseState = {
      ...state,
      currentPhase: 'setup' as const,
      setupState: {
        decidingPlayerId: 'p1',
        stage: 'awaitingMulliganDecision' as const,
        goingFirstPlayerId: 'p1',
        goingSecondPlayerId: 'p2',
      },
      // buildBaseRig() marks players hasMulliganed:true (its mid-game default);
      // reset p1 so it is genuinely p1's mulligan decision that's outstanding.
      players: { ...state.players, p1: { ...state.players.p1, hasMulliganed: false } },
      pendingChoices: [fakePendingChoice('p1', { id: 'p1__mulligan-decision' })],
    };

    const action: MulliganDecisionAction = { type: 'MULLIGAN_DECISION', actionId: nextTestId('action'), playerId: 'p1', redraw: false };
    const result = validateAction(setupPhaseState, action, defs);
    expect(result.legal).toBe(true);
  });

  it('still blocks RESOLVE_PENDING_CHOICE-unrelated types (e.g. END_MAIN_PHASE) during setup', () => {
    const { state, defs } = buildBaseRig();
    const setupPhaseState = {
      ...state,
      currentPhase: 'setup' as const,
      setupState: { decidingPlayerId: 'p1', stage: 'awaitingGoingFirstChoice' as const },
      pendingChoices: [fakePendingChoice('p1', { id: 'p1__choose-going-first' })],
    };
    const result = validateAction(setupPhaseState, endMainPhase('p1'), defs);
    expect(result.legal).toBe(false);
  });
});

describe('executeAction — routing, logging, and automatic-phase cascade', () => {
  it('routes END_MAIN_PHASE and cascades end -> refresh -> draw -> don -> main, handing the turn to the other player', () => {
    const base = buildBaseRig({ phase: 'main', turnNumber: 3, activePlayerId: 'p1' });
    const { rig } = putDeckCards(base, 'p2', makeCharacterDef(), 5);

    const result = executeAction(rig.state, endMainPhase('p1'), rig.defs);

    expect(result.state.currentPhase).toBe('main');
    expect(result.state.turnNumber).toBe(4);
    expect(result.state.activePlayerId).toBe('p2');
    // p2 (now active) should have drawn exactly one card during the cascade's Draw Phase.
    expect(result.state.players.p2.hand.cardIds).toHaveLength(1);
    expect(result.log.some((entry) => entry.type === 'TURN_PASSED')).toBe(true);
    expect(result.log.some((entry) => entry.type === 'CARD_DRAWN')).toBe(true);
    expect(result.log.some((entry) => entry.type === 'PHASE_CHANGED')).toBe(true);
  });

  it('throws (never silently no-ops) when asked to execute an action that fails validation', () => {
    const { state, defs } = buildBaseRig({ phase: 'draw' }); // not Main Phase
    expect(() => executeAction(state, endMainPhase('p1'), defs)).toThrow();
  });

  it('re-validates against the CURRENT state rather than trusting a stale prior check', () => {
    const { state, defs } = buildBaseRig({ phase: 'main', activePlayerId: 'p1' });
    const concededState = executeAction(state, concede('p1'), defs).state;
    expect(concededState.gameOver).not.toBeNull();
    // Now that the game is over, even a previously-legal action type must be rejected.
    expect(() => executeAction(concededState, endMainPhase('p2'), defs)).toThrow();
  });

  it('regression: a card drawn via the automatic Draw Phase cascade is immediately playable (currentZone, not just hand.cardIds, must reflect the move)', () => {
    const base = buildBaseRig({ phase: 'main', turnNumber: 3, activePlayerId: 'p1' });
    const charDef = makeCharacterDef({ baseCost: 0 });
    const { rig } = putDeckCards(base, 'p2', charDef, 5);

    // Ending p1's turn cascades end -> refresh -> draw -> don -> main and hands
    // the turn to p2, drawing p2 exactly 1 card along the way (runDrawPhase.ts).
    const afterCascade = executeAction(rig.state, endMainPhase('p1'), rig.defs);
    expect(afterCascade.state.activePlayerId).toBe('p2');
    expect(afterCascade.state.players.p2.hand.cardIds).toHaveLength(1);
    const drawnId = afterCascade.state.players.p2.hand.cardIds[0];

    const playDrawnCard: PlayCharacterAction = {
      type: 'PLAY_CHARACTER',
      actionId: nextTestId('action'),
      playerId: 'p2',
      handCardInstanceId: drawnId,
      donInstanceIds: [],
    };

    const validation = validateAction(afterCascade.state, playDrawnCard, rig.defs);
    expect(validation.reasons.join(' ')).not.toMatch(/is not in/i);
    expect(validation.legal).toBe(true);

    const result = executeAction(afterCascade.state, playDrawnCard, rig.defs);
    expect(result.state.players.p2.characterArea.cardIds).toHaveLength(1);
    expect(result.state.players.p2.hand.cardIds).toHaveLength(0);
  });
});
