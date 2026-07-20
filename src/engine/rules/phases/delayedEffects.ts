import type { DelayedEffectRecord, GameState } from '../../state/game';
import { createActionLogger } from '../shared/actionLogger';
import { applyKoToTrash } from '../shared/koAttempt';
import type { CardDefinitionLookup } from '../shared/definitions';
import { isControllerCharacterSetActiveDonPrevented } from '../shared/characterSetActiveDonRestriction';
import { getOpponentId } from '../shared/players';
import { evaluateGates } from '../../effects/gates';
import { addToZoneBottom, addToZoneTop, removeFromZone } from '../shared/zoneOps';
import type { PhaseStepResult } from './phaseStepResult';
import { cardTypeIncludes } from '../shared/typeMatching';

function setDonRested(state: GameState, ids: string[], rested: boolean): GameState {
  let cardsById = state.cardsById;
  for (const id of ids) {
    const card = cardsById[id];
    if (!card) continue;
    cardsById = { ...cardsById, [id]: { ...card, donRested: rested } };
  }
  return { ...state, cardsById };
}

function trashCardState(state: GameState, instanceId: string): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  const owner = state.players[inst.ownerId];
  if (!owner) return state;
  const fromZone = inst.currentZone;
  const newOwner = {
    ...owner,
    hand: removeFromZone(owner.hand, instanceId),
    deck: removeFromZone(owner.deck, instanceId),
    characterArea: removeFromZone(owner.characterArea, instanceId),
    stageArea: removeFromZone(owner.stageArea, instanceId),
    lifeArea: removeFromZone(owner.lifeArea, instanceId),
    trash: addToZoneTop(owner.trash, instanceId),
  };
  return {
    ...state,
    players: { ...state.players, [inst.ownerId]: newOwner },
    cardsById: { ...state.cardsById, [instanceId]: { ...inst, currentZone: 'trash', donAttached: [], revealedTo: 'all' } },
    continuousEffects: state.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
  };
}

function moveInstanceToBottomDeck(state: GameState, instanceId: string): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst) return state;
  const owner = state.players[inst.ownerId];
  if (!owner) return state;
  const newOwner = {
    ...owner,
    hand: removeFromZone(owner.hand, instanceId),
    trash: removeFromZone(owner.trash, instanceId),
    characterArea: removeFromZone(owner.characterArea, instanceId),
    stageArea: removeFromZone(owner.stageArea, instanceId),
    lifeArea: removeFromZone(owner.lifeArea, instanceId),
    deck: addToZoneBottom(owner.deck, instanceId),
  };
  return {
    ...state,
    players: { ...state.players, [inst.ownerId]: newOwner },
    cardsById: {
      ...state.cardsById,
      [instanceId]: { ...inst, currentZone: 'deck', donAttached: [], summoningSick: false, revealedTo: [] },
    },
    continuousEffects: state.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
  };
}

function returnDonToDonDeckState(state: GameState, donInstanceId: string): GameState {
  const inst = state.cardsById[donInstanceId];
  if (!inst || inst.currentZone !== 'costArea') return state;
  const owner = state.players[inst.ownerId];
  if (!owner) return state;
  let cardsById = { ...state.cardsById };
  for (const [id, card] of Object.entries(cardsById)) {
    if (card.donAttached.includes(donInstanceId)) {
      cardsById = { ...cardsById, [id]: { ...card, donAttached: card.donAttached.filter((donId) => donId !== donInstanceId) } };
    }
  }
  cardsById[donInstanceId] = { ...inst, currentZone: 'donDeck', donRested: false };
  return {
    ...state,
    cardsById,
    players: {
      ...state.players,
      [inst.ownerId]: {
        ...owner,
        costArea: removeFromZone(owner.costArea, donInstanceId),
        donDeck: addToZoneTop(owner.donDeck, donInstanceId),
      },
    },
  };
}

function moveDeckTopToLifeState(state: GameState, playerId: string, faceUp = false): GameState {
  const player = state.players[playerId];
  const topId = player?.deck.cardIds[0];
  if (!topId) return state;
  const inst = state.cardsById[topId];
  if (!inst) return state;
  const newOwner = {
    ...player,
    deck: removeFromZone(player.deck, topId),
    lifeArea: addToZoneTop(player.lifeArea, topId),
  };
  return {
    ...state,
    players: { ...state.players, [playerId]: newOwner },
    cardsById: {
      ...state.cardsById,
      [topId]: {
        ...inst,
        currentZone: 'lifeArea',
        faceState: faceUp ? 'faceUp' : 'faceDown',
        donAttached: [],
        summoningSick: false,
        revealedTo: faceUp ? 'all' : [],
      },
    },
    continuousEffects: state.continuousEffects.filter((ce) => ce.sourceInstanceId !== topId),
  };
}

