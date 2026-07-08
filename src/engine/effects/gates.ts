/**
 * AbilityGate evaluator.
 *
 * "If <board state>" preconditions on abilities (effectIr.ts: AbilityGate[])
 * are checked here — pure read over GameState + defs, no mutations.
 * All gates in the array must hold (they are ANDed).
 *
 * Called from:
 *   - interpreter.ts: before a triggered/activated ability fires.
 *   - power.ts: for continuous power modifiers that carry a gate condition.
 */
import type { AbilityGate } from './effectIr';
import type { GameState } from '../state/game';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { getOpponentId } from '../rules/shared/players';
import { fieldDonIds } from './abilityCost';
import { computeCurrentPower } from '../rules/shared/power';
import { cardHasNoBaseEffect } from './cardHasNoBaseEffect';

function typeMatches(defTypes: string[], required: string): boolean {
  const normalized = required.toLowerCase();
  return defTypes.some((type) => type.toLowerCase().includes(normalized));
}

function currentCostForGate(state: GameState, defs: CardDefinitionLookup, instanceId: string): number {
  const inst = state.cardsById[instanceId];
  const base = inst ? defs[inst.cardDefinitionId]?.baseCost ?? 0 : 0;
  let delta = 0;
  for (const record of state.continuousEffects) {
    const mod = record.costModifier;
    if (!mod || mod.appliesToInstanceId !== instanceId) continue;
    delta += mod.amount;
  }
  return Math.max(0, base + delta);
}

export interface GateEvalContext {
  /** DON!! returned to the DON!! deck during the current cost-payment batch. */
  donReturnedCount?: number;
  /** Character just played from hand (onCharacterPlayedFromHand reactive window). */
  playedCharacterInstanceId?: string;
}

export function evaluateGates(
  gates: AbilityGate[],
  state: GameState,
  defs: CardDefinitionLookup,
  ownerId: string,
  sourceInstanceId?: string,
  eventContext?: GateEvalContext,
): boolean {
  for (const gate of gates) {
    if (!evaluateGate(gate, state, defs, ownerId, sourceInstanceId, eventContext)) return false;
  }
  return true;
}

