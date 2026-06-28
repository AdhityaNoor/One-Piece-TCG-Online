/**
 * RESOLVE_PENDING_CHOICE — generic answer to an outstanding PendingChoice
 * (blueprint Section 11). This milestone, the ONLY PendingChoice kind that
 * is ever actually queued and resolved through this generic path is the
 * Character-area-overflow forced trash (3-7-6-1), tagged with the sentinel
 * sourceEffectId 'rule:characterAreaOverflow' (see handlers/playCharacter.ts).
 * Setup's own choices (going-first, mulligan) are resolved through their
 * OWN dedicated action types instead — see setup/applyChooseGoingFirst.ts /
 * setup/applyMulliganDecision.ts — never through this handler.
 *
 * Attached DON!! on a trashed Character needs no special "return to cost
 * area" step: giving DON!! never moves it out of costArea in the first
 * place (see card.ts CardInstance.donRested doc comment) — it's already
 * sitting there, already rested. Once the Character's donAttached
 * reference is gone, there's nothing left to reconcile.
 */
import type { GameState } from '../../state/game';
import type { ResolvePendingChoiceAction, ValidationResult } from '../action';
import { createActionLogger } from '../../rules/shared/actionLogger';
import { addToZoneTop, removeFromZone } from '../../rules/shared/zoneOps';
import type { ActionExecuteResult } from '../actionExecuteResult';

function findChoice(state: GameState, action: ResolvePendingChoiceAction) {
  return state.pendingChoices.find((c) => c.id === action.choiceId);
}

export function validateResolvePendingChoice(state: GameState, action: ResolvePendingChoiceAction): ValidationResult {
  const reasons: string[] = [];
  const choice = findChoice(state, action);
  if (!choice) {
    reasons.push(`No outstanding PendingChoice with id '${action.choiceId}'.`);
    return { legal: false, reasons };
  }
  if (choice.playerId !== action.playerId) {
    reasons.push(`Choice '${action.choiceId}' belongs to '${choice.playerId}', not '${action.playerId}'.`);
  }

  if (choice.sourceEffectId === 'rule:characterAreaOverflow') {
    if (!Array.isArray(action.response) || action.response.length !== 1) {
      reasons.push('characterAreaOverflow expects exactly 1 selected card id.');
    } else {
      const player = state.players[action.playerId];
      const [chosenId] = action.response;
      if (typeof chosenId !== 'string' || !player.characterArea.cardIds.includes(chosenId)) {
        reasons.push(`'${String(chosenId)}' is not currently in ${action.playerId}'s Character Area.`);
      }
    }
  } else {
    reasons.push(`Unrecognized PendingChoice sourceEffectId '${choice.sourceEffectId}' — no resolver implemented.`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeResolvePendingChoice(state: GameState, action: ResolvePendingChoiceAction): ActionExecuteResult {
  const choice = findChoice(state, action);
  if (!choice) {
    throw new Error('executeResolvePendingChoice requires validateResolvePendingChoice to pass first.');
  }
  const logger = createActionLogger(state, action.actionId);
  const remainingChoices = state.pendingChoices.filter((c) => c.id !== action.choiceId);

  if (choice.sourceEffectId === 'rule:characterAreaOverflow') {
    const player = state.players[action.playerId];
    const [chosenId] = action.response as string[];

    const cardsById = {
      ...state.cardsById,
      [chosenId]: { ...state.cardsById[chosenId], currentZone: 'trash' as const, donAttached: [] },
    };
    const newCharacterArea = removeFromZone(player.characterArea, chosenId);
    const newTrash = addToZoneTop(player.trash, chosenId);
    const newPlayer = { ...player, characterArea: newCharacterArea, trash: newTrash };

    logger.push({
      actorPlayerId: action.playerId,
      type: 'CARD_MOVED',
      message: `${action.playerId} trashed '${chosenId}' to satisfy the Character Area limit (3-7-6-1).`,
      data: { from: 'characterArea', to: 'trash' },
      relatedCardInstanceIds: [chosenId],
      visibility: 'public',
    });
    logger.push({
      actorPlayerId: action.playerId,
      type: 'CHOICE_RESOLVED',
      message: `${action.playerId} resolved the Character Area overflow choice.`,
      data: { choiceId: action.choiceId },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });

    const nextState: GameState = {
      ...state,
      cardsById,
      players: { ...state.players, [action.playerId]: newPlayer },
      pendingChoices: remainingChoices,
      log: [...state.log, ...logger.log],
    };
    return { state: nextState, log: logger.log, pendingChoices: [] };
  }

  throw new Error(`executeResolvePendingChoice: unrecognized sourceEffectId '${choice.sourceEffectId}'.`);
}
