/**
 * Dynamic evaluation weighting by game phase (leader guide §19).
 * Phase is inferred from Life, DON!!, board, threats, and lethal potential —
 * not turn number alone.
 */
import type { CardDefinitionLookup } from '../../engine/rules/shared';
import { getOpponentId } from '../../engine/rules/shared';
import type { GameState } from '../../engine/state/game';
import type { GamePhase, ModeWeights } from './types';
import {
  opponentHandCount,
  opponentLifeCount,
  opponentPublicCardIds,
  ownHandIds,
  ownLifeCount,
} from '../visibility/playerView';
import { lethalPressure } from '../heuristics/boardHeuristics';

export type { GamePhase } from './types';

export interface GamePhaseAnalysis {
  phase: GamePhase;
  /** 0 = fully early, 1 = fully late. */
  lateFactor: number;
  signals: {
    minLife: number;
    totalDon: number;
    boardCharacters: number;
    handPressure: number;
    lethal: number;
    turnNumber: number;
  };
}

function countFieldDon(state: GameState, playerId: string): number {
  return state.players[playerId]?.costArea.cardIds.length ?? 0;
}

function countCharacters(state: GameState, playerId: string): number {
  return state.players[playerId]?.characterArea.cardIds.length ?? 0;
}

export function analyzeGamePhase(
  state: GameState,
  playerId: string,
  defs: CardDefinitionLookup,
): GamePhaseAnalysis {
  const ownLife = ownLifeCount(state, playerId);
  const oppLife = opponentLifeCount(state, playerId);
  // Empty life zones in fixtures → treat as mid-range so phase logic stays stable.
  const minLife =
    ownLife <= 0 && oppLife <= 0 ? 5 : Math.min(ownLife > 0 ? ownLife : 5, oppLife > 0 ? oppLife : 5);

  const opponentId = getOpponentId(state, playerId);
  const totalDon = countFieldDon(state, playerId) + countFieldDon(state, opponentId);
  const boardCharacters = countCharacters(state, playerId) + countCharacters(state, opponentId);
  const handPressure = ownHandIds(state, playerId).length + opponentHandCount(state, playerId);
  // Soft lethal signal — avoid boardHeuristics' binary "100 when power >= life*1000"
  // which treats a lone 5k Leader vs 5 Life as already lethal.
  const rawLethal = lethalPressure(state, playerId, defs);
  const lethal =
    oppLife <= 0 && !state.gameOver
      ? 0
      : Math.min(100, rawLethal === 100 ? Math.min(55, 10 + boardCharacters * 10 + Math.max(0, totalDon - 3) * 4) : rawLethal);
  const turnNumber = state.turnNumber;
  const threatBodies = opponentPublicCardIds(state, playerId).filter((id) => {
    const inst = state.cardsById[id];
    return inst?.currentZone === 'characterArea' && inst.orientation === 'active';
  }).length;

  // Continuous late-factor in [0, 1] from multiple signals.
  let lateFactor = 0;
  lateFactor += Math.max(0, (5 - minLife) / 5) * 0.35;
  lateFactor += Math.min(1, totalDon / 12) * 0.2;
  lateFactor += Math.min(1, boardCharacters / 8) * 0.15;
  lateFactor += Math.min(1, lethal / 100) * 0.2;
  lateFactor += Math.min(1, Math.max(0, turnNumber - 2) / 8) * 0.1;
  if (threatBodies >= 3) lateFactor += 0.08;
  lateFactor = Math.max(0, Math.min(1, lateFactor));

  let phase: GamePhase;
  if (
    minLife <= 2 ||
    lethal >= 55 ||
    (minLife <= 3 && (totalDon >= 8 || lethal >= 35)) ||
    lateFactor >= 0.62
  ) {
    phase = 'late';
  } else if (
    turnNumber <= 4 &&
    minLife >= 4 &&
    totalDon <= 5 &&
    boardCharacters <= 3 &&
    lethal < 30 &&
    lateFactor <= 0.4
  ) {
    phase = 'early';
  } else {
    phase = 'mid';
  }

  return {
    phase,
    lateFactor,
    signals: { minLife, totalDon, boardCharacters, handPressure, lethal, turnNumber },
  };
}

/** Multipliers applied on top of mode weights. */
export function phaseWeightMultipliers(phase: GamePhase): ModeWeights {
  switch (phase) {
    case 'early':
      return {
        removal: 0.9,
        development: 1.3,
        cardAdvantage: 1.25,
        engine: 1.3,
        lethal: 0.7,
        survival: 0.85,
        leaderSynergy: 1.25,
        preserveHand: 1.15,
      };
    case 'mid':
      return {
        removal: 1.2,
        development: 1.05,
        cardAdvantage: 1.05,
        engine: 1.15,
        lethal: 1.1,
        survival: 1.05,
        leaderSynergy: 1.15,
        preserveHand: 1.0,
      };
    case 'late':
      return {
        removal: 1.25,
        development: 0.7,
        cardAdvantage: 0.85,
        engine: 0.75,
        lethal: 1.45,
        survival: 1.4,
        leaderSynergy: 1.05,
        preserveHand: 1.25,
      };
  }
}

export function applyPhaseToModeWeights(mode: ModeWeights, phase: GamePhase): ModeWeights {
  const m = phaseWeightMultipliers(phase);
  return {
    removal: mode.removal * m.removal,
    development: mode.development * m.development,
    cardAdvantage: mode.cardAdvantage * m.cardAdvantage,
    engine: mode.engine * m.engine,
    lethal: mode.lethal * m.lethal,
    survival: mode.survival * m.survival,
    leaderSynergy: mode.leaderSynergy * m.leaderSynergy,
    preserveHand: mode.preserveHand * m.preserveHand,
  };
}
