/**
 * Turns a scripted beat into REAL GameActions against the live GameState.
 *
 * This is the only place the tutorial's declarative script meets the
 * engine's imperative action shapes. It is deliberately pure: given a state
 * and a beat it returns the actions to dispatch, and it never dispatches
 * anything itself. That is what lets tutorialScript.e2e.test.ts play the
 * whole match head-lessly through validateAction/executeAction and prove the
 * script is legal, with no React, no store and no timers involved.
 *
 * Card references are resolved by PRINTED CARD NUMBER against the live
 * board, never by remembering instance ids from an earlier beat. Instance
 * ids are minted by the engine and a card can leave and re-enter a zone, so
 * a number lookup against current state is the only reference that stays
 * correct as the match progresses.
 */
import type { GameAction, GameActionType } from '../../engine/actions';
import type { GameState } from '../../engine/state/game';
import type { CardDefinition } from '../../engine/state/card';
import type { TutorialBeat, TutorialCardRef, TutorialScriptedAction } from './types';

export type CardDefLookup = Record<string, CardDefinition>;

/** Whose seat a beat acts from. 'narration' beats have no actor and produce no actions. */
export function actingPlayerId(beat: TutorialBeat, studyingPlayerId: string, opponentPlayerId: string): string | null {
  if (beat.actor === 'player') return studyingPlayerId;
  if (beat.actor === 'instructor') return opponentPlayerId;
  return null;
}

function cardNumberOf(state: GameState, defs: CardDefLookup, instanceId: string): string | undefined {
  return defs[state.cardsById[instanceId]?.cardDefinitionId]?.cardNumber;
}

function otherPlayerId(state: GameState, playerId: string): string {
  const other = Object.keys(state.players).find((id) => id !== playerId);
  if (!other) throw new Error('Tutorial: scripted match must have exactly two players.');
  return other;
}

/**
 * Resolves a TutorialCardRef to an instanceId on the CURRENT board.
 * `actorPlayerId` is the seat the beat acts from, so 'ownCharacter' and
 * 'opposingCharacter' are always read relative to whoever is acting — the
 * same ref means different sides of the table on the Instructor's turn.
 */
export function resolveCardRef(state: GameState, defs: CardDefLookup, actorPlayerId: string, ref: TutorialCardRef): string {
  if (ref.kind === 'leader' || ref.kind === 'opposingLeader') {
    const ownerId = ref.kind === 'leader' ? actorPlayerId : otherPlayerId(state, actorPlayerId);
    const leaderId = state.players[ownerId]?.leaderInstanceId;
    if (!leaderId) throw new Error(`Tutorial: ${ownerId} has no Leader in play.`);
    return leaderId;
  }
  const ownerId = ref.kind === 'ownCharacter' ? actorPlayerId : otherPlayerId(state, actorPlayerId);
  const area = state.players[ownerId]?.characterArea.cardIds ?? [];
  const found = area.find((instanceId) => cardNumberOf(state, defs, instanceId) === ref.cardNumber);
  if (!found) {
    throw new Error(`Tutorial: ${ownerId} has no ${ref.cardNumber} in their Character area — the script and the board have diverged.`);
  }
  return found;
}

/** Active (unrested) DON!! in `playerId`'s cost area, in board order. */
export function activeDonIds(state: GameState, playerId: string): string[] {
  const costArea = state.players[playerId]?.costArea.cardIds ?? [];
  return costArea.filter((donId) => state.cardsById[donId]?.donRested === false);
}

function handCardByNumber(state: GameState, defs: CardDefLookup, playerId: string, cardNumber: string): string {
  const hand = state.players[playerId]?.hand.cardIds ?? [];
  const found = hand.find((instanceId) => cardNumberOf(state, defs, instanceId) === cardNumber);
  if (!found) throw new Error(`Tutorial: ${playerId} does not hold ${cardNumber} — the script and the board have diverged.`);
  return found;
}

/**
 * The GameActionTypes a beat opens up, derived from its scripted action
 * rather than hand-listed. TutorialActionValidator gates the studying
 * player's dispatch on this, so it can never drift from what the beat asks
 * for — the failure mode of the previous design, where each chapter listed
 * its own `allowedActions` by hand.
 */
