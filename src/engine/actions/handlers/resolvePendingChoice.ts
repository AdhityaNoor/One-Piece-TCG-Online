/**
 * RESOLVE_PENDING_CHOICE — generic answer to an outstanding PendingChoice
 * (blueprint Section 11). It handles rule-level character overflow,
 * interpreter-suspended curated EffectProgram choices, and Life [Trigger]
 * prompts.
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
import { resumeChoice, fireTrigger, type EffectTemplateRegistry } from '../../effects';
import type { CardDefinitionLookup } from '../../rules/shared/definitions';

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
  } else if (choice.sourceEffectId === 'ir') {
    // Interpreter-suspended card effect: validate the selection against the
    // choice's own candidate set + min/max (no registry needed for validation).
    const sel = action.response;
    const { min, max, candidateInstanceIds } = choice.constraints;
    if (!Array.isArray(sel)) {
      reasons.push('A card-effect choice expects an array of selected instance ids.');
    } else {
      if (sel.length < min || sel.length > max) {
        reasons.push(`Select between ${min} and ${max} target(s) (got ${sel.length}) (8-4-4-1).`);
      }
      const candidates = new Set(candidateInstanceIds ?? []);
      const seen = new Set<string>();
      for (const id of sel) {
        if (typeof id !== 'string' || !candidates.has(id)) {
          reasons.push(`'${String(id)}' is not an eligible target for this effect.`);
        } else if (seen.has(id)) {
          reasons.push(`'${id}' was selected more than once.`);
        } else {
          seen.add(id);
        }
      }
    }
  } else if (choice.sourceEffectId === 'rule:lifeTrigger') {
    // [] = decline (keep in hand); [the Life card id] = activate the trigger.
    const sel = action.response;
    if (!Array.isArray(sel) || (sel.length > 0 && (sel.length !== 1 || sel[0] !== choice.sourceInstanceId))) {
      reasons.push('A Life [Trigger] choice expects [] (decline) or [the Life card id] (activate).');
    }
  } else {
    reasons.push(`Unrecognized PendingChoice sourceEffectId '${choice.sourceEffectId}' — no resolver implemented.`);
  }

  return { legal: reasons.length === 0, reasons };
}

export function executeResolvePendingChoice(
  state: GameState,
  action: ResolvePendingChoiceAction,
  defs: CardDefinitionLookup = {},
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const choice = findChoice(state, action);
  if (!choice) {
    throw new Error('executeResolvePendingChoice requires validateResolvePendingChoice to pass first.');
  }

  // Interpreter-suspended card effect: resume the program with the selection.
  if (choice.sourceEffectId === 'ir') {
    return resumeChoice(state, action.choiceId, action.response as string[], registry, defs, action.actionId);
  }

  // Life [Trigger] (10-1-5-2): activate → fire the trigger + trash the card;
  // decline → keep it in hand.
  if (choice.sourceEffectId === 'rule:lifeTrigger') {
    const cardId = choice.sourceInstanceId;
    const remaining = state.pendingChoices.filter((c) => c.id !== action.choiceId);
    const activate = !!cardId && (action.response as string[]).includes(cardId);
    if (!activate || !cardId) {
      return { state: { ...state, pendingChoices: remaining }, log: [], pendingChoices: [] };
    }
    const fired = fireTrigger({ ...state, pendingChoices: remaining }, cardId, registry, defs, action.actionId);
    const inst = fired.state.cardsById[cardId];
    const owner = fired.state.players[inst.ownerId];
    const working: GameState = {
      ...fired.state,
      players: { ...fired.state.players, [inst.ownerId]: { ...owner, hand: removeFromZone(owner.hand, cardId), trash: addToZoneTop(owner.trash, cardId) } },
      cardsById: { ...fired.state.cardsById, [cardId]: { ...inst, currentZone: 'trash' } },
    };
    return { state: working, log: fired.log, pendingChoices: fired.pendingChoices };
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
