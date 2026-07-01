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

function typeMatches(defTypes: string[], required: string): boolean {
  const normalized = required.toLowerCase();
  return defTypes.some((type) => type.toLowerCase().includes(normalized));
}

export function evaluateGates(
  gates: AbilityGate[],
  state: GameState,
  defs: CardDefinitionLookup,
  ownerId: string,
): boolean {
  for (const gate of gates) {
    if (!evaluateGate(gate, state, defs, ownerId)) return false;
  }
  return true;
}

function evaluateGate(
  gate: AbilityGate,
  state: GameState,
  defs: CardDefinitionLookup,
  ownerId: string,
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

    case 'opponentCharacterCount': {
      const opponentId = getOpponentId(state, ownerId);
      const opponent = state.players[opponentId];
      if (!opponent) return false;
      const count = opponent.characterArea.cardIds.length;
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

    case 'selfHand': {
      const count = player.hand.cardIds.length;
      if (gate.atLeast !== undefined && count < gate.atLeast) return false;
      if (gate.atMost !== undefined && count > gate.atMost) return false;
      return true;
    }
  }
}
