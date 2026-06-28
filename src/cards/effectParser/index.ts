/**
 * Effect parser barrel.
 *
 * Turns raw OPTCG `card_text` into a structured-but-INERT `ParsedEffect`
 * (ability hooks + draft action atoms) that lines up with the engine's
 * `EffectHook` model. This is an authoring aid for the future hand-authored
 * effect-template system, never executable logic. See types.ts header.
 */
export { parseEffect } from './parseEffect';
export type {
  EffectAction,
  EffectCost,
  EffectDuration,
  EffectParseWarning,
  EffectTarget,
  ParsedAbility,
  ParsedEffect,
} from './types';
