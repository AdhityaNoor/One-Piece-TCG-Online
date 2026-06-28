/**
 * 5-2-1-4, 5-2-1-5, 5-2-1-6 (opening hands only). The deciding player picks
 * going first or second; both players then immediately draw a 5-card
 * opening hand and a mulligan PendingChoice is queued for whoever goes
 * first (5-2-1-6 resolves first-player-then-second-player, in that order).
 */
import type { GameState } from '../state/game';
import type { ChooseGoingFirstAction, ValidationResult } from '../actions/action';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';
import type { SetupExecuteResult } from './setupExecuteResult';

export function validateChooseGoingFirst(state: GameState, action: ChooseGoingFirstAction): ValidationResult {
  const reasons: string[] = [];
  if (state.currentPhase !== 'setup' || state.setupState?.stage !== 'awaitingGoingFirstChoice') {
    reasons.push('CHOOSE_GOING_FIRST is only legal during setup, before going-first has been decided (5-2-1-5).');
  } else if (action.playerId !== state.setupState.decidingPlayerId) {
    reasons.push(`Only the deciding player ('${state.setupState.decidingPlayerId}') may choose going first or second (5-2-1-4, 5-2-1-4-1).`);
  }
  return { legal: reasons.length === 0, reasons };
}

type DraftLogEntry = Omit<GameLogEntry, 'id' | 'sequence' | 'turnNumber' | 'phase' | 'causedByActionId'>;

export function executeChooseGoingFirst(state: GameState, action: ChooseGoingFirstAction): SetupExecuteResult {
  const setupState = state.setupState;
  if (!setupState) {
    throw new Error('executeChooseGoingFirst requires validateChooseGoingFirst to pass first (setupState is null).');
  }

  const otherPlayerId = Object.keys(state.players).find((id) => id !== action.playerId);
  if (!otherPlayerId) {
    throw new Error('executeChooseGoingFirst: expected exactly two players.');
  }
  const goingFirstPlayerId = action.goingFirst ? action.playerId : otherPlayerId;
  const goingSecondPlayerId = goingFirstPlayerId === action.playerId ? otherPlayerId : action.playerId;

  const newLog: GameLogEntry[] = [];
  let sequence = state.log.length;
  const pushLog = (entry: DraftLogEntry): void => {
    sequence += 1;
    newLog.push({
      id: `setup-log-${sequence}`,
      sequence,
      turnNumber: 0,
      phase: 'setup',
      causedByActionId: action.actionId,
      ...entry,
    });
  };

  pushLog({
    actorPlayerId: action.playerId,
    type: 'CHOICE_RESOLVED',
    message: `${action.playerId} chose to ${action.goingFirst ? 'go first' : 'go second'} (5-2-1-5). ${goingFirstPlayerId} goes first.`,
    data: { goingFirstPlayerId, goingSecondPlayerId },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  // TODO (blueprint Known Limitations): 5-2-1-5-1 "at the start of the game"
  // Leader effects, and the 5-2-1-5-2 reshuffle that follows if a deck
  // changed as a result, are NOT processed here — no effect-template
  // execution model exists yet. Opening hands are dealt as if no such effect
  // exists; revisit once effect templates land.

  const players = { ...state.players };
  // The Zone helpers (and the inline slices below) only move ids between
  // zone.cardIds arrays — each CardInstance's own currentZone field has to
  // be kept in sync too, or every dealt opening-hand card fails the
  // PLAY_*'s "is not in hand" currentZone check the moment it's played.
  let cardsById = { ...state.cardsById };
  for (const player of Object.values(state.players)) {
    const dealt = player.deck.cardIds.slice(0, 5);
    const remaining = player.deck.cardIds.slice(5);
    players[player.playerId] = {
      ...player,
      hasGoneFirst: player.playerId === goingFirstPlayerId,
      deck: { ...player.deck, cardIds: remaining },
      hand: { ...player.hand, cardIds: [...player.hand.cardIds, ...dealt] },
    };
    for (const id of dealt) {
      cardsById[id] = { ...cardsById[id], currentZone: 'hand' };
    }
    pushLog({
      actorPlayerId: player.playerId,
      type: 'CARD_DRAWN',
      message: `${player.playerId} drew their opening hand of 5 (5-2-1-6).`,
      data: { count: dealt.length },
      relatedCardInstanceIds: dealt,
      visibility: { visibleTo: [player.playerId] }, // hand contents are secret to the opponent (3-4-2)
    });
  }

  const mulliganChoice: PendingChoice = {
    id: `${goingFirstPlayerId}__mulligan-decision`,
    playerId: goingFirstPlayerId,
    kind: 'YES_NO',
    prompt: 'Redraw your opening hand once?',
    constraints: { min: 1, max: 1, filterDescription: 'true = redraw via 5-2-1-6-1, false = keep this hand.' },
    sourceInstanceId: null,
    sourceEffectId: null,
  };

  const newState: GameState = {
    ...state,
    players,
    cardsById,
    activePlayerId: goingFirstPlayerId, // 5-2-1-6: mulligan decisions begin with the player going first
    setupState: {
      decidingPlayerId: setupState.decidingPlayerId,
      stage: 'awaitingMulliganDecision',
      goingFirstPlayerId,
      goingSecondPlayerId,
    },
    pendingChoices: [...state.pendingChoices.filter((c) => c.id !== `${setupState.decidingPlayerId}__choose-going-first`), mulliganChoice],
    log: [...state.log, ...newLog],
  };

  return { state: newState, log: newLog, pendingChoices: [mulliganChoice] };
}
