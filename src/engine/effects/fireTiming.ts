/**
 * Firing seams the action handlers / phase steps call into. Each looks up the
 * card's compiled EffectProgram in the injected registry and runs it through
 * the generic interpreter. No-op when the card has no compiled program, so a
 * firing point is always safe to wire in.
 */
import type { GameState } from '../state/game';
import type { ActionExecuteResult } from '../actions/actionExecuteResult';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { runTriggers, resumeProgram } from './interpreter';
import type { EffectTemplateRegistry } from './effectTemplate';

function noop(state: GameState): ActionExecuteResult {
  return { state, log: [], pendingChoices: [] };
}

/**
 * Fires a card's entry-time abilities (onEnterPlay statics then onPlay
 * triggers, 8-1-3-3 / 8-1-3-1). Call AFTER the card resolves into play.
 */
export function fireOnPlay(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTriggers(program, ['onEnterPlay', 'onPlay'], state, instanceId, defs, actionId);
}

/**
 * Fires a card's [Activate: Main] ability (8-1-3-2). Called by the
 * ACTIVATE_CARD_EFFECT handler after its structural validation passes.
 */
export function fireActivate(
  state: GameState,
  instanceId: string,
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const instance = state.cardsById[instanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return runTriggers(program, ['activateMain'], state, instanceId, defs, actionId);
}

/**
 * Resumes a suspended EffectProgram after its PendingChoice (sourceEffectId
 * 'ir') is answered. Called by the generic RESOLVE_PENDING_CHOICE handler.
 */
export function resumeChoice(
  state: GameState,
  choiceId: string,
  selectedInstanceIds: string[],
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  actionId: string | null,
): ActionExecuteResult {
  const choice = state.pendingChoices.find((c) => c.id === choiceId);
  if (!choice || choice.sourceEffectId !== 'ir' || !choice.sourceInstanceId) return noop(state);
  const instance = state.cardsById[choice.sourceInstanceId];
  if (!instance) return noop(state);
  const program = registry[instance.cardDefinitionId];
  if (!program) return noop(state);
  return resumeProgram(program, state, choice, selectedInstanceIds, defs, actionId);
}
