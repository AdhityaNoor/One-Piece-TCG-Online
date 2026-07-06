/**
 * Refresh Phase (6-2). Turn-player-only, fully automatic — never blocks on
 * player input.
 *
 * Implemented, per 6-2-1 through 6-2-4:
 * 1. Return all of the turn player's "given" DON!! (6-2-3) — cleared from
 *    donAttached on their Leader/Characters. Since attachment never moves a
 *    DON!! out of costArea (see card.ts donRested doc comment), "returning"
 *    is just clearing the attachment tag.
 * 2. Set every rested card the turn player controls back to active (6-2-4)
 *    — Leader, Characters, and cost-area DON!! (3-1-2 includes the cost area
 *    in "the field"). This single sweep also covers DON!! that was resting
 *    purely from cost payment (2-7-2) as well as DON!! just returned by
 *    step 1 above (giving DON!! rests it — 6-5-5-1).
 * 3. Reset [Once Per Turn] usage (10-2-13-4) for cards the turn player
 *    controls. No card effect can populate these fields yet (effects are
 *    fully stubbed this milestone — ACTIVATE_CARD_EFFECT is rejected by the
 *    dispatcher), so this is forward-looking dead code today, kept here
 *    because it is cheap, obviously correct, and exactly where the rule
 *    says it belongs.
 *
 * FLAGGED ASSUMPTION (see card.ts CardInstance.donRested doc comment): the
 * precise split of "return given DON!!" vs. "set rested cards active" across
 * 6-2-3/6-2-4 was not re-verified against the raw PDF this session. The net
 * mechanical effect implemented here — every given DON!! returns AND every
 * rested field card (including cost-area DON!!) becomes active — matches
 * standard OPTCG play regardless of exactly how the two sub-rules divide it.
 *
 * Stage cards are NOT touched here: it's unconfirmed whether Stage cards
 * carry Active/Rested state at all (TODO, blueprint Section 19 — no citation
 * found). They're never a battle attacker/target either way, so this is
 * inert either way for this milestone's battle flow.
 *
 * 4. Clear summoningSick (3-7-4) for every Character the turn player
 *    controls. A Character is only ever summoning-sick during the turn it
 *    was played (handlers/playCharacter.ts mints it with summoningSick:
 *    true unless [Rush]) — by the time this player's NEXT Refresh Phase
 *    runs, at least one full turn cycle has passed for every Character
 *    currently on their field, so clearing it unconditionally here is safe
 *    and correct, without needing to track "the turn this card entered
 *    play" anywhere.
 */
import type { GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import type { PhaseStepResult } from './phaseStepResult';

export function runRefreshPhase(state: GameState): PhaseStepResult {
  const player = state.players[state.activePlayerId];
  const logger = createActionLogger(state, null);

  const cardsById = { ...state.cardsById };

  // A card flagged `skipNextRefresh` (a "will not become active" effect) stays rested for exactly
  // this one Refresh; the flag is consumed here so it never persists to a later Refresh.
  const setActiveUnlessFlagged = (id: string, extra: Partial<(typeof cardsById)[string]> = {}): void => {
    const inst = cardsById[id];
    if (inst.skipNextRefresh) {
      cardsById[id] = { ...inst, ...extra, skipNextRefresh: false };
    } else {
      cardsById[id] = { ...inst, ...extra, orientation: 'active' };
    }
  };

  setActiveUnlessFlagged(player.leaderInstanceId, { donAttached: [] });

  for (const id of player.characterArea.cardIds) {
    setActiveUnlessFlagged(id, { donAttached: [], summoningSick: false });
  }

  for (const id of player.stageArea.cardIds) {
    setActiveUnlessFlagged(id, { donAttached: [] });
  }

  for (const id of player.costArea.cardIds) {
    const inst = cardsById[id];
    if (inst.skipNextRefresh) {
      cardsById[id] = { ...inst, skipNextRefresh: false }; // stays rested this Refresh
    } else {
      cardsById[id] = { ...inst, donRested: false };
    }
  }

  const controlledIds = [player.leaderInstanceId, ...player.characterArea.cardIds, ...player.stageArea.cardIds];
  for (const id of controlledIds) {
    if (cardsById[id].oncePerTurnUsed.length > 0) {
      cardsById[id] = { ...cardsById[id], oncePerTurnUsed: [] };
    }
  }
  const controlledIdSet = new Set(controlledIds);
  const oncePerTurnUsage = Object.fromEntries(
    Object.entries(state.oncePerTurnUsage).filter(([key]) => !controlledIdSet.has(key.split(':')[0])),
  );

  logger.push({
    actorPlayerId: player.playerId,
    type: 'PHASE_CHANGED',
    message: `${player.playerId}'s Refresh Phase: rested cards and given DON!! returned to active (6-2).`,
    data: { phase: 'refresh' },
    relatedCardInstanceIds: [],
    visibility: 'public',
  });

  const nextState: GameState = {
    ...state,
    cardsById,
    oncePerTurnUsage,
    currentPhase: 'draw',
    log: [...state.log, ...logger.log],
  };

  return { state: nextState, log: logger.log };
}
