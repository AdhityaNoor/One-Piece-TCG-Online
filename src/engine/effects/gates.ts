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
import type { AbilityGate, RemovedFromFieldDestination } from './effectIr';
import type { GameState } from '../state/game';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { getOpponentId } from '../rules/shared/players';
import { nameMatches } from '../state/card';
import { countControllerActiveUnattachedDon, fieldDonIds } from './abilityCost';
import { computeCurrentPower } from '../rules/shared/power';
import { cardHasNoBaseEffect } from './cardHasNoBaseEffect';

function typeMatches(defTypes: string[], required: string): boolean {
  const normalized = required.toLowerCase();
  return defTypes.some((type) => type.toLowerCase().includes(normalized));
}

/** Count the controller's in-play Characters whose types include `typeIncludes`. */
export function countSelfTypedCharacters(
  state: GameState,
  defs: CardDefinitionLookup,
  controllerId: string,
  typeIncludes: string,
): number {
  const player = state.players[controllerId];
  return player.characterArea.cardIds.filter((id) =>
    typeMatches(defs[state.cardsById[id]?.cardDefinitionId ?? '']?.types ?? [], typeIncludes),
  ).length;
}

function characterMatchesAnyType(state: GameState, defs: CardDefinitionLookup, instanceId: string, anyOfTypes: string[]): boolean {
  const types = defs[state.cardsById[instanceId]?.cardDefinitionId ?? '']?.types ?? [];
  return anyOfTypes.some((required) => typeMatches(types, required));
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

function countControllerRestedCards(state: GameState, controllerId: string): number {
  const player = state.players[controllerId];
  if (!player) return 0;
  const orientedIds = [player.leaderInstanceId, ...player.characterArea.cardIds, ...player.stageArea.cardIds].filter((id): id is string => id != null);
  const restedOriented = orientedIds.filter((id) => state.cardsById[id]?.orientation === 'rested').length;
  const restedDon = player.costArea.cardIds.filter((id) => state.cardsById[id]?.donRested === true).length;
  return restedOriented + restedDon;
}

export interface GateEvalContext {
  /** DON!! returned to the DON!! deck during the current cost-payment batch. */
  donReturnedCount?: number;
  /** Leader/Character that received DON!! (onDonGiven reactive window). */
  donGivenTargetInstanceId?: string;
  /** How many DON!! cards were given to donGivenTargetInstanceId this event. */
  donGivenCount?: number;
  /** Card removed from the field by an effect (onRemovedFromField reactive window). */
  removedFromFieldInstanceId?: string;
  /** Controller of the card that was removed from the field. */
  removedFromFieldControllerId?: string;
  /** Player who controlled the effect that removed the card. */
  removedByEffectControllerId?: string;
  /** Destination zone of the field removal. */
  removedToZone?: RemovedFromFieldDestination;
  /** Character just played from hand/trash (played-character reactive windows). */
  playedCharacterInstanceId?: string;
  /** True when the just-played Character entered play via another Character's effect. */
  playedFromCharacterEffect?: boolean;
  /** Controller (pre-K.O.) of the Character that was K.O.'d (onCharacterKoed reactive window). */
  koedCharacterControllerId?: string;
  /** Instance ids trashed from hand by an effect this event (onHandTrashed reactive window). */
  handTrashedCount?: number;
  /** Instance id of the card whose effect trashed from hand (onHandTrashed filter). */
  handTrashEffectSourceInstanceId?: string;
  /** How the current [On K.O.] window was triggered (onKO only). */
  koCause?: 'battle' | 'effect';
  /** Instance id of the card/effect that K.O.'d the onKO source (onKO only). */
  koSourceInstanceId?: string;
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
      return nameMatches(def, gate.name);
    }

    case 'leaderNameIncludes': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return def.name.toLowerCase().includes(gate.name.toLowerCase());
    }

    case 'leaderType': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return typeMatches(def.types, gate.type);
    }

    case 'leaderAttribute': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def?.attributes?.length) return false;
      const want = gate.attribute.toLowerCase();
      return def.attributes.some((a) => a.toLowerCase() === want);
    }

    case 'opponentLeaderAttribute': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      const leaderInst = state.cardsById[opponent.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def?.attributes?.length) return false;
      const want = gate.attribute.toLowerCase();
      return def.attributes.some((a) => a.toLowerCase() === want);
    }

    case 'leaderMulticolor': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return def.colors.length > 1;
    }

    case 'leaderColor': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      if (!leaderInst) return false;
      const def = defs[leaderInst.cardDefinitionId];
      if (!def) return false;
      return def.colors.includes(gate.color);
    }

    case 'leaderActive': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      return leaderInst?.orientation === 'active';
    }

    case 'leaderRested': {
      const leaderInst = state.cardsById[player.leaderInstanceId];
      return leaderInst?.orientation === 'rested';
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

    case 'selfRestedCardCount': {
      const count = countControllerRestedCards(state, ownerId);
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'opponentRestedCardCount': {
      const count = countControllerRestedCards(state, getOpponentId(state, ownerId));
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

    case 'selfAllFieldDonRested': {
      const ids = fieldDonIds(state, ownerId);
      return ids.length > 0 && ids.every((id) => state.cardsById[id]?.donRested === true);
    }

    case 'selfActiveDonCount': {
      const count = countControllerActiveUnattachedDon(state, ownerId);
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

    case 'selfHasFaceUpLife': {
      return player.lifeArea.cardIds.some((id) => state.cardsById[id]?.faceState === 'faceUp');
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

    case 'selfLifeAtMostOpponent': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      return player.lifeArea.cardIds.length <= opponent.lifeArea.cardIds.length;
    }

    case 'selfHand': {
      const count = player.hand.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }

    case 'selfHandAtLeastLessThanOpponent': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      return player.hand.cardIds.length + gate.count <= opponent.hand.cardIds.length;
    }

    case 'anyCharacterExactCost': {
      const opponentId = getOpponentId(state, ownerId);
      const ids = [...player.characterArea.cardIds, ...state.players[opponentId].characterArea.cardIds];
      return ids.some((id) => currentCostForGate(state, defs, id) === gate.exactCost);
    }

    case 'selfHasCharacterCostAtLeast': {
      return player.characterArea.cardIds.some((id) => currentCostForGate(state, defs, id) >= gate.atLeast);
    }

    case 'selfCharacterCostCount': {
      const count = player.characterArea.cardIds.filter((id) => currentCostForGate(state, defs, id) >= gate.minCost).length;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      return gate.atLeast !== undefined || gate.atMost !== undefined;
    }

    case 'selfCharacterBaseCostCount': {
      const count = player.characterArea.cardIds.filter((id) => (defs[state.cardsById[id]?.cardDefinitionId ?? '']?.baseCost ?? -1) >= gate.minBaseCost).length;
      return count >= gate.atLeast;
    }

    case 'anyCharacterCostCount': {
      const opponentId = getOpponentId(state, ownerId);
      const ids = [...player.characterArea.cardIds, ...state.players[opponentId].characterArea.cardIds];
      const count = ids.filter((id) => currentCostForGate(state, defs, id) >= gate.minCost).length;
      return count >= gate.atLeast;
    }

    case 'selfHasCharacterBasePowerAtLeast': {
      return player.characterArea.cardIds.some((id) => (defs[state.cardsById[id]?.cardDefinitionId ?? '']?.basePower ?? -1) >= gate.power);
    }

    case 'opponentDonMoreThanSelf': {
      const opponentId = getOpponentId(state, ownerId);
      return fieldDonIds(state, opponentId).length > fieldDonIds(state, ownerId).length;
    }

    case 'selfFewerCharactersThanOpponent': {
      const opponentId = getOpponentId(state, ownerId);
      const selfCount = player.characterArea.cardIds.length;
      const oppCount = state.players[opponentId]?.characterArea.cardIds.length ?? 0;
      return selfCount < oppCount;
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

    case 'selfDonAtLeastLessThanOpponent': {
      const opponentId = getOpponentId(state, ownerId);
      return fieldDonIds(state, ownerId).length + gate.count <= fieldDonIds(state, opponentId).length;
    }

    case 'selfControlsNamed': {
      const ids = [...player.characterArea.cardIds, ...player.stageArea.cardIds, player.leaderInstanceId];
      return ids.some((id) => {
        const inst = state.cardsById[id];
        if (!nameMatches(defs[inst?.cardDefinitionId ?? ''], gate.name)) return false;
        return gate.rested ? inst?.orientation === 'rested' : true;
      });
    }

    case 'selfDoesNotControlNamed': {
      const ids = [...player.characterArea.cardIds, ...player.stageArea.cardIds, player.leaderInstanceId];
      return !ids.some((id) => nameMatches(defs[state.cardsById[id]?.cardDefinitionId ?? ''], gate.name));
    }

    case 'selfNamedCardCount': {
      const ids = [...player.characterArea.cardIds, ...player.stageArea.cardIds, player.leaderInstanceId];
      const c = ids.filter((id) => nameMatches(defs[state.cardsById[id]?.cardDefinitionId ?? ''], gate.name)).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
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
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (gate.color !== undefined && !(def?.colors ?? []).includes(gate.color)) return false;
        return typeMatches(def?.types ?? [], gate.typeIncludes);
      }).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfTypedCharacterDistinctNameCount': {
      const names = new Set<string>();
      for (const id of player.characterArea.cardIds) {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def || !typeMatches(def.types, gate.typeIncludes)) continue;
        names.add(def.name);
      }
      return names.size >= gate.atLeast;
    }

    case 'selfAnyTypedCharacterCount': {
      const c = player.characterArea.cardIds.filter((id) => {
        if (gate.rested !== undefined && (state.cardsById[id]?.orientation === 'rested') !== gate.rested) return false;
        return characterMatchesAnyType(state, defs, id, gate.anyOfTypes);
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

    case 'selfLeaderPowerAtLeast': {
      const leaderId = player.leaderInstanceId;
      if (!leaderId) return false;
      return computeCurrentPower(defs, state, leaderId) >= gate.power;
    }

    case 'selfTurnCount': {
      const currentTurnCount = player.hasGoneFirst ? Math.ceil(state.turnNumber / 2) : Math.floor(state.turnNumber / 2);
      if (gate.atLeast !== undefined && currentTurnCount < gate.atLeast) return false;
      if (gate.atMost !== undefined && currentTurnCount > gate.atMost) return false;
      return true;
    }

    case 'selfControlsNamedWithPowerAtLeast': {
      const ids = [player.leaderInstanceId, ...player.characterArea.cardIds].filter((id): id is string => id != null);
      return ids.some((id) => {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def || !nameMatches(def, gate.name)) return false;
        return computeCurrentPower(defs, state, id) >= gate.power;
      });
    }

    case 'selfControlsNamedCharacterBasePower': {
      const mode = gate.mode ?? 'atLeast';
      return player.characterArea.cardIds.some((id) => {
        const def = defs[state.cardsById[id]?.cardDefinitionId ?? ''];
        if (!def || !nameMatches(def, gate.name)) return false;
        const basePower = def.basePower ?? -1;
        return mode === 'exact' ? basePower === gate.power : basePower >= gate.power;
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

    case 'selfCharacterBasePowerCount': {
      const mode = gate.mode ?? 'atLeast';
      const c = player.characterArea.cardIds.filter((id) => {
        const basePower = defs[state.cardsById[id]?.cardDefinitionId ?? '']?.basePower ?? -1;
        return mode === 'exact' ? basePower === gate.power : basePower >= gate.power;
      }).length;
      if (gate.atLeast !== undefined && c < gate.atLeast) return false;
      if (gate.atMost !== undefined && c > gate.atMost) return false;
      return true;
    }

    case 'selfOtherCharacterPowerAtLeast': {
      return player.characterArea.cardIds.some((id) => id !== sourceInstanceId && computeCurrentPower(defs, state, id) >= gate.power);
    }

    case 'selfOtherNamedCharacterCount': {
      const c = player.characterArea.cardIds.filter((id) => {
        if (id === sourceInstanceId) return false;
        return nameMatches(defs[state.cardsById[id]?.cardDefinitionId ?? ''], gate.name);
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

    case 'opponentCharacterCurrentPowerCount': {
      const opponentId = getOpponentId(state, ownerId);
      const opp = state.players[opponentId];
      if (!opp) return false;
      const count = opp.characterArea.cardIds.filter((id) => computeCurrentPower(defs, state, id) >= gate.power).length;
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
        if (gate.name !== undefined && !nameMatches(def, gate.name)) return false;
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

    case 'selfActivatedEventBaseCostThisTurn': {
      return (state.eventActivationHistory ?? []).some((event) => {
        if (event.playerId !== ownerId || event.turnNumber !== state.turnNumber) return false;
        if (gate.atLeast !== undefined && event.baseCost < gate.atLeast) return false;
        if (gate.atMost !== undefined && event.baseCost > gate.atMost) return false;
        return true;
      });
    }

    case 'donGivenTargetLeaderOrCharacter': {
      const targetId = eventContext?.donGivenTargetInstanceId;
      if (!targetId) return false;
      const inst = state.cardsById[targetId];
      if (!inst) return false;
      return inst.currentZone === 'leaderArea' || inst.currentZone === 'characterArea';
    }

    case 'donGivenTargetIsSelf': {
      if (!sourceInstanceId) return false;
      return eventContext?.donGivenTargetInstanceId === sourceInstanceId;
    }

    case 'selfDonGivenThisAction': {
      if (!sourceInstanceId || eventContext?.donGivenTargetInstanceId !== sourceInstanceId) return false;
      const count = eventContext?.donGivenCount ?? 0;
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

    case 'playedCharacterTypeIncludes': {
      const playedId = eventContext?.playedCharacterInstanceId;
      if (!playedId) return false;
      const def = defs[state.cardsById[playedId]?.cardDefinitionId ?? ''];
      if (!def) return false;
      return typeMatches(def.types, gate.typeIncludes);
    }

    case 'playedCharacterHasTrigger': {
      const playedId = eventContext?.playedCharacterInstanceId;
      if (!playedId) return false;
      const def = defs[state.cardsById[playedId]?.cardDefinitionId ?? ''];
      return !!def?.hasTrigger;
    }

    case 'playedCharacterBaseCostAtLeast': {
      const playedId = eventContext?.playedCharacterInstanceId;
      if (!playedId) return false;
      const def = defs[state.cardsById[playedId]?.cardDefinitionId ?? ''];
      if (!def || def.category !== 'character') return false;
      return (def.baseCost ?? -1) >= gate.atLeast;
    }

    case 'playedFromCharacterEffect': {
      return eventContext?.playedFromCharacterEffect === true;
    }

    case 'koedCharacterController': {
      const koedControllerId = eventContext?.koedCharacterControllerId;
      if (!koedControllerId) return false;
      const isController = koedControllerId === ownerId;
      return gate.player === 'controller' ? isController : !isController;
    }

    case 'koByOpponentEffect': {
      if (eventContext?.koCause !== 'effect') return false;
      const koSourceId = eventContext.koSourceInstanceId;
      if (!koSourceId) return false;
      const koSource = state.cardsById[koSourceId];
      if (!koSource) return false;
      return koSource.controllerId === getOpponentId(state, ownerId);
    }

    case 'koByEffect':
      return eventContext?.koCause === 'effect';

    case 'removedFromFieldController': {
      const removedControllerId = eventContext?.removedFromFieldControllerId;
      if (!removedControllerId) return false;
      const isController = removedControllerId === ownerId;
      return gate.player === 'controller' ? isController : !isController;
    }

    case 'removedByEffectController': {
      const effectControllerId = eventContext?.removedByEffectControllerId;
      if (!effectControllerId) return false;
      const isController = effectControllerId === ownerId;
      return gate.player === 'controller' ? isController : !isController;
    }

    case 'removedFromFieldCategory': {
      const removedId = eventContext?.removedFromFieldInstanceId;
      if (!removedId) return false;
      const def = defs[state.cardsById[removedId]?.cardDefinitionId ?? ''];
      return !!def && def.category === gate.category;
    }

    case 'removedFromFieldTypeIncludes': {
      const removedId = eventContext?.removedFromFieldInstanceId;
      if (!removedId) return false;
      const def = defs[state.cardsById[removedId]?.cardDefinitionId ?? ''];
      if (!def) return false;
      return typeMatches(def.types, gate.typeIncludes);
    }

    case 'removedToZone':
      return eventContext?.removedToZone === gate.zone;

    case 'effectSourceTypeIncludes': {
      const sourceId = eventContext?.handTrashEffectSourceInstanceId;
      if (!sourceId) return false;
      const def = defs[state.cardsById[sourceId]?.cardDefinitionId ?? ''];
      if (!def) return false;
      return typeMatches(def.types, gate.typeIncludes);
    }

    case 'selfPlayedThisTurn': {
      if (!sourceInstanceId) return false;
      const inst = state.cardsById[sourceInstanceId];
      return !!inst && inst.enteredPlayTurn === state.turnNumber;
    }

    case 'selfBattledOpponentCharacterThisTurn': {
      if (!sourceInstanceId) return false;
      const inst = state.cardsById[sourceInstanceId];
      return !!inst && inst.battledOpponentCharacterTurn === state.turnNumber;
    }
  }
}
