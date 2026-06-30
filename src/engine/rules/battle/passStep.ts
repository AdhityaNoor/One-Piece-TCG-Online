/**
 * PASS_STEP — context-dependent on currentBattle.step (no separate action
 * type per step; see action.ts PassStepAction doc comment: "generic decline
 * for an optional Block/Counter Step action").
 *
 * Defending-player-only in both cases: declining to act on your own battle
 * steps isn't a thing the attacker does.
 *
 * - step === 'block': the defending player declines to activate a Blocker.
 *   Advances straight to the Counter Step (7-1-2 -> 7-1-3). No state change
 *   beyond the step transition.
 * - step === 'counter': the defending player declines to activate any more
 *   Counters. This ends the Counter Step (7-1-3 -> 7-1-4) and synchronously
 *   triggers the fully-automatic Damage Step + End of Battle resolution
 *   (damageStep.ts) — nothing further blocks on player input from here.
 */
import type { GameState } from '../../state/game';
import type { PassStepAction, ValidationResult } from '../../actions/action';
import type { ActionExecuteResult } from '../../actions/actionExecuteResult';
import { createActionLogger } from '../shared/actionLogger';
import type { CardDefinitionLookup } from '../shared/definitions';
import { getOpponentId } from '../shared/players';
import { resolveDamageAndEndOfBattle } from './damageStep';
import type { EffectTemplateRegistry } from '../../effects';

export function validatePassStep(state: GameState, action: PassStepAction, _defs: CardDefinitionLookup): ValidationResult {
  const reasons: string[] = [];
  const battle = state.currentBattle;
  if (!battle) {
    reasons.push('PASS_STEP requires an in-progress Battle.');
    return { legal: false, reasons };
  }
  if (battle.step !== 'block' && battle.step !== 'counter') {
    reasons.push(`PASS_STEP is not legal during the '${battle.step}' step.`);
  }

  let defendingPlayerId: string | null = null;
  try {
    defendingPlayerId = getOpponentId(state, state.activePlayerId);
  } catch {
    reasons.push('Could not resolve defending player.');
  }
  if (defendingPlayerId && action.playerId !== defendingPlayerId) {
    reasons.push('Only the defending player may PASS_STEP during Block/Counter timing (7-1-2, 7-1-3).');
  }

  return { legal: reasons.length === 0, reasons };
}

export function executePassStep(
  state: GameState,
  action: PassStepAction,
  defs: CardDefinitionLookup,
  registry: EffectTemplateRegistry = {},
): ActionExecuteResult {
  const battle = state.currentBattle!;

  if (battle.step === 'block') {
    const logger = createActionLogger(state, action.actionId);
    logger.push({
      actorPlayerId: action.playerId,
      type: 'PHASE_CHANGED',
      message: `${action.playerId} declined to activate a Blocker — proceeding to the Counter Step (7-1-2 -> 7-1-3).`,
      data: { step: 'counter' },
      relatedCardInstanceIds: [],
      visibility: 'public',
    });

    const nextState: GameState = {
      ...state,
      currentBattle: { ...battle, step: 'counter' },
      log: [...state.log, ...logger.log],
    };

    return { state: nextState, log: logger.log, pendingChoices: [] };
  }

  // step === 'counter': end the Counter Step and resolve the battle synchronously.
  const preLogger = createActionLogger(state, action.actionId);
  preLogger.push({
    actorPlayerId: action.playerId,
    type: 'PHASE_CHANGED',
    message: `${action.playerId} declined to activate any further Counters — Counter Step ends (7-1-3 -> 7-1-4).`,
    data: { step: 'damage' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });
  const stateAfterPass: GameState = { ...state, log: [...state.log, ...preLogger.log] };

  const { state: resolvedState, log: damageLog, pendingChoices } = resolveDamageAndEndOfBattle(stateAfterPass, defs, action.actionId, registry);

  return { state: resolvedState, log: [...preLogger.log, ...damageLog], pendingChoices };
}