function returnInstanceToHandState(state: GameState, instanceId: string): GameState {
  const inst = state.cardsById[instanceId];
  if (!inst || inst.currentZone === 'hand') return state;
  const owner = state.players[inst.ownerId];
  if (!owner) return state;
  const newOwner = {
    ...owner,
    hand: addToZoneBottom(owner.hand, instanceId),
    characterArea: removeFromZone(owner.characterArea, instanceId),
    stageArea: removeFromZone(owner.stageArea, instanceId),
  };
  return {
    ...state,
    players: { ...state.players, [inst.ownerId]: newOwner },
    cardsById: {
      ...state.cardsById,
      [instanceId]: {
        ...inst,
        currentZone: 'hand',
        donAttached: [],
        summoningSick: false,
        revealedTo: [inst.ownerId],
      },
    },
    continuousEffects: state.continuousEffects.filter((ce) => ce.sourceInstanceId !== instanceId),
  };
}

function stripDue(delayed: DelayedEffectRecord[], due: DelayedEffectRecord[]): DelayedEffectRecord[] {
  const dueIds = new Set(due.map((effect) => effect.id));
  return delayed.filter((effect) => !dueIds.has(effect.id));
}

function hasTriggerPlayerId(effect: DelayedEffectRecord): effect is DelayedEffectRecord & { triggerPlayerId: string } {
  return 'triggerPlayerId' in effect;
}

export function consumeEndOfTurnDelayedEffects(
  state: GameState,
  endingPlayerId: string,
  defs: CardDefinitionLookup = {},
): PhaseStepResult {
  const delayed = state.delayedEffects ?? [];
  const due = delayed.filter(
    (effect): effect is DelayedEffectRecord & { triggerPlayerId: string } =>
      hasTriggerPlayerId(effect) && effect.triggerPlayerId === endingPlayerId,
  );
  if (due.length === 0) return { state, log: [] };

  let working = state;
  const logger = createActionLogger(state, null);

  for (const effect of due) {
    if (effect.kind === 'setActiveControllerDonAtEndOfTurn') {
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
      continue;
    }

    if (effect.kind === 'trashSourceAtEndOfTurn') {
      const inst = working.cardsById[effect.sourceInstanceId];
      if (!inst || inst.currentZone === 'trash') continue;
      const koed = applyKoToTrash(working, effect.sourceInstanceId, effect.ownerId, 'effect', defs, null);
      working = { ...koed.state, log: [...working.log, ...koed.log] };
      logger.log.push(...koed.log);
      continue;
    }

    if (effect.kind === 'moveInstanceToBottomDeckAtEndOfTurn') {
      const inst = working.cardsById[effect.targetInstanceId];
      if (!inst || inst.currentZone === 'deck') continue;
      working = moveInstanceToBottomDeck(working, effect.targetInstanceId);
      logger.push({
        actorPlayerId: effect.ownerId,
        type: 'CARD_MOVED',
        message: `${effect.targetInstanceId} was placed at the bottom of its owner's deck at end of turn.`,
        data: { delayedEffectId: effect.id, instanceId: effect.targetInstanceId, position: 'bottom' },
        relatedCardInstanceIds: [effect.targetInstanceId],
        visibility: 'public',
      });
      continue;
    }

    if (effect.kind === 'trashControllerCharacterAtEndOfTurn') {
      const player = working.players[effect.ownerId];
      if (!player) continue;
      const targetId = player.characterArea.cardIds.find((id) => {
        const inst = working.cardsById[id];
        if (!inst) return false;
        const def = defs[inst.cardDefinitionId];
        if (!def || def.category !== 'character') return false;
        if (effect.typeIncludes && !cardTypeIncludes(def.types, effect.typeIncludes)) return false;
        return true;
      });
      if (!targetId) continue;
      const koed = applyKoToTrash(working, targetId, effect.ownerId, 'effect', defs, null);
      working = { ...koed.state, log: [...working.log, ...koed.log] };
      logger.log.push(...koed.log);
      continue;
    }

    if (effect.kind === 'returnDonToMatchOpponentAtEndOfTurn') {
      const opponentId = getOpponentId(working, effect.ownerId);
      const returned: string[] = [];
      while (true) {
        const ctrlCount = working.players[effect.ownerId]?.costArea.cardIds.length ?? 0;
        const oppCount = working.players[opponentId]?.costArea.cardIds.length ?? 0;
        if (ctrlCount <= oppCount) break;
        const donIds = working.players[effect.ownerId]?.costArea.cardIds ?? [];
        const donId = donIds[donIds.length - 1];
        if (!donId) break;
        working = returnDonToDonDeckState(working, donId);
        returned.push(donId);
      }
      if (returned.length > 0) {
        logger.push({
          actorPlayerId: effect.ownerId,
          type: 'DON_RETURNED',
          message: `${effect.ownerId} returned ${returned.length} DON!! card${returned.length === 1 ? '' : 's'} to match their opponent's field count at end of turn.`,
          data: { delayedEffectId: effect.id, donInstanceIds: returned },
          relatedCardInstanceIds: returned,
          visibility: 'public',
        });
      }
      continue;
    }

    if (effect.kind === 'moveDeckTopToLifeAtEndOfTurn') {
      if (effect.requiresLeaderType) {
        const gateOk = evaluateGates(
          [{ kind: 'leaderType', type: effect.requiresLeaderType }],
          working,
          defs,
          effect.ownerId,
          effect.sourceInstanceId,
        );
        if (!gateOk) continue;
      }
      const beforeTop = working.players[effect.ownerId]?.deck.cardIds[0];
      if (!beforeTop) continue;
      working = moveDeckTopToLifeState(working, effect.ownerId, false);
      logger.push({
        actorPlayerId: effect.ownerId,
        type: 'CARD_MOVED',
        message: `${beforeTop} was added from the top of the deck to Life at end of turn.`,
        data: { delayedEffectId: effect.id, instanceId: beforeTop, position: 'top' },
        relatedCardInstanceIds: [beforeTop],
        visibility: 'public',
      });
      continue;
    }

    if (effect.kind === 'returnSourceToHandAtEndOfTurn') {
      const inst = working.cardsById[effect.sourceInstanceId];
      if (!inst || inst.currentZone === 'hand') continue;
      working = returnInstanceToHandState(working, effect.sourceInstanceId);
      logger.push({
        actorPlayerId: effect.ownerId,
        type: 'CARD_MOVED',
        message: `${effect.sourceInstanceId} was returned to its owner's hand at end of turn.`,
        data: { delayedEffectId: effect.id, instanceId: effect.sourceInstanceId, position: 'hand' },
        relatedCardInstanceIds: [effect.sourceInstanceId],
        visibility: 'public',
      });
      continue;
    }

    if (effect.kind === 'preventRefreshOnCharacterAtEndOfTurn') {
      const inst = working.cardsById[effect.targetInstanceId];
      if (!inst || inst.currentZone !== 'characterArea') continue;
      if (effect.requireRested && inst.orientation !== 'rested') continue;
      if (inst.donAttached.length < effect.minDonAttached) continue;
      if (inst.skipNextRefresh === true) continue;
      working = {
        ...working,
        cardsById: {
          ...working.cardsById,
          [effect.targetInstanceId]: { ...inst, skipNextRefresh: true },
        },
      };
      logger.push({
        actorPlayerId: effect.ownerId,
        type: 'EFFECT_RESOLVED',
        message: `${effect.targetInstanceId} will not become active in its controller's next Refresh Phase.`,
        data: { delayedEffectId: effect.id, targetInstanceId: effect.targetInstanceId },
        relatedCardInstanceIds: [effect.targetInstanceId],
        visibility: 'public',
      });
    }
  }

  working = {
    ...working,
    delayedEffects: stripDue(delayed, due),
    log: [...working.log, ...logger.log],
  };
  return { state: working, log: logger.log };
}

