/**
 * Engine effect-interpreter barrel.
 *
 * The compile target (EffectProgram IR), the generic interpreter, and the
 * firing seams. Per-card behavior is compiled DATA injected as an
 * EffectTemplateRegistry; the engine never imports /src/cards.
 */
export type { EffectContext, EffectTemplateRegistry } from './effectTemplate';
export type {
  Ability,
  EffectOp,
  EffectProgram,
  EffectResumeState,
  IrCondition,
  IrDuration,
  IrTrigger,
  Selector,
} from './effectIr';
export { EffectContextImpl } from './effectContext';
export { runTriggers, resumeProgram } from './interpreter';
export { fireOnPlay, fireActivate, resumeChoice } from './fireTiming';
