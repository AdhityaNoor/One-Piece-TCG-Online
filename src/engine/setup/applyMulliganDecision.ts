/**
 * 5-2-1-6 (mulligan decisions, first player then second player), then —
 * once the second decision resolves — the automatic cascade into 5-2-1-7
 * (deal Life cards) and 5-2-1-8 (turn 1 begins, setup ends).
 */
import type { GameState } from '../state/game';
import type { MulliganDecisionAction, ValidationResult } from '../actions/action';
import type { GameLogEntry } from '../logs/logEntry';
import type { PendingChoice } from '../events/pendingChoice';
import { createSeededRng } from '../rng/seededRng';
import type { SetupExecuteResult } from './setupExecuteResult';

/** Whose mulligan decision is outstanding right now, or null if none is (wrong phase/stage, or both already decided). */
function expectedMulliganPlayerId(state: GameState): string | null {
  const setupState = state.setupState;
  if (!setupState || setupState.stage !== 'awaitingMulliganDecision' || !setupState.goingFirstPlayerId || !setupState.goingSecondPlayerId) {
    return null;
  }
  const firstPlayer = state.players[setupState.goingFirstPlayerId];
  return firstPlayer.hasMulliganed ? setupState.goingSecondPlayerId : setupState.goingFirstPlayerId;
}

export function validateMulliganDecision(state: GameState, action: MulliganDecisionAction): ValidationResult {
  const reasons: string[] = [];
  const expected = expectedMulliganPlayerId(state);
  if (state.currentPhase !== 'setup' || expected === null) {
    reasons.push('MULLIGAN_DECISION is only legal during setup, after going-first has been decided (5-2-1-6).');
  } else if (action.playerId !== expected) {
    reasons.push(`It is '${expected}'s mulligan decision right now — the player going first decides first, then the player going second (5-2-1-6).`);
  }
  return { legal: reasons.length === 0, reasons };
}

type DraftLogEntry = Omit<GameLogEntry, 'id' | 'sequence' | 'turnNumber' | 'phase' | 'causedByActionId'>;

