/**
 * DON!! Phase (6-4). Turn-player-only, fully automatic.
 *
 * 6-4-1: add 2 DON!! from the DON!! deck to the cost area, except the
 * player going first gets only 1 on turn 1 specifically (isFirstTurnOfGame
 * — see game.ts doc comment; turn 2, the second player's first turn, gets
 * the normal 2).
 *
 * New cost-area DON!! arrive active (donRested left undefined/false) — they
 * were never resting. Caps at however many DON!! remain in the DON!! deck,
 * defensively, though running out is not expected to happen in a normal
 * 10-DON!! deck within a realistic game length.
 */
import type { GameState } from '../../state/game';
import { fieldDonIds } from '../../effects/abilityCost';
import { createActionLogger } from '../shared/actionLogger';
import { addToZoneTop } from '../shared/zoneOps';
import type { PhaseStepResult } from './phaseStepResult';
import { consumeStartOfMainDelayedEffects } from './delayedEffects';
import { applyDonPhasePlacementRouting } from './donPhasePlacement';

export function runDonPhase(state: GameState): PhaseStepResult {
  const player = state.players[state.activePlayerId];
  const logger = createActionLogger(state, null);

  // Capture before placement — OP13-003 routes 1 new DON!! only if field already had DON!!.
  const hadFieldDonBeforePlacement = fieldDonIds(state, player.playerId).length > 0;

  const amount = Math.min(state.isFirstTurnOfGame ? 1 : 2, player.donDeck.cardIds.length);
  const drawnIds = player.donDeck.cardIds.slice(0, amount);
  const remainingDonDeck = player.donDeck.cardIds.slice(amount);

  let costArea = player.costArea;
  for (const id of drawnIds) {
    costArea = addToZoneTop(costArea, id);
  }

  const newPlayer = {
    ...player,
    donDeck: { ...player.donDeck, cardIds: remainingDonDeck },
    costArea,
  };

  const cardsById = { ...state.cardsById };
  for (const id of drawnIds) {
    cardsById[id] = { ...cardsById[id], currentZone: 'costArea', faceState: 'faceUp', donRested: false };
  }

  logger.push({
    actorPlayerId: player.playerId,
    type: 'CARD_MOVED',
    message: `${player.playerId} added ${drawnIds.length} DON!! to their cost area (6-4-1).`,
    data: { zone: 'costArea', count: drawnIds.length },
    relatedCardInstanceIds: drawnIds,
    visibility: 'public',
  });

  // Pushed after CARD_MOVED (not before) so existing log[0]-is-CARD_MOVED assertions in
  // runDonPhase.test.ts stay valid — this entry exists purely so the UI (PhaseTransitionBanner)
  // can announce "DON!! Phase" the same way it does for Refresh/Draw; refresh/draw phases don't
  // have this ordering constraint since they only ever push one entry each.
  logger.push({
    actorPlayerId: player.playerId,
    type: 'PHASE_CHANGED',
    message: `${player.playerId}'s DON!! Phase: ${drawnIds.length} DON!! added to the cost area (6-4).`,
    data: { phase: 'don' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const afterPlace: GameState = {
    ...state,
    players: { ...state.players, [player.playerId]: newPlayer },
    cardsById,
    currentPhase: 'main',
    log: [...state.log, ...logger.log],
  };

  const routed = applyDonPhasePlacementRouting(
    afterPlace,
    player.playerId,
    drawnIds,
    hadFieldDonBeforePlacement,
  );
  const beforeMain = routed.state;

  const delayed = consumeStartOfMainDelayedEffects(beforeMain);
  return { state: delayed.state, log: [...logger.log, ...routed.log, ...delayed.log] };
}
