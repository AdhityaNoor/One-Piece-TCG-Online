/**
 * Effect negation — "negate the effect of [target]" / "your [On Play] effects are negated".
 * Evaluated when triggered/activated abilities fire (runTimings).
 */
import type { GameState } from '../state/game';
import type { CardCategory } from '../state/card';
import type { IrTiming } from './effectIr';
import type { CardDefinitionLookup } from '../rules/shared/definitions';
import { cardTypeIncludes } from '../rules/shared/typeMatching';

type NegatableCategory = Exclude<CardCategory, 'don'>;

function isNegatableCategory(category: CardCategory): category is NegatableCategory {
  return category !== 'don';
}

export function isAbilityNegated(
  state: GameState,
  sourceInstanceId: string,
  timing: IrTiming,
  defs: CardDefinitionLookup = {},
): boolean {
  const inst = state.cardsById[sourceInstanceId];
  if (!inst) return false;
  const def = defs[inst.cardDefinitionId];

  for (const ce of state.continuousEffects) {
    const neg = ce.effectNegation;
    if (!neg) continue;

    const timings = neg.negatedTimings;
    const timingBlocked = !timings || timings.length === 0 || timings.includes(timing);
    if (!timingBlocked) continue;

    if (neg.appliesToInstanceId === sourceInstanceId) return true;
    if (neg.appliesToControllerId === inst.controllerId) {
      if (neg.appliesToCategories?.length) {
        if (!def || !isNegatableCategory(def.category) || !neg.appliesToCategories.includes(def.category)) continue;
      }
      if (neg.exceptTypeIncludes && cardTypeIncludes(def?.types, neg.exceptTypeIncludes)) continue;
      return true;
    }
  }
  return false;
}