export function allowedActionTypes(action: TutorialScriptedAction | undefined): GameActionType[] {
  if (!action) return [];
  switch (action.kind) {
    case 'chooseGoingFirst':
      return ['CHOOSE_GOING_FIRST'];
    case 'mulligan':
      return ['MULLIGAN_DECISION'];
    case 'playCharacter':
      return ['PLAY_CHARACTER'];
    case 'playStage':
      return ['PLAY_STAGE'];
    case 'counterEvent':
      return ['ACTIVATE_COUNTER_EVENT'];
    case 'activateBlocker':
      return ['ACTIVATE_BLOCKER'];
    case 'activateEffect':
      return ['ACTIVATE_CARD_EFFECT'];
    case 'attack':
      return ['DECLARE_ATTACK'];
    case 'counterCharacter':
      return ['ACTIVATE_COUNTER_CHARACTER'];
    case 'giveDon':
      return ['GIVE_DON'];
    case 'resolveChoice':
      return ['RESOLVE_PENDING_CHOICE'];
    case 'passStep':
      return ['PASS_STEP'];
    case 'endMainPhase':
      return ['END_MAIN_PHASE'];
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export interface ResolveOptions {
  /** Mints a unique actionId per dispatch (matchStore's createActionId in the app, a counter in tests). */
  newActionId: () => string;
}

/**
 * Expands one beat into the ordered GameActions that perform it.
 *
 * Returns an ARRAY because a single teaching beat is not always a single
 * engine action: "give DON!! to Chopa-Emon" is N separate GIVE_DON
 * dispatches (6-5-5-1 gives one DON!! at a time), and the player performing
 * it in the UI will likewise tap the stepper N times.
 */
export function resolveBeatActions(
  state: GameState,
  defs: CardDefLookup,
  beat: TutorialBeat,
  actorPlayerId: string,
  options: ResolveOptions,
): GameAction[] {
  const action = beat.action;
  if (!action) return [];
  const id = options.newActionId;

  switch (action.kind) {
    case 'chooseGoingFirst':
      return [{ type: 'CHOOSE_GOING_FIRST', actionId: id(), playerId: actorPlayerId, goingFirst: action.goingFirst }];

    case 'mulligan':
      return [{ type: 'MULLIGAN_DECISION', actionId: id(), playerId: actorPlayerId, redraw: action.redraw }];

    case 'playCharacter': {
      const handCardInstanceId = handCardByNumber(state, defs, actorPlayerId, action.cardNumber);
      const cost = defs[state.cardsById[handCardInstanceId].cardDefinitionId]?.baseCost ?? 0;
      const available = activeDonIds(state, actorPlayerId);
      if (available.length < cost) {
        throw new Error(`Tutorial: ${actorPlayerId} needs ${cost} active DON!! to play ${action.cardNumber} but has ${available.length}.`);
      }
      return [{ type: 'PLAY_CHARACTER', actionId: id(), playerId: actorPlayerId, handCardInstanceId, donInstanceIds: available.slice(0, cost) }];
    }

    case 'playStage': {
      const handCardInstanceId = handCardByNumber(state, defs, actorPlayerId, action.cardNumber);
      const cost = defs[state.cardsById[handCardInstanceId].cardDefinitionId]?.baseCost ?? 0;
      const available = activeDonIds(state, actorPlayerId);
      if (available.length < cost) {
        throw new Error(`Tutorial: ${actorPlayerId} needs ${cost} active DON!! to play ${action.cardNumber} but has ${available.length}.`);
      }
      return [{ type: 'PLAY_STAGE', actionId: id(), playerId: actorPlayerId, handCardInstanceId, donInstanceIds: available.slice(0, cost) }];
    }

    case 'counterEvent': {
      const handCardInstanceId = handCardByNumber(state, defs, actorPlayerId, action.cardNumber);
      const cost = defs[state.cardsById[handCardInstanceId].cardDefinitionId]?.baseCost ?? 0;
      const available = activeDonIds(state, actorPlayerId);
      if (available.length < cost) {
        throw new Error(`Tutorial: ${actorPlayerId} needs ${cost} active DON!! for the Counter Event ${action.cardNumber} but has ${available.length}.`);
      }
      return [{ type: 'ACTIVATE_COUNTER_EVENT', actionId: id(), playerId: actorPlayerId, handCardInstanceId, donInstanceIds: available.slice(0, cost) }];
    }

    case 'activateBlocker':
      return [{
        type: 'ACTIVATE_BLOCKER',
        actionId: id(),
        playerId: actorPlayerId,
        blockerInstanceId: resolveCardRef(state, defs, actorPlayerId, { kind: 'ownCharacter', cardNumber: action.cardNumber }),
      }];

    case 'activateEffect':
      return [{
        type: 'ACTIVATE_CARD_EFFECT',
        actionId: id(),
        playerId: actorPlayerId,
        sourceInstanceId: resolveCardRef(state, defs, actorPlayerId, action.source),
        // The board's own [Activate: Main] control uses this same fixed id
        // (see useBoardSelection.ts) — the tutorial is not inventing a
        // parallel effect-addressing scheme.
        effectId: 'activateMain',
        donInstanceIds: [],
      }];

    case 'attack':
      return [{
        type: 'DECLARE_ATTACK',
        actionId: id(),
        playerId: actorPlayerId,
        attackerInstanceId: resolveCardRef(state, defs, actorPlayerId, action.attacker),
        targetInstanceId: resolveCardRef(state, defs, actorPlayerId, action.target),
      }];

    case 'counterCharacter':
      return [{
        type: 'ACTIVATE_COUNTER_CHARACTER',
        actionId: id(),
        playerId: actorPlayerId,
        handCardInstanceId: handCardByNumber(state, defs, actorPlayerId, action.cardNumber),
        boostTargetInstanceId: resolveCardRef(state, defs, actorPlayerId, action.boostTarget),
      }];

    case 'giveDon': {
      const targetInstanceId = resolveCardRef(state, defs, actorPlayerId, action.target);
      const available = activeDonIds(state, actorPlayerId);
      const count = Math.min(action.count, available.length);
      return available.slice(0, count).map((donInstanceId) => ({
        type: 'GIVE_DON' as const,
        actionId: id(),
        playerId: actorPlayerId,
        donInstanceId,
        targetInstanceId,
      }));
    }

    case 'resolveChoice': {
      const choice = state.pendingChoices.find((entry) => entry.playerId === actorPlayerId);
      if (!choice) {
        throw new Error(`Tutorial: beat '${beat.id}' answers a choice, but ${actorPlayerId} has none pending — the effect it belongs to did not raise one.`);
      }
      const pick = action.choose;
      let response: readonly string[] | number | boolean;
      switch (pick.pick) {
        case 'yes':
          response = true;
          break;
        case 'no':
          response = false;
          break;
        case 'none':
          response = [];
          break;
        case 'option':
          response = pick.index;
          break;
        case 'number':
          response = pick.value;
          break;
        case 'source': {
          if (!choice.sourceInstanceId) {
            throw new Error(`Tutorial: beat '${beat.id}' answers with the choice's source card, but the prompt has none.`);
          }
          response = [choice.sourceInstanceId];
          break;
        }
        case 'firstCandidates': {
          const candidates = choice.constraints.candidateInstanceIds ?? [];
          if (candidates.length < pick.count) {
            throw new Error(`Tutorial: beat '${beat.id}' wants ${pick.count} card(s) from the prompt, but it offers ${candidates.length}.`);
          }
          response = candidates.slice(0, pick.count);
          break;
        }
        case 'cards': {
          const candidates = choice.constraints.candidateInstanceIds ?? [];
          const chosen: string[] = [];
          for (const cardNumber of pick.cardNumbers) {
            const found = candidates.find((instanceId) => !chosen.includes(instanceId) && cardNumberOf(state, defs, instanceId) === cardNumber);
            if (!found) {
              throw new Error(`Tutorial: beat '${beat.id}' wants to choose ${cardNumber}, but it is not among the choice's candidates.`);
            }
            chosen.push(found);
          }
          response = chosen;
          break;
        }
        default: {
          const exhaustive: never = pick;
          return exhaustive;
        }
      }
      return [{ type: 'RESOLVE_PENDING_CHOICE', actionId: id(), playerId: actorPlayerId, choiceId: choice.id, response }];
    }

    case 'passStep':
      return [{ type: 'PASS_STEP', actionId: id(), playerId: actorPlayerId }];

    case 'endMainPhase':
      return [{ type: 'END_MAIN_PHASE', actionId: id(), playerId: actorPlayerId }];

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/**
 * Does a dispatch the studying player just attempted satisfy the current
 * beat? Compares the SHAPE that matters for the lesson (which card, which
 * target), not the whole action — the player picks their own DON!! when
 * paying a cost, and any legal set of active DON!! is a correct answer to
 * "play Chopa-Emon".
 */
export function matchesBeat(
  state: GameState,
  defs: CardDefLookup,
  beat: TutorialBeat,
  actorPlayerId: string,
  attempted: GameAction,
): boolean {
  const action = beat.action;
  if (!action) return false;
  if (!allowedActionTypes(action).includes(attempted.type)) return false;

  switch (action.kind) {
    case 'playCharacter':
      return attempted.type === 'PLAY_CHARACTER' && cardNumberOf(state, defs, attempted.handCardInstanceId) === action.cardNumber;
    case 'playStage':
      return attempted.type === 'PLAY_STAGE' && cardNumberOf(state, defs, attempted.handCardInstanceId) === action.cardNumber;
    case 'counterEvent':
      return attempted.type === 'ACTIVATE_COUNTER_EVENT' && cardNumberOf(state, defs, attempted.handCardInstanceId) === action.cardNumber;
    case 'activateBlocker':
      return attempted.type === 'ACTIVATE_BLOCKER' && cardNumberOf(state, defs, attempted.blockerInstanceId) === action.cardNumber;
    case 'activateEffect':
      return attempted.type === 'ACTIVATE_CARD_EFFECT' && attempted.sourceInstanceId === resolveCardRef(state, defs, actorPlayerId, action.source);
    case 'attack':
      return (
        attempted.type === 'DECLARE_ATTACK' &&
        attempted.attackerInstanceId === resolveCardRef(state, defs, actorPlayerId, action.attacker) &&
        attempted.targetInstanceId === resolveCardRef(state, defs, actorPlayerId, action.target)
      );
    case 'counterCharacter':
      return (
        attempted.type === 'ACTIVATE_COUNTER_CHARACTER' &&
        cardNumberOf(state, defs, attempted.handCardInstanceId) === action.cardNumber &&
        attempted.boostTargetInstanceId === resolveCardRef(state, defs, actorPlayerId, action.boostTarget)
      );
    case 'giveDon':
      return attempted.type === 'GIVE_DON' && attempted.targetInstanceId === resolveCardRef(state, defs, actorPlayerId, action.target);
    case 'mulligan':
      return attempted.type === 'MULLIGAN_DECISION' && attempted.redraw === action.redraw;
    case 'chooseGoingFirst':
      return attempted.type === 'CHOOSE_GOING_FIRST' && attempted.goingFirst === action.goingFirst;
    case 'passStep':
    case 'endMainPhase':
      return true;
    // The engine already enforces which responses are legal, and the board's
    // own picker is what the player uses — the objective text says what to
    // take, and taking something else legal is not worth blocking mid-prompt.
    case 'resolveChoice':
      return attempted.type === 'RESOLVE_PENDING_CHOICE';
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/**
 * Has the player finished what the current beat asked for?
 *
 * Most beats are one dispatch, so the dispatch counter answers it. The one
 * exception is `giveDon`, which is N dispatches: the script hands over all
 * `count` when it auto-plays, but a player only has to reach `minCount` for
 * the lesson to have landed, so that one is measured against the board (how
 * many DON!! are actually attached) rather than against clicks.
 */
export function beatSatisfied(
  state: GameState | null,
  defs: CardDefLookup,
  beat: TutorialBeat,
  actorPlayerId: string,
  dispatchesThisBeat: number,
): boolean {
  const action = beat.action;
  if (!action) return true; // narration: nothing to do but read
  if (action.kind !== 'giveDon') return dispatchesThisBeat >= 1;
  if (!state) return false;
  try {
    const targetInstanceId = resolveCardRef(state, defs, actorPlayerId, action.target);
    return (state.cardsById[targetInstanceId]?.donAttached.length ?? 0) >= (action.minCount ?? action.count);
  } catch {
    return false;
  }
}
