import type { EffectProgram, EffectTemplateRegistry } from '../../engine/effects';
import { resolveEffectProgram } from '../../engine/effects';
import type { CardDefinitionLookup } from '../../engine/rules/shared';

/**
 * Resolve effects through the same cardDefinitionId -> cardNumber fallback used
 * by the engine. Saved decks can use stable local definition ids while curated
 * assignments remain keyed by printed card number.
 */
export function resolveAiEffectProgram(
  registry: EffectTemplateRegistry,
  defs: CardDefinitionLookup,
  cardDefinitionId: string | undefined,
): EffectProgram | undefined {
  if (!cardDefinitionId) return undefined;
  return resolveEffectProgram(registry, defs, cardDefinitionId);
}
