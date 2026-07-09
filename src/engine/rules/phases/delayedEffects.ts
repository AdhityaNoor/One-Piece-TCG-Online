import type { GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import { isControllerCharacterSetActiveDonPrevented } from '../shared/characterSetActiveDonRestriction';
import type { PhaseStepResult } from './phaseStepResult';

function setDonRested(state: GameState, ids: string[], rested: boolean): GameState {
  let cardsById = state.cardsById;
  for (const id of ids) {
    const card = cardsById[id];
    if (!card) continue;
    cardsById = { ...cardsById, [id]: { ...card, donRested: rested } };
  }
  return { ...state, cardsById };
}

export function consumeEndOfTurnDelayedEffects(state: GameState, endingPlayerId: string): PhaseStepResult {
  const delayed = state.delayedEffects ?? [];
  const due = delayed.filter((effect) => effect.kind === 'setActiveControllerDonAtEndOfTurn' && effect.triggerPlayerId === endingPlayerId);
  if (due.length === 0) return { state, log: [] };

  let working = state;
  const logger = createActionLogger(state, null);
  for (const effect of due) {
    if (isControllerCharacterSetActiveDonPrevented(working, effect.ownerId, effect.sourceInstanceId)) continue;
    const player = working.players[effect.ownerId];
    if (!player) continue;
    const ids = player.costArea.cardIds.filter((id) => working.cardsById[id]?.donRested === true).slice(0, effect.maxTargets);
    working = setDonRested(working, ids, false);
    logger.push({
      actorPlayerId: effect.ownerId,
      type: 'EFFECT_RESOLVED',
      message: `${effect.ownerId} set ${ids.length} DON!! card${ids.length === 1 ? '' : 's'} as active at end of turn.`,
      data: { delayedEffectId: effect.id, count: ids.length },
      relatedCardInstanceIds: ids,
      visibility: 'public',
    });
  }

  const dueIds = new Set(due.map((effect) => effect.id));
  working = {
    ...working,
    delayedEffects: delayed.filter((effect) => !dueIds.has(effect.id)),
    log: [...working.log, ...logger.log],
  };
  return { state: working, log: logger.log };
}

export function consumeStartOfMainDelayedEffects(state: GameState): PhaseStepResult {
  const delayed = state.delayedEffects ?? [];
  const due = delayed.filter(
    (effect) =>
      effect.kind === 'restOpponentDonAtStartOfMain' &&
      effect.triggerPlayerId === state.activePlayerId &&
      effect.triggerTurnNumber <= state.turnNumber,
  );
  if (due.length === 0) return { state, log: [] };

  let working = state;
  const logger = createActionLogger(state, null);
  for (const effect of due) {
    const player = working.players[effect.triggerPlayerId];
    if (!player) continue;
    const ids = player.costArea.cardIds.filter((id) => working.cardsById[id]?.donRested !== true).slice(0, effect.maxTargets);
    working = setDonRested(working, ids, true);
    logger.push({
      actorPlayerId: effect.ownerId,
      type: 'EFFECT_RESOLVED',
      message: `${effect.triggerPlayerId} rested ${ids.length} DON!! card${ids.length === 1 ? '' : 's'} at the start of Main Phase.`,
      data: { delayedEffectId: effect.id, count: ids.length },
      relatedCardInstanceIds: ids,
      visibility: 'public',
    });
  }

  const dueIds = new Set(due.map((effect) => effect.id));
  working = {
    ...working,
    delayedEffects: delayed.filter((effect) => !dueIds.has(effect.id)),
    log: [...working.log, ...logger.log],
  };
  return { state: working, log: logger.log };
}
