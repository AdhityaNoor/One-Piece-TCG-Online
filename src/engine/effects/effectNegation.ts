/**
 * Effect negation — "negate the effect of [target]" / "your [On Play] effects are negated".
 * Evaluated when triggered/activated abilities fire (runTimings).
 */
import type { ContinuousEffectRecord, GameState } from '../state/game';
import type { CardCategory } from '../state/card';
import type { IrTiming } from './effectIr';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { cardTypeIncludes } from '../rules/shared/typeMatching';

type NegatableCategory = Exclude<CardCategory, 'don'>;

function isNegatableCategory(category: CardCategory): category is NegatableCategory {
  return category !== 'don';
}

/**
 * The first negation record covering `sourceInstanceId`, or null.
 *
 * `timing` narrows the search to one ability timing (what runTimings needs before firing an
 * ability). Passing `null` asks the broader question the BOARD needs — "is anything on this card
 * negated right now?" — which matches a record whatever its `negatedTimings` filter says, so a
 * partial negation ("your [On Play] effects are negated") still surfaces a status on the card.
 */
export function findEffectNegationRecord(
  state: GameState,
  sourceInstanceId: string,
  timing: IrTiming | null,
  defs: CardDefinitionLookup = {},
): ContinuousEffectRecord | null {
  const inst = state.cardsById[sourceInstanceId];
  if (!inst) return null;
  const def = defs[inst.cardDefinitionId];

  for (const ce of state.continuousEffects) {
    const neg = ce.effectNegation;
    if (!neg) continue;

    if (timing !== null) {
      const timings = neg.negatedTimings;
      const timingBlocked = !timings || timings.length === 0 || timings.includes(timing);
      if (!timingBlocked) continue;
    }

    if (neg.appliesToInstanceId === sourceInstanceId) return ce;
    if (neg.appliesToControllerId === inst.controllerId) {
      if (neg.appliesToCategories?.length) {
        if (!def || !isNegatableCategory(def.category) || !neg.appliesToCategories.includes(def.category)) continue;
      }
      if (neg.exceptTypeIncludes && cardTypeIncludes(def?.types, neg.exceptTypeIncludes)) continue;
      return ce;
    }
  }
  return null;
}

export function isAbilityNegated(
  state: GameState,
  sourceInstanceId: string,
  timing: IrTiming,
  defs: CardDefinitionLookup = {},
): boolean {
  return findEffectNegationRecord(state, sourceInstanceId, timing, defs) !== null;
}
