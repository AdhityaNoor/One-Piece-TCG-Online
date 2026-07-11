import type { AbilityGate, IrTiming } from '../../engine/effects/effectIr';

export type GamePhase = 'early' | 'mid' | 'late';

export type StrategicTag =
  | 'setup'
  | 'bridge'
  | 'engine'
  | 'interaction'
  | 'protection'
  | 'tempo'
  | 'payoff'
  | 'finisher';

export type StrategicGamePlan =
  | 'develop'
  | 'control'
  | 'defend'
  | 'pressure'
  | 'combo_setup'
  | 'lethal_search'
  | 'recovery';

export type StrategicInteractionKind =
  | 'enables'
  | 'amplifies'
  | 'searches'
  | 'recurs'
  | 'protects'
  | 'discounts'
  | 'setsUp'
  | 'paysOff'
  | 'extends'
  | 'finishes';

export interface SynergyRequirement {
  kind: 'type' | 'name' | 'category' | 'gate' | 'cost' | 'trash';
  value: string;
  description: string;
}

export interface StrategicInteraction {
  sourceCardDefinitionId: string;
  targetCardDefinitionId?: string;
  relationship: StrategicInteractionKind;
  strength: number;
  reason: string;
}

export interface CardStrategicProfile {
  immediateValue: number;
  boardDevelopment: number;
  cardAdvantage: number;
  removalValue: number;
  tempoValue: number;
  defensiveValue: number;
  offensiveValue: number;
  resourceAcceleration: number;
  resourceDenial: number;
  recursionValue: number;
  searchValue: number;
  comboPotential: number;
  engineValue: number;
  finisherValue: number;
  futureValue: number;
  setupTags: StrategicTag[];
  payoffTags: StrategicTag[];
  synergyRequirements: SynergyRequirement[];
  enables: StrategicInteraction[];
}

export interface GateProjection {
  gate: AbilityGate;
  currentlySatisfied: boolean;
  actionsToSatisfy: number;
  expectedPayoff: number;
  probabilityOfSurvival: number;
}

export interface ThreatProfile {
  instanceId: string;
  cardDefinitionId: string;
  immediateThreat: number;
  recurringValue: number;
  synergyCentrality: number;
  lethalContribution: number;
  removalUrgency: number;
}

export interface LeaderStrategicProfile {
  leaderCardDefinitionId: string;
  preferredPlans: StrategicGamePlan[];
  resourceEngine: number;
  offensivePlan: number;
  defensivePlan: number;
  boardPlan: number;
  requiredTypes: string[];
  payoffGates: AbilityGate[];
  activationValue: number;
  description: string;
}

export type StrategicResource =
  | 'counter_hand'
  | 'blocker'
  | 'active_don'
  | 'removal'
  | 'life_buffer';

export interface SurvivalProjection {
  immediateLossRisk: number;
  nextTurnLossRisk: number;
  projectedIncomingAttacks: number;
  estimatedDefensiveCapacity: number;
  requiredResourcesToSurvive: StrategicResource[];
  /** Net Life cards expected to be lost to public attackers after blockers/Counters. */
  projectedLifeDamage: number;
  handCounterPower: number;
  activeBlockerCount: number;
}

export interface VictoryProjection {
  opponentCurrentLife: number;
  currentTurnLethalProbability: number;
  nextTurnLethalProbability: number;
  expectedSuccessfulLifeDamage: number;
  availableAttackers: number;
}

export interface MatchObjectiveEvaluation {
  winProbability: number;
  lossProbability: number;
  opponentLifePressure: number;
  ownLifeSafety: number;
  currentLethalProbability: number;
  opponentLethalProbability: number;
  strategicPositionValue: number;
  utility: number;
}

export interface StrategicContext {
  mode: StrategicGamePlan;
  /** Inferred early / mid / late from match state (not turn alone). */
  gamePhase: GamePhase;
  leader: LeaderStrategicProfile;
  objective: MatchObjectiveEvaluation;
  survival: SurvivalProjection;
  victory: VictoryProjection;
  opponentThreats: ThreatProfile[];
  handInteractions: StrategicInteraction[];
  gateProjections: GateProjection[];
  modeWeights: ModeWeights;
}

export interface ModeWeights {
  removal: number;
  development: number;
  cardAdvantage: number;
  engine: number;
  lethal: number;
  survival: number;
  leaderSynergy: number;
  preserveHand: number;
}

export const TIMING_REALIZATION: Partial<Record<IrTiming, number>> = {
  onPlay: 1,
  onEnterPlay: 1,
  activateMain: 0.68,
  whenAttacking: 0.58,
  onOpponentsAttack: 0.48,
  onBlock: 0.4,
  onKO: 0.38,
  counter: 0.28,
  lifeTrigger: 0.22,
  endOfTurn: 0.52,
  onCharacterPlayedFromHand: 0.45,
  onOpponentCharacterPlayedFromHand: 0.4,
};
