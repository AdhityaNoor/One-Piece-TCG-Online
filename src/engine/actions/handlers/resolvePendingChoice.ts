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
import { resumeChoice, fireLifeTrigger, fireOnKO, fireTriggerActivatedReactions, type EffectTemplateRegistry } from '../../effects';
import { finishBattleAfterKoDecision } from '../../rules/battle/damageStep';
import { resolveKoReplacementStep, validateKoReplacementResponse } from '../../rules/shared/koAttempt';
import type { CardDefinitionLookup } from '../../rules/shared/definitions';
import { computeCurrentPower } from '../../rules/shared/power';

function findChoice(state: GameState, action: ResolvePendingChoiceAction) {
  return state.pendingChoices.find((c) => c.id === action.choiceId);
}

export function validateResolvePendingChoice(state: GameState, action: ResolvePendingChoiceAction, defs: CardDefinitionLookup = {}): ValidationResult {
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
    const sel = action.response;
    if (choice.resumeState?.koReplacement) {
      reasons.push(...validateKoReplacementResponse(choice, sel));
    } else if (choice.kind === 'SELECT_OPTION') {
      const optionCount = choice.constraints.options?.length ?? 0;
      if (typeof sel !== 'number' || !Number.isInteger(sel) || sel < 0 || sel >= optionCount) {
        reasons.push(`A card-effect option choice expects an option index between 0 and ${Math.max(0, optionCount - 1)}.`);
      }
    } else if (choice.kind === 'SELECT_NUMBER') {
      const sel = action.response;
      const min = choice.constraints.numberMin ?? 0;
      const max = choice.constraints.numberMax ?? 10;
      if (typeof sel !== 'number' || !Number.isInteger(sel) || sel < min || sel > max) {
        reasons.push(`Select an integer cost between ${min} and ${max} (got ${String(sel)}).`);
      }
    } else if (!Array.isArray(sel)) {
      reasons.push('A card-effect choice expects an array of selected instance ids.');
    } else {
      const { min, max, candidateInstanceIds, maxCombinedPower } = choice.constraints;
      const candidates = candidateInstanceIds ?? [];
      const candidateSet = new Set(candidates);
      // Softlock escape: fewer eligible targets than min → allow selecting all remaining (or none).
      const effectiveMin = Math.min(min, candidates.length);
      const effectiveMax = Math.min(max, Math.max(candidates.length, 0));
      if (candidates.length === 0 && sel.length === 0) {
        // legal — nothing to pick
      } else if (sel.length < effectiveMin || sel.length > effectiveMax) {
        reasons.push(`Select between ${effectiveMin} and ${effectiveMax} target(s) (got ${sel.length}) (8-4-4-1).`);
      } else {
        const seen = new Set<string>();
        for (const id of sel) {
          if (typeof id !== 'string' || !candidateSet.has(id)) {
            reasons.push(`'${String(id)}' is not an eligible target for this effect.`);
          } else if (seen.has(id)) {
            reasons.push(`'${id}' was selected more than once.`);
          } else {
            seen.add(id);
          }
        }
        if (maxCombinedPower !== undefined && sel.length > 0) {
          const combined = sel.reduce((sum, id) => sum + computeCurrentPower(defs, state, id), 0);
          if (combined > maxCombinedPower) {
            reasons.push(`Selected cards' combined power is ${combined}, which exceeds ${maxCombinedPower}.`);
          }
        }
      }
    }
  } else if (choice.sourceEffectId === 'rule:battleKoReplacement') {
    reasons.push(...validateKoReplacementResponse(choice, action.response));
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
    return resumeChoice(state, action.choiceId, action.response as string[] | number | boolean, registry, defs, action.actionId);
  }

  if (choice.sourceEffectId === 'rule:battleKoReplacement') {
    const step = resolveKoReplacementStep(state, choice, action.response as string[] | number | boolean, defs, action.actionId);
    if (step.pendingChoices.length > 0) {
      return { state: { ...step.state, pendingChoices: [...step.state.pendingChoices, ...step.pendingChoices] }, log: step.log, pendingChoices: step.pendingChoices };
    }
    if (step.resumeKr?.battle) {
      const battle = finishBattleAfterKoDecision(step.state, defs, step.resumeKr, registry, action.actionId);
      return { state: battle.state, log: [...step.log, ...battle.log], pendingChoices: battle.pendingChoices };
    }
    return { state: step.state, log: step.log, pendingChoices: [] };
  }

  // Life [Trigger] (10-1-5-2): activate → fire the trigger, then trash the card
  // once its whole ability chain resolves; decline → keep it in hand.
  if (choice.sourceEffectId === 'rule:lifeTrigger') {
    const cardId = choice.sourceInstanceId;
    const remaining = state.pendingChoices.filter((c) => c.id !== action.choiceId);
    const activate = !!cardId && (action.response as string[]).includes(cardId);
    if (!activate || !cardId) {
      return { state: { ...state, pendingChoices: remaining }, log: [], pendingChoices: [] };
    }
    // Mark the card BEFORE firing anything: the triggered ability (or a
    // reactive response to activating it, e.g. fireTriggerActivatedReactions
    // below) may itself suspend on further player choices — chooseTargets,
    // ko, addPower, chooseOne, playFromHand, etc. all resume through the
    // generic interpreter path (resumeChoice), which has no notion of "this
    // chain started from a Life Trigger." settleLifeTriggerTrash, called from
    // dispatch.ts's executeAction after every subsequent action, is what
    // actually moves it hand -> trash once no PendingChoice still references
    // this instance — see that file's doc comment.
    const marked: GameState = {
      ...state,
      pendingChoices: remaining,
      pendingLifeTriggerTrash: [...(state.pendingLifeTriggerTrash ?? []), cardId],
    };
    const fired = fireLifeTrigger(marked, cardId, registry, defs, action.actionId);
    if (fired.pendingChoices.length > 0) {
      return { state: fired.state, log: fired.log, pendingChoices: fired.pendingChoices };
    }
    const inst = fired.state.cardsById[cardId];
    const activatorId = inst?.ownerId;
    let working = fired.state;
    let log = fired.log;
    if (activatorId) {
      const reactions = fireTriggerActivatedReactions(working, activatorId, registry, defs, action.actionId);
      working = reactions.state;
      log = [...log, ...reactions.log];
      if (reactions.pendingChoices.length > 0) {
        return { state: working, log, pendingChoices: reactions.pendingChoices };
      }
    }
    return { state: working, log, pendingChoices: [] };
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