function evaluateGate(
  gate: AbilityGate,
  state: GameState,
  defs: CardDefinitionLookup,
  ownerId: string,
  sourceInstanceId?: string,
  eventContext?: GateEvalContext,
): boolean {
  const player = state.players[ownerId];
  if (!player) return false;

  switch (gate.kind) {
    case 'leaderName': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return def.name === gate.name;
    }

    case 'leaderType': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return typeMatches(def.types, gate.type);
    }

    case 'leaderMulticolor': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return def.colors.length > 1;
    }

    case 'selfCharacterCount': {
      const count = player.characterArea.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfRestedCharacterCount': {
      const count = player.characterArea.cardIds.filter((id) => state.cardsById[id]?.orientation === 'rested').length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'opponentCharacterCount': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      const count = opponent.characterArea.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfDonFieldCount': {
      const count = fieldDonIds(state, ownerId).length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfRestedDonCount': {
      const attached = new Set<string>();
      for (const inst of Object.values(state.cardsById)) {
        if (inst.controllerId !== ownerId) continue;
        for (const donId of inst.donAttached) attached.add(donId);
      }
      const count = player.costArea.cardIds.filter((id) => state.cardsById[id]?.donRested === true && !attached.has(id)).length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfLife': {
      const count = player.lifeArea.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'opponentLife': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      const count = opponent.lifeArea.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'combinedLifeTotal': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      const count = player.lifeArea.cardIds.length + opponent.lifeArea.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfInstancePowerAtLeast': {
      if (!sourceInstanceId) return false;
      return computeCurrentPower(defs, state, sourceInstanceId) >= gate.power;
    }

    case 'selfLifeLessThanOpponent': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      return player.lifeArea.cardIds.length < opponent.lifeArea.cardIds.length;
    }

    case 'selfHand': {
      const count = player.hand.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'anyCharacterExactCost': {
      const opponentId = getOpponentId(state, ownerId);
      const ids = [...player.characterArea.cardIds, ...state.players[opponentId].characterArea.cardIds];
      return ids.some((id) => currentCostForGate(state, defs, id) === gate.exactCost);
    }

    case 'selfHasCharacterCostAtLeast': {
      return player.characterArea.cardIds.some((id) => currentCostForGate(state, defs, id) >= gate.atLeast);
    }

    case 'selfHasCharacterBasePowerAtLeast': {
      return player.characterArea.cardIds.some((id) => (defs[state.cardsById[id]?.cardDefinitionId ?? '']?.basePower ?? -1) >= gate.power);
    }

    case 'opponentDonMoreThanSelf': {
      const opponentId = getOpponentId(state, ownerId);
      return fieldDonIds(state, opponentId).length > fieldDonIds(state, ownerId).length;
    }

    case 'opponentDonFieldCount': {
      const opponentId = getOpponentId(state, ownerId);
      const count = fieldDonIds(state, opponentId).length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfDonAtMostOpponent': {
      const opponentId = getOpponentId(state, ownerId);
      return fieldDonIds(state, ownerId).length <= fieldDonIds(state, opponentId).length;
    }

    case 'selfControlsNamed': {
      const ids = [...player.characterArea.cardIds, ...player.stageArea.cardIds, player.leaderInstanceId];
      return ids.some((id) => defs[state.cardsById[id]?.cardDefinitionId ?? '']?.name === gate.name);
    }

    case 'selfDoesNotControlNamed': {
      const ids = [...player.characterArea.cardIds, ...player.stageArea.cardIds, player.leaderInstanceId];
      return !ids.some((id) => defs[state.cardsById[id]?.cardDefinitionId ?? '']?.name === gate.name);
    }

    case 'selfHandMatching': {
      const n = player.hand.cardIds.filter((id) => {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def) return false;
        if (gate.typeIncludes !== undefined && !typeMatches(def.types, gate.typeIncludes)) return false;
        if (gate.category !== undefined && def.category !== gate.category) return false;
        if (gate.exactPower !== undefined && (def.basePower ?? -1) !== gate.exactPower) return false;
        if (gate.minPower !== undefined && (def.basePower ?? -1) < gate.minPower) return false;
        return true;
      }).length;
      return n >= gate.atLeast;
    }

    case 'selfTrashCount': {
      const c = player.trash.cardIds.length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfDeckCount': {
      const c = player.deck.cardIds.length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfTypedCharacterCount': {
      const c = player.characterArea.cardIds.filter((id) => {
        if (gate.rested !== undefined && (state.cardsById[id]?.orientation === 'rested') !== gate.rested) return false;
        return typeMatches(defs[state.cardsById[id]?.cardDefinitionId ?? '']?.types ?? [], gate.typeIncludes);
      }).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfAllCharactersTyped': {
      const chars = player.characterArea.cardIds;
      if (chars.length === 0) return true;
      return chars.every((id) => typeMatches(defs[state.cardsById[id]?.cardDefinitionId ?? '']?.types ?? [], gate.typeIncludes));
    }

    case 'selfLeaderPowerAtMost': {
      const leaderId = player.leaderInstanceId;
      if (!leaderId) return false;
      return computeCurrentPower(defs, state, leaderId) <= gate.power;
    }

    case 'selfControlsNamedWithPowerAtLeast': {
      const ids = [player.leaderInstanceId, ...player.characterArea.cardIds].filter((id): id is string => id != null);
      return ids.some((id) => {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def || def.name !== gate.name) return false;
        return computeCurrentPower(defs, state, id) >= gate.power;
      });
    }

    case 'selfTypedCharacterPowerAtLeast': {
      return player.characterArea.cardIds.some((id) => {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def || !typeMatches(def.types, gate.typeIncludes)) return false;
        return computeCurrentPower(defs, state, id) >= gate.power;
      });
    }

    case 'selfCharacterCurrentPowerCount': {
      const c = player.characterArea.cardIds.filter((id) => computeCurrentPower(defs, state, id) >= gate.power).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfOtherNamedCharacterCount': {
      const c = player.characterArea.cardIds.filter((id) => {
        if (id === sourceInstanceId) return false;
        return defs[state.cardsById[id]?.cardDefinitionId ?? '']?.name === gate.name;
      }).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'opponentHasCharacterBasePowerAtLeast': {
      const opponentId = getOpponentId(state, ownerId);
      const opp = state.players[opponentId];
      if (!opp) return false;
      const ids = [opp.leaderInstanceId, ...opp.characterArea.cardIds];
      return ids.some((id) => (defs[state.cardsById[id]?.cardDefinitionId ?? '']?.basePower ?? -1) >= gate.power);
    }

    case 'opponentCharacterBasePowerCount': {
      const opponentId = getOpponentId(state, ownerId);
      const opp = state.players[opponentId];
      if (!opp) return false;
      const count = opp.characterArea.cardIds.filter(
        (id) => (defs[state.cardsById[id]?.cardDefinitionId ?? '']?.basePower ?? -1) >= gate.power,
      ).length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfCharactersTotalCostAtLeast': {
      let total = 0;
      for (const id of player.characterArea.cardIds) total += currentCostForGate(state, defs, id);
      return total >= gate.atLeast;
    }

    case 'anyCharacterCostAtLeast': {
      const opponentId = getOpponentId(state, ownerId);
      const ids = [...player.characterArea.cardIds, ...state.players[opponentId].characterArea.cardIds];
      return ids.some((id) => currentCostForGate(state, defs, id) >= gate.atLeast);
    }

    case 'anyCharacterBasePowerAtLeast': {
      const opponentId = getOpponentId(state, ownerId);
      const ids = [...player.characterArea.cardIds, ...state.players[opponentId].characterArea.cardIds];
      return ids.some((id) => (defs[state.cardsById[id]?.cardDefinitionId ?? '']?.basePower ?? -1) >= gate.power);
    }

    case 'opponentHasCharacterExactCost': {
      const opponentId = getOpponentId(state, ownerId);
      return state.players[opponentId].characterArea.cardIds.some((id) => currentCostForGate(state, defs, id) === gate.exactCost);
    }

    case 'selfTrashMatching': {
      const c = player.trash.cardIds.filter((id) => {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def) return false;
        if (gate.category !== undefined && def.category !== gate.category) return false;
        if (gate.typeIncludes !== undefined && !typeMatches(def.types, gate.typeIncludes)) return false;
        return true;
      }).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'opponentRestedCharacterCount': {
      const opponentId = getOpponentId(state, ownerId);
      const opp = state.players[opponentId];
      if (!opp) return false;
      const c = opp.characterArea.cardIds.filter((id) => state.cardsById[id]?.orientation === 'rested').length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfGivenDonCount': {
      let n = 0;
      for (const inst of Object.values(state.cardsById)) if (inst.controllerId === ownerId) n += inst.donAttached.length;
      if (gate.atLeast !== undefined && n < gate.atLeast) return false;
      if (gate.atMost !== undefined && n > gate.atMost) return false;
      return true;
    }

    case 'opponentGivenDonCount': {
      const opponentId = getOpponentId(state, ownerId);
      let n = 0;
      for (const inst of Object.values(state.cardsById)) if (inst.controllerId === opponentId) n += inst.donAttached.length;
      if (gate.atLeast !== undefined && n < gate.atLeast) return false;
      if (gate.atMost !== undefined && n > gate.atMost) return false;
      return true;
    }

    case 'anyOf':
      return gate.gates.some((g) => evaluateGate(g, state, defs, ownerId, sourceInstanceId, eventContext));

    case 'selfDonReturnedThisAction': {
      const count = eventContext?.donReturnedCount ?? 0;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'opponentHand': {
      const opponentId = getOpponentId(state, ownerId);
      const count = state.players[opponentId].hand.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'playedCharacterNoBaseEffect': {
      const playedId = eventContext?.playedCharacterInstanceId;
      if (!playedId) return false;
      const inst = state.cardsById[playedId];
      const def = inst ? defs[inst.cardDefinitionId] : undefined;
      return !!def && cardHasNoBaseEffect(def);
    }

    case 'selfPlayedThisTurn': {
      if (!sourceInstanceId) return false;
      const inst = state.cardsById[sourceInstanceId];
      return !!inst && inst.enteredPlayTurn === state.turnNumber;
    }
  }
}