export function executeMulliganDecision(state: GameState, action: MulliganDecisionAction): SetupExecuteResult {
  const setupState = state.setupState;
  if (!setupState || !setupState.goingFirstPlayerId || !setupState.goingSecondPlayerId) {
    throw new Error('executeMulliganDecision requires validateMulliganDecision to pass first.');
  }
  const { goingFirstPlayerId, goingSecondPlayerId } = setupState;
  const isGoingFirstPlayer = action.playerId === goingFirstPlayerId;

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

  const players = { ...state.players };
  const decidingPlayer = players[action.playerId];
  let rng = state.rng;
  // Kept in sync alongside `players` below — every id that lands in
  // deck.cardIds or hand.cardIds also needs its own CardInstance.currentZone
  // updated, since that field (not zone-array membership) is what PLAY_*
  // validators check for "is this card in the hand."
  let cardsById = { ...state.cardsById };

  if (action.redraw) {
    const combined = [...decidingPlayer.deck.cardIds, ...decidingPlayer.hand.cardIds];
    const seededRng = createSeededRng(rng.seed);
    const shuffled = seededRng.shuffle(rng, combined);
    rng = shuffled.nextState;
    const dealt = shuffled.result.slice(0, 5);
    const remaining = shuffled.result.slice(5);
    players[action.playerId] = {
      ...decidingPlayer,
      hasMulliganed: true,
      deck: { ...decidingPlayer.deck, cardIds: remaining },
      hand: { ...decidingPlayer.hand, cardIds: dealt },
    };
    for (const id of dealt) {
      cardsById[id] = { ...cardsById[id], currentZone: 'hand' };
    }
    for (const id of remaining) {
      cardsById[id] = { ...cardsById[id], currentZone: 'deck' };
    }
    pushLog({
      actorPlayerId: action.playerId,
      type: 'CARD_MOVED',
      message: `${action.playerId} returned their hand to the deck and reshuffled (5-2-1-6-1).`,
      data: {},
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
    pushLog({
      actorPlayerId: action.playerId,
      type: 'CARD_DRAWN',
      message: `${action.playerId} redrew a new opening hand of 5 (5-2-1-6-1).`,
      data: { count: dealt.length },
      relatedCardInstanceIds: dealt,
      visibility: { visibleTo: [action.playerId] },
    });
  } else {
    players[action.playerId] = { ...decidingPlayer, hasMulliganed: true };
    pushLog({
      actorPlayerId: action.playerId,
      type: 'CHOICE_RESOLVED',
      message: `${action.playerId} kept their opening hand (5-2-1-6).`,
      data: {},
      relatedCardInstanceIds: [],
      visibility: 'public',
    });
  }

  const resolvedChoiceId = `${action.playerId}__mulligan-decision`;
  const pendingChoicesAfterResolve = state.pendingChoices.filter((c) => c.id !== resolvedChoiceId);
  const newPendingChoices: PendingChoice[] = [];
  let newState: GameState;

  if (isGoingFirstPlayer) {
    // 5-2-1-6: the player going second decides next.
    const nextChoice: PendingChoice = {
      id: `${goingSecondPlayerId}__mulligan-decision`,
      playerId: goingSecondPlayerId,
      kind: 'YES_NO',
      prompt: 'Redraw your opening hand once?',
      constraints: { min: 1, max: 1, filterDescription: 'true = redraw via 5-2-1-6-1, false = keep this hand.' },
      sourceInstanceId: null,
      sourceEffectId: null,
    };
    newPendingChoices.push(nextChoice);

    newState = {
      ...state,
      players,
      cardsById,
      rng,
      activePlayerId: goingSecondPlayerId,
      pendingChoices: [...pendingChoicesAfterResolve, nextChoice],
      log: [...state.log, ...newLog],
    };
  } else {
    // Second (and final) mulligan decision just resolved.
    // 5-2-1-7: deal each player's Life cards from their (possibly just-reshuffled) deck.
    for (const player of Object.values(players)) {
      const lifeCount = player.leaderLifeValue;
      const dealt = player.deck.cardIds.slice(0, lifeCount);
      const remaining = player.deck.cardIds.slice(lifeCount);
      // 5-2-1-7: the card that was on top of the deck ends up at the bottom
      // of the Life area — reverse the dealt slice so lifeArea.cardIds[0]
      // (this zone's own "top"/next-to-be-dealt-as-damage convention) is the
      // LAST card dealt here, not the first.
      const lifeIds = [...dealt].reverse();
      players[player.playerId] = {
        ...player,
        deck: { ...player.deck, cardIds: remaining },
        lifeArea: { ...player.lifeArea, cardIds: lifeIds },
      };
      for (const id of dealt) {
        cardsById[id] = { ...cardsById[id], currentZone: 'lifeArea' };
      }
      pushLog({
        actorPlayerId: player.playerId,
        type: 'CARD_MOVED',
        message: `${player.playerId} placed ${dealt.length} cards face-down in their Life area (5-2-1-7).`,
        data: { zone: 'lifeArea', count: dealt.length },
        relatedCardInstanceIds: dealt,
        visibility: 'public', // count is public (3-1-4); identity stays hidden via lifeArea's own 'secret' zone visibility
      });
    }

    pushLog({
      actorPlayerId: goingFirstPlayerId,
      type: 'TURN_PASSED',
      message: `${goingFirstPlayerId} begins the game — turn 1 starts (5-2-1-8).`,
      data: { turnNumber: 1 },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });

    newState = {
      ...state,
      players,
      cardsById,
      rng,
      turnNumber: 1,
      currentPhase: 'refresh',
      activePlayerId: goingFirstPlayerId,
      isFirstTurnOfGame: true,
      setupState: null,
      pendingChoices: pendingChoicesAfterResolve,
      log: [...state.log, ...newLog],
    };
  }

  return { state: newState, log: newLog, pendingChoices: newPendingChoices };
}
