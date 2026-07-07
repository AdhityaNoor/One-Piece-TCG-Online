/**
 * Resume handlers for K.O. replacement PendingChoices (sourceEffectId === 'koReplacement').
 */
import type { GameState } from '../../state/game';
import type { PendingChoice } from '../../events/pendingChoice';
import type { ActionExecuteResult } from '../../actions/actionExecuteResult';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import {
  applyKoReplacementCost,
  applyKoToTrash,
  buildKoReplacementPayChoice,
  findKoReplacementRecord,
} from '../rules/shared/koAttempt';
import { resumeKoReplacementInInterpreter, type EffectTemplateRegistry } from './interpreter';
import { fireOnKO } from './fireTiming';
import { finishBattleAfterKoDecision } from '../rules/battle/damageStep';

function recordById(state: GameState, recordId: string) {
  return state.continuousEffects.find((r) => r.id === recordId) ?? null;
}

export function resumeKoReplacementChoice(
  state: GameState,
  choice: PendingChoice,
  response: string[] | number,
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  const kr = choice.resumeState?.koReplacement;
  if (!kr) return { state, log: [], pendingChoices: [] };

  const remaining = state.pendingChoices.filter((c) => c.id !== choice.id);
  let working: GameState = { ...state, pendingChoices: remaining };
  const record = recordById(working, kr.recordId);
  if (!record) return { state: working, log: [], pendingChoices: [] };

  if (choice.kind === 'YES_NO') {
    const accepted = response === true;
    if (!accepted) {
      const applied = applyKoToTrash(working, kr.targetInstanceId, kr.actorPlayerId, kr.cause, defs, actionId);
      working = applied.state;
      let log = applied.log;
      if (kr.cause === 'effect') {
        const fired = fireOnKO(working, kr.targetInstanceId, registry, defs, actionId);
        working = fired.state;
        log = [...log, ...fired.log];
        if (fired.pendingChoices.length > 0) {
          return { state: working, log, pendingChoices: fired.pendingChoices };
        }
      }
      return continueAfterKoDecision(working, kr, log, defs, actionId, registry);
    }
    const mod = record.koReplacementModifier!;
    if (mod.action.kind === 'trashSelf') {
      const replaced = applyKoReplacementCost(working, kr.targetInstanceId, record, [], actionId);
      working = replaced.state;
      return continueAfterKoDecision(working, kr, replaced.log, defs, actionId, registry);
    }
    const payChoice = buildKoReplacementPayChoice(
      working,
      kr.targetInstanceId,
      record,
      `${choice.id}__pay`,
      { abilityIndex: 0, opIndex: 0, bindings: {}, koReplacement: { ...kr, phase: 'payCost' } },
      defs,
    );
    if (!payChoice) return { state: working, log: [], pendingChoices: [] };
    return { state: working, log: [], pendingChoices: [payChoice] };
  }

  if (choice.kind === 'SELECT_CARDS' && kr.phase === 'payCost') {
    const selected = Array.isArray(response) ? response : [];
    const replaced = applyKoReplacementCost(working, kr.targetInstanceId, record, selected, actionId);
    working = replaced.state;
    return continueAfterKoDecision(working, kr, replaced.log, defs, actionId, registry);
  }

  return { state: working, log: [], pendingChoices: [] };
}

function continueAfterKoDecision(
  state: GameState,
  kr: NonNullable<PendingChoice['resumeState']>['koReplacement'],
  log: ActionExecuteResult['log'],
  defs: CardDefinitionLookup,
  actionId: string | null,
  registry: EffectTemplateRegistry,
): ActionExecuteResult {
  if (!kr) return { state, log, pendingChoices: [] };

  if (kr.battle) {
    const battleResult = finishBattleAfterKoDecision(state, defs, kr, registry, actionId);
    return { state: battleResult.state, log: [...log, ...battleResult.log], pendingChoices: battleResult.pendingChoices };
  }

  if (kr.ir) {
    const irResult = resumeKoReplacementInInterpreter(state, kr, defs, actionId, registry);
    return { state: irResult.state, log: [...log, ...irResult.log], pendingChoices: irResult.pendingChoices };
  }

  return { state, log, pendingChoices: [] };
}
