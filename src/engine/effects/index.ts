/**
 * Engine effect-interpreter barrel.
 *
 * The runtime target (EffectProgram IR), the generic interpreter, and the
 * firing seams. Per-card behavior is curated DATA injected as an
 * EffectTemplateRegistry; the engine never imports /src/cards.
 */
export type { EffectContext, EffectTemplateRegistry } from './effectTemplate';
export type {
  Ability,
  AbilityCost,
  AbilityGate,
  EffectOp,
  EffectProgram,
  EffectResumeState,
  IrCondition,
  IrDuration,
  IrTiming,
  SearchFilter,
  Selector,
} from './effectIr';
export { EffectContextImpl } from './effectContext';
export { runTimings, resumeProgram } from './interpreter';
export { fireOnPlay, fireActivate, fireWhenAttacking, fireOnBlock, fireOnOpponentsAttack, fireOnKO, fireCounter, fireLifeTrigger, fireOnBattle, fireOnBattleKoedOpponent, fireEndOfTurn, fireCharacterKoedReactions, fireCharacterRestedReactions, fireRestTransitions, fireDonReturnedReactions, fireDonGivenReactions, fireRemovedFromFieldReactions, afterAbilityCostPaid, resumeChoice, fireEventActivatedReactions, fireOpponentBlockerActivatedReactions, fireLifeDamageDealtReactions, fireLifeToHandReactions, fireTriggerActivatedReactions, fireDrawOutsideDrawPhaseReactions, fireCharacterPlayedFromHandReactions, fireOpponentCharacterPlayedFromHandReactions, fireHandTrashedReactions, fireStartOfTurnReactions, battleAttackerIsCharacterWithAttribute } from './fireTiming';
export { evaluateGates } from './gates';
export { canAffordAbilityCost, canPayAbilityCost, countControllerActiveUnattachedDon, donMinusCandidateIds, fieldDonIds, givenDonIds, payAbilityCost, requiredDonMinusCount } from './abilityCost';