export function consumeStartOfMainDelayedEffects(state: GameState): PhaseStepResult {
  const delayed = state.delayedEffects ?? [];
  const due = delayed.filter(
    (effect): effect is Extract<DelayedEffectRecord, { kind: 'restOpponentDonAtStartOfMain' }> =>
      effect.kind === 'restOpponentDonAtStartOfMain'
      && effect.triggerPlayerId === state.activePlayerId
      && effect.triggerTurnNumber <= state.turnNumber,
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

export function consumeEndOfBattleDelayedEffects(
  state: GameState,
  attackerInstanceId: string | null,
): PhaseStepResult {
  if (!attackerInstanceId) return { state, log: [] };
  const delayed = state.delayedEffects ?? [];
  const due = delayed.filter(
    (effect) =>
      (effect.kind === 'moveSourceToBottomDeckAtEndOfBattle' || effect.kind === 'moveInstanceToBottomDeckAtEndOfBattle')
      && effect.battleAttackerInstanceId === attackerInstanceId,
  );
  if (due.length === 0) return { state, log: [] };

  let working = state;
  const logger = createActionLogger(state, null);
  for (const effect of due) {
    const instanceId = effect.kind === 'moveInstanceToBottomDeckAtEndOfBattle'
      ? effect.targetInstanceId
      : effect.sourceInstanceId;
    const inst = working.cardsById[instanceId];
    if (!inst || inst.currentZone === 'deck') continue;
    working = moveInstanceToBottomDeck(working, instanceId);
    logger.push({
      actorPlayerId: effect.ownerId,
      type: 'CARD_MOVED',
      message: `${instanceId} was placed at the bottom of its owner's deck at end of battle.`,
      data: { delayedEffectId: effect.id, instanceId, position: 'bottom' },
      relatedCardInstanceIds: [instanceId],
      visibility: 'public',
    });
  }

  working = {
    ...working,
    delayedEffects: stripDue(delayed, due),
    log: [...working.log, ...logger.log],
  };
  return { state: working, log: logger.log };
}
